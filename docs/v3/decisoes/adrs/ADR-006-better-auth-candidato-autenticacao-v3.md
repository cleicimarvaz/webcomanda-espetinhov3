# ADR-006 — Better Auth como candidato principal de autenticação da V3

**Status:** aprovado para protótipo e validação local; adoção definitiva condicionada aos testes.
**Data:** 2026-10-20
**Escopo:** autenticação e sessões da V3. Não altera o fluxo de login nem o acesso a dados da V2.

## Contexto

O ADR-005 definiu que todo acesso da V3 ao PostgreSQL será server-side por uma API autenticada. A aplicação precisa de autenticação e sessões que funcionem com PostgreSQL padrão e não dependam do Supabase Auth como requisito.

O Better Auth é uma biblioteca de autenticação open source com licença MIT, framework-agnostic para TypeScript, suporte documentado a PostgreSQL e geração de schema. Sua documentação também permite configurar um schema PostgreSQL separado com `database.schemaName`.

Referências oficiais consultadas em 2026-10-20:

- Licença e projeto: https://github.com/better-auth/better-auth
- Instalação/configuração: https://better-auth.com/docs/installation
- Adaptador PostgreSQL e `schemaName`: https://better-auth.com/docs/adapters/postgresql
- Schema, geração de IDs e migrações: https://better-auth.com/docs/concepts/database
- Changelog/releases: https://better-auth.com/changelog
- Vercel Functions Node.js: https://vercel.com/docs/functions/runtimes/node-js

## Decisão

Better Auth será o **candidato principal** para o protótipo local de autenticação da V3. Essa decisão autoriza preparar e testar a integração em ambiente de desenvolvimento; não declara a autenticação pronta para produção.

A adoção definitiva depende de validar o fluxo completo, incluindo sessões/cookies, encerramento de sessão, recuperação de acesso, rate limiting, autorização por empresa/unidade, integração com a API server-side, compatibilidade com a Vercel e convivência gradual com a V2.

## Desenho técnico proposto para o protótipo

1. Better Auth roda exclusivamente no backend/API da V3, nunca no navegador como detentor de credenciais do banco.
2. Tabelas internas de autenticação ficam em um schema PostgreSQL separado, preferencialmente `auth`, configurado via `database.schemaName`.
3. `public.usuarios` continua representando o perfil de negócio da aplicação, incluindo estado e preferências; não armazena senha nem token de sessão.
4. Avaliar o vínculo 1:1 `public.usuarios.auth_user_id` → `auth.user.id`, com UUID em ambos os lados se o protótipo confirmar `advanced.database.generateId: "uuid"` compatível com a versão escolhida.
5. Não criar a tabela adicional `identidades_autenticacao` inicialmente se `auth.user` + `auth.account` já cobrirem as necessidades. Reabrir essa decisão apenas se o modelo precisar de identidades externas independentes ou de múltiplos usuários de autenticação ligados ao mesmo perfil.
6. `membros_organizacao`, papéis e permissões continuam sendo o modelo próprio da V3. Não usar campo `role` do Better Auth ou metadados enviados pelo cliente como autoridade final de autorização.
7. O fluxo de login não concede acesso automaticamente a uma empresa/unidade: o backend precisa resolver vínculos ativos e aplicar as permissões internas da V3.

## Migrações e histórico do schema

O projeto adotou Dbmate como controlador canônico de migrations SQL.

- Não executar `npx auth migrate` diretamente no banco de desenvolvimento/produção, pois isso poderia alterar o schema fora do histórico Dbmate.
- Durante o protótipo, gerar o schema com o CLI Better Auth em ambiente local isolado, revisar o SQL gerado e incorporá-lo a uma migration Dbmate com `-- migrate:up` e `-- migrate:down`.
- Revisar manualmente nomes, tipos, índices, FKs e o schema `auth` antes de aprovar a migration.
- Fixar uma versão estável exata no `package.json`/lockfile; não usar `latest` sem revisão. A página oficial de changelog consultada nesta data mostrava v1.7.12 como estável mais recente e v1.8.0-beta como pré-lançamento. Revalidar o estado no momento da implementação.
- Não gerar nem aplicar tabelas no banco atual nesta etapa.

## Segurança obrigatória

- `DATABASE_URL` e `BETTER_AUTH_SECRET` ficam exclusivamente em variáveis server-side e nunca entram no bundle do navegador ou no Git.
- O segredo do Better Auth deverá ter alta entropia e pelo menos 32 caracteres, conforme a documentação oficial.
- Em desenvolvimento local, usar somente contas de teste e dados sintéticos.
- Usar cookies de sessão com configurações seguras apropriadas ao ambiente; testar `HttpOnly`, `Secure` em HTTPS, `SameSite`, expiração e invalidação.
- Validar origem/CSRF conforme os mecanismos do framework, além de limitar tentativas de login e respostas para não permitir enumeração de usuários.
- O papel PostgreSQL de runtime terá privilégios mínimos e não será proprietário do schema nem terá `SUPERUSER`/`BYPASSRLS`.
- RLS permanece obrigatória antes de integrar a V3 a dados reais; a identidade autenticada deve ser validada no backend antes de selecionar empresa/unidade.
- Nunca confiar em `localStorage`, `userNivel`, `userId`, `empresa_id` ou `unidade_id` enviados pelo browser como prova de identidade ou autorização.

## Testes mínimos para aceitar a adoção definitiva

1. Cadastro/login local de usuário de teste sem exposição de segredos.
2. A API identifica uma sessão válida e recusa requisição anônima.
3. Logout invalida a sessão e requisições posteriores são recusadas.
4. Expiração e revogação de sessão funcionam.
5. Nenhuma resposta retorna senha, token de sessão, `DATABASE_URL` ou `BETTER_AUTH_SECRET`.
6. Tentativas de enviar papel/empresa/unidade falsos pelo cliente não ampliam privilégios.
7. Um usuário não consegue consultar outro perfil por troca de ID.
8. Migrations são versionadas via Dbmate e reproduzidas de banco vazio; nenhuma alteração automática do schema ocorre na inicialização da API.
9. O protótipo funciona localmente com PostgreSQL 18.6 e passa smoke tests.
10. A API pode ser empacotada/testada em Vercel Functions Node.js sem sessão ou conexões vazando entre invocações.
11. A V2 continua funcional e sem alteração de configuração durante os testes.

## Consequências e próximos passos

- Melhor separação entre autenticação e perfil/permissões da aplicação.
- Dependência do pacote Better Auth para autenticação, mas sem dependência obrigatória de um provedor de banco/hosting.
- A V3 precisará de backend Node.js/server-side e gestão de conexões PostgreSQL.
- O schema e o relacionamento final de identidade só serão congelados após o protótipo.

Sequência aprovada:

1. Documentar o contrato de identidade e sessão.
2. Preparar ambiente Node.js/package.json separado e mínimo para o backend V3.
3. Instalar uma versão estável fixa de Better Auth, sem apontar para produção.
4. Configurar acesso local PostgreSQL e schema de autenticação isolado.
5. Gerar e revisar a DDL, sem aplicá-la automaticamente.
6. Criar uma migration Dbmate revisada, executá-la localmente e validar com testes.
7. Implementar endpoints de auth e testar sessões.
8. Só então revisar RLS, contexto organizacional e integração de primeiro módulo V3.