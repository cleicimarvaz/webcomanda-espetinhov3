# Contrato do serviço de atendimento V3

## Objetivo

Orquestrar comanda, itens e envio para cozinha sem depender de alterações manuais de JSONB no frontend.

Fluxo conceitual:

UI → atendimentoServiceV3 → regras de comanda/pedido → persistência transacional

## Operações

### Abrir comanda
Entrada:
- unidade;
- usuário;
- identificação da mesa/comanda.

Validações:
- usuário possui acesso à unidade;
- identificação não está em uso quando a regra exigir exclusividade;
- unidade está ativa.

### Adicionar itens
Entrada:
- comanda;
- itens;
- observações;
- complementos;
- usuário;
- operação.

O preço praticado deve ser registrado no item, preservando o histórico comercial.

### Enviar para cozinha
O envio deve gerar um pedido/lote identificável.

Deve ser possível distinguir:
- item para preparo;
- item de entrega direta;
- item cancelado;
- item pronto;
- item entregue.

### Fechar comanda
Esta é uma operação financeira e não deve ser apenas um update de status.

O caso de uso deverá:
1. validar a comanda;
2. determinar os itens cobrados;
3. calcular o total oficial;
4. registrar a venda;
5. registrar pagamentos;
6. processar estoque;
7. lançar contas a receber quando necessário;
8. atualizar o estado da comanda;
9. registrar auditoria;
10. devolver o resultado para a UI.

## Idempotência

Fechamento e lançamentos devem aceitar uma operação identificável.

Em caso de timeout, a mesma operação deve poder ser reenviada sem criar segunda venda ou segunda baixa.

## Cancelamento

Cancelar um item não deve apagar o registro. Deve alterar seu estado e registrar motivo/usuário/data.

## Divisão

A divisão da conta deve ser um caso de uso próprio e não apenas manipulação visual.

O resultado deve indicar claramente quais itens/valores pertencem a cada parte e quais pagamentos foram registrados.

## Limites

Não implementar a persistência V3 neste momento. Este documento define o comportamento esperado para a camada de serviço.