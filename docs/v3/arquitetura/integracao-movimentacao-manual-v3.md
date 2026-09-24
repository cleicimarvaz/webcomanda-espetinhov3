# Integração gradual — estoque manual e inventário

## Objetivo

Os fluxos de **Ajustar estoque** e **Importar Contagem** da tela de Produtos ganharam uma ponte para a arquitetura V3 sem remover o comportamento legado.

A troca é controlada por uma feature flag local e, portanto, não fica ativa por padrão.

## Fluxo atual

Com a flag desligada:

`produtos.js → Supabase → produtos.estoque_atual + estoque_movimentacoes`

Com a flag ligada:

`produtos.js → estoque-adapter-v3 → estoque-service-v3 → RPC → estoque_produto_unidade + estoque_movimentacoes`

No inventário:

`estoque-inventario.js → estoque-adapter-v3 → estoque-service-v3 → RPC → inventarios + estoque_produto_unidade + estoque_movimentacoes`

## Ativar no ambiente de desenvolvimento

Depois de aplicar e validar as migrations necessárias no banco de desenvolvimento, abrir o console do navegador na página de Produtos:

```js
localStorage.setItem('v3_estoque_transacional', 'true');
location.reload();
```

A partir daí, o ajuste manual e o inventário via planilha devem usar o caminho V3.

## Desativar

```js
localStorage.removeItem('v3_estoque_transacional');
location.reload();
```

O caminho legado volta a ser utilizado.

## Inventário via planilha

Com a flag ativa, a exportação da planilha usa o saldo da unidade selecionada. Na importação, a prévia também compara com o saldo da unidade, e a confirmação deixa o banco calcular novamente a diferença usando o saldo bloqueado no servidor.

Isso é importante para evitar que a planilha represente um saldo antigo no momento da confirmação.

## O que conferir

Ao executar uma entrada:

- o saldo da unidade deve aumentar;
- deve existir uma movimentação com `unidade_id`;
- `usuario_id` deve apontar para o usuário da sessão;
- `operacao_id` deve estar preenchido;
- `produtos.estoque_atual` não deve ser alterado pela operação V3.

Ao executar uma saída, conferir os mesmos pontos com o saldo reduzido.

## Cenário com múltiplas unidades

Quando o usuário tiver apenas uma unidade disponível, o serviço pode selecioná-la automaticamente.

Quando houver mais de uma unidade, a operação deve ser bloqueada até existir uma unidade selecionada.

Quando o vínculo tiver escopo empresarial (`unidade_id = NULL`), todas as unidades ativas daquela empresa ficam disponíveis para seleção.

## Falhas esperadas

A operação deve ser rejeitada quando:

- o usuário não tiver vínculo ativo com a unidade;
- o produto pertencer a outra empresa;
- o produto não controlar estoque;
- unidade ou usuário não forem informados;
- a RPC não existir no banco.

Quando a feature flag estiver ativa, uma falha no caminho V3 **não deve cair silenciosamente para o fluxo legado**, para evitar que o operador pense que a operação foi processada pela V3 quando não foi.

## Rollback da integração

O rollback imediato da aplicação é feito desligando a feature flag.

Isso não desfaz uma operação que já tenha sido registrada no modelo V3. Para desfazer dados de teste, usar os procedimentos de banco do ambiente de desenvolvimento.

## Estado

Esta integração é um primeiro piloto técnico.

Já cobre:
- movimentação manual de estoque;
- exportação de inventário por unidade;
- importação de contagem;
- conclusão transacional do inventário.

Ainda não foi aplicada à baixa automática das vendas/comandas.
