# Mapeamento de chaves organizacionais

Este documento transforma o escopo organizacional das 21 tabelas atuais em uma estratégia concreta de chaves para a V3. A proposta é usada para preparar migrations e RLS; ela ainda não altera o schema atual.

## Tipos de vínculo

- **Direto empresa** — a tabela recebe `empresa_id`.
- **Direto unidade** — a tabela recebe `unidade_id` e, quando útil para consultas/RLS, pode manter também `empresa_id`.
- **Herdado** — o contexto vem de uma FK já existente.
- **Escopo misto** — a entidade precisa suportar mais de um nível.
- **Identidade** — a tabela pertence ao sistema de autenticação/perfis.

## Tabela por tabela

| Tabela atual | Estratégia V3 | Chave/contexto proposto | Observação de migração |
|---|---|---|---|
| `usuarios` | Identidade | `auth_user_id` | Remover dependência de `senha` como autenticação; empresa/unidade ficam no vínculo. |
| `auditoria` | Contexto do evento | `usuario_id`, `empresa_id`, `unidade_id` nullable | Eventos técnicos podem não ter unidade. |
| `fornecedores` | Direto empresa | `empresa_id` | Cadastro compartilhado entre unidades por padrão. |
| `clientes` | Direto empresa | `empresa_id` | Operações continuam identificando a unidade onde ocorreram. |
| `produtos` | Direto empresa | `empresa_id` | Estoque não deve ficar implícito no cadastro do produto. |
| `produto_composicao` | Herdado | `combo_id`/`componente_id` | Contexto pode ser obtido pelos produtos; evitar duplicação sem necessidade. |
| `historico_precos` | Escopo de preço | `produto_id` + possível `unidade_id` | Depende da decisão sobre preços diferentes por unidade. |
| `inventarios` | Direto unidade | `unidade_id`, `usuario_id` | Cada inventário representa uma contagem física local. |
| `estoque_movimentacoes` | Direto unidade ou herdado | `unidade_id`, `produto_id`, `inventario_id` | Recomenda-se explicitar a unidade para RLS e auditoria. |
| `complementos` | Direto empresa | `empresa_id` | Disponibilidade por unidade pode ser adicionada posteriormente. |
| `caixa` | Direto unidade | `unidade_id`, `aberto_por`/`usuario_id` | Usuário deve ser FK, não apenas texto. |
| `movimentacoes_caixa` | Herdado | `id_caixa` → `caixa.unidade_id` | Não precisa repetir `unidade_id` se a performance/RLS não exigir. |
| `comandas` | Direto unidade | `unidade_id`, `aberta_por`/`usuario_id` | `vendedor` deve evoluir para identidade relacional. |
| `historico_vendas` | Direto unidade | `unidade_id`, `usuario_id`, `id_caixa`, `comanda_id` | Principal registro comercial; deve participar das transações. |
| `despesas` | Escopo empresa/unidade | `empresa_id`, possível `unidade_id`, `usuario_id` | Permite despesas corporativas sem forçar uma unidade. |
| `contas_receber` | Direto unidade + cliente | `unidade_id`, `cliente_id`, `venda_id` | Contexto de unidade vem da venda, mas pode ser gravado para consulta/RLS. |
| `metas_faturamento` | Escopo misto | `empresa_id`, `unidade_id` nullable | Uma linha pode representar meta empresarial ou de unidade. |
| `configuracoes_sistema` | Escopo misto | substituir por estruturas por escopo | Separar configuração global, empresa, unidade e usuário/dispositivo. |
| `eventos` | Escopo misto | `empresa_id`, `unidade_id` nullable | Deve permitir evento ligado a unidade ou à empresa. |
| `reservas_evento` | Herdado | `evento_id` → contexto do evento | Não precisa duplicar contexto inicialmente. |
| `tipos_ingresso` | Herdado | `evento_id` → contexto do evento | Herda empresa/unidade do evento. |
| `ingressos` | Herdado | `evento_id`/`tipo_ingresso_id` → contexto do evento | Validação precisa respeitar o contexto do evento. |

## Quando duplicar `empresa_id` e `unidade_id`

A V3 não deve adicionar as duas chaves em todas as tabelas automaticamente.

Use apenas `unidade_id` quando:

- a entidade sempre pertence a uma unidade;
- a unidade determina de forma inequívoca a empresa;
- o relacionamento é simples e confiável.

Use `empresa_id` e `unidade_id` quando:

- a entidade pode ser empresarial ou por unidade;
- RLS e consultas precisam verificar o escopo diretamente;
- a entidade pode existir sem unidade.

Use somente `empresa_id` quando:

- o dado é compartilhado entre unidades;
- a unidade não altera a identidade da entidade.

## FKs de identidade

Os campos atuais como `usuario`, `vendedor`, `atendente`, `criado_por`, `cadastrado_por`, `autorizado_por` e `validado_por` são candidatos à migração para FKs como `usuario_id`.

A migração pode manter temporariamente os campos textuais para compatibilidade e reconstrução histórica, mas os novos fluxos devem preferir IDs estáveis.

## Produtos, preços e estoque

Há uma separação importante:

`produto` = catálogo

`preço` = regra comercial

`estoque` = posição física por unidade

`movimentação` = evento de estoque

Isso indica que a V3 não deve simplesmente copiar `estoque_atual` para cada unidade. O saldo precisa ser derivado ou mantido por uma estrutura própria por unidade.

Uma direção futura possível é:

`produtos` → `precos_produto`

`produtos` → `estoques_produto_unidade` → `estoque_movimentacoes`.

Essa estrutura será detalhada depois da decisão sobre preço compartilhado x preço por unidade.

## Vendas e caixa

O fluxo deve manter o contexto organizacional de ponta a ponta:

`unidade` → `caixa` → `comanda/venda` → `movimentações financeiras`.

Uma venda não deve poder apontar para uma comanda ou caixa de outra unidade.

## Eventos

Para eventos:

`empresa` → `evento` → `reservas / tipos de ingresso / ingressos`.

Quando houver uma unidade física associada, `evento.unidade_id` determina o contexto operacional.

## Configurações

`configuracoes_sistema` é o ponto que mais precisa de remodelagem.

A V3 deve evitar uma tabela única misturando:

- nome da loja;
- CNPJ;
- layout de ticket;
- ordem de categorias;
- preferências pessoais;
- configurações de dispositivo.

Esses dados devem ser separados por escopo e responsabilidade.

## Resultado para o RLS

Com esse desenho, as policies podem consultar uma estrutura de vínculo estável.

Exemplo de regra:

`registro.unidade_id` pertence a uma unidade cujo acesso está presente em `membros_organizacao` para o usuário autenticado.

Para registros empresariais:

`registro.empresa_id` pertence a uma empresa com vínculo ativo.

Para registros herdados, a policy segue a FK até o evento/caixa/unidade correspondente.

## Próxima etapa

Antes de escrever a primeira migration, validar as decisões ainda abertas de:

1. preço por unidade;
2. cliente/fornecedor compartilhado;
3. despesas corporativas;
4. metas por empresa/unidade;
5. escopo dos eventos;
6. configuração por escopo;
7. estratégia de estoque por unidade.