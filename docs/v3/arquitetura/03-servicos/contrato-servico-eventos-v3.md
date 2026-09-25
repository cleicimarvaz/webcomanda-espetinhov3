# Contrato do serviço de eventos e ingressos V3

## Responsabilidade

Concentrar as regras de eventos, mesas, reservas, patrocinadores, tipos/lotes de ingresso, solicitações públicas, emissão, cancelamento e validação.

O serviço não deve ser substituído por consultas diretas da UI às tabelas do domínio.

---

## 1. Contexto

Toda operação administrativa recebe contexto:

```text
usuarioId
empresaId
unidadeId (quando aplicável)
sessaoId
operacaoId
```

O serviço valida o vínculo do usuário antes da operação.

Evento corporativo pode ter `unidadeId = null`.

---

## 2. Evento

Operações previstas:

- criar;
- editar;
- publicar;
- abrir/encerrar vendas, quando aplicável;
- encerrar evento;
- cancelar;
- consultar.

Regras:

- pertence a uma empresa;
- unidade é opcional conforme escopo do negócio;
- publicação é diferente de simples existência do cadastro;
- alterações relevantes são auditadas.

---

## 3. Mesas

Operações:

- criar mesa;
- alterar mesa;
- inativar mesa;
- listar disponibilidade.

Cada mesa possui identidade própria dentro do evento.

A quantidade de mesas deve ser derivada das mesas cadastradas.

Não usar JSONB como fonte de ocupação.

---

## 4. Reserva

Entrada conceitual:

```js
{
  eventoId,
  clienteId?,
  clienteSnapshot?,
  mesas: [{ eventoMesaId }],
  tipoReserva,
  valorUnitario?,
  observacao?,
  operacaoId
}
```

Operações:

- criar;
- solicitar;
- confirmar;
- cancelar;
- expirar;
- consultar histórico.

A associação de várias mesas deve ocorrer na mesma operação.

A mesma mesa não pode ser reservada duas vezes em estados incompatíveis.

---

## 5. Reserva pendente

Quando o fluxo usar `pendente`, o serviço deve considerar:

- prazo de validade, se houver;
- estado da mesa;
- conflito com outra reserva;
- confirmação ou cancelamento.

A regra exata de expiração é funcional e permanece aberta.

---

## 6. Valor da reserva

O valor praticado precisa ser preservado.

Uma alteração posterior do cadastro do evento não pode mudar o valor histórico de uma reserva/venda já registrada.

Receita do evento deve ser reconstruída a partir das fontes financeiras normalizadas.

---

## 7. Patrocinadores

Operações:

- cadastrar;
- vincular ao evento;
- alterar vínculo;
- encerrar vínculo;
- consultar.

Patrocinador deve ser entidade reutilizável.

O vínculo evento-patrocinador pode guardar atributos próprios da participação.

---

## 8. Tipo/lote de ingresso

Operações:

- criar;
- editar;
- ativar/inativar;
- consultar;
- encerrar vendas.

A decisão fechada é utilizar tipo de ingresso + lote. Cada lote concentra preço, limite, janela de venda e status.

Cada opção vendável deve possuir:

- preço;
- limite;
- período de venda;
- status.

---

## 9. Limite de ingressos

A emissão deve ser transacional.

Fluxo conceitual:

1. validar evento;
2. validar tipo/lote;
3. proteger estoque de ingressos;
4. reservar a quantidade;
5. executar venda/pagamento quando aplicável;
6. emitir ingressos;
7. registrar auditoria.

A mesma `operacaoId` não pode gerar ingressos duplicados.

---

## 10. Solicitação pública

Quando o negócio usar solicitação antes do pagamento:

`solicitação → confirmação financeira → emissão`

A solicitação representa intenção/pendência, e não necessariamente um ingresso válido.

O serviço deve poder:

- criar solicitação;
- atualizar dados permitidos;
- confirmar;
- cancelar;
- expirar.

O visitante público não recebe permissões administrativas.

---

## 11. Emissão de ingressos

Cada ingresso emitido possui:

- evento;
- tipo/lote;
- código único;
- comprador;
- valor praticado;
- venda de origem, quando aplicável;
- status;
- datas.

Uma venda pode gerar vários ingressos.

O código do ingresso deve ser não previsível e único.

---

## 12. Venda de ingresso

Quando houver cobrança:

`venda → venda_itens → venda_pagamentos`

Os ingressos devem apontar para a venda de origem.

A confirmação financeira deve respeitar o contrato dos serviços de venda e financeiro.

O módulo de eventos não deve manter um ledger financeiro paralelo.

---

## 13. Pagamento manual

Caso o negócio utilize confirmação manual, o serviço deve registrar a confirmação como operação financeira definida pelo domínio.

Alterar apenas `status = confirmado` sem preservar a origem financeira não é suficiente para a V3.

---

## 14. Cancelamento

Um ingresso pode ser cancelado somente em estados permitidos.

Regras mínimas:

- utilizado não volta silenciosamente a válido;
- cancelamento não apaga o registro;
- efeito financeiro, quando houver, passa pelo serviço financeiro;
- operação é auditada.

