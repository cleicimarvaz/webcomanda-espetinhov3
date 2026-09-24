-- WebComanda Espetinho V3
-- PRE-FLIGHT DO BANCO V3
-- Somente leitura. Não altera dados, schema, RLS ou configurações.
-- Execute depois de aplicar arq/schema-v3-base.sql e, opcionalmente,
-- arq/seeds-v3/001-bootstrap-administrativo.sql.

-- 1. Tabelas fundamentais
WITH esperadas(nome) AS (
    VALUES
        ('empresas'),
        ('unidades'),
        ('usuarios'),
        ('papeis'),
        ('permissoes'),
        ('papel_permissoes'),
        ('membros_organizacao'),
        ('auditoria'),
        ('configuracoes_sistema'),
        ('produtos'),
        ('produto_composicao'),
        ('estoque_produto_unidade'),
        ('inventarios'),
        ('estoque_movimentacoes')
)
SELECT
    e.nome,
    to_regclass('public.' || e.nome) IS NOT NULL AS existe
FROM esperadas e
ORDER BY e.nome;

-- 2. Tabelas que devem existir vazias ou com dados do bootstrap
SELECT
    relname AS tabela,
    n_live_tup AS estimativa_linhas
FROM pg_stat_user_tables
WHERE relname IN (
    'empresas',
    'unidades',
    'usuarios',
    'papeis',
    'permissoes',
    'papel_permissoes',
    'membros_organizacao',
    'auditoria',
    'configuracoes_sistema',
    'produtos',
    'produto_composicao',
    'estoque_produto_unidade',
    'inventarios',
    'estoque_movimentacoes'
)
ORDER BY relname;

-- 3. A V3 não deve possuir senha armazenada em usuarios
SELECT
    EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'usuarios'
          AND column_name = 'senha'
    ) AS possui_coluna_senha;

-- 4. Funções transacionais esperadas
SELECT
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
      'registrar_baixa_estoque_v3',
      'registrar_movimentacoes_estoque_v3',
      'concluir_inventario_v3',
      'validar_contexto_estoque_v3'
  )
ORDER BY routine_name;

-- 5. Views de apoio esperadas
SELECT
    schemaname,
    viewname
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN (
      'v_estoque_produto_unidade_v3',
      'v_membros_organizacao_v3'
  )
ORDER BY viewname;

-- 6. RLS no bootstrap
-- Neste estágio ele deve continuar DESLIGADO. A ativação ocorrerá
-- somente na etapa própria de autenticação/RLS da V3.
SELECT
    c.relname AS tabela,
    c.relrowsecurity AS rls_ativado,
    c.relforcerowsecurity AS rls_forcado
FROM pg_class c
JOIN pg_namespace n
  ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
      'empresas',
      'unidades',
      'usuarios',
      'membros_organizacao',
      'produtos',
      'estoque_produto_unidade',
      'inventarios',
      'estoque_movimentacoes'
  )
ORDER BY c.relname;

-- 7. Triggers de integridade esperadas
SELECT
    tgname AS trigger_name,
    tgrelid::regclass AS tabela
FROM pg_trigger
WHERE NOT tgisinternal
  AND tgrelid::regclass::text IN (
      'public.unidades',
      'public.produtos',
      'public.estoque_produto_unidade',
      'public.estoque_movimentacoes',
      'public.membros_organizacao'
  )
ORDER BY tgrelid::regclass::text, tgname;
