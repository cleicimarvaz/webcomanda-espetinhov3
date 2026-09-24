/* =================================================================================
   CONFIGURAÇÃO DO BANCO DE DADOS — V3
   ---------------------------------------------------------------------------------
   A configuração pode ser preenchida pela tela de Configurações.

   A URL e a chave pública do banco V3 ficam no armazenamento local deste
   navegador. Assim, a aplicação não precisa versionar a chave real no Git.

   ATENÇÃO:
   - usar somente chave pública/publishable no navegador;
   - nunca informar service_role/secret neste formulário;
   - a URL e a chave precisam pertencer ao mesmo projeto Supabase.
   ================================================================================= */

const SUPABASE_V3_CONFIG_STORAGE_KEY = 'webcomanda_v3_database_config';

const SUPABASE_V3_CONFIG_PADRAO = Object.freeze({
    url: '',
    key: ''
});

function lerConfiguracaoBancoV3() {
    try {
        const salvo = JSON.parse(
            localStorage.getItem(SUPABASE_V3_CONFIG_STORAGE_KEY) || 'null'
        );

        return {
            url: typeof salvo?.url === 'string' ? salvo.url.trim() : SUPABASE_V3_CONFIG_PADRAO.url,
            key: typeof salvo?.key === 'string' ? salvo.key.trim() : SUPABASE_V3_CONFIG_PADRAO.key
        };
    } catch (e) {
        console.warn('⚠️ [CONFIG V3] Configuração local inválida. Usando valores vazios.');
        return { ...SUPABASE_V3_CONFIG_PADRAO };
    }
}

function salvarConfiguracaoBancoV3(url, key) {
    const configuracao = {
        url: String(url || '').trim(),
        key: String(key || '').trim()
    };

    localStorage.setItem(
        SUPABASE_V3_CONFIG_STORAGE_KEY,
        JSON.stringify(configuracao)
    );

    return configuracao;
}

function limparConfiguracaoBancoV3() {
    localStorage.removeItem(SUPABASE_V3_CONFIG_STORAGE_KEY);
}

window.WEBCOMANDA_V3_CONFIG = {
    STORAGE_KEY: SUPABASE_V3_CONFIG_STORAGE_KEY,
    obter: lerConfiguracaoBancoV3,
    salvar: salvarConfiguracaoBancoV3,
    limpar: limparConfiguracaoBancoV3
};

Object.defineProperties(window.WEBCOMANDA_V3_CONFIG, {
    SUPABASE_URL: {
        enumerable: true,
        get() {
            return lerConfiguracaoBancoV3().url;
        }
    },
    SUPABASE_KEY: {
        enumerable: true,
        get() {
            return lerConfiguracaoBancoV3().key;
        }
    }
});
