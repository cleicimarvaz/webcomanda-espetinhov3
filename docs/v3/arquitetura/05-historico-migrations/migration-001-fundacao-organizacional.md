# Primeira migration estrutural da V3

**Status: rascunho — não executar em produção.**

Esta migration representa a primeira estrutura concreta proposta para a V3. Ela é deliberadamente aditiva: cria o núcleo organizacional e de autorização sem remover dados ou modificar a lógica atual da aplicação.

## Objetivo

Criar as entidades necessárias para:

- empresas;
- unidades;
- identidade vinculada ao provedor de autenticação;
- papéis;
- permissões;
- associação de papéis a permissões;
- vínculo de usuários com empresa/unidade;
- base para futura implantação de RLS.

## O que esta migration não faz

- não remove `usuarios.senha`;
- não ativa RLS das tabelas existentes;
- não altera vendas, estoque, caixa ou financeiro;
- não migra registros históricos;
- não substitui o login atual;
- não altera telas da V2;
- não cria policies definitivas;
- não executa alterações no banco atual.

## SQL proposto

```sql
begin;

-- =============================================================
-- 1. EMPRESAS
-- =============================================================
create table if not exists public.empresas (
    id uuid primary key default gen_random_uuid(),
    nome text not null,
    documento text,
    status text not null default 'ativa',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_empresas_status
    on public.empresas(status);

-- =============================================================
-- 2. UNIDADES
-- =============================================================
create table if not exists public.unidades (
    id uuid primary key default gen_random_uuid(),
    empresa_id uuid not null references public.empresas(id) on delete restrict,
    nome text not null,
    status text not null default 'ativa',
    telefone text,
    endereco text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_unidades_empresa_id
    on public.unidades(empresa_id);

create index if not exists idx_unidades_status
    on public.unidades(status);

-- =============================================================
-- 3. IDENTIDADE DA APLICAÇÃO
-- =============================================================
-- O auth_user_id aponta para a identidade do Supabase Auth.
-- O vínculo é opcional nesta primeira migration para permitir
-- migração gradual dos usuários existentes.
alter table public.usuarios
    add column if not exists auth_user_id uuid;

create unique index if not exists idx_usuarios_auth_user_id
    on public.usuarios(auth_user_id)
    where auth_user_id is not null;

-- =============================================================
-- 4. PAPÉIS
-- =============================================================
create table if not exists public.papeis (
    id uuid primary key default gen_random_uuid(),
    codigo text not null unique,
    nome text not null,
    descricao text,
    ativo boolean not null default true,
    created_at timestamptz not null default now()
);

-- =============================================================
-- 5. PERMISSÕES
-- =============================================================
create table if not exists public.permissoes (
    id uuid primary key default gen_random_uuid(),
    codigo text not null unique,
    nome text not null,
    descricao text,
    created_at timestamptz not null default now()
);

-- =============================================================
-- 6. PAPEL x PERMISSÃO
-- =============================================================
create table if not exists public.papel_permissoes (
    papel_id uuid not null references public.papeis(id) on delete cascade,
    permissao_id uuid not null references public.permissoes(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (papel_id, permissao_id)
);

-- =============================================================
-- 7. VÍNCULOS ORGANIZACIONAIS
-- =============================================================
-- unidade_id pode ser nulo para um vínculo de escopo empresarial.
create table if not exists public.membros_organizacao (
    id uuid primary key default gen_random_uuid(),
    usuario_id bigint not null references public.usuarios(id) on delete cascade,
    empresa_id uuid not null references public.empresas(id) on delete cascade,
    unidade_id uuid references public.unidades(id) on delete cascade,
    papel_id uuid not null references public.papeis(id) on delete restrict,
    ativo boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_membros_usuario_id
    on public.membros_organizacao(usuario_id);

create index if not exists idx_membros_empresa_id
    on public.membros_organizacao(empresa_id);

create index if not exists idx_membros_unidade_id
    on public.membros_organizacao(unidade_id);

create index if not exists idx_membros_papel_id
    on public.membros_organizacao(papel_id);

-- =============================================================
-- 8. INTEGRIDADE BÁSICA DO VÍNCULO
-- =============================================================
-- Garante que a unidade utilizada pelo vínculo pertence à mesma empresa.
create or replace function public.validar_membro_empresa_unidade()
returns trigger
language plpgsql
as $$
begin
    if new.unidade_id is not null and not exists (
        select 1
        from public.unidades u
        where u.id = new.unidade_id
          and u.empresa_id = new.empresa_id
    ) then
        raise exception 'A unidade não pertence à empresa informada.';
    end if;

    return new;
end;
$$;

drop trigger if exists trg_validar_membro_empresa_unidade
    on public.membros_organizacao;

create trigger trg_validar_membro_empresa_unidade
before insert or update on public.membros_organizacao
for each row execute function public.validar_membro_empresa_unidade();

commit;
```

## Seed inicial de papéis

A criação dos papéis deve acontecer separadamente do DDL, depois da validação do modelo.

Uma base inicial poderá partir dos valores usados atualmente pelo sistema, como `ADMIN` e `VENDEDOR`, e depois evoluir para papéis específicos por domínio.

Não devemos copiar automaticamente todos os níveis antigos como permissões definitivas.

## Seed inicial de permissões

As permissões também devem ser definidas por capacidade de negócio, por exemplo:

- `vendas.venda.criar`;
- `vendas.venda.estornar`;
- `comandas.comanda.fechar`;
- `estoque.movimentacao.criar`;
- `caixa.caixa.abrir`;
- `caixa.caixa.fechar`;
- `usuarios.usuario.gerenciar`;
- `eventos.ingresso.validar`;
- `financeiro.despesa.editar`;
- `relatorios.financeiro.visualizar`.

## Validação antes de executar

Antes de aplicar esta migration em qualquer banco:

1. confirmar que `gen_random_uuid()` está disponível;
2. validar a integração planejada com Supabase Auth;
3. confirmar a estrutura de `usuarios` do ambiente alvo;
4. testar criação e exclusão de empresa/unidade em banco de desenvolvimento;
5. testar a regra de consistência empresa/unidade;
6. definir políticas RLS antes de abrir essas tabelas para o cliente;
7. criar backup/snapshot do ambiente de teste;
8. documentar o resultado.

## Próxima migration

A próxima migration deve tratar do **backfill do primeiro ambiente**, criando a empresa/unidade inicial e vinculando os usuários atuais sem remover os campos legados.