# Migrações V3

As migrações desta pasta são separadas do schema atual da V2. Elas representam a evolução incremental prevista para a V3.

## Regras

- nenhuma migration deve ser executada em produção sem validação;
- preferir alterações aditivas antes de remover legado;
- cada migration deve ter objetivo único;
- a migration deve possuir documentação correspondente em `docs/v3/`;
- testar em banco de desenvolvimento antes de produção;
- manter backup/snapshot antes de mudanças estruturais;
- registrar resultado e possíveis ajustes.

## Migrações atuais

### 001 — Fundação organizacional

`001-fundacao-organizacional.sql`

Cria:

- `empresas`;
- `unidades`;
- `papeis`;
- `permissoes`;
- `papel_permissoes`;
- `membros_organizacao`;
- `usuarios.auth_user_id`;
- integridade básica entre empresa e unidade.

Ela não ativa RLS, não migra usuários e não altera o fluxo atual de autenticação.

Documentação: `docs/v3/arquitetura/migration-001-fundacao-organizacional.md`.

### 002 — Backfill organizacional inicial

`002-backfill-organizacional-inicial.sql`

Cria a empresa/unidade inicial quando necessário, cria papéis de compatibilidade e vincula os usuários atuais.

Ela não migra autenticação, não adiciona contexto às tabelas operacionais e não ativa RLS.

Documentação: `docs/v3/arquitetura/migration-002-backfill-organizacional.md`.

### 003 — Contexto empresarial de fornecedores

`003-contexto-empresarial-fornecedores.sql`

Adiciona `empresa_id` a `fornecedores`, realiza o backfill da empresa inicial e torna o vínculo obrigatório. Não ativa RLS nem altera a lógica da aplicação.

Documentação: `docs/v3/arquitetura/migration-003-fornecedores-empresa.md`.

### 004 — Contexto empresarial de clientes

`004-contexto-empresarial-clientes.sql`

Adiciona `empresa_id` a `clientes`, realiza o backfill da empresa inicial e mantém os relacionamentos atuais com vendas e contas a receber.

Documentação: `docs/v3/arquitetura/migration-004-clientes-empresa.md`.

### 005 — Estoque por unidade

`005-estoque-por-unidade.sql`

Adiciona `empresa_id` a `produtos`, cria `estoque_produto_unidade` e adiciona `unidade_id` às movimentações, mantendo `produtos.estoque_atual` para compatibilidade durante a transição.

Documentação: `docs/v3/arquitetura/migration-005-estoque-por-unidade.md`.
