-- =====================================================================
-- WEBCOMANDA ESPETINHO V3
-- SEED 001 — PRIMEIRA EMPRESA / UNIDADE / PAPÉIS ADMINISTRATIVOS
-- =====================================================================
-- STATUS: EXEMPLO DE BOOTSTRAP / VALIDAR ANTES DE EXECUTAR
--
-- Este script cria apenas a estrutura administrativa inicial.
-- Não cria senha de usuário.
--
-- Ajuste os nomes abaixo antes de usar em um ambiente real.
-- =====================================================================

begin;

do $$
declare
    v_empresa_id uuid;
    v_unidade_id uuid;
    v_admin_role_id uuid;
    v_operador_role_id uuid;
    v_admin_user_id bigint;
    v_permissao_id uuid;
begin
    -- ================================================================
    -- 1. EMPRESA INICIAL
    -- ================================================================

    insert into public.empresas (nome)
    select 'ESPETINHO & CIA'
    where not exists (
        select 1
        from public.empresas
        where lower(nome) = lower('ESPETINHO & CIA')
    )
    returning id into v_empresa_id;

    if v_empresa_id is null then
        select id
          into v_empresa_id
          from public.empresas
         where lower(nome) = lower('ESPETINHO & CIA')
         order by created_at
         limit 1;
    end if;

    -- ================================================================
    -- 2. UNIDADE INICIAL
    -- ================================================================

    insert into public.unidades (empresa_id, nome, codigo)
    select v_empresa_id, 'UNIDADE PRINCIPAL', 'U001'
    where not exists (
        select 1
        from public.unidades
        where empresa_id = v_empresa_id
          and lower(nome) = lower('UNIDADE PRINCIPAL')
    )
    returning id into v_unidade_id;

    if v_unidade_id is null then
        select id
          into v_unidade_id
          from public.unidades
         where empresa_id = v_empresa_id
           and lower(nome) = lower('UNIDADE PRINCIPAL')
         limit 1;
    end if;

    -- ================================================================
    -- 3. PAPÉIS
    -- ================================================================

    insert into public.papeis (codigo, nome, descricao)
    values
        ('ADMIN', 'Administrador', 'Acesso administrativo da V3'),
        ('OPERADOR', 'Operador', 'Acesso operacional conforme permissões')
    on conflict (codigo) do update
    set nome = excluded.nome,
        descricao = excluded.descricao;

    select id into v_admin_role_id
    from public.papeis
    where codigo = 'ADMIN';

    select id into v_operador_role_id
    from public.papeis
    where codigo = 'OPERADOR';

    -- ================================================================
    -- 4. PERMISSÕES INICIAIS
    -- ================================================================

    insert into public.permissoes (codigo, nome, descricao)
    values
        ('sistema.configurar', 'Configurar sistema', 'Configurações gerais e infraestrutura'),
        ('usuarios.gerenciar', 'Gerenciar usuários', 'Criar, editar e inativar usuários'),
        ('estoque.visualizar', 'Visualizar estoque', 'Consultar estoque por unidade'),
        ('estoque.movimentar', 'Movimentar estoque', 'Registrar entradas e saídas'),
        ('estoque.inventariar', 'Executar inventário', 'Concluir inventário físico'),
        ('produtos.gerenciar', 'Gerenciar produtos', 'Cadastrar e editar produtos'),
        ('auditoria.visualizar', 'Visualizar auditoria', 'Consultar eventos de auditoria')
    on conflict (codigo) do update
    set nome = excluded.nome,
        descricao = excluded.descricao;

    -- ADMIN recebe todas as permissões iniciais.
    insert into public.papel_permissoes (papel_id, permissao_id)
    select v_admin_role_id, p.id
    from public.permissoes p
    on conflict (papel_id, permissao_id) do nothing;

    -- OPERADOR recebe apenas permissões operacionais básicas.
    insert into public.papel_permissoes (papel_id, permissao_id)
    select v_operador_role_id, p.id
    from public.permissoes p
    where p.codigo in (
        'estoque.visualizar',
        'estoque.movimentar',
        'estoque.inventariar'
    )
    on conflict (papel_id, permissao_id) do nothing;

    -- ================================================================
    -- 5. USUÁRIO ADMINISTRATIVO DE PONTE
    -- ================================================================
    -- O login precisa ser o mesmo login usado pela V2 para o usuário
    -- que fizer a primeira validação da V3.
    --
    -- Não há senha aqui.
    --
    insert into public.usuarios (usuario, nome, ativo)
    values ('admin', 'ADMINISTRADOR', true)
    on conflict (usuario) do update
    set nome = excluded.nome,
        ativo = true;

    select id into v_admin_user_id
    from public.usuarios
    where usuario = 'admin';

    -- ================================================================
    -- 6. VÍNCULO DO ADMIN
    -- ================================================================

    insert into public.membros_organizacao (
        usuario_id,
        empresa_id,
        unidade_id,
        papel_id
    )
    select
        v_admin_user_id,
        v_empresa_id,
        v_unidade_id,
        v_admin_role_id
    where not exists (
        select 1
        from public.membros_organizacao mo
        where mo.usuario_id = v_admin_user_id
          and mo.empresa_id = v_empresa_id
          and mo.unidade_id = v_unidade_id
    );

    -- ================================================================
    -- 7. CONFIGURAÇÃO MÍNIMA
    -- ================================================================

    insert into public.configuracoes_sistema (
        escopo,
        empresa_id,
        chave,
        valor
    )
    values
        ('empresa', v_empresa_id, 'nome_loja', '"ESPETINHO & CIA"'::jsonb),
        ('empresa', v_empresa_id, 'ticket_layout', '"padrao"'::jsonb),
        ('empresa', v_empresa_id, 'loja_aberta', 'true'::jsonb)
    on conflict do nothing;
end;
$$;

commit;
