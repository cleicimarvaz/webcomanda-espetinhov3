/* =================================================================================
   SERVIÇO V3 — CONTEXTO ORGANIZACIONAL
   ---------------------------------------------------------------------------------
   Resolve o contexto de empresa/unidade do usuário logado para os serviços V3.

   A seleção da unidade pode ficar no navegador, mas ela NÃO é uma autorização.
   O backend/RLS deve validar o vínculo novamente.
   ================================================================================= */

(function () {
    'use strict';

    const STORAGE_KEY_UNIDADE = 'v3_unidade_id_atual';

    function exigirSupabase() {
        if (typeof _supabase === 'undefined' || !_supabase) {
            throw new Error('Supabase não inicializado.');
        }
    }

    function obterUsuarioId() {
        const valor = localStorage.getItem('userId');

        if (valor === null || valor === undefined || valor === '') {
            throw new Error('Usuário não identificado na sessão atual.');
        }

        const id = Number(valor);

        if (!Number.isInteger(id) || id <= 0) {
            throw new Error('userId inválido na sessão atual.');
        }

        return id;
    }

    async function listarVinculos() {
        exigirSupabase();

        const usuarioId = obterUsuarioId();

        const { data: membros, error: erroMembros } = await _supabase
            .from('membros_organizacao')
            .select('id, empresa_id, unidade_id, papel_id, ativo')
            .eq('usuario_id', usuarioId)
            .eq('ativo', true);

        if (erroMembros) throw erroMembros;

        const vinculos = membros || [];
        const unidadeIds = [...new Set(vinculos.map((m) => m.unidade_id).filter(Boolean))];

        let unidades = [];

        if (unidadeIds.length > 0) {
            const { data, error } = await _supabase
                .from('unidades')
                .select('id, empresa_id, nome, status')
                .in('id', unidadeIds)
                .eq('status', 'ativa')
                .order('nome');

            if (error) throw error;
            unidades = data || [];
        }

        return {
            usuarioId,
            vinculos,
            unidades
        };
    }

    async function obterContextoAtual() {
        const dados = await listarVinculos();
        const unidadeId = localStorage.getItem(STORAGE_KEY_UNIDADE);

        if (!unidadeId) {
            return {
                usuarioId: dados.usuarioId,
                empresaId: null,
                unidadeId: null,
                unidade: null,
                unidades: dados.unidades,
                precisaSelecionarUnidade: dados.unidades.length !== 1
            };
        }

        const unidade = dados.unidades.find((item) => item.id === unidadeId);

        if (!unidade) {
            localStorage.removeItem(STORAGE_KEY_UNIDADE);

            return {
                usuarioId: dados.usuarioId,
                empresaId: null,
                unidadeId: null,
                unidade: null,
                unidades: dados.unidades,
                precisaSelecionarUnidade: true
            };
        }

        return {
            usuarioId: dados.usuarioId,
            empresaId: unidade.empresa_id,
            unidadeId: unidade.id,
            unidade,
            unidades: dados.unidades,
            precisaSelecionarUnidade: false
        };
    }

    async function definirUnidadeAtual(unidadeId) {
        if (!unidadeId) {
            throw new Error('unidadeId é obrigatório.');
        }

        const dados = await listarVinculos();
        const unidade = dados.unidades.find((item) => item.id === unidadeId);

        if (!unidade) {
            throw new Error('A unidade selecionada não está disponível para este usuário.');
        }

        localStorage.setItem(STORAGE_KEY_UNIDADE, unidade.id);

        return {
            usuarioId: dados.usuarioId,
            empresaId: unidade.empresa_id,
            unidadeId: unidade.id,
            unidade,
            unidades: dados.unidades,
            precisaSelecionarUnidade: false
        };
    }

    function limparUnidadeAtual() {
        localStorage.removeItem(STORAGE_KEY_UNIDADE);
    }

    window.organizacaoServiceV3 = {
        obterUsuarioId,
        listarVinculos,
        obterContextoAtual,
        definirUnidadeAtual,
        limparUnidadeAtual
    };
})();
