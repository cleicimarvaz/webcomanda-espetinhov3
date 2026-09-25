# Modelo relacional completo — V3

**Status:** referência canônica da modelagem relacional
**Revisão:** 07 — consolidação após fechamento das decisões de negócio
**Data:** 2026-09-25

Este documento é o modelo relacional de referência da V3, imediatamente anterior ao SQL físico.

Ele consolida o ADR-004 e a Revisão 06. Os nomes abaixo são nomes conceituais de entidades; tipos de dados, constraints físicas, índices, triggers, funções, RLS e Storage serão definidos na etapa de SQL.

---

## 1. Núcleo organizacional

### Entidades

- EMPRESAS
- UNIDADES
- USUARIOS
- MEMBROS_ORGANIZACAO
- PAPEIS
- PERMISSOES
- PAPEL_PERMISSOES
- AUDITORIA

### Relações

EMPRESA 1:N UNIDADE

USUARIO 1:N MEMBRO_ORGANIZACAO N:1 EMPRESA
Membro pode ter UNIDADE opcional e PAPEL obrigatório.

PAPEL N:N PERMISSAO via PAPEL_PERMISSOES

EMPRESA 1:N AUDITORIA
UNIDADE 0:N AUDITORIA
USUARIO 0:N AUDITORIA

Regra: vínculo com unidade nula representa escopo empresarial. A autorização efetiva depende do vínculo e das permissões.

## 2. Catálogo

### Entidades

- CATEGORIAS_PRODUTO
- PRODUTOS
- PRODUTO_PRECOS
- HISTORICO_PRECOS
- PRODUTO_CODIGOS_BARRAS
- PRODUTO_COMPOSICAO
- GRUPOS_COMPLEMENTO
- COMPLEMENTOS
- PRODUTO_COMPLEMENTOS

### Relações

EMPRESA 1:N CATEGORIAS_PRODUTO
EMPRESA 1:N PRODUTOS
PRODUTO 1:N PRODUTO_PRECOS
PRODUTO 1:N HISTORICO_PRECOS
PRODUTO 1:N PRODUTO_CODIGOS_BARRAS
PRODUTO 1:N PRODUTO_COMPOSICAO
PRODUTO_COMPOSICAO N:1 PRODUTO como componente
GRUPO_COMPLEMENTO 1:N COMPLEMENTOS
PRODUTO N:N COMPLEMENTO via PRODUTO_COMPLEMENTOS

Preço padrão usa unidade nula. Preço específico informa a unidade. Vigências não podem se sobrepor no mesmo escopo.

SKU e código de barras são opcionais e únicos dentro da empresa.

Produto possui unidade de medida, indicador de fracionamento, controle de estoque, estoque mínimo, estratégia de estoque e indicação de produto composto.

## 3. Estoque

### Entidades

- ESTOQUE_PRODUTO_UNIDADE
- ESTOQUE_MOVIMENTACOES
- INVENTARIOS
- INVENTARIO_ITENS
- TRANSFERENCIAS_ESTOQUE
- TRANSFERENCIA_ITENS

### Relações

PRODUTO 1:N ESTOQUE_PRODUTO_UNIDADE N:1 UNIDADE
ESTOQUE_PRODUTO_UNIDADE 1:N ESTOQUE_MOVIMENTACOES
INVENTARIO 1:N INVENTARIO_ITENS
TRANSFERENCIA_ESTOQUE 1:N TRANSFERENCIA_ITENS
TRANSFERENCIA_ESTOQUE possui UNIDADE_ORIGEM e UNIDADE_DESTINO.

Saldo oficial: PRODUTO + UNIDADE.
PRODUTOS.ESTOQUE_ATUAL não é fonte de verdade.

### Composição

COMPONENTES: baixa componentes.
PROPRIO: baixa o próprio produto.
Produto composto não pode usar outro produto composto como componente.

### Saldo negativo

Saída acima do saldo é bloqueada por padrão. Exceção administrativa exige permissão específica, justificativa e auditoria.

### Transferência

Ciclo: SOLICITADA/ENVIADA → EM_TRANSITO → RECEBIDA.
Envio reduz a origem. Recebimento aumenta o destino. Cancelamento antes do recebimento gera operação compensatória.

### Inventário

