# Decisões de negócio ainda abertas para a V3

Este documento separa o que já foi identificado no código e banco daquilo que ainda depende de definição do negócio. Nenhuma das propostas abaixo deve ser tratada como decisão definitiva sem validação.

## 1. Preço por unidade

### Situação atual

`produtos.preco` possui um único preço por produto. O frontend ordena e vende diretamente usando esse campo.

### Questão

Todas as unidades de uma mesma empresa terão o mesmo preço?

### Modelos possíveis

**Modelo A — preço empresarial único**

`produto → preço`

Mais simples e mantém o comportamento atual.

**Modelo B — preço por unidade**

`produto → preço por unidade`

Permite cardápios e preços diferentes por estabelecimento.

**Modelo C — preço padrão + preço por unidade**

Um preço padrão empresarial pode ser sobrescrito por unidade.

### Impacto

Essa decisão afeta `produtos`, histórico de preços, vendas, cardápio público, relatórios e combos.

---

## 2. Clientes

### Situação atual

O cadastro de cliente usa telefone como identificação prática e é compartilhado pelo sistema.

### Proposta para validação

Manter cliente no escopo da empresa e registrar em cada operação a unidade onde o relacionamento comercial aconteceu.

Isso evita duplicação de cliente entre unidades.

---

## 3. Fornecedores

### Situação atual

O código descreve o cadastro de fornecedores como compartilhado e o produto mantém `fornecedor_id`.

### Proposta para validação

Manter fornecedor no escopo da empresa, permitindo uso pelas unidades.

---

## 4. Despesas corporativas

### Situação atual

`despesas` não possui empresa/unidade no modelo atual.

### Questão

Existirão despesas que pertencem à empresa como um todo, sem pertencer a uma unidade específica?

### Modelo sugerido para suportar os dois casos

`empresa_id` obrigatório + `unidade_id` opcional.

Assim:

- `unidade_id` preenchido = despesa operacional;
- `unidade_id` nulo = despesa corporativa.

Essa é uma proposta técnica, não uma decisão funcional.

---

## 5. Metas de faturamento

### Situação atual

`metas_faturamento` possui apenas ano, mês e valor da meta. Há uma restrição de unicidade para ano + mês.

Isso pressupõe uma única meta por mês.

### Questão

Uma empresa com várias unidades terá:

- uma meta consolidada;
- uma meta por unidade;
- ou ambas?

### Modelo que suporta ambas

`empresa_id` obrigatório + `unidade_id` opcional + `ano` + `mes`.

---

## 6. Eventos

### Situação atual

`eventos` não possui empresa ou unidade.

O fluxo atual trata o evento como entidade independente, com reservas, mapa, patrocinadores e ingressos relacionados.

### Questão

Um evento estará sempre associado a uma unidade física ou poderá ser apenas da empresa?

### Modelo sugerido

`empresa_id` obrigatório + `unidade_id` opcional.

Assim, um evento pode ser corporativo ou ligado a um estabelecimento específico.

---

## 7. Configurações

### Situação atual

`configuracoes_sistema` mistura configurações da loja, layout de ticket, ordem de categorias e status da loja. O código usa inclusive uma linha fixa (`id = 1`).

### Problema para multiunidade

Uma única linha não permite que cada unidade tenha suas próprias configurações.

### Proposta de separação

- configuração global da aplicação;
- configuração da empresa;
- configuração da unidade;
- preferência do usuário;
- configuração do dispositivo.

Não é necessário decidir agora se isso ficará em cinco tabelas; primeiro precisamos definir o escopo de cada propriedade.

---

## 8. Estoque

### Situação atual

`produtos` possui `estoque_atual`, enquanto `estoque_movimentacoes` registra movimentos.

### Direção arquitetural

O estoque deve pertencer à unidade, mesmo que o produto seja compartilhado pela empresa.

Modelo conceitual:

`produto` + `unidade` → saldo

`produto` + `unidade` → movimentações.

Isso permite que o mesmo produto tenha saldo independente em cada estabelecimento.

---

## 9. Estratégia de estoque para combos

A V2 expande um combo em seus componentes para efetuar a baixa. O modelo V3 precisa evitar ambiguidade entre estoque do próprio combo e estoque dos componentes.

