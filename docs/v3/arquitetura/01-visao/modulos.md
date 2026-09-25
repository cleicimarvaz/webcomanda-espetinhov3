# Módulos e dependências da aplicação atual

A V2 utiliza múltiplos módulos JavaScript compartilhados entre páginas. A maior parte das dependências é implícita: os arquivos são carregados em sequência pelos HTMLs e funções globais ficam disponíveis em window.

## Núcleo compartilhado
| Módulo | Papel | Dependências/uso |
|---|---|---|
| config.js | configuração e estado global | Supabase, preferências, impressão, dados da loja |
| database.js | inicialização/acesso de banco | Supabase |
| utils.js | funções utilitárias | compartilhado por vários domínios |
| ui.js | modais, mensagens e UI | compartilhado |
| audit.js | registro de auditoria | usuários e operações |
| auth.js | sessão/autorização local e ações administrativas | usuários |
| login.js | autenticação de entrada | usuários |
| main.js | inicialização e rotinas globais | vários módulos |
| notificacoes.js | notificações globais | despesas, usuários |
| backup.js | backup manual/restauração/lembranças | Supabase |

## Comercial e atendimento

### Produtos
produtos.js centraliza o catálogo e a movimentação manual de estoque. Usa produtos, historico_precos e estoque_movimentacoes.

produtos-combos.js complementa o catálogo com composição de combos usando produto_composicao e produtos.

produtos-importacao.js trata importação de produtos.

estoque-inventario.js trata inventário e também usa inventarios, produtos e estoque_movimentacoes.

### Vendas
vendas.js depende de catálogo/produtos, combos, comandas, configurações, complementos, clientes/contas a receber, estoque, caixa, cozinha e impressão. É um dos módulos centrais do sistema.

### Comandas
comandas.js depende de comandas, histórico de vendas, produtos/combos, contas a receber, caixa, cozinha, divisão e impressão.

divisao.js depende de comandas e historico_vendas e executa parte do fechamento/divisão da conta.

### Cozinha
cozinha.js consome comandas e conversa com o subsistema de impressão. Há dependência direta do fluxo de venda/comanda para alimentar o monitor.

## Financeiro

caixa.js e caixa-reports.js formam o núcleo do caixa. Os relatórios também consultam vendas, movimentações, usuários e despesas.

despesas.js trabalha sobre despesas e integra fornecedor, notificações e impressão.

contas-receber.js usa clientes e contas_receber e é chamado pelos fluxos de venda/comanda.

financeiro-relatorios.js e financeiro-avancado.js derivam informações de vendas, despesas, contas a receber e metas.

produtos-abc.js deriva o ranking/curva ABC de historico_vendas.

exportar-excel.js fornece a infraestrutura de exportação usada por diferentes telas.

## Eventos e ingressos

eventos-core.js mantém o evento e o relacionamento básico com reservas.

eventos-reservas.js gerencia solicitações e reservas.

eventos-financeiro.js monta informações financeiras do evento.

eventos-mapa.js gerencia ocupação e seleção de mesas.

eventos-patrocinadores.js gerencia patrocinadores armazenados na estrutura do evento.

eventos-impressao.js gera materiais de impressão do evento e trabalha com reservas e dados do evento.

ingressos.js gerencia tipos de ingresso e ingressos vendidos.

scanner-ingressos.js valida/consulta ingressos durante a leitura do QR Code.

## Público

cardapio.js consulta configuracoes_sistema e produtos para montar o cardápio público.

ingresso-publico.js implementa a experiência pública de ingressos e gera QR Code.

Esses fluxos públicos merecem atenção especial na V3 porque não possuem o mesmo contexto de sessão das áreas administrativas.

## Estorno e auditoria

estorno-admin.js depende de comandas, historico_vendas e usuarios e representa uma operação sensível.

audit.js é transversal e deve permanecer desacoplado da UI na V3, para que auditoria também possa registrar operações executadas por serviços transacionais.

## Impressão

O conjunto print-core.js, print-cupons.js, print-comprovantes.js e print-relatorios.js é transversal. Vendas, comandas, caixa, despesas, eventos e ingressos utilizam esse subsistema.

Essa transversalidade significa que alterações de impressão precisam ser feitas de forma compatível com vários domínios.

## Dependências críticas

Fluxo comercial principal:

venda → produtos/combos → comanda → cliente/contas a receber → estoque → caixa → cozinha → histórico de vendas → impressão → auditoria.

Fluxo de eventos:

evento → reservas → mapa/mesas → ingressos → QR Code/scanner → impressão.

Fluxo administrativo:

usuário/auth → configuração → permissões/ações administrativas → auditoria.

## Implicação para a V3

Os módulos não devem ser simplesmente reescritos isoladamente. Existem cadeias de dependência entre domínios. A evolução deve priorizar fronteiras de serviço/domínio que permitam substituir gradualmente o acesso direto ao Supabase sem quebrar a operação atual.

Uma primeira separação lógica recomendada para a V3 é:

- identidade e autorização;
- catálogo e estoque;
- atendimento (venda/comanda/cozinha);
- caixa e financeiro;
- eventos e ingressos;
- relatórios;
- impressão;
- infraestrutura (PWA, backup, notificações, configuração).