-- =====================================================================
-- Migração: adiciona valor_recebido e troco em historico_vendas
-- =====================================================================
-- Idempotente (add column if not exists). O código de comandas.js
-- (confirmarFechamento) e divisao.js (confirmarAbateItens) já gravam
-- esses dois campos ao inserir em historico_vendas, mas a tabela nunca
-- teve essas colunas em nenhum dos schemas gerados — o insert falhava
-- silenciosamente (o retorno de erro não era checado) sempre que a
-- forma de pagamento era Dinheiro, ou em qualquer pagamento por itens
-- na tela de divisão de conta.

alter table public.historico_vendas add column if not exists valor_recebido numeric(10,2);
alter table public.historico_vendas add column if not exists troco numeric(10,2) default 0;
