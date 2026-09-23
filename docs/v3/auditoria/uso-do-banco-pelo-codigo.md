# Uso do banco pelo código da V2

## Objetivo

Este documento registra o cruzamento entre o banco definido no SQL da V2 e os componentes JavaScript que realmente acessam essas tabelas.

A auditoria é descritiva. Nenhuma regra da aplicação foi alterada para produzir este levantamento.

## Mapa por módulo

| Módulo | Tabelas acessadas |
|---|---|
| produtos.js | produtos, historico_precos, estoque_movimentacoes |
| vendas.js | comandas, produtos, configuracoes_sistema, complementos, historico_vendas |
| comandas.js | comandas, historico_vendas |
| caixa.js | caixa, movimentacoes_caixa |
| estoque-inventario.js | produtos, inventarios, estoque_movimentacoes |
| despesas.js | despesas |
| contas-receber.js | clientes, contas_receber |
| fornecedores.js | fornecedores |
| financeiro-avancado.js | historico_vendas, despesas, contas_receber, metas_faturamento |
| financeiro-relatorios.js | historico_vendas, despesas |
| eventos-core.js | eventos, reservas_evento |
| eventos-reservas.js | reservas_evento |
| eventos-financeiro.js | eventos |
| eventos-mapa.js | eventos, reservas_evento |
| eventos-patrocinadores.js | eventos |
| ingressos.js | tipos_ingresso, ingressos |
| user.js | usuarios, historico_vendas |
| login.js | usuarios |
| auth.js | usuarios |
| audit.js | auditoria |

## Domínios identificados

### Comercial e vendas

O fluxo comercial utiliza produtos, comandas e histórico de vendas. Parte das informações da venda é mantida em estruturas JSONB, conforme documentado na auditoria do banco.

### Estoque

O estoque utiliza produtos, inventários e movimentações. O código confirma que `inventarios` é uma tabela efetivamente utilizada pela aplicação.

O modelo atual também possui atualização de estoque realizada pelo código cliente. Esse ponto deve ser revisado na arquitetura da V3 para operações que precisem de atomicidade.

### Caixa e financeiro

Caixa, movimentações, despesas, contas a receber e metas de faturamento formam o núcleo financeiro. Relatórios são montados consultando dados operacionais.

Operações financeiras críticas devem ser avaliadas para execução transacional e validação no servidor/banco.

### Eventos e ingressos

O domínio de eventos utiliza `eventos` e `reservas_evento`. Ingressos utiliza `tipos_ingresso` e `ingressos`.

Há operações relacionadas que envolvem mais de uma tabela, como venda de ingresso e atualização de quantidade vendida. Esse tipo de operação deve ser avaliado para evitar inconsistências quando uma etapa falhar.

### Usuários e auditoria

`usuarios` é acessada por login, autenticação e administração de usuários. `auditoria` é utilizada pelo módulo de auditoria.

A identidade atual é baseada em registros próprios da aplicação e valores armazenados no cliente. A migração para uma identidade robusta deve ser definida junto com autenticação e RLS.

## Principais pontos encontrados

1. O banco possui 21 tabelas principais e a maior parte delas está efetivamente conectada a módulos JavaScript.
2. `inventarios` é usado pelo código, embora tenha tratamento diferente no bloco de RLS do schema.
3. Vendas, comandas, estoque e financeiro possuem operações compostas por várias chamadas ao banco.
4. Parte da lógica de integridade e cálculo permanece no frontend.
5. Existem relações funcionais representadas por JSONB ou por valores textuais, além das FKs tradicionais.
6. Usuários e autorização precisam ser tratados como uma camada própria na V3.
7. O desenho da V3 deve preservar os domínios funcionais existentes, mas reduzir a dependência de regras críticas no cliente.

## Próxima etapa

Continuar o cruzamento com os módulos auxiliares, impressão, notificações, backup, dashboard e configuração, e depois consolidar a arquitetura atual da aplicação.
