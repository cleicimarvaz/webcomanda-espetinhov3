> **Nota de histórico:** esta revisão registra o fechamento técnico do domínio na data em que foi realizada. O estado atual das decisões funcionais está no ADR-004.

# Revisão V3 — Relatórios + Impressão

## Objetivo

Revisar os relatórios, dashboards e mecanismos de impressão existentes e definir como eles devem funcionar na V3.

A revisão considera duas regras centrais:

1. relatório é leitura derivada das fontes de verdade;
2. impressão é uma saída da operação, nunca a autoridade que conclui a operação.

O banco V3 definitivo continua fora desta etapa.

---

## 1. Situação atual dos relatórios

A V2 possui relatórios distribuídos entre:

- `caixa-reports.js`;
- `financeiro-relatorios.js`;
- `financeiro-avancado.js`;
- `print-relatorios.js`;
- telas e componentes específicos de caixa, vendas, estoque, eventos e comandas.

Os dados são calculados principalmente no navegador e consultam diretamente tabelas legadas.

Há relatórios de:

- fechamento de caixa;
- histórico de caixas;
- fluxo financeiro;
- despesas por categoria;
- DRE simplificado;
- comparativo entre períodos;
- fluxo projetado;
- metas de faturamento;
- ranking de produtos;
- comandas/vendas;
- estornos;
- estoque;
- eventos;
- ingressos.

---

## 2. Fonte de verdade dos relatórios

Na V2, vários relatórios consultam diretamente `historico_vendas` e `despesas`.

Na V3, relatórios devem derivar de:

- `vendas`;
- `venda_itens`;
- `venda_pagamentos`;
- `caixas`;
- `movimentacoes_caixa`;
- `contas_receber`;
- `contas_receber_pagamentos`;
- `despesas`;
- `despesa_pagamentos`;
- `estoque_produto_unidade`;
- `estoque_movimentacoes`;
- `eventos`;
- `ingressos`;
- `validacoes_ingresso`.

O relatório não deve manter uma segunda versão dos números.

---

## 3. Escopo organizacional

Todo relatório operacional ou financeiro precisa deixar claro:

- empresa;
- unidade;
- período;
- usuário/escopo de acesso, quando aplicável.

Um usuário com acesso a uma unidade não deve receber dados de outra unidade apenas porque o relatório foi criado sem filtro.

O serviço de relatórios deve receber o contexto organizacional e aplicar a autorização.

---

## 4. Datas e período

A V2 usa combinações de:

- `created_at`;
- `data_pagamento`;
- datas em formato local;
- conversões UTC feitas no navegador.

Na V3, cada relatório deve definir explicitamente qual data representa o fato.

Exemplos:

- venda: data de conclusão da venda;
- pagamento: data/hora do pagamento;
- abertura de caixa: `aberta_em`;
- fechamento: `fechada_em`;
- despesa: data da obrigação;
- pagamento de despesa: data do pagamento;
- validação de ingresso: data/hora da entrada.

O filtro de período não deve misturar datas semanticamente diferentes sem informar isso.

---

## 5. Pagamentos

O relatório financeiro V2 trata `forma_pagamento` como texto único da venda.

Isso não suporta corretamente pagamento dividido.

### Direção V3

Relatórios financeiros devem consultar `venda_pagamentos`.

Assim será possível apresentar:

- valor por forma de pagamento;
- número de pagamentos;
- pagamentos divididos;
- troco quando aplicável;
- origem do pagamento;
- caixa associado.

---

## 6. Vendas canceladas e estornos

A V2 usa filtros por status para excluir cancelamentos/estornos.

Na V3, o relatório deve considerar o modelo de estorno compensatório.

A venda original permanece histórica.

O serviço de relatório precisa diferenciar:

- venda bruta;
- descontos;
- pagamentos;
- estornos;
- valor líquido, quando o relatório assim definir.

