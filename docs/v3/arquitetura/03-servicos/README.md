# 03 — Serviços

Contratos e serviços de aplicação da V3. Esta camada define como os domínios serão consumidos sem acesso direto entre tabelas.

## Arquitetura da API

Consulte [arquitetura-api-backend-v3.md](arquitetura-api-backend-v3.md), baseada na decisão aceita no ADR-005.

O navegador chama a API V3; somente o backend server-side recebe `DATABASE_URL` e acessa o PostgreSQL. Nenhuma alteração de acesso da V2 faz parte dessa decisão.