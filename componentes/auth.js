/* =================================================================================
   auth.js — Inicialização do sistema, roteador de página, verificação de sessão,
   permissões de UI e confirmação de senha administrativa
   ================================================================================= */

var acaoAdminPendente = null;

const SECOES_ADMIN = ['produtos', 'relatorios', 'despesas', 'movimentacoes', 'estorno', 'configuracoes', 'contas-receber'];

// =================================================================================
// 1. INICIALIZAÇÃO DO SISTEMA
// =================================================================================
document.addEventListener('DOMContentLoaded', async () => {
    verificarAuth();
    aplicarPermissoesUI();

    const path = window.location.pathname.toLowerCase();
    const isLoginPage = path.includes('index.html') || path === '/' || path.endsWith('/');

    if (!isLoginPage) {
        if (localStorage.getItem('userNivel') === 'ADMIN') {
            if (typeof verificarStatusCaixa === 'function') {
                await verificarStatusCaixa();
            }
        }

        if (path.includes('historico-caixas.html')) {
            if (typeof carregarHistoricoCaixas === 'function') await carregarHistoricoCaixas();
        }

        if (path.includes('configuracoes.html')) {
            if (typeof carregarFiltroUsuarios === 'function') carregarFiltroUsuarios();
        }

        if (typeof preencherDatasPadrao === 'function') preencherDatasPadrao();

        initSistema();
        iniciarMonitoramento();

        setInterval(verificarAuth, 60000);
        configurarBotaoVoltar();
    }
});

// =================================================================================
// 2. ROTEADOR E GESTÃO DE ACESSO
// =================================================================================
function initSistema() {
    const path = window.location.pathname.toLowerCase();
    console.log('>>> [MAIN] Sistema iniciado na rota:', path);

    if (path.includes('venda.html')) {
        if (typeof renderizarVenda === 'function') renderizarVenda();
        if (typeof atualizarFAB === 'function') atualizarFAB();
    }
    else if (path.includes('configuracoes.html') || path.includes('admin.html')) {
        if (typeof renderizarCatalogo === 'function') renderizarCatalogo();
        if (typeof carregarAuditoria === 'function') carregarAuditoria();
        if (typeof carregarListaUsuarios === 'function') carregarListaUsuarios();
        if (typeof carregarPreferenciasTicket === 'function') carregarPreferenciasTicket();
    }
    else if (path.includes('comandas.html')) {
        if (typeof carregarComandas === 'function') carregarComandas();
    }
    else if (path.includes('divisao.html')) {
        if (typeof initPaginaDivisao === 'function') initPaginaDivisao();
    }
    else if (path.includes('estorno.html')) {
        if (typeof carregarVendasEstorno === 'function') carregarVendasEstorno();
    }
    else if (path.includes('home.html')) {
        if (typeof carregarResumoHome === 'function') carregarResumoHome();
    }
}

function verificarAuth() {
    const usuarioLogado = localStorage.getItem('userName');
    const path = window.location.pathname.toLowerCase();
    const isLoginPage = path.includes('index.html') || path === '/' || path.endsWith('/');

    if (!usuarioLogado && !isLoginPage) {
        window.location.href = 'index.html';
        return;
    }

    if (usuarioLogado && !isLoginPage) {
        const ultimo = parseInt(localStorage.getItem('ultimoAcesso') || Date.now());
        const limiteInatividade = typeof TEMPO_LIMITE_INATIVIDADE !== 'undefined' ? TEMPO_LIMITE_INATIVIDADE : 1200000;

        if (Date.now() - ultimo > limiteInatividade) {
            if (typeof window.mostrarSessaoExpirada === 'function') {
                window.mostrarSessaoExpirada();
            } else {
                alert('Sessão expirada por inatividade.');
                logout();
            }
            return;
        }

        // ----------------------------------------------------
        // LIBERA A PORTA: Se chegou até aqui, o usuário é válido!
        // Remove o display:none do HTML e mostra a página
        // ----------------------------------------------------
        document.body.style.display = 'block';

        const headerNome = document.getElementById('header-usuario');
        if (headerNome) headerNome.innerText = `OLÁ, ${usuarioLogado.toUpperCase()}`;
    }
}

