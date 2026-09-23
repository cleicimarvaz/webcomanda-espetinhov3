/* =================================================================================
   estorno-admin.js — Tela de estorno de vendas/comandas: listagem, autorização por
   usuário+senha admin, e visualização/reimpressão de comprovante (2ª via)
   ================================================================================= */

// =====================================================================
// MÓDULO DE ESTORNO: CONFIGURAÇÕES E VARIÁVEIS GLOBAIS
// =====================================================================

// Guarda os dados da venda que será estornada temporariamente
let comandaParaEstornar = { id: null, total: null, tabela: 'comandas' };

/**
 * Abre a tela de estorno ocultando o painel principal
 */
window.abrirTelaEstorno = function() {
    const painel = document.getElementById('admin-menu-principal');
    const telaEstorno = document.getElementById('view-vendas-estorno');

    if (painel && telaEstorno) {
        painel.classList.add('hidden');
        telaEstorno.classList.remove('hidden');

        // Carrega as vendas de hoje (0 dias atrás) ao abrir
        if (typeof carregarVendasEstorno === 'function') {
            carregarVendasEstorno(0);
        }
    } else {
        console.error("IDs não encontrados. Verifique 'admin-menu-principal' e 'view-vendas-estorno'.");
    }
};

/**
 * Volta para o menu de ícones
 */
window.voltarAoPainel = function() {
    const painel = document.getElementById('admin-menu-principal');
    const telaEstorno = document.getElementById('view-vendas-estorno');

    if (painel && telaEstorno) {
        telaEstorno.classList.add('hidden');
        painel.classList.remove('hidden');
    }
};

// =====================================================================
// BUSCA E RENDERIZAÇÃO DE DADOS
// =====================================================================

