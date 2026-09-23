-- =====================================================================
-- WEBCOMANDA ESPETINHO V3
-- MIGRATION 003 — CONTEXTO EMPRESARIAL DE FORNECEDORES
-- =====================================================================
-- STATUS: RASCUNHO / NÃO EXECUTAR EM PRODUÇÃO
--
-- Primeira tabela existente da V2 a receber contexto organizacional.
-- A migration é aditiva e deve ser validada em ambiente de desenvolvimento.
-- =====================================================================

begin;

-- 1. Adiciona a coluna sem bloquear registros existentes.
alter table public.fornecedores
    add column if not exists empresa_id uuid;

-- 2. Preenche registros legados com a primeira empresa do ambiente.
update public.fornecedores
set empresa_id = (
    select e.id
    from public.empresas e
    order by e.created_at
    limit 1
)
where empresa_id is null;

-- 3. Interrompe a migration se ainda existirem fornecedores sem empresa.
do $$
begin
    if exists (select 1 from public.fornecedores where empresa_id is null) then
        raise exception 'Migration 003: existem fornecedores sem empresa_id.';
    end if;
end;
$$;

-- 4. Cria a FK somente depois do backfill.
do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'fk_fornecedores_empresa'
          and conrelid = 'public.fornecedores'::regclass
    ) then
        alter table public.fornecedores
            add constraint fk_fornecedores_empresa
            foreign key (empresa_id)
            references public.empresas(id)
            on delete restrict;
    end if;
end;
$$;

-- 5. Torna o vínculo obrigatório.
alter table public.fornecedores
    alter column empresa_id set not null;

-- 6. Índice para consultas e futuras policies RLS.
create index if not exists idx_fornecedores_empresa_id
    on public.fornecedores(empresa_id);

commit;