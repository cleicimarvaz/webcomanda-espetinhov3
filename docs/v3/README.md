# WebComanda Espetinho — V3

Documentação da evolução do WebComanda Espetinho a partir da V2.

## Objetivo

A V3 será planejada sobre a base real da V2, preservando o que já funciona e evitando duplicar funcionalidades existentes.

## Regra desta etapa

Esta fase é de **auditoria e documentação**. Nenhuma alteração de lógica da aplicação deve ser feita sem decisão posterior registrada.

## Estrutura

- `auditoria/` — estado atual, arquitetura, banco, segurança e pontos de atenção.
- `produto/` — visão e requisitos da V3.
- `arquitetura/` — arquitetura e integrações futuras.
- `roadmap/` — fases de desenvolvimento e backlog.
- `decisoes/` — decisões técnicas e de produto.

## Base analisada

A base da V3 é a cópia pública da V2 existente neste repositório.

## Princípios

1. Não quebrar funcionalidades existentes.
2. Corrigir riscos antes de ampliar a superfície do sistema.
3. Manter documentação próxima do código.
4. Separar claramente correção, melhoria e nova funcionalidade.
5. Não versionar credenciais ou dados reais de produção.
