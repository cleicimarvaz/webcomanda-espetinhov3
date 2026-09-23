/* =================================================================================
   notificacoes.js — Sino de notificações (contas vencidas). Consolidado a partir da
   reestruturação: mantida apenas a "fonte da verdade" (_buscarContasVencidas +
   verificarNotificacoesGlobais + abrirNotificacoes), que é a que os botões do HTML
   realmente chamam (onclick="abrirNotificacoes()"). A função abrirModalNotificacoes,
   que usava um schema divergente (status/data_vencimento em vez de paga/vencimento) e
   nunca era chamada por nenhuma tela, foi removida por ser código morto.
   ================================================================================= */

/**
 * 1. FUNÇÃO CENTRAL (FONTE DA VERDADE)
 * Ambas as funções (verificar/abrir) perguntam a essa função para garantir
 * que a bolinha e a lista usem os mesmos dados e os mesmos critérios.
 */
window._buscarContasVencidas = async function() {
    const hojeObj = new Date();
    const ano = hojeObj.getFullYear();
    const mes = String(hojeObj.getMonth() + 1).padStart(2, '0');
    const dia = String(hojeObj.getDate()).padStart(2, '0');
    const hojeString = `${ano}-${mes}-${dia}`;

    // Busca apenas contas que NÃO foram pagas e cujo vencimento é menor que hoje
    const { data: contas, error } = await _supabase
        .from('despesas')
        .select('id, descricao, valor, vencimento')
        .eq('paga', false)
        .lt('vencimento', hojeString)
        .order('vencimento', { ascending: true });

    if (error) throw error;

    return { contas: contas || [], hojeObj };
};

window.verificarNotificacoesGlobais = async function() {
    if (typeof _supabase === 'undefined') return;
    try {
        const userId = localStorage.getItem('userId');
        if (!userId) return;

        // Checa se o usuário atual tem permissão para receber notificações
        const { data: usuarioAtual } = await _supabase
            .from('usuarios')
            .select('recebe_notificacoes')
            .eq('id', userId)
            .single();

        const badge = document.getElementById('badge-notificacoes');
        if (usuarioAtual && usuarioAtual.recebe_notificacoes === false) {
            if (badge) {
                badge.classList.add('hidden');
                badge.classList.remove('flex');
            }
            return;
        }

        // Pede os dados para a fonte da verdade
        const { contas } = await window._buscarContasVencidas();

        if (badge) {
            if (contas && contas.length > 0) {
                badge.innerText = contas.length > 99 ? '99+' : contas.length;
                badge.classList.remove('hidden');
                badge.classList.add('flex');
            } else {
                badge.classList.add('hidden');
                badge.classList.remove('flex');
            }
        }
    } catch (erro) {
        console.error('Erro ao buscar notificações:', erro);
    }
};

