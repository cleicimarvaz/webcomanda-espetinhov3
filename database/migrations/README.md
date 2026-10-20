# Migrations PostgreSQL — V3

## Estado atual

**Ainda não há migrations físicas definitivas para aplicar.** O modelo relacional está consolidado funcionalmente, mas o SQL físico será criado depois de definir tipos, chaves, constraints, índices, triggers, funções e RLS em conjunto.

O banco local `webcomanda_v3_dev` está criado e validado com PostgreSQL 18.6. Ele deve permanecer sem tabelas de domínio até a consolidação do SQL físico.

## Convenção de nomes

Use números sequenciais e nomes curtos que expressem uma única mudança:

~~~text
001_fundacao_controle_migrations.sql
002_organizacao.sql
003_identidade_permissoes.sql
004_catalogo_produtos.sql
...
~~~

Os nomes acima são exemplos de convenção, não uma ordem de implementação já aprovada.

## Regras

1. Cada migration representa uma mudança coerente e revisável.
2. Depois de aplicada em um ambiente compartilhado, a migration não deve ser editada; correções entram em um novo arquivo.
3. Não copie as migrations históricas `001–008` de `arq/migracoes-v3/`: elas foram desenhadas para a evolução da V2.
4. Prefira transações (`BEGIN`/`COMMIT`) quando todos os comandos da migration forem compatíveis com transação.
5. Não inclua credenciais nem dados reais nos scripts.
6. Teste primeiro no banco local e valide o resultado antes de aplicar em outro ambiente.
7. Nunca aplique scripts diretamente em produção sem revisão, backup testado e plano de recuperação.
8. Não use `IF NOT EXISTS` indiscriminadamente para esconder divergências entre ambientes.

## Fluxo enquanto estamos aprendendo

1. Atualize a cópia local do repositório com `git pull origin main`.
2. Abra o arquivo SQL versionado no DBeaver.
3. Confira que a conexão selecionada é `webcomanda_v3_dev`.
4. Leia o script antes de executar e verifique se ele declara efeitos destrutivos.
5. Execute apenas scripts autorizados para a etapa atual.
6. Valide tabelas, constraints e resultados.
7. Registre alterações no Git e faça commit.

Por enquanto, somente consultas de verificação e testes explicitamente aprovados devem ser executados. O template `_TEMPLATE.sql.example` é ilustrativo e não deve ser executado.

## Controle de execução

Antes da primeira migration de domínio, escolheremos e implementaremos um controle explícito de migrations aplicadas (por exemplo, uma tabela de histórico ou uma ferramenta de migration). Não vamos depender apenas da memória ou de anotações no DBeaver para saber o que foi aplicado.

## Rollback

Nem toda alteração de schema pode ser desfeita automaticamente com segurança. Para cada migration, documente como recuperar o estado anterior. Quando não existir rollback seguro, o procedimento será restaurar backup ou aplicar uma migration corretiva.