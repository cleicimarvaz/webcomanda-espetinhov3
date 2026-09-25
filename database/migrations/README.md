# Migrations

As migrations físicas do PostgreSQL V3 serão criadas aqui quando o SQL definitivo for consolidado.

Formato adotado:

~~~text
001_nome_da_migration.sql
002_nome_da_migration.sql
003_nome_da_migration.sql
...
~~~

Cada arquivo deve representar uma alteração coerente e deve permanecer imutável depois de aplicado em um ambiente compartilhado.

As migrations históricas 001–008 de arq/migracoes-v3/ não são copiadas para cá porque foram desenhadas para a evolução da V2.
