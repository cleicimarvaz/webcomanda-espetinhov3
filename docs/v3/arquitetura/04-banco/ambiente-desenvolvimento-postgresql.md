# Ambiente de desenvolvimento PostgreSQL V3

## Padrão adotado

O ambiente local da V3 usa PostgreSQL 18 executado em Docker.

A infraestrutura fica em infra/postgres/ e o banco local é separado dos arquivos SQL definitivos.

## Por que separar infraestrutura e schema

O container garante um ambiente reproduzível.

Os scripts SQL permanecem versionados no Git e podem ser aplicados posteriormente em outros ambientes PostgreSQL compatíveis.

O container não executa o schema provisório automaticamente.

## Fluxo previsto

~~~text
desenvolvimento local
        ↓
PostgreSQL 18 + Docker
        ↓
scripts SQL versionados
        ↓
testes do banco
        ↓
ambiente remoto PostgreSQL
        ↓
produção
~~~

O provedor do banco é tratado como detalhe de infraestrutura.

## Diretórios

- infra/postgres/: Docker e configuração local.
- database/migrations/: alterações estruturais versionadas.
- database/functions/: funções PostgreSQL.
- database/seeds/: dados iniciais e de desenvolvimento.
- database/tests/: testes SQL.
- arq/: arquivos históricos/provisórios da evolução anterior.

## Regra de migração

O banco deve continuar sendo PostgreSQL padrão, evitando dependência obrigatória de recursos exclusivos de um provedor.

Backup lógico e restauração devem ser parte da rotina de validação antes da migração para qualquer ambiente remoto.