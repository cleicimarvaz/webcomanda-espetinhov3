> **Nota de histórico:** esta migration foi desenhada durante a evolução incremental da V2. A regra funcional atual da V3 é diferente: saldo negativo é bloqueado por padrão e somente exceções administrativas autorizadas permitem ultrapassagem, com justificativa e auditoria. Esta migration **não deve ser usada para definir a regra final do banco V3**.

# Migration 007 — Baixa de estoque transacional

**Status: rascunho — não executar em produção.**

## Objetivo

Resolver um dos principais pontos identificados na auditoria: a baixa automática atual atualiza o saldo de `produtos.estoque_atual` e depois grava `estoque_movimentacoes` em chamadas separadas.

Na estrutura V3, a baixa deve atualizar a posição por unidade e registrar o movimento dentro de uma única transação do banco.

## Operação proposta

```text
frontend
   ↓
serviço de venda
   ↓
RPC transacional
   ├── valida empresa/unidade
   ├── identifica produtos controlados
   ├── bloqueia a posição de estoque
   ├── atualiza saldo
   └── registra movimentação
```

Se qualquer etapa falhar, a transação inteira deve ser revertida.

## Idempotência

A operação recebe `operacao_id`.

Os movimentos gerados pela mesma operação usam essa chave em conjunto com o produto e o tipo de movimento.

Isso permite que um retry da mesma operação não gere uma segunda baixa.

## Compatibilidade

A migration não altera `produtos.estoque_atual` e não modifica `vendas.js`/`comandas.js` ainda.

Durante a transição, a V2 continuará utilizando o fluxo legado.

A integração do código ocorrerá somente depois de validar a RPC em ambiente de desenvolvimento.

## Estoque insuficiente

A migration mantém a possibilidade de saldo negativo durante a transição, preservando o comportamento atual da V2.

A regra definitiva de bloqueio de venda quando o estoque for insuficiente deve ser decidida e implementada posteriormente como regra de domínio.

## Combos

A expansão dos combos continua podendo ocorrer no serviço/frontend antes da chamada. A RPC recebe os itens já expandidos e agrega produtos repetidos antes da baixa.

Isso mantém a função do banco simples e permite que a composição do combo seja migrada separadamente.

## Segurança

A RPC é `security invoker` neste estágio.

Isso é intencional: a autorização definitiva depende da futura implantação de Supabase Auth e RLS. Transformar a função em `security definer` sem validar o ator poderia criar uma nova superfície de bypass.

## Resultado

A V3 passa a ter uma operação transacional preparada para:

- uma venda com vários produtos;
- várias linhas do mesmo produto;
- concorrência sobre o mesmo estoque;
- retry com a mesma operação;
- vínculo entre unidade e produto.

## Validação

Testar no ambiente de desenvolvimento:

1. uma baixa simples;
2. baixa de vários produtos;
3. produto repetido em várias linhas;
4. duas chamadas concorrentes para o mesmo produto;
5. retry com o mesmo `operacao_id`;
6. produto de outra empresa;
7. unidade inexistente;
8. falha durante a operação;
9. produto sem controle de estoque;
10. saldo negativo durante a transição.

## Próximo passo

Depois que a RPC for validada, criar o serviço de aplicação que substitui progressivamente `processarBaixaEstoqueAutomatica` sem remover o fluxo legado até a migração estar comprovada.