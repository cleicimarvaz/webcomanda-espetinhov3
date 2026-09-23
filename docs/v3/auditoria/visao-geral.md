# Auditoria V3 — Visão Geral

## Estado da cópia

A árvore atual do repositório contém a aplicação da V2, incluindo páginas HTML, componentes JavaScript, scripts auxiliares, arquivos SQL, servidor de impressão, PWA e documentação.

Também foram restaurados arquivos auxiliares que estavam no ZIP da V2:

- `.github/workflows/backup-diario.yml`
- `.vscode/settings.json`
- `scripts/backup-diario.js`

## Funcionalidades identificadas

A V2 já possui, entre outros:

- autenticação e usuários;
- vendas e PDV;
- comandas e divisão de conta;
- cozinha/KDS;
- produtos, estoque e inventário;
- combos e curva ABC;
- fornecedores;
- despesas e contas a receber;
- caixa e histórico;
- relatórios financeiros;
- eventos, reservas e ingressos;
- scanner QR Code;
- cardápio público;
- impressão térmica e relatórios;
- backup;
- auditoria;
- PWA.

## Primeiras conclusões

A V3 não deve começar pela criação de módulos básicos que já existem. O primeiro ciclo deve concentrar-se em:

1. segurança e autorização;
2. integridade das operações financeiras;
3. proteção dos dados;
4. consistência do modelo de dados;
5. arquitetura e manutenção;
6. experiência offline/PWA;
7. só depois novas funcionalidades de negócio.

## Observação

Existe uma auditoria técnica anterior em `arq/auditoria-tecnica-2026-07-27.md`. Ela será usada como histórico, mas os achados precisam ser revalidados contra o estado atual da V2.
