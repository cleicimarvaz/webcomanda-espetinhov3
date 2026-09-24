/* =================================================================================
   NÚCLEO DE OPERAÇÕES (MAIN) - VERSÃO ATUALIZADA COM LOGS 3.0
   Remanescente após a reestruturação: auth.js, notificacoes.js, backup.js e
   estorno-admin.js foram extraídos para arquivos próprios (ver componentes/).
   Este arquivo mantém: abertura de caixa/home, navegação de interface admin,
   relatório de estoque, baixa automática de estoque, motor de auditoria,
   configuração de hardware da impressora, zona de perigo e filtros de período.
   ================================================================================= */

// =================================================================================
// 4. GESTÃO DE CAIXA E HOME
// =================================================================================

window.executarAberturaCaixa = async function() {
    const input = document.getElementById('valor-inicial-caixa');
    if (!input) return;

    const valorLimpo = input.value.replace(/\D/g, '');
    const valorFinal = parseFloat(valorLimpo) / 100;

    if (isNaN(valorFinal) || valorFinal < 0) {
        if (typeof showToast === 'function') return showToast('INFORME UM VALOR VÁLIDO', 'erro');
        return;
    }

    const adminNome = localStorage.getItem('userName') || 'Admin';
    const btn = document.querySelector('#modal-abrir-caixa button');

    if (btn) { btn.innerText = 'ABRINDO...'; btn.disabled = true; }

    try {
        const { data, error } = await _supabase
            .from('caixa')
            .insert([{ valor_inicial: valorFinal, status: 'aberto', criado_por: adminNome }])
            .select();

        if (error) throw error;

        localStorage.setItem('idCaixaAtual', data[0].id);

        const modal = document.getElementById('modal-abrir-caixa');
        if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }

        if (typeof showToast === 'function') showToast('CAIXA ABERTO COM SUCESSO!', 'sucesso');

        // --- REGISTRO DE AUDITORIA (CORRIGIDO: PADRÃO 3 ARGUMENTOS) ---
        if (typeof registrarLog === 'function') {
            const valF = typeof formatarMoeda === 'function' ? formatarMoeda(valorFinal) : valorFinal.toFixed(2);
            await registrarLog(
                'FINANCEIRO',
                'ABERTURA DE CAIXA',
                `CAIXA INICIADO POR ${adminNome.toUpperCase()} COM SALDO DE R$ ${valF}`
            );
        }

        if (typeof carregarResumoHome === 'function') carregarResumoHome();

    } catch (err) {
        console.error(err);
        if (typeof showToast === 'function') showToast('ERRO AO ABRIR CAIXA', 'erro');
        if (btn) { btn.innerText = 'Confirmar Abertura'; btn.disabled = false; }
    }
}

window.carregarResumoHome = async function() {
    if (typeof _supabase === 'undefined') return;

    const idCaixaAtual = localStorage.getItem('idCaixaAtual');
    const cardFaturamento = document.getElementById('faturamento-hoje');
    const badgeComandas = document.getElementById('badge-comandas');

    if (!idCaixaAtual || !cardFaturamento) {
        if (cardFaturamento) cardFaturamento.innerText = 'R$ 0,00';
        return;
    }

    try {
        // 1. Buscamos agora o 'status' junto com o 'total'
        const [{ data: vendas, error }, { data: comandas }] = await Promise.all([
            _supabase.from('historico_vendas').select('total, status').eq('id_caixa', idCaixaAtual),
            _supabase.from('comandas').select('id').eq('status', 'aberta')
        ]);

        if (error) throw error;

        // 2. Filtro de Segurança: Só soma o que NÃO for 'estornada'
        const totalFaturamento = (vendas || []).reduce((acc, v) => {
            const status = (v.status || '').toLowerCase().trim();
            if (status === 'estornada' || status === 'cancelada') return acc;
            return acc + (parseFloat(v.total) || 0);
        }, 0);

        cardFaturamento.innerText = `R$ ${typeof formatarMoeda === 'function' ? formatarMoeda(totalFaturamento) : totalFaturamento.toFixed(2)}`;

        if (badgeComandas && comandas) {
            if (comandas.length > 0) {
                badgeComandas.classList.remove('hidden');
                badgeComandas.innerText = comandas.length;
            } else {
                badgeComandas.classList.add('hidden');
            }
        }

    } catch (e) {
        console.error('Erro ao carregar faturamento:', e);
        if (cardFaturamento) cardFaturamento.innerText = 'R$ --,--';
    }
}

