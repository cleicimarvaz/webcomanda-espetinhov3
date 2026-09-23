# Pontos de atenção da V2

Este documento consolida os principais pontos identificados durante a auditoria da V2. Eles são registros de risco ou de dívida técnica; não representam correções já aplicadas.

## Segurança e autorização

- Senhas são tratadas diretamente pela aplicação em vez de uma solução dedicada de autenticação.
- Dados de sessão e nível de usuário são mantidos no cliente.
- O banco atual possui RLS desabilitado para as principais tabelas.
- Operações sensíveis dependem de chamadas feitas pelo frontend.
- O uso de `localStorage` deve ser separado de autenticação e autorização reais.

## Integridade de dados

- Vendas, comandas, estoque e financeiro possuem operações compostas por várias chamadas ao banco.
- Parte das regras e cálculos fica no JavaScript.
- Atualizações de estoque precisam de proteção contra concorrência e falhas intermediárias.
- Operações envolvendo eventos e ingressos também merecem revisão transacional.

## Modelo de dados

- Existem campos legados, como `produtos.estoque`.
- `comandas.itens` e `historico_vendas.itens` usam JSONB para parte das informações operacionais.
- Alguns vínculos de negócio são representados por texto em vez de uma identidade relacional estável.
- `configuracoes_sistema` concentra configurações que podem precisar de separação por empresa/unidade na V3.
- A estrutura atual ainda não materializa o conceito de multiempresa/multiunidade.

## PWA e offline

- Há dois Service Workers (`sw.js` e `ws.js`) com configurações diferentes.
- As listas de cache precisam permanecer sincronizadas com os arquivos realmente usados.
- O Service Worker não trata operações de banco offline.
- A V2 não possui fila de sincronização transacional para vendas, comandas, caixa ou estoque.

## Impressão

- A impressão está fortemente acoplada ao navegador e ao ambiente local.
- Existem fluxos específicos para RawBT/Android.
- A evolução para iOS deve preservar o mecanismo atual como fallback até existir uma alternativa validada.
- Configurações de impressora ficam em `localStorage`.

## Backup

- O backup manual consulta várias tabelas diretamente no navegador.
- O conjunto de backup inclui `usuarios`, portanto o arquivo gerado deve ser tratado como dado sensível.
- O backup automático já foi separado para usar variáveis de ambiente no runner.
- Ainda é necessário definir política de retenção, criptografia, restauração e teste periódico de recuperação.

## Manutenção e arquitetura

- A aplicação tem muitos módulos JavaScript globais e compartilhamento por `window`.
- Parte da lógica utiliza acesso direto a `_supabase` em vez de passar por uma camada uniforme.
- Há componentes com funções de UI, banco e regra de negócio misturadas.
- CDN é usada para dependências importantes do frontend.
- A estrutura de Service Worker, impressão e configuração merece padronização antes de uma expansão grande da V3.

## Prioridades para o desenho da V3

1. Identidade, autenticação e autorização.
2. RLS e isolamento dos dados.
3. Integridade transacional de operações financeiras e de estoque.
4. Modelo organizacional de empresa/unidade.
5. Separação entre domínio, acesso a dados e interface.
6. Estratégia de PWA/offline.
7. Continuidade da impressão.
8. Backup e recuperação.
9. Evolução de relatórios e indicadores.

A ordem acima representa dependências arquiteturais para planejamento, não uma avaliação de prioridade comercial.
