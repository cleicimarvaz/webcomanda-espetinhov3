-- =====================================================================
-- Migração: ordem configurável das categorias na tela de vendas (item #4)
-- =====================================================================
-- Idempotente. Guarda a ordem escolhida como texto separado por vírgula
-- (ex: "espetos,refeicao,acompanhamentos,bebidas,cervejas,combos") na
-- mesma linha (id=1) que já guarda nome da loja, CNPJ e layout do ticket.

alter table public.configuracoes_sistema add column if not exists ordem_categorias text;