Ciclo: RASCUNHO → CONTANDO → AGUARDANDO_CONCLUSAO → CONCLUIDO.
Estado alternativo: CANCELADO.
No máximo um inventário ativo por unidade.
Conclusão usa o saldo efetivo protegido pelo servidor. Movimentações posteriores à contagem permanecem no histórico.

## 4. Atendimento e cozinha

### Entidades

- COMANDAS
- COMANDA_ITENS
- PEDIDOS
- PEDIDO_ITENS

### Relações

UNIDADE 1:N COMANDAS
COMANDA 1:N COMANDA_ITENS
COMANDA 1:N PEDIDOS
PEDIDO 1:N PEDIDO_ITENS
PEDIDO_ITEM N:1 COMANDA_ITEM quando houver rastreio individual.

Não existe cadastro formal de mesas no atendimento comum da primeira entrega.
A identificação visível é atributo da sessão de comanda e é única apenas enquanto a sessão estiver ativa na unidade.
Após o fechamento, o número pode ser reutilizado. O ID interno da sessão preserva a identidade histórica.

Ciclo: ABERTA → EM_ATENDIMENTO → PRONTA_PARA_FECHAMENTO → FECHADA. Alternativo: CANCELADA.

Reabertura cria nova sessão relacionada à anterior.

Pedidos possuem identidade própria e preservam o histórico da cozinha. O estado da cozinha não decide sozinho o efeito financeiro.

## 5. Vendas

### Entidades

- VENDAS
- VENDA_ITENS
- VENDA_ITEM_COMPLEMENTOS
- VENDA_PAGAMENTOS

### Relações

COMANDA 0:1 VENDA como venda final da sessão.
VENDA 1:N VENDA_ITENS
VENDA_ITEM 1:N VENDA_ITEM_COMPLEMENTOS
VENDA 1:N VENDA_PAGAMENTOS
VENDA N:1 CLIENTE opcional
VENDA N:1 CAIXA quando houver pagamento imediato.

Uma venda pode ser balcão, fechamento de comanda, venda de ingresso ou fiado.

Pagamento imediato exige caixa aberto na unidade.
Venda exclusivamente FIADO pode ser concluída sem entrada imediata no caixa e gera conta a receber.

Uma venda pode possuir vários pagamentos. Preço, desconto, total e operação devem ficar registrados no contexto da venda.

## 6. Caixa

### Entidades

- CAIXAS
- MOVIMENTACOES_CAIXA

UNIDADE 1:N CAIXAS
CAIXA 1:N MOVIMENTACOES_CAIXA

No máximo um caixa aberto por unidade.

Fechamento registra valor inicial, entradas, saídas, valor esperado, valor contado, diferença, justificativa quando necessária, responsável e data/hora.

Caixa fechado não é reaberto.

## 7. Contas a receber

### Entidades

- CONTAS_RECEBER
- CONTAS_RECEBER_PAGAMENTOS

EMPRESA 1:N CONTAS_RECEBER
CLIENTE 1:N CONTAS_RECEBER
UNIDADE 1:N CONTAS_RECEBER como unidade de origem
CONTA_RECEBER 1:N CONTAS_RECEBER_PAGAMENTOS
UNIDADE 1:N CONTAS_RECEBER_PAGAMENTOS como unidade do recebimento
CAIXA 0:N CONTAS_RECEBER_PAGAMENTOS

Uma conta pode ser recebida em outra unidade da mesma empresa.
O saldo é derivado do valor original menos os recebimentos.
Recebimento acima do saldo é bloqueado na primeira entrega.

## 8. Despesas e metas

### Despesas

- DESPESAS
- DESPESA_PAGAMENTOS

EMPRESA 1:N DESPESAS
UNIDADE 0:N DESPESAS
FORNECEDOR 0:N DESPESAS
DESPESA 1:N DESPESA_PAGAMENTOS
CAIXA 0:N DESPESA_PAGAMENTOS

Unidade nula significa despesa corporativa.
Pagamento parcial é permitido.
Correções financeiras usam operações próprias, não edição silenciosa.

### Metas

- METAS_FATURAMENTO

EMPRESA 1:N METAS_FATURAMENTO
UNIDADE 0:N METAS_FATURAMENTO

Permite uma meta consolidada e metas por unidade para o mesmo mês/ano.

