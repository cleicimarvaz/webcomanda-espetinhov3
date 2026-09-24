# Modelo relacional completo — V3

Este é o nível imediatamente anterior ao SQL. Ele apresenta as entidades e relações previstas para a V3, sem amarrar ainda nomes finais de colunas ou índices.

## Núcleo organizacional

\`\`\`text
EMPRESAS 1 ─── N UNIDADES
   │             │
   │             └── N ─── ESTOQUE_PRODUTO_UNIDADE ─── N ─── PRODUTOS
   │
   └── N ─── MEMBROS_ORGANIZACAO ─── N ─── USUARIOS
                    │
                    └── 1 ─── PAPEIS ─── N ─── PAPEL_PERMISSOES ─── N ─── PERMISSOES
\`\`\`

## Catálogo

\`\`\`text
EMPRESA 1:N CATEGORIAS_PRODUTO
EMPRESA 1:N PRODUTOS
PRODUTO 1:N PRODUTO_PRECOS
PRODUTO 1:N HISTORICO_PRECOS
PRODUTO 1:N PRODUTO_COMPOSICAO (como combo)
PRODUTO N:N COMPLEMENTO via PRODUTO_COMPLEMENTOS
GRUPO_COMPLEMENTO 1:N COMPLEMENTOS
\`\`\`

## Estoque

\`\`\`text
PRODUTO 1:N ESTOQUE_PRODUTO_UNIDADE N:1 UNIDADE
ESTOQUE_PRODUTO_UNIDADE 1:N ESTOQUE_MOVIMENTACOES
INVENTARIO 1:N INVENTARIO_ITENS
TRANSFERENCIA_ESTOQUE 1:N TRANSFERENCIA_ITENS
\`\`\`

## Atendimento

\`\`\`text
UNIDADE 1:N COMANDAS
COMANDA 1:N COMANDA_ITENS
COMANDA 1:N PEDIDOS
PEDIDO 1:N PEDIDO_ITENS
PEDIDO_ITEM → COMANDA_ITEM quando houver rastreio individual
\`\`\`

## Vendas

\`\`\`text
COMANDA 1:N VENDAS
VENDA 1:N VENDA_ITENS
VENDA 1:N VENDA_PAGAMENTOS
VENDA_ITEM 1:N VENDA_ITEM_COMPLEMENTOS
VENDA → CAIXA (quando pagamento ocorrer no caixa)
VENDA → CLIENTE (quando aplicável)
\`\`\`

## Financeiro

\`\`\`text
UNIDADE 1:N CAIXAS
CAIXA 1:N MOVIMENTACOES_CAIXA
CONTA_RECEBER 1:N CONTAS_RECEBER_PAGAMENTOS
DESPESA 1:N DESPESA_PAGAMENTOS
\`\`\`

## Eventos

\`\`\`text
EVENTO 1:N EVENTO_MESAS
EVENTO 1:N RESERVAS_EVENTO
RESERVA_EVENTO N:N EVENTO_MESAS via RESERVA_MESAS
EVENTO 1:N TIPOS_INGRESSO
EVENTO 1:N INGRESSOS
INGRESSO 1:N VALIDACOES_INGRESSO
EVENTO N:N PATROCINADORES via EVENTO_PATROCINADORES
\`\`\`

## Escopo organizacional

| Entidade | Escopo previsto |
|---|---|
| empresas | global do tenant |
| unidades | empresa |
| usuarios | identidade |
| membros_organizacao | empresa/unidade |
| produtos | empresa |
| clientes | empresa |
| fornecedores | empresa |
| estoque_produto_unidade | unidade |
| comandas | unidade |
| pedidos | unidade |
| vendas | unidade |
| caixas | unidade |
| contas_receber | unidade + cliente |
| despesas | empresa + unidade opcional |
| metas_faturamento | empresa + unidade opcional |
| eventos | empresa + unidade opcional |
| ingressos | evento |
| auditoria | empresa/unidade quando aplicável |

## Decisões estruturais já adotadas

- estoque é por unidade;
- produto é compartilhado dentro da empresa;
- identidade é separada de autenticação;
- itens operacionais deixam de depender exclusivamente de JSONB;
- pagamentos ganham representação própria;
- históricos críticos são preservados;
- banco final será criado depois da revisão completa.

## Decisões ainda abertas

- preço por unidade;
- escopo de eventos;
- despesas corporativas;
- metas;
- regras de transferência;
- pagamento dividido;
- regras de estoque de combos;
- políticas de anexos;
- configuração persistida versus local.


## ADDENDUM REVISAO 04 — Eventos e Ingressos

### Estrutura relacional revisada

```text
EVENTO 1:N EVENTO_MESAS
RESERVA_EVENTO N:N EVENTO_MESAS via RESERVA_MESAS
EVENTO 1:N TIPOS_INGRESSO
SOLICITACAO_INGRESSO 1:N SOLICITACAO_INGRESSO_ITENS
SOLICITACAO_INGRESSO N:1 EVENTO
SOLICITACAO_INGRESSO → VENDA quando houver cobrança
EVENTO 1:N INGRESSOS
INGRESSO → VENDA quando emitido por uma venda
INGRESSO 1:N VALIDACOES_INGRESSO
EVENTO N:N PATROCINADORES via EVENTO_PATROCINADORES
```

### Observações

`eventos.quantidade_mesas` deixa de ser a fonte oficial de capacidade quando `evento_mesas` estiver consolidado.
`reservas_evento.mesas` em JSONB deixa de ser a fonte oficial de ocupação; a relação passa para `reserva_mesas`.
`tipos_ingresso.quantidade_vendida`, caso exista, deve ser tratado como dado derivado/cache transacional e não como fonte primária.
Uma venda pode originar vários ingressos individuais, cada um com código próprio e histórico de validação.
Quando houver solicitação pública antes da confirmação financeira, a intenção deve ser representada separadamente da emissão.