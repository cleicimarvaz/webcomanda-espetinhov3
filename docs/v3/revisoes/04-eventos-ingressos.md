> **Nota de histórico:** as decisões funcionais de eventos e ingressos que aparecem como pendentes neste documento foram posteriormente fechadas no ADR-004. O conteúdo abaixo preserva a revisão realizada na época.

# Revisão V3 — Eventos + Ingressos

## Objetivo

Esta revisão confronta o módulo atual de eventos, reservas, mesas, patrocinadores, ingressos e validação com a arquitetura V3.

O foco é separar claramente:

- evento e sua publicação;
- ocupação/reserva de mesas;
- venda de ingressos;
- emissão do ingresso individual;
- validação na portaria;
- efeitos financeiros;
- impressão e notificações.

O banco V3 definitivo continua fora desta etapa.

---

## 1. Situação atual

A V2 possui os seguintes blocos:

- `eventos-core.js`;
- `eventos-reservas.js`;
- `eventos-mapa.js`;
- `eventos-patrocinadores.js`;
- `eventos-financeiro.js`;
- `eventos-impressao.js`;
- `ingressos.js`;
- `ingresso-publico.js`;
- `scanner-ingressos.js`.

O banco legado mantém eventos, reservas, tipos de ingresso e ingressos diretamente.

A implementação atual funciona, mas várias regras importantes estão no navegador e alguns históricos são representados por JSONB ou por exclusão física.

---

## 2. Evento e escopo organizacional

O evento atual não possui contexto de empresa/unidade. A V3 deve fechar:

`empresa → evento`

e permitir:

`unidade → evento`

quando o evento estiver associado a um estabelecimento específico.

### Direção V3

`empresa_id` é obrigatório.

`unidade_id` é opcional.

Isso permite eventos:

- próprios de uma unidade;
- corporativos;
- realizados fora de uma unidade específica.

O vínculo organizacional deve ser validado pelo serviço e pelo banco/RLS.

---

## 3. Ciclo de vida do evento

Hoje o código trabalha principalmente com `ativo`, `finalizado` e `cancelado`.

Na V3, publicação e operação não devem ser a mesma coisa.

O modelo deve ser capaz de distinguir, conforme a regra final:

- rascunho;
- publicado;
- em operação;
- encerrado;
- cancelado.

A nomenclatura exata fica como decisão funcional, mas o sistema não deve depender de `status = ativo` para representar simultaneamente publicação, venda e operação.

---

## 4. Mesas do evento

A V2 guarda a capacidade como:

`eventos.quantidade_mesas`

e as mesas reservadas em:

`reservas_evento.mesas` JSONB.

Além disso, o mapa calcula a disponibilidade lendo todas as reservas e comparando arrays no JavaScript.

### Direção V3

Usar:

- `evento_mesas`;
- `reserva_mesas`.

Cada mesa passa a ter identidade própria.

Exemplo:

`evento 10 → mesa 1, mesa 2, mesa 3...`

A numeração deve ser única dentro do evento.

A quantidade total de mesas passa a ser derivada da estrutura de mesas, e não uma segunda fonte de verdade.

---

## 5. Concorrência de reserva

A V2 faz:

1. ler todas as reservas;
2. juntar os arrays de mesas;
3. verificar conflito no navegador;
4. inserir a nova reserva.

Duas pessoas podem executar esse fluxo ao mesmo tempo e ambas enxergarem a mesa como livre antes de gravar.

### Direção V3

A reserva deve ser protegida no serviço/banco.

A mesma mesa não pode possuir duas reservas ativas incompatíveis no mesmo evento.

A proteção precisa ocorrer na persistência, não apenas no mapa.

Quando uma reserva tiver várias mesas, a associação deverá ser feita como várias linhas em `reserva_mesas`, dentro da mesma operação.

---

## 6. Reserva pendente e bloqueio temporário

A V2 usa `pendente` e mantém a mesa ocupada até uma ação manual de confirmação/liberação.

A V3 deve tratar explicitamente:

- reserva pendente;
- reserva confirmada;
- cancelamento;
- expiração, quando houver prazo.

A decisão de negócio sobre quanto tempo uma reserva pendente bloqueia a mesa continua aberta.

Tecnicamente, o modelo deve comportar expiração sem depender de apagar a reserva.

---

## 7. Histórico de reserva

Hoje existem fluxos que removem a reserva fisicamente.

