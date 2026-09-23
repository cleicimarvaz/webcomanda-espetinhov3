# Modelo organizacional da V3

## Objetivo

Definir a estrutura que permitirá que o WebComanda seja utilizado por uma empresa com uma ou várias unidades, sem misturar dados entre contextos.

## Entidades

### Empresa

Representa o proprietário lógico do ambiente e concentra configurações e dados compartilhados entre unidades.

Campos conceituais:

- identificador;
- razão/nome;
- documento, quando aplicável;
- status;
- configurações globais;
- datas de criação e atualização.

### Unidade

Representa um estabelecimento ou ponto de operação pertencente a uma empresa.

Campos conceituais:

- identificador;
- empresa;
- nome/descrição;
- endereço;
- dados de contato;
- status;
- configurações operacionais;
- datas de criação e atualização.

### Usuário

Representa a identidade da pessoa que acessa o sistema.

O usuário não deve ser vinculado a uma única unidade por uma coluna fixa. O vínculo deve permitir acesso a uma ou mais unidades.

### Vínculo usuário/unidade

Entidade de associação que informa quais unidades o usuário pode acessar e qual papel possui naquele contexto.

Modelo conceitual:

`usuário` → `vínculo` ← `unidade`

Isso permite que a mesma pessoa tenha funções diferentes em unidades diferentes quando essa necessidade existir.

## Contexto da sessão

Depois da autenticação, a sessão deve possuir pelo menos:

- identidade do usuário;
- empresa atual;
- unidade atual;
- permissões efetivas;
- identificador da sessão;
- expiração.

A unidade atualmente selecionada é um contexto de operação, não uma autorização. A autorização deve ser confirmada pelo backend/banco.

## Dados globais e dados por unidade

Cada entidade deverá ser classificada como:

### Global da plataforma

Exemplo: parâmetros técnicos da própria aplicação.

### Global da empresa

Exemplo: cadastro compartilhado entre unidades, quando houver necessidade.

### Específica da unidade

Exemplo: caixa, estoque, comandas, mesas e operações do estabelecimento.

### Preferência do usuário

Exemplo: tema, preferências pessoais e determinadas opções de impressão.

Essa classificação deve ser definida antes da migração de cada tabela.

## Diretriz para as tabelas atuais

Na migração, tabelas como `caixa`, `comandas`, `estoque_movimentacoes`, `inventarios`, `despesas` e operações de venda devem receber contexto organizacional explícito quando o negócio exigir isolamento por unidade.

Cadastros como `produtos`, `clientes` e `fornecedores` deverão ter uma decisão específica sobre serem compartilhados pela empresa ou mantidos por unidade.

## RLS

O banco deve usar o vínculo usuário/unidade para limitar os registros acessíveis.

Um filtro como `where unidade_id = ...` na interface não substitui RLS.

## Migração

A introdução do contexto organizacional deve ocorrer sem destruir o histórico atual:

1. criar empresa/unidade inicial;
2. criar vínculos dos usuários existentes;
3. adicionar contexto às entidades;
4. preencher registros históricos;
5. validar contagens e relacionamentos;
6. ativar policies;
7. remover acessos legados somente depois da validação.

## Resultado esperado

Um usuário autenticado deve sempre operar dentro de uma empresa e unidade autorizadas, e nenhuma tela deve conseguir ampliar esse contexto apenas alterando valores locais do navegador.