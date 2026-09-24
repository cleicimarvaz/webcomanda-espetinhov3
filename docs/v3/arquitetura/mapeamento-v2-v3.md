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
| tipos_ingresso | tipos_ingresso | fortalecer regras de limite/período |
| ingressos | ingressos + validacoes_ingresso | histórico de validação e consumo |
| patrocinadores em JSONB | patrocinadores + evento_patrocinadores | relação explícita |