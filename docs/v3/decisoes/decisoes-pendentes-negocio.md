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

### Situação encontrada na revisão

A V2 expande um combo em seus componentes para efetuar a baixa. O modelo V3 precisa evitar ambiguidade entre:

- controlar estoque do próprio combo;
- controlar estoque dos componentes;
- controlar ambos.

### Questão

Qual será o comportamento padrão do negócio?

Modelos conceituais:

- combo sem estoque próprio, baixando componentes;
- combo como produto pronto, baixando o próprio combo;
- estratégia definida por produto.

A decisão precisa ser tomada antes do SQL definitivo porque interfere em venda, estoque, inventário e relatórios.

---

## 10. Saldo negativo

### Situação encontrada na revisão

A função transacional V3 atual permite saldo negativo por compatibilidade com o legado.

### Questão

No comportamento definitivo, a unidade poderá:

- manter saldo negativo;
- bloquear saída acima do saldo;
- permitir exceção administrativa;
- aplicar outra regra de negócio.

A decisão deve ser aplicada no serviço/banco e não apenas na interface.

---

## 11. Quantidade fracionada

### Situação encontrada na revisão

O banco provisório usa `numeric(12,3)`, o que permite quantidades fracionadas.

### Questão

Todos os produtos de estoque poderão usar quantidade decimal ou haverá produtos exclusivamente inteiros?

Exemplos:

- unidade = 1 lata;
- unidade = 1 garrafa;
- unidade = 0,500 kg;
- unidade = 0,250 litro.

Essa definição influencia validação, inventário, importação e relatórios.

---

## 12. Combos dentro de combos

### Situação atual

O editor atual impede selecionar outro combo como componente.

### Questão

O negócio precisa de composição aninhada?

Caso a resposta seja sim, o servidor precisará validar ciclos e profundidade máxima.

Caso contrário, pode permanecer a regra simples de que componentes de combo não podem ser outros combos.

---

## 13. Transferência entre unidades

### Direção técnica

O modelo V3 já prevê transferência entre unidades como operação única:

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

### Questão

Definir quais arquivos serão:

- públicos;
- privados;
- vinculados a entidades;
- sujeitos a exclusão automática;
- incluídos em backup.

A V3 não deve tratar somente a URL pública como identidade do arquivo.

---

## 15. SKU / código de barras

### Questão

Definir:

- se todo produto terá SKU;
- se código de barras é opcional;
- se pode haver mais de um código por produto;
- se o código é único por empresa;
- se a unidade poderá ter código próprio.

A direção técnica atual é evitar conflito dentro do escopo empresarial.

---

## 16. Inventário

### Questões ainda abertas

- inventário terá rascunho e conclusão;
- haverá apenas um inventário aberto por unidade;
- vários inventários poderão coexistir;
- contagem poderá ser feita por etapas;
- produtos serão pré-selecionados ou todos os controlados;
- será permitido concluir uma contagem baseada em saldo antigo;
- haverá aprovação para ajustes relevantes.

A regra obrigatória permanece: o ajuste final deve ser baseado no saldo efetivo protegido no momento da operação.

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
| Configuração | linha global | separar por escopo | Sim, por propriedade |
| Estoque | no produto | por unidade | Não para a direção técnica |
| Combo | baixa via expansão no frontend | regra explícita no serviço/banco | Sim |
| Saldo negativo | permitido na transição | regra aplicada no serviço/banco | Sim |
| Quantidade decimal | banco suporta | definir por produto/unidade | Sim |
| Combo dentro de combo | bloqueado no editor | manter bloqueado ou permitir com proteção | Sim |
| Transferência | inexistente | operação transacional entre unidades | Sim |
| Storage | URLs públicas no produto | política de arquivos/Storage | Sim |
| SKU/código de barras | campo simples | escopo empresarial e regras | Sim |
| Inventário | importação/ajuste | ciclo e concorrência estruturados | Sim |

## Regra antes da migration

Nenhuma das decisões marcadas como dependente do negócio deve ser codificada como regra permanente antes de ser validada.

A primeira migration estrutural deverá usar somente decisões já confirmadas ou estruturas flexíveis que não impeçam as alternativas restantes.

O banco V3 continua programado para ser criado somente depois que a revisão dos módulos e dessas decisões estiver consolidada.
