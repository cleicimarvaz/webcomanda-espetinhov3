# Arquitetura atual da V2

## Visão geral

A V2 é uma aplicação web estática, com páginas HTML independentes e componentes JavaScript compartilhados. O navegador concentra a maior parte da interface, regras de fluxo, consultas ao Supabase, cálculos, impressão e controle de sessão.

A persistência principal está no Supabase/PostgreSQL. O projeto também possui PWA, Service Worker, geração de relatórios, impressão térmica e recursos específicos para eventos e ingressos.

## Camadas observadas

### Interface

As telas são HTML com CSS próprio e Tailwind carregado por CDN. Lucide é carregado por CDN para ícones. ApexCharts e outras bibliotecas são usadas conforme cada módulo.

A aplicação segue um modelo de múltiplas páginas, em vez de um framework SPA centralizado.

### Componentes JavaScript

A pasta `componentes/` concentra a lógica de negócio e infraestrutura. Há módulos por domínio, como produtos, vendas, comandas, cozinha, caixa, financeiro, eventos, ingressos, usuários, auditoria e impressão.

Existe uma abstração simples em `database.js`, mas vários módulos acessam `_supabase` diretamente. Portanto, a camada de dados ainda não é uma fronteira arquitetural uniforme.

### Dados

O banco possui 21 tabelas principais documentadas na auditoria do banco. O código acessa diretamente tabelas operacionais e de configuração, inclusive em consultas usadas para dashboards e relatórios.

### Estado e sessão

A aplicação utiliza `localStorage` para manter informações de sessão, preferências e estado local. Entre os valores observados estão `userId`, `userName`, `usuarioLogado`, configurações de impressão, dados da loja e preferências de interface.

Esse modelo deve ser revisto na V3 para separar claramente identidade, sessão, autorização, preferências e cache local.

## PWA e offline

`manifest.json` define a aplicação como PWA instalável.

Existem dois arquivos relacionados a Service Worker (`sw.js` e `ws.js`). Ambos implementam cache de arquivos estáticos e estratégia Network First, mas possuem listas de assets diferentes.

O Service Worker não intercepta chamadas ao Supabase nem métodos HTTP que não sejam GET. Portanto, o mecanismo atual fornece principalmente disponibilidade do aplicativo e seus assets em cache; ele não implementa uma camada de transações offline para vendas, comandas, caixa ou estoque.

Também foram observadas referências no Service Worker a arquivos que precisam ser comparadas com a árvore atual, incluindo `componentes/print.js`. Isso deve ser limpo na revisão da infraestrutura PWA.

## Dashboard e relatórios

`dashboard.js` consulta diretamente `historico_vendas`, `comandas`, `despesas`, `contas_receber` e `produtos`, calcula indicadores no cliente e monta gráficos com ApexCharts.

Os módulos de relatórios e impressão também consultam dados do banco e geram documentos no navegador.

Na V3, indicadores que envolvam valores financeiros, saldos ou métricas derivadas devem ter uma definição de origem de dados e regras de consistência mais explícitas.

## Impressão

A impressão possui um conjunto dedicado de componentes (`print-core.js`, `print-cupons.js`, `print-comprovantes.js` e `print-relatorios.js`). O motor central cria um iframe para impressão e suporta configurações de bobina de 58 mm e 80 mm.

Também existe tratamento específico para RawBT/Android em partes do fluxo. Essa arquitetura deve ser preservada como requisito funcional durante a evolução para novos mecanismos de impressão, especialmente iOS.

## Backup

Existem dois mecanismos complementares:

- `componentes/backup.js` permite exportação de dados em JSON pelo navegador e inclui tabela de usuários no conjunto configurado atualmente.
- `scripts/backup-diario.js` realiza backup automático por execução no servidor/runner e utiliza `SUPABASE_URL` e `SUPABASE_KEY` por variáveis de ambiente.

O backup precisa ser tratado como recurso sensível, principalmente por incluir dados da tabela `usuarios` e da auditoria. A política de retenção, criptografia, restauração testada e controle de acesso deve fazer parte da V3.

## Configuração do Supabase

`componentes/config.js` contém a URL do projeto Supabase e uma chave do tipo publishable. Por ser uma aplicação cliente, essa configuração atualmente está presente no código enviado ao navegador.

A auditoria deve distinguir essa configuração pública da existência de credenciais realmente secretas. Segredos de backend não devem ficar no repositório.

## Principais características arquiteturais encontradas

1. Frontend com alta concentração de lógica de negócio.
2. Acesso direto do navegador ao banco por Supabase.
3. Uso parcial de uma camada de acesso a dados, sem padronização completa.
4. Estado de sessão e preferências distribuído em `localStorage`.
5. Operações críticas realizadas em várias chamadas ao banco.
6. PWA com cache de assets, mas sem transação offline.
7. Impressão e relatórios fortemente integrados ao frontend.
8. Regras financeiras e indicadores parcialmente calculados no cliente.

## Direção arquitetural para a V3

A V3 não precisa abandonar a aplicação existente. O caminho mais seguro é evoluir por camadas:

`interface atual`
→ `serviços de domínio`
→ `operações transacionais no servidor/banco`
→ `autenticação e autorização robustas`
→ `RLS e políticas por empresa/unidade`
→ `cache/offline transacional, quando necessário`
→ `novos recursos`.

Essa direção permite preservar os módulos funcionais já maduros enquanto a infraestrutura crítica é reorganizada.
