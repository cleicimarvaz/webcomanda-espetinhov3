-- =====================================================================
-- WEBCOMANDA ESPETINHO V3
-- MIGRATION 001 — FUNDAÇÃO ORGANIZACIONAL
-- =====================================================================
-- STATUS: RASCUNHO / NÃO EXECUTAR EM PRODUÇÃO
--
-- Esta migration é aditiva e cria apenas a fundação organizacional
-- da V3. Ela NÃO:
--   * migra usuários;
--   * ativa RLS;
--   * altera o login atual;
--   * remove senha/nivel da V2;
--   * altera vendas, estoque, caixa ou financeiro.
--
-- Antes de executar, validar no ambiente de desenvolvimento conforme:
-- docs/v3/arquitetura/migration-001-fundacao-organizacional.md
-- =====================================================================

begin;

-- =====================================================================
-- 1. EMPRESAS
-- =====================================================================
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

-- =====================================================================
-- 2. UNIDADES
-- =====================================================================
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

-- =====================================================================
-- 3. IDENTIDADE DA APLICAÇÃO
-- =====================================================================
-- Nullable nesta primeira etapa para permitir migração gradual.
alter table public.usuarios
    add column if not exists auth_user_id uuid;

create unique index if not exists idx_usuarios_auth_user_id
    on public.usuarios(auth_user_id)
    where auth_user_id is not null;

-- =====================================================================
-- 4. PAPÉIS
-- =====================================================================
create table if not exists public.papeis (
    id uuid primary key default gen_random_uuid(),
    codigo text not null unique,
    nome text not null,
    descricao text,
    ativo boolean not null default true,
    created_at timestamptz not null default now()
);

-- =====================================================================
-- 5. PERMISSÕES
-- =====================================================================
create table if not exists public.permissoes (
    id uuid primary key default gen_random_uuid(),
    codigo text not null unique,
    nome text not null,
    descricao text,
    created_at timestamptz not null default now()
);

-- =====================================================================
-- 6. PAPEL x PERMISSÃO
-- =====================================================================
create table if not exists public.papel_permissoes (
    papel_id uuid not null references public.papeis(id) on delete cascade,
    permissao_id uuid not null references public.permissoes(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (papel_id, permissao_id)
);

-- =====================================================================
-- 7. MEMBROS / VÍNCULOS ORGANIZACIONAIS
-- =====================================================================
-- unidade_id pode ser NULL quando o vínculo tiver escopo empresarial.
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

-- =====================================================================
-- 8. INTEGRIDADE EMPRESA x UNIDADE
-- =====================================================================
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
