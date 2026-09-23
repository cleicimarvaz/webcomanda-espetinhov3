# Backlog inicial da V3

## Fundação

- [ ] Modelar empresa
- [ ] Modelar unidade
- [ ] Modelar vínculo usuário/unidade
- [ ] Definir papéis e permissões
- [ ] Definir autenticação
- [ ] Definir sessão e contexto de unidade
- [ ] Definir RLS
- [ ] Criar padrão de serviços
- [ ] Criar padrão de auditoria
- [ ] Consolidar Service Worker

## Dados

- [ ] Mapear campos legados
- [ ] Definir estratégia para `produtos.estoque`
- [ ] Definir evolução de itens JSONB
- [ ] Definir identidade relacional em registros operacionais
- [ ] Separar configurações globais, empresariais, por unidade e por usuário
- [ ] Definir Storage público/privado/backup

## Operações críticas

- [ ] Serviço de venda
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