# Migration 008 — Movimentação e inventário de estoque transacionais

## Objetivo

A Migration 008 prepara a próxima etapa da migração do estoque para a arquitetura V3.

Ela cria duas operações de banco:

- `registrar_movimentacoes_estoque_v3` para entradas e saídas manuais;
- `concluir_inventario_v3` para conferência física e ajuste do saldo.

Também adiciona uma chave de operação em `inventarios` para permitir retry seguro.

## O que muda

### Entradas e saídas

A nova RPC recebe uma lista de itens e um único tipo de movimento.

Ela:

1. valida empresa, unidade e usuário;
2. valida que os produtos pertencem à empresa;
3. exige que o produto controle estoque;
4. cria a posição `produto x unidade` quando necessário;
5. bloqueia a linha do saldo com `FOR UPDATE`;
6. calcula o novo saldo no banco;
7. grava a movimentação na mesma transação;
8. usa `operacao_id` para evitar duplicação em retries.

### Inventário

A RPC de inventário recebe a contagem física e calcula a diferença no servidor.

Isso é importante porque o saldo usado para comparar a contagem pode ter mudado depois que a planilha foi exportada. A operação bloqueia a posição do produto antes de calcular a diferença.

Para cada diferença diferente de zero, o banco:

- atualiza o saldo da unidade;
- registra uma entrada ou saída;
- relaciona a movimentação ao lote de inventário.

O lote recebe `unidade_id`, `usuario_id` e `operacao_id`.

## Idempotência

As duas operações usam UUID de operação.

Além do índice único, a RPC usa um lock transacional baseado na chave da operação antes de consultar se ela já foi concluída. Isso reduz o risco de duas tentativas concorrentes processarem a mesma operação.

## Compatibilidade com a V2

Nesta etapa:

- `produtos.estoque_atual` não é alterado pelas RPCs;
- a V2 não chama as novas funções;
- RLS continua inalterado;
- não há mudança nos fluxos existentes.

Portanto, a Migration 008 continua sendo uma preparação para a migração, não um cutover.

## Ponto importante sobre o estoque legado

Durante a transição existem dois conceitos:

- `produtos.estoque_atual`: saldo global usado pela V2;
- `estoque_produto_unidade.saldo`: saldo por unidade projetado para a V3.

A nova camada deve trabalhar com o segundo. Não devemos copiar automaticamente um saldo por unidade de volta para `produtos.estoque_atual`, porque esse campo não consegue representar duas ou mais unidades corretamente.

O espelhamento temporário da V2 precisa ser tratado como uma decisão de migração, não como comportamento implícito das RPCs.

## Pré-requisitos

Executar somente depois de validar, em ambiente de desenvolvimento, as migrations relacionadas à fundação organizacional e estoque:

- 001 — Fundação organizacional
- 005 — Estoque por unidade
- 006 — Contexto do inventário e integridade do estoque
- 007 — Baixa de estoque transacional

## Próxima etapa

O próximo passo é integrar o serviço `componentes/servicos/estoque-service-v3.js` a um único fluxo de teste, sem substituir ainda os chamadores da V2.

Depois da validação, a migração pode avançar operação por operação:

1. entrada manual;
2. saída manual;
3. inventário;
4. baixa automática de venda.

A substituição do legado deve acontecer somente depois que esses fluxos estiverem validados no ambiente de desenvolvimento.
