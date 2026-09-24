# Serviço V3 — Estoque

## Objetivo

`componentes/servicos/estoque-service-v3.js` é a primeira camada de serviço de aplicação criada para o domínio de estoque.

A ideia é tirar aos poucos os módulos da V2 de chamadas diretas ao Supabase.

Fluxo pretendido:

`Tela → Serviço → RPC → Banco`

## Operações disponíveis

### Entrada

`estoqueServiceV3.registrarEntrada({...})`

Usa a RPC:

`registrar_movimentacoes_estoque_v3`

### Saída

`estoqueServiceV3.registrarSaida({...})`

Usa a mesma RPC com tipo `saida`.

### Movimentação genérica

`estoqueServiceV3.registrarMovimentacoes({...})`

Permite informar explicitamente o tipo e vários itens.

### Inventário

`estoqueServiceV3.concluirInventario({...})`

Usa a RPC:

`concluir_inventario_v3`

## Contexto

Os métodos exigem explicitamente:

- `unidadeId`;
- `usuarioId`.

Isso é proposital.

O serviço não deve decidir autorização com base em `localStorage`, nome do usuário ou nível exibido na interface. Esses dados podem ser usados pela UI, mas a regra de acesso precisa ser validada no backend/RLS.

## Idempotência

O serviço gera `operacaoId` com `crypto.randomUUID()` quando o chamador não informa uma chave.

Quando uma operação precisa ser reenviada após timeout ou erro de comunicação, o mesmo `operacaoId` deve ser reutilizado.

Assim, o retry pode ser reconhecido pelo banco.

## Limites atuais

O serviço ainda não:

- substitui `salvarMovimentacao()` da V2;
- substitui `processarBaixaEstoqueAutomatica()`;
- altera `produtos.estoque_atual`;
- resolve seleção de unidade na interface;
- implementa RLS;
- controla permissões por código de permissão.

Esses pontos serão feitos em etapas separadas.

## Regra de migração

Não remover nem reescrever os módulos legados apenas porque o serviço novo existe.

Primeiro validamos:

- entrada;
- saída;
- inventário;
- concorrência;
- retry/idempotência;
- isolamento por unidade;
- auditoria;
- comportamento de erro.

Somente depois começamos a trocar os chamadores da V2.
