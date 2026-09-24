/* =================================================================================
   CONEXÃO COM BANCO DE DADOS — V3
   ---------------------------------------------------------------------------------
   Cliente separado do banco usado pela V2.

   A V2 continua usando window._supabase.
   A V3 usa window._supabaseV3.
   ================================================================================= */

window._supabaseV3 = null;

function obterConfigBancoV3() {
    if (!window.WEBCOMANDA_V3_CONFIG) {
        throw new Error('Configuração do banco V3 não carregada.');
    }

    const config = window.WEBCOMANDA_V3_CONFIG.obter();

    if (!config.url) {
        throw new Error('URL do banco V3 ainda não configurada.');
    }

    if (!config.key) {
        throw new Error('Chave pública do banco V3 ainda não configurada.');
    }

    return config;
}

function validarUrlSupabaseV3(url) {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'https:' && parsed.hostname.endsWith('.supabase.co');
    } catch (e) {
        return false;
    }
}

async function inicializarBancoV3({ silencioso = false } = {}) {
    try {
        if (typeof supabase === 'undefined') {
            throw new Error('Biblioteca Supabase (CDN) não encontrada.');
        }

        const config = obterConfigBancoV3();

        if (!validarUrlSupabaseV3(config.url)) {
            throw new Error('URL do banco V3 inválida.');
        }

        if (!config.key) {
            throw new Error('Chave pública do banco V3 vazia.');
        }

        window._supabaseV3 = supabase.createClient(
            config.url,
            config.key
        );

        if (!silencioso) {
            console.log('✅ [DATABASE V3] Cliente Supabase V3 inicializado.');
        }

        return {
            ok: true,
            url: config.url
        };
    } catch (err) {
        window._supabaseV3 = null;

        if (!silencioso) {
            console.warn('⚠️ [DATABASE V3] Não inicializado:', err.message);
        }

        return {
            ok: false,
            error: err
        };
    }
}

window.inicializarBancoV3 = inicializarBancoV3;

window.reconectarBancoV3 = async function () {
    return inicializarBancoV3({ silencioso: true });
};

window.isDatabaseV3Ready = function () {
    return window._supabaseV3 !== null;
};

window.obterStatusBancoV3 = function () {
    const config = window.WEBCOMANDA_V3_CONFIG?.obter?.() || {
        url: '',
        key: ''
    };

    return {
        configurado: Boolean(config.url && config.key),
        url: config.url,
        clienteInicializado: window._supabaseV3 !== null
    };
};

document.addEventListener('DOMContentLoaded', () => {
    inicializarBancoV3({ silencioso: true });
});
