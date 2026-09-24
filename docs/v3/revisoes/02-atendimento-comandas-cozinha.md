# Revisão V3 — Atendimento + Comandas + Cozinha

## Objetivo

Esta revisão compara os fluxos atuais de comandas, lançamento de itens, cozinha, fechamento e divisão de contas com a arquitetura V3 já definida.

O foco é fechar o comportamento do domínio antes da criação do banco físico definitivo.

Não foram feitas alterações de lógica na V2 nesta etapa.

---

## 1. Visão atual

O atendimento ainda é fortemente baseado em uma única linha de `comandas` contendo:

- identificação;
- status;
- total;
- itens em JSONB;
- horários;
- informações de cozinha dentro do próprio item.

Os módulos envolvidos são principalmente:

- `componentes/comandas.js`;
- `componentes/vendas.js`;
- `componentes/cozinha.js`;
- `componentes/divisao.js`.

A comunicação atual é predominantemente:

`UI → Supabase`

A arquitetura V3 prevista é:

`UI → atendimentoServiceV3 → domínio → persistência transacional`

e, quando houver fechamento financeiro:

`UI → serviço de venda/atendimento → operação transacional → venda + pagamento + estoque + financeiro + comanda`

---

## 2. Comanda como agregado

A decisão arquitetural deve ser mantida:

**Comanda é o agregado do atendimento.**

Ela representa a sessão comercial de uma mesa/cliente dentro de uma unidade.

A V3 deve manter na comanda:

- empresa;
- unidade;
- identificação;
- status;
- abertura;
- encerramento;
- responsável;
- contexto operacional.

Os itens deixam de ser somente JSONB e passam para `comanda_itens`.

Isso permite rastrear cada item individualmente sem depender da posição em um array.

---

## 3. Problema crítico: uso de índice do array

O legado identifica um item por:

`comanda_id + index_do_item`

Isso aparece em remoção, aceite, recusa, conclusão da cozinha e desfazer pedido.

Essa identificação é frágil porque outro processo pode alterar o array entre a leitura e a atualização.

Exemplos:

- outro garçom adiciona um item;
- outro operador remove um item;
- cozinha atualiza o mesmo registro;
- divisão altera a lista;
- uma atualização antiga substitui uma atualização mais nova.

### Direção V3

Cada `comanda_item` deve possuir um ID próprio.

As operações passam a trabalhar com:

`comanda_item_id`

e não com posição no array.

---

## 4. Problema crítico: concorrência na comanda

Hoje várias operações seguem o padrão:

1. buscar comanda;
2. alterar o JSONB no navegador;
3. enviar o JSONB inteiro de volta.

Esse modelo permite que uma atualização posterior sobrescreva uma alteração feita por outro dispositivo.

### Direção V3

Alterações devem ser feitas como operações específicas:

- adicionar item;
- alterar quantidade;
- cancelar item;
- alterar observação;
- enviar para cozinha;
- alterar estado de preparo;
- marcar item pago;
- reabrir atendimento.

Quando uma operação envolver concorrência, o servidor deve validar o estado atual dentro da transação.

---

## 5. Abertura de comanda

A V2 faz uma verificação local e depois outra consulta ao banco antes do `insert`.

Isso reduz duplicação acidental, mas não impede uma corrida:

dois dispositivos podem consultar simultaneamente e ambos tentar inserir.

### Direção V3

A exclusividade, quando exigida pelo negócio, deve ser garantida no banco.

A regra precisa considerar:

- empresa;
- unidade;
- identificação;
- somente comandas ainda ativas, se a regra for de exclusividade apenas enquanto abertas.

Não deve haver dependência do `localStorage` para impedir duplicidade.

---

## 6. Status da comanda

No legado existem caminhos com estados diferentes, incluindo fechamento por pagamento, fechamento administrativo e reabertura.

A V3 precisa padronizar o ciclo.

### Ciclo conceitual recomendado