// =================================================================================
// 5. NAVEGAÇÃO DE INTERFACE DINÂMICA
// =================================================================================
window.abrirSubSecao = function(s) {
    document.getElementById('admin-menu-principal')?.classList.add('hidden');
    SECOES_ADMIN.forEach(secao => {
        document.getElementById(`secao-${secao}`)?.classList.add('hidden');
    });

    if (s === 'despesas') {
        document.getElementById('view-form-despesa')?.classList.add('hidden');
        document.getElementById('view-lista-despesas')?.classList.remove('hidden');
    }
    if (s === 'contas-receber') {
        document.getElementById('view-form-conta-receber')?.classList.add('hidden');
        document.getElementById('view-lista-contas-receber')?.classList.remove('hidden');
    }
    if (s === 'produtos') {
        if (typeof alternarAbasAdminProdutos === 'function') alternarAbasAdminProdutos('lista');
    }
    if (s === 'configuracoes') {
        window.voltarMenuConfig();
    }
    if (s === 'relatorios') {
        window.voltarMenuRelatorios();
    }

    const secaoAtiva = document.getElementById(`secao-${s}`);
    if (secaoAtiva) secaoAtiva.classList.remove('hidden');

    if (s === 'produtos' && typeof renderizarCatalogo === 'function') renderizarCatalogo();
    if (s === 'estorno' && typeof carregarVendasEstorno === 'function') carregarVendasEstorno();
    if (s === 'despesas' && typeof carregarDespesas === 'function') {
        carregarDespesas();
        if (typeof verificarVencimentos === 'function') verificarVencimentos();
    }
    if (s === 'contas-receber' && typeof carregarContasReceber === 'function') {
        carregarContasReceber();
    }
}

window.voltarAoMenuAdmin = function() {
    SECOES_ADMIN.forEach(secao => {
        document.getElementById(`secao-${secao}`)?.classList.add('hidden');
    });
    document.getElementById('admin-menu-principal')?.classList.remove('hidden');
}

window.abrirConfigEspecifica = function(t) {
    document.getElementById('menu-config-cards')?.classList.add('hidden');
    document.getElementById(`view-cfg-${t}`)?.classList.remove('hidden');
    if (t === 'auditoria' && typeof carregarAuditoria === 'function') carregarAuditoria();
}

window.voltarMenuConfig = function() {
    ['view-cfg-ticket', 'view-cfg-auditoria', 'view-cfg-usuarios', 'view-cfg-backup', 'view-cfg-utilitarios', 'view-cfg-ordem-categorias', 'view-cfg-banco-v3', 'view-cfg-perigo'].forEach(i =>
        document.getElementById(i)?.classList.add('hidden')
    );
    document.getElementById('menu-config-cards')?.classList.remove('hidden');
}

