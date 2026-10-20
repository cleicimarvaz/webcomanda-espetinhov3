# Decisões da V3

Esta pasta registra decisões que afetem arquitetura, dados, segurança, infraestrutura ou comportamento funcional.

## Estrutura

- [ADRs](adrs/) — decisões formais que orientam a V3.
- [Histórico](historico/) — documentos de decisões que ficaram pendentes durante o levantamento e foram posteriormente encerradas.

## ADRs atuais

- [ADR-006 — Better Auth como candidato principal de autenticação](adrs/ADR-006-better-auth-candidato-autenticacao-v3.md)
- [ADR-005 — Backend/API server-side para PostgreSQL portável](adrs/ADR-005-backend-api-postgresql-portavel.md)
- [ADR-004 — Fechamento das decisões de negócio da V3](adrs/ADR-004-fechamento-decisoes-negocio-v3.md)
- [ADR-003 — Banco de dados dedicado para a V3](adrs/ADR-003-banco-dados-v3-separado.md)
- [ADR-002 — Modelo relacional organizacional](adrs/ADR-002-modelo-relacional-organizacional.md)
- [ADR-001 — Modelo organizacional](adrs/ADR-001-modelo-organizacional.md)

## Regra

A documentação não substitui testes. Uma decisão registrada deve ser acompanhada de evidência quando a implementação começar.

O ADR-004 é a referência das decisões funcionais fechadas em 2026-09-24. Os ADRs 005 e 006 definem a fronteira server-side de acesso ao PostgreSQL e o candidato de autenticação que será validado localmente.