`aberta → em_atendimento → pronta_para_fechamento → fechada`

Com estados/ações complementares para:

- cancelada;
- reaberta;
- encerrada administrativamente.

A palavra "paga" não deve ser usada como substituto do estado comercial da comanda quando já existe uma entidade própria para pagamento.

O fechamento financeiro deve registrar a venda/pagamentos; a comanda representa o estado do atendimento.

---

## 7. Reabertura de comanda

Hoje uma comanda fechada pode voltar para `aberta`, sem alterar a venda já registrada.

Isso faz sentido como comportamento operacional, mas precisa de uma regra explícita na V3.

### Direção V3

Reabrir uma comanda não apaga nem altera a venda anterior.

Novos lançamentos passam a pertencer ao mesmo atendimento, porém devem ser distinguíveis do fechamento anterior.

O histórico deve permitir saber:

- quando a comanda foi fechada;
- qual venda foi gerada;
- quando foi reaberta;
- quais novos itens entraram;
- qual foi o próximo fechamento.

---

## 8. Item de comanda

O item precisa preservar mais do que:

- produto;
- quantidade;
- preço;
- observação.

Na V3 ele deve suportar também:

- preço praticado;
- quantidade original;
- quantidade preparada;
- quantidade cancelada, se necessário;
- status comercial;
- status de cozinha;
- data/hora de inclusão;
- usuário que incluiu;
- usuário que alterou;
- motivo de cancelamento;
- identificação da operação.

A modelagem deve evitar que o preço seja reconstruído pelo catálogo atual.

---

## 9. Cozinha não deve ser o próprio histórico da comanda

Hoje o estado da cozinha é armazenado diretamente no item JSONB:

- `novo`;
- `em_preparo`;
- `pronto`;
- `cancelado_preparo`.

Isso funciona operacionalmente, mas mistura atendimento e produção.

### Direção V3

A comanda continua sendo o registro comercial.

O fluxo de produção deve ser representado por:

- `pedidos`;
- `pedido_itens`.

Cada envio para cozinha possui identidade própria.

Assim a mesma comanda pode ter:

- primeiro lançamento;
- segundo lançamento;
- complemento;
- reenvio;
- cancelamento;
- novo preparo.

sem reescrever o histórico anterior.

---

## 10. Lançamento para cozinha

O conceito de lote já existe implicitamente no legado por `hora_pedido`.

Na V3 isso deve se tornar uma entidade real.

Cada `pedido` deve ter:

- comanda;
- unidade;
- usuário;
- horário;
- status;
- operação;
- origem.

Cada `pedido_item` deve apontar para o item de comanda correspondente quando houver rastreio individual.

Isso elimina a dependência de agrupar registros por timestamp.

---

## 11. Quantidade enviada para cozinha

A tela atual permite que somente parte da quantidade de um item seja enviada para a cozinha.

Isso é um requisito importante e deve permanecer.

Exemplo:

`5 espetos`

podem gerar:

`3 para cozinha + 2 entrega direta`

A V3 deve guardar essa decisão no histórico operacional, em vez de representar apenas o estado final do item.

---

## 12. Cancelamento/recusa na cozinha

Hoje, quando a cozinha recusa um item, o código altera o status para `cancelado_preparo` e recalcula o total da comanda.

### Problema

A recusa da produção está alterando diretamente o valor financeiro da comanda.

Isso mistura dois domínios.

### Direção V3

A recusa deve registrar:

- item;
- quantidade recusada;
- usuário;
- motivo;
- data;
- pedido/lote de origem.

Depois, a regra comercial determina se a quantidade recusada deixa de ser cobrada.

A cozinha não deve decidir sozinha o valor financeiro final.

Essa decisão deve passar pelo serviço de atendimento/venda.

---

## 13. Remoção de item da comanda

O legado permite apagar fisicamente o item do JSONB.

Na V3 isso não deve ser a regra para item que já teve qualquer efeito operacional.

