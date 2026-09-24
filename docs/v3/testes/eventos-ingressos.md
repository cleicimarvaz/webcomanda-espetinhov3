# Testes futuros — Eventos + Ingressos V3

Este documento descreve os testes que deverão ser executados quando o banco V3 físico for criado.

Nenhum teste deste arquivo deve ser aplicado agora na V2.

## 1. Evento

- criar evento com empresa válida;
- impedir evento sem empresa;
- aceitar evento corporativo quando `unidade_id` for opcional;
- impedir acesso de usuário fora do contexto organizacional;
- validar transições de publicação/encerramento/cancelamento.

## 2. Mesas

- criar mesas para um evento;
- impedir número de mesa duplicado no mesmo evento;
- permitir o mesmo número em eventos diferentes;
- inativar mesa sem apagar histórico;
- conferir que a capacidade visual corresponde às mesas cadastradas.

## 3. Concorrência de reserva

Executar duas transações concorrentes tentando reservar a mesma mesa.

Resultado esperado:

- somente uma reserva ativa é aceita;
- a outra recebe conflito controlado;
- não existe duplicidade em `reserva_mesas`.

## 4. Reserva com várias mesas

- criar reserva para uma mesa;
- criar reserva para várias mesas;
- cancelar a reserva;
- conferir que todas as mesas são liberadas;
- conferir que o histórico continua disponível.

## 5. Reserva pendente

- criar pendente;
- confirmar;
- cancelar;
- expirar quando a regra funcional existir;
- verificar a disponibilidade da mesa após cada transição.

## 6. Valor histórico

- criar reserva com valor A;
- alterar o preço do evento para valor B;
- conferir que a reserva/venda histórica continua com valor A;
- conferir que relatório não recalcula a reserva usando B.

## 7. Tipos/lotes de ingresso

- criar oferta ativa;
- impedir preço negativo;
- definir limite;
- validar período de venda;
- ativar/inativar;
- encerrar vendas.

## 8. Concorrência de emissão

Executar duas emissões concorrentes acima do limite disponível.

Resultado esperado:

- a quantidade total emitida não ultrapassa o limite;
- somente as operações aceitas geram ingressos;
- retry da mesma `operacaoId` não duplica emissão.

## 9. Solicitação pública

- consultar somente evento publicado;
- criar solicitação;
- confirmar pagamento;
- emitir ingressos;
- expirar/cancelar solicitação;
- impedir acesso a dados de outros compradores.

## 10. Ingresso individual

- código único;
- código não previsível;
- vínculo com evento;
- vínculo com tipo/lote;
- vínculo com venda;
- cancelamento preservando histórico.

## 11. Validação concorrente

Executar duas validações simultâneas para o mesmo código.

Resultado esperado:

- somente uma operação consome o ingresso;
- o outro resultado indica já utilizado;
- as duas tentativas ficam registradas;
- nunca existem dois consumos bem-sucedidos.

## 12. Cancelamento x validação

Testar corrida entre:

- cancelamento;
- validação.

Resultado esperado: apenas uma transição válida segundo a regra de estado; nenhum ingresso pode ficar com dois efeitos incompatíveis.

## 13. Financeiro

- venda de um ingresso;
- venda de vários ingressos;
- pagamento;
- vínculo ao caixa quando aplicável;
- cancelamento/estorno conforme regra;
- conferência da receita do evento pelas fontes normalizadas.

## 14. Impressão e notificação

- emissão concluída e impressão falha;
- emissão concluída e WhatsApp falha.

Resultado esperado: a falha de saída não desfaz a operação principal.

## 15. Auditoria

Conferir que as operações críticas possuem:

- usuário;
- empresa;
- unidade, quando aplicável;
- entidade;
- operaçãoId;
- resultado;
- data/hora.

## 16. Teste público de segurança

Validar que a superfície pública não permite:

- confirmar pagamento;
- editar evento;
- cancelar reserva administrativa;
- validar ingresso;
- consultar dados privados de outros compradores.

## 17. Regra para o banco V3

Os testes serão executados somente após:

`schema final → funções → RLS → bootstrap → preflight → smoke tests`

e não serão aplicados automaticamente sobre a V2.
