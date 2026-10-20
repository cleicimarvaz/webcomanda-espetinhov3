# Plano de protótipo local — Better Auth + PostgreSQL

**Status:** planejado; não instalado, não configurado e sem DDL aplicada.
**Decisões de referência:** ADR-005 e ADR-006.

## Objetivo

Validar Better Auth com PostgreSQL 18.6 no ambiente local, através do backend V3, antes de decidir o modelo definitivo de identidade e sessão.

## Escopo do protótipo

- Criar uma área Node.js mínima para o backend V3, sem reestruturar as páginas legadas.
- Manter as credenciais do banco somente no servidor.
- Fixar uma versão estável exata de Better Auth e registrar dependências no `package-lock.json`.
- Conectar à instância PostgreSQL local usando `pg`/pool server-side.
- Configurar `database.schemaName: "auth"` para isolar as tabelas próprias da biblioteca.
- Avaliar `advanced.database.generateId: "uuid"` e comprovar os tipos gerados antes de aprovar qualquer FK para o perfil interno.
- Gerar o schema em arquivo, revisar e integrar à migration Dbmate; não rodar o migrador próprio da biblioteca diretamente no banco.
- Criar endpoints de autenticação só depois da revisão da DDL e da migration.
- Não usar dados reais, nem conectar o protótipo à V2 ou a qualquer banco remoto.

## Sequência de implementação

### Fase 1 — Preparação sem alterar o banco

1. Sincronizar o repositório (`git pull origin main`).
2. Inspecionar o layout atual e decidir se o backend terá um `package.json` na raiz ou uma área isolada `server/`; evitar afetar o deploy estático atual.
3. Conferir versão estável Better Auth e changelog oficial no dia da instalação; não usar versões beta nem `@latest` sem pin no lockfile.
4. Adicionar `.env.example` apenas com nomes de variáveis, nunca segredos reais.

### Fase 2 — Configuração e geração de schema

1. Configurar `DATABASE_URL`, `BETTER_AUTH_SECRET` e `BETTER_AUTH_URL` no ambiente local server-side.
2. Gerar uma chave de segredo com alta entropia, no mínimo 32 caracteres; manter o valor apenas no `.env` ignorado pelo Git.
3. Preparar configuração Better Auth com PostgreSQL e schema `auth`.
4. Gerar o SQL de schema sem aplicar automaticamente.
5. Revisar tabelas, tipos de ID, nomes, índices e chaves estrangeiras.
6. Converter/revisar o SQL numa migration Dbmate com `-- migrate:up` e um `-- migrate:down` avaliado; revisar a reversão por risco de perda de dados.

### Fase 3 — Aplicação local controlada

1. Fazer backup lógico do banco vazio de desenvolvimento ou usar uma base de teste descartável para a primeira aplicação.
2. Aplicar somente a migration aprovada por Dbmate.
3. Verificar no DBeaver que as tabelas da autenticação estão em `auth`, sem tabelas de domínio V3 antecipadas.
4. Executar `dbmate status` e confirmar que a migration está registrada.

### Fase 4 — Endpoints e smoke tests

- cadastro/login/logout com usuário sintético;
- endpoint de sessão anônimo retorna não autenticado;
- sessão válida é reconhecida server-side;
- logout e expiração invalidam a sessão;
- nenhum segredo é enviado ao navegador ou registrado em log;
- usuário não consegue escolher o papel, empresa/unidade ou permissões apenas pelo payload;
- solicitações concorrentes não compartilham a sessão de outro usuário;
- nenhum acesso direto ao PostgreSQL sai no bundle de frontend;
- o fluxo V2 continua funcionando sem mudança.

## Critérios para adoção definitiva

O protótipo deve demonstrar em testes que Better Auth, o runtime Node.js, PostgreSQL 18.6, Dbmate e a API server-side funcionam em conjunto. Também é necessário validar como serão mapeados `auth.user`, `public.usuarios` e `membros_organizacao`, incluindo o provisionamento de usuário e o contexto organizacional.

A adoção definitiva e as policies RLS ficam pendentes até esses testes concluírem.

## Não fazer nesta etapa

- Não executar `npx auth migrate` diretamente contra o banco.
- Não executar `dbmate migrate` até existir uma migration revisada e aprovada.
- Não executar `arq/schema-v3-base.sql`, migrations históricas, bootstrap ou funções provisórias.
- Não modificar o login nem a configuração de banco da V2.
- Não criar usuário administrador, empresa de produção nem dados reais.