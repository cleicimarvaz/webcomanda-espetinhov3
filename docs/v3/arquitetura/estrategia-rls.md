# Estratégia de RLS da V3

## Objetivo

Fazer com que a autorização de dados seja garantida pelo banco e não apenas pelos filtros da interface.

## Princípio

A decisão deve seguir a cadeia:

`identidade` → `vínculo organizacional` → `papel/permissão` → `registro`.

Uma alteração em `localStorage`, URL ou código do navegador não deve ser suficiente para obter dados de outra empresa ou unidade.

## Contexto mínimo

Para as operações autenticadas, o banco precisa conseguir identificar:

- usuário autenticado;
- empresa autorizada;
- unidade autorizada;
- papel/permissões aplicáveis.

## Políticas por tipo de dado

### Dados de empresa

Exemplo: produtos, clientes e fornecedores, conforme decisão de escopo.

Regra conceitual:

`empresa_id do registro` pertence a uma empresa na qual o usuário possui vínculo ativo.

### Dados de unidade

Exemplo: caixa, comandas, inventários, estoque e vendas.

Regra conceitual:

`unidade_id do registro` pertence a uma unidade na qual o usuário possui vínculo ativo.

### Dados derivados

Exemplo: movimentações de caixa e reservas de evento.

Quando o registro possui uma relação forte com outra entidade, a policy pode verificar o contexto através dessa relação.

Exemplo conceitual:

`movimentacao_caixa` → `caixa` → `unidade` → `empresa`.

### Dados públicos

Fluxos públicos, como consulta de um evento ou solicitação de ingresso, devem ter policies ou funções específicas que exponham somente os dados necessários.

O fluxo público não deve receber acesso administrativo às mesmas operações de usuários autenticados.

## INSERT

Para inserções, não basta verificar se o usuário pode ler um contexto. O banco deve verificar que o novo registro está sendo criado dentro de uma empresa/unidade autorizada.

Quando apropriado, `empresa_id` e `unidade_id` devem ser obtidos do contexto seguro ou validados contra o vínculo do usuário.

## UPDATE

A atualização deve validar tanto:

1. se o registro atual é acessível;
2. se o novo estado continua dentro do contexto permitido.

Isso evita mover um registro de uma unidade para outra apenas alterando um `unidade_id`.

## DELETE

Exclusões devem ser mais restritas do que simples leitura.

Operações financeiras e históricas importantes podem precisar ser canceladas/estornadas em vez de apagadas.

## Permissões de negócio

RLS deve proteger o escopo dos dados. Permissões de negócio devem proteger ações específicas.

Exemplo:

`RLS` garante que o usuário só enxergue o caixa da unidade autorizada.

`permissão caixa.caixa.fechar` define se ele pode executar o fechamento.

As duas camadas são complementares.

## Auditoria

Ações administrativas e mudanças sensíveis devem registrar o contexto organizacional e a identidade do ator.

## Implantação gradual

O RLS não deve ser ativado sobre a produção atual de uma vez.

Sequência recomendada:

1. modelar vínculos;
2. criar ambiente de teste;
3. criar policies de leitura;
4. validar inserts e updates;
5. testar chamadas diretas à API;
6. migrar operações críticas;
7. validar público x autenticado;
8. habilitar para os domínios migrados;
9. remover caminhos legados.

## Critérios de segurança

- usuário sem vínculo não acessa dados da empresa;
- usuário de uma unidade não acessa dados de outra;
- alteração de contexto no cliente não amplia acesso;
- inserts não podem criar registros em unidade não autorizada;
- updates não podem mover registros entre contextos sem autorização;
- ações administrativas exigem permissão correspondente;
- fluxos públicos só expõem o necessário.