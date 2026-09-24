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
- [ ] Definir estratégia para `produtos.estoque`
- [ ] Definir evolução de itens JSONB
- [ ] Definir identidade relacional em registros operacionais
- [ ] Separar configurações globais, empresariais, por unidade e por usuário
- [ ] Definir Storage público/privado/backup

## Operações críticas

- [ ] Contrato do serviço de venda
- [ ] Serviço de venda
- [x] Contrato do serviço de fechamento de comanda
- [ ] Serviço de fechamento de comanda
- [ ] Serviço de baixa de estoque
- [ ] Serviço de caixa
- [ ] Serviço de estorno
- [ ] Serviço de conta a receber
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
- [ ] Revisar Atendimento + Comandas + Cozinha
- [ ] Revisar Vendas + Caixa + Financeiro
- [ ] Revisar Eventos + Ingressos
- [ ] Revisar Relatórios
- [ ] Revisar Impressão
- [ ] Fechar decisões de negócio restantes
- [ ] Revisar modelo relacional completo
- [ ] Definir contratos dos serviços por domínio
- [ ] Consolidar SQL final do banco
