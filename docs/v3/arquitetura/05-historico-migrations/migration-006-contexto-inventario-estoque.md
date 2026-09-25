# Migration 006 — Contexto do inventário e integridade do estoque

**Status: rascunho — não executar em produção.**

## Objetivo

Completar a preparação do domínio de estoque iniciada na Migration 005.

A Migration 005 criou a posição de estoque por unidade e adicionou `unidade_id` às movimentações. A Migration 006 leva o mesmo contexto para `inventarios` e adiciona validações para impedir combinações incoerentes entre produto e unidade.

## Mudanças

### Inventários

Adicionar:

- `unidade_id`;
- `usuario_id` como referência opcional à identidade da aplicação.

O campo textual `usuario` é preservado durante a transição.

### Movimentações

Adicionar `usuario_id` como referência opcional. O campo textual `usuario` permanece temporariamente.

### Integridade produto x unidade

Uma movimentação ou uma posição de estoque não poderá associar um produto de uma empresa a uma unidade de outra empresa.

## Backfill

Inventários existentes recebem a primeira unidade do ambiente.

Movimentações existentes recebem:

- a unidade do inventário relacionado, quando houver;
- caso contrário, a primeira unidade do ambiente.

## Compatibilidade

Esta migration não altera `produtos.estoque_atual`, porque o código da V2 ainda o utiliza.

O fluxo atual de inventário via planilha continua gravando no modelo legado até que uma migration posterior substitua a operação por um serviço transacional.

## Validações

- nenhum inventário sem unidade;
- nenhum movimento sem unidade;
- nenhum produto de empresa diferente da unidade;
- inventários existentes mantidos;
- movimentos históricos mantidos;
- usuário textual preservado;
- seleção de produtos e inventário continua funcionando na V2.

## Próximo passo

Depois dessa fundação, a próxima mudança do domínio de estoque deve ser a migração da baixa manual/inventário para uma operação transacional que atualize a nova posição de estoque e registre o movimento em uma única operação.