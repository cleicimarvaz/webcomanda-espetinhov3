# 03 — Serviços

Contratos e serviços de aplicação da V3. Esta camada define como os domínios serão consumidos sem acesso direto entre tabelas.

## Arquitetura da API

Consulte [arquitetura-api-backend-v3.md](arquitetura-api-backend-v3.md), baseada no ADR-005.

## Autenticação

O [ADR-006](../../decisoes/adrs/ADR-006-better-auth-candidato-autenticacao-v3.md) aprova Better Auth como candidato principal para validação local, sujeito a testes de integração, segurança e migrações.

O plano do protótipo está em [prototipo-auth-better-auth.md](prototipo-auth-better-auth.md). Nenhuma biblioteca de autenticação foi instalada e nenhum schema de autenticação foi aplicado ao banco.

O navegador chama a API V3. Somente o backend server-side recebe `DATABASE_URL` e acessa o PostgreSQL. O acesso da V2 permanece inalterado.