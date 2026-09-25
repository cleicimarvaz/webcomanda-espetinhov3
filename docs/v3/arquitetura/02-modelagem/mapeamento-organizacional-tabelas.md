# Mapeamento organizacional das tabelas — referência histórica

> Este documento foi produzido durante a fase inicial de modelagem. As decisões que apareciam como abertas já foram fechadas no ADR-004. Para o estado atual, consulte o [modelo relacional canônico](modelo-relacional-completo-v3.md).


## Legenda

- **Global** — pertence à aplicação e não depende de empresa/unidade.
- **Empresa** — compartilhado entre as unidades de uma empresa.
- **Unidade** — pertence diretamente a uma unidade operacional.
- **Relacionado** — herda o contexto de outra entidade, por exemplo evento ou usuário.
- **Público controlado** — possui uma parte do fluxo acessível sem autenticação, mas não deve ficar livremente exposto.
- **Histórico** — classificação mantida por rastreabilidade; quando houver conflito, prevalece o modelo relacional canônico e o ADR-004.

## Mapa das 21 tabelas

| Tabela atual | Contexto alvo | Justificativa / observação |
|---|---|---|
| `usuarios` | Global/identidade | A identidade deve existir uma vez. O acesso a empresas/unidades deve ficar em vínculos próprios. |
| `auditoria` | Empresa + unidade, quando aplicável | O evento precisa registrar o contexto da operação. Eventos puramente técnicos podem não ter unidade. |
| `fornecedores` | Empresa | Cadastro compartilhado pelas unidades da mesma empresa. |
| `clientes` | Empresa | Cliente tende a ser cadastro compartilhado. As operações financeiras/vendas carregam o contexto da unidade. |
| `produtos` | Empresa | Catálogo pode ser compartilhado entre unidades. Disponibilidade e estoque devem ser tratados separadamente. |
| `produto_composicao` | Empresa | A composição pertence ao produto/combinação do catálogo. |
| `historico_precos` | Empresa/unidade | Registra preço padrão da empresa e sobrescritas por unidade, conforme o modelo canônico. |
| `inventarios` | Unidade | Inventário representa uma contagem física realizada em uma unidade específica. |
| `estoque_movimentacoes` | Unidade | Entrada, saída e ajuste representam movimentação física de uma unidade. |
| `complementos` | Empresa | Cadastros de complementos podem ser compartilhados; disponibilidade por unidade pode ser adicionada se necessário. |
| `caixa` | Unidade | Cada caixa pertence a uma unidade e representa uma operação física/local. |
| `movimentacoes_caixa` | Unidade, via `caixa` | Deve herdar o contexto da unidade do caixa. |
| `comandas` | Unidade | Mesa/comanda é uma operação do estabelecimento. |
| `historico_vendas` | Unidade | A venda precisa ficar vinculada à unidade que realizou a operação. |
| `despesas` | Unidade, com exceção de despesas corporativas | Despesas operacionais pertencem à unidade; despesas corporativas podem exigir escopo de empresa. |
| `contas_receber` | Unidade + cliente | A conta nasce de uma operação comercial, portanto precisa manter o contexto da unidade, mas referencia um cliente compartilhado. |
| `metas_faturamento` | Empresa ou unidade | Pode haver meta global e metas por unidade; o modelo final deve explicitar o escopo da meta. |
| `configuracoes_sistema` | Misturado | Deve ser dividido por escopo: global, empresa, unidade e preferência do usuário. |
| `eventos` | Unidade ou empresa | Eventos presenciais normalmente pertencem a uma unidade, mas a empresa pode ter eventos fora da unidade. O escopo precisa ser explícito. |
| `reservas_evento` | Relacionado a `eventos` | Herda o contexto organizacional do evento. |
| `tipos_ingresso` | Relacionado a `eventos` | Herda o contexto do evento. |
| `ingressos` | Relacionado a `eventos` | Herda o contexto do evento e do tipo de ingresso. |

## Agrupamento recomendado

### Identidade

`usuarios`

Infraestrutura organizacional adicional esperada:

- `empresas`;
- `unidades`;
- vínculo usuário/empresa;
- vínculo usuário/unidade;
- papéis;
- permissões.

### Cadastros compartilhados da empresa

`fornecedores`
`clientes`
`produtos`
`produto_composicao`
`complementos`

### Operação por unidade

`inventarios`
`estoque_movimentacoes`
`caixa`
`movimentacoes_caixa`
`comandas`
`historico_vendas`
`despesas`
`contas_receber`

### Configurações e metas

`metas_faturamento`
`configuracoes_sistema`

Essas estruturas precisam suportar mais de um escopo em vez de simplesmente receber o mesmo `unidade_id`.

### Eventos

`eventos`
`reservas_evento`
`tipos_ingresso`
`ingressos`

Os registros derivados devem herdar o contexto do evento sempre que possível.

### Auditoria

`auditoria` é transversal e deve poder registrar tanto contexto organizacional quanto operações técnicas.

## Consequências para o RLS

O RLS não deve repetir regras diferentes em cada tabela sem uma estratégia comum.

Direção conceitual:

`usuário autenticado`
→ `vínculos organizacionais`
→ `empresa/unidade autorizada`
→ `registro acessível`.

Para tabelas relacionadas, o acesso deve ser derivado por relacionamento.

Exemplo:

`ingressos` → `tipos_ingresso` → `eventos` → `unidade/empresa`.

Assim, o ingresso não precisa necessariamente duplicar todos os dados de contexto se a relação já permitir determinar sua organização.

## Dados públicos

`eventos`, `tipos_ingresso` e o fluxo público de solicitação de ingressos exigem uma política própria.

O fato de o usuário público poder consultar um evento não significa que ele deva poder consultar todas as colunas da tabela ou executar diretamente qualquer `insert/update`.

A V3 deve preferir uma consulta pública limitada ou um serviço/RPC específico para o fluxo público.

## Pontos que ainda precisam de decisão

1. Produto e preço são globais da empresa ou podem variar por unidade?
2. Clientes e fornecedores serão sempre compartilhados?
3. Despesas corporativas existirão separadas das despesas de unidade?
4. Metas serão por empresa, unidade ou ambas?
5. Eventos pertencem à empresa, à unidade ou podem ter ambos os escopos?
6. Configurações serão armazenadas em tabelas diferentes ou em uma estrutura com `scope_type`/`scope_id`?
7. Como uma empresa existente será migrada para a primeira unidade?

## Próximo passo

Antes de criar policies RLS definitivas, transformar este mapa em um modelo relacional com as novas entidades organizacionais e definir os escopos dos sete casos em aberto.