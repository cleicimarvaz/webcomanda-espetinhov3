# WebComanda Espetinho V3 — Documentação

Esta pasta concentra a documentação de arquitetura, domínio, auditoria, decisões, testes e planejamento da V3.

## Estrutura

| Pasta | Conteúdo |
|---|---|
| [auditoria](auditoria/) | análise da V2, riscos e limitações atuais |
| [arquitetura](arquitetura/) | arquitetura alvo, domínio, modelo de dados, serviços e banco |
| [decisoes](decisoes/) | ADRs e decisões funcionais |
| [revisoes](revisoes/) | revisões consolidadas por domínio e revisão final do modelo |
| [roadmap](roadmap/) | fases, backlog e sequência de implementação |
| [testes](testes/) | pre-flight, smoke tests e cenários de validação |

## Ordem recomendada de leitura

1. Auditoria da V2
2. Revisões de domínio
3. Decisões de negócio
4. Modelo funcional
5. Modelo relacional
6. Contratos dos serviços
7. Roadmap
8. Testes

## Estado atual

- Auditoria da V2: concluída
- Revisões de Catálogo + Estoque: concluída
- Revisões de Atendimento + Comandas + Cozinha: concluída
- Revisões de Vendas + Caixa + Financeiro: concluída
- Revisões de Eventos + Ingressos: concluída
- Revisões de Relatórios + Impressão: concluída
- Decisões de negócio: consolidadas no ADR-004
- Backend/API server-side para acesso PostgreSQL da V3: aceito no ADR-005; V2 permanece inalterada
- Revisão final do modelo relacional: consolidada em 2026-09-25
- Ambiente local PostgreSQL 18.6 + Docker: validado com DBeaver
- Scripts SQL versionados: estrutura preparada; Dbmate 2.36.0 validado via Docker
- Revisão física do Grupo A: proposta registrada em `database/migrations/REVISAO-FISICA-GRUPO-A.md`; pendências de autenticação, identidade e RLS ainda precisam ser fechadas
- SQL físico definitivo: ainda não consolidado — não executar migrations de domínio
- Banco V3 definitivo: ainda não criado; banco local segue sem tabelas de domínio

## Backend e acesso ao banco

A V3 acessará PostgreSQL exclusivamente por API server-side, conforme [ADR-005](decisoes/adrs/ADR-005-backend-api-postgresql-portavel.md). A arquitetura está documentada em [arquitetura-api-backend-v3.md](arquitetura/03-servicos/arquitetura-api-backend-v3.md). A V2 permanece no caminho atual durante a transição.

## Ambiente de banco

O desenvolvimento local usará PostgreSQL 18 em Docker. A configuração está em [infra/postgres](../../infra/postgres/) e a área canônica futura dos scripts SQL está em [database](../../database/).

O banco local será tratado como PostgreSQL padrão para facilitar backup, restore e migração posterior para outro ambiente PostgreSQL.

## Regra importante

Os arquivos SQL e migrations existentes em arq/ são especificações técnicas/artefatos históricos enquanto a modelagem não estiver definitivamente consolidada. O banco V3 definitivo será criado somente depois desta etapa.