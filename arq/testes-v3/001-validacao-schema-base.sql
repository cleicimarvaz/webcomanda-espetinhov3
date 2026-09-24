-- =====================================================================
-- WEBCOMANDA ESPETINHO V3
-- TESTE 001 — VALIDAÇÃO DO SCHEMA BASE
-- =====================================================================
-- STATUS: LEITURA / DESENVOLVIMENTO
--
-- Todas as consultas abaixo são de leitura.
-- Execute depois de criar o banco V3 e aplicar schema-v3-base.sql.
-- =====================================================================

-- 1. Tabelas esperadas
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
      'empresas',
      'unidades',
      'usuarios',
      'papeis',
      'permissoes',
      'papel_permissoes',
      'membros_organizacao',
      'auditoria',
      'configuracoes_sistema',
      'produtos',
      'produto_composicao',
      'estoque_produto_unidade',
      'inventarios',
      'estoque_movimentacoes'
  )
order by table_name;

-- 2. Contagem inicial de registros
select 'empresas' as tabela, count(*) as total from public.empresas
union all
select 'unidades', count(*) from public.unidades
union all
select 'usuarios', count(*) from public.usuarios
union all
select 'papeis', count(*) from public.papeis
union all
select 'permissoes', count(*) from public.permissoes
union all
select 'membros_organizacao', count(*) from public.membros_organizacao
union all
select 'produtos', count(*) from public.produtos
union all
select 'estoque_produto_unidade', count(*) from public.estoque_produto_unidade
union all
select 'inventarios', count(*) from public.inventarios
union all
select 'estoque_movimentacoes', count(*) from public.estoque_movimentacoes;

-- 3. Verifica empresa x unidade
select count(*) as unidades_com_empresa_invalida
from public.unidades u
left join public.empresas e on e.id = u.empresa_id
where e.id is null;

-- Esperado: 0

-- 4. Verifica produto x empresa
select count(*) as produtos_com_empresa_invalida
from public.produtos p
left join public.empresas e on e.id = p.empresa_id
where e.id is null;

-- Esperado: 0

-- 5. Verifica estoque x empresa/unidade/produto
select count(*) as estoques_incompativeis
from public.estoque_produto_unidade eu
join public.produtos p on p.id = eu.produto_id
join public.unidades u on u.id = eu.unidade_id
where p.empresa_id <> u.empresa_id;

-- Esperado: 0

-- 6. Verifica movimentações x empresa/unidade/produto
select count(*) as movimentos_incompativeis
from public.estoque_movimentacoes em
join public.produtos p on p.id = em.produto_id
join public.unidades u on u.id = em.unidade_id
where em.empresa_id <> p.empresa_id
   or em.empresa_id <> u.empresa_id;

-- Esperado: 0

-- 7. Verifica inventários x empresa/unidade
select count(*) as inventarios_incompativeis
from public.inventarios i
join public.unidades u on u.id = i.unidade_id
where i.empresa_id <> u.empresa_id;

-- Esperado: 0

-- 8. Lista views V3
select table_name
from information_schema.views
where table_schema = 'public'
  and table_name in (
      'v_estoque_produto_unidade_v3',
      'v_membros_organizacao_v3'
  )
order by table_name;

-- 9. Confirma que a tabela de usuários não possui coluna de senha
select count(*) as coluna_senha_encontrada
from information_schema.columns
where table_schema = 'public'
  and table_name = 'usuarios'
  and column_name in ('senha', 'password');

-- Esperado: 0

-- 10. RLS ainda não deve estar habilitado nesta etapa de bootstrap
select
    schemaname,
    tablename,
    rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
      'empresas',
      'unidades',
      'usuarios',
      'membros_organizacao',
      'produtos',
      'estoque_produto_unidade',
      'inventarios',
      'estoque_movimentacoes'
  )
order by tablename;

-- Esperado nesta fase: false em todas.
