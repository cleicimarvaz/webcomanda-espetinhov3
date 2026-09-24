-- =====================================================================
-- WEBCOMANDA ESPETINHO V3
-- TESTE 003 — SMOKE TEST DO ESTOQUE TRANSACIONAL
-- =====================================================================
-- O teste usa uma transação e termina com ROLLBACK.
-- Portanto, não deixa produto, saldo, movimentação ou auditoria de teste.
--
-- Pré-requisitos:
--   arq/schema-v3-base.sql
--   arq/funcoes-v3/001-estoque-transacional.sql
--   arq/seeds-v3/001-bootstrap-administrativo.sql
-- =====================================================================

begin;

do $$
declare
    v_empresa_id uuid;
    v_unidade_id uuid;
    v_usuario_id bigint;
    v_produto_id bigint;
    v_operacao_entrada uuid := gen_random_uuid();
    v_operacao_saida uuid := gen_random_uuid();
    v_operacao_inventario uuid := gen_random_uuid();
    v_saldo numeric(12,3);
    v_resultado jsonb;
begin
    -- ---------------------------------------------------------------
    -- 1. Localiza o bootstrap
    -- ---------------------------------------------------------------
    select e.id, u.id, us.id
      into v_empresa_id, v_unidade_id, v_usuario_id
      from public.empresas e
      join public.unidades u
        on u.empresa_id = e.id
      cross join public.usuarios us
     where upper(e.nome) = 'ESPETINHO & CIA'
       and upper(u.nome) = 'UNIDADE PRINCIPAL'
       and us.usuario = 'admin'
       and e.status = 'ativa'
       and u.status = 'ativa'
       and us.ativo = true
     limit 1;

    if v_empresa_id is null or v_unidade_id is null or v_usuario_id is null then
        raise exception 'Bootstrap administrativo não encontrado.';
    end if;

    -- ---------------------------------------------------------------
    -- 2. Cria produto temporário
    -- ---------------------------------------------------------------
    insert into public.produtos (
        empresa_id,
        nome,
        categoria,
        preco,
        custo,
        controlar_estoque,
        ativo
    )
    values (
        v_empresa_id,
        '__TESTE ESTOQUE V3__',
        'teste',
        1.00,
        0.50,
        true,
        true
    )
    returning id into v_produto_id;

    -- ---------------------------------------------------------------
    -- 3. Entrada de 10
    -- ---------------------------------------------------------------
    v_resultado := public.registrar_movimentacoes_estoque_v3(
        v_unidade_id,
        v_usuario_id,
        'entrada',
        jsonb_build_array(
            jsonb_build_object('id', v_produto_id, 'qtd', 10)
        ),
        'SMOKE TEST',
        v_operacao_entrada
    );

    if coalesce((v_resultado->>'ok')::boolean, false) is not true then
        raise exception 'A entrada transacional não retornou ok=true.';
    end if;

    select saldo
      into v_saldo
      from public.estoque_produto_unidade
     where produto_id = v_produto_id
       and unidade_id = v_unidade_id;

    if v_saldo <> 10 then
        raise exception 'Saldo após entrada deveria ser 10, encontrado: %', v_saldo;
    end if;

    -- ---------------------------------------------------------------
    -- 4. Saída de 3
    -- ---------------------------------------------------------------
    v_resultado := public.registrar_movimentacoes_estoque_v3(
        v_unidade_id,
        v_usuario_id,
        'saida',
        jsonb_build_array(
            jsonb_build_object('id', v_produto_id, 'qtd', 3)
        ),
        'SMOKE TEST',
        v_operacao_saida
    );

    select saldo
      into v_saldo
      from public.estoque_produto_unidade
     where produto_id = v_produto_id
       and unidade_id = v_unidade_id;

    if v_saldo <> 7 then
        raise exception 'Saldo após saída deveria ser 7, encontrado: %', v_saldo;
    end if;

    -- ---------------------------------------------------------------
    -- 5. Idempotência: repetir a entrada não pode dobrar o saldo
    -- ---------------------------------------------------------------
    v_resultado := public.registrar_movimentacoes_estoque_v3(
        v_unidade_id,
        v_usuario_id,
        'entrada',
        jsonb_build_array(
            jsonb_build_object('id', v_produto_id, 'qtd', 10)
        ),
        'SMOKE TEST',
        v_operacao_entrada
    );

    if coalesce((v_resultado->>'idempotente')::boolean, false) is not true then
        raise exception 'A segunda execução da mesma operação deveria ser idempotente.';
    end if;

    select saldo
      into v_saldo
      from public.estoque_produto_unidade
     where produto_id = v_produto_id
       and unidade_id = v_unidade_id;

    if v_saldo <> 7 then
        raise exception 'Idempotência falhou: saldo esperado 7, encontrado %.', v_saldo;
    end if;

    -- ---------------------------------------------------------------
    -- 6. Inventário: saldo físico 5
    -- ---------------------------------------------------------------
    v_resultado := public.concluir_inventario_v3(
        v_unidade_id,
        v_usuario_id,
        jsonb_build_array(
            jsonb_build_object('id', v_produto_id, 'contagem_fisica', 5)
        ),
        'SMOKE TEST',
        v_operacao_inventario
    );

    select saldo
      into v_saldo
      from public.estoque_produto_unidade
     where produto_id = v_produto_id
       and unidade_id = v_unidade_id;

    if v_saldo <> 5 then
        raise exception 'Saldo após inventário deveria ser 5, encontrado: %', v_saldo;
    end if;

    raise notice 'SMOKE TEST V3 OK: entrada=10, saída=3, idempotência=OK, inventário=5.';
end;
$$;

-- Os SELECTs abaixo mostram evidências antes do rollback.
select
    p.nome,
    e.unidade_id,
    e.saldo
from public.estoque_produto_unidade e
join public.produtos p on p.id = e.produto_id
where p.nome = '__TESTE ESTOQUE V3__';

select
    m.tipo,
    m.quantidade,
    m.saldo_anterior,
    m.saldo_novo,
    m.motivo,
    m.operacao_id
from public.estoque_movimentacoes m
join public.produtos p on p.id = m.produto_id
where p.nome = '__TESTE ESTOQUE V3__'
order by m.created_at;

select
    i.id,
    i.total_produtos,
    i.total_ajustados,
    i.observacao,
    i.operacao_id
from public.inventarios i
where i.operacao_id is not null
  and i.observacao = 'SMOKE TEST'
order by i.created_at desc
limit 1;

rollback;