window.abrirNotificacoes = async function() {
    const modal = document.getElementById('modal-notificacoes');
    const container = document.getElementById('lista-contas-vencidas');

    if (!modal || !container) return;

    container.innerHTML = '<div class="text-center p-6 text-slate-500 font-bold animate-pulse flex items-center justify-center gap-1.5">Buscando contas... <i data-lucide="loader-circle" class="w-3.5 h-3.5 animate-spin" aria-hidden="true"></i></div>';
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (typeof lucide !== 'undefined') lucide.createIcons();

    try {
        // Pede os mesmos dados exatos para a fonte da verdade
        const { contas, hojeObj } = await window._buscarContasVencidas();

        if (!contas || contas.length === 0) {
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center p-8 text-green-500">
                    <i data-lucide="party-popper" class="w-12 h-12 mb-3" aria-hidden="true"></i>
                    <span class="font-black text-xl text-center">TUDO EM DIA!</span>
                    <span class="text-sm text-slate-500 text-center mt-1">Nenhuma conta vencida encontrada. Excelente gestão!</span>
                </div>`;
            if (typeof lucide !== 'undefined') lucide.createIcons();

            // Se abriu a lista vazia, garante que a bolinha suma
            const badge = document.getElementById('badge-notificacoes');
            if(badge) { badge.classList.add('hidden'); badge.classList.remove('flex'); }

            return;
        }

        let html = '';
        contas.forEach(c => {
            const dataVenc = new Date(c.vencimento + 'T12:00:00');
            const diffTempo = Math.abs(hojeObj - dataVenc);
            const diasAtraso = Math.ceil(diffTempo / (1000 * 60 * 60 * 24));

            const valorF = typeof window.fmSeguro === 'function' ? window.fmSeguro(c.valor) : parseFloat(c.valor).toFixed(2);
            const nomeConta = c.descricao || 'CONTA SEM NOME';

            html += `
            <div class="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-3 rounded-r-lg shadow-sm mb-3 last:mb-0">
                <div class="flex justify-between items-start mb-1">
                    <span class="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase pr-2">${nomeConta}</span>
                    <span class="font-black text-red-600 text-sm whitespace-nowrap">R$ ${valorF}</span>
                </div>
                <div class="flex justify-between items-center mt-3">
                    <span class="text-[10px] font-bold text-slate-500 bg-white dark:bg-slate-800 px-2 py-1 rounded shadow-sm border border-slate-100 dark:border-slate-700">Venceu: ${dataVenc.toLocaleDateString('pt-BR')}</span>
                    <span class="text-[11px] font-black text-red-500 animate-pulse inline-flex items-center gap-1"><i data-lucide="hourglass" class="w-3 h-3" aria-hidden="true"></i> ${diasAtraso} dias de atraso</span>
                </div>
            </div>`;
        });

        container.innerHTML = html;
        if (typeof lucide !== 'undefined') lucide.createIcons();

        // Atualiza a bolinha com o número exato dos itens da lista
        const badge = document.getElementById('badge-notificacoes');
        if (badge) {
            badge.innerText = contas.length > 99 ? '99+' : contas.length;
            badge.classList.remove('hidden');
            badge.classList.add('flex');
        }

    } catch (e) {
        console.error("❌ Erro ao buscar notificações:", e);
        container.innerHTML = '<div class="text-center p-6 text-red-500 font-bold">Erro ao carregar as informações do banco de dados.</div>';
    }
};

window.fecharModalNotificacoes = function() {
    const modal = document.getElementById('modal-notificacoes');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
};

// 5. INJETOR DE MODAL AUTOMÁTICO
window.injetarModalNotificacoes = function() {
    // Verifica se o modal já existe na página para não duplicar
    if (document.getElementById('modal-notificacoes')) return;

    // Cria o HTML do modal
    const htmlModal = `
    <div id="modal-notificacoes" class="hidden fixed inset-0 z-[500] items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm transition-opacity">
        <div class="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">

            <div class="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                <div class="flex items-center gap-3">
                    <div class="bg-red-100 dark:bg-red-900/30 p-2 rounded-xl text-red-500"><i data-lucide="bell" class="w-5 h-5" aria-hidden="true"></i></div>
                    <h3 class="font-black text-slate-800 dark:text-white uppercase tracking-wider text-sm">Contas Vencidas</h3>
                </div>
                <button onclick="window.fecharModalNotificacoes()" class="text-slate-400 hover:text-red-500 transition-colors p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-95">
                    <span class="font-black text-lg px-1">X</span>
                </button>
            </div>

            <div id="lista-contas-vencidas" class="p-5 overflow-y-auto flex-1 bg-slate-50/50 dark:bg-slate-900 custom-scrollbar">
                </div>

        </div>
    </div>
    `;

    // Cria uma div temporária para converter a string de texto em elementos HTML de verdade
    const divWrapper = document.createElement('div');
    divWrapper.innerHTML = htmlModal;

    // Anexa o modal no final da tag <body> da página
    document.body.appendChild(divWrapper.firstElementChild);
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

// 4. AUTO-INICIALIZAÇÃO:
document.addEventListener('DOMContentLoaded', () => {
    // 1. O JavaScript desenha o modal invisível na página
    window.injetarModalNotificacoes();

    // 2. Busca os dados no Supabase para colocar o número na bolinha vermelha
    setTimeout(() => {
        if (typeof window.verificarNotificacoesGlobais === 'function') {
            window.verificarNotificacoesGlobais();
        }
    }, 1000);

    setInterval(window.verificarNotificacoesGlobais, 300000);
});
