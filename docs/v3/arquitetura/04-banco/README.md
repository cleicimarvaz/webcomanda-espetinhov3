# 04 — Banco e persistência

Documentos sobre o banco V3, configuração, schema provisório e testes de banco.

**Atenção:** o schema atual é provisório. O banco físico definitivo será criado somente após a consolidação final.

## Ambiente de desenvolvimento

O padrão local adotado é **PostgreSQL 18 + Docker**.

A infraestrutura está em [infra/postgres](../../../../infra/postgres/) e a orientação detalhada está em [ambiente-desenvolvimento-postgresql.md](ambiente-desenvolvimento-postgresql.md).

## Scripts SQL

A estrutura canônica dos scripts físicos versionados está em [database](../../../../database/):

- migrations;
- functions;
- seeds;
- tests.

Nenhum script físico definitivo será executado automaticamente pelo container enquanto o modelo não estiver fechado.