window.abrirRelatorioEspecifico = function(tipo) {
    // Esconde o menu de cards
    document.getElementById('menu-relatorios-cards').classList.add('hidden');

    // Esconde todas as views primeiro
    ['view-dashboard', 'view-financeiro', 'view-produtos', 'view-comandas', 'view-estoque', 'view-estornos'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.classList.add('hidden');
    });

    // Mostra a view escolhida
    const viewAtiva = document.getElementById(`view-${tipo}`);
    if(viewAtiva) viewAtiva.classList.remove('hidden');

    // SE FOR FINANCEIRO, CHAMA O FILTRO DE HOJE AUTOMATICAMENTE
    if (tipo === 'financeiro') {
        window.abaFinanceiraAtiva = 'fluxo';
        if (typeof window.alternarAbaFinanceiro === 'function') {
            document.querySelectorAll('#view-financeiro [id^="btn-aba-fin-"]').forEach(btn => {
                btn.className = btn.id === 'btn-aba-fin-fluxo'
                    ? 'shrink-0 px-3 py-2 rounded-lg bg-blue-500 text-white text-[9px] font-black uppercase transition-all shadow-sm'
                    : 'shrink-0 px-3 py-2 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[9px] font-black uppercase transition-all';
            });
            ['fluxo', 'categoria', 'dre', 'comparativo', 'projetado', 'metas'].forEach(id => {
                const painel = document.getElementById(`aba-fin-${id}`);
                if (painel) painel.classList.toggle('hidden', id !== 'fluxo');
            });
        }
        window.mudarFiltroFinanceiro(0); // 0 = Hoje
    }

    // Se for dashboard, chama o dashboard
    if (tipo === 'dashboard') {
        window.gerarDashboard(0);
    }

    // =====================================================================
    // 🚀 O NOSSO NOVO GATILHO PARA O ESTOQUE ENTRA AQUI!
    // =====================================================================
    if (tipo === 'estoque') {
        if (typeof gerarRelatorioEstoque === 'function') {
            gerarRelatorioEstoque();
        }
    }

    if (tipo === 'produtos') {
        // Clica no filtro "HOJE" automaticamente quando abre a tela
        if (typeof mudarFiltroProdutos === 'function') mudarFiltroProdutos(0);
    }

    if (tipo === 'comandas') {
        // Aciona o filtro de "Hoje" assim que abre a tela
        if (typeof mudarFiltroComandas === 'function') {
            mudarFiltroComandas(0);
        }
    }

    if (tipo === 'estornos') {
        if (typeof mudarFiltroEstornosRel === 'function') {
            mudarFiltroEstornosRel(0);
        }
    }
};

window.voltarMenuRelatorios = function() {
    ['view-financeiro', 'view-produtos', 'view-comandas', 'view-dashboard', 'view-estoque', 'view-estornos'].forEach(i =>
        document.getElementById(i)?.classList.add('hidden')
    );
    document.getElementById('menu-relatorios-cards')?.classList.remove('hidden');
}

// =================================================================================
// 6. RELATÓRIO DE ESTOQUE
// =================================================================================
window.gerarRelatorioEstoque = async function() {
    const container = document.getElementById('conteudo-rel-estoque');

    // Se o HTML não tiver o container com esse ID, ele avisa no console para te ajudar a debugar
    if (!container) {
        console.error("Aviso: Container 'conteudo-rel-estoque' não encontrado na tela.");
        return;
    }

    if (typeof _supabase === 'undefined') return;

    // 1. Efeito visual de carregamento enquanto busca no banco
    container.innerHTML = '<p class="text-center text-xs text-slate-400 py-6 font-bold uppercase animate-pulse">Carregando dados do estoque...</p>';

    try {
        // 2. Busca os dados reais
        const { data: pds, error } = await _supabase
            .from('produtos')
            .select('*')
            .eq('controlar_estoque', true)
            .order('estoque_atual', { ascending: true });

        if (error) throw error;

        // 3. Verifica se a lista está vazia
        if (!pds || pds.length === 0) {
            container.innerHTML = '<p class="text-center text-xs text-slate-400 py-6 font-bold uppercase">Nenhum produto controla estoque.</p>';
            return;
        }

        // 4. Monta a tabela em HTML
        let totalItens = 0;
        let valorPotencialVenda = 0;
        let html = '<div class="space-y-2">';

        pds.forEach(p => {
            const qtd = parseFloat(p.estoque_atual || 0);
            totalItens += qtd;
            valorPotencialVenda += qtd * parseFloat(p.preco || 0);

            const minimoProduto = parseFloat(p.estoque_minimo) || 5;
            const corQtd = qtd <= minimoProduto ? 'text-red-500 dark:text-red-400' : 'text-emerald-500 dark:text-emerald-400';
            const alerta = qtd <= minimoProduto
                ? '<span class="text-[8px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1 py-0.5 rounded uppercase font-black ml-2">BAIXO</span>'
                : '';

            html += `
            <div class="flex justify-between items-center border-b border-slate-50 dark:border-slate-800 py-2 last:border-0">
                <div class="flex-1">
                    <span class="font-bold text-[10px] text-slate-600 dark:text-slate-300 uppercase">${p.nome} ${alerta}</span>
                </div>
                <span class="font-black ${corQtd} bg-slate-50 dark:bg-slate-800 px-2 rounded-lg text-xs border border-slate-100 dark:border-slate-700">${qtd} UN</span>
            </div>`;
        });

        html += `</div>
        <div class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
            <span class="text-[9px] font-black text-slate-400 uppercase">Total: ${totalItens} UN</span>
            <span class="text-[9px] font-black text-slate-400 uppercase">Potencial Venda: ${typeof window.fmSeguro === 'function' ? 'R$ ' + window.fmSeguro(valorPotencialVenda) : 'R$ ' + valorPotencialVenda.toFixed(2)}</span>
        </div>`;

        // 5. Injeta o resultado final na tela
        container.innerHTML = html;

    } catch (err) {
        console.error("Erro ao gerar relatório de estoque:", err);
        container.innerHTML = '<p class="text-center text-xs text-red-500 py-6 font-bold uppercase">Erro ao carregar o estoque. Tente novamente.</p>';
    }
}