window.carregarVendasEstorno = async function(valor = 0, iniManual = null, fimManual = null) {
    const container = document.getElementById('container-vendas-estorno');
    if (!container) return;

    container.innerHTML = '<div class="col-span-full text-center py-20 animate-pulse text-[10px] font-black text-slate-300 uppercase tracking-widest">Buscando comandas e balcão...</div>';

    try {
        let inicioStr, fimStr;

        // Define o período de busca
        if (valor === 'custom') {
            const dataI = iniManual || document.getElementById('data-inicio-vEstorno')?.value;
            const dataF = fimManual || document.getElementById('data-fim-vEstorno')?.value;
            if (!dataI || !dataF) return;
            inicioStr = `${dataI}T00:00:00`;
            fimStr = `${dataF}T23:59:59`;
        } else {
            const hoje = new Date();
            const dInicio = new Date();
            dInicio.setDate(hoje.getDate() - parseInt(valor));
            inicioStr = `${dInicio.toISOString().split('T')[0]}T00:00:00`;
            fimStr = `${hoje.toISOString().split('T')[0]}T23:59:59`;
        }

        // Busca simultânea nas duas tabelas
        const reqComandas = _supabase.from('comandas').select('*').eq('status', 'fechada').gte('fechada_em', inicioStr).lte('fechada_em', fimStr);
        // IMPORTANTE: Aqui ele traz tudo, incluindo as canceladas, para podermos ver no histórico
        const reqVendas = _supabase.from('historico_vendas').select('*').is('comanda_id', null).gte('criado_em', inicioStr).lte('criado_em', fimStr);

        const [resComandas, resVendas] = await Promise.all([reqComandas, reqVendas]);
        if (resComandas.error) throw resComandas.error;
        if (resVendas.error) throw resVendas.error;

        let listaMista = [];

        // Padroniza os dados das Comandas
        if (resComandas.data) {
            resComandas.data.forEach(c => {
                listaMista.push({
                    id: c.id,
                    identificacao: c.identificacao || 'COMANDA',
                    total: c.total,
                    forma_pagamento: c.forma_pagamento,
                    dataFinalizacao: c.fechada_em,
                    data: c.fechada_em, // Necessário para o ticket impresso
                    tabelaOrigem: 'comandas',
                    icone: '<i data-lucide="clipboard-list" class="w-6 h-6" aria-hidden="true"></i>',
                    status: c.status,
                    estornado_em: c.estornado_em,
                    itens: c.itens // CRUCIAL: Passa os itens para a impressora ler
                });
            });
        }

        // Padroniza os dados do Balcão
        if (resVendas.data) {
            resVendas.data.forEach(v => {
                listaMista.push({
                    id: v.id,
                    identificacao: v.comanda_origem || 'VENDA BALCÃO',
                    total: v.total,
                    forma_pagamento: v.forma_pagamento,
                    dataFinalizacao: v.criado_em,
                    data: v.criado_em, // Necessário para o ticket impresso
                    tabelaOrigem: 'historico_vendas',
                    icone: '<i data-lucide="shopping-cart" class="w-6 h-6" aria-hidden="true"></i>',
                    status: v.status,
                    estornado_em: v.estornado_em,
                    itens: v.itens // CRUCIAL: Passa os itens para a impressora ler
                });
            });
        }

        // Ordenação cronológica
        listaMista.sort((a, b) => new Date(b.dataFinalizacao) - new Date(a.dataFinalizacao));

        if (listaMista.length === 0) {
            container.innerHTML = '<div class="col-span-full text-center py-20 text-[10px] font-black text-slate-400 uppercase italic">Nenhuma venda encontrada.</div>';
            return;
        }

        container.innerHTML = listaMista.map(v => {
            const dataF = new Date(v.dataFinalizacao);
            const valorFormatado = `R$ ${parseFloat(v.total).toFixed(2).replace('.', ',')}`;

            // LÓGICA DO CANCELAMENTO AQUI
            const isCancelada = v.status === 'cancelada';

            // Ajusta o fundo e a borda se for cancelada
            const estiloCard = isCancelada
                ? 'bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-900/50 opacity-80 grayscale-[30%]'
                : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700';

            // Etiqueta extra caso seja cancelada
            const badgeCancelada = isCancelada
                ? `<span class="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm bg-red-600 text-white ml-2">ESTORNADA</span>`
                : '';

            // Se for cancelada, troca o botão por um aviso
            const botaoEstornoHtml = isCancelada
                ? `<div class="bg-red-100/50 dark:bg-red-900/30 text-red-500 px-5 py-3 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-1.5 border border-red-200 dark:border-red-800"><i data-lucide="ban" class="w-3.5 h-3.5" aria-hidden="true"></i> Já Cancelada</div>`
                : `<button onclick="solicitarEstorno('${v.id}', '${v.total}', '${v.tabelaOrigem}')"
                        class="bg-red-600 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-red-500/20 active:scale-95 transition-all hover:bg-red-700 flex items-center justify-center gap-1">
                        <i data-lucide="undo-2" class="w-3.5 h-3.5" aria-hidden="true"></i> Estornar
                   </button>`;

            // Escapa o objeto inteiro para a função de impressão não quebrar com aspas
            const vendaJSON = JSON.stringify(v).replace(/"/g, '&quot;');

            return `
            <div class="${estiloCard} p-5 rounded-[2.2rem] border shadow-sm flex flex-col justify-between gap-4 transition-all">

                <div class="flex justify-between items-start">
                    <div class="flex items-center gap-3">
                        <div class="bg-slate-50 dark:bg-slate-800 w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm border border-slate-100 dark:border-slate-700">
                            ${v.icone}
                        </div>
                        <div>
                            <h4 class="font-black text-sm ${isCancelada ? 'text-red-700 dark:text-red-400' : 'text-slate-800 dark:text-slate-100'} uppercase">${v.identificacao}</h4>
                            <p class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">
                                ${dataF.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})} • ${dataF.toLocaleDateString('pt-BR')}
                            </p>
                        </div>
                    </div>
                    <div class="flex items-center">
                        <span class="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${typeof obterEstiloPilaPagamento === 'function' ? obterEstiloPilaPagamento(v.forma_pagamento) : 'bg-slate-200 text-slate-600'}">
                            ${v.forma_pagamento || 'DINHEIRO'}
                        </span>
                        ${badgeCancelada}
                    </div>
                </div>

                <div class="flex items-center justify-between mt-2 pt-4 border-t border-slate-50 dark:border-slate-800/50">
                    <div>
                        <span class="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Valor Total</span>
                        <span class="${isCancelada ? 'line-through text-slate-400' : 'text-xl text-slate-800 dark:text-white'} font-black">${valorFormatado}</span>
                    </div>

                    <div class="flex gap-2">
                        <button onclick="visualizarDetalhesVenda('${v.id}', '${v.tabelaOrigem}')"
                            class="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-4 py-3 rounded-2xl text-[10px] font-black uppercase shadow-sm active:scale-95 transition-all hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center gap-1">
                            <i data-lucide="eye" class="w-3.5 h-3.5" aria-hidden="true"></i> Ver
                        </button>

                        <button onclick='window.abrirModalImpressao(${vendaJSON})'
                            class="bg-emerald-600 text-white px-4 py-3 rounded-2xl text-[10px] font-black uppercase shadow-sm active:scale-95 transition-all hover:bg-emerald-700 flex items-center justify-center gap-1">
                                <i data-lucide="printer" class="w-3.5 h-3.5" aria-hidden="true"></i> Imprimir
                        </button>

                        ${botaoEstornoHtml}
                    </div>
                </div>
            </div>`;
        }).join('');
        if (typeof lucide !== 'undefined') lucide.createIcons();

    } catch (e) {
        console.error('Erro ao carregar estornos:', e);
    }
};

// =====================================================================
// AUTORIZAÇÃO E PROCESSAMENTO DO ESTORNO
// =====================================================================

window.comandaParaEstornar = null; // Declara a variável globalmente

window.solicitarEstorno = function(id, total, tabelaOrigem) {
    const tabelaCerta = tabelaOrigem ? tabelaOrigem : 'historico_vendas';
    const modal = document.getElementById('modal-estorno');

    // 1. BLINDAGEM MÁXIMA: Salva o ID e a Tabela fisicamente no HTML do modal
    if (modal) {
        modal.setAttribute('data-estorno-id', id);
        modal.setAttribute('data-estorno-tabela', tabelaCerta);
    }

    document.getElementById('input-user-estorno').value = '';
    document.getElementById('input-pass-estorno').value = '';

    const labelValor = document.getElementById('label-valor-estorno');
    if (labelValor) {
        labelValor.innerText = `VALOR DO ESTORNO: R$ ${parseFloat(total).toFixed(2).replace('.', ',')}`;
    }

    if (modal) modal.classList.remove('hidden');

    // Pequeno delay para garantir que o modal abriu antes de focar
    setTimeout(() => {
        const inputUser = document.getElementById('input-user-estorno');
        if (inputUser) inputUser.focus();
    }, 100);
};

window.fecharModalEstorno = function() {
    document.getElementById('modal-estorno').classList.add('hidden');
};

window.processarEstornoComSenha = async function() {
    const modal = document.getElementById('modal-estorno');
    const idVenda = modal.getAttribute('data-estorno-id');
    const tabela = modal.getAttribute('data-estorno-tabela') || 'historico_vendas';

    const usuarioDigitado = document.getElementById('input-user-estorno').value.trim();
    const senhaDigitada = document.getElementById('input-pass-estorno').value.trim();

    if (!usuarioDigitado || !senhaDigitada) {
        if (window.showToast) window.showToast("Preencha usuário e senha!", "aviso");
        return;
    }

    try {
        // 1. Busca o usuário e valida credenciais + permissão
        const { data: usuario, error } = await _supabase
            .from('usuarios')
            .select('*')
            .eq('usuario', usuarioDigitado)
            .eq('senha', senhaDigitada)
            .eq('ativo', true) // Verifica se o usuário está ativo
            .single();

        if (error || !usuario) {
            if (window.showToast) window.showToast("Usuário ou senha inválidos!", "erro");
            return;
        }

        // 2. Verifica se o 'role' é admin
        if (usuario.role !== 'admin') {
            if (window.showToast) window.showToast("Acesso negado: Requer privilégios de administrador.", "erro");
            return;
        }

        // 3. Processa o estorno
        const { error: errorEstorno } = await _supabase
            .from(tabela)
            .update({
                status: 'estornada',
                estornado_em: new Date().toISOString(),
                autorizado_por: usuario.nome || usuario.usuario.toUpperCase()
            })
            .eq('id', parseInt(idVenda));

        if (errorEstorno) throw errorEstorno;

        if (window.showToast) window.showToast("Venda estornada por " + (usuario.nome || usuario.usuario), "sucesso");

        // 4. Auditoria
        if (typeof registrarLog === 'function') {
            await registrarLog('SEGURANÇA', 'ESTORNO', `Venda #${idVenda} estornada por ${usuario.usuario}`);
        }

        // 5. Limpeza e UI
        document.getElementById('input-user-estorno').value = '';
        document.getElementById('input-pass-estorno').value = '';

        if (typeof fecharModalEstorno === 'function') fecharModalEstorno();
        else modal.classList.add('hidden');

        if (typeof window.abrirModalUltimosTickets === 'function') window.abrirModalUltimosTickets();
        if (typeof carregarHistoricoVendas === 'function') carregarHistoricoVendas();

    } catch (e) {
        console.error('❌ Erro no processo de estorno:', e);
        if (window.showToast) window.showToast("Erro ao processar: " + e.message, "erro");
    }
};

// =====================================================================
// CONTROLES DE FILTRO
// =====================================================================

window.mudarFiltroEstorno = function(valor) {
    const botoes = [0, 7, 99];
    botoes.forEach(b => {
        const btn = document.getElementById(`btn-vEstorno-${b}`);
        if (btn) {
            btn.className = "flex-1 py-3 text-[9px] font-black uppercase rounded-lg transition-all text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50";
        }
    });

    const idAtivo = (valor === 'custom') ? 99 : valor;
    const btnAtivo = document.getElementById(`btn-vEstorno-${idAtivo}`);
    if (btnAtivo) {
        btnAtivo.className = "flex-1 py-3 text-[9px] font-black uppercase rounded-lg transition-all shadow-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-white";
    }

    if (valor === 'custom') {
        const ini = document.getElementById('data-inicio-vEstorno').value;
        const fim = document.getElementById('data-fim-vEstorno').value;
        if (!ini || !fim) return;
        carregarVendasEstorno('custom', ini, fim);
    } else {
        document.getElementById('container-periodo-vEstorno').classList.add('hidden');
        carregarVendasEstorno(valor);
    }
};

window.togglePeriodoEstorno = function() {
    const container = document.getElementById('container-periodo-vEstorno');
    container.classList.toggle('hidden');
};

window.visualizarDetalhesVenda = async function(id, tabelaOrigem) {
    if (typeof showToast === 'function') showToast("Buscando cupom...", "aviso");

    try {
        // 1. Usa select('*') para não dar erro caso falte alguma coluna no banco
        const { data, error } = await _supabase
            .from(tabelaOrigem)
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error("[SUPABASE ERRO]:", error);
            throw error;
        }

        // 2. Normaliza o identificador (Cobre os nomes antigos e novos do banco)
        const identificador = data.identificacao || (data.comanda_id ? `MESA ${data.comanda_id}` : (data.comanda_origem ? `MESA ${data.comanda_origem}` : 'BALCÃO'));
        document.getElementById('recibo-titulo').innerText = `2ª VIA - ${identificador}`;

        // 3. Preenche a Data (Cobre criado_em, created_at ou fechada_em)
        const dataVenda = new Date(data.fechada_em || data.criado_em || data.created_at || new Date());
        const dataStr = dataVenda.toLocaleDateString('pt-BR');
        const horaStr = dataVenda.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        document.getElementById('recibo-data').innerText = `DATA: ${dataStr}, ${horaStr}`;

        // 4. Normaliza os Itens para exibir na tela
        let htmlItens = '';
        let itensArray = [];

        if (typeof data.itens === 'string') {
            try { itensArray = JSON.parse(data.itens); } catch (e) { itensArray = []; }
        } else if (Array.isArray(data.itens)) {
            itensArray = data.itens;
        }

        if (itensArray && itensArray.length > 0) {
            htmlItens = itensArray.map(item => {
                const qtd = item.quantidade || item.qtd || 1;
                const nome = item.nome || item.produto || 'ITEM';
                const preco = parseFloat(item.preco || item.valor || 0);
                const totalItem = preco * qtd;

                return `
                <div class="flex justify-between items-start gap-2">
                    <span class="flex-1 leading-tight text-left">${qtd}X ${nome.toUpperCase()}</span>
                    <span class="whitespace-nowrap font-bold">R$ ${totalItem.toFixed(2).replace('.', ',')}</span>
                </div>`;
            }).join('');
        } else {
            htmlItens = '<div class="text-center opacity-50 py-2">Sem detalhes de itens salvos.</div>';
        }

        document.getElementById('recibo-itens').innerHTML = htmlItens;

        // 5. Preenche Total e Pagamento na Tela
        document.getElementById('recibo-total').innerText = `R$ ${parseFloat(data.total).toFixed(2).replace('.', ',')}`;
        document.getElementById('recibo-pagamento').innerText = (data.forma_pagamento || 'DINHEIRO').toUpperCase();

        // 6. Guarda os dados padronizados para a nossa Impressora!
        window.dadosReimpressaoAtual = {
            id: id, // <-- ADICIONADO: Para sair o número do pedido no comprovante
            tipo: `2ª VIA - ${identificador}`,
            total: data.total,
            forma_pagamento: data.forma_pagamento || 'DINHEIRO', // <-- AJUSTADO NOME DA CHAVE
            recebido: data.valor_recebido || data.recebido || 0,
            troco: data.troco || 0,
            itens: itensArray,
            data: dataVenda,
            cliente_nome: data.cliente_nome || data.cliente || "" // <-- ADICIONADO: Para puxar o nome se tiver
        };

        // 7. Abre o modal
        document.getElementById('modal-preview-recibo').classList.remove('hidden');

    } catch (e) {
        console.error("Erro ao buscar detalhes:", e);
        if (typeof showToast === 'function') showToast("Erro ao gerar visualização", "erro");
    }
};

