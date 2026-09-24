# Revisão 06 — Modelo relacional final após o fechamento das decisões

**Data:** 2026-09-24  
**Base:** ADR-004 + revisões 01 a 05

## Objetivo

Verificar se o modelo relacional existente suporta as decisões funcionais fechadas e registrar os ajustes necessários antes do SQL definitivo.

## 1. Organização

Mantido:

- empresa 1:N unidade;
- usuário N:N organização via membros;
- produtos, clientes e fornecedores no escopo da empresa;
- estoque por produto/unidade;
- despesas e eventos com unidade opcional;
- metas consolidadas e por unidade.

### Ajuste

Metas precisam de unicidade por período e escopo:

- uma meta empresarial por mês/ano;
- uma meta por unidade por mês/ano.

## 2. Catálogo

### Ajustes necessários

`produto_precos` deve representar:

- preço padrão da empresa;
- sobrescrita por unidade.

A identificação lógica deve impedir duas vigências conflitantes para o mesmo produto/unidade.

Como um produto pode possuir vários códigos de barras, o modelo deve separar isso em:

`produto_codigos_barras`

Relação:

`PRODUTO 1:N PRODUTO_CODIGOS_BARRAS`

SKU continua opcional e único na empresa quando informado.

Produto também deve possuir:

- unidade de medida;
- indicador de fracionamento;
- estratégia de estoque;
- indicador de produto composto.

## 3. Estoque

### Mantido

`PRODUTO 1:N ESTOQUE_PRODUTO_UNIDADE N:1 UNIDADE`

### Ajustes

Transferência passa a representar explicitamente:

`TRANSFERENCIA_ESTOQUE 1:N TRANSFERENCIA_ITENS`

Estados:

`SOLICITADA/ENVIADA → EM_TRANSITO → RECEBIDA`

O estoque da origem é baixado no envio. O estoque do destino é aumentado no recebimento.

Cancelamento antes do recebimento gera operação compensatória.

Inventário:

`INVENTARIO 1:N INVENTARIO_ITENS`

Apenas um inventário ativo por unidade.

## 4. Atendimento

Não haverá uma entidade obrigatória de `mesas` no atendimento comum na primeira entrega.

A mesa/comanda será identificada pelo campo visível da própria comanda, com unicidade apenas enquanto houver uma sessão ativa na unidade.

O histórico usa o identificador interno da sessão.

A reabertura cria nova sessão relacionada à anterior.

Portanto:

`UNIDADE 1:N COMANDAS`

e a unicidade do identificador visível é uma regra de estado, não uma chave histórica.

## 5. Pedidos e cozinha

Mantido:

`COMANDA 1:N COMANDA_ITENS`
`COMANDA 1:N PEDIDOS`
`PEDIDO 1:N PEDIDO_ITENS`

Cada item operacional deve possuir identidade própria.

## 6. Vendas e pagamentos

Mantido:

`VENDA 1:N VENDA_ITENS`
`VENDA 1:N VENDA_PAGAMENTOS`

Uma venda pode ser:

- balcão;
- fechamento de comanda;
- venda de ingresso;
- fiado;
- venda mista.

Pagamento imediato fica associado ao caixa operacional da unidade.

Venda exclusivamente FIADO pode existir sem entrada no caixa.

## 7. Contas a receber

A conta mantém a unidade de origem.

Os recebimentos precisam registrar a unidade e caixa **onde o recebimento ocorreu**, pois uma conta pode ser recebida em outra unidade da mesma empresa.

Assim:

`CONTA_RECEBER 1:N CONTAS_RECEBER_PAGAMENTOS`

e cada recebimento referencia a sessão de caixa local, quando aplicável.

## 8. Despesas

Mantido:

`DESPESA → EMPRESA`
`DESPESA → UNIDADE (opcional)`

`DESPESA 1:N DESPESA_PAGAMENTOS`

Depois do pagamento, a alteração financeira ocorre somente por nova operação de correção/estorno.

## 9. Caixa

Mantido:

`UNIDADE 1:N CAIXAS`
`CAIXA 1:N MOVIMENTACOES_CAIXA`

Constraint lógica:

- no máximo um caixa aberto por unidade.

Fechamento registra valor esperado, contado, diferença e justificativa quando necessária.

## 10. Eventos e reservas

### Evento

`EMPRESA 1:N EVENTOS`
`UNIDADE 1:N EVENTOS` opcional.

### Mesas

`EVENTO 1:N EVENTO_MESAS`

Número único dentro do evento.

Preço específico de mesa deve ser suportado.

### Reserva

`RESERVA_EVENTO N:N EVENTO_MESAS` via `RESERVA_MESAS`

A reserva registra valor congelado. Quando houver preço diferente por mesa, `RESERVA_MESAS` deve conseguir preservar o valor aplicado.

