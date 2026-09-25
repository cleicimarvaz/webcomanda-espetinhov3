# Migration 004 — Contexto empresarial de clientes

**Status: rascunho — não executar em produção.**

## Objetivo

Adicionar o contexto de empresa ao cadastro de clientes, mantendo o cliente compartilhado entre as unidades da mesma empresa.

Essa direção está alinhada ao mapa organizacional atual: o cliente representa uma entidade da empresa, enquanto a venda/conta a receber representa a operação realizada em uma unidade específica.

## Mudança proposta

Adicionar `empresa_id` em `clientes` e preencher os registros existentes com a empresa inicial do ambiente.

Depois da validação, o vínculo passa a ser obrigatório.

## O que não muda

- `cliente_id` de `historico_vendas` continua válido;
- `cliente_id` de `contas_receber` continua válido;
- o cadastro continua compartilhado entre unidades da mesma empresa;
- o fluxo atual de busca/criação de cliente não é alterado nesta etapa;
- RLS não é ativado;
- não há migração de dados financeiros.

## Cuidados

O índice atual de telefone é único dentro da tabela. Ao introduzir `empresa_id`, a estratégia futura de identificação por telefone deverá ser revisada para refletir o escopo empresarial caso uma mesma base de telefone possa existir em empresas diferentes.

Na V3, a regra definitiva deverá ser explicitada como uma chave/índice compatível com o escopo escolhido.

## Sequência

1. adicionar `empresa_id` como nullable;
2. preencher registros legados;
3. validar registros sem empresa;
4. criar FK e índice;
5. tornar `empresa_id` obrigatório;
6. revisar a unicidade do telefone no modelo final.

## Validações

- quantidade de clientes antes/depois;
- nenhum cliente sem `empresa_id`;
- integridade de `historico_vendas.cliente_id`;
- integridade de `contas_receber.cliente_id`;
- busca por telefone;
- criação de novo cliente;
- atualização de cliente;
- comportamento com clientes de empresas diferentes em um ambiente de teste.

## Próximo passo

Depois desta migration, a evolução deve entrar nos cadastros que sustentam os dados operacionais por unidade, começando por estoque.