## 9. Eventos e reservas

### Entidades

- EVENTOS
- EVENTO_MESAS
- RESERVAS_EVENTO
- RESERVA_MESAS
- PATROCINADORES
- EVENTO_PATROCINADORES

EMPRESA 1:N EVENTOS
UNIDADE 0:N EVENTOS
EVENTO 1:N EVENTO_MESAS
EVENTO 1:N RESERVAS_EVENTO
RESERVA_EVENTO N:N EVENTO_MESAS via RESERVA_MESAS
EMPRESA 1:N PATROCINADORES
EVENTO N:N PATROCINADOR via EVENTO_PATROCINADORES

Ciclo do evento: RASCUNHO → PUBLICADO → EM_OPERACAO → ENCERRADO. Alternativo: CANCELADO.

Número da mesa é único dentro do evento. Posição gráfica é opcional e não define disponibilidade.

Reserva: PENDENTE, CONFIRMADA, CANCELADA ou EXPIRADA.
Tipos: RESERVA, CORTESIA ou BLOQUEIO.
Retenção padrão de reserva pendente: 30 minutos, configurável por evento.
Valor praticado da reserva é congelado.

## 10. Ingressos

### Entidades

- TIPOS_INGRESSO
- LOTES_INGRESSO
- INGRESSOS
- TRANSFERENCIAS_INGRESSO
- VALIDACOES_INGRESSO
- PORTARIAS_EVENTO
- SOLICITACOES_INGRESSO
- SOLICITACAO_INGRESSO_ITENS

### Relações

EVENTO 1:N TIPOS_INGRESSO
TIPO_INGRESSO 1:N LOTES_INGRESSO
LOTE_INGRESSO 1:N INGRESSOS
VENDA 0:N INGRESSOS
INGRESSO 1:N TRANSFERENCIAS_INGRESSO
INGRESSO 1:N VALIDACOES_INGRESSO
EVENTO 1:N PORTARIAS_EVENTO
SOLICITACAO_INGRESSO 1:N SOLICITACAO_INGRESSO_ITENS
SOLICITACAO_INGRESSO N:1 EVENTO
SOLICITACAO_INGRESSO 0:1 VENDA

O lote controla preço, limite, início, fim e status.
Limites são protegidos transacionalmente.

Solicitação pública é opcional por evento. Solicitação pendente não é ingresso válido.

Ingresso possui código único e não previsível, comprador, valor praticado, venda de origem quando aplicável, status e datas.

Transferência é operação própria, preserva o histórico do titular e mantém o código.

Reentrada é proibida por padrão e pode ser habilitada por evento. Cada entrada/reentrada gera validação histórica.

Na primeira entrega, validação oficial exige conectividade com o serviço/banco.

## 11. Clientes e fornecedores

CLIENTES e FORNECEDORES pertencem à empresa.
Unidade da relação comercial é registrada nas operações, não no cadastro compartilhado.

## 12. Arquivos e Storage

### Entidade

- ARQUIVOS

ARQUIVOS guarda metadados e vínculo com o Storage.
Pode representar imagem de catálogo, material de evento, documento administrativo ou anexo de negócio.

Metadados mínimos: bucket, caminho, tipo, tamanho, visibilidade, usuário, datas e status.
Arquivos não são apagados automaticamente apenas por perder referência.

## 13. Impressão

### Entidade

- IMPRESSOES

IMPRESSAO referencia a operação de origem.
Registra tipo de documento, dispositivo, adaptador, tentativa, resultado, erro, data/hora e eventual reimpressão.
Reimpressão não cria nova venda, pagamento, ingresso ou movimento financeiro.

## 14. Configurações

- CONFIGURACOES_SISTEMA

Escopos: global, empresa, unidade, usuário e dispositivo.
Configurações de dispositivo nunca substituem fonte de verdade comercial, financeira ou de autorização.

## 15. Fontes de verdade

