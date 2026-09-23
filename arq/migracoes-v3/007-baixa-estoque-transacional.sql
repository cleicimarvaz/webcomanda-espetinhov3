-- =====================================================================
-- WEBCOMANDA ESPETINHO V3
-- MIGRATION 007 — BAIXA DE ESTOQUE TRANSACIONAL
-- =====================================================================
-- STATUS: RASCUNHO / NÃO EXECUTAR EM PRODUÇÃO
--
-- Prepara uma operação transacional para a baixa de estoque.
-- A V2 ainda NÃO deve chamar esta função nesta etapa.
-- =====================================================================

begin;

-- Chave de idempotência da operação de estoque.
alter table public.estoque_movimentacoes
    add column if not exists operacao_id uuid;

create unique index if not exists ux_estoque_mov_operacao_produto_tipo
    on public.estoque_movimentacoes(operacao_id, produto_id, tipo)
    where operacao_id is not null;

create or replace function public.registrar_baixa_estoque_v3(
    p_unidade_id uuid,
    p_usuario_id bigint,
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
    v_empresa_unidade uuid;
    v_empresa_produto uuid;
    v_controla_estoque boolean;
    v_saldo numeric(12,3);
    v_novo_saldo numeric(12,3);
    v_processados integer := 0;
    v_movimentacoes jsonb := '[]'::jsonb;
    rec record;
begin
    if p_unidade_id is null then
        raise exception 'unidade_id é obrigatório.';
    end if;

    if p_operacao_id is null then
        raise exception 'operacao_id é obrigatório.';
    end if;

    if p_itens is null or jsonb_typeof(p_itens) <> 'array' then
        raise exception 'p_itens deve ser um array JSON.';
    end if;

    select u.empresa_id
      into v_empresa_unidade
      from public.unidades u
     where u.id = p_unidade_id;

    if v_empresa_unidade is null then
        raise exception 'Unidade não encontrada.';
    end if;

    -- Retry idempotente: se esta operação já foi concluída, não baixa novamente.
    if exists (
        select 1
        from public.estoque_movimentacoes m
        where m.operacao_id = p_operacao_id
          and m.tipo = 'saida'
    ) then
        return jsonb_build_object(
            'ok', true,
            'idempotente', true,
            'operacao_id', p_operacao_id
        );
    end if;

    -- Agrupa produtos repetidos antes de alterar o saldo.
    for rec in
        select
            (item->>'id')::bigint as produto_id,
            sum(coalesce(nullif(item->>'qtd', '')::numeric, 0))::numeric(12,3) as quantidade
        from jsonb_array_elements(p_itens) item
        group by (item->>'id')::bigint
    loop
        if rec.produto_id is null or rec.quantidade <= 0 then
            continue;
        end if;

        select
            p.empresa_id,
            p.controlar_estoque
        into
            v_empresa_produto,
            v_controla_estoque
        from public.produtos p
        where p.id = rec.produto_id;

        if v_empresa_produto is null then
            raise exception 'Produto % não encontrado.', rec.produto_id;
        end if;

        if v_empresa_produto <> v_empresa_unidade then
            raise exception 'Produto % não pertence à empresa da unidade.', rec.produto_id;
        end if;

        -- Mantém a regra atual: produtos sem controle de estoque são ignorados.
        if coalesce(v_controla_estoque, false) = false then
            continue;
        end if;

        -- Garante uma posição para o par produto/unidade.
        insert into public.estoque_produto_unidade (
            produto_id, unidade_id, saldo
        )
        values (
            rec.produto_id, p_unidade_id, 0
        )
        on conflict (produto_id, unidade_id) do nothing;

        -- Bloqueia a posição durante a transação.
        select e.saldo
          into v_saldo
          from public.estoque_produto_unidade e
         where e.produto_id = rec.produto_id
           and e.unidade_id = p_unidade_id
         for update;

        v_novo_saldo := coalesce(v_saldo, 0) - rec.quantidade;

        -- Durante a transição, permitimos saldo negativo para preservar
        -- o comportamento da V2. A regra definitiva será decidida depois.
        update public.estoque_produto_unidade
           set saldo = v_novo_saldo,
               updated_at = now()
         where produto_id = rec.produto_id
           and unidade_id = p_unidade_id;

        insert into public.estoque_movimentacoes (
            produto_id,
            unidade_id,
            tipo,
            quantidade,
            motivo,
            usuario_id,
            operacao_id
        )
        values (
            rec.produto_id,
            p_unidade_id,
            'saida',
            rec.quantidade,
            p_motivo,
            p_usuario_id,
            p_operacao_id
        );

        v_processados := v_processados + 1;
        v_movimentacoes := v_movimentacoes || jsonb_build_array(
            jsonb_build_object(
                'produto_id', rec.produto_id,
                'quantidade', rec.quantidade,
                'saldo_anterior', v_saldo,
                'saldo_novo', v_novo_saldo
            )
        );
    end loop;

    return jsonb_build_object(
        'ok', true,
        'idempotente', false,
        'operacao_id', p_operacao_id,
        'produtos_processados', v_processados,
        'movimentacoes', v_movimentacoes
    );
end;
$$;

comment on function public.registrar_baixa_estoque_v3(uuid, bigint, jsonb, text, uuid)
    is 'Baixa transacional de estoque por unidade para a V3. Ainda não integrada ao frontend legado.';

commit;