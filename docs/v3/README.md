# WebComanda Espetinho — V3

Documentação da evolução do WebComanda Espetinho a partir da V2.

## Objetivo

A V3 será planejada sobre a base real da V2, preservando o que já funciona e evitando duplicar funcionalidades existentes.

## Estado atual

A V3 já possui a fundação técnica inicial separada da V2, com banco dedicado, contexto organizacional e movimentação de estoque transacional preparados para testes em desenvolvimento.

A regra continua sendo evoluir por etapas: alterações críticas devem ser documentadas, a V2 permanece utilizável e nenhuma operação deve ser executada contra produção sem validação prévia.

## Estrutura

- `auditoria/` — estado atual, arquitetura, banco, segurança, funcionalidades e pontos de atenção.
- `produto/` — visão e requisitos da V3.
- `arquitetura/` — arquitetura e integrações futuras.
- `roadmap/` — fases de desenvolvimento e backlog.
- `decisoes/` — decisões técnicas e de produto.

## Documentos já consolidados

### Auditoria

- [Visão geral](auditoria/visao-geral.md)
- [Arquitetura atual](auditoria/arquitetura-atual.md)
- [Funcionalidades existentes](auditoria/funcionalidades-existentes.md)
- [Banco de dados](auditoria/banco-de-dados.md)
- [Uso do banco pelo código](auditoria/uso-do-banco-pelo-codigo.md)
- [Segurança](auditoria/seguranca.md)
- [Pontos de atenção](auditoria/pontos-de-atencao.md)
- [PWA e operação offline](auditoria/pwa-offline.md)
- [Impressão](auditoria/impressao.md)
- [Backup e recuperação](auditoria/backup-recuperacao.md)
- [Integrações](auditoria/integracoes.md)

### Arquitetura

- [Arquitetura alvo da V3](arquitetura/arquitetura-v3.md)
- [Módulos e dependências](arquitetura/modulos.md)
- [Arquitetura de dados alvo](arquitetura/banco-de-dados.md)
- [Mapeamento V2 → V3](arquitetura/mapeamento-v2-v3.md)
- [Modelo funcional e de dados completo V3](arquitetura/modelo-funcional-completo-v3.md)
- [Schema base do banco V3](arquitetura/schema-v3-base.md)
- [Funções transacionais do banco V3](arquitetura/schema-v3-base.md#funções-transacionais)
- [Pre-flight do banco V3](testes/preflight-banco-v3.md)
- [Smoke test do estoque transacional](testes/smoke-estoque-transacional.md)
- [Modelo organizacional](arquitetura/modelo-organizacional.md)
- [Papéis e permissões](arquitetura/permissoes.md)
- [Modelo relacional organizacional](arquitetura/modelo-relacional-organizacional.md)
- [Estratégia de RLS](arquitetura/estrategia-rls.md)
- [Mapeamento de chaves organizacionais](arquitetura/mapeamento-chaves-organizacionais.md)
- [Migration 008 — Movimentação e inventário transacionais](arquitetura/migration-008-movimentacao-inventario-transacional.md)
- [Serviço V3 de estoque](arquitetura/servico-estoque-v3.md)
- [Contrato do serviço de venda V3](arquitetura/contrato-servico-venda-v3.md)
- [Contrato do serviço financeiro V3](arquitetura/contrato-servico-financeiro-v3.md)
- [Contrato do serviço de atendimento V3](arquitetura/contrato-servico-atendimento-v3.md)
- [Casos de uso e operações centrais V3](arquitetura/casos-de-uso-v3.md)
- [Serviço V3 de contexto organizacional](arquitetura/servico-contexto-organizacional-v3.md)
- [Configuração e cliente do banco V3](decisoes/ADR-003-banco-dados-v3-separado.md)
- [Tela de configuração do banco V3](arquitetura/configuracao-banco-v3.md)
- [Teste das operações transacionais de estoque](arquitetura/teste-estoque-transacional.md)
- [Integração gradual da movimentação manual V3](arquitetura/integracao-movimentacao-manual-v3.md)

### Roadmap

- [Roadmap da V3](roadmap/roadmap.md)
- [Fase 01 — Fundação técnica e segurança](roadmap/fase-01.md)
- [Backlog inicial](roadmap/backlog.md)

### Decisões

- [Registro de decisões](decisoes/README.md)
- [ADR-001 — Modelo organizacional](decisoes/ADR-001-modelo-organizacional.md)
- [ADR-002 — Modelo relacional organizacional](decisoes/ADR-002-modelo-relacional-organizacional.md)
- [ADR-003 — Banco de dados dedicado para a V3](decisoes/ADR-003-banco-dados-v3-separado.md)
- [Decisões de negócio pendentes](decisoes/decisoes-pendentes-negocio.md)
- [Migration 002 — Backfill organizacional](arquitetura/migration-002-backfill-organizacional.md)

## Base analisada

A base da V3 é a cópia pública da V2 existente neste repositório.

## Princípios

1. Não quebrar funcionalidades existentes.
2. Corrigir riscos antes de ampliar a superfície do sistema.
3. Manter documentação próxima do código.
4. Separar claramente correção, melhoria e nova funcionalidade.
5. Não versionar credenciais ou dados reais de produção.