---

## 15. Validação de ingresso

Entrada:

```js
{
  codigo,
  eventoId?,
  usuarioId,
  dispositivoId?,
  portariaId?,
  operacaoId
}
```

O serviço deve:

1. localizar o ingresso pelo código;
2. bloquear/validar o registro de forma transacional;
3. conferir evento e status;
4. registrar a tentativa;
5. se válido, executar `confirmado → utilizado`;
6. retornar o resultado oficial.

---

## 16. Resultados de validação

O contrato deve distinguir pelo menos:

- válido e consumido agora;
- já utilizado;
- cancelado;
- pagamento pendente;
- código inexistente;
- evento incompatível;
- evento encerrado;
- erro técnico.

A UI apenas apresenta o resultado.

---

## 17. Histórico de validação

Cada tentativa relevante gera:

`validacoes_ingresso`

com:

- ingresso;
- resultado;
- usuário;
- dispositivo/gate;
- data;
- motivo;
- operação.

Uma segunda leitura do mesmo ingresso deve aparecer como tentativa rejeitada, não como segundo consumo.

---

## 18. Concorrência

Devem existir proteções para:

- duas reservas da mesma mesa;
- duas emissões sobre o limite do tipo/lote;
- duas validações do mesmo ingresso;
- retries da mesma operação;
- cancelamento concorrente com validação.

Essas regras devem ser resolvidas no serviço/banco.

---

## 19. Público

O fluxo público pode:

- consultar evento publicado;
- consultar ofertas públicas;
- iniciar solicitação;
- informar dados do comprador;
- consultar o próprio resultado, quando houver mecanismo seguro.

O fluxo público não pode:

- alterar evento;
- confirmar pagamento;
- cancelar operação administrativa;
- validar ingresso;
- acessar dados administrativos de outros compradores.

---

## 20. Impressão

A impressão é disparada depois da operação aplicável.

O comando pode conter:

- ingresso;
- evento;
- QR;
- layout;
- largura;
- destino;
- configuração do dispositivo.

Falha de impressão não desfaz a emissão.

---

## 21. Notificações

Notificações são efeitos posteriores.

Exemplo:

`pagamento confirmado → notificação`

Falha de WhatsApp/e-mail não desfaz a operação principal.

---

## 22. Auditoria

Operações sensíveis devem registrar:

- ator;
- empresa;
- unidade, quando aplicável;
- operaçãoId;
- entidade;
- antes/depois;
- resultado;
- data/hora.

A auditoria transacional não deve depender exclusivamente de uma chamada posterior feita pela UI.

---

## 23. Idempotência

Todas as operações que geram efeito devem aceitar uma `operacaoId`.

Retry deve devolver o resultado original quando a operação já tiver sido concluída.

Exemplos:

- emitir ingressos;
- confirmar pagamento;
- cancelar;
- validar;
- reservar mesas.

---

## 24. Resposta padrão

O serviço deve retornar estrutura previsível:

```js
{
  ok: true,
  data: {...},
  operacaoId,
  avisos: []
}
```

ou:

```js
{
  ok: false,
  codigo: "...",
  mensagem: "...",
  operacaoId
}
```

A UI não deve interpretar mensagens livres como regra de negócio.

---

## 25. Status das decisões

As decisões funcionais desse contrato foram consolidadas no ADR-004 e complementadas pela Revisão 07 do modelo relacional.

Não há decisão funcional pendente que impeça a consolidação do contrato ou do modelo físico. Integrações futuras, como gateway automático e contingência offline, permanecem como evolução técnica, não como pendências de negócio.


## ADDENDUM REVISAO 06 — Contrato após decisões fechadas

As decisões funcionais do ADR-004 agora estão incorporadas ao contrato.

### Lotes de ingresso

A emissão usa o encadeamento:

EVENTO → TIPO_INGRESSO → LOTE_INGRESSO → INGRESSO

O lote valida preço, limite, janela de venda e status.

### Reserva

Reserva pública pendente usa retenção padrão de 30 minutos, com possibilidade de configuração diferente por evento.

A reserva deve congelar o valor praticado, inclusive quando as mesas possuem preços diferentes.

### Transferência

Transferência de ingresso é operação própria, anterior ao início da operação do evento, preservando o histórico do titular.

### Reentrada

Reentrada somente ocorre quando habilitada no evento e respeita o limite configurado.

### Portaria

O serviço suporta múltiplas portarias/dispositivos. Na primeira entrega, validação exige conectividade com a fonte oficial.

### Pagamento e caixa

Venda interna de ingresso com pagamento imediato exige caixa aberto. Venda pública com confirmação manual de pagamento digital não depende de caixa operacional.

### Pendências removidas

O ciclo do evento, prazo de reserva, tipo/lote, janela de venda, cancelamento, reentrada, transferência, confirmação manual, regra de caixa, permissões e múltiplas portarias foram consolidados no ADR-004.

Nenhum desses pontos permanece como decisão funcional aberta.
