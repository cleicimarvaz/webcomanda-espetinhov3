# Schema base do banco V3

> **ATENÇÃO — DOCUMENTO PROVISÓRIO:** este schema representa apenas a fundação inicial e **não corresponde ao modelo físico final após o ADR-004 e a Revisão 07**. Novas entidades e restrições ainda precisam ser incorporadas. Não executar este arquivo como banco definitivo. O SQL final será consolidado somente depois da revisão relacional completa.


## Objetivo

O arquivo `arq/schema-v3-base.sql` é o ponto de partida para um **banco novo da V3**.

Ele é diferente das migrations `001–008` existentes em `arq/migracoes-v3/`.

As migrations antigas foram desenhadas como evolução incremental sobre a base da V2. O schema base, por outro lado, cria a estrutura essencial diretamente no novo banco.

## O que já existe

A primeira versão do schema cobre:

- empresa;
- unidades;
- usuários sem senha em texto puro;
- papéis;
- permissões;
- vínculos organizacionais;
- auditoria estruturada;
- configurações por escopo;
- produtos;
- composição de combos;
- estoque por unidade;
- inventários;
- movimentações de estoque;
- integridade de empresa x unidade x produto;
- views de consulta.

## Identidade

A tabela `usuarios` possui:

`auth_user_id`

mas não possui coluna de senha.

Durante a transição, a aplicação pode localizar o usuário V3 pelo mesmo login usado na sessão atual da V2. Posteriormente a identidade pode ser ligada diretamente ao Supabase Auth.

## Estoque

O estoque V3 não usa um saldo global no cadastro do produto.

A fonte de saldo é:

`estoque_produto_unidade`

As movimentações ficam em:

`estoque_movimentacoes`

e os fechamentos de inventário em:

`inventarios`.

## Configurações

O banco também possui uma estrutura própria para configurações funcionais:

- global;
- empresa;
- unidade;
- usuário;
- dispositivo.

Isso evita usar uma configuração única para todos os contextos.

## Segurança nesta etapa

O schema ainda não ativa RLS porque a integração atual está em fase de desenvolvimento e a sessão da aplicação continua sendo herdada da V2.

Antes da V3 entrar em produção:

- autenticação própria deve estar definida;
- os usuários precisam estar ligados à identidade autenticada;
- RLS deve ser ativado;
- policies devem ser testadas;
- operações críticas devem usar RPCs/serviços;
- nenhuma chave secreta deve chegar ao navegador.

## Bootstrap administrativo

Depois do schema:

`arq/seeds-v3/001-bootstrap-administrativo.sql`

pode ser usado como ponto inicial para criar:

- primeira empresa;
- primeira unidade;
- papéis;
- permissões;
- usuário administrativo de ponte;
- vínculo do administrador;
- configurações básicas.

Os nomes do bootstrap são exemplos e devem ser conferidos antes de um ambiente real.

## Não executar em produção ainda

O schema é uma base de desenvolvimento.

A ordem de validação é:

1. criar o banco V3;
2. executar `schema-v3-base.sql`;
3. executar o bootstrap administrativo ajustado;
4. conferir tabelas, FKs, índices e triggers;
5. configurar URL/chave na aplicação;
6. testar o acesso;
7. aplicar RLS e autenticação em etapa própria;
8. somente depois avançar com módulos comerciais.

## Relação com as migrations anteriores

As migrations `001–008` continuam documentadas porque representam o caminho incremental criado antes da decisão de usar um banco V3 separado.

Elas não devem ser aplicadas cegamente sobre o schema novo. Quando o banco novo estiver sendo montado, as estruturas equivalentes do schema base serão a referência.

## Funções transacionais

O schema base concentra a estrutura das tabelas e views. As funções de serviço transacional do estoque ficam separadas em:

`arq/funcoes-v3/001-estoque-transacional.sql`

A separação deixa explícita a ordem de preparação do banco novo:

`schema base → funções V3 → bootstrap → testes`.
