-- =====================================================================
-- WEBCOMANDA ESPETINHO V3
-- MIGRATION 005 — ESTOQUE POR UNIDADE
-- =====================================================================
-- STATUS: RASCUNHO / NÃO EXECUTAR EM PRODUÇÃO
--
-- Prepara o estoque para múltiplas unidades sem remover a estrutura
-- de estoque usada atualmente pela V2.
-- =====================================================================

begin;

-- =====================================================================
-- 1. PRODUTOS PASSAM A PERTENCER À EMPRESA
-- =====================================================================
alter table public.produtos
    add column if not exists empresa_id uuid;

update public.produtos
set empresa_id = (
    select e.id
    from public.empresas e
    order by e.created_at
    limit 1
)
where empresa_id is null;

do $$
begin
    if exists (select 1 from public.produtos where empresa_id is null) then
        raise exception 'Migration 005: existem produtos sem empresa_id.';
    end if;
end;
$$;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'fk_produtos_empresa'
          and conrelid = 'public.produtos'::regclass
    ) then
        alter table public.produtos
            add constraint fk_produtos_empresa
            foreign key (empresa_id)
            references public.empresas(id)
            on delete restrict;
    end if;
end;
$$;

alter table public.produtos
    alter column empresa_id set not null;

create index if not exists idx_produtos_empresa_id
    on public.produtos(empresa_id);

-- =====================================================================
-- 2. POSIÇÃO DE ESTOQUE POR UNIDADE
-- =====================================================================
create table if not exists public.estoque_produto_unidade (
    id uuid primary key default gen_random_uuid(),
    produto_id bigint not null references public.produtos(id) on delete cascade,
    unidade_id uuid not null references public.unidades(id) on delete restrict,
    saldo numeric(12,3) not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (produto_id, unidade_id)
);

create index if not exists idx_estoque_produto_unidade_unidade
    on public.estoque_produto_unidade(unidade_id);

create index if not exists idx_estoque_produto_unidade_produto
    on public.estoque_produto_unidade(produto_id);

-- =====================================================================
-- 3. BACKFILL DO SALDO ATUAL PARA A UNIDADE INICIAL
-- =====================================================================
insert into public.estoque_produto_unidade (
    produto_id,
    unidade_id,
    saldo
)
select
    p.id,
    u.id,
    coalesce(p.estoque_atual, 0)::numeric(12,3)
from public.produtos p
cross join lateral (
    select id
    from public.unidades
    order by created_at
    limit 1
) u
on conflict (produto_id, unidade_id) do update
set saldo = excluded.saldo,
    updated_at = now();

-- =====================================================================
-- 4. CONTEXTO DAS MOVIMENTAÇÕES DE ESTOQUE
-- =====================================================================
alter table public.estoque_movimentacoes
    add column if not exists unidade_id uuid;

update public.estoque_movimentacoes
set unidade_id = (
    select u.id
    from public.unidades u
    order by u.created_at
    limit 1
)
where unidade_id is null;

do $$
begin
    if exists (select 1 from public.estoque_movimentacoes where unidade_id is null) then
        raise exception 'Migration 005: existem movimentações sem unidade_id.';
    end if;
end;
$$;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'fk_estoque_movimentacoes_unidade'
          and conrelid = 'public.estoque_movimentacoes'::regclass
    ) then
        alter table public.estoque_movimentacoes
            add constraint fk_estoque_movimentacoes_unidade
            foreign key (unidade_id)
            references public.unidades(id)
            on delete restrict;
    end if;
end;
$$;

alter table public.estoque_movimentacoes
    alter column unidade_id set not null;

create index if not exists idx_estoque_movimentacoes_unidade_id
    on public.estoque_movimentacoes(unidade_id);

commit;