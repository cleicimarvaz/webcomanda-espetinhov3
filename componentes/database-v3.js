/* =================================================================================
   CONEXÃO COM BANCO DE DADOS — V3
   ---------------------------------------------------------------------------------
   Cliente separado do banco usado pela V2.

   A V2 continua usando window._supabase.
   A V3 usa window._supabaseV3.
   ================================================================================= */

window._supabaseV3 = null;

function notificarErroBancoV3(mensagem) {
    console.error('❌ [DATABASE V3]:', mensagem);

    if (typeof window.showToast === 'function') {
        window.showToast(mensagem, 'erro');
    }
}

try {
    if (typeof supabase === 'undefined') {
        throw new Error('Biblioteca Supabase (CDN) não encontrada.');
    }

    if (
        typeof SUPABASE_V3_URL !== 'string' ||
        !SUPABASE_V3_URL ||
        SUPABASE_V3_URL.includes('COLOQUE_A_URL')
    ) {
        throw new Error('URL do banco V3 ainda não configurada.');
    }

    if (
        typeof SUPABASE_V3_KEY !== 'string' ||
        !SUPABASE_V3_KEY ||
        SUPABASE_V3_KEY.includes('COLOQUE_A_CHAVE')
    ) {
        throw new Error('Chave pública do banco V3 ainda não configurada.');
    }

    window._supabaseV3 = supabase.createClient(
        SUPABASE_V3_URL,
        SUPABASE_V3_KEY
    );

    console.log('✅ [DATABASE V3] Cliente Supabase V3 inicializado.');
} catch (err) {
    console.warn('⚠️ [DATABASE V3] Banco V3 ainda não configurado:', err.message);
    notificarErroBancoV3('Banco V3 ainda não configurado.');
}

window.isDatabaseV3Ready = function () {
    return window._supabaseV3 !== null;
};
