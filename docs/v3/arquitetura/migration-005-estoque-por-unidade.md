# Migration 005 — Estoque por unidade

**Status: rascunho — não executar em produção.**

## Objetivo

Preparar o estoque para o cenário multiunidade sem substituir imediatamente o campo legado `produtos.estoque_atual` usado pela V2.

A migration cria uma posição de estoque por combinação de produto e unidade e associa as movimentações históricas à primeira unidade do ambiente.

## Mudanças

### Produtos

Adiciona `empresa_id` a `produtos`, porque o catálogo é compartilhado pela empresa.

### Estoque

Cria `estoque_produto_unidade`:

`produto + unidade → saldo`

Cada produto pode ter um saldo independente em cada unidade.

### Movimentações

Adiciona `unidade_id` a `estoque_movimentacoes` e preenche os registros existentes com a unidade inicial.

## Compatibilidade com a V2

`produtos.estoque_atual` permanece intacto.

O aplicativo atual continua podendo operar com o campo legado. A nova tabela é criada em paralelo para que a migração do código aconteça depois.

Não alterar ainda o fluxo de baixa em `vendas.js`.

## Por que não remover `estoque_atual` agora

A V2 ainda lê e atualiza esse campo em partes do fluxo de estoque. Removê-lo antes da migração do código poderia quebrar vendas e inventário.

A retirada deve ocorrer somente depois que todos os módulos estiverem usando a nova fonte de estoque.

## Backfill

Para a primeira unidade do ambiente:

`estoque_produto_unidade.saldo = produtos.estoque_atual`.

Registros sem controle de estoque ainda recebem saldo correspondente ao valor atual, pois a migração não deve inventar uma nova regra.

## Validações

- quantidade de produtos antes/depois;
- quantidade de posições criadas;
- nenhum produto sem empresa;
- nenhuma posição sem unidade/produto;
- saldos da primeira unidade equivalentes aos saldos atuais;
- quantidade de movimentações antes/depois;
- todas as movimentações existentes com `unidade_id` preenchido;
- relacionamentos de inventário preservados;
- V2 continua funcionando com `produtos.estoque_atual`.

## Próxima etapa

Depois da validação, migrar `produtos.estoque_minimo` e demais regras de estoque para escopo de unidade quando essa necessidade for confirmada, e então mover a baixa de estoque para uma operação transacional.