// =================================================================================
// 7. MOTOR DE ESTOQUE: BAIXA AUTOMÁTICA
// =================================================================================
window.processarBaixaEstoqueAutomatica = async function(itensVendidos, motivoStr = 'VENDA DIRETA') {
    if (typeof _supabase === 'undefined' || !itensVendidos || itensVendidos.length === 0) return;

    try {
        const itensParaProcessar = typeof window.expandirItensComCombos === 'function'
            ? await window.expandirItensComCombos(itensVendidos)
            : itensVendidos;

        const ids = [...new Set(itensParaProcessar.map(i => i.id))];

        const { data: produtosBanco, error } = await _supabase
            .from('produtos')
            .select('id, controlar_estoque, estoque_atual, nome')
            .in('id', ids)
            .eq('controlar_estoque', true);

        if (error || !produtosBanco || produtosBanco.length === 0) return;

        const usuarioAcao = localStorage.getItem('userName') || 'SISTEMA';

        for (const prodBanco of produtosBanco) {
            const qtdVendida = itensParaProcessar
                .filter(i => i.id === prodBanco.id)
                .reduce((acc, curr) => acc + (parseFloat(curr.qtd) || 1), 0);

            const novoEstoque = parseFloat(prodBanco.estoque_atual || 0) - qtdVendida;

            await _supabase.from('produtos').update({ estoque_atual: novoEstoque }).eq('id', prodBanco.id);

            await _supabase.from('estoque_movimentacoes').insert([{
                produto_id: prodBanco.id,
                tipo: 'saida',
                quantidade: qtdVendida,
                motivo: motivoStr,
                usuario: usuarioAcao
            }]);

            // --- REGISTRO DE AUDITORIA (NOVO) ---
            if (typeof registrarLog === 'function') {
                await registrarLog(
                    'ESTOQUE',
                    'BAIXA AUTOMÁTICA',
                    `PRODUTO: ${prodBanco.nome.toUpperCase()} | QTD: ${qtdVendida} | MOTIVO: ${motivoStr.toUpperCase()}`
                );
            }
        }

    } catch (err) {
        console.error('>>> [ESTOQUE] Erro crítico na baixa automática:', err);
    }
}

// =================================================================================
// 8. UTILITÁRIOS E PERFIL GLOBAL
// =================================================================================
function configurarBotaoVoltar() {
    document.querySelectorAll('header button').forEach(btn => {
        if (btn.innerText.includes('←') || btn.innerHTML.includes('←')) {
            btn.onclick = (e) => {
                e.preventDefault();
                if (window.location.pathname.includes('configuracoes.html')) {
                    const menu = document.getElementById('admin-menu-principal');
                    if (menu && menu.classList.contains('hidden')) {
                        window.voltarAoMenuAdmin();
                        return;
                    }
                }
                if (document.referrer && document.referrer.includes(window.location.host)) {
                    window.history.back();
                } else {
                    window.location.href = 'home.html';
                }
            };
        }
    });
}

