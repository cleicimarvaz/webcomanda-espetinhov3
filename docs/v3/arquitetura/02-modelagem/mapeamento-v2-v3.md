# Mapeamento inicial V2 → V3

Este documento mostra como as estruturas existentes da V2 serão absorvidas pelo modelo da V3. Não é uma migration pronta.

| V2 | V3 | Tratamento |
|---|---|---|
| usuarios | usuarios + membros_organizacao + papeis/permissoes | separar identidade de vínculo e autorização |
| auditoria | auditoria | ampliar contexto e estrutura do evento |
| fornecedores | fornecedores | adicionar empresa e regras de escopo |
| clientes | clientes | compartilhar na empresa; contexto comercial fica na operação |
| produtos | produtos | retirar dependência do estoque legado e normalizar catálogo |
| produto_composicao | produto_composicao | manter relação produto→componente |
| historico_precos | historico_precos + produto_precos | preservar histórico e permitir preço por escopo |
| inventarios | inventarios + inventario_itens | transformar contagem em registros estruturados |
| estoque_movimentacoes | estoque_movimentacoes | passar a ter empresa, unidade, operação e saldos |
| complementos | grupos_complemento + complementos + produto_complementos | separar cadastro e aplicabilidade |
| caixa | caixas | unidade + usuários + fechamento |
| movimentacoes_caixa | movimentacoes_caixa | relacionar com caixa e origem |
| comandas | comandas + comanda_itens | retirar itens do JSONB |
| historico_vendas | vendas + venda_itens + venda_pagamentos | separar cabeçalho, itens e pagamentos |
| despesas | despesas + despesa_pagamentos | permitir pagamento parcelado/histórico |
| contas_receber | contas_receber + contas_receber_pagamentos | ledger com recebimentos |
| metas_faturamento | metas_faturamento | adicionar escopo empresarial/unidade |
| configuracoes_sistema | configuracoes_sistema | escopo explícito e propriedades estruturadas |
| eventos | eventos + evento_mesas | retirar mesas do JSONB quando necessário |
| reservas_evento | reservas_evento + reserva_mesas | relação explícita com mesas |
| tipos_ingresso | tipos_ingresso + lotes_ingresso | separar tipo conceitual da oferta vendável |
| ingressos | ingressos + transferencias_ingresso + validacoes_ingresso | preservar emissão, titularidade e consumo |
| patrocinadores em JSONB | patrocinadores + evento_patrocinadores | relação explícita |

## Entidades V3 sem equivalente direto na V2

Algumas estruturas da V3 são novas e não possuem uma tabela única correspondente na V2. Entre elas: produto_codigos_barras, lotes_ingresso, transferencias_ingresso, portarias_evento, arquivos, impressoes, solicitacoes_ingresso, inventario_itens, transferencias_estoque, transferencia_itens, comanda_itens, pedidos, pedido_itens, vendas, venda_itens, venda_item_complementos, venda_pagamentos, contas_receber_pagamentos e despesa_pagamentos.

Essas entidades fazem parte da modelagem V3 e serão criadas no banco novo. Não são etapas de migração 1:1 da V2.
