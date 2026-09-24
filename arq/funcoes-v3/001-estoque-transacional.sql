-- =====================================================================
-- WEBCOMANDA ESPETINHO V3
-- FUNÇÕES 001 — ESTOQUE TRANSACIONAL
-- =====================================================================
-- Para o banco V3 novo criado por arq/schema-v3-base.sql.
--
-- Este arquivo NÃO é uma migration da V2.
-- Pode ser aplicado somente depois do schema base.
--
-- As funções usam SECURITY INVOKER e continuam dependentes da etapa
-- posterior de autenticação/RLS para segurança definitiva.
-- =====================================================================

begin;

-- =====================================================================
-- 1. VALIDAÇÃO DE CONTEXTO E VÍNCULO
-- =====================================================================

create or replace function public.validar_acesso_estoque_v3(
    p_unidade_id uuid,
    p_usuario_id bigint
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
    v_empresa_id uuid;
begin
    if p_unidade_id is null then
        raise exception 'unidade_id é obrigatório.';
    end if;

    if p_usuario_id is null then
        raise exception 'usuario_id é obrigatório.';
    end if;

    select u.empresa_id
      into v_empresa_id
      from public.unidades u
     where u.id = p_unidade_id
       and u.status = 'ativa';

    if v_empresa_id is null then
        raise exception 'Unidade ativa não encontrada.';
    end if;

    if not exists (
        select 1
        from public.usuarios u
        where u.id = p_usuario_id
          and u.ativo = true
    ) then
        raise exception 'Usuário ativo não encontrado.';
    end if;

    if not exists (
        select 1
        from public.membros_organizacao mo
        where mo.usuario_id = p_usuario_id
          and mo.empresa_id = v_empresa_id
          and mo.ativo = true
          and (
              mo.unidade_id is null
              or mo.unidade_id = p_unidade_id
          )
    ) then
        raise exception 'Usuário não possui vínculo ativo com a unidade.';
    end if;

    return v_empresa_id;
end;
$$;

comment on function public.validar_acesso_estoque_v3(uuid, bigint)
    is 'Valida usuário, unidade ativa e vínculo organizacional da operação de estoque V3.';

-- =====================================================================
-- 2. MOVIMENTAÇÃO MANUAL DE ESTOQUE
-- =====================================================================

create or replace function public.registrar_movimentacoes_estoque_v3(
    p_unidade_id uuid,
    p_usuario_id bigint,
    p_tipo text,
    p_itens jsonb,
    p_motivo text,
    p_operacao_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
    v_empresa_id uuid;
    v_usuario_nome text;
    v_saldo numeric(12,3);
    v_novo_saldo numeric(12,3);
    v_processados integer := 0;
    v_movimentacoes jsonb := '[]'::jsonb;
    rec record;
begin
    if lower(coalesce(p_tipo, '')) not in ('entrada', 'saida') then
        raise exception 'Tipo de movimentação inválido. Use entrada ou saida.';
    end if;

    if p_operacao_id is null then
        raise exception 'operacao_id é obrigatório.';
    end if;

    if p_itens is null or jsonb_typeof(p_itens) <> 'array' then
        raise exception 'p_itens deve ser um array JSON.';
    end if;

    if jsonb_array_length(p_itens) = 0 then
        raise exception 'A operação deve possuir pelo menos um item.';
    end if;

    if nullif(trim(coalesce(p_motivo, '')), '') is null then
        raise exception 'Motivo é obrigatório.';
    end if;

    perform pg_advisory_xact_lock(
        hashtextextended(p_operacao_id::text, 0)
    );

    v_empresa_id := public.validar_acesso_estoque_v3(
        p_unidade_id,
        p_usuario_id
    );

    select u.usuario
      into v_usuario_nome
      from public.usuarios u
     where u.id = p_usuario_id;

    if v_usuario_nome is null then
        raise exception 'Usuário não encontrado.';
    end if;

    if exists (
        select 1
        from public.estoque_movimentacoes m
        where m.operacao_id = p_operacao_id
    ) then
        return jsonb_build_object(
            'ok', true,
            'idempotente', true,
            'operacao_id', p_operacao_id
        );
    end if;

    if exists (
        select 1
        from jsonb_array_elements(p_itens) item
        where not (item ? 'id')
           or not (item ? 'qtd')
           or coalesce(item->>'id', '') !~ '^[0-9]+$'
           or coalesce(item->>'qtd', '') !~ '^[0-9]+([.][0-9]+)?$'
           or (
               (item->>'qtd') ~ '^[0-9]+([.][0-9]+)?$'
               and (item->>'qtd')::numeric <= 0
           )
    ) then
        raise exception 'Existem itens com id ou quantidade inválidos.';
    end if;

    for rec in
        select
            (item->>'id')::bigint as produto_id,
            sum((item->>'qtd')::numeric)::numeric(12,3) as quantidade
        from jsonb_array_elements(p_itens) item
        group by (item->>'id')::bigint
        order by (item->>'id')::bigint
    loop
        if not exists (
            select 1
            from public.produtos p
            where p.id = rec.produto_id
              and p.empresa_id = v_empresa_id
              and p.ativo = true
        ) then
            raise exception 'Produto % não pertence à empresa ou está inativo.', rec.produto_id;
        end if;

        if not exists (
            select 1
            from public.produtos p
            where p.id = rec.produto_id
              and p.controlar_estoque = true
        ) then
            raise exception 'Produto % não está configurado para controlar estoque.', rec.produto_id;
        end if;

        insert into public.estoque_produto_unidade (
            produto_id,
            unidade_id,
            saldo
        )
        values (
            rec.produto_id,
            p_unidade_id,
            0
        )
        on conflict (produto_id, unidade_id) do nothing;

        select e.saldo
          into v_saldo
          from public.estoque_produto_unidade e
         where e.produto_id = rec.produto_id
           and e.unidade_id = p_unidade_id
         for update;

        if lower(p_tipo) = 'entrada' then
            v_novo_saldo := coalesce(v_saldo, 0) + rec.quantidade;
        else
            -- Regra de transição: o saldo negativo continua permitido.
            v_novo_saldo := coalesce(v_saldo, 0) - rec.quantidade;
        end if;

        update public.estoque_produto_unidade
           set saldo = v_novo_saldo,
               updated_at = now()
         where produto_id = rec.produto_id
           and unidade_id = p_unidade_id;

        insert into public.estoque_movimentacoes (
            empresa_id,
            produto_id,
            unidade_id,
            tipo,
            quantidade,
            saldo_anterior,
            saldo_novo,
            motivo,
            usuario_id,
            operacao_id
        )
        values (
            v_empresa_id,
            rec.produto_id,
            p_unidade_id,
            lower(p_tipo),
            rec.quantidade,
            v_saldo,
            v_novo_saldo,
            upper(trim(p_motivo)),
            p_usuario_id,
            p_operacao_id
        );

        v_processados := v_processados + 1;
        v_movimentacoes := v_movimentacoes || jsonb_build_array(
            jsonb_build_object(
                'produto_id', rec.produto_id,
                'tipo', lower(p_tipo),
                'quantidade', rec.quantidade,
                'saldo_anterior', v_saldo,
                'saldo_novo', v_novo_saldo
            )
        );
    end loop;

    insert into public.auditoria (
        usuario_id,
        empresa_id,
        unidade_id,
        tipo,
        action,
        description,
        entidade,
        entidade_id,
        origem
    )
    values (
        p_usuario_id,
        v_empresa_id,
        p_unidade_id,
        'ESTOQUE',
        'MOVIMENTAÇÃO DE ESTOQUE V3',
        format(
            'OPERAÇÃO: %s | TIPO: %s | PRODUTOS: %s | MOTIVO: %s',
            p_operacao_id,
            upper(p_tipo),
            v_processados,
            upper(trim(p_motivo))
        ),
        'estoque_movimentacoes',
        p_operacao_id::text,
        'v3'
    );

    return jsonb_build_object(
        'ok', true,
        'idempotente', false,
        'operacao_id', p_operacao_id,
        'tipo', lower(p_tipo),
        'produtos_processados', v_processados,
        'movimentacoes', v_movimentacoes
    );
end;
$$;

comment on function public.registrar_movimentacoes_estoque_v3(uuid, bigint, text, jsonb, text, uuid)
    is 'Entrada ou saída manual de estoque por unidade, com bloqueio, histórico, contexto organizacional e idempotência.';

-- =====================================================================
-- 3. INVENTÁRIO FÍSICO
-- =====================================================================

create or replace function public.concluir_inventario_v3(
    p_unidade_id uuid,
    p_usuario_id bigint,
    p_linhas jsonb,
    p_observacao text,
    p_operacao_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
    v_empresa_id uuid;
    v_usuario_nome text;
    v_inventario_id bigint;
    v_saldo numeric(12,3);
    v_diferenca numeric(12,3);
    v_total_produtos integer := 0;
    v_total_ajustados integer := 0;
    v_movimentacoes jsonb := '[]'::jsonb;
    rec record;
begin
    if p_operacao_id is null then
        raise exception 'operacao_id é obrigatório.';
    end if;

    if p_linhas is null or jsonb_typeof(p_linhas) <> 'array' then
        raise exception 'p_linhas deve ser um array JSON.';
    end if;

    if jsonb_array_length(p_linhas) = 0 then
        raise exception 'O inventário deve possuir pelo menos uma linha.';
    end if;

    perform pg_advisory_xact_lock(
        hashtextextended(p_operacao_id::text, 0)
    );

    v_empresa_id := public.validar_acesso_estoque_v3(
        p_unidade_id,
        p_usuario_id
    );

    select u.usuario
      into v_usuario_nome
      from public.usuarios u
     where u.id = p_usuario_id;

    if v_usuario_nome is null then
        raise exception 'Usuário não encontrado.';
    end if;

    select i.id
      into v_inventario_id
      from public.inventarios i
     where i.operacao_id = p_operacao_id;

    if v_inventario_id is not null then
        return jsonb_build_object(
            'ok', true,
            'idempotente', true,
            'operacao_id', p_operacao_id,
            'inventario_id', v_inventario_id
        );
    end if;

    if exists (
        select 1
        from jsonb_array_elements(p_linhas) item
        where not (item ? 'id')
           or not (item ? 'contagem_fisica')
           or coalesce(item->>'id', '') !~ '^[0-9]+$'
           or coalesce(item->>'contagem_fisica', '') !~ '^[0-9]+([.][0-9]+)?$'
           or (
               (item->>'contagem_fisica') ~ '^[0-9]+([.][0-9]+)?$'
               and (item->>'contagem_fisica')::numeric < 0
           )
    ) then
        raise exception 'Existem linhas com produto ou contagem física inválidos.';
    end if;

    if exists (
        select 1
        from (
            select (item->>'id')::bigint as produto_id
            from jsonb_array_elements(p_linhas) item
        ) x
        group by produto_id
        having count(*) > 1
    ) then
        raise exception 'O mesmo produto não pode aparecer mais de uma vez no inventário.';
    end if;

    select count(*)
      into v_total_produtos
      from jsonb_array_elements(p_linhas);

    insert into public.inventarios (
        empresa_id,
        unidade_id,
        usuario_id,
        operacao_id,
        total_produtos,
        total_ajustados,
        observacao
    )
    values (
        v_empresa_id,
        p_unidade_id,
        p_usuario_id,
        p_operacao_id,
        v_total_produtos,
        0,
        nullif(trim(p_observacao), '')
    )
    returning id into v_inventario_id;

    for rec in
        select
            (item->>'id')::bigint as produto_id,
            (item->>'contagem_fisica')::numeric(12,3) as contagem_fisica
        from jsonb_array_elements(p_linhas) item
        order by (item->>'id')::bigint
    loop
        if not exists (
            select 1
            from public.produtos p
            where p.id = rec.produto_id
              and p.empresa_id = v_empresa_id
              and p.ativo = true
        ) then
            raise exception 'Produto % não pertence à empresa ou está inativo.', rec.produto_id;
        end if;

        if not exists (
            select 1
            from public.produtos p
            where p.id = rec.produto_id
              and p.controlar_estoque = true
        ) then
            raise exception 'Produto % não está configurado para controlar estoque.', rec.produto_id;
        end if;

        insert into public.estoque_produto_unidade (
            produto_id,
            unidade_id,
            saldo
        )
        values (
            rec.produto_id,
            p_unidade_id,
            0
        )
        on conflict (produto_id, unidade_id) do nothing;

        select e.saldo
          into v_saldo
          from public.estoque_produto_unidade e
         where e.produto_id = rec.produto_id
           and e.unidade_id = p_unidade_id
         for update;

        v_diferenca := rec.contagem_fisica - coalesce(v_saldo, 0);

        if v_diferenca <> 0 then
            update public.estoque_produto_unidade
               set saldo = rec.contagem_fisica,
                   updated_at = now()
             where produto_id = rec.produto_id
               and unidade_id = p_unidade_id;

            insert into public.estoque_movimentacoes (
                empresa_id,
                produto_id,
                unidade_id,
                tipo,
                quantidade,
                saldo_anterior,
                saldo_novo,
                motivo,
                usuario_id,
                inventario_id,
                operacao_id
            )
            values (
                v_empresa_id,
                rec.produto_id,
                p_unidade_id,
                case when v_diferenca > 0 then 'entrada' else 'saida' end,
                abs(v_diferenca),
                v_saldo,
                rec.contagem_fisica,
                format('INVENTÁRIO #%s (CONTAGEM FÍSICA)', v_inventario_id),
                p_usuario_id,
                v_inventario_id,
                p_operacao_id
            );

            v_total_ajustados := v_total_ajustados + 1;

            v_movimentacoes := v_movimentacoes || jsonb_build_array(
                jsonb_build_object(
                    'produto_id', rec.produto_id,
                    'saldo_anterior', v_saldo,
                    'contagem_fisica', rec.contagem_fisica,
                    'diferenca', v_diferenca,
                    'tipo', case when v_diferenca > 0 then 'entrada' else 'saida' end,
                    'quantidade', abs(v_diferenca)
                )
            );
        end if;
    end loop;

    update public.inventarios
       set total_ajustados = v_total_ajustados
     where id = v_inventario_id;

    insert into public.auditoria (
        usuario_id,
        empresa_id,
        unidade_id,
        tipo,
        action,
        description,
        entidade,
        entidade_id,
        origem
    )
    values (
        p_usuario_id,
        v_empresa_id,
        p_unidade_id,
        'ESTOQUE',
        'INVENTÁRIO V3 CONCLUÍDO',
        format(
            'OPERAÇÃO: %s | INVENTÁRIO: %s | PRODUTOS: %s | AJUSTADOS: %s',
            p_operacao_id,
            v_inventario_id,
            v_total_produtos,
            v_total_ajustados
        ),
        'inventarios',
        v_inventario_id::text,
        'v3'
    );

    return jsonb_build_object(
        'ok', true,
        'idempotente', false,
        'operacao_id', p_operacao_id,
        'inventario_id', v_inventario_id,
        'total_produtos', v_total_produtos,
        'total_ajustados', v_total_ajustados,
        'movimentacoes', v_movimentacoes
    );
end;
$$;

comment on function public.concluir_inventario_v3(uuid, bigint, jsonb, text, uuid)
    is 'Conclui inventário físico por unidade usando o saldo V3 bloqueado no servidor.';

commit;
