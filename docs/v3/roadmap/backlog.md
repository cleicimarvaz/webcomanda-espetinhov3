# Backlog inicial da V3

## Fundação

- [x] Modelar empresa
- [x] Modelar unidade
- [x] Modelar vínculo usuário/unidade
- [x] Definir papéis e permissões
- [ ] Definir autenticação
- [ ] Definir sessão e contexto de unidade
- [ ] Definir RLS
- [x] Criar padrão de serviços
- [x] Definir fronteiras dos domínios
- [x] Consolidar regras de negócio críticas
- [x] Consolidar modelo relacional inicial
- [x] Definir contratos dos serviços principais
- [ ] Criar padrão de auditoria
- [ ] Consolidar Service Worker

## Banco V3 — etapa final

- [ ] Criar projeto/banco Supabase V3
- [ ] Executar schema base
- [ ] Executar funções V3
- [ ] Executar bootstrap administrativo
- [ ] Rodar pre-flight
- [ ] Rodar smoke tests

## Dados

- [ ] Mapear campos legados
- [x] Definir estratégia para produtos.estoque
- [x] Definir evolução de itens JSONB
- [x] Definir identidade relacional em registros operacionais
- [x] Separar configurações globais, empresariais, por unidade e por usuário
- [x] Definir Storage público/privado/backup

## Operações críticas

- [x] Contrato do serviço de venda
- [ ] Serviço de venda
- [x] Contrato do serviço de fechamento de comanda
- [ ] Serviço de fechamento de comanda
- [ ] Serviço de baixa de estoque
- [ ] Serviço de caixa
- [ ] Serviço de estorno
- [ ] Serviço de conta a receber
- [ ] Serviço de reservas de evento
- [ ] Serviço de emissão de ingresso
- [ ] Serviço de validação de ingresso
- [ ] Idempotência
- [ ] Testes de concorrência

## Impressão

- [ ] Interface única de impressão
- [ ] Conector navegador/PDF
- [ ] Conector térmico
- [ ] Avaliar alternativa ao RawBT
- [ ] Manter compatibilidade com 58/80 mm

## PWA/offline

- [ ] Consolidar Service Worker
- [ ] Definir cache de assets
- [ ] Definir storage local
- [ ] Definir fila offline
- [ ] Definir sincronização
- [ ] Definir conflitos
- [ ] Testar queda de internet durante venda

## Backup

- [ ] Definir conjunto de backup completo
- [ ] Incluir Storage quando necessário
- [ ] Versionar formato do backup
- [ ] Definir retenção
- [ ] Definir criptografia/acesso
- [ ] Criar teste de restauração
- [ ] Consolidar workflows do GitHub Actions

## Evolução funcional

- [ ] Revisar dashboard
- [ ] Revisar relatórios
- [ ] Melhorar notificações
- [ ] Definir automações
- [ ] Definir integrações futuras

## Modelagem do domínio — etapa atual

- [x] Consolidar entidades principais da V3
- [x] Mapear relações entre os domínios
- [x] Definir fontes de verdade iniciais
- [x] Mapear estruturas da V2 para a V3
- [x] Mapear casos de uso centrais
- [x] Criar contratos iniciais de atendimento e financeiro
- [x] Revisar Catálogo + Estoque
- [x] Revisar Atendimento + Comandas + Cozinha
- [x] Revisar Vendas + Caixa + Financeiro
- [x] Revisar Eventos + Ingressos
- [x] Revisar Relatórios
- [x] Revisar Impressão
- [x] Fechar decisões de negócio restantes
- [x] Revisar modelo relacional completo
- [x] Definir contratos dos serviços por domínio
- [ ] Consolidar SQL final do banco


## Atualização — Revisão 05

Foram concluídas as revisões de Relatórios + Impressão e criado o contrato do serviço de relatórios. O contrato de impressão também foi refinado para separar operação comercial, execução de impressão, reimpressão, idempotência e adaptadores por dispositivo.

O banco V3 permanece como etapa final.


## Atualização — Fechamento das decisões de negócio

Em 2026-09-24 foi criado o ADR-004, consolidando as decisões funcionais abertas dos domínios de catálogo, estoque, atendimento, vendas, financeiro, eventos, ingressos, relatórios e impressão.

O próximo passo da modelagem é revisar o modelo relacional completo com base nessas decisões. O banco V3 continua como etapa final.


## Atualização — Revisão 06

A Revisão 06 consolidou as consequências do ADR-004 no modelo relacional. Foram explicitados lote de ingresso, transferência de ingresso, portarias, histórico de impressão, múltiplos códigos de barras, recebimento entre unidades, arquivos e a distinção entre mesa de atendimento e mesa de evento.