### Direção V3

Usar estado/cancelamento:

- item ativo;
- cancelado;
- faturado;
- estornado, quando aplicável.

O histórico permanece.

Exclusão física fica restrita a registros sem uso operacional e sob regras administrativas.

---

## 14. Fechamento da comanda

O fechamento atual executa várias operações independentes:

1. lê a comanda;
2. recalcula total no navegador;
3. cria histórico de venda;
4. cria conta a receber quando é fiado;
5. atualiza a comanda;
6. solicita baixa de estoque;
7. grava auditoria;
8. oferece impressão.

Isso deixa estados intermediários possíveis.

### Exemplo

A venda pode ser gravada e a atualização da comanda falhar.

Ou a venda pode existir e o lançamento em Contas a Receber falhar.

Ou a comanda pode ser fechada e a baixa de estoque falhar.

### Direção V3

O fechamento deverá ser uma operação orquestrada e transacional.

A operação precisa decidir explicitamente:

- venda;
- pagamentos;
- conta a receber;
- estoque;
- estado da comanda;
- auditoria.

A impressão acontece depois da confirmação da operação, como saída, e não participa da transação comercial.

---

## 15. Problema no fiado

No legado, o fechamento tenta registrar a conta a receber em bloco separado e, em caso de falha, mostra aviso de que a mesa foi fechada mesmo assim.

Isso pode produzir:

`venda existente + comanda fechada + conta a receber ausente`

### Direção V3

Quando a regra exigir fiado:

`venda + conta a receber`

devem fazer parte da mesma operação transacional.

Se faltar dado obrigatório do cliente, a operação deve ser recusada antes da gravação.

---

## 16. Venda balcão

A venda balcão também calcula o total no navegador e grava diretamente em `historico_vendas`.

Na V3:

- o carrinho é entrada;
- o total é calculado no serviço/servidor;
- o preço efetivo é congelado nos itens;
- o pagamento é registrado;
- a baixa de estoque é transacional;
- o retry usa `operacao_id`.

O fluxo balcão e o fechamento de comanda devem reutilizar as mesmas regras centrais de venda.

---

## 17. Divisão da conta

A divisão atual possui dois modelos:

### Por valor

Registra uma nova linha em `historico_vendas` com os itens vazios e reduz o total da comanda.

Isso precisa ser substituído por uma representação explícita de pagamento/parcela da venda.

### Por itens

Retira os itens pagos do JSONB da comanda e registra uma linha de venda correspondente.

Esse comportamento precisa ser remodelado.

### Direção V3

A divisão deve representar:

- partes da conta;
- itens atribuídos a cada parte;
- valores;
- pagamentos;
- troco;
- operação;
- estado da comanda.

Um item pago não deve desaparecer do histórico da comanda apenas porque foi separado para pagamento.

---

## 18. Estoque no fechamento e na divisão

O legado chama a rotina de baixa de estoque separadamente.

Na divisão por itens, a chamada atual ocorre sem ser aguardada pelo fluxo principal.

Isso torna possível a UI informar sucesso antes de a baixa terminar.

### Direção V3

A venda deve definir os efeitos de estoque e executá-los como parte da operação.

Retry da mesma venda não pode gerar segunda baixa.

Em uma venda parcial, a quantidade efetivamente faturada deve ser a quantidade usada para a baixa.

---

## 19. Cozinha e venda são domínios relacionados, mas distintos

### Atendimento

Responsável por:

- comanda;
- itens;
- lançamentos;
- cancelamentos de atendimento.

### Cozinha

Responsável por:

- pedidos de produção;
- fila;
- preparo;
- pronto;
- entrega operacional;
- rejeição com motivo.

### Venda/Financeiro

Responsável por:

- valor cobrado;
- pagamento;
- desconto;
- fiado;
- estorno.

A arquitetura não deve permitir que uma tela de cozinha altere diretamente regras financeiras.

