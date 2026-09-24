# Decisões de negócio — V3

As decisões funcionais que estavam abertas foram consolidadas no **ADR-004 — Fechamento das decisões de negócio da V3**.

Documento de referência:

- [ADR-004 — Fechamento das decisões de negócio da V3](./ADR-004-fechamento-decisoes-negocio-v3.md)

## Status

**Fechado em 2026-09-24 para a modelagem da V3.**

Não há, neste momento, decisão funcional pendente que impeça a revisão final do modelo.

## Decisões consolidadas

Foram definidos:

- preço padrão por empresa com sobrescrita por unidade;
- clientes e fornecedores no escopo da empresa;
- despesas corporativas e por unidade;
- metas consolidadas e por unidade;
- eventos corporativos e por unidade;
- escopos de configuração;
- estoque por produto/unidade;
- estratégia de estoque de combos;
- política de saldo negativo;
- quantidades fracionadas;
- proibição de composição recursiva;
- transferência entre unidades;
- Storage público/privado;
- SKU e múltiplos códigos de barras;
- ciclo de inventário;
- identificação e ciclo de vida de comandas;
- regra de nova sessão após fechamento;
- cancelamento e recusa de itens;
- divisão de conta;
- permissões de atendimento;
- venda e exigência de caixa;
- formas de pagamento;
- pagamento dividido;
- contas a receber;
- despesas e pagamentos;
- estornos;
- estorno de venda fiada;
- fechamento e conciliação de caixa;
- concorrência no atendimento;
- ciclo de eventos;
- mesas e reservas;
- prazo de reserva pendente;
- preço de mesa;
- identificação de cliente;
- mapa de mesas;
- tipos e lotes de ingressos;
- janela e limites de venda;
- solicitação pública;
- confirmação manual de pagamento na primeira entrega;
- regra de caixa para ingressos;
- transferência de ingresso;
- reentrada;
- cancelamento/estorno de ingresso;
- múltiplas portarias;
- validação online na primeira entrega;
- patrocinadores;
- indicadores do dashboard;
- relatórios do primeiro release;
- datas dos fatos nos relatórios;
- DRE gerencial por competência;
- tratamento de estornos nos indicadores;
- escopo empresa/unidade nos relatórios;
- dataset único para tela/PDF/Excel;
- histórico e reimpressão;
- arquitetura de impressão térmica e fallback PDF.

## Próximo passo

Com as decisões fechadas, a próxima etapa é revisar o **modelo funcional e relacional completo** para incorporar as consequências dessas definições antes da consolidação do SQL físico.

O banco V3 continua sem criação física nesta fase.
