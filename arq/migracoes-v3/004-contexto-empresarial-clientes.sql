-- =====================================================================
-- WEBCOMANDA ESPETINHO V3
-- MIGRATION 004 — CONTEXTO EMPRESARIAL DE CLIENTES
-- =====================================================================
-- STATUS: RASCUNHO / NÃO EXECUTAR EM PRODUÇÃO
--
-- Adiciona o contexto empresarial ao cadastro de clientes.
-- A migration é aditiva e não altera os fluxos atuais da V2.
-- =====================================================================

begin;

-- 1. Adiciona a coluna sem bloquear registros existentes.
alter table public.clientes
    add column if not exists empresa_id uuid;

-- 2. Preenche os registros legados com a primeira empresa do ambiente.
update public.clientes
set empresa_id = (
    select e.id
    from public.empresas e
    order by e.created_at
    limit 1
)
where empresa_id is null;

-- 3. Garante que não existam registros sem empresa.
do $$
begin
    if exists (select 1 from public.clientes where empresa_id is null) then
        raise exception 'Migration 004: existem clientes sem empresa_id.';
    end if;
end;
$$;

-- 4. Cria a FK após o backfill.
do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'fk_clientes_empresa'
          and conrelid = 'public.clientes'::regclass
    ) then
        alter table public.clientes
            add constraint fk_clientes_empresa
            foreign key (empresa_id)
            references public.empresas(id)
            on delete restrict;
    end if;
end;
$$;

-- 5. Torna o vínculo obrigatório.
alter table public.clientes
    alter column empresa_id set not null;

-- 6. Índice para consultas e futuras policies RLS.
create index if not exists idx_clientes_empresa_id
    on public.clientes(empresa_id);

commit;