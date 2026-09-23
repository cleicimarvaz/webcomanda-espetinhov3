# Migration 003 — Contexto empresarial de fornecedores

**Status: rascunho — não executar em produção.**

## Objetivo

Esta é a primeira migration que leva uma tabela existente da V2 para o novo contexto organizacional da V3.

`fornecedores` foi escolhido como primeiro alvo porque é um cadastro relativamente isolado: possui chave própria, é referenciado por produtos e despesas e não participa diretamente do fechamento de venda ou do saldo de caixa.

## Mudança proposta

Adicionar `empresa_id` em `fornecedores`.

Todos os registros existentes recebem a empresa inicial criada pelo backfill organizacional.

Depois da validação, `empresa_id` torna-se obrigatório.

## O que não muda

- nenhuma interface;
- nenhum fluxo de vendas;
- nenhum fluxo financeiro;
- nenhum fornecedor é apagado;
- `fornecedor_id` em produtos/despesas permanece funcionando;
- RLS ainda não é ativado;
- unidade não é adicionada ao fornecedor nesta etapa.

## Compatibilidade

O cadastro de fornecedor continua sendo compartilhado entre unidades da mesma empresa, conforme a direção arquitetural atual.

Isso evita duplicar o mesmo fornecedor para cada estabelecimento.

## Sequência de migração

1. adicionar `empresa_id` como nullable;
2. preencher a empresa dos registros existentes;
3. validar registros sem empresa;
4. criar FK e índice;
5. tornar `empresa_id` obrigatório;
6. somente posteriormente criar policy RLS.

## Validações

Antes de aplicar:

- confirmar que existe exatamente uma empresa inicial no ambiente de migração;
- confirmar que todos os fornecedores receberam `empresa_id`;
- verificar integridade dos `fornecedor_id` existentes em produtos e despesas;
- testar criação, edição e exclusão de fornecedor;
- testar seleção de fornecedor em produtos e despesas;
- comparar quantidade de fornecedores antes/depois.

## Próximo passo

Depois da validação desta migration, aplicar o mesmo padrão aos cadastros de empresa e aos dados operacionais definidos no mapa organizacional.