/**
 * Modal dedicado de sessão expirada (injetado via JS, funciona em
 * qualquer página — mesmo padrão do modal de notificações). Substitui
 * o alerta genérico reaproveitado antes: aquele tinha um botão
 * "ENTENDI" que só fechava o aviso, enquanto um timer paralelo de 3s
 * fazia logout de qualquer forma — dava pra "confirmar" e ainda assim
 * ser redirecionado sem aviso alguns segundos depois. Agora o único
 * botão já é a própria ação de logout, sem timer concorrente.
 */
window.injetarModalSessaoExpirada = function() {
    if (document.getElementById('modal-sessao-expirada')) return;

    const html = `
    <div id="modal-sessao-expirada" class="hidden fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[9999] items-center justify-center px-6">
        <div class="bg-white dark:bg-slate-900 w-full max-w-[320px] rounded-[3rem] p-8 text-center shadow-2xl border-4 border-white dark:border-slate-800 animate-slide-up">
            <div class="bg-amber-50 dark:bg-amber-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-500 shadow-inner">
                <i data-lucide="shield-alert" class="w-8 h-8" aria-hidden="true"></i>
            </div>
            <h3 class="text-amber-600 dark:text-amber-400 font-black text-sm uppercase mb-2 italic tracking-widest leading-none">Sessão Expirada</h3>
            <p class="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-6 uppercase tracking-tighter">Você ficou inativo por muito tempo. Por segurança, sua sessão foi encerrada.</p>
            <button onclick="window.logout()" class="w-full bg-amber-500 text-white py-4 rounded-[1.5rem] text-[10px] font-black uppercase shadow-lg shadow-amber-200 dark:shadow-amber-900/30 active:scale-95 transition-all">
                Fazer Login Novamente
            </button>
        </div>
    </div>`;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    document.body.appendChild(wrapper.firstElementChild);
};

