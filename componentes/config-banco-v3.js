/* =================================================================================
   CONFIGURAÇÃO DO BANCO V3 — INTERFACE ADMINISTRATIVA
   ================================================================================= */

window.carregarConfiguracaoBancoV3NaTela = function () {
    const inputUrl = document.getElementById('cfg-v3-supabase-url');
    const inputKey = document.getElementById('cfg-v3-supabase-key');

    if (!inputUrl || !inputKey || !window.WEBCOMANDA_V3_CONFIG) return;

    const config = window.WEBCOMANDA_V3_CONFIG.obter();

    inputUrl.value = config.url || '';
    inputKey.value = config.key || '';

    window.atualizarStatusBancoV3();
};

window.alternarVisibilidadeChaveBancoV3 = function () {
    const input = document.getElementById('cfg-v3-supabase-key');
    const botao = document.getElementById('btn-toggle-v3-key');

    if (!input) return;

    const mostrar = input.type === 'password';
    input.type = mostrar ? 'text' : 'password';

    if (botao) {
        botao.innerHTML = mostrar
            ? '<i data-lucide="eye-off" class="w-4 h-4" aria-hidden="true"></i>'
            : '<i data-lucide="eye" class="w-4 h-4" aria-hidden="true"></i>';
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
};

window.salvarConfiguracaoBancoV3NaTela = async function () {
    const inputUrl = document.getElementById('cfg-v3-supabase-url');
    const inputKey = document.getElementById('cfg-v3-supabase-key');
    const btn = document.getElementById('btn-salvar-banco-v3');

    const url = inputUrl?.value.trim() || '';
    const key = inputKey?.value.trim() || '';

    if (!url || !key) {
        if (typeof showToast === 'function') {
            showToast('INFORME A URL E A CHAVE PÚBLICA DO BANCO V3', 'erro');
        }
        return;
    }

    if (!url.startsWith('https://') || !url.includes('.supabase.co')) {
        if (typeof showToast === 'function') {
            showToast('URL DO SUPABASE INVÁLIDA', 'erro');
        }
        return;
    }

    if (btn) btn.disabled = true;

    try {
        window.WEBCOMANDA_V3_CONFIG.salvar(url, key);

        const resultado = await window.reconectarBancoV3();

        if (!resultado.ok) {
            throw resultado.error;
        }

        window.atualizarStatusBancoV3();

        if (typeof showToast === 'function') {
            showToast('CONFIGURAÇÃO DO BANCO V3 SALVA!', 'sucesso');
        }
    } catch (e) {
        console.error('Erro ao configurar banco V3:', e);
        if (typeof showToast === 'function') {
            showToast('CONFIGURAÇÃO SALVA, MAS NÃO FOI POSSÍVEL CONECTAR', 'erro');
        }
    } finally {
        if (btn) btn.disabled = false;
    }
};

window.testarConexaoBancoV3 = async function () {
    const inputUrl = document.getElementById('cfg-v3-supabase-url');
    const inputKey = document.getElementById('cfg-v3-supabase-key');

    const url = inputUrl?.value.trim() || '';
    const key = inputKey?.value.trim() || '';

    if (!url || !key) {
        if (typeof showToast === 'function') showToast('PREENCHA OS DADOS DO BANCO V3', 'erro');
        return;
    }

    try {
        window.WEBCOMANDA_V3_CONFIG.salvar(url, key);

        const resultado = await window.reconectarBancoV3();

        if (!resultado.ok) {
            throw resultado.error;
        }

        const { error } = await _supabaseV3
            .from('empresas')
            .select('id')
            .limit(1);

        if (error) throw error;

        window.atualizarStatusBancoV3('conectado');

        if (typeof showToast === 'function') {
            showToast('BANCO V3 RESPONDEU CORRETAMENTE!', 'sucesso');
        }
    } catch (e) {
        console.error('Teste do banco V3 falhou:', e);
        window.atualizarStatusBancoV3('erro');

        if (typeof showToast === 'function') {
            showToast('NÃO FOI POSSÍVEL VALIDAR O BANCO V3', 'erro');
        }
    }
};

window.limparConfiguracaoBancoV3 = function () {
    if (!window.WEBCOMANDA_V3_CONFIG) return;

    window.WEBCOMANDA_V3_CONFIG.limpar();
    window._supabaseV3 = null;

    const inputUrl = document.getElementById('cfg-v3-supabase-url');
    const inputKey = document.getElementById('cfg-v3-supabase-key');

    if (inputUrl) inputUrl.value = '';
    if (inputKey) inputKey.value = '';

    window.atualizarStatusBancoV3('nao-configurado');

    if (typeof showToast === 'function') {
        showToast('CONFIGURAÇÃO DO BANCO V3 REMOVIDA DESTE APARELHO.', 'sucesso');
    }
};

window.atualizarStatusBancoV3 = function (estadoForcado = null) {
    const badge = document.getElementById('status-banco-v3');
    const detalhe = document.getElementById('detalhe-status-banco-v3');

    if (!badge || !detalhe) return;

    let estado = estadoForcado;

    if (!estado) {
        const status = window.obterStatusBancoV3?.();

        if (!status?.configurado) {
            estado = 'nao-configurado';
        } else if (status.clienteInicializado) {
            estado = 'pronto';
        } else {
            estado = 'erro';
        }
    }

    const estados = {
        pronto: {
            texto: 'CONFIGURADO',
            classe: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
            detalhe: 'Cliente V3 inicializado neste aparelho.'
        },
        conectado: {
            texto: 'CONECTADO',
            classe: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
            detalhe: 'O banco respondeu ao teste.'
        },
        erro: {
            texto: 'ERRO',
            classe: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
            detalhe: 'Verifique URL, chave e disponibilidade do banco.'
        },
        'nao-configurado': {
            texto: 'NÃO CONFIGURADO',
            classe: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
            detalhe: 'Informe a URL e a chave pública do banco V3.'
        }
    };

    const item = estados[estado] || estados.erro;

    badge.className = `inline-flex px-2 py-1 rounded-full text-[8px] font-black uppercase ${item.classe}`;
    badge.textContent = item.texto;
    detalhe.textContent = item.detalhe;
};

document.addEventListener('DOMContentLoaded', () => {
    window.carregarConfiguracaoBancoV3NaTela();
});
