# Contrato do serviço de venda V3

## Objetivo

Definir o contrato da operação de venda antes de conectar a aplicação ao banco V3.

A venda deve deixar de depender de várias chamadas independentes feitas pelo frontend.

Fluxo alvo:

`UI → vendaServiceV3 → operação transacional → banco V3`

## Entrada

A operação deverá receber, no mínimo:

- itens do pedido;
- forma de pagamento;
- vendedor/usuário identificado;
- unidade atual;
- caixa, quando aplicável;
- dados do cliente quando a operação for fiado;
- chave de idempotência (`operacaoId`).

## Regras

1. O total cobrado deve ser derivado dos itens recebidos no serviço/servidor, e não aceito como autoridade do navegador.
2. O serviço deve validar itens, quantidades e forma de pagamento antes da persistência.
3. Venda balcão e fechamento de comanda devem compartilhar a mesma base de regras financeiras.
4. Baixa de estoque e registro financeiro devem fazer parte da mesma operação transacional quando a regra de negócio exigir atomicidade.
5. Retentativas devem reutilizar a mesma `operacaoId`.
6. Auditoria deve identificar usuário, empresa, unidade e operação.

## Preparação sem banco

Enquanto o banco V3 não existir, podemos desenvolver e validar:

- normalização do carrinho;
- cálculo determinístico do total;
- validação de pagamento;
- geração e propagação da `operacaoId`;
- montagem do payload da operação;
- tratamento padronizado de erro;
- contrato de resposta.

Não devemos ainda executar a venda V3 contra a base da V2 nem criar tabelas intermediárias para simular o banco definitivo.

## Resposta esperada

O serviço deverá retornar uma estrutura previsível, por exemplo:

```js
{
  ok: true,
  operacaoId: 'uuid',
  vendaId: 'id-gerado-pelo-backend',
  total: 0,
  pagamento: 'Pix',
  estoqueProcessado: true
}
```

O formato definitivo dos IDs será ajustado quando o modelo físico do banco V3 for fechado.

## Próxima integração

O primeiro consumidor será `componentes/vendas.js`, inicialmente atrás de feature flag, sem remover o fluxo legado.