// =================================================================================
// 9. MOTOR DE AUDITORIA (FONTE ÚNICA)
// =================================================================================
window.registrarLog = async function(arg1, arg2, arg3) {
    let tipo, action, description;

    if (arg3 === undefined) {
        action = arg1 || 'AÇÃO NÃO IDENTIFICADA';
        description = arg2 || action;

        const textoBusca = action.toUpperCase();
        if (textoBusca.includes('VENDA') || textoBusca.includes('MESA') || textoBusca.includes('COMANDA')) {
            tipo = 'VENDA';
        } else if (textoBusca.includes('CAIXA') || textoBusca.includes('SANGRIA') || textoBusca.includes('MOVIMENTAÇÃO')) {
            tipo = 'FINANCEIRO';
        } else if (textoBusca.includes('PRODUTO') || textoBusca.includes('ESTOQUE')) {
            tipo = 'ESTOQUE';
        } else if (textoBusca.includes('LOGIN') || textoBusca.includes('SEGURANÇA')) {
            tipo = 'SEGURANÇA';
        } else {
            tipo = 'SISTEMA';
        }
    } else {
        tipo = arg1;
        action = arg2;
        description = arg3;
    }

    try {
        const usuarioLogado = localStorage.getItem('userName') || 'SISTEMA';
        await _supabase.from('auditoria').insert([{
            usuario: usuarioLogado.toUpperCase(),
            tipo: tipo.toUpperCase(),
            action: action.toUpperCase(),
            description: description.toUpperCase()
        }]);
    } catch (e) {
        console.error('Erro na Auditoria:', e);
    }
};

/* =================================================================================
   CONFIGURAÇÕES DE HARDWARE (LOCAL) - TAMANHO DA BOBINA
   ================================================================================= */

// 1. Inicializa a tela com as configurações salvas
window.carregarConfiguracoesImpressao = function() {
    // Carrega o Select de Conexão (Modo)
    const selectModo = document.getElementById('cfg-modo-impressao');
    if (selectModo) {
        selectModo.value = localStorage.getItem('modoImpressao') || 'direto';
    }

    // Carrega o toggle de Impressão Automática (sem confirmação)
    const chkAuto = document.getElementById('cfg-impressao-automatica');
    if (chkAuto) {
        chkAuto.checked = localStorage.getItem('impressaoAutoVenda') === 'true';
    }

    // Carrega os botões de Tamanho (assume 80mm como padrão para desktops)
    const tamanhoSalvo = localStorage.getItem('tamanhoImpressora') || '80';
    window.atualizarBotoesImpressora(tamanhoSalvo);
};

// 1.1 Salva o modo de conexão (RawBT/direto vs. tela/PDF) SOMENTE neste aparelho
window.salvarPreferenciaImpressao = function(modo) {
    try {
        localStorage.setItem('modoImpressao', modo);
        if (typeof showToast === 'function') {
            showToast('MODO DE IMPRESSÃO SALVO NESTE APARELHO!', 'sucesso');
        }
    } catch (e) {
        console.error('Erro ao salvar modo de impressão:', e);
        if (typeof showToast === 'function') showToast('ERRO AO SALVAR MODO DE IMPRESSÃO', 'erro');
    }
};

// 1.2 Salva se a venda direta deve imprimir sozinha, sem pedir confirmação
window.salvarImpressaoAutomatica = function(ativo) {
    try {
        localStorage.setItem('impressaoAutoVenda', ativo ? 'true' : 'false');
        if (typeof showToast === 'function') {
            showToast(ativo ? 'IMPRESSÃO AUTOMÁTICA ATIVADA NESTE APARELHO!' : 'IMPRESSÃO AUTOMÁTICA DESATIVADA', 'sucesso');
        }
    } catch (e) {
        console.error('Erro ao salvar preferência de impressão automática:', e);
        if (typeof showToast === 'function') showToast('ERRO AO SALVAR PREFERÊNCIA', 'erro');
    }
};