Na V3, reservas confirmadas, canceladas ou expiradas não devem desaparecer apenas para liberar uma mesa.

A direção é preservar:

- status;
- datas;
- ator;
- operação;
- motivo;
- mesas relacionadas.

Isso melhora auditoria e permite reconstruir a ocupação histórica do evento.

---

## 8. Valor da reserva de mesa

A V2 calcula a receita do evento com:

`quantidade de mesas × eventos.valor_mesa`.

Isso significa que uma alteração posterior do valor da mesa pode mudar a interpretação histórica de uma reserva antiga.

### Direção V3

A reserva deve congelar o valor praticado, ou a cobrança deve ser registrada como item de venda com preço congelado.

O painel financeiro do evento não deve reconstruir receita usando o preço atual do cadastro.

Cortesias e bloqueios também devem possuir classificação explícita, e não depender de palavras no nome do cliente.

---

## 9. Tipos de reserva

Atualmente o código identifica cortesia/bloqueio por:

- `tipo`;
- texto do nome do cliente;
- palavras como `CORTESIA` ou `BLOQUEIO`.

Isso gera regra implícita e frágil.

### Direção V3

A reserva deve possuir classificação própria, por exemplo:

- venda;
- cortesia;
- bloqueio;
- outro tipo definido pelo negócio.

A regra exata fica aberta, mas a classificação deve ser um campo estruturado.

---

## 10. Clientes em reservas

A reserva atual guarda nome e telefone diretamente.

Na V3, quando houver cliente cadastrado, a reserva pode apontar para `cliente_id`.

Ainda assim, o histórico pode manter um snapshot do nome/telefone usado na operação para que uma alteração posterior do cadastro não reescreva o passado.

---

## 11. Patrocinadores

A V2 guarda patrocinadores como JSON dentro do próprio evento.

Isso dificulta:

- reutilização;
- histórico;
- ordenação;
- campos adicionais;
- relatórios.

### Direção V3

Usar:

- `patrocinadores`;
- `evento_patrocinadores`.

O relacionamento deve permitir atributos próprios do vínculo, como:

- categoria/cota;
- posição;
- valor;
- observação;
- ordem de exibição;
- material de divulgação.

A exclusão deve ser substituída por inativação ou encerramento do vínculo quando houver histórico associado.

---

## 12. Tipo de ingresso x lote

Hoje `tipos_ingresso` funciona como uma mistura de:

- categoria comercial;
- preço;
- limite de quantidade.

Para a primeira modelagem, esse conceito pode continuar representando uma opção vendável do evento.

Entretanto, a V3 deve decidir antes do SQL final se haverá:

- apenas tipos de ingresso;
- tipos + lotes;
- tipos reutilizáveis + lotes comerciais por período.

O modelo não deve depender de `quantidade_vendida` como única fonte de verdade.

---

## 13. Limite de ingressos e concorrência

Na V2, o contador `quantidade_vendida` é atualizado em uma chamada separada depois da inserção do ingresso.

Esse padrão permite inconsistências:

- duas vendas concorrentes podem ultrapassar o limite;
- o contador pode falhar depois da venda;
- retry pode duplicar a quantidade.

### Direção V3

A emissão deve ser transacional.

A operação precisa:

1. validar o evento e o período de venda;
2. validar o tipo/lote;
3. proteger o limite;
4. criar os ingressos necessários;
5. vincular a venda/pagamento quando aplicável;
6. confirmar tudo de forma atômica.

`quantidade_vendida`, caso exista, será no máximo um dado derivado/cache transacional.

---

## 14. Solicitação pública de ingressos

O fluxo público atual cria imediatamente os registros individuais de ingresso com status `pendente`.

Depois o colaborador muda o status para `confirmado`.

Esse fluxo mistura:

- solicitação;
- cobrança;
- emissão;
- ingresso individual.

### Direção V3

Separar o pedido da emissão quando isso for necessário.

O modelo deve poder representar:

`solicitação pública → pagamento/confirmação → emissão dos ingressos`

Assim um QR visualizado antes do pagamento não precisa representar um ingresso já válido.

Uma entidade de solicitação/pedido de ingressos pode ser utilizada para agrupar várias unidades solicitadas.

---

## 15. Ingresso individual

O ingresso individual deve possuir:

- evento;
- tipo/lote;
- código único;
- comprador;
- valor praticado;
- venda de origem;
- status;
- datas;
- dados necessários para validação.

