-- WebComanda Espetinho V3
-- PRE-FLIGHT DO BANCO V3
-- Somente leitura. Não altera dados, schema, RLS ou configurações.
-- Execute depois de aplicar arq/schema-v3-base.sql e
-- arq/funcoes-v3/001-estoque-transacional.sql.
-- O bootstrap administrativo é opcional para esta validação.

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

-- 4. Funções V3 esperadas
-- A validação usa a assinatura para evitar confundir a função trigger
-- validar_contexto_estoque_v3() com as funções de serviço.
SELECT
    p.proname AS nome,
    pg_get_function_identity_arguments(p.oid) AS argumentos
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND (
      (p.proname = 'validar_acesso_estoque_v3'
       AND pg_get_function_identity_arguments(p.oid) = 'p_unidade_id uuid, p_usuario_id bigint')
      OR
      (p.proname = 'registrar_movimentacoes_estoque_v3'
       AND pg_get_function_identity_arguments(p.oid) =
           'p_unidade_id uuid, p_usuario_id bigint, p_tipo text, p_itens jsonb, p_motivo text, p_operacao_id uuid')
      OR
      (p.proname = 'concluir_inventario_v3'
       AND pg_get_function_identity_arguments(p.oid) =
           'p_unidade_id uuid, p_usuario_id bigint, p_linhas jsonb, p_observacao text, p_operacao_id uuid')
  )
ORDER BY p.proname;

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
