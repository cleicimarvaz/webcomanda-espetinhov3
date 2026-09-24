# Smoke test do estoque V3

Este teste verifica o primeiro fluxo transacional do banco V3 sem deixar dados permanentes.

## O que é testado

- entrada de estoque;
- saída de estoque;
- cálculo de saldo no servidor;
- idempotência da mesma operação;
- inventário físico;
- registro das movimentações;
- integração entre empresa, unidade, usuário e produto.

## Segurança do teste

O script começa com `BEGIN` e termina com `ROLLBACK`. O produto de teste, os saldos, movimentações, inventário e auditoria criados durante o teste são descartados no final.

## Pré-requisitos

Execute antes:

1. `arq/schema-v3-base.sql`
2. `arq/funcoes-v3/001-estoque-transacional.sql`
3. `arq/seeds-v3/001-bootstrap-administrativo.sql`

Depois execute `arq/testes-v3/003-smoke-estoque-transacional.sql` no SQL Editor do banco V3.

## Resultado esperado

O teste deve informar:

`SMOKE TEST V3 OK: entrada=10, saída=3, idempotência=OK, inventário=5.`

Os SELECTs seguintes devem mostrar temporariamente o saldo 5, as movimentações de entrada e saída e o inventário concluído. Ao terminar o `ROLLBACK`, esses dados de teste deixam de existir.

## Importante

Este teste deve ser executado apenas no banco de desenvolvimento. Ele não substitui os testes de autenticação e RLS que serão feitos antes da produção.