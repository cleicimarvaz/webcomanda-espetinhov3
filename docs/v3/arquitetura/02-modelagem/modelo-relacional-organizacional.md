# Modelo relacional organizacional da V3

> Documento-base da fundação organizacional. Para o modelo atual completo, use `modelo-relacional-completo-v3.md`.

Este documento transforma o modelo conceitual de empresa, unidade, usuário, papel e permissão em uma proposta relacional. Ainda não é uma migration SQL.

## Núcleo organizacional

### `empresas`

Representa o tenant lógico do sistema.

Campos conceituais:

- `id`;
- `nome`;
- `documento`;
- `status`;
- `created_at`;
- `updated_at`.

### `unidades`

Representa cada estabelecimento pertencente a uma empresa.

Campos conceituais:

- `id`;
- `empresa_id` FK → `empresas`;
- `nome`;
- `status`;
- endereço e contato;
- `created_at`;
- `updated_at`.

Regra estrutural: uma unidade pertence a uma única empresa.

## Identidade

### `usuarios`

Deve representar o perfil da pessoa dentro da aplicação.

Na implementação com provedor de autenticação, o registro deverá possuir uma referência estável à identidade autenticada. A coluna atual `senha` não deve continuar sendo a fonte de autenticação da V3.

Campos conceituais:

- `id`;
- `auth_user_id`;
- `nome`;
- `login` ou identificador de exibição;
- `ativo`;
- preferências que realmente pertencem ao usuário;
- timestamps.

## Vínculo de acesso

### `membros_organizacao`

Esta tabela é o elo entre identidade, empresa, unidade e papel.

Campos conceituais:

- `id`;
- `usuario_id` FK → `usuarios`;
- `empresa_id` FK → `empresas`;
- `unidade_id` FK → `unidades`, nullable quando o papel for válido para toda a empresa;
- `papel_id` FK → `papeis`;
- `ativo`;
- `created_at`;
- `updated_at`.

Regra: `unidade_id`, quando informado, deve pertencer à mesma `empresa_id`. Vínculo com unidade nula pode representar escopo empresarial, conforme o papel.

Essa estrutura permite:

- usuário em uma empresa;
- usuário em várias empresas;
- usuário em várias unidades;
- papel diferente por unidade;
- papel com escopo empresarial.

## Papéis e permissões

### `papeis`

Campos conceituais:

- `id`;
- `codigo`;
- `nome`;
- `descricao`;
- `ativo`.

### `permissoes`

Campos conceituais:

- `id`;
- `codigo`;
- `nome`;
- `descricao`.

### `papel_permissoes`

Tabela associativa:

- `papel_id` FK → `papeis`;
- `permissao_id` FK → `permissoes`;
- chave única composta.

## Diagrama conceitual

```text
USUARIOS
   │
   └──< MEMBROS_ORGANIZACAO >── EMPRESAS
             │                     │
             │                     └──< UNIDADES
             │
             └── PAPEIS
                  │
                  └──< PAPEL_PERMISSOES >── PERMISSOES
```

## Contexto da unidade

Quando `membros_organizacao.unidade_id` estiver preenchido, o usuário possui aquele papel dentro daquela unidade.

Quando estiver nulo, o vínculo pode representar um acesso de escopo empresarial, desde que o papel permita esse comportamento.

A aplicação deverá selecionar uma unidade ativa para os fluxos operacionais, mas o banco deve validar se o usuário possui vínculo com ela. Para vínculos empresariais, o usuário poderá escolher entre as unidades permitidas.

## Integridade

Regras importantes:

- unidade deve pertencer à empresa indicada;
- membro deve apontar para usuário existente;
- papel deve existir e estar ativo;
- permissões atribuídas ao papel devem existir;
- vínculos inativos não devem autorizar acesso;
- não deve existir duplicidade do mesmo usuário/empresa/unidade/papel sem motivo explícito.

## Migração da V2

A migração inicial pode ser feita assim:

1. criar uma empresa inicial para o ambiente atual;
2. criar uma unidade inicial correspondente ao estabelecimento atual;
3. importar os usuários existentes como perfis;
4. criar papéis iniciais a partir de `nivel`;
5. criar os vínculos dos usuários;
6. associar cada registro operacional ao novo contexto;
7. validar contagens e acesso;
8. somente depois ativar RLS.

## Não fazer nesta etapa

Este documento não cria novas tabelas no banco de produção e não altera `schema-completo-novo-banco.sql`. Primeiro precisamos validar o modelo e os escopos das entidades.