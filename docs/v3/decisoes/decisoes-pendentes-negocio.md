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

Essa decisão afeta `produtos`, histórico de preços, vendas, cardápio público, relatórios e estoque/combos.

## 2. Clientes

### Situação atual

O cadastro de cliente usa telefone como identificação prática e é compartilhado pelo sistema.

### Proposta para validação

Manter cliente no escopo da empresa e registrar em cada operação a unidade onde o relacionamento comercial aconteceu.

Isso evita duplicação de cliente entre unidades.

## 3. Fornecedores

### Situação atual

O código descreve o cadastro de fornecedores como compartilhado e o produto mantém `fornecedor_id`.

### Proposta para validação

Manter fornecedor no escopo da empresa, permitindo uso pelas unidades.

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

## 6. Eventos

### Situação atual

`eventos` não possui empresa ou unidade.

O fluxo atual trata o evento como entidade independente, com reservas, mapa, patrocinadores e ingressos relacionados.

### Questão

Um evento estará sempre associado a uma unidade física ou poderá ser apenas da empresa?

### Modelo sugerido

`empresa_id` obrigatório + `unidade_id` opcional`.

Assim, um evento pode ser corporativo ou ligado a um estabelecimento específico.

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

## 8. Estoque

### Situação atual

`produtos` possui `estoque_atual`, enquanto `estoque_movimentacoes` registra movimentos.

### Direção arquitetural

O estoque deve pertencer à unidade, mesmo que o produto seja compartilhado pela empresa.

Modelo conceitual:

`produto` + `unidade` → saldo

`produto` + `unidade` → movimentações.

Isso permite que o mesmo produto tenha saldo independente em cada estabelecimento.

## Matriz de decisão

| Tema | Comportamento atual | Proposta técnica | Decisão funcional necessária? |
|---|---|---|---|
| Preço | Um preço em `produtos` | preço empresarial ou por unidade | Sim |
| Cliente | Compartilhado | empresa | Não necessariamente |
| Fornecedor | Compartilhado | empresa | Não necessariamente |
| Despesa | Sem escopo | empresa + unidade opcional | Sim |
| Meta | uma por ano/mês | empresa + unidade opcional | Sim |
| Evento | sem escopo | empresa + unidade opcional | Sim |
| Configuração | linha global | separar por escopo | Sim, por propriedade |
| Estoque | no produto | por unidade | Não para a direção técnica |

## Regra antes da migration

Nenhuma das decisões marcadas como dependente do negócio deve ser codificada como regra permanente antes de ser validada.

A primeira migration estrutural deverá usar somente decisões já confirmadas ou estruturas flexíveis que não impeçam as alternativas restantes.