# Contrato do serviço de eventos e ingressos V3

## Responsabilidade

Concentrar as regras de eventos, reservas, mesas, ingressos e validação pública.

## Evento

Operações:
- criar;
- editar;
- ativar/finalizar/cancelar;
- configurar mesas;
- configurar períodos e regras de ingresso;
- publicar dados públicos.

## Reserva

Operações:
- solicitar;
- aprovar/confirmar;
- cancelar;
- associar mesas;
- registrar comprovante;
- notificar quando aplicável.

## Ingresso

Operações:
- criar tipo;
- emitir;
- cancelar;
- validar;
- consultar histórico.

## Concorrência

A emissão deve proteger limites de lote.

A validação deve executar uma operação atômica do tipo:

\`pendente/confirmado → utilizado\`

sem permitir que duas leituras concorrentes consumam o mesmo ingresso.

## Público

O visitante deve receber somente os dados necessários para:
- consultar evento publicado;
- escolher ingresso/reserva permitida;
- enviar informações necessárias;
- acompanhar o próprio pedido.

Operações administrativas ficam fora do fluxo público.

## Auditoria

Registrar criação, alterações sensíveis, confirmações, cancelamentos, emissão e validação.
