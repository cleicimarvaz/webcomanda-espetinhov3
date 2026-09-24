# Contrato do serviço de relatórios V3

## Responsabilidade

Centralizar consultas e agregações de leitura para dashboards, relatórios e exportações.

O serviço não altera dados transacionais.

## Contexto

Toda consulta recebe contexto autorizado:

```text
usuarioId
empresaId
unidadeId (quando aplicável)
sessaoId
```

O serviço aplica filtros organizacionais antes de devolver dados.

## Princípios

- relatório não é fonte de verdade;
- números devem derivar das entidades transacionais V3;
- cada relatório define a data do fato usada no filtro;
- tela, PDF e Excel devem usar o mesmo resultado de consulta;
- projeções devem ser identificadas como estimativas;
- agregações podem ser realizadas no banco por views/consultas específicas;
- relatórios grandes devem suportar paginação ou processamento assíncrono.

## Operações previstas

- resumo de vendas;
- vendas por produto;
- vendas por forma de pagamento;
- fechamento/histórico de caixa;
- fluxo financeiro;
- despesas por categoria;
- DRE gerencial;
- comparativo de períodos;
- contas a receber;
- estoque por unidade;
- movimentações de estoque;
- eventos e ingressos;
- metas e progresso;
- indicadores do dashboard.

## Datas

O serviço deve distinguir:

- data de conclusão da venda;
- data do pagamento;
- data de abertura/fechamento do caixa;
- data da obrigação;
- data do pagamento da despesa;
- data da validação do ingresso.

Não usar uma coluna de data genérica para fatos diferentes.

## Vendas e pagamentos

Vendas devem consultar:

`vendas + venda_itens + venda_pagamentos`

e não `historico_vendas`.

Quando houver pagamento dividido, cada pagamento deve aparecer na métrica correspondente.

## Estornos

A venda original continua histórica.

O relatório deve considerar os efeitos compensatórios segundo o tipo de indicador:

- bruto;
- líquido;
- pagamentos;
- estornos.

## Estoque

Consultas de saldo usam:

`estoque_produto_unidade`

Histórico usa:

`estoque_movimentacoes`

Inventários e transferências entram quando o relatório exigir.

## Contas e despesas

Saldo de conta a receber deriva dos recebimentos.

Total pago de despesa deriva de `despesa_pagamentos`.

Não depender apenas de flags mutáveis como `paga` ou `valor_pago`.

## Eventos

Indicadores devem derivar de:

- eventos;
- evento_mesas;
- reservas_evento;
- reserva_mesas;
- ingressos;
- validacoes_ingresso;
- vendas/pagamentos.

## Projeções

Projeções devem retornar também a metodologia e o período utilizado.

Exemplo conceitual:

```js
{
  tipo: "projecao",
  metodologia: "...",
  periodoBase: {...},
  periodoProjetado: {...},
  valorEstimado: 0
}
```

O valor estimado não deve ser apresentado como realizado.

## Resposta

Estrutura conceitual:

```js
{
  ok: true,
  data: {...},
  filtros: {...},
  geradoEm: "...",
  avisos: []
}
```

Erro:

```js
{
  ok: false,
  codigo: "...",
  mensagem: "..."
}
```

## Exportação

PDF, Excel e CSV recebem o resultado normalizado do serviço.

Os renderizadores não devem criar uma segunda regra de negócio.

## Cache

Cache pode ser usado em indicadores de leitura, desde que:

- tenha validade conhecida;
- respeite o escopo organizacional;
- não seja usado como fonte de verdade para operações financeiras.

## Auditoria

Consultas comuns não precisam gerar evento para cada leitura.

Operações administrativas sobre configuração de relatórios, escopos ou exportações sensíveis podem possuir auditoria conforme a política geral.

## Decisões funcionais pendentes

- conjunto de relatórios do primeiro release;
- indicadores oficiais do dashboard;
- definição final do DRE gerencial;
- regras de indicadores com estorno;
- relatórios corporativos;
- retenção e processamento assíncrono de relatórios grandes.