Não apagar uma venda do resultado apenas porque ela teve um estorno; o efeito deve aparecer conforme o relatório.

---

## 7. DRE

O DRE atual calcula CMV lendo `preco_custo` dentro do JSONB dos itens da venda.

Isso depende de um snapshot legado e dificulta evolução do modelo.

### Direção V3

O item da venda deve guardar o custo praticado/conhecido no momento da operação quando esse dado for necessário para margem/CMV.

O DRE deverá derivar:

- receita;
- descontos/devoluções conforme regra;
- custo dos itens;
- despesas;
- demais linhas que forem definidas contabilmente.

O nome "DRE" deve deixar claro que se trata de um relatório gerencial simplificado caso não seja adotado um modelo contábil completo.

---

## 8. Despesas

A V2 usa `despesas.paga` e `valor` diretamente para relatórios.

Na V3, relatórios financeiros devem consultar:

`despesas → despesa_pagamentos`

quando a pergunta for "quanto foi pago".

A data e o valor do pagamento devem vir da entidade de pagamento.

A obrigação e o pagamento são conceitos diferentes.

---

## 9. Contas a receber

O fluxo projetado atual usa `valor - valor_pago`.

Na V3, o saldo deve vir da soma dos recebimentos válidos.

Isso permite:

- pagamento parcial;
- vários recebimentos;
- estorno;
- histórico;
- previsão de entrada futura.

---

## 10. Fluxo financeiro realizado

O relatório realizado deve separar:

### Entradas

- pagamentos de vendas;
- recebimentos de contas;
- outras entradas financeiras justificadas.

### Saídas

- pagamentos de despesas;
- sangrias;
- demais saídas registradas.

Suprimento de caixa deve ser tratado de forma explícita para não ser confundido automaticamente com receita operacional.

---

## 11. Fluxo projetado

A V2 estima receita futura usando a média dos últimos 30 dias.

Esse cálculo pode continuar existindo como projeção gerencial, mas deve ser claramente identificado como estimativa.

A projeção futura também deve usar:

- contas a receber em aberto/parciais;
- despesas a pagar;
- período projetado;
- regras de vencimento.

Não apresentar projeção como valor realizado.

---

## 12. Comparativos

O comparativo atual calcula variações entre o período atual e o período anterior equivalente.

Na V3, esse recurso pode ser mantido.

O relatório deve mostrar claramente:

- período atual;
- período de comparação;
- métrica;
- valor de cada período;
- variação.

A comparação não deve alterar ou interpretar a fonte de verdade.

---

## 13. Metas

A V2 possui meta mensal simplificada.

Na V3, as metas devem respeitar o escopo decidido:

- empresa;
- unidade;
- período.

O progresso deve ser comparado com vendas oficiais da V3.

O relatório não deve depender do valor digitado no frontend como fonte de faturamento.

---

## 14. Estoque

O relatório de estoque da V2 lê `produtos.estoque_atual`.

Na V3, isso deve desaparecer como fonte oficial.

Relatórios de estoque devem derivar de:

- `estoque_produto_unidade`;
- `estoque_movimentacoes`;
- inventários;
- transferências.

Todo relatório de estoque precisa deixar claro qual unidade está sendo consultada.

---

## 15. Produtos mais vendidos

O ranking atual lê itens em JSONB.

Na V3, o ranking deve usar `venda_itens`.

Isso permitirá:

- quantidade;
- faturamento por produto;
- margem, quando disponível;
- filtros por unidade;
- filtros por categoria;
- filtros por período.

O nome atual do produto não deve reescrever o histórico.

---

## 16. Eventos e ingressos

Relatórios de eventos devem usar:

- eventos;
- reservas;
- mesas;
- vendas;
- ingressos;
- validações.

Exemplos:

- mesas reservadas;
- mesas livres;
- reservas pendentes;
- ingressos emitidos;
- ingressos cancelados;
- ingressos utilizados;
- receita do evento;
- taxa de utilização/entrada.

