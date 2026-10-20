# Banco de dados V3

Esta pasta é a área canônica dos scripts SQL físicos versionados da V3.

## Estrutura

~~~text
database/
├── migrations/   # migrations SQL controladas pelo Dbmate
├── functions/    # documentação/artefatos auxiliares de funções PostgreSQL
├── seeds/        # dados iniciais e de desenvolvimento
└── tests/        # testes SQL e validações
~~~

## Estado atual

- Ambiente local preparado com Docker Desktop e PostgreSQL 18.6.
- Conexão via DBeaver confirmada.
- Consulta de verificação versionada em `tests/000-verificar-conexao.sql`.
- Banco `webcomanda_v3_dev` intencionalmente sem tabelas de domínio.
- Dbmate configurado como runner de migrations via Docker, mas ainda não executado no banco.
- SQL físico definitivo ainda não começou a ser aplicado.

## Regra importante

A criação das tabelas definitivas continua aguardando o fechamento do SQL físico. Não execute o schema provisório de `arq/` nem as migrations históricas `arq/migracoes-v3/` no banco V3.

## Princípios

- PostgreSQL 18 como referência local.
- Scripts sempre versionados no Git.
- Nenhuma credencial real em arquivos versionados.
- Dbmate controla o histórico de migrations aplicadas.
- Testes no ambiente local antes de qualquer ambiente remoto.
- Portabilidade como PostgreSQL padrão, evitando dependência desnecessária de um provedor.
- Produção não recebe scripts sem revisão e backup testado.

## Fluxo de trabalho

1. Atualizar o repositório local com `git pull origin main`.
2. Criar/revisar a migration SQL no Git antes de executá-la.
3. Executar comandos Dbmate pelo serviço opcional definido em `infra/postgres/docker-compose.yml`.
4. Usar `dbmate status` para verificar histórico e `dbmate migrate` somente após revisão.
5. Validar os resultados no DBeaver.

Consulte [migrations/README.md](migrations/README.md) para os comandos e regras completos.

## Ambiente local

A infraestrutura está em `infra/postgres/`. Consulte o README desse diretório.