window.mostrarSessaoExpirada = function() {
    window.injetarModalSessaoExpirada();
    const modal = document.getElementById('modal-sessao-expirada');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

function aplicarPermissoesUI() {
    const nivelUsuario = localStorage.getItem('userNivel') || 'VENDEDOR';

    // Qualquer nível que não seja explicitamente ADMIN é tratado como
    // restrito (cobre VENDEDOR, o padrão atual, e os valores antigos
    // OPERADOR/GARCOM de cadastros anteriores a essa permissão).
    if (nivelUsuario.toUpperCase() !== 'ADMIN') {
        ['nav-admin', 'card-faturamento', 'btn-home-admin'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        const path = window.location.pathname.toLowerCase();
        const PAGINAS_SOMENTE_ADMIN = ['admin.html', 'configuracoes.html', 'produtos.html', 'historico-caixas.html'];
        if (PAGINAS_SOMENTE_ADMIN.some((p) => path.includes(p))) {
            window.location.href = 'home.html';
        }
    }
}

function logout() {
    const nomeUsuario = localStorage.getItem('userName');
    if (nomeUsuario && typeof registrarLog === 'function') {
        // Dispara sem esperar: a navegação para index.html não pode ficar
        // presa aguardando a gravação do log terminar.
        registrarLog('SEGURANÇA', 'LOGOUT DO SISTEMA', `O USUÁRIO ${nomeUsuario.toUpperCase()} SAIU DO SISTEMA`);
    }
    localStorage.clear();
    window.location.href = 'index.html';
}
window.logout = logout;

// =================================================================================
// 3. SEGURANÇA (CONFIRMAÇÃO COM SENHA ADMIN)
// =================================================================================
window.solicitarSenhaAdmin = function(acao, payload) {
    console.log('>>> [MAIN] Solicitando senha para:', acao);
    window.acaoAdminPendente = { acao, payload };

    const modal = document.getElementById('modal-auth-admin');
    const inputSenha = document.getElementById('input-auth-senha');

    if (modal) {
        if (inputSenha) inputSenha.value = '';
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        setTimeout(() => inputSenha?.focus(), 100);
    } else {
        // ----------------------------------------------------
        // SUBSTITUIÇÃO DO ALERT DE ERRO CRÍTICO
        // ----------------------------------------------------
        if (typeof alertaSistema === 'function') {
            alertaSistema('O modal de autenticação de administrador não foi encontrado no sistema.', 'Erro Crítico de Interface');
        } else {
            alert('ERRO CRÍTICO: Modal de senha não existe no HTML.');
        }
    }
}

window.confirmarAuth = async function() {
    const input = document.getElementById('input-auth-senha');
    const senhaDigitada = input?.value;

    if (!senhaDigitada) return showToast("DIGITE A SENHA", "erro");

    try {
        const { data: admin, error: adminError } = await _supabase
            .from('usuarios')
            .select('senha')
            .eq('usuario', 'admin')
            .maybeSingle();

        if (adminError || !admin) {
            console.error("Erro ao buscar admin:", adminError);
            return showToast("ERRO: USUÁRIO ADMIN NÃO ENCONTRADO", "erro");
        }

        // Comparação de senha (Base64)
        if (btoa(senhaDigitada) === admin.senha || senhaDigitada === admin.senha) {

            // --- REGISTRO DE AUDITORIA (PADRÃO 3 ARGUMENTOS) ---
            if (typeof registrarLog === 'function') {
                const acaoDesc = window.acaoAdminPendente?.acao || "AÇÃO RESTRITA";
                await registrarLog(
                    'SEGURANÇA',
                    'AUTORIZAÇÃO MESTRE CONCEDIDA',
                    `SENHA DO ADMIN UTILIZADA PARA: ${acaoDesc.toUpperCase()}`
                );
            }

            // Executa a ação (Agora usando o callback se existir, ou o switch antigo)
            if (window.acaoAdminPendente?.callback) {
                await window.acaoAdminPendente.callback();
            } else if (window.acaoAdminPendente) {
                confirmarAcaoComSenha(window.acaoAdminPendente.acao, window.acaoAdminPendente.payload);
            }

            window.acaoAdminPendente = null;
            if (input) input.value = '';
            fecharModalAuth();

        } else {
            // --- REGISTRO DE AUDITORIA (FALHA) ---
            if (typeof registrarLog === 'function') {
                await registrarLog(
                    'SEGURANÇA',
                    'FALHA DE AUTORIZAÇÃO',
                    'TENTATIVA DE ACESSO COM SENHA ADMINISTRATIVA INCORRETA'
                );
            }
            showToast("SENHA INCORRETA!", "erro");
        }

    } catch (e) {
        console.error("❌ [AUTH] Erro fatal:", e);
        showToast("ERRO AO PROCESSAR AUTORIZAÇÃO", "erro");
    }
};

window.fecharModalAuth = function() {
    const modal = document.getElementById('modal-auth-admin');
    if (modal) modal.classList.add('hidden');
    const input = document.getElementById('input-auth-senha');
    if (input) input.value = '';
    window.acaoAdminPendente = null;
};

function confirmarAcaoComSenha(acao, payload) {
    console.log(`[SEGURANÇA] Disparando: ${acao} | ID: ${payload}`);
    switch (acao) {
        case 'USER_EDIT':   if (typeof window.prepararEdicaoUsuario === 'function') window.prepararEdicaoUsuario(payload); break;
        case 'USER_TOGGLE': if (typeof window.executarToggleUsuario === 'function') window.executarToggleUsuario(payload); break;
        case 'EDITAR':      if (typeof abrirModalTrocaPagamento === 'function') abrirModalTrocaPagamento(payload); break;
        case 'ESTORNO':     if (typeof executarExclusaoFisica === 'function') executarExclusaoFisica(payload); break;
        case 'BACKUP':      if (typeof executarBackupReal === 'function') executarBackupReal(); break;
        default: if (typeof showToast === 'function') showToast('AÇÃO DESCONHECIDA', 'erro');
    }
}

function iniciarMonitoramento() {
    ['click', 'mousemove', 'keypress', 'touchstart', 'scroll'].forEach(e =>
        document.addEventListener(e, () => {
            if (localStorage.getItem('userName')) {
                localStorage.setItem('ultimoAcesso', Date.now().toString());
            }
        }, { passive: true })
    );
}