| Domínio | Fonte oficial |
|---|---|
| Produto | PRODUTOS |
| Preço praticado | VENDA_ITENS e operação de origem |
| Estoque | ESTOQUE_PRODUTO_UNIDADE |
| Histórico de estoque | ESTOQUE_MOVIMENTACOES |
| Inventário | INVENTARIOS + INVENTARIO_ITENS |
| Comanda | COMANDAS + COMANDA_ITENS |
| Cozinha | PEDIDOS + PEDIDO_ITENS |
| Venda | VENDAS + VENDA_ITENS + VENDA_PAGAMENTOS |
| Caixa | CAIXAS + MOVIMENTACOES_CAIXA |
| Contas a receber | CONTAS_RECEBER + CONTAS_RECEBER_PAGAMENTOS |
| Despesas | DESPESAS + DESPESA_PAGAMENTOS |
| Metas | METAS_FATURAMENTO |
| Evento | EVENTOS |
| Reserva | RESERVAS_EVENTO + RESERVA_MESAS |
| Ingresso | INGRESSOS + VALIDACOES_INGRESSO + TRANSFERENCIAS_INGRESSO |
| Arquivo | ARQUIVOS + Storage |
| Impressão | IMPRESSOES |
| Auditoria | AUDITORIA |

## 16. Escopo organizacional

| Entidade | Escopo |
|---|---|
| EMPRESAS | tenant |
| UNIDADES | empresa |
| USUARIOS | identidade |
| MEMBROS_ORGANIZACAO | empresa/unidade |
| PRODUTOS | empresa |
| CATEGORIAS_PRODUTO | empresa |
| CLIENTES | empresa |
| FORNECEDORES | empresa |
| PRODUTO_PRECOS | empresa/unidade |
| ESTOQUE_PRODUTO_UNIDADE | unidade |
| COMANDAS | unidade |
| PEDIDOS | unidade |
| VENDAS | unidade |
| CAIXAS | unidade |
| CONTAS_RECEBER | empresa + unidade de origem |
| CONTAS_RECEBER_PAGAMENTOS | empresa + unidade do recebimento |
| DESPESAS | empresa + unidade opcional |
| METAS_FATURAMENTO | empresa + unidade opcional |
| EVENTOS | empresa + unidade opcional |
| INGRESSOS | evento |
| AUDITORIA | empresa/unidade quando aplicável |
| ARQUIVOS | entidade/empresa conforme origem |
| IMPRESSOES | empresa/unidade quando aplicável |
| CONFIGURACOES_SISTEMA | escopo explícito |

## 17. Restrições essenciais para o SQL

1. Integridade entre empresa e unidade.
2. SKU único por empresa quando informado.
3. Código de barras único por empresa.
4. Preços sem sobreposição de vigência no mesmo escopo.
5. Composição sem produto composto como componente.
6. Saldo único por produto/unidade.
7. Toda alteração de saldo gera movimentação.
8. Um inventário ativo por unidade.
9. Um caixa aberto por unidade.
10. Caixa encerrado não recebe novos lançamentos.
11. Retry com a mesma operação não duplica venda.
12. Pagamento pertence à venda e ao contexto organizacional permitido.
13. Conta a receber mantém unidade de origem.
14. Recebimento pode ocorrer em outra unidade da mesma empresa.
15. Mesa de evento não pode estar em reservas ativas incompatíveis.
16. Número da mesa é único dentro do evento.
17. Limites de lote/evento são protegidos contra concorrência.
18. Código do ingresso é único e não previsível.
19. Validação não consome ingresso já utilizado.
20. Transferência de ingresso preserva histórico.
21. Reentrada respeita a regra do evento.
22. Arquivos de negócio não são removidos automaticamente por perda de referência.
23. Reimpressão não cria nova operação de negócio.
24. Operações críticas possuem operaçãoId para idempotência.
25. Auditoria crítica acompanha a operação transacional.

## 18. Decisões que fundamentam este modelo

- ADR-001 — Modelo organizacional.
- ADR-002 — Modelo relacional organizacional.
- ADR-003 — Banco V3 separado.
- ADR-004 — Fechamento das decisões de negócio.
- Revisões 01 a 05 — fechamento dos domínios.
- Revisão 06 — ajustes estruturais após o fechamento funcional.

## 19. Próximo estágio

Este documento é a referência funcional-relacional para o próximo passo: revisão de consistência final e consolidação do SQL físico.

O SQL deverá acrescentar tipos PostgreSQL, constraints, índices, funções, triggers, RLS, views, Storage, seeds e testes.

O banco V3 ainda não deve ser criado nesta etapa.