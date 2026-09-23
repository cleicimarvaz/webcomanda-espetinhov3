-- =====================================================================
-- WEBCOMANDA ESPETINHO V3
-- MIGRATION 002 — BACKFILL ORGANIZACIONAL INICIAL
-- =====================================================================
-- STATUS: RASCUNHO / NÃO EXECUTAR EM PRODUÇÃO
--
-- Objetivo:
--   * criar a empresa inicial do ambiente atual, caso ainda não exista;
--   * criar a unidade inicial;
--   * criar papéis iniciais;
--   * vincular os usuários existentes aos novos contextos.
--
-- IMPORTANTE:
--   * não remove nem altera o login atual;
--   * não preenche auth_user_id;
--   * não adiciona empresa_id/unidade_id às 21 tabelas operacionais;
--   * não ativa RLS;
--   * não migra dados operacionais;
--   * a execução deve ocorrer somente depois de validar a Migration 001.
-- =====================================================================

begin;

-- =====================================================================
-- 1. PAPÉIS INICIAIS DE COMPATIBILIDADE
-- =====================================================================
-- São papéis de migração inicial, não o catálogo definitivo da V3.
insert into public.papeis (codigo, nome, descricao)
values
    ('ADMIN', 'Administrador', 'Papel inicial correspondente ao nível administrativo da V2'),
    ('VENDEDOR', 'Vendedor', 'Papel inicial correspondente ao nível operacional da V2')
on conflict (codigo) do nothing;

-- =====================================================================
-- 2. EMPRESA INICIAL
-- =====================================================================
do $$
declare
    v_empresa_id uuid;
    v_nome_empresa text;
begin
    select id
      into v_empresa_id
      from public.empresas
      order by created_at
      limit 1;

    if v_empresa_id is null then
        select coalesce(
            nullif(trim(nome_loja), ''),
            'Empresa Principal'
        )
        into v_nome_empresa
        from public.configuracoes_sistema
        where id = 1
        limit 1;

        if v_nome_empresa is null or trim(v_nome_empresa) = '' then
            v_nome_empresa := 'Empresa Principal';
        end if;

        insert into public.empresas (nome)
        values (v_nome_empresa)
        returning id into v_empresa_id;
    end if;
end;
$$;

-- =====================================================================
-- 3. UNIDADE INICIAL
-- =====================================================================
do $$
declare
    v_empresa_id uuid;
    v_unidade_id uuid;
    v_nome_unidade text;
    v_telefone text;
    v_endereco text;
begin
    select id
      into v_empresa_id
      from public.empresas
      order by created_at
      limit 1;

    select id
      into v_unidade_id
      from public.unidades
      where empresa_id = v_empresa_id
      order by created_at
      limit 1;

    if v_unidade_id is null then
        select
            coalesce(nullif(trim(nome_loja), ''), 'Unidade Principal'),
            telefone,
            endereco
        into v_nome_unidade, v_telefone, v_endereco
        from public.configuracoes_sistema
        where id = 1
        limit 1;

        if v_nome_unidade is null or trim(v_nome_unidade) = '' then
            v_nome_unidade := 'Unidade Principal';
        end if;

        insert into public.unidades (
            empresa_id,
            nome,
            telefone,
            endereco
        )
        values (
            v_empresa_id,
            v_nome_unidade,
            v_telefone,
            v_endereco
        );
    end if;
end;
$$;

-- =====================================================================
-- 4. CONTROLE DE DUPLICIDADE DOS VÍNCULOS
-- =====================================================================
-- Permite um vínculo empresarial (unidade_id NULL) sem duplicação.
create unique index if not exists ux_membros_org_contexto
    on public.membros_organizacao (
        usuario_id,
        empresa_id,
        coalesce(unidade_id, '00000000-0000-0000-0000-000000000000'::uuid),
        papel_id
    );

-- =====================================================================
-- 5. BACKFILL DOS USUÁRIOS
-- =====================================================================
-- ADMIN continua como ADMIN.
-- Qualquer outro nível atual é convertido inicialmente para VENDEDOR.
-- Isso é compatibilidade de migração, não definição final de permissões.
insert into public.membros_organizacao (
    usuario_id,
    empresa_id,
    unidade_id,
    papel_id,
    ativo
)
select
    u.id,
    e.id,
    un.id,
    p.id,
    coalesce(u.ativo, true)
from public.usuarios u
cross join lateral (
    select id
    from public.empresas
    order by created_at
    limit 1
) e
cross join lateral (
    select id
    from public.unidades
    where empresa_id = e.id
    order by created_at
    limit 1
) un
join public.papeis p
  on p.codigo = case
      when upper(coalesce(u.nivel, 'VENDEDOR')) = 'ADMIN'
        or lower(coalesce(u.usuario, '')) = 'admin'
      then 'ADMIN'
      else 'VENDEDOR'
  end
where not exists (
    select 1
    from public.membros_organizacao m
    where m.usuario_id = u.id
      and m.empresa_id = e.id
      and m.unidade_id = un.id
      and m.papel_id = p.id
);

commit;
