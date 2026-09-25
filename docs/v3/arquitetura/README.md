# Arquitetura e modelagem — V3

A documentação técnica está separada por assunto para manter os documentos de referência fáceis de localizar.

## 01 — Visão e arquitetura

- [Arquitetura V3](01-visao/arquitetura-v3.md)
- [Módulos](01-visao/modulos.md)
- [Fronteiras dos domínios](01-visao/fronteiras-dominios-v3.md)
- [Casos de uso](01-visao/casos-de-uso-v3.md)

## 02 — Modelagem

### Documentos canônicos

- [Modelo funcional completo](02-modelagem/modelo-funcional-completo-v3.md)
- [Modelo relacional completo](02-modelagem/modelo-relacional-completo-v3.md)

### Documentos de apoio

- [Modelo organizacional](02-modelagem/modelo-organizacional.md)
- [Modelo relacional organizacional](02-modelagem/modelo-relacional-organizacional.md)
- [Regras de negócio críticas](02-modelagem/regras-negocio-criticas-v3.md)
- [Permissões](02-modelagem/permissoes.md)
- [Mapeamento organizacional](02-modelagem/mapeamento-organizacional-tabelas.md)
- [Mapeamento de chaves](02-modelagem/mapeamento-chaves-organizacionais.md)
- [Mapeamento V2 → V3](02-modelagem/mapeamento-v2-v3.md)

## 03 — Serviços

- [Contrato — Identidade](03-servicos/contrato-servico-identidade-v3.md)
- [Contrato — Atendimento](03-servicos/contrato-servico-atendimento-v3.md)
- [Contrato — Venda](03-servicos/contrato-servico-venda-v3.md)
- [Contrato — Financeiro](03-servicos/contrato-servico-financeiro-v3.md)
- [Contrato — Eventos](03-servicos/contrato-servico-eventos-v3.md)
- [Contrato — Relatórios](03-servicos/contrato-servico-relatorios-v3.md)
- [Contrato — Impressão](03-servicos/contrato-servico-impressao-v3.md)
- [Serviço — Contexto organizacional](03-servicos/servico-contexto-organizacional-v3.md)
- [Serviço — Estoque](03-servicos/servico-estoque-v3.md)
- [Integração — Movimentação manual](03-servicos/integracao-movimentacao-manual-v3.md)

## 04 — Banco e persistência

- [Banco de dados](04-banco/banco-de-dados.md)
- [Configuração do banco V3](04-banco/configuracao-banco-v3.md)
- [Schema V3 — provisório](04-banco/schema-v3-base.md)
- [Teste transacional de estoque](04-banco/teste-estoque-transacional.md)

## 05 — Histórico de migrations

As migrations 001–008 ficam isoladas aqui porque descrevem o caminho histórico de evolução sobre a V2. Não são o SQL definitivo do banco V3.

- [Migration 001](05-historico-migrations/migration-001-fundacao-organizacional.md)
- [Migration 002](05-historico-migrations/migration-002-backfill-organizacional.md)
- [Migration 003](05-historico-migrations/migration-003-fornecedores-empresa.md)
- [Migration 004](05-historico-migrations/migration-004-clientes-empresa.md)
- [Migration 005](05-historico-migrations/migration-005-estoque-por-unidade.md)
- [Migration 006](05-historico-migrations/migration-006-contexto-inventario-estoque.md)
- [Migration 007](05-historico-migrations/migration-007-baixa-estoque-transacional.md)
- [Migration 008](05-historico-migrations/migration-008-movimentacao-inventario-transacional.md)

## 06 — Segurança

- [Estratégia de RLS](06-seguranca/estrategia-rls.md)

A autorização final deverá ser implementada e testada quando o banco V3 for criado.

## Convenção

O modelo funcional e o modelo relacional são as referências atuais. As revisões e migrations registram histórico de construção e não devem substituir os documentos canônicos.
