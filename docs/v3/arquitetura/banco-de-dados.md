# Arquitetura de dados alvo da V3

Este documento descreve como o banco deverá evoluir. Não é o schema definitivo; ele serve como referência para a modelagem detalhada posterior.

## Princípios

- identidade relacional estável para usuários e registros;
- isolamento por empresa e unidade;
- integridade garantida pelo banco quando a regra for crítica;
- operações financeiras e estoque com transação;
- histórico/auditoria preservados;
- evitar duplicação de fontes de verdade;
- JSONB usado quando houver justificativa, não como substituto geral de relacionamento;
- migrações pequenas e reversíveis sempre que possível.

## Contexto organizacional

A V3 deve introduzir um contexto organizacional explícito.

Modelo conceitual mínimo:

- `empresas`;
- `unidades`;
- associação entre usuários e unidades/perfis;
- referência de `empresa_id` e, quando aplicável, `unidade_id` nos dados operacionais.

Nem todo registro precisa necessariamente de `unidade_id` se for global à empresa, mas essa decisão deverá ser explícita por entidade.

## Identidade

A tabela atual `usuarios` mistura identidade, autenticação, perfil e preferências. Na V3 esses conceitos devem ser separados.

Direção conceitual:

`auth principal` → identidade do usuário → perfil/permissões → vínculos com empresas/unidades.

Credenciais não devem ser tratadas como um atributo de negócio exposto às consultas normais da aplicação.

## Produtos e estoque

O catálogo pode continuar separado de estoque, mas o estoque deve ter uma fonte de verdade clara.

Direção:

`produto` → `saldo/posição` + `movimentações` + `inventários`.

`produtos.estoque` legado deve ser removido somente depois que nenhuma rotina depender dele.

Baixas, entradas, ajustes e inventários deverão possuir origem e identificador da operação para permitir auditoria e idempotência.

## Venda e comanda

A V2 guarda parte dos itens em JSONB. Para a V3 é desejável manter um registro da venda/comanda e permitir uma representação estruturada dos itens quando isso melhorar integridade, consulta ou auditoria.

Uma direção possível:

`venda` → `venda_itens` → `produto`

`comanda` → `comanda_itens` → `produto`

Isso não exige eliminar todo JSONB imediatamente. Uma migração pode preservar campos legados enquanto os novos fluxos passam a usar entidades estruturadas.

## Caixa e financeiro

Caixa, movimentações, vendas, contas a receber e despesas devem possuir relações explícitas.

Operações como fechamento, pagamento, estorno e quitação devem produzir registros que permitam reconstruir o histórico financeiro.

Relatórios devem consumir essas fontes oficiais em vez de manter regras financeiras duplicadas no frontend.

## Eventos e ingressos

Eventos, tipos de ingresso e ingressos já têm uma base relacional adequada. A V3 deverá fortalecer:

- capacidade e disponibilidade;
- concorrência na emissão;
- validade;
- consumo único;
- auditoria de validação;
- isolamento por empresa/unidade quando aplicável.

A mudança de `confirmado` para `utilizado` deve ser uma operação protegida contra corrida concorrente.

## Auditoria

A auditoria atual deverá evoluir de registro textual para um evento estruturado.

Campos conceituais importantes:

- ator;
- empresa;
- unidade;
- módulo;
- ação;
- entidade;
- identificador da entidade;
- antes/depois quando necessário;
- data/hora;
- origem;
- sucesso/erro.

## Configurações

`configuracoes_sistema` deve ser analisada em categorias:

- configuração global;
- configuração por empresa;
- configuração por unidade;
- preferência do usuário;
- configuração do dispositivo.

Isso evita guardar no banco uma preferência que deveria estar apenas no navegador, e evita que uma configuração de uma unidade afete outra.

## Arquivos e Storage

Imagens de produtos e eventos pertencem ao domínio de arquivos/Storage.

Backups são outra categoria e devem ter controles de acesso diferentes de imagens públicas.

A V3 deverá separar claramente:

`arquivo público` ≠ `arquivo privado` ≠ `backup`.

## RLS e isolamento

RLS deverá ser parte estrutural do modelo final.

Uma requisição precisa ser limitada por identidade e contexto organizacional. Filtros no frontend não são suficientes.

As policies devem acompanhar as relações de empresa, unidade, usuário e papel.

## Migração do banco atual

A migração deve ocorrer em etapas:

1. documentar o schema atual;
2. criar novas estruturas sem remover legado;
3. preencher/reconciliar dados;
4. criar compatibilidade durante a transição;
5. migrar os serviços;
6. validar contagens e integridade;
7. retirar dependências legadas;
8. remover colunas/tabelas antigas somente depois de comprovada a migração.

## Regra para novas tabelas

Antes de criar uma nova tabela na V3, deve ser respondido:

- qual entidade de negócio ela representa;
- quem é o dono do dado;
- empresa/unidade são relevantes;
- quais são as relações;
- qual é a fonte de verdade;
- quais invariantes o banco deve proteger;
- como a auditoria será registrada;
- como o dado será usado em relatórios;
- como será migrado/restaurado.

## Resultado esperado

O banco V3 deverá sustentar as regras centrais do sistema, permitindo que diferentes interfaces e integrações consumam os mesmos casos de uso sem duplicar a lógica.