# ADR-003 — Banco de dados dedicado para a V3

## Status

Aceita para a arquitetura da V3. Configuração de acesso ainda pendente do novo ambiente.

## Contexto

A V3 será desenvolvida com um banco de dados separado do ambiente utilizado pela V2.

A conexão deve ser isolada no código para que:

- o legado continue apontando para o banco da V2 durante a transição;
- os novos serviços V3 apontem para o banco dedicado;
- seja possível testar a V3 sem alterar os dados operacionais da V2;
- a troca de banco não fique espalhada por vários módulos.

## Decisão

A V3 terá um cliente Supabase próprio:

- V2: `window._supabase`;
- V3: `window._supabaseV3`.

A configuração do banco V3 ficará centralizada em:

`componentes/config-v3.js`

O cliente será inicializado em:

`componentes/database-v3.js`

Os serviços novos devem usar `_supabaseV3` e não `_supabase`.

## Chaves de API

No navegador deve ser usada somente a chave pública/publishable do projeto.

Não será colocado no frontend nenhum segredo ou chave `service_role`/`secret`, pois essas chaves possuem privilégios elevados e podem ignorar RLS. citeturn181589search0turn181589search5

### Sobre reutilizar a chave da V2

A chave de API do Supabase identifica o projeto que recebe a requisição. A URL da API também é específica do projeto. Portanto, uma chave da V2 não pode ser usada para autenticar um projeto Supabase diferente. citeturn181589search0turn181589search2

Assim, existem dois cenários:

**Mesmo projeto Supabase:** a chave pública da V2 pode continuar sendo usada, desde que o objetivo seja apenas separar estruturas dentro do mesmo projeto.

**Novo projeto Supabase:** o banco V3 deverá receber a URL e a chave pública desse novo projeto. Nesse cenário, a chave da V2 não serve para o banco V3.

A configuração foi criada com campos próprios para deixar essa diferença explícita.

## Impacto na migração

A separação permite uma migração mais segura:

`V2 → banco V2`

e

`V3 → banco V3`

Durante a fase de transição, uma mesma tela pode conter componentes legados e componentes V3, mas cada componente deve deixar claro qual cliente de banco está utilizando.

## Regras

- não alterar `componentes/config.js` para apontar para o banco V3 neste momento;
- não substituir o cliente `_supabase` global da V2;
- novos serviços V3 usam `_supabaseV3`;
- operações críticas devem continuar passando por serviços/RPCs;
- RLS será obrigatório antes da entrada em produção do banco V3;
- a chave real não deve ser adicionada ao histórico de commits quando for uma chave secreta.

## Validação

Antes de conectar a V3 ao ambiente real:

1. criar/configurar o banco V3;
2. aplicar o schema/migrations validados;
3. preencher `componentes/config-v3.js`;
4. verificar a conexão;
5. executar o smoke test;
6. testar uma operação V3;
7. confirmar que nenhuma chamada V3 está indo para o banco da V2.
