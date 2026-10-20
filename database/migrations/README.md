# Migrations PostgreSQL — V3

## Ferramenta adotada

A V3 usará **Dbmate** para controlar as migrations. Ele é open source, usa arquivos SQL simples, registra o histórico no banco e executa migrations de forma transacional em PostgreSQL. O runner está disponível via Docker; não é necessário instalar outro programa no Windows.

Referência oficial: https://github.com/amacneil/dbmate

## Estado atual

**Ainda não há migrations físicas de domínio para aplicar.** O modelo relacional foi consolidado funcionalmente, mas o SQL físico será criado depois de definir tipos, chaves, constraints, índices, triggers, funções e RLS em conjunto.

O banco local `webcomanda_v3_dev` está validado com PostgreSQL 18.6 e deve permanecer sem tabelas de domínio até a consolidação do SQL físico. A primeira execução do Dbmate poderá criar a tabela de controle `schema_migrations`; isso só ocorrerá quando um comando de migration for executado.

## Convenção de arquivos

Dbmate usa arquivos SQL com versão temporal e as seções `migrate:up` e `migrate:down`, por exemplo:

~~~text
20261020150000_fundacao_organizacional.sql
20261020151000_catalogo_produtos.sql
~~~

O exemplo acima ilustra o formato; não representa migrations aprovadas nem deve ser criado/aplicado automaticamente.

Criação de um arquivo novo (a partir da pasta `infra/postgres`):

~~~powershell
docker compose --profile migrations run --rm dbmate new nome_da_mudanca
~~~

O arquivo será criado na pasta versionada `database/migrations/`. Revise o conteúdo antes de executá-lo.

## Comandos locais

Execute os comandos a partir de `infra/postgres/`.

Ver a ajuda do Dbmate, sem alterar o banco:

~~~powershell
docker compose --profile migrations run --rm dbmate --help
~~~

Listar o status das migrations:

~~~powershell
docker compose --profile migrations run --rm dbmate status
~~~

Aplicar migrations pendentes (somente depois de revisar e aprovar os scripts):

~~~powershell
docker compose --profile migrations run --rm dbmate migrate
~~~

Reverter a migration mais recente (somente em desenvolvimento e depois de revisar o bloco `migrate:down`):

~~~powershell
docker compose --profile migrations run --rm dbmate rollback
~~~

**Não execute `up` ou `drop` como rotina**: `up` pode criar um banco ausente e `drop` apaga um banco. O fluxo normal é `migrate` após revisão.

## Regras de segurança

1. Cada migration representa uma mudança coerente e revisável.
2. Depois de aplicada em um ambiente compartilhado, não edite o arquivo; faça uma nova migration para corrigir.
3. Não copie as migrations históricas `001–008` de `arq/migracoes-v3/`: foram desenhadas para a evolução da V2.
4. Dbmate executa as migrations PostgreSQL de forma transacional por padrão; não coloque `BEGIN`/`COMMIT` manualmente dentro dos blocos sem uma razão técnica específica.
5. Não inclua credenciais nem dados reais nos scripts.
6. Teste primeiro no banco local e valide o resultado antes de usar outro ambiente.
7. Nunca aplique scripts em produção sem revisão, backup testado e plano de recuperação.
8. O `migrate:down` deve ser escrito e revisado com cuidado. Uma reversão pode eliminar dados e não substitui backup.
9. O serviço Dbmate só inicia quando chamado com `--profile migrations`; `docker compose up -d` continua subindo apenas o PostgreSQL.

## Fluxo enquanto estamos aprendendo

1. Atualize a cópia local com `git pull origin main`.
2. Confira `git status`.
3. Leia os arquivos SQL antes de executar.
4. Confirme que a conexão é `webcomanda_v3_dev` e que está no ambiente local.
5. Use `dbmate status` para conferir o histórico.
6. Só aplique migrations explicitamente aprovadas.
7. Valide as tabelas, constraints e regras depois da aplicação.
8. Registre o SQL no Git e nunca altere migrations já aplicadas em ambiente compartilhado.

## Senha e URL

O serviço usa a senha `POSTGRES_PASSWORD` para montar a URL de conexão. Como URLs exigem codificação de caracteres reservados, prefira uma senha local com letras e números. Se sua senha atual contém caracteres como `@`, `:`, `/`, `?`, `#` ou `%`, não a envie no chat; avise apenas que contém caracteres especiais para receber instruções seguras de configuração.

## Rollback

Nem toda mudança pode ser revertida com segurança. Para cada migration, documente como recuperar o estado anterior. Quando não houver rollback seguro, o procedimento poderá exigir backup/restauração ou uma migration corretiva.