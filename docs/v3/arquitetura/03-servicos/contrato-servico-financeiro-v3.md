# Contrato do serviço financeiro V3

## Objetivo

Centralizar operações que alteram vendas, pagamentos, caixa, contas a receber e despesas.

Fluxo conceitual:

UI → financeiroServiceV3 → operação transacional → banco V3

## Venda e pagamento

Uma venda pode possuir um ou vários pagamentos.

Cada pagamento deve guardar:

- valor;
- forma;
- usuário;
- caixa, quando aplicável;
- data;
- referência à venda;
- operacaoId quando necessário.

O pagamento não deve existir apenas como texto em uma movimentação de caixa.

## Caixa

Operações do serviço:

- abrir caixa;
- consultar caixa ativo;
- registrar suprimento;
- registrar sangria;
- registrar pagamento vinculado;
- fechar caixa;
- consultar posição;
- consultar histórico.

Uma sessão de caixa pertence a uma unidade.

A regra de quantidade de caixas abertos simultaneamente por unidade será definida pelo negócio, mas a integridade deve ser protegida no banco.

O encerramento local do turno é diferente do fechamento real da sessão de caixa.

## Conciliação de caixa

O fechamento deve considerar as fontes financeiras e apresentar:

- valor inicial;
- entradas;
- saídas;
- valor esperado;
- valor contado;
- diferença;
- responsável;
- data/hora.

A diferença deve permanecer registrada e, conforme regra funcional, poderá exigir justificativa.

## Contas a receber

Operações:

- criar conta;
- receber valor total;
- receber valor parcial;
- consultar saldo;
- cancelar/estornar quando autorizado.

O saldo deve ser derivado dos recebimentos registrados.

Cada recebimento deve registrar:

- conta;
- valor;
- forma;
- usuário;
- caixa, quando aplicável;
- data;
- operação;
- observação.

Não depender somente de uma coluna mutável valor_pago.

## Despesas

Operações:

- lançar despesa;
- editar enquanto permitido;
- registrar pagamento;
- registrar pagamento parcial;
- cancelar;
- consultar vencimentos.

Uma despesa pode pertencer a uma unidade ou à empresa, conforme regra funcional definida.

Cada pagamento deve possuir histórico próprio.

## Estorno

O estorno deve ser tratado como operação compensatória, preservando a operação original.

Deve permitir, conforme o caso:

- referência à operação original;
- motivo;
- usuário autorizado;
- valores revertidos;
- efeitos de caixa;
- efeitos de estoque;
- efeitos de contas a receber;
- auditoria.

O estorno total ou parcial é suportado conforme o ADR-004: ambos são operações compensatórias, autorizadas e auditadas.

## Atomicidade

Quando duas ou mais mudanças precisam ocorrer juntas para manter o estado financeiro coerente, a operação deve ser executada pelo mesmo caso de uso transacional.

Exemplos:

- venda + pagamento + baixa de estoque;
- venda fiada + conta a receber;
- recebimento + caixa;
- pagamento de despesa + caixa;
- estorno + reversões correspondentes.

## Idempotência

Operações financeiras críticas devem aceitar uma chave de operação.

Retry da mesma operação não deve gerar duplicidade de:

- pagamento;
- movimentação de caixa;
- conta a receber;
- pagamento de despesa;
- estorno.

## Integridade organizacional

O serviço deve validar:

- usuário ativo;
- empresa;
- unidade;
- caixa pertencente à unidade;
- cliente pertencente à empresa;
- origem financeira compatível com a unidade.

A UI não é autoridade de escopo.

## Auditoria

Operações críticas devem produzir evento estruturado com:

- usuário;
- empresa;
- unidade;
- operação;
- entidade;
- valores relevantes;
- origem;
- resultado.

A auditoria essencial deve permanecer dentro da operação transacional.

## Limites

Este contrato não cria tabelas nem executa operações no banco V2 ou V3.

O banco físico V3 será consolidado após a revisão final de consistência entre modelos, contratos e regras.


## ADDENDUM REVISAO 06 — Regras financeiras fechadas

### Caixa

A primeira entrega permite no máximo um caixa aberto por unidade.

Fechamento exige:

- contagem física;
- valor esperado;
- valor contado;
- diferença;
- justificativa quando houver diferença.

Caixa encerrado não é reaberto. Correções posteriores usam operações de ajuste/estorno.

### Venda e pagamento

Pagamento imediato exige caixa aberto na unidade. Venda exclusivamente FIADO pode ser concluída sem entrada no caixa.

PIX e cartão também ficam associados à sessão de caixa para reconciliação.

### Conta a receber

A conta guarda a unidade de origem. O recebimento identifica a unidade e o caixa em que ocorreu, permitindo recebimento em outra unidade da mesma empresa.

### Estorno

Estorno total ou parcial é operação compensatória e auditada. A operação original permanece preservada.

Retorno físico ao estoque não acontece automaticamente pelo simples estorno; quando aplicável, deve ser registrado por operação específica de devolução/entrada.

O contrato já não possui decisões financeiras funcionais abertas que impeçam a modelagem.
