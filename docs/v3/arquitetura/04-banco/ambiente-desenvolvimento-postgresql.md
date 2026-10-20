# Ambiente de desenvolvimento PostgreSQL V3

## Padrão adotado

O ambiente local da V3 usa PostgreSQL 18.6 executado em Docker.

A infraestrutura está em `infra/postgres/`. O banco local é separado dos scripts SQL definitivos, que ficam versionados em `database/`.

## Estado validado

- Container `webcomanda-postgres-v3` em estado `healthy`.
- Banco `webcomanda_v3_dev` acessível na porta local 5432.
- Conexão do DBeaver confirmada.
- Consulta `SELECT current_database(), current_user, version()` executada com sucesso.
- Banco mantido sem tabelas de domínio até a consolidação do SQL físico.
- Dbmate configurado como serviço Docker opcional para migrations; ainda não executado no banco.

## Por que separar infraestrutura e schema

O container garante um ambiente reproduzível. Os scripts SQL permanecem versionados no Git e podem ser aplicados posteriormente em outros ambientes PostgreSQL compatíveis.

O container não executa o schema provisório automaticamente.

## Fluxo previsto

~~~text
desenvolvimento local
        ↓
PostgreSQL 18.6 + Docker
        ↓
migrations SQL versionadas via Dbmate
        ↓
testes e validação
        ↓
backup/restore validado
        ↓
ambiente remoto PostgreSQL
~~~

O provedor do banco é tratado como detalhe de infraestrutura.

## Diretórios

- `infra/postgres/`: Docker e configuração local.
- `database/migrations/`: migrations SQL.
- `database/functions/`: funções PostgreSQL e documentação auxiliar.
- `database/seeds/`: dados iniciais e de desenvolvimento.
- `database/tests/`: testes SQL.
- `arq/`: arquivos históricos/provisórios da evolução anterior.

## Processo de migrations

O Dbmate é executado pelo perfil opcional `migrations` do Docker Compose, sem iniciar junto com o PostgreSQL por padrão. Os comandos operacionais estão descritos em `database/migrations/README.md`.

Não executar `migrate` até que uma migration física tenha sido revisada e aprovada. Os arquivos provisórios em `arq/` não são migrations definitivas para este banco.

## Regra de migração

O banco deve continuar sendo PostgreSQL padrão, evitando dependência obrigatória de recursos exclusivos de um provedor. Backup lógico e restauração devem fazer parte da validação antes de migrar para qualquer ambiente remoto.