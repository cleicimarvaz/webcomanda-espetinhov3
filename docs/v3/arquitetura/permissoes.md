# Modelo de papéis e permissões da V3

## Objetivo

Substituir o modelo atual baseado principalmente em `nivel` no cliente por autorização granular e verificável no backend/banco.

## Princípio

Autenticação responde:

`Quem é você?`

Autorização responde:

`O que você pode fazer neste contexto?`

A interface pode esconder ou mostrar controles, mas a decisão final deve ser feita no servidor/banco.

## Papel

Um papel representa um conjunto de permissões reutilizável.

Exemplos conceituais para a evolução do sistema:

- administrador;
- gestor;
- operador de caixa;
- atendimento/vendas;
- cozinha;
- financeiro;
- eventos;
- consulta/relatórios.

Esses nomes são referências de modelagem. A lista definitiva deve ser definida de acordo com as funções reais de cada operação.

## Permissão

Uma permissão deve representar uma ação específica.

Modelo conceitual:

`módulo.recurso.ação`

Exemplos:

- `vendas.venda.criar`;
- `vendas.venda.estornar`;
- `comandas.comanda.fechar`;
- `estoque.movimentacao.criar`;
- `caixa.caixa.abrir`;
- `caixa.caixa.fechar`;
- `financeiro.despesa.editar`;
- `usuarios.usuario.gerenciar`;
- `eventos.ingresso.validar`;
- `relatorios.financeiro.visualizar`.

## Estrutura recomendada

`usuarios`
→ `usuario_papeis`
→ `papeis`
→ `papel_permissoes`
→ `permissoes`

Quando houver contexto por unidade:

`usuario_papel` → `unidade`

Isso permite que um usuário tenha permissões diferentes em unidades diferentes.

## Permissões administrativas

Ações críticas, como estorno, fechamento de caixa, alteração de usuários, restauração de backup e operações financeiras sensíveis, devem exigir permissões específicas.

Uma confirmação visual ou senha adicional pode fazer parte do fluxo, mas não substitui a autorização do backend.

## Interface

A V3 poderá manter `aplicarPermissoesUI()` ou substituí-la por um mecanismo equivalente para experiência do usuário.

Porém, essa camada deve ser tratada como UX, nunca como mecanismo de segurança.

## Auditoria

Permissões sensíveis devem gerar eventos de auditoria com usuário, empresa, unidade, ação e registro afetado.

## Migração do modelo atual

O campo `nivel` existente pode ser usado temporariamente como origem para uma tabela de papéis.

Exemplo conceitual:

`ADMIN` → papel administrativo inicial

`VENDEDOR` → papel operacional inicial

Depois, as permissões podem ser detalhadas sem depender de novos valores dentro de uma coluna única.

## Critérios de aceitação

- nenhuma autorização crítica depende somente de `localStorage`;
- cada ação sensível possui uma permissão identificável;
- o usuário só acessa unidades vinculadas;
- RLS considera o contexto organizacional;
- alterações de permissão ficam auditadas;
- uma chamada direta à API não consegue contornar as permissões da interface.