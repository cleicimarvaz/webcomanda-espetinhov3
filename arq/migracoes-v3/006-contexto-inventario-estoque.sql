-- =====================================================================
-- WEBCOMANDA ESPETINHO V3
-- MIGRATION 006 — CONTEXTO DO INVENTÁRIO E INTEGRIDADE DO ESTOQUE
-- =====================================================================
-- STATUS: RASCUNHO / NÃO EXECUTAR EM PRODUÇÃO
--
-- Completa a preparação do domínio de estoque iniciada na Migration 005.
-- Não remove o modelo legado usado pela V2 e não ativa RLS.
-- =====================================================================

begin;

-- =====================================================================
-- 1. INVENTÁRIOS
-- =====================================================================
alter table public.inventarios
    add column if not exists unidade_id uuid;

update public.inventarios
set unidade_id = (
    select u.id
    from public.unidades u
    order by u.created_at
    limit 1
)
where unidade_id is null;

do $$
begin
    if exists (select 1 from public.inventarios where unidade_id is null) then
        raise exception 'Migration 006: existem inventários sem unidade_id.';
    end if;
end;
$$;

do $$
begin
    if not exists (
        select 1 from pg_constraint
        where conname = 'fk_inventarios_unidade'
          and conrelid = 'public.inventarios'::regclass
    ) then
        alter table public.inventarios
            add constraint fk_inventarios_unidade
            foreign key (unidade_id)
            references public.unidades(id)
            on delete restrict;
    end if;
end;
$$;

alter table public.inventarios
    alter column unidade_id set not null;

alter table public.inventarios
    add column if not exists usuario_id bigint references public.usuarios(id) on delete set null;

create index if not exists idx_inventarios_unidade_id
    on public.inventarios(unidade_id);

-- =====================================================================
-- 2. MOVIMENTAÇÕES GANHAM REFERÊNCIA RELACIONAL DO USUÁRIO
-- =====================================================================
alter table public.estoque_movimentacoes
    add column if not exists usuario_id bigint references public.usuarios(id) on delete set null;

create index if not exists idx_estoque_movimentacoes_usuario_id
    on public.estoque_movimentacoes(usuario_id);

-- =====================================================================
-- 3. BACKFILL DO USUÁRIO QUANDO HOUVER CORRESPONDÊNCIA EXATA
-- =====================================================================
update public.inventarios i
set usuario_id = u.id
from public.usuarios u
where i.usuario_id is null
  and lower(trim(coalesce(i.usuario, ''))) <> ''
  and (
      lower(trim(coalesce(u.nome, ''))) = lower(trim(i.usuario))
      or lower(trim(coalesce(u.usuario, ''))) = lower(trim(i.usuario))
  );

update public.estoque_movimentacoes m
set usuario_id = u.id
from public.usuarios u
where m.usuario_id is null
  and lower(trim(coalesce(m.usuario, ''))) <> ''
  and (
      lower(trim(coalesce(u.nome, ''))) = lower(trim(m.usuario))
      or lower(trim(coalesce(u.usuario, ''))) = lower(trim(m.usuario))
  );

-- =====================================================================
-- 4. GARANTE QUE MOVIMENTO DE INVENTÁRIO HERDE A UNIDADE DO INVENTÁRIO
-- =====================================================================
update public.estoque_movimentacoes m
set unidade_id = i.unidade_id
from public.inventarios i
where m.inventario_id = i.id;

-- Movimentos sem inventário usam a primeira unidade do ambiente.
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
        raise exception 'Migration 006: existem movimentações sem unidade_id.';
    end if;
end;
$$;

-- =====================================================================
-- 5. INTEGRIDADE PRODUTO x UNIDADE
-- =====================================================================
create or replace function public.validar_estoque_empresa_unidade()
returns trigger
language plpgsql
as $$
declare
    v_empresa_produto uuid;
    v_empresa_unidade uuid;
begin
    select p.empresa_id
      into v_empresa_produto
      from public.produtos p
     where p.id = new.produto_id;

    select u.empresa_id
      into v_empresa_unidade
      from public.unidades u
     where u.id = new.unidade_id;

    if v_empresa_produto is null or v_empresa_unidade is null then
        raise exception 'Produto ou unidade inexistente para operação de estoque.';
    end if;

    if v_empresa_produto <> v_empresa_unidade then
        raise exception 'Produto e unidade pertencem a empresas diferentes.';
    end if;

    return new;
end;
$$;

drop trigger if exists trg_validar_estoque_empresa_unidade
    on public.estoque_produto_unidade;

create trigger trg_validar_estoque_empresa_unidade
before insert or update on public.estoque_produto_unidade
for each row execute function public.validar_estoque_empresa_unidade();

drop trigger if exists trg_validar_movimento_estoque_empresa_unidade
    on public.estoque_movimentacoes;

create trigger trg_validar_movimento_estoque_empresa_unidade
before insert or update on public.estoque_movimentacoes
for each row execute function public.validar_estoque_empresa_unidade();

-- =====================================================================
-- 6. VALIDAÇÃO FINAL DOS REGISTROS EXISTENTES
-- =====================================================================
do $$
begin
    if exists (
        select 1
        from public.estoque_produto_unidade e
        join public.produtos p on p.id = e.produto_id
        join public.unidades u on u.id = e.unidade_id
        where p.empresa_id <> u.empresa_id
    ) then
        raise exception 'Migration 006: existem posições de estoque com empresas incompatíveis.';
    end if;

    if exists (
        select 1
        from public.estoque_movimentacoes m
        join public.produtos p on p.id = m.produto_id
        join public.unidades u on u.id = m.unidade_id
        where p.empresa_id <> u.empresa_id
    ) then
        raise exception 'Migration 006: existem movimentos com empresas incompatíveis.';
    end if;
end;
$$;

commit;