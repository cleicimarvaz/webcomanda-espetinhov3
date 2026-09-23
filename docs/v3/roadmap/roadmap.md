# Roadmap da V3

Este roadmap organiza a evolução da V2 para a V3 sem exigir uma reescrita completa.

## Fase 0 — Auditoria e definição

Status: concluída em grande parte.

- inventário da aplicação;
- auditoria do banco;
- cruzamento banco × código;
- levantamento de funcionalidades;
- arquitetura atual;
- integrações;
- PWA/offline;
- impressão;
- backup;
- arquitetura alvo.

## Fase 1 — Fundação técnica e segurança

Objetivo: criar a base necessária para evoluir o sistema sem aumentar os riscos atuais.

- definir modelo de empresa e unidade;
- definir identidade e autenticação;
- separar autenticação de perfil/permissões;
- definir contexto organizacional da sessão;
- desenhar RLS e políticas;
- criar camada inicial de serviços;
- definir padrão de auditoria;
- definir padrão de erros e respostas;
- estabelecer testes mínimos de autorização e integridade;
- consolidar Service Worker e estratégia PWA.

## Fase 2 — Dados e operações críticas

Objetivo: retirar regras críticas de operações frágeis no frontend.

- transações de venda/comanda;
- transações de estoque;
- operações de caixa;
- pagamentos e contas a receber;
- estornos;
- emissão/validação de ingressos;
- idempotência;
- auditoria transacional;
- migração gradual dos módulos para serviços.

## Fase 3 — Organização e experiência

Objetivo: adaptar os fluxos à arquitetura de empresa/unidade e melhorar a experiência operacional.

- filtros e contexto por unidade;
- gestão de permissões;
- configurações por empresa/unidade;
- dashboard contextual;
- melhorias de navegação;
- notificações;
- relatórios;
- impressão desacoplada.

## Fase 4 — PWA e operação offline

Objetivo: transformar o cache atual em uma estratégia offline controlada.

- armazenamento local;
- fila de operações;
- sincronização;
- idempotência no servidor;
- tratamento de conflitos;
- sinalização visual de sincronização;
- testes de perda e retorno de conexão.

## Fase 5 — Evolução funcional

Somente depois da fundação estar estável, incorporar novos recursos planejados para a V3.

Exemplos:

- automações;
- recursos avançados de gestão;
- novos relatórios;
- integrações;
- melhorias de experiência;
- recursos inteligentes/assistidos.

## Regra de progressão

Uma fase pode avançar parcialmente, mas uma dependência estrutural não deve ser ignorada para acelerar uma funcionalidade que dependa dela.

Cada entrega deve registrar o que foi alterado, o que continua legado e como validar que a V2/V3 continua operacional.