### Questão

Qual será o comportamento padrão do negócio?

Modelos conceituais:

- combo sem estoque próprio, baixando componentes;
- combo como produto pronto, baixando o próprio combo;
- estratégia definida por produto.

A decisão interfere em venda, estoque, inventário e relatórios.

---

## 10. Saldo negativo

A função transacional V3 atual permite saldo negativo por compatibilidade com o legado.

### Questão

No comportamento definitivo, a unidade poderá:

- manter saldo negativo;
- bloquear saída acima do saldo;
- permitir exceção administrativa;
- aplicar outra regra.

A decisão deve ser aplicada no serviço/banco e não apenas na interface.

---

## 11. Quantidade fracionada

O banco provisório usa `numeric(12,3)`, permitindo quantidades fracionadas.

### Questão

Todos os produtos poderão usar quantidade decimal ou haverá produtos exclusivamente inteiros?

Exemplos:

- 1 lata;
- 1 garrafa;
- 0,500 kg;
- 0,250 litro.

Essa definição influencia validação, inventário, importação e relatórios.

---

## 12. Combos dentro de combos

O editor atual impede selecionar outro combo como componente.

### Questão

O negócio precisa de composição aninhada?

Caso a resposta seja sim, o servidor precisará detectar ciclos e controlar profundidade.

Caso contrário, pode permanecer a regra de componentes não compostos.

---

## 13. Transferência entre unidades

O modelo V3 prevê transferência entre unidades como operação única:

`unidade origem → unidade destino`

gerando:

`saída na origem + entrada no destino`.

### Questões funcionais

Antes da implementação, fechar:

- quem pode transferir;
- se precisa de aprovação;
- se existe estado em trânsito;
- quando o destino recebe o saldo;
- como cancelar uma transferência.

---

## 14. Storage e imagens

Definir quais arquivos serão:

- públicos;
- privados;
- vinculados a entidades;
- sujeitos a exclusão automática;
- incluídos em backup.

A V3 não deve tratar somente a URL pública como identidade do arquivo.

---

## 15. SKU / código de barras

Definir:

- se todo produto terá SKU;
- se código de barras é opcional;
- se pode haver mais de um código por produto;
- se o código é único por empresa;
- se a unidade poderá ter código próprio.

A direção técnica atual é evitar conflito dentro do escopo empresarial.

---

## 16. Inventário

Definir:

- se haverá rascunho e conclusão;
- se haverá apenas um inventário aberto por unidade;
- se vários inventários poderão coexistir;
- se a contagem poderá ser feita por etapas;
- quais produtos entram na contagem;
- se haverá aprovação para ajustes relevantes;
- como impedir conclusão baseada em saldo obsoleto.

A regra obrigatória permanece: o ajuste final deve ser baseado no saldo efetivo protegido no momento da operação.

---

## 17. Identificação da mesa/comanda

### Situação atual

A V2 verifica localmente e depois consulta o banco, mas não possui uma garantia transacional própria contra duas aberturas concorrentes.

### Questão

A identificação da mesa/comanda deve ser:

- única enquanto estiver aberta na unidade;
- única também no histórico;
- reutilizável depois do fechamento.

A definição influencia a constraint/índice do banco.

---

## 18. Ciclo de vida da comanda

### Questão

Definir os estados oficiais.

Modelo conceitual atual:

`aberta → em_atendimento → pronta_para_fechamento → fechada`

Também podem existir:

- cancelada;
- reaberta;
- encerrada administrativamente.

O estado comercial da comanda não deve ser confundido com o estado de pagamento.

---

## 19. Reabertura de comanda

A V2 permite reabrir uma comanda já encerrada sem desfazer a venda anterior.

### Questão

Ao reabrir:

- novos lançamentos permanecem na mesma comanda;
- cria-se uma nova sessão de atendimento dentro da mesma comanda;
- é necessária autorização especial;
- existe limite de reaberturas?

Essa decisão afeta histórico, relatórios e fechamento financeiro.

---

## 20. Cancelamento e recusa de item

### Questão

Quando um item é recusado pela cozinha:

- ele deixa de ser cobrado automaticamente;
- exige confirmação do atendimento;
- pode ser substituído;
- pode ser parcialmente recusado.

