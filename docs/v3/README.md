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
- Revisão final do modelo relacional: consolidada em 2026-09-25
- Ambiente local PostgreSQL 18 + Docker: estrutura preparada
- Scripts SQL físicos versionados: estrutura preparada, aguardando SQL físico definitivo
- SQL físico definitivo: ainda não consolidado — próxima etapa
- Banco V3 definitivo: ainda não criado

## Ambiente de banco

O desenvolvimento local usará PostgreSQL 18 em Docker. A configuração está em [infra/postgres](../../infra/postgres/) e a área canônica futura dos scripts SQL está em [database](../../database/).

O banco local será tratado como PostgreSQL padrão para facilitar backup, restore e migração posterior para outro ambiente PostgreSQL.

## Regra importante

Os arquivos SQL e migrations existentes em arq/ são especificações técnicas/artefatos históricos enquanto a modelagem não estiver definitivamente consolidada. O banco V3 definitivo será criado somente depois desta etapa.