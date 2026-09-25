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

## Regra importante

O banco V3 ainda está em fase de consolidação do modelo físico.

Por isso, a criação das tabelas definitivas não foi colocada aqui ainda. O objetivo é evitar que migrations sejam criadas antes de fechar tipos, constraints, índices, triggers, funções e RLS.

Os arquivos SQL existentes em arq/ permanecem como base provisória ou histórico da evolução anterior.

## Princípios

- PostgreSQL 18 como referência local.
- Scripts sempre versionados no Git.
- Nenhuma credencial real em arquivos versionados.
- Alterações de estrutura serão numeradas e aplicadas em ordem.
- O mesmo conjunto de scripts deverá funcionar em ambientes PostgreSQL compatíveis.
- Produção não recebe scripts diretamente deste diretório sem validação e backup prévios.

## Ambiente local

A infraestrutura Docker está em:

~~~text
infra/postgres/
~~~

Consulte o README desse diretório para subir o PostgreSQL local.