// 2. Salva o tamanho do papel SOMENTE no aparelho físico atual
window.salvarTamanhoImpressora = function(tamanho) {
    try {
        localStorage.setItem('tamanhoImpressora', tamanho);

        // Atualiza a interface imediatamente
        window.atualizarBotoesImpressora(tamanho);

        if(typeof showToast === 'function') {
            showToast(`BOBINA DE ${tamanho}MM SALVA NESTE APARELHO!`, 'sucesso');
        }
    } catch (e) {
        console.error("Erro crítico ao salvar tamanho da impressora no storage local:", e);
        if(typeof showToast === 'function') {
            showToast("ERRO AO SALVAR TAMANHO (MEMÓRIA CHEIA/BLOQUEADA)", "erro");
        }
    }
};

// 3. Gerencia o visual dos botões (Pinta o selecionado)
window.atualizarBotoesImpressora = function(tamanhoSelecionado) {
    const btn58 = document.getElementById('btn-imp-58');
    const btn80 = document.getElementById('btn-imp-80');

    // Classes de Design (Ativo = Amarelo WebComanda | Inativo = Cinza)
    const classesAtivas = ['border-yellow-400', 'bg-yellow-50', 'dark:bg-yellow-900/20', 'text-yellow-600', 'dark:text-yellow-500'];
    const classesInativas = ['border-slate-200', 'dark:border-slate-700', 'bg-white', 'dark:bg-slate-800', 'text-slate-400', 'dark:text-slate-500'];

    if (btn58 && btn80) {
        // Remove os estados ativos de ambos
        btn58.classList.remove(...classesAtivas);
        btn58.classList.add(...classesInativas);
        btn80.classList.remove(...classesAtivas);
        btn80.classList.add(...classesInativas);

        // Aplica o estado ativo apenas no escolhido
        if (tamanhoSelecionado === '58') {
            btn58.classList.remove(...classesInativas);
            btn58.classList.add(...classesAtivas);
        } else {
            btn80.classList.remove(...classesInativas);
            btn80.classList.add(...classesAtivas);
        }
    }
};

// 4. Gatilho de inicialização
document.addEventListener('DOMContentLoaded', () => {
    // Valida se estamos na página correta antes de disparar a função
    if (window.location.pathname.includes('configuracoes.html') || window.location.pathname.includes('admin.html')) {
        window.carregarConfiguracoesImpressao();
    }
});

// Exemplo: Dentro da função que abre a tela de configurações
const selectImpressao = document.getElementById('select-modo-impressao');
if (selectImpressao) {
    selectImpressao.value = localStorage.getItem('modoImpressao') || 'navegador';
}

// =================================================================
// TRAVA DE SEGURANÇA: ZONA DE PERIGO
// =================================================================

window.acaoAposSenha = null; // Guarda o que o sistema deve fazer após validar

// 1. Função que abre o modal e guarda a ação que o usuário quer fazer
window.solicitarSenhaPerigo = function(funcaoDestino) {
    window.acaoAposSenha = funcaoDestino; // Salva a função na memória

    document.getElementById('input-senha-perigo').value = '';
    const modal = document.getElementById('modal-senha-perigo');
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    // Foca no input automaticamente após abrir
    setTimeout(() => document.getElementById('input-senha-perigo').focus(), 100);
};

window.fecharModalSenhaPerigo = function() {
    const modal = document.getElementById('modal-senha-perigo');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    window.acaoAposSenha = null; // Limpa a memória por segurança
};

