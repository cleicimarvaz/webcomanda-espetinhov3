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
        if (typeof _supabaseV3 === 'undefined' || !_supabaseV3) {
            throw new Error('Banco V3 não inicializado.');
        }
    }

    async function obterUsuarioId() {
        exigirSupabase();

        // Durante a transição, a sessão ainda é criada pela V2.
        // O banco V3 resolve o usuário pelo login, evitando depender do mesmo
        // ID numérico entre bancos diferentes.
        const login = localStorage.getItem('userLogin');

        if (!login) {
            throw new Error('Login do usuário não encontrado na sessão atual.');
        }

        const { data: usuario, error } = await _supabaseV3
            .from('usuarios')
            .select('id')
            .eq('usuario', login)
            .eq('ativo', true)
            .maybeSingle();

        if (error) {
            throw error;
        }

        if (!usuario) {
            throw new Error('Usuário da sessão não foi encontrado no banco V3.');
        }

        return usuario.id;
    }

    async function listarVinculos() {
        exigirSupabase();

        const usuarioId = await obterUsuarioId();

        const { data: membros, error: erroMembros } = await _supabaseV3
            .from('membros_organizacao')
            .select('id, empresa_id, unidade_id, papel_id, ativo')
            .eq('usuario_id', usuarioId)
            .eq('ativo', true);

        if (erroMembros) throw erroMembros;

        const vinculos = membros || [];

        const unidadeIdsDiretas = [
            ...new Set(vinculos.map((m) => m.unidade_id).filter(Boolean))
        ];

        const empresasComEscopoGlobal = [
            ...new Set(
                vinculos
                    .filter((m) => !m.unidade_id)
                    .map((m) => m.empresa_id)
                    .filter(Boolean)
            )
        ];

        const unidadesPorId = new Map();

        // Vínculo direto: somente as unidades explicitamente vinculadas.
        if (unidadeIdsDiretas.length > 0) {
            const { data, error } = await _supabaseV3
                .from('unidades')
                .select('id, empresa_id, nome, status')
                .in('id', unidadeIdsDiretas)
                .eq('status', 'ativa')
                .order('nome');

            if (error) throw error;
            for (const unidade of data || []) {
                unidadesPorId.set(unidade.id, unidade);
            }
        }

        // Escopo empresarial: todas as unidades ativas da empresa.
        if (empresasComEscopoGlobal.length > 0) {
            const { data, error } = await _supabaseV3
                .from('unidades')
                .select('id, empresa_id, nome, status')
                .in('empresa_id', empresasComEscopoGlobal)
                .eq('status', 'ativa')
                .order('nome');

            if (error) throw error;
            for (const unidade of data || []) {
                unidadesPorId.set(unidade.id, unidade);
            }
        }

        const unidades = [...unidadesPorId.values()].sort((a, b) =>
            String(a.nome || '').localeCompare(String(b.nome || ''))
        );

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

        const unidade = dados.unidades.find((item) => String(item.id) === String(unidadeId));

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

        localStorage.setItem(STORAGE_KEY_UNIDADE, String(unidade.id));

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
