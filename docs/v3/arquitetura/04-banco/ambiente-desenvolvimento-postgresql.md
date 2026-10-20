# Ambiente de desenvolvimento PostgreSQL V3

## Padrão adotado

O ambiente local da V3 usa PostgreSQL 18.6 executado em Docker.

A infraestrutura fica em `infra/postgres/` e o banco local é separado dos arquivos SQL definitivos.

## Estado validado

- Container `webcomanda-postgres-v3` em estado healthy.
- Banco `webcomanda_v3_dev` acessível na porta local 5432.
- Conexão DBeaver confirmada.
- Consulta `SELECT current_database(), current_user, version()` executada com sucesso.
- Banco mantido sem tabelas de domínio até a consolidação do SQL físico.

## Por que separar infraestrutura e schema

O container garante um ambiente reproduzível. Os scripts SQL permanecem versionados no Git e podem ser aplicados posteriormente em outros ambientes PostgreSQL compatíveis.

O container não executa o schema provisório automaticamente.

## Fluxo previsto

~~~text
desenvolvimento local
        ↓
PostgreSQL 18.6 + Docker
        ↓
migrations SQL versionadas
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
- `database/migrations/`: alterações estruturais versionadas.
- `database/functions/`: funções PostgreSQL.
- `database/seeds/`: dados iniciais e de desenvolvimento.
- `database/tests/`: testes SQL.
- `arq/`: arquivos históricos/provisórios da evolução anterior.

## Regra de migração

O banco deve continuar sendo PostgreSQL padrão, evitando dependência obrigatória de recursos exclusivos de um provedor. Backup lógico e restauração devem fazer parte da validação antes de migrar para qualquer ambiente remoto.

O banco definitivo ainda não foi construído. Esta documentação registra o ambiente local e o processo previsto, não a aprovação para executar o schema provisório.