// 2. Vai no Supabase confirmar a senha do usuário logado
window.verificarSenhaPerigo = async function() {
    const senhaInput = document.getElementById('input-senha-perigo').value;
    const btn = document.getElementById('btn-confirmar-perigo');
    const userId = localStorage.getItem('userId');

    if (!senhaInput) {
        if (typeof mostrarPilula === 'function') mostrarPilula("Digite a senha!", "erro");
        return;
    }

    if (!userId) {
        if (typeof mostrarPilula === 'function') mostrarPilula("Erro: Faça login novamente.", "erro");
        return;
    }

    try {
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin" aria-hidden="true"></i>';
        if (typeof lucide !== 'undefined') lucide.createIcons();

        const { data, error } = await _supabase
            .from('usuarios')
            .select('id')
            .eq('id', userId)
            .eq('senha', senhaInput)
            .single();

        if (error || !data) {
            if (typeof mostrarPilula === 'function') mostrarPilula("Senha incorreta!", "erro");
            document.getElementById('input-senha-perigo').value = '';
            btn.disabled = false;
            btn.innerHTML = "LIBERAR";
            return;
        }

        // SALVA A FUNÇÃO ANTES DE FECHAR O MODAL E APAGAR A MEMÓRIA
        const executarAcao = window.acaoAposSenha;

        fecharModalSenhaPerigo();

        if (typeof mostrarPilula === 'function') mostrarPilula("Acesso liberado!", "sucesso");

        // Executa a ação guardada
        if (typeof executarAcao === 'function') {
            executarAcao();
        }

    } catch (e) {
        console.error("Erro ao validar senha:", e);
        if (typeof mostrarPilula === 'function') mostrarPilula("Erro de conexão", "erro");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = "LIBERAR";
        }
    }
};

// BÔNUS: Fazer a tecla "Enter" acionar o botão de liberar
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const inputSenha = document.getElementById('input-senha-perigo');
        if (inputSenha) {
            inputSenha.addEventListener('keypress', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    window.verificarSenhaPerigo();
                }
            });
        }
    }, 1000);
});

// 1. Alterna a exibição da gaveta de datas
window.togglePeriodo = function(contexto) {
    const container = document.getElementById(`container-periodo-${contexto}`);
    if (container) {
        container.classList.toggle('hidden');
        if (!container.classList.contains('hidden')) {
            window.mudarFiltro(99, contexto); // Marca o botão "Período" como ativo
        }
    }
};

// 2. Gerencia o clique e o visual
window.mudarFiltro = function(valor, contexto) {
    const opcoes = [0, 7, 30, 99];

    // Troca o visual dos botões do contexto atual
    opcoes.forEach(id => {
        const btn = document.getElementById(`btn-${contexto}-${id}`);
        if (btn) btn.className = (id === valor) ? window.CSS_FILTRO_ATIVO : window.CSS_FILTRO_INATIVO;
    });

    // Se clicar em algo fixo (0, 7, 30), esconde a gaveta se não for o 99
    if (valor !== 99) {
        const container = document.getElementById(`container-periodo-${contexto}`);
        if (container) container.classList.add('hidden');
    }

    // DISPARADOR DE DADOS: Aqui o sistema decide qual tela atualizar
    executarBuscaRelatorio(valor, contexto);
};

// 3. O "Roteador" de busca (Centraliza as chamadas ao Supabase)
function executarBuscaRelatorio(valor, contexto) {
    let dataInicio, dataFim;

    // 1. Se for o período personalizado (Lupa), pega os valores dos inputs
    if (valor === 'custom') {
        dataInicio = document.getElementById(`data-inicio-${contexto}`).value;
        dataFim = document.getElementById(`data-fim-${contexto}`).value;
        if (!dataInicio || !dataFim) {
            if (typeof showToast === 'function') showToast("SELECIONE AS DATAS", "aviso");
            return;
        }
    }

    // 2. MAPEAMENTO CORRIGIDO (Dicionário de Ações)
    const acoes = {
        // Agora apontando para os nomes reais das suas funções:
        'dash':       () => typeof gerarDashboard === 'function' && gerarDashboard(valor, dataInicio, dataFim),
        'financeiro': () => typeof gerarRelatorioFinanceiro === 'function' && gerarRelatorioFinanceiro(valor, dataInicio, dataFim),
        'produtos':   () => typeof gerarRelatorioProdutos === 'function' && gerarRelatorioProdutos(valor, dataInicio, dataFim),
        'comandas':   () => typeof gerarRelatorioComandas === 'function' && gerarRelatorioComandas(valor, dataInicio, dataFim),
        'estoque':    () => typeof gerarRelatorioEstoque === 'function' && gerarRelatorioEstoque(valor, dataInicio, dataFim)
    };

    // 3. Executa a função do contexto atual
    if (acoes[contexto]) {
        acoes[contexto]();
    } else {
        console.warn(`⚠️ O contexto [${contexto}] não possui uma função de busca mapeada.`);
    }
}
