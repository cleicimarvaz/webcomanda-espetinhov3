# PostgreSQL 18 local

Este diretório contém a infraestrutura de desenvolvimento do banco V3.

## Objetivo

Subir PostgreSQL 18.6 local em Docker sem amarrar a aplicação a um provedor específico.
O banco é um ambiente de desenvolvimento; as tabelas definitivas só serão criadas após a consolidação do SQL físico.

## Requisitos

- Docker Desktop instalado e em execução.
- Docker Compose disponível pelo comando `docker compose`.

## Primeira configuração

Copie `.env.example` para `.env` e ajuste a senha local. O `.env` não deve ser versionado.

## Subir e verificar PostgreSQL

~~~powershell
docker compose up -d
docker compose ps
docker compose logs --tail=30 postgres
~~~

## Acessar pelo DBeaver

| Campo | Valor |
|---|---|
| Host | `localhost` |
| Porta | `5432` |
| Banco | `webcomanda_v3_dev` |
| Usuário | valor de `POSTGRES_USER` no `.env` |
| Senha | valor de `POSTGRES_PASSWORD` no `.env` |

## Migrations SQL com Dbmate

O serviço `dbmate` usa a imagem open source `ghcr.io/amacneil/dbmate:2.36.0`. Ele fica no perfil opcional `migrations` e não é iniciado pelo `docker compose up -d` normal.

Execute os comandos a partir deste diretório.

Ajuda (não altera o banco):

~~~powershell
docker compose --profile migrations run --rm dbmate --help
~~~

Status do histórico:

~~~powershell
docker compose --profile migrations run --rm dbmate status
~~~

Aplicar migrations pendentes depois de revisão explícita:

~~~powershell
docker compose --profile migrations run --rm dbmate migrate
~~~

Criar novo arquivo SQL de migration:

~~~powershell
docker compose --profile migrations run --rm dbmate new nome_da_mudanca
~~~

Não executar `migrate` até que exista uma migration física aprovada. Não use os arquivos provisórios de `arq/` como se fossem migrations definitivas.

## Parar o container

~~~powershell
docker compose down
~~~

## Apagar os dados locais

`docker compose down -v` remove o volume de dados do banco. **Não execute este comando como rotina.** Use somente se realmente quiser apagar e recriar o banco local.

## Backup e migração

O ambiente será tratado como PostgreSQL padrão. Backups lógicos e testes de restauração farão parte da preparação antes de qualquer migração para outro ambiente.

## Regra da V3

A aplicação dependerá de PostgreSQL, e não de um provedor específico. Docker, Neon, Supabase, VPS ou outro serviço poderão ser ambientes diferentes para a mesma base.