O código apresentado ao QR deve ser um identificador aleatório/forte e não depender do ID interno sequencial.

A chave atual baseada em UUID é compatível com essa direção.

---

## 16. Venda do ingresso e financeiro

Hoje a aprovação pública apenas troca o status do ingresso.

Na V3, a venda de ingresso deve participar do mesmo modelo financeiro das demais vendas:

`venda → venda_itens → venda_pagamentos`

e os ingressos individuais devem referenciar a operação comercial correspondente.

O tipo `pendente` representa um estado de negócio e não deve, sozinho, ser tratado como recebimento financeiro.

Quando houver confirmação manual de pagamento, essa confirmação deverá criar ou concluir a operação financeira definida pelo serviço de venda/financeiro.

---

## 17. Compra de vários ingressos

Uma única solicitação ou venda pode gerar vários ingressos individuais.

Por isso:

`uma venda → vários ingressos`

é o relacionamento desejado.

Cada ingresso continua possuindo seu próprio código e histórico de validação.

---

## 18. Cancelamento de ingresso

A V2 altera o status para `cancelado`, mas não há regra persistente suficiente para controlar todas as transições.

Na V3:

- ingresso utilizado não pode ser simplesmente cancelado;
- cancelamentos preservam histórico;
- efeitos financeiros devem passar pelo serviço financeiro;
- o QR continua identificável, porém inválido.

Cancelamento de um ingresso não deve apagar o registro.

---

## 19. Validação na portaria

O scanner atual já consulta o banco antes de decidir a entrada e utiliza:

`update ... where status = 'confirmado'`

Isso ajuda a evitar uma segunda confirmação quando duas leituras concorrem, mas ainda falta registrar a tentativa e interpretar de forma confiável o resultado da atualização.

### Direção V3

A validação deve ser uma operação do serviço, preferencialmente transacional:

`confirmado → utilizado`

junto com um registro em:

`validacoes_ingresso`.

A resposta deve diferenciar:

- QR inexistente;
- ingresso cancelado;
- ingresso pendente;
- ingresso já utilizado;
- ingresso válido e consumido agora;
- erro técnico.

---

## 20. Consumo duplo

A proteção contra uso duplo deve existir mesmo que duas portarias ou dois celulares leiam o mesmo QR praticamente ao mesmo tempo.

O navegador não pode decidir isso.

A persistência deve garantir que somente uma operação consiga realizar a transição de consumo.

Uma segunda tentativa deve ser registrada como tentativa rejeitada ou equivalente definido pelo modelo.

---

## 21. Histórico de validações

O status atual do ingresso informa o estado presente.

O histórico deve informar o que aconteceu.

`validacoes_ingresso` deve registrar, quando aplicável:

- ingresso;
- resultado;
- data/hora;
- usuário;
- dispositivo/gate;
- motivo;
- operação.

Isso também ajuda em auditoria de filas, tentativas inválidas e suporte.

---

## 22. Fluxo público

A página pública atual consegue ler o evento e os tipos de ingresso diretamente.

Na V3, o fluxo público deve receber somente os dados necessários para o visitante.

Ele não deve:

- consultar dados administrativos;
- alterar evento;
- alterar preço;
- confirmar pagamento;
- validar ingresso;
- cancelar operação administrativa.

A exposição pública deve ser baseada em contratos/views/RLS específicos.

---

## 23. QR Code

O QR Code deve conter somente o identificador necessário para a validação.

A validação deve sempre consultar a fonte oficial.

Não confiar em:

- nome do comprador embutido;
- valor;
- tipo;
- status;
- data.

Esses dados devem vir do sistema durante a validação.

---

## 24. Impressão

A impressão atual já suporta geração de QR e ticket.

Na V3 ela deve ser pós-operação:

`operação concluída → comando de impressão`

O fato de imprimir com sucesso não pode alterar o estado financeiro nem validar o ingresso.

O serviço de impressão deve receber:

- ingresso;
- evento;
- layout;
- largura;
- destino/dispositivo.

A mesma regra de 58/80 mm já definida para o restante do sistema se aplica aos ingressos.

---

## 25. Notificações

WhatsApp é utilizado atualmente como mecanismo manual de notificação.

Na V3, notificações devem ser uma saída da operação, não a confirmação da operação.

Exemplo:

`pagamento confirmado → evento de notificação`

Se o WhatsApp falhar, isso não deve desfazer uma venda já confirmada.

---

## 26. Auditoria

