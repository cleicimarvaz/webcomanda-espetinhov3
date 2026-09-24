# Contrato do serviço financeiro V3

## Objetivo

Centralizar operações que alteram vendas, pagamentos, caixa, contas a receber e despesas.

## Venda e pagamento

Uma venda pode possuir um ou vários pagamentos.

Cada pagamento deve guardar:
- valor;
- forma;
- usuário;
- caixa, quando aplicável;
- data;
- referência à venda.

## Caixa

Operações do serviço:
- abrir caixa;
- registrar suprimento;
- registrar sangria;
- registrar pagamento vinculado;
- fechar caixa;
- consultar posição.

Uma sessão de caixa pertence a uma unidade.

## Contas a receber

Operações:
- criar conta;
- receber valor total;
- receber valor parcial;
- consultar saldo;
- cancelar quando autorizado.

O saldo deve ser derivado dos recebimentos registrados, evitando depender de uma única coluna mutável sem histórico.

## Despesas

Operações:
- lançar despesa;
- registrar pagamento;
- cancelar;
- consultar vencimentos.

Uma despesa pode pertencer a uma unidade ou à empresa, conforme regra funcional definida.

## Estorno

O estorno deve ser tratado como operação compensatória, preservando a venda original.

Deve permitir:
- referência à operação original;
- motivo;
- usuário autorizado;
- valores revertidos;
- efeitos de caixa;
- efeitos de estoque;
- efeitos de contas a receber, quando aplicável;
- auditoria.

## Atomicidade

Quando duas ou mais mudanças precisam ocorrer juntas para manter o estado financeiro coerente, a operação deve ser executada pelo mesmo caso de uso transacional.

## Limites

Este contrato não cria tabelas nem executa operações no banco V2 ou V3.