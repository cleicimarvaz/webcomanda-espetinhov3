# Arquitetura alvo da V3

Este documento define a direção arquitetural desejada para a V3. Não representa uma reescrita imediata da aplicação. A estratégia é evoluir a V2 em etapas, preservando os fluxos que já funcionam.

## Objetivos arquiteturais

- reduzir a concentração de regra de negócio no frontend;
- separar interface, domínio e infraestrutura;
- centralizar operações críticas no servidor/banco;
- tornar autenticação e autorização independentes de `localStorage`;
- permitir isolamento por empresa e unidade;
- garantir consistência de estoque, caixa, vendas e financeiro;
- manter impressão como infraestrutura substituível;
- permitir PWA/offline de forma controlada;
- facilitar testes e manutenção;
- permitir evolução gradual sem reescrever toda a aplicação.

## Camadas

### 1. Interface

Responsável por HTML/componentes, formulários, navegação, feedback visual e interação com o operador.

A interface não deve decidir regras críticas de negócio nem assumir que uma operação de banco foi concluída somente porque uma chamada HTTP terminou.

### 2. Serviços de aplicação

Camada responsável por representar casos de uso do sistema.

Exemplos:

- abrir caixa;
- registrar venda;
- lançar item em comanda;
- fechar comanda;
- registrar pagamento;
- movimentar estoque;
- registrar despesa;
- criar reserva;
- emitir ingresso;
- validar ingresso;
- executar estorno.

Essa camada deve receber dados validados, executar o caso de uso e retornar um resultado consistente.

### 3. Domínio

Concentra regras que precisam permanecer verdadeiras independentemente da tela utilizada.

Exemplos:

- uma venda fechada não pode ser alterada como se estivesse aberta;
- estoque não pode ser baixado duas vezes pela mesma operação;
- ingresso confirmado não pode ser validado duas vezes;
- caixa deve respeitar seus estados de abertura/fechamento;
- estorno deve gerar os efeitos correspondentes de forma consistente.

### 4. Persistência

Responsável pelo acesso ao PostgreSQL/Supabase e por consultas, funções, RPCs, transações e políticas de acesso.

O frontend não deve precisar conhecer detalhes internos das tabelas para executar uma operação de negócio.

### 5. Infraestrutura

Concentra integrações externas e recursos de ambiente:

- Supabase V2, durante a transição;
- Supabase/banco dedicado da V3;
- Storage;
- impressão;
- QR Code;
- notificações;
- backup;
- PWA;
- exportações;
- serviços externos.

## Domínios funcionais

### Identidade e acesso

Responsável por usuários, autenticação, sessão, papéis, permissões e contexto organizacional.

Esse domínio deve ser a fonte oficial de identidade. `localStorage` pode manter preferências e estado de interface, mas não deve ser a autoridade de autorização.

### Organização

Representa a empresa e suas unidades de operação.

A arquitetura deve permitir que cada registro operacional pertença ao contexto correto de organização/unidade, mesmo que a implementação completa seja feita gradualmente.

### Catálogo e estoque

Responsável por produtos, categorias, combos, fornecedores, preços, inventário e movimentações.

Estoque deve ser tratado como uma sequência de operações controladas, e não apenas como um número alterado pelo navegador.

### Atendimento

Responsável por venda, comanda, mesa, divisão e cozinha.

Esse domínio concentra o fluxo comercial principal.

### Caixa e financeiro

Responsável por caixa, movimentações, despesas, contas a receber, metas e relatórios financeiros.

Valores financeiros e estados de fechamento devem possuir regras de consistência no backend/banco.

### Eventos e ingressos

Responsável por eventos, reservas, mapas, mesas, patrocinadores, tipos de ingresso, emissão e validação.

A validação de ingresso deve ser atômica para evitar uso concorrente do mesmo ingresso.

### Relatórios

Responsável por consultas analíticas e apresentação de indicadores.

Relatórios não devem transformar uma regra financeira em outra regra paralela. Devem consumir fontes oficiais e documentadas.

### Impressão

Domínio transversal de infraestrutura, não de negócio.

Deve fornecer uma interface estável para que venda, cozinha, caixa e eventos solicitem documentos sem conhecer o mecanismo de saída.

### Configurações e infraestrutura

Responsável por preferências, notificações, backup, PWA, exportações e demais serviços transversais.

## Multiempresa e multiunidade

A arquitetura deve ser preparada para isolamento organizacional desde o início da V3.

Modelo conceitual:

`empresa` → `unidades` → `usuários/perfis` e `dados operacionais`.

Um usuário poderá ter acesso a uma ou mais unidades conforme sua função. A unidade ativa deve fazer parte do contexto da sessão e das operações.

O isolamento definitivo deverá ser implementado por regras de banco/RLS e não apenas por filtros da interface.

## Operações transacionais

As operações críticas devem migrar progressivamente de:

`frontend → várias chamadas independentes → resultado`

para:

`frontend → caso de uso → operação transacional → resultado único`.

Exemplo conceitual de fechamento de venda:

`validar venda` + `registrar histórico` + `baixar estoque` + `registrar pagamento` + `atualizar comanda` + `auditar operação`.

Quando essas mudanças precisarem ocorrer em conjunto, a implementação deverá oferecer atomicidade e idempotência.

## Comunicação frontend/backend

Na V3, os módulos de interface devem preferencialmente chamar serviços de aplicação.

Exemplo:

`vendaUI.finalizarVenda()`

em vez de uma tela executar diretamente várias operações independentes em tabelas diferentes.

Durante a transição, funções existentes em `database.js` e o cliente `_supabase` permanecem como compatibilidade da V2. A V3 possui um cliente separado, `_supabaseV3`, configurado em `config-v3.js` e inicializado por `database-v3.js`. Novos serviços V3 devem evitar dependência do cliente legado.

## PWA e offline

O PWA deve ter responsabilidades separadas:

- cache da aplicação;
- armazenamento local controlado;
- fila de operações, quando houver suporte offline;
- sincronização;
- resolução de conflitos.

Não será considerado suficiente apenas colocar JavaScript em cache para declarar uma funcionalidade como offline.

## Auditoria

A auditoria deve ser transversal e receber eventos de operações importantes.

Cada evento relevante deve permitir identificar, quando aplicável:

- usuário;
- empresa;
- unidade;
- operação;
- registro afetado;
- data/hora;
- resultado;
- origem/dispositivo;
- dados mínimos necessários para rastreabilidade.

## Estratégia de migração

A V3 deve ser evoluída por estrangulamento gradual, e não por reescrita total.

Etapa conceitual:

1. manter a interface atual;
2. criar contratos de serviços;
3. mover operações críticas para transações/RPCs;
4. corrigir autenticação e autorização;
5. implantar isolamento organizacional;
6. reorganizar módulos para consumir serviços;
7. substituir gradualmente acessos diretos ao banco;
8. fortalecer PWA/offline;
9. remover código legado somente após validação.

## Princípio de compatibilidade

Cada migração deverá ter uma referência clara do comportamento da V2 que precisa continuar funcionando.

Uma funcionalidade somente deve ser removida ou alterada depois que a decisão estiver registrada em `docs/v3/decisoes/`.

## Resultado esperado

A arquitetura final deve permitir que a aplicação tenha uma interface web/mobile/PWA, diferentes mecanismos de impressão e diferentes canais públicos sem duplicar as regras centrais de negócio.