Também definir quais ações são permitidas depois de o item já ter sido enviado à cozinha.

---

## 21. Divisão da conta

Definir:

- pagamento por valor;
- pagamento por itens;
- divisão de quantidade da mesma linha;
- múltiplas formas de pagamento;
- troco por participante;
- fechamento parcial;
- fechamento total.

A representação definitiva deve permitir rastrear a origem de cada valor recebido.

---

## 22. Permissões do atendimento

Definir quais papéis podem:

- abrir comanda;
- alterar item;
- cancelar item;
- dividir conta;
- reabrir comanda;
- fechar comanda;
- estornar venda;
- alterar desconto;
- encerrar comandas em massa.

A autorização definitiva será feita por permissão, não apenas por nome/nível armazenado no navegador.

---

## 23. Venda balcão e caixa

### Questão

Uma venda balcão pode existir sem um caixa aberto?

Também precisa ser definida a política para:

- venda em contingência;
- pagamento sem caixa;
- fiado;
- abertura automática;
- registro posterior.

---

## 24. Cozinha

Definir o ciclo operacional:

`novo → aceito → em_preparo → pronto → entregue`

e as regras para:

- recusa;
- reenvio;
- reimpressão;
- desfazer;
- prioridade;
- cancelamento.

A cozinha não deve decidir sozinha o efeito financeiro do item.

---

## 25. Reimpressão de pedido

Definir quando um pedido pode ser reimpresso sem criar uma nova produção.

A reimpressão deve ser rastreável, mas não deve gerar novo `pedido_item` nem nova baixa de estoque.

---

## 26. Atendimento simultâneo

A V3 deve admitir múltiplos dispositivos operando na mesma unidade.

Definir quais recursos podem ser usados simultaneamente na mesma comanda e como conflitos serão resolvidos.

---

## Matriz de decisão

| Tema | Comportamento atual | Proposta técnica | Decisão funcional necessária? |
|---|---|---|---|
| Preço | um preço em `produtos` | preço empresarial ou por unidade | Sim |
| Cliente | compartilhado | empresa | Não necessariamente |
| Fornecedor | compartilhado | empresa | Não necessariamente |
| Despesa | sem escopo | empresa + unidade opcional | Sim |
| Meta | uma por ano/mês | empresa + unidade opcional | Sim |
| Evento | sem escopo | empresa + unidade opcional | Sim |
| Configuração | linha global | separar por escopo | Sim |
| Estoque | no produto | por unidade | Não para a direção técnica |
| Combo | baixa via expansão no frontend | regra explícita no serviço/banco | Sim |
| Saldo negativo | permitido na transição | regra aplicada no serviço/banco | Sim |
| Quantidade decimal | banco suporta | definir regra por produto | Sim |
| Combo dentro de combo | bloqueado no editor | manter bloqueado ou permitir com proteção | Sim |
| Transferência | inexistente | operação transacional entre unidades | Sim |
| Storage | URLs no produto | política de arquivos/Storage | Sim |
| SKU/código de barras | campo simples | escopo empresarial e regras | Sim |
| Inventário | importação/ajuste | ciclo e concorrência estruturados | Sim |
| Identificação de mesa | controle local + consulta | unicidade no banco conforme regra | Sim |
| Reabertura | retorna status para aberta | sessão/histórico explícitos | Sim |
| Cancelamento/recusa | altera JSONB e total | evento de domínio + regra financeira | Sim |
| Divisão | histórico_vendas + alteração da comanda | partes + pagamentos explícitos | Sim |
| Permissões | níveis no navegador | permissões por caso de uso | Sim |
| Caixa | controle separado | integração transacional com venda | Sim |
| Cozinha | status dentro do item | pedido + pedido_item | Sim |
| Reimpressão | função de impressão | saída rastreável sem duplicar produção | Sim |
| Concorrência | atualizações do JSONB inteiro | operações específicas/transacionais | Não para a direção técnica |

## Regra antes da migration

Nenhuma das decisões marcadas como dependente do negócio deve ser codificada como regra permanente antes de ser validada.

O banco V3 continua programado para ser criado somente depois que a revisão dos módulos e dessas decisões estiver consolidada.
