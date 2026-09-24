# Contrato do serviço de atendimento V3

## Objetivo

Orquestrar comanda, itens e envio para cozinha sem depender de alterações manuais de JSONB no frontend.

Fluxo conceitual:

UI → atendimentoServiceV3 → regras de comanda/pedido → persistência transacional

Quando houver fechamento financeiro:

UI → atendimento/vendaServiceV3 → operação transacional → venda + pagamentos + efeitos de estoque/financeiro + comanda

## Operações

### Abrir comanda

Entrada:
- empresa;
- unidade;
- usuário;
- identificação da mesa/comanda;
- operação.

Validações:
- usuário possui acesso à unidade;
- unidade está ativa;
- identificação não está em uso enquanto a comanda estiver ativa, quando essa for a regra do negócio;
- operação é idempotente.

A exclusividade não deve depender de verificação somente no navegador.

### Adicionar itens

Entrada:
- comanda;
- itens;
- observações;
- complementos;
- usuário;
- operação.

O serviço deve:
- validar a comanda;
- validar produtos;
- obter o preço efetivo;
- preservar o preço praticado;
- criar itens com identificação própria;
- registrar o usuário e a operação.

A quantidade enviada para cozinha pode ser diferente da quantidade total do item.

### Alterar item

Operações específicas devem existir para:
- alterar quantidade;
- alterar observação;
- dividir quantidade entre preparo e entrega direta;
- cancelar item;
- cancelar parcialmente, quando permitido.

A operação deve trabalhar com comanda_item_id, nunca com posição em array.

### Enviar para cozinha

O envio deve gerar um pedido/lote identificável.

Deve ser possível distinguir:
- item para preparo;
- item de entrega direta;
- item cancelado;
- item em preparo;
- item pronto;
- item entregue.

O lote deve possuir identidade própria. Horário é atributo, não identidade.

### Atualizar produção

A cozinha deve trabalhar sobre pedido e pedido_item.

Operações previstas:
- aceitar;
- iniciar preparo;
- concluir;
- registrar recusa;
- desfazer conclusão, quando autorizado;
- reimprimir.

A atualização deve preservar o histórico do pedido.

### Cancelar item

Cancelar um item não deve apagar o registro.

O serviço deve registrar:
- usuário;
- data;
- motivo;
- quantidade afetada;
- estado anterior;
- estado novo;
- operação.

A regra financeira do cancelamento pertence ao atendimento/venda, não à tela da cozinha.

### Fechar comanda

Esta é uma operação financeira e não deve ser apenas um update de status.

O caso de uso deverá:

1. validar a comanda;
2. determinar os itens e quantidades efetivamente cobrados;
3. calcular o total oficial;
4. registrar a venda;
5. registrar pagamentos;
6. processar estoque;
7. lançar contas a receber quando necessário;
8. atualizar o estado da comanda;
9. registrar auditoria;
10. devolver o resultado para a UI.

Quando houver fiado, os efeitos que precisam ser atômicos devem ocorrer na mesma operação.

A impressão ocorre depois da confirmação da operação.

### Dividir conta

A divisão deve ser um caso de uso próprio.

O serviço deve representar:
- partes da conta;
- itens atribuídos às partes;
- quantidades;
- valores;
- pagamentos;
- troco;
- operação;
- estado resultante da comanda.

Itens pagos não devem ser apagados do histórico da comanda apenas por terem sido atribuídos a uma parte.

### Reabrir comanda

Reabrir não deve apagar venda nem pagamento anteriores.

O serviço deve registrar a reabertura e manter rastreabilidade dos novos lançamentos.

### Cancelamento e estorno

Cancelamentos e estornos devem preservar o registro original.

Quando uma operação gerar reversão de estoque ou financeiro, essa reversão deve ser identificável e idempotente.

## Idempotência

Abertura, lançamentos, fechamento, divisão e operações críticas devem aceitar uma operação identificável.

Em caso de timeout, a mesma operação deve poder ser reenviada sem criar:
- segunda comanda;
- segundo lançamento;
- segunda venda;
- segunda baixa de estoque;
- segundo pagamento.

## Concorrência

O serviço deve assumir que múltiplos dispositivos podem operar a mesma unidade e, em alguns fluxos, a mesma comanda.

Não deve fazer:

1. ler JSONB;
2. alterar o JSONB no navegador;
3. salvar o JSONB inteiro.

As alterações devem ser operações específicas e protegidas pelo backend/banco.

## Limites

Não implementar a persistência V3 neste momento. Este documento define o comportamento esperado para a camada de serviço antes da consolidação do banco.

## Dependências com outros domínios

Atendimento pode solicitar:
- preço ao Catálogo;
- efeito de estoque ao Estoque;
- fechamento comercial à Venda;
- pagamentos ao Financeiro;
- impressão à Infraestrutura/Impressão.

Um domínio não deve editar diretamente as tabelas internas de outro domínio.

## Resposta esperada

O formato exato dependerá do modelo físico, mas o serviço deverá retornar resultado previsível, por exemplo:

```js
{
  ok: true,
  operacaoId: 'uuid',
  comandaId: 'id',
  pedidoId: 'id-ou-null',
  vendaId: 'id-ou-null',
  total: 0,
  estado: 'aberta'
}
```

O formato definitivo dos IDs será ajustado quando o modelo físico do banco V3 for fechado.
