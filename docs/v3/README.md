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
- Revisão final do modelo relacional: em consolidação
- SQL físico definitivo: ainda não consolidado
- Banco V3: ainda não criado

## Regra importante

Os arquivos SQL e migrations existentes são especificações técnicas/artefatos históricos enquanto a modelagem não estiver definitivamente consolidada. O banco V3 será criado somente depois desta etapa.