Devem ser auditados, no mínimo:

- criação/alteração/cancelamento de evento;
- publicação/encerramento;
- criação/alteração de mesas;
- reserva;
- confirmação/cancelamento/expiração;
- criação/alteração de tipo/lote;
- emissão de ingresso;
- confirmação de pagamento;
- cancelamento de ingresso;
- validação;
- tentativas inválidas relevantes;
- impressão administrativa quando necessário.

A auditoria crítica deve fazer parte das operações transacionais.

---

## 27. Fonte de verdade

| Tema | Fonte V3 |
|---|---|
| Evento | eventos |
| Mesas | evento_mesas |
| Reserva | reservas_evento + reserva_mesas |
| Patrocinador | patrocinadores + evento_patrocinadores |
| Tipo/lote | tipos_ingresso, ou estrutura equivalente definida no fechamento |
| Solicitação pública | solicitação/pedido de ingresso, quando adotado |
| Ingresso individual | ingressos |
| Histórico de validação | validacoes_ingresso |
| Venda | vendas + venda_itens + venda_pagamentos |
| Receita do evento | fontes financeiras normalizadas |
| Impressão | histórico/execução do serviço de impressão |

---

## 28. Decisões técnicas fechadas nesta revisão

| Tema | Direção V3 |
|---|---|
| Evento | empresa obrigatória + unidade opcional |
| Mesa | entidade própria |
| Reserva de mesa | entidade própria + relação por mesa |
| Ocupação | protegida no banco/serviço |
| Reserva histórica | não apagar para liberar mesa |
| Preço de mesa | congelado por operação |
| Cortesia/bloqueio | classificação estruturada |
| Patrocinadores | entidades normalizadas |
| Limite de ingresso | protegido contra concorrência |
| Contador vendido | não é fonte primária |
| Solicitação pública | separar de emissão quando aplicável |
| Ingresso | unidade individual com código único |
| Venda de ingressos | integrada ao domínio financeiro |
| Validação | transição atômica confirmado → utilizado |
| Histórico | validacoes_ingresso |
| Cancelamento | preserva registro e respeita transições |
| QR | apenas identificador, validação consulta fonte oficial |
| Público | contrato/RLS específico, sem administração |
| Impressão | saída da operação |
| Notificação | pós-operação |
| Auditoria | parte do fluxo crítico |

---

## 29. Decisões funcionais que continuam abertas

1. evento sempre terá unidade física ou poderá ser corporativo;
2. nomes oficiais dos estados do evento;
3. uma reserva pendente bloqueia a mesa por quanto tempo;
4. reserva vencida deve ser liberada automaticamente;
5. quais tipos de reserva existirão;
6. haverá preço especial por mesa ou apenas um preço padrão do evento;
7. será adotado tipo de ingresso simples ou tipo + lote;
8. haverá período de venda por tipo/lote;
9. limite é por lote, por tipo, por evento ou combinação;
10. solicitação pública cria uma solicitação antes da venda;
11. pagamento público será integrado ou confirmado manualmente;
12. ingresso pode ser transferido para outro comprador;
13. haverá reentrada no evento;
14. cancelamento pode gerar estorno parcial;
15. ingresso cancelado pode ser reemitido/convertido;
16. uma reserva de mesa também gera venda financeira;
17. uma venda de ingresso precisa obrigatoriamente de caixa;
18. quais permissões controlam emissão, cancelamento e validação;
19. haverá múltiplas portarias/dispositivos simultâneos;
20. comprovante de reserva deve ser obrigatório em algum fluxo;
21. patrocinador terá cota/valor formal no primeiro release;
22. mapa visual precisa guardar coordenadas/assentos ou somente numeração.

---

## 30. Conclusão

A revisão confirma que Eventos e Ingressos devem ser tratados como um domínio próprio, porém integrado a Venda/Financeiro, Auditoria e Impressão.

As separações centrais da V3 ficam:

`Evento → Mesas/Reservas`

`Evento → Tipos/Lotes → Solicitação/Venda → Ingressos`

`Ingresso → Validações`

e:

`Venda → Pagamento → Caixa/Financeiro`

O ponto mais importante é não usar contadores, arrays JSONB, textos livres ou estado da UI como fonte de verdade para capacidade, ocupação, limite de ingressos, receita ou validação.

O banco físico V3 continua aguardando as revisões de Relatórios e Impressão e o fechamento das decisões funcionais.
