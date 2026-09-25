# Contrato do serviço de venda V3

## Objetivo

Definir o contrato da operação de venda antes de conectar a aplicação ao banco V3.

A venda deve deixar de depender de várias chamadas independentes feitas pelo frontend.

Fluxo alvo:

UI → vendaServiceV3 → operação transacional → banco V3

## Entrada

A operação deverá receber, no mínimo:

- itens do pedido;
- origem da venda (balcão ou comanda);
- forma(s) de pagamento;
- vendedor/usuário identificado;
- empresa e unidade do contexto;
- caixa, quando aplicável;
- dados do cliente quando a operação for fiado;
- descontos/taxas autorizados;
- chave de idempotência (operacaoId).

## Regras

1. O total cobrado deve ser derivado dos itens e regras recebidos pelo serviço/servidor, e não aceito como autoridade do navegador.
2. O serviço deve validar itens, quantidades, preços aplicáveis, complementos e formas de pagamento antes da persistência.
3. Venda balcão e fechamento de comanda devem compartilhar a mesma base de regras financeiras.
4. Baixa de estoque, pagamentos, conta a receber e alteração final da comanda devem participar da mesma operação transacional quando a regra exigir atomicidade.
5. Retentativas devem reutilizar a mesma operacaoId.
6. Auditoria deve identificar usuário, empresa, unidade e operação.
7. O preço praticado deve ser congelado em venda_itens.
8. Pagamentos devem possuir entidade própria e apontar para a venda e para o caixa quando aplicável.
9. O valor efetivamente incorporado ao caixa deve refletir o recebimento líquido, considerando troco.
10. Uma venda estornada deve preservar a venda original e produzir operações compensatórias.

## Venda balcão

O fluxo deve permitir:

- venda sem comanda;
- cliente opcional;
- caixa conforme regra funcional definida;
- pagamento único ou múltiplo;
- fiado quando permitido;
- baixa de estoque;
- impressão após conclusão.

## Fechamento de comanda

Quando a venda vier de uma comanda:

- a comanda deve estar em estado compatível com fechamento;
- o serviço determina os itens efetivamente cobrados;
- a venda referencia a comanda;
- o fechamento da comanda ocorre dentro da mesma operação, quando aplicável.

## Fiado

Se a forma de pagamento gerar crédito:

- a venda deve ser criada;
- a conta a receber deve ser criada;
- o cliente deve atender às regras obrigatórias;
- os efeitos devem ser atômicos quando necessário.

Não aceitar estado final em que a venda exista e o fiado obrigatório não exista.

## Pagamento dividido

O serviço deve suportar múltiplos pagamentos quando esse recurso for habilitado.

Cada pagamento deve registrar:

- valor;
- forma;
- venda;
- usuário;
- caixa, quando aplicável;
- operação;
- data.

## Divisão de conta

A divisão é responsabilidade do caso de uso de atendimento, mas o fechamento financeiro resultante deve usar o mesmo contrato de venda/pagamento.

Não criar várias vendas artificiais apenas para representar parcelas da mesma conta, salvo quando a regra funcional deliberadamente definir operações comerciais separadas.

## Estorno

O estorno deve ser uma operação própria e identificável.

Pode envolver:

- reversão de pagamentos;
- ajuste de caixa;
- retorno de estoque;
- reversão de conta a receber.

O resultado deve ser idempotente.

## Idempotência

A mesma operacaoId deve produzir o mesmo resultado lógico.

Em caso de timeout, o retry não deve criar segunda venda, pagamento, baixa ou conta a receber.

## Preparação sem banco

Enquanto o banco V3 não existir, podemos desenvolver e validar:

- normalização do carrinho;
- cálculo determinístico do total;
- validação de pagamento;
- geração e propagação da operacaoId;
- montagem do payload da operação;
- tratamento padronizado de erro;
- contrato de resposta.

Não executar a venda V3 contra a base da V2 nem criar tabelas intermediárias para simular o banco definitivo.

## Resposta esperada

O formato exato dependerá do modelo físico, mas o serviço deverá retornar estrutura previsível, por exemplo:

{
  ok: true,
  operacaoId: 'uuid',
  vendaId: 'id-gerado-pelo-backend',
  comandaId: 'id-ou-null',
  total: 0,
  pagamentos: [],
  estoqueProcessado: true
}

O formato definitivo dos IDs será ajustado quando o modelo físico do banco V3 for fechado.

## Próxima integração

O primeiro consumidor será componentes/vendas.js, inicialmente atrás de feature flag, sem remover o fluxo legado.
