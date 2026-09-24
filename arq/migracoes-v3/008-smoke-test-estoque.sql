-- =====================================================================
-- WEBCOMANDA ESPETINHO V3
-- SMOKE TEST — ESTOQUE TRANSACIONAL
-- =====================================================================
-- STATUS: RASCUNHO / EXECUTAR SOMENTE EM BANCO DE DESENVOLVIMENTO
--
-- Este arquivo não cria dados e não altera registros.
-- Ele serve para verificar se a estrutura da Migration 008 está disponível
-- e se os vínculos organizacionais básicos estão coerentes.
-- =====================================================================

-- 1. Funções esperadas
select
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
      'registrar_baixa_estoque_v3',
      'validar_contexto_estoque_v3',
      'registrar_movimentacoes_estoque_v3',
      'concluir_inventario_v3'
  )
order by p.proname;

-- 2. Colunas adicionadas pelas migrations
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and (
      (table_name = 'produtos' and column_name = 'empresa_id')
      or (table_name = 'estoque_movimentacoes' and column_name in ('unidade_id', 'usuario_id', 'operacao_id'))
      or (table_name = 'inventarios' and column_name in ('unidade_id', 'usuario_id', 'operacao_id'))
  )
order by table_name, column_name;

-- 3. Posição por produto/unidade
select
    count(*) as total_posicoes,
    count(distinct produto_id) as produtos,
    count(distinct unidade_id) as unidades
from public.estoque_produto_unidade;

-- 4. Integridade empresa x unidade no estoque
select count(*) as incompatibilidades
from public.estoque_produto_unidade e
join public.produtos p on p.id = e.produto_id
join public.unidades u on u.id = e.unidade_id
where p.empresa_id <> u.empresa_id;

-- Esperado: 0

-- 5. Movimentações incompatíveis
select count(*) as incompatibilidades
from public.estoque_movimentacoes m
join public.produtos p on p.id = m.produto_id
join public.unidades u on u.id = m.unidade_id
where p.empresa_id <> u.empresa_id;

-- Esperado: 0

-- 6. Vínculos ativos com unidade
select
    mo.usuario_id,
    mo.empresa_id,
    mo.unidade_id,
    mo.papel_id
from public.membros_organizacao mo
where mo.ativo = true
order by mo.usuario_id, mo.empresa_id, mo.unidade_id;

-- 7. Índices de idempotência esperados
select indexname, tablename, indexdef
from pg_indexes
where schemaname = 'public'
  and indexname in (
      'ux_estoque_mov_operacao_produto_tipo',
      'ux_inventarios_operacao_id'
  )
order by indexname;

-- 8. Não executar chamadas de alteração automaticamente neste smoke test.
-- Os testes de entrada, saída, retry e inventário estão em:
-- docs/v3/arquitetura/teste-estoque-transacional.md
