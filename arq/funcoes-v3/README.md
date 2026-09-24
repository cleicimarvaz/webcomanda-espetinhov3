# Funções do banco V3

Esta pasta reúne funções SQL específicas do banco novo da V3.

## Ordem

1. `arq/schema-v3-base.sql`
2. funções desta pasta
3. `arq/seeds-v3/001-bootstrap-administrativo.sql`
4. `arq/testes-v3/001-validacao-schema-base.sql`
5. `arq/testes-v3/002-preflight-banco-v3.sql`

As funções de estoque são transacionais e usam `SECURITY INVOKER`. A autorização definitiva depende da implantação da autenticação própria e do RLS da V3.

Nenhum arquivo desta pasta deve ser aplicado automaticamente na V2.
