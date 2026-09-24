/* =================================================================================
   SERVIÇO V3 — ESTOQUE
   ---------------------------------------------------------------------------------
   Camada de aplicação preparada para substituir gradualmente as chamadas
   diretas ao Supabase usadas hoje nos módulos legados.

   IMPORTANTE:
   - Este arquivo não altera os fluxos atuais da V2.
   - Os chamadores devem informar explicitamente unidadeId e usuarioId.
   - Esses IDs são contexto de aplicação; autorização definitiva será feita
     no backend/RLS conforme a arquitetura V3.
   ================================================================================= */

(function () {
    'use strict';

    function exigirSupabase() {
        if (typeof _supabase === 'undefined') {
            throw new Error('Supabase não inicializado.');
        }
    }

    function gerarOperacaoId() {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }

        throw new Error('O navegador não oferece crypto.randomUUID().');
    }

    function validarContexto(unidadeId, usuarioId) {
        if (!unidadeId) {
            throw new Error('unidadeId é obrigatório.');
        }

        if (usuarioId === null || usuarioId === undefined || usuarioId === '') {
            throw new Error('usuarioId é obrigatório.');
        }
    }

    function normalizarItens(itens) {
        if (!Array.isArray(itens) || itens.length === 0) {
            throw new Error('A operação deve possuir pelo menos um item.');
        }

        return itens.map((item) => ({
            id: Number(item.id),
            qtd: Number(item.qtd)
        }));
    }

    async function registrarMovimentacoes({
        unidadeId,
        usuarioId,
        tipo,
        itens,
        motivo,
        operacaoId = gerarOperacaoId()
    }) {
        exigirSupabase();
        validarContexto(unidadeId, usuarioId);

        const tipoNormalizado = String(tipo || '').toLowerCase();

        if (!['entrada', 'saida'].includes(tipoNormalizado)) {
            throw new Error('tipo deve ser entrada ou saida.');
        }

        const itensNormalizados = normalizarItens(itens);

        if (!String(motivo || '').trim()) {
            throw new Error('motivo é obrigatório.');
        }

        const { data, error } = await _supabase.rpc('registrar_movimentacoes_estoque_v3', {
            p_unidade_id: unidadeId,
            p_usuario_id: Number(usuarioId),
            p_tipo: tipoNormalizado,
            p_itens: itensNormalizados,
            p_motivo: String(motivo).trim(),
            p_operacao_id: operacaoId
        });

        if (error) {
            throw error;
        }

        return data;
    }

    async function registrarEntrada(args) {
        return registrarMovimentacoes({
            ...args,
            tipo: 'entrada'
        });
    }

    async function registrarSaida(args) {
        return registrarMovimentacoes({
            ...args,
            tipo: 'saida'
        });
    }

    async function concluirInventario({
        unidadeId,
        usuarioId,
        linhas,
        observacao = '',
        operacaoId = gerarOperacaoId()
    }) {
        exigirSupabase();
        validarContexto(unidadeId, usuarioId);

        if (!Array.isArray(linhas) || linhas.length === 0) {
            throw new Error('O inventário deve possuir pelo menos uma linha.');
        }

        const linhasNormalizadas = linhas.map((linha) => ({
            id: Number(linha.id),
            contagem_fisica: Number(linha.contagem_fisica)
        }));

        const { data, error } = await _supabase.rpc('concluir_inventario_v3', {
            p_unidade_id: unidadeId,
            p_usuario_id: Number(usuarioId),
            p_linhas: linhasNormalizadas,
            p_observacao: String(observacao || '').trim(),
            p_operacao_id: operacaoId
        });

        if (error) {
            throw error;
        }

        return data;
    }

    window.estoqueServiceV3 = {
        gerarOperacaoId,
        registrarMovimentacoes,
        registrarEntrada,
        registrarSaida,
        concluirInventario
    };
})();