A receita não deve ser calculada por `quantidade × preço atual`.

---

## 17. Relatórios como serviço

A V3 deve separar:

`consulta → transformação → apresentação`

A camada de serviço pode retornar dados normalizados.

A UI decide apenas como exibir.

Isso facilita:

- tela;
- PDF;
- Excel/CSV;
- dashboard;
- filtros;
- API futura.

Um mesmo resultado não deve ser recalculado de formas diferentes em cada tela.

---

## 18. Views e consultas consolidadas

Depois que o modelo final existir, podem ser criadas views específicas para leituras frequentes.

Exemplos conceituais:

- resumo de vendas por período;
- resumo de pagamentos;
- posição de estoque por unidade;
- contas em aberto;
- fluxo de caixa;
- indicadores de eventos.

Views não substituem as tabelas transacionais; apenas organizam leitura.

---

## 19. Exportações

CSV/Excel/PDF devem ser formatos de saída do mesmo conjunto de dados.

Não criar uma regra de cálculo diferente para cada exportador.

Fluxo desejado:

`serviço de relatório → dados normalizados → renderizador`

---

## 20. Situação atual da impressão

A V2 possui um motor central em `print-core.js` que usa iframe oculto e `window.print()`.

Também existem rotas específicas para:

- ticket;
- comprovante;
- fechamento;
- cozinha;
- ingresso;
- relatório;
- cardápio.

O código possui adaptações para:

- 58 mm;
- 80 mm;
- Android/RawBT;
- iOS;
- navegador/PDF.

---

## 21. Motor central de impressão

O uso de iframe é útil para isolar o documento, mas a V3 deve tratar o mecanismo como adaptador.

A regra de negócio não deve saber se o destino é:

- impressora térmica;
- navegador;
- PDF;
- dispositivo móvel;
- servidor de impressão.

---

## 22. Impressão térmica

Na V3, o comando de impressão deve receber:

- tipo;
- payload;
- layout;
- largura;
- destino;
- deviceId/configuração.

A camada de infraestrutura decide como produzir a saída.

58 mm e 80 mm permanecem suportados.

---

## 23. Android / RawBT

A V2 possui uma rota específica baseada em texto puro para Android quando determinadas configurações locais estão ativas.

Isso deve ser tratado como um adaptador de compatibilidade, não como regra da venda.

A V3 deve permitir substituir esse mecanismo no futuro sem alterar o domínio comercial.

---

## 24. iOS

A V2 possui uma rota específica baseada em `openlabels://print` em determinado modo de impressão.

Isso mostra que o sistema atualmente depende de um mecanismo externo para esse caminho.

Na V3, a integração deve ficar isolada em adaptadores de infraestrutura para que a aplicação possa ter mais de uma estratégia.

---

## 25. Impressão e estado da operação

A V3 deve representar:

`operação concluída → impressão pendente/concluída/falhou`

Uma venda não pode ficar "não concluída" porque a impressora não respondeu.

Uma impressão pode ser reprocessada.

---

## 26. Reimpressão

Reimpressão não deve criar:

- nova venda;
- novo pagamento;
- novo ingresso;
- novo fechamento;
- nova movimentação.

Ela cria somente uma nova execução de impressão vinculada ao documento original.

---

## 27. Idempotência da impressão

Quando a aplicação enviar o mesmo comando novamente, a camada de impressão deve conseguir identificar a operação/documento.

Isso não significa bloquear toda reimpressão; significa distinguir:

- retry do mesmo comando;
- solicitação deliberada de reimpressão.

---

## 28. Falha de impressão

Devem existir estados ou histórico suficientes para diferenciar:

- enviado;
- concluído;
- falhou;
- cancelado;
- reprocessado.

A falha deve gerar informação para suporte, mas não desfazer a transação comercial.

---

## 29. Impressão offline

Em modo offline, a operação e a impressão não devem depender do mesmo mecanismo.

