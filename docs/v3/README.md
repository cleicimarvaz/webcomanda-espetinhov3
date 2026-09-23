# WebComanda Espetinho — V3

Documentação da evolução do WebComanda Espetinho a partir da V2.

## Objetivo

A V3 será planejada sobre a base real da V2, preservando o que já funciona e evitando duplicar funcionalidades existentes.

## Regra desta etapa

Esta fase é de **auditoria e documentação**. Nenhuma alteração de lógica da aplicação deve ser feita sem decisão posterior registrada.

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
- [Modelo organizacional](arquitetura/modelo-organizacional.md)
- [Papéis e permissões](arquitetura/permissoes.md)
- [Modelo relacional organizacional](arquitetura/modelo-relacional-organizacional.md)
- [Estratégia de RLS](arquitetura/estrategia-rls.md)
- [Mapeamento de chaves organizacionais](arquitetura/mapeamento-chaves-organizacionais.md)

### Roadmap

- [Roadmap da V3](roadmap/roadmap.md)
- [Fase 01 — Fundação técnica e segurança](roadmap/fase-01.md)
- [Backlog inicial](roadmap/backlog.md)

### Decisões

- [Registro de decisões](decisoes/README.md)
- [ADR-001 — Modelo organizacional](decisoes/ADR-001-modelo-organizacional.md)
- [ADR-002 — Modelo relacional organizacional](decisoes/ADR-002-modelo-relacional-organizacional.md)
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
