# Teste das operações transacionais de estoque

Este roteiro serve para validar as migrations 005–008 em um banco de desenvolvimento antes de qualquer integração com a aplicação.

## Regra

Não usar o banco de produção.

A validação deve ser feita com um usuário, empresa, unidade e produtos de teste.

## 1. Pré-condições

Confirmar que existem:

- uma empresa ativa;
- uma unidade vinculada à empresa;
- um usuário vinculado à empresa/unidade;
- pelo menos dois produtos da mesma empresa;
- os produtos usados no teste com `controlar_estoque = true`;
- uma posição correspondente em `estoque_produto_unidade`.

Também confirmar que as migrations necessárias foram aplicadas na ordem documentada.

## 2. Entrada manual

Gerar um UUID de operação novo e chamar:

```sql
select public.registrar_movimentacoes_estoque_v3(
    '<UNIDADE_UUID>',
    <USUARIO_ID>,
    'entrada',
    '[{"id": <PRODUTO_ID>, "qtd": 10}]'::jsonb,
    'COMPRA DE TESTE',
    '<OPERACAO_UUID>'
);
```

Validar:

- saldo anterior + 10;
- uma movimentação do tipo `entrada`;
- `unidade_id` correto;
- `usuario_id` correto;
- `operacao_id` preenchido.

## 3. Saída manual

Usar outra chave de operação:

```sql
select public.registrar_movimentacoes_estoque_v3(
    '<UNIDADE_UUID>',
    <USUARIO_ID>,
    'saida',
    '[{"id": <PRODUTO_ID>, "qtd": 2}]'::jsonb,
    'PERDA DE TESTE',
    '<OUTRA_OPERACAO_UUID>'
);
```

Validar que o saldo foi reduzido em 2 e que o histórico registra a saída.

## 4. Retry / idempotência

Repetir exatamente a chamada de entrada usando o mesmo `operacao_id`.

O resultado deve indicar `idempotente = true` e o saldo não deve ser alterado novamente.

## 5. Inventário

Enviar uma contagem física diferente do saldo atual:

```sql
select public.concluir_inventario_v3(
    '<UNIDADE_UUID>',
    <USUARIO_ID>,
    '[{"id": <PRODUTO_ID>, "contagem_fisica": 20}]'::jsonb,
    'INVENTÁRIO DE TESTE',
    '<OPERACAO_INVENTARIO_UUID>'
);
```

Validar:

- criação de um registro em `inventarios`;
- `unidade_id` e `usuario_id` corretos;
- `total_produtos` correto;
- `total_ajustados` correto;
- saldo final igual à contagem física;
- movimentação de entrada/saída com `inventario_id`.

## 6. Retry do inventário

Repetir a chamada com o mesmo `operacao_id`.

O banco deve retornar o mesmo `inventario_id` sem criar um segundo lote e sem alterar o saldo novamente.

## 7. Isolamento

Tentar operar um produto de outra empresa usando a mesma unidade.

A operação deve ser rejeitada.

Tentar operar com um usuário sem vínculo ativo com a unidade.

A operação também deve ser rejeitada.

## 8. Concorrência

Em ambiente de desenvolvimento, executar duas operações simultâneas para o mesmo produto e unidade.

O objetivo é confirmar que o `FOR UPDATE` preserva um saldo consistente e que as movimentações representam as duas operações.

## 9. Integração com a aplicação

Somente depois dos testes acima:

1. carregar `componentes/servicos/estoque-service-v3.js` em um fluxo de teste;
2. testar entrada;
3. testar saída;
4. testar inventário;
5. comparar o resultado com o histórico;
6. somente então escolher o primeiro chamador legado para substituição.

## Observação

A Migration 008 ainda não foi executada contra o banco de produção e o serviço não foi conectado aos fluxos da V2.