A V3 poderá manter uma fila local de impressão associada a uma operação já persistida/sincronizada.

A política definitiva será detalhada na revisão de PWA/offline.

---

## 30. Relatório impresso

O PDF/relatório deve ser um renderizador dos dados do relatório.

Não buscar novamente tabelas e recalcular de forma independente só porque o usuário clicou em imprimir.

Isso evita divergência entre:

- tela;
- PDF;
- Excel.

---

## 31. Dados locais e identidade

Atualmente nomes da loja, operador e parâmetros de impressão são frequentemente lidos de `localStorage`.

Na V3:

- identidade do usuário vem da sessão;
- nome/configuração da empresa/unidade vem do contexto autorizado;
- preferências do dispositivo podem continuar locais;
- dados financeiros não podem depender de `localStorage`.

---

## 32. Segurança e autorização

Relatórios financeiros, caixas, estornos, estoque e eventos administrativos devem respeitar as permissões do usuário.

O fato de existir um botão "imprimir" não cria autorização adicional.

A autorização deve ser validada no serviço/RLS antes da leitura dos dados.

---

## 33. Performance

Relatórios grandes não devem depender de:

- buscar tudo para o navegador;
- processar milhares de registros na UI;
- contornar limites da API com muitas chamadas sequenciais sem estratégia.

A V3 deve preferir:

- consultas filtradas;
- paginação;
- agregações no banco;
- views;
- cache para indicadores não críticos;
- exportação assíncrona quando o volume justificar.

---

## 34. Decisões técnicas fechadas nesta revisão

| Tema | Direção V3 |
|---|---|
| Fonte dos relatórios | entidades normalizadas V3 |
| Escopo | empresa/unidade conforme contexto |
| Datas | cada relatório define a data do fato |
| Pagamentos | venda_pagamentos e entidades de recebimento |
| Estornos | efeitos compensatórios visíveis |
| DRE | relatório gerencial derivado das fontes V3 |
| Despesas | despesa + pagamentos |
| Contas a receber | saldo derivado dos recebimentos |
| Estoque | saldo por produto + unidade |
| Produtos vendidos | venda_itens |
| Eventos | eventos + reservas + ingressos + fontes financeiras |
| Relatórios | serviço/consulta separado da apresentação |
| Exportação | mesma fonte para tela/PDF/Excel |
| Impressão | adaptador de infraestrutura |
| Reimpressão | nova execução, não nova operação comercial |
| Falha de impressão | não desfaz operação |
| 58/80 mm | suportados |
| Dados financeiros | não dependem de localStorage |

---

## 35. Decisões funcionais que continuam abertas

1. quais relatórios entram no primeiro release;
2. quais métricas do dashboard serão oficiais;
3. definição exata do DRE gerencial;
4. tratamento de devoluções/estornos nos indicadores;
5. metas por empresa, unidade ou ambos;
6. relatórios corporativos versus por unidade;
7. nível de detalhamento de eventos/ingressos;
8. histórico/retorno de impressão;
9. modo de impressão térmica preferencial;
10. solução definitiva para iOS;
11. necessidade de servidor/conector local de impressão;
12. política de fila de impressão offline;
13. retenção do histórico de impressões;
14. geração assíncrona de relatórios grandes.

---

## 36. Conclusão

A revisão mostra que Relatórios e Impressão devem ser tratados como camadas de leitura e saída, e não como novas fontes de verdade.

A arquitetura desejada é:

`Domínio/Transação → Fonte normalizada → Serviço de relatório → Renderizador (tela/PDF/Excel)`

e, separadamente:

`Operação concluída → Comando de impressão → Adaptador de saída → Histórico da impressão`

Essa separação permite manter a lógica financeira e operacional independente do dispositivo usado para visualizar ou imprimir.

O banco físico V3 continua aguardando o fechamento das decisões e a revisão final do modelo.
