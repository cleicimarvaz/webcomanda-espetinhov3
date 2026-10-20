# Banco de dados V3

Esta pasta será a área canônica dos scripts SQL físicos versionados da V3.

## Estrutura

~~~text
database/
├── migrations/   # alterações estruturais versionadas
├── functions/    # funções e procedures do banco
├── seeds/        # dados iniciais e de desenvolvimento
└── tests/        # testes SQL e validações
~~~

## Estado atual

- Ambiente local preparado com Docker Desktop e PostgreSQL 18.6.
- Conexão via DBeaver confirmada.
- Consulta de verificação versionada em `tests/000-verificar-conexao.sql`.
- Banco `webcomanda_v3_dev` intencionalmente sem tabelas de domínio.
- SQL físico definitivo ainda não começou a ser aplicado.

## Regra importante

O banco V3 ainda está em fase de consolidação do modelo físico. A criação das tabelas definitivas não foi colocada aqui ainda, para evitar definir migrations antes de fechar tipos, constraints, índices, triggers, funções e RLS em conjunto.

Os arquivos SQL existentes em `arq/` permanecem como base provisória ou histórico da evolução anterior.

## Princípios

- PostgreSQL 18 como referência local.
- Scripts sempre versionados no Git.
- Nenhuma credencial real em arquivos versionados.
- Migrations numeradas, aplicadas em ordem e imutáveis depois de compartilhadas.
- Testes no ambiente local antes de qualquer ambiente remoto.
- Portabilidade como PostgreSQL padrão, evitando dependência desnecessária de um provedor.
- Produção não recebe scripts sem revisão e backup testado.

## Fluxo de trabalho

1. Atualizar o repositório local com `git pull origin main`.
2. Criar ou revisar o arquivo SQL no Git antes de executá-lo.
3. Abrir o script no DBeaver e confirmar a conexão `webcomanda_v3_dev`.
4. Executar somente scripts aprovados para a etapa atual.
5. Validar os resultados e versionar as alterações.

Consulte [migrations/README.md](migrations/README.md) para as convenções e cuidados de aplicação.

## Ambiente local

A infraestrutura Docker está em `infra/postgres/`. Consulte o README desse diretório para subir e verificar o PostgreSQL.