// 8. Função que você vai chamar no botão "Imprimir" dentro do modal de preview
window.dispararReimpressao = function() {
    if (window.dadosReimpressaoAtual) {
        // Dispara o nosso cupom perfeito de 48mm passando os dados retroativos
        window.imprimirTicketVenda(window.dadosReimpressaoAtual);
    } else {
        if (typeof showToast === 'function') showToast("Dados para impressão não encontrados.", "erro");
    }
};

// Mantém a função de fechar logo abaixo
window.fecharPreviewRecibo = function() {
    document.getElementById('modal-preview-recibo').classList.add('hidden');
};

// Função para abrir o painel de ordenação
window.abrirMenuVendas = function() {
    const overlay = document.getElementById('overlay-vendas');
    const bottomSheet = document.getElementById('bottom-sheet-vendas');

    if (overlay && bottomSheet) {
        overlay.classList.remove('hidden');
        bottomSheet.classList.remove('translate-y-full');
    }
};

// Função para fechar o painel de ordenação
window.fecharMenuVendas = function() {
    const overlay = document.getElementById('overlay-vendas');
    const bottomSheet = document.getElementById('bottom-sheet-vendas');

    if (overlay && bottomSheet) {
        overlay.classList.add('hidden');
        bottomSheet.classList.add('translate-y-full');
    }
};