Reserva pendente expira após prazo configurável do evento, com padrão de 30 minutos.

## 11. Ingressos

Aqui existe o principal ajuste em relação ao modelo anterior.

A decisão final é **tipo + lote**.

Nova estrutura:

`EVENTO 1:N TIPOS_INGRESSO`
`TIPO_INGRESSO 1:N LOTES_INGRESSO`
`LOTE_INGRESSO 1:N INGRESSOS`

O lote concentra:

- preço;
- limite;
- janela de vendas;
- status.

Limite geral do evento, quando configurado, também precisa ser validado transacionalmente.

### Solicitação pública

Quando habilitada:

`SOLICITACAO_INGRESSO 1:N SOLICITACAO_INGRESSO_ITENS`

A solicitação antecede a venda/emissão.

### Transferência de ingresso

Como a V3 preservará titular anterior, deve existir histórico explícito:

`INGRESSO 1:N TRANSFERENCIAS_INGRESSO`

O ingresso mantém o código individual e não previsível.

### Reentrada

A entrada e reentrada ficam registradas em `VALIDACOES_INGRESSO`.

O evento deverá guardar as regras de reentrada, como habilitação e limite.

### Portarias

Para múltiplas portarias/dispositivos, prever:

`EVENTO 1:N PORTARIAS_EVENTO`

e identificação de dispositivo nas tentativas de validação.

Na primeira entrega a validação é online.

## 12. Patrocinadores

Mantido:

`EVENTO N:N PATROCINADORES` via `EVENTO_PATROCINADORES`

O vínculo suporta cota/valor, posição, período, material e observações.

## 13. Arquivos

Como a política fechada exige rastreabilidade de metadados e distinção entre público/privado, recomenda-se uma entidade genérica:

`ARQUIVOS`

Relacionando arquivo a uma entidade de origem e mantendo:

- bucket;
- caminho/chave;
- tipo;
- tamanho;
- visibilidade;
- usuário;
- datas;
- status.

Arquivos não devem ser apagados automaticamente apenas por perder referência.

## 14. Impressão

Como a decisão final exige histórico de impressão, deve existir uma entidade própria, por exemplo:

`IMPRESSOES`

com:

- operação de origem;
- documento;
- dispositivo;
- adaptador;
- tentativa;
- resultado;
- erro;
- data/hora;
- referência de reimpressão.

Reimpressão não gera nova operação comercial.

## 15. Relatórios

Não criar tabelas para repetir fatos financeiros apenas por causa dos relatórios.

Views e agregações podem ser adicionadas posteriormente para desempenho.

## 16. Lista consolidada de entidades

### Núcleo
`empresas`, `unidades`, `usuarios`, `membros_organizacao`, `papeis`, `permissoes`, `papel_permissoes`, `auditoria`

### Catálogo
`categorias_produto`, `produtos`, `produto_precos`, `historico_precos`, `produto_codigos_barras`, `produto_composicao`, `grupos_complemento`, `complementos`, `produto_complementos`

### Estoque
`estoque_produto_unidade`, `estoque_movimentacoes`, `inventarios`, `inventario_itens`, `transferencias_estoque`, `transferencia_itens`

### Atendimento
`comandas`, `comanda_itens`, `pedidos`, `pedido_itens`

### Vendas
`vendas`, `venda_itens`, `venda_item_complementos`, `venda_pagamentos`

### Financeiro
`caixas`, `movimentacoes_caixa`, `contas_receber`, `contas_receber_pagamentos`, `despesas`, `despesa_pagamentos`, `metas_faturamento`

### Eventos
`eventos`, `evento_mesas`, `reservas_evento`, `reserva_mesas`, `patrocinadores`, `evento_patrocinadores`, `tipos_ingresso`, `lotes_ingresso`, `ingressos`, `transferencias_ingresso`, `validacoes_ingresso`, `portarias_evento`, `solicitacoes_ingresso`, `solicitacao_ingresso_itens`

### Transversal
`configuracoes_sistema`, `arquivos`, `impressoes`

## 17. Resultado da revisão

O modelo anterior **não estava totalmente fechado** após o ADR-004. Foram identificados quatro pontos que precisavam ser refletidos estruturalmente:

1. tipo + lote de ingresso;
2. histórico de transferência de ingresso;
3. múltiplas portarias;
4. histórico de impressão.

Também foram explicitados:

- múltiplos códigos de barras;
- recebimento de conta em outra unidade;
- preço por mesa na reserva;
- arquivos com metadados;
- ausência de entidade formal de mesa no atendimento comum.

Esses ajustes passam a ser a referência para a próxima consolidação do modelo relacional e do SQL.

## Próxima etapa

Revisar os documentos de modelo funcional, casos de uso, regras críticas e contratos para garantir que todos usem estas entidades e regras antes do SQL definitivo.
