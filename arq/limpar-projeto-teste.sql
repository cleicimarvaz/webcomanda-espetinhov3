-- =====================================================================
-- LIMPA TODAS AS TABELAS DE UM PROJETO SUPABASE (uso em projeto de
-- TESTES apenas — isso apaga tudo que existir nessas tabelas).
-- =====================================================================
-- Rode este script ANTES do schema-completo-novo-banco.sql sempre que
-- o projeto já tiver tabelas antigas/incompatíveis (ex: um "produtos"
-- de outra estrutura, como aconteceu no projeto de testes).
-- =====================================================================

drop table if exists public.ingressos cascade;
drop table if exists public.tipos_ingresso cascade;
drop table if exists public.reservas_evento cascade;
drop table if exists public.eventos cascade;
drop table if exists public.configuracoes_sistema cascade;
drop table if exists public.metas_faturamento cascade;
drop table if exists public.contas_receber cascade;
drop table if exists public.despesas cascade;
drop table if exists public.historico_vendas cascade;
drop table if exists public.comandas cascade;
drop table if exists public.movimentacoes_caixa cascade;
drop table if exists public.caixa cascade;
drop table if exists public.complementos cascade;
drop table if exists public.estoque_movimentacoes cascade;
drop table if exists public.historico_precos cascade;
drop table if exists public.produto_composicao cascade;
drop table if exists public.produtos cascade;
drop table if exists public.clientes cascade;
drop table if exists public.fornecedores cascade;
drop table if exists public.auditoria cascade;
drop table if exists public.usuarios cascade;
