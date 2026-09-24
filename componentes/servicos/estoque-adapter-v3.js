/* =================================================================================
   ADAPTADOR V3 — MOVIMENTAÇÃO MANUAL DE ESTOQUE
   ---------------------------------------------------------------------------------
   Ponte gradual entre o fluxo legado de produtos.js e o serviço V3.

   Feature flag:
       localStorage.setItem('v3_estoque_transacional', 'true')

   Quando desligado, o fluxo legado continua exatamente como antes.
   Quando ligado, a operação exige contexto organizacional e usa a RPC V3.
   ================================================================================= */

(function () {
    'use strict';

    const FEATURE_FLAG = 'v3_estoque_transacional';

    function estaAtivo() {
        return localStorage.getItem(FEATURE_FLAG) === 'true';
    }

    async function obterContextoComUnidade() {
        if (!window.organizacaoServiceV3) {
            throw new Error('Serviço de organização V3 não carregado.');
        }

        let contexto = await window.organizacaoServiceV3.obterContextoAtual();

        if (!contexto.unidadeId && contexto.unidades.length === 1) {
            contexto = await window.organizacaoServiceV3.definirUnidadeAtual(contexto.unidades[0].id);
        }

        if (!contexto.unidadeId) {
            throw new Error(
                contexto.unidades.length > 1
                    ? 'Selecione a unidade antes de movimentar o estoque.'
                    : 'Nenhuma unidade ativa está disponível para este usuário.'
            );
        }

        return contexto;
    }

    async function salvarMovimentacao({
        produtoId,
        tipo,
        quantidade,
        motivo
    }) {
        if (!estaAtivo()) {
            return {
                handled: false,
                data: null
            };
        }

        if (!window.estoqueServiceV3) {
            throw new Error('Serviço de estoque V3 não carregado.');
        }

        const contexto = await obterContextoComUnidade();

        const data = await window.estoqueServiceV3.registrarMovimentacoes({
            unidadeId: contexto.unidadeId,
            usuarioId: contexto.usuarioId,
            tipo,
            itens: [{
                id: produtoId,
                qtd: quantidade
            }],
            motivo
        });

        return {
            handled: true,
            data,
            contexto
        };
    }

    async function obterSaldos(produtoIds) {
        if (!estaAtivo()) {
            return {
                handled: false,
                data: null
            };
        }

        if (!window.estoqueServiceV3) {
            throw new Error('Serviço de estoque V3 não carregado.');
        }

        const contexto = await obterContextoComUnidade();

        const saldos = await window.estoqueServiceV3.listarSaldos({
            unidadeId: contexto.unidadeId,
            produtoIds
        });

        return {
            handled: true,
            data: saldos,
            contexto
        };
    }

    async function concluirInventario({
        linhas,
        observacao = ''
    }) {
        if (!estaAtivo()) {
            return {
                handled: false,
                data: null
            };
        }

        if (!window.estoqueServiceV3) {
            throw new Error('Serviço de estoque V3 não carregado.');
        }

        const contexto = await obterContextoComUnidade();

        const data = await window.estoqueServiceV3.concluirInventario({
            unidadeId: contexto.unidadeId,
            usuarioId: contexto.usuarioId,
            linhas,
            observacao
        });

        return {
            handled: true,
            data,
            contexto
        };
    }

    window.estoqueAdapterV3 = {
        estaAtivo,
        salvarMovimentacao,
        obterSaldos,
        concluirInventario
    };
})();