---

## 20. Identidade do lançamento

O `hora_pedido` atual é útil como informação, mas não deve ser a identidade do lote.

Na V3:

`pedido.id`

identifica o lançamento.

`pedido_item.id`

identifica a linha de produção.

O horário continua existindo como atributo.

---

## 21. Realtime e atualização da cozinha

O legado combina:

- consulta inicial;
- atualização periódica;
- canal Realtime.

A estratégia é útil, mas deve ser definida no módulo de infraestrutura.

### Direção V3

O KDS deve possuir:

- consulta inicial;
- atualização por eventos;
- fallback periódico;
- proteção contra processamento duplicado;
- estado local apenas para UX.

Uma notificação Realtime não deve, por si só, significar que uma operação foi persistida com sucesso.

---

## 22. Impressão da cozinha

A impressão automática usa o lote identificado pelo timestamp.

Na V3, o comando de impressão deve receber:

- `pedido_id`;
- itens;
- unidade;
- dispositivo/destino;
- largura;
- layout.

A impressão nunca deve decidir se o pedido foi aceito, produzido ou concluído.

---

## 23. Decisões técnicas fechadas nesta revisão

| Tema | Direção V3 |
|---|---|
| Comanda | agregado de atendimento |
| Item de comanda | entidade própria com ID |
| Identificação de item | ID relacional, não índice do JSONB |
| Concorrência | operações específicas/transacionais |
| Exclusividade de comanda | regra no banco quando exigida |
| Cozinha | pedidos + pedido_itens |
| Lote de cozinha | entidade própria |
| Preço | congelado no item comercial |
| Cancelamento | preservar histórico |
| Recusa da cozinha | registrar evento; não decidir sozinha valor financeiro |
| Fechamento | operação orquestrada/transacional |
| Fiado | venda + conta a receber no mesmo fluxo quando aplicável |
| Divisão | partes/pagamentos explícitos |
| Estoque | efeito da venda, com idempotência |
| Impressão | saída pós-operação |
| Realtime | mecanismo de atualização, não fonte de verdade |

---

## 24. Decisões funcionais que permanecem abertas

1. identificação de mesa/comanda é única somente enquanto aberta?
2. uma mesma comanda pode ter vários fechamentos financeiros ao longo de uma reabertura?
3. reabertura é simples ou exige autorização especial?
4. quais estados oficiais a comanda terá?
5. recusa da cozinha cancela automaticamente a cobrança ou exige confirmação/ação do atendimento?
6. um item pode ser parcialmente cancelado/preparado?
7. quais alterações podem ocorrer depois que um item foi enviado à cozinha?
8. divisão por itens permite dividir a quantidade de uma mesma linha?
9. pagamento dividido por múltiplas formas será permitido na primeira versão?
10. quais usuários podem dividir, reabrir, cancelar e estornar?
11. venda balcão pode existir sem caixa aberto?
12. fechamento com fiado exige cliente identificado sempre?
13. um pedido pode ser reimpresso/reaberto sem criar novo pedido?
14. a cozinha precisa de estados separados para pronto e entregue?
15. haverá prioridade/ordenação manual da fila?

---

## 25. Conclusão

A revisão confirma que o maior ganho da V3 neste domínio não está apenas em trocar JSONB por tabelas.

O ponto central é separar três responsabilidades:

`Atendimento → o que foi pedido`

`Cozinha → o que precisa ser produzido`

`Venda/Financeiro → o que foi efetivamente cobrado e recebido`

As três áreas devem compartilhar IDs e contratos, mas não devem alterar diretamente o estado interno umas das outras.

Comanda, item, pedido de cozinha e venda passam a ter identidade própria. Isso reduz problemas de concorrência, facilita histórico, permite divisão e reabertura sem apagar contexto e prepara o sistema para uma operação multiusuário/multiunidade.

O banco físico V3 continua aguardando a revisão dos demais domínios.
