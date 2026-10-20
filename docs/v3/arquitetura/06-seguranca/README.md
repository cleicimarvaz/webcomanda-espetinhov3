# 06 — Segurança

Estratégias e requisitos de RLS e autorização da V3.

## Decisões vigentes

- O [ADR-005](../../decisoes/adrs/ADR-005-backend-api-postgresql-portavel.md) define que todo acesso V3 ao PostgreSQL será server-side por uma API autenticada. O navegador não recebe credenciais do banco.
- O [ADR-006](../../decisoes/adrs/ADR-006-better-auth-candidato-autenticacao-v3.md) aprova Better Auth como candidato principal para protótipo local, condicionado aos testes. A biblioteca ainda não está instalada e o schema de autenticação não foi aplicado.

## Itens a detalhar antes de produção

- autenticação, sessão, cookies e recuperação de acesso;
- autorização por empresa/unidade e permissões;
- fonte confiável do contexto usado por RLS;
- privilégios mínimos para o usuário runtime;
- testes negativos de isolamento e concorrência;
- segredos server-side e gestão de conexões/pooling;
- evidência de que a API V3 não altera a V2.