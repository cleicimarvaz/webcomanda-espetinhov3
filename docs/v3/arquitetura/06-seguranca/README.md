# 06 — Segurança

Estratégias e requisitos de RLS e autorização da V3.

## Decisão vigente

O [ADR-005](../../decisoes/adrs/ADR-005-backend-api-postgresql-portavel.md) define que todo acesso V3 ao PostgreSQL será server-side por uma API autenticada. O navegador não recebe credenciais do banco.

## Itens a detalhar antes de produção

- provedor e fluxo de autenticação;
- sessão e recuperação de acesso;
- autorização por empresa/unidade e permissões;
- fonte confiável do contexto usado por RLS;
- privilégios mínimos para o usuário runtime;
- testes negativos de isolamento e concorrência;
- segredos server-side e gestão de conexões/pooling.