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

## Integração gradual com o módulo Produtos

O módulo `produtos.html` já carrega:

- `organizacao-service-v3.js`;
- `estoque-service-v3.js`;
- `estoque-adapter-v3.js`.

A integração do ajuste manual está protegida por uma feature flag local:

```js
localStorage.setItem('v3_estoque_transacional', 'true');
```

Com a flag desligada, `salvarMovimentacao()` continua usando o fluxo legado da V2.

Com a flag ligada, a operação deixa de atualizar `produtos.estoque_atual` e passa pelo serviço V3, que grava em `estoque_produto_unidade` e `estoque_movimentacoes` por meio da RPC.

Para desligar novamente:

```js
localStorage.removeItem('v3_estoque_transacional');
```

A feature flag deve ser usada somente depois que as migrations correspondentes estiverem aplicadas no banco de desenvolvimento.
