/* =================================================================================
   MÓDULO DE COMANDAS E MESAS - ESPETINHO & CIA (OTIMIZADO)
   ================================================================================= */

window.comandaEmFechamentoId = null;
window.totalFechamentoCache  = 0;
window.dadosComandaImpressao = null;

/* --- 1. REGRA DE NEGÓCIO: O QUE VAI PARA A COZINHA --- */

window.isItemCozinha = function(item) {
    if (!item) return false;
    const cat  = (item.categoria || '').toLowerCase();
    const nome = (item.nome || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    if (item.precisa_preparo === false) return false;
    if (cat.includes('bebida') || cat.includes('cerveja') || cat.includes('refrigerante') ||
        cat.includes('agua')   || cat.includes('água')   || cat.includes('suco')) return false;
    if (nome.includes('PGTO') || nome.includes('AGUA') || nome.includes('REFRIGERANTE') ||
        nome.includes('CERVEJA') || nome.includes('SUCO') || nome.includes('COCA') ||
        nome.includes('GUARANA') || nome.includes('PEPSI') || nome.includes('HEINEKEN')) return false;
    return true;
};

/* --- 2. CARREGAMENTO E GESTÃO DAS MESAS --- */

window.carregarComandas = async function() {
    if (typeof _supabase === 'undefined') return;

    const cont = document.getElementById('lista-comandas-ativas');
    if (!cont) return;

    try {
        const { data: cms, error } = await _supabase
            .from('comandas')
            .select('*')
            .eq('status', 'aberta')
            .order('id');

        if (error) throw error;

        if (!cms || cms.length === 0) {
            cont.innerHTML = `
                <div class="col-span-full py-20 text-center opacity-30">
                    <div class="w-20 h-20 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4"><i data-lucide="clipboard-list" class="w-9 h-9" aria-hidden="true"></i></div>
                    <p class="font-black uppercase text-[10px] tracking-widest">Nenhuma mesa aberta no momento.</p>
                </div>`;
            return;
        }

        cont.innerHTML = cms.map(c => {
            // NOVO: Recalcula o total ignorando itens recusados para o display do card
            const itensValidos = (c.itens || []).filter(i => i.cozinha_status !== 'cancelado_preparo');
            const totalCorreto = itensValidos.reduce((acc, i) => acc + (parseFloat(i.preco) * i.qtd), 0);

            return `
            <div class="bg-white dark:bg-slate-900 p-5 rounded-[2.5rem] shadow-sm mb-4 border border-slate-50 dark:border-slate-800 transition-colors duration-300">
                <div class="flex justify-between items-center mb-5 px-2">
                    <div class="flex items-center gap-3">
                        <div class="bg-orange-50 dark:bg-orange-900/20 w-10 h-10 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-orange-100 dark:border-orange-800/50"><i data-lucide="notebook-pen" class="w-5 h-5 text-orange-500" aria-hidden="true"></i></div>
                        <div>
                            <span class="text-[8px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest italic">IDENTIFICAÇÃO</span>
                            <h4 class="font-black text-slate-800 dark:text-white text-sm uppercase italic leading-none">${c.identificacao}</h4>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase italic mb-1">TOTAL DA MESA</p>
                        <!-- AQUI USAMOS O TOTAL CORRETO -->
                        <p class="text-xl font-black text-[#e63946] italic leading-none">R$ ${window.fmSeguro(totalCorreto)}</p>
                    </div>
                </div>
                <div class="grid grid-cols-4 gap-2">
                    <button onclick="lancarNaMesa(${c.id})" class="h-16 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 flex flex-col justify-center items-center active:scale-95 transition-all text-slate-600 dark:text-slate-300">
                        <i data-lucide="shopping-cart" class="w-4 h-4 mb-1" aria-hidden="true"></i><span class="text-[9px] font-black uppercase italic leading-none">LANÇAR</span>
                    </button>
                    <button onclick="abrirDetalhesComanda(${c.id})" class="h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 flex flex-col justify-center items-center active:scale-95 transition-all text-blue-500">
                        <i data-lucide="eye" class="w-4 h-4 mb-1" aria-hidden="true"></i><span class="text-[9px] font-black uppercase italic leading-none">VER</span>
                    </button>
                    <button onclick="irParaDivisao(${c.id})" class="h-16 rounded-2xl bg-[#fff7ed] dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 flex flex-col justify-center items-center active:scale-95 transition-all text-orange-500">
                        <i data-lucide="split" class="w-4 h-4 mb-1" aria-hidden="true"></i><span class="text-[9px] font-black uppercase italic leading-none">DIVIDIR</span>
                    </button>
                    <button onclick="abrirModalFechamento(${c.id})" class="h-16 rounded-2xl bg-emerald-500 border border-emerald-600 flex flex-col justify-center items-center active:scale-95 transition-all text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20">
                        <i data-lucide="circle-dollar-sign" class="w-4 h-4 mb-1" aria-hidden="true"></i><span class="text-[9px] font-black uppercase italic leading-none">PAGAR</span>
                    </button>
                </div>
            </div>`;
        }).join('');
        if (typeof lucide !== 'undefined') lucide.createIcons();

    } catch (e) {
        console.error('[COMANDAS] Erro ao carregar mesas:', e);
        cont.innerHTML = `
            <div class="col-span-full py-20 text-center opacity-60">
                <p class="font-black uppercase text-[10px] tracking-widest text-red-400">Erro ao carregar mesas. Verifique a conexão.</p>
                <button onclick="carregarComandas()" class="mt-4 text-[10px] font-black text-slate-400 uppercase underline">Tentar novamente</button>
            </div>`;
    }
};

/**
 * Ação administrativa: encerra de uma vez todas as comandas com status
 * 'aberta' (ex: mesas esquecidas abertas de dias anteriores). Não gera
 * venda nem mexe no caixa — só marca a comanda como fechada para tirá-la
 * das listagens de mesas ativas. Fica registrado na auditoria.
 */
window.encerrarTodasComandasPendentes = function() {
    if (typeof confirmarAcao !== 'function') return;

    confirmarAcao(
        'Isso vai encerrar TODAS as comandas em aberto agora, sem gerar venda. Use só para limpar mesas esquecidas. Tem certeza?',
        async () => {
            try {
                const { data: abertas, error: errBusca } = await _supabase
                    .from('comandas')
                    .select('id, identificacao')
                    .eq('status', 'aberta');
                if (errBusca) throw errBusca;

                if (!abertas || abertas.length === 0) {
                    if (typeof showToast === 'function') showToast('NENHUMA COMANDA ABERTA NO MOMENTO', 'aviso');
                    return;
                }

                const agora = new Date().toISOString();
                const { error: errUpdate } = await _supabase
                    .from('comandas')
                    .update({ status: 'fechada', fechada_em: agora, updated_at: agora })
                    .eq('status', 'aberta');
                if (errUpdate) throw errUpdate;

                if (typeof registrarLog === 'function') {
                    const nomes = abertas.map(c => c.identificacao).join(', ');
                    await registrarLog('SISTEMA', 'ENCERROU COMANDAS EM MASSA', `${abertas.length} COMANDA(S) ENCERRADA(S) MANUALMENTE: ${nomes}`);
                }

                if (typeof showToast === 'function') showToast(`${abertas.length} COMANDA(S) ENCERRADA(S)!`, 'sucesso');
                if (typeof window.carregarComandas === 'function') window.carregarComandas();
            } catch (e) {
                console.error('[COMANDAS] Erro ao encerrar em massa:', e);
                if (typeof showToast === 'function') showToast('ERRO AO ENCERRAR COMANDAS', 'erro');
            }
        },
        'Encerrar Comandas Pendentes'
    );
};

window.toggleNumeroMesa = function() {
    const checkbox = document.getElementById('c-tem-numero-mesa');
    const container = document.getElementById('container-numero-mesa');
    if (!container) return;
    container.classList.toggle('hidden', !checkbox.checked);
    if (!checkbox.checked) {
        const inputNumero = document.getElementById('c-numero-mesa');
        if (inputNumero) inputNumero.value = '';
    }
};

window.abrirNovaComanda = async function() {
    const inputIdentificacao = document.getElementById('c-identificacao');
    let id = inputIdentificacao.value.toUpperCase().trim();

    const temNumeroMesa = document.getElementById('c-tem-numero-mesa')?.checked;
    const numeroMesa = document.getElementById('c-numero-mesa')?.value.trim();
    if (temNumeroMesa && numeroMesa) {
        id = id ? `${id} (MESA Nº ${numeroMesa})` : `MESA Nº ${numeroMesa}`;
    }

    // ----------------------------------------------------
    // VALIDAÇÃO 1: NOME DA MESA EM BRANCO
    // ----------------------------------------------------
    if (!id) {
        if (typeof showToast === 'function') {
            showToast('INFORME NOME DA MESA/CLIENTE', 'erro');
        } else if (typeof alertaSistema === 'function') {
            alertaSistema('Por favor, informe a identificação da mesa ou do cliente para abrir a comanda.', 'Atenção');
        } else {
            alert('INFORME A MESA');
        }
        return;
    }

    if (typeof window.verificarLojaAbertaOuAvisar === 'function' && !(await window.verificarLojaAbertaOuAvisar())) {
        return;
    }

    // ----------------------------------------------------
    // VALIDAÇÃO 1.5: VERIFICAÇÃO LOCAL (MEMÓRIA) INSTANTÂNEA
    // Bloqueia no mesmo milissegundo se a mesa já estiver na tela
    // ----------------------------------------------------
    if (window.COMANDAS_ATIVAS) {
        const mesaLocal = window.COMANDAS_ATIVAS.find(c => c.identificacao.toUpperCase().trim() === id);
        if (mesaLocal) {
            if (typeof showToast === 'function') {
                showToast('ESTA MESA JÁ ESTÁ ABERTA!', 'erro');
            } else if (typeof alertaSistema === 'function') {
                alertaSistema(`A comanda "${id}" já está aberta no seu sistema. Verifique a lista.`, 'Mesa Ocupada');
            } else {
                alert('MESA JÁ ABERTA');
            }
            return; // Interrompe imediatamente!
        }
    }

    try {
        // ----------------------------------------------------
        // VALIDAÇÃO 2: MESA JÁ EXISTE NO BANCO DE DADOS (SUPABASE)
        // Garante que outro garçom não abriu a mesa em outro celular agora pouco
        // ----------------------------------------------------
        const { data: mesaExistente } = await _supabase
            .from('comandas').select('id').eq('identificacao', id).eq('status', 'aberta').maybeSingle();

        if (mesaExistente) { 
            if (typeof showToast === 'function') {
                showToast('OUTRO GARÇOM JÁ ABRIU ESTA MESA!', 'erro');
            } else if (typeof alertaSistema === 'function') {
                alertaSistema(`Alguém da equipe já abriu a comanda para "${id}". Atualize sua lista de mesas.`, 'Mesa Ocupada');
            } else {
                alert('MESA JÁ ABERTA POR OUTRA PESSOA'); 
            }
            return; 
        }

        // ====================================================
        // SE PASSOU PELAS DUAS TRAVAS, PODE ABRIR A MESA!
        // ====================================================
        const { error } = await _supabase.from('comandas').insert([{
            identificacao: id,
            status: 'aberta',
            itens: [],
            total: 0,
            vendedor: localStorage.getItem('userName') || 'Caixa'
        }]);

        if (error) throw error;

        // --- REGISTRO DE AUDITORIA ---
        if (typeof registrarLog === 'function') {
            await registrarLog('SISTEMA', `ABRIU COMANDA: ${id}`);
        }

        inputIdentificacao.value = '';
        const checkboxNumeroMesa = document.getElementById('c-tem-numero-mesa');
        if (checkboxNumeroMesa) checkboxNumeroMesa.checked = false;
        if (typeof window.toggleNumeroMesa === 'function') window.toggleNumeroMesa();
        if (typeof carregarComandas === 'function') carregarComandas();
        if (typeof alternarAbasComanda === 'function') alternarAbasComanda('lista');
        
        if (typeof showToast === 'function') showToast('MESA ABERTA COM SUCESSO!');

    } catch (e) {
        console.error('[COMANDAS] Erro ao abrir mesa:', e);
        // ----------------------------------------------------
        // TRATAMENTO DE ERRO NO CATCH
        // ----------------------------------------------------
        if (typeof showToast === 'function') {
            showToast('ERRO AO ABRIR MESA', 'erro');
        } else if (typeof alertaSistema === 'function') {
            alertaSistema('Ocorreu um erro de comunicação ao tentar abrir a mesa. Verifique a internet e tente novamente.', 'Erro de Conexão');
        }
    }
};

window.alternarAbasComanda = function(a) {
    document.getElementById('aba-lista-comanda')?.classList.toggle('hidden', a !== 'lista');
    document.getElementById('aba-abrir-comanda')?.classList.toggle('hidden', a !== 'abrir');
    document.getElementById('aba-encerradas-comanda')?.classList.toggle('hidden', a !== 'encerradas');

    const act   = 'flex-1 py-3 rounded-full bg-[#e63946] text-white text-[9px] font-black uppercase italic tracking-widest shadow-sm';
    const inact = 'flex-1 py-3 rounded-full bg-transparent text-slate-400 dark:text-slate-500 text-[9px] font-black uppercase italic tracking-widest';
    const btnL = document.getElementById('btn-comanda-lista');
    const btnA = document.getElementById('btn-comanda-abrir');
    const btnE = document.getElementById('btn-comanda-encerradas');
    if (btnL) btnL.className = a === 'lista' ? act : inact;
    if (btnA) btnA.className = a === 'abrir'  ? act : inact;
    if (btnE) btnE.className = a === 'encerradas' ? act : inact;

    if (a === 'encerradas') window.carregarComandasEncerradas();
};

window.carregarComandasEncerradas = async function() {
    const cont = document.getElementById('lista-comandas-encerradas');
    if (!cont || typeof _supabase === 'undefined') return;

    try {
        const { data: cms, error } = await _supabase
            .from('comandas')
            .select('*')
            .eq('status', 'fechada')
            .order('fechada_em', { ascending: false })
            .limit(20);

        if (error) throw error;

        if (!cms || cms.length === 0) {
            cont.innerHTML = `
                <div class="col-span-full py-20 text-center opacity-30">
                    <div class="w-20 h-20 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4"><i data-lucide="clipboard-check" class="w-9 h-9" aria-hidden="true"></i></div>
                    <p class="font-black uppercase text-[10px] tracking-widest">Nenhuma mesa encerrada ainda.</p>
                </div>`;
            if (typeof lucide !== 'undefined') lucide.createIcons();
            return;
        }

        cont.innerHTML = cms.map(c => {
            const fechada = c.fechada_em ? new Date(c.fechada_em) : null;
            const dataFormatada = fechada
                ? `${fechada.toLocaleDateString('pt-BR')} ${fechada.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                : '--';
            const total = parseFloat(c.total || 0);

            return `
            <div class="bg-white dark:bg-slate-900 p-4 rounded-[1.75rem] shadow-sm mb-3 border border-slate-50 dark:border-slate-800 flex items-center justify-between gap-3">
                <div class="min-w-0">
                    <p class="font-black text-slate-800 dark:text-white text-sm uppercase truncate">${c.identificacao || ('MESA ' + c.id)}</p>
                    <p class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1 mt-0.5"><i data-lucide="clock" class="w-3 h-3" aria-hidden="true"></i> ${dataFormatada}</p>
                </div>
                <div class="flex items-center gap-3 shrink-0">
                    <span class="text-sm font-black text-emerald-500">R$ ${window.fmSeguro(total)}</span>
                    <button onclick="window.reabrirComanda(${c.id})" aria-label="Reabrir comanda" class="w-9 h-9 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-full flex items-center justify-center active:scale-90 transition-transform"><i data-lucide="rotate-ccw" class="w-4 h-4" aria-hidden="true"></i></button>
                    <button onclick="window.reimprimirComanda(${c.id})" aria-label="Reimprimir comprovante" class="w-9 h-9 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 rounded-full flex items-center justify-center active:scale-90 transition-transform"><i data-lucide="printer" class="w-4 h-4" aria-hidden="true"></i></button>
                    <button onclick="window.reimprimirComandaDetalhada(${c.id})" aria-label="Comprovante Detalhado" class="w-9 h-9 bg-purple-50 dark:bg-purple-900/20 text-purple-500 rounded-full flex items-center justify-center active:scale-90 transition-transform"><i data-lucide="receipt" class="w-4 h-4" aria-hidden="true"></i></button>
                </div>
            </div>`;
        }).join('');

        if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (e) {
        console.error('[COMANDAS] Erro ao carregar mesas encerradas:', e);
        cont.innerHTML = '<p class="text-center text-red-500 font-bold text-[10px] uppercase py-10">Erro ao carregar histórico.</p>';
    }
};

/**
 * Reabre uma comanda encerrada (volta status para 'aberta'), para quando a
 * mesa foi fechada por engano ou o cliente pediu mais alguma coisa. Não mexe
 * em nenhuma venda/recebimento ja registrado no fechamento anterior — só
 * reabre a mesa para novos lançamentos.
 */
window.reabrirComanda = function(id) {
    if (typeof confirmarAcao !== 'function') return;

    confirmarAcao(
        'Isso vai reabrir esta comanda para novos lançamentos. O valor já recebido no fechamento anterior continua registrado normalmente. Deseja reabrir?',
        async () => {
            try {
                const { data: c, error: errBusca } = await _supabase.from('comandas').select('identificacao').eq('id', id).single();
                if (errBusca) throw errBusca;

                const { error } = await _supabase
                    .from('comandas')
                    .update({ status: 'aberta', fechada_em: null, updated_at: new Date().toISOString() })
                    .eq('id', id);
                if (error) throw error;

                if (typeof registrarLog === 'function') {
                    await registrarLog('SISTEMA', 'REABRIU COMANDA', `MESA: ${c?.identificacao || id}`);
                }

                if (typeof showToast === 'function') showToast('COMANDA REABERTA!', 'sucesso');
                if (typeof window.carregarComandasEncerradas === 'function') window.carregarComandasEncerradas();
                if (typeof window.carregarComandas === 'function') await window.carregarComandas();
                if (typeof window.alternarAbasComanda === 'function') window.alternarAbasComanda('lista');
            } catch (e) {
                console.error('[COMANDAS] Erro ao reabrir comanda:', e);
                if (typeof showToast === 'function') showToast('ERRO AO REABRIR COMANDA', 'erro');
            }
        },
        'Reabrir Comanda'
    );
};

/* --- NAVEGAÇÃO: VENDA DIRETA --- */
window.irParaVendaDireta = function() {
    // 1. Limpa a memória da mesa ativa
    sessionStorage.removeItem('comandaAtivaId');
    
    // 2. Redireciona para a tela de vendas "limpa"
    window.location.href = 'venda.html';
};

window.lancarNaMesa = function(id) {
    sessionStorage.setItem('comandaAtivaId', id);
    window.location.href = 'venda.html';
};

window.irParaDivisao = function(id) {
    // --- BLOQUEIO LÓGICO DE PERMISSÃO ---
    const nivelUpper = (localStorage.getItem('userNivel') || 'VENDEDOR').toUpperCase();

    if (nivelUpper !== 'ADMIN' && nivelUpper !== 'GERENTE') {
        if (typeof alertaSistema === 'function') {
            alertaSistema("Apenas gerentes ou administradores podem dividir contas.", "ACESSO NEGADO");
        } else {
            alert("ACESSO NEGADO: Apenas gerentes ou administradores podem dividir contas.");
        }
        return; 
    }
    // ------------------------------------
    
    window.location.href = `divisao.html?id=${id}`;
};

/* --- 3. DETALHES E FECHAMENTO --- */

window.abrirDetalhesComanda = async function(id) {
    try {
        const { data: c, error } = await _supabase.from('comandas').select('*').eq('id', id).single();
        if (error || !c) return;

        // NOVO: Calcula o total ignorando os itens recusados pela cozinha
        const itensValidos = (c.itens || []).filter(i => i.cozinha_status !== 'cancelado_preparo');
        const totalCalculado = itensValidos.reduce((acc, i) => acc + (parseFloat(i.preco) * i.qtd), 0);

        // Adicionamos o "idx" no map para saber qual item remover
        const htmlItens = (c.itens || []).map((i, idx) => {
            const isCancelado = i.cozinha_status === 'cancelado_preparo';
            const isCozinha = window.isItemCozinha(i);
            const isPronto  = i.cozinha_status === 'pronto';
            let badgeStatus = '';

            // NOVO: Lógica de badges incluindo o status RECUSADO
            if (isCancelado) {
                badgeStatus = '<span class="bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400 px-1.5 py-0.5 rounded text-[8px] font-black uppercase ml-2 border border-red-100 inline-flex items-center gap-1"><i data-lucide="x-circle" class="w-2.5 h-2.5" aria-hidden="true"></i> RECUSADO</span>';
            } else if (isCozinha) {
                badgeStatus = isPronto
                    ? '<span class="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded text-[8px] font-black uppercase ml-2 border border-emerald-100 inline-flex items-center gap-1"><i data-lucide="check" class="w-2.5 h-2.5" aria-hidden="true"></i> ENTREGUE</span>'
                    : '<span class="bg-orange-50 dark:bg-orange-900/30 text-orange-500 dark:text-orange-400 px-1.5 py-0.5 rounded text-[8px] font-black uppercase ml-2 border border-orange-100 inline-flex items-center gap-1"><i data-lucide="hourglass" class="w-2.5 h-2.5" aria-hidden="true"></i> NA COZINHA</span>';
            } else {
                badgeStatus = '<span class="bg-slate-100 dark:bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded text-[8px] font-black uppercase ml-2 border border-slate-200">S/ PREPARO</span>';
            }

            // NOVO: Estilização de texto riscado (line-through) para itens recusados
            const textClass = isCancelado ? 'line-through opacity-50 text-slate-400' : 'text-slate-700 dark:text-slate-200';
            const priceClass = isCancelado ? 'line-through text-red-400 opacity-50' : 'text-slate-400';

            return `
                <div class="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2 mb-2 last:border-0 last:mb-0">
                    <div class="flex items-center flex-1">
                        <span class="font-black ${textClass} text-[11px] uppercase">${i.qtd}x ${i.nome}</span>
                        ${badgeStatus}
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="font-bold ${priceClass} text-[10px]">R$ ${window.fmSeguro(i.preco * i.qtd)}</span>
                        
                        <button onclick="window.removerItemComanda(${c.id}, ${idx}, '${(i.nome || '').replace(/'/g, "\\'")}')"
                                class="text-xs opacity-50 hover:opacity-100 hover:text-red-500 transition-all p-1"
                                aria-label="Remover item" title="Remover item">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5" aria-hidden="true"></i>
                        </button>
                    </div>
                </div>`;
        }).join('');

        document.getElementById('titulo-detalhes-mesa').innerText = `MESA ${c.identificacao}`;
        document.getElementById('lista-itens-detalhes').innerHTML = htmlItens;
        
        // NOVO: Atualiza o total exibido na tela usando o valor recalculado
        document.getElementById('total-detalhes').innerText = `R$ ${window.fmSeguro(totalCalculado)}`;
        if (typeof lucide !== 'undefined') lucide.createIcons();

        // NOVO: A impressão da pré-conta agora envia apenas os itens válidos e o novo total
        document.getElementById('btn-imprimir-preconta').onclick = () => {
            const dadosPreConta = { ...c, itens: itensValidos, total: totalCalculado, tipo: `PRÉ-CONTA - MESA ${c.identificacao}` };
            if(typeof window.imprimirTicketVenda === 'function') window.imprimirTicketVenda(dadosPreConta);
        };
        
        document.getElementById('btn-add-item-modal').onclick    = () => { fecharDetalhesComanda(); lancarNaMesa(c.id); };
        document.getElementById('btn-pagar-modal-detalhes').onclick = () => { fecharDetalhesComanda(); abrirModalFechamento(c.id); };

        document.getElementById('modal-detalhes-comanda').classList.remove('hidden');
        document.getElementById('modal-detalhes-comanda').classList.add('flex');
    } catch (e) {
        console.error('[COMANDAS] Erro ao abrir detalhes:', e);
        if (typeof showToast === 'function') showToast('ERRO AO CARREGAR DETALHES', 'erro');
    }
};

window.fecharDetalhesComanda = function() {
    document.getElementById('modal-detalhes-comanda')?.classList.add('hidden');
};

window.abrirModalFechamento = async function(id) {
    // --- BLOQUEIO LÓGICO DE PERMISSÃO ---
    const nivelUpper = (localStorage.getItem('userNivel') || 'VENDEDOR').toUpperCase();

    if (nivelUpper !== 'ADMIN' && nivelUpper !== 'GERENTE') {
        if (typeof alertaSistema === 'function') {
            alertaSistema("Apenas gerentes ou administradores podem finalizar mesas.", "ACESSO NEGADO");
        } else {
            alert("ACESSO NEGADO: Apenas gerentes ou administradores podem finalizar mesas.");
        }
        return; 
    }
    // ------------------------------------

    window.comandaEmFechamentoId = id;
    try {
        const { data: c, error } = await _supabase.from('comandas').select('*').eq('id', id).single();
        if (error || !c) return;

        // Filtra os itens válidos (ignorando os recusados pela cozinha)
        const itensValidos = (c.itens || []).filter(i => i.cozinha_status !== 'cancelado_preparo');
        const totalCalculado = itensValidos.reduce((acc, i) => acc + (parseFloat(i.preco) * i.qtd), 0);

        window.totalFechamentoCache = totalCalculado;
        document.getElementById('total-fechamento').innerText = `R$ ${window.fmSeguro(totalCalculado)}`;
        document.getElementById('titulo-fechamento-mesa').innerText = c.identificacao;

        // Renderiza apenas os itens válidos no resumo de pagamento
        document.getElementById('lista-itens-fechamento').innerHTML = itensValidos.map(i => `
            <div class="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800 text-[10px]">
                <span class="uppercase">${i.qtd}x ${i.nome}</span>
                <span class="font-black">R$ ${window.fmSeguro(parseFloat(i.preco) * i.qtd)}</span>
            </div>`).join('');

        document.getElementById('forma-pagamento-fechamento').value = 'Pix';
        document.querySelectorAll('.btn-pagamento-fechamento').forEach(btn => {
            const ehFiado = btn.textContent.trim().toUpperCase().includes('FIADO');
            const base = ehFiado
                ? 'btn-pagamento-fechamento w-full p-2 rounded-xl text-[10px] font-black uppercase border-2 transition-all active:scale-95 flex items-center justify-center gap-2 mb-4'
                : 'btn-pagamento-fechamento p-2 rounded-xl text-[10px] font-black uppercase border-2 transition-all active:scale-95 flex flex-col items-center justify-center gap-1';
            btn.className = base + ' bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
        });
        const btnPix = document.querySelector('.btn-pagamento-fechamento[onclick*="\'Pix\'"]');
        if (btnPix) btnPix.className = 'btn-pagamento-fechamento p-2 rounded-xl text-[10px] font-black uppercase border-2 transition-all active:scale-95 flex flex-col items-center justify-center gap-1 bg-emerald-500 text-white border-emerald-600 dark:bg-emerald-600 dark:border-emerald-500';
        window.handlePagamentoFechamentoChange();

        document.getElementById('modal-fechamento').classList.remove('hidden');
        document.getElementById('modal-fechamento').classList.add('flex');
    } catch (e) {
        if (typeof showToast === 'function') showToast('ERRO AO ABRIR FECHAMENTO', 'erro');
    }
};

window.selecionarPagamentoFechamento = function(metodo, elementoClicado) {
    document.getElementById('forma-pagamento-fechamento').value = metodo;

    const classeSelecionado = 'bg-emerald-500 text-white border-emerald-600 dark:bg-emerald-600 dark:border-emerald-500';
    const classeInativo = 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
    const ehFiado = metodo === 'Fiado';
    const baseClasses = ehFiado
        ? 'btn-pagamento-fechamento w-full p-2 rounded-xl text-[10px] font-black uppercase border-2 transition-all active:scale-95 flex items-center justify-center gap-2 mb-4'
        : 'btn-pagamento-fechamento p-2 rounded-xl text-[10px] font-black uppercase border-2 transition-all active:scale-95 flex flex-col items-center justify-center gap-1';

    document.querySelectorAll('.btn-pagamento-fechamento').forEach(btn => {
        const btnEhFiado = btn.textContent.trim().toUpperCase().includes('FIADO');
        const btnBase = btnEhFiado
            ? 'btn-pagamento-fechamento w-full p-2 rounded-xl text-[10px] font-black uppercase border-2 transition-all active:scale-95 flex items-center justify-center gap-2 mb-4'
            : 'btn-pagamento-fechamento p-2 rounded-xl text-[10px] font-black uppercase border-2 transition-all active:scale-95 flex flex-col items-center justify-center gap-1';
        btn.className = btnBase + ' ' + classeInativo;
    });

    elementoClicado.className = baseClasses + ' ' + classeSelecionado;

    if (typeof window.handlePagamentoFechamentoChange === 'function') {
        window.handlePagamentoFechamentoChange();
    }
};

window.fecharModalFechamento = function() {
    document.getElementById('modal-fechamento')?.classList.add('hidden');
};

window.handlePagamentoFechamentoChange = function() {
    const forma = document.getElementById('forma-pagamento-fechamento').value;
    const container = document.getElementById('container-recebido-fechamento');
    const containerFiado = document.getElementById('container-fiado-fechamento');
    const btnFinalizar = document.getElementById('btn-confirmar-fechamento');

    // Reseta o botão ao trocar de forma de pagamento
    btnFinalizar.disabled = false;
    btnFinalizar.style.opacity = "1";
    btnFinalizar.innerText = "FINALIZAR E FECHAR CONTA";

    if (forma === 'Dinheiro') {
        container.classList.remove('hidden');
        container.classList.add('flex');
        document.getElementById('valor-recebido-fechamento').focus();
    } else {
        container.classList.add('hidden');
        container.classList.remove('flex');
    }

    if (containerFiado) {
        if (forma === 'Fiado') {
            containerFiado.classList.remove('hidden');
            containerFiado.classList.add('flex');
        } else {
            containerFiado.classList.add('hidden');
            containerFiado.classList.remove('flex');
        }
    }
};

window.calcularTrocoFechamento = function() {
    const total = window.totalFechamentoCache || 0;
    const inputRecebido = document.getElementById('valor-recebido-fechamento').value;
    const recebido = parseFloat(inputRecebido.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
    
    const areaInfo = document.getElementById('area-troco-fechamento');
    const labelInfo = areaInfo.querySelector('p:first-child');
    const valorInfo = document.getElementById('valor-troco-fechamento');
    const btnFinalizar = document.getElementById('btn-confirmar-fechamento');

    // Se o campo estiver vazio ou for 0, esconde a área e habilita o botão (previne trava no início)
    if (recebido === 0) {
        areaInfo.classList.add('hidden');
        btnFinalizar.disabled = false;
        btnFinalizar.style.opacity = "1";
        return;
    }

    areaInfo.classList.remove('hidden');

    if (recebido < total) {
        // --- CASO: FALTA DINHEIRO ---
        const falta = total - recebido;
        labelInfo.innerHTML = '<i data-lucide="triangle-alert" class="inline w-3 h-3" aria-hidden="true"></i> VALOR RESTANTE (FALTANDO)';
        if (typeof lucide !== 'undefined') lucide.createIcons();
        valorInfo.innerText = `R$ ${window.fmSeguro(falta)}`;
        
        // Estilo Vermelho (Atenção)
        areaInfo.className = "p-4 rounded-2xl border bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800/50";
        valorInfo.className = "text-2xl font-black text-red-500 text-center";
        labelInfo.className = "text-[9px] font-black text-red-600 dark:text-red-400 uppercase text-center mb-1 tracking-widest";
        
        // Bloqueia o Botão
        btnFinalizar.disabled = true;
        btnFinalizar.style.opacity = "0.5";
        btnFinalizar.innerText = "VALOR INSUFICIENTE";
    } else {
        // --- CASO: VALOR OK OU TROCO ---
        const troco = recebido - total;
        labelInfo.innerHTML = `<i data-lucide="check-circle-2" class="inline w-3 h-3" aria-hidden="true"></i> ${troco > 0 ? 'TROCO A DEVOLVER' : 'VALOR EXATO'}`;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        valorInfo.innerText = `R$ ${window.fmSeguro(troco)}`;
        
        // Estilo Verde (Sucesso)
        areaInfo.className = "p-4 rounded-2xl border bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800/50";
        valorInfo.className = "text-2xl font-black text-emerald-500 text-center";
        labelInfo.className = "text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase text-center mb-1 tracking-widest";
        
        // Libera o Botão
        btnFinalizar.disabled = false;
        btnFinalizar.style.opacity = "1";
        btnFinalizar.innerText = "FINALIZAR E FECHAR CONTA";
    }
};

window.confirmarFechamento = async function() {
    const f = document.getElementById('forma-pagamento-fechamento')?.value;
    const idCaixa = localStorage.getItem('idCaixaAtual');
    const btn = document.getElementById('btn-confirmar-fechamento');

    const inputRecebido = document.getElementById('valor-recebido-fechamento')?.value || '';
    const valorRecebido = parseFloat(inputRecebido.replace(/[^\d,]/g, '').replace(',', '.')) || 0;

    try {
        if (btn) { btn.disabled = true; btn.innerText = "FECHANDO..."; }

        const { data: c, error } = await _supabase
            .from('comandas').select('*').eq('id', window.comandaEmFechamentoId).single();
        
        if (error || !c) return;

        // Garante o cálculo usando apenas itens válidos (sem os recusados)
        const itensValidos = (c.itens || []).filter(i => i.cozinha_status !== 'cancelado_preparo');
        const totalFinal = itensValidos.reduce((acc, i) => acc + (parseFloat(i.preco) * i.qtd), 0);

        const recebidoReal = f === 'Dinheiro' && valorRecebido > 0 ? valorRecebido : totalFinal;
        const trocoFinal = recebidoReal > totalFinal ? recebidoReal - totalFinal : 0;

        // 1. Grava no histórico de vendas apenas os itens cobrados/entregues
        const { data: vendaSalva, error: errHistorico } = await _supabase.from('historico_vendas').insert([{
            itens: itensValidos,
            total: totalFinal,
            forma_pagamento: f,
            valor_recebido: recebidoReal,
            troco: trocoFinal,
            vendedor: localStorage.getItem('userName') || 'Balcão',
            comanda_id: c.id,
            id_caixa: idCaixa ? parseInt(idCaixa) : null,
            created_at: new Date().toISOString()
        }]).select();
        if (errHistorico) throw errHistorico;

        if (f === 'Fiado' && typeof window.registrarContaReceber === 'function') {
            try {
                const nomeFiado = document.getElementById('fiado-fechamento-cliente-nome')?.value.trim().toUpperCase() || '';
                const telefoneFiado = document.getElementById('fiado-fechamento-cliente-telefone')?.value.trim() || '';
                const clienteId = (nomeFiado || telefoneFiado) && typeof window.encontrarOuCriarCliente === 'function'
                    ? await window.encontrarOuCriarCliente(nomeFiado, telefoneFiado)
                    : null;

                await window.registrarContaReceber({
                    cliente_id: clienteId,
                    venda_id: vendaSalva?.[0]?.id,
                    valor: totalFinal,
                    descricao: `MESA ${c.identificacao}${nomeFiado ? ' - ' + nomeFiado : ''}`,
                    cadastrado_por: localStorage.getItem('userName') || 'Sistema'
                });

                document.getElementById('fiado-fechamento-cliente-nome').value = '';
                document.getElementById('fiado-fechamento-cliente-telefone').value = '';
            } catch (eFiado) {
                console.error('[COMANDAS] Erro ao registrar conta a receber (fiado):', eFiado);
                if (typeof showToast === 'function') showToast('Mesa fechada, mas houve erro ao lançar o fiado em Contas a Receber.', 'aviso');
            }
        }

        // 2. Atualiza o status e salva o total exato corrigido na comanda
        await _supabase.from('comandas')
            .update({ status: 'fechada', total: totalFinal, fechada_em: new Date().toISOString() })
            .eq('id', c.id);

        if (typeof window.processarBaixaEstoqueAutomatica === 'function') {
            window.processarBaixaEstoqueAutomatica(itensValidos, `MESA ${c.identificacao}`);
        }

        // 3. Registro de Log Profissional
        if (typeof registrarLog === 'function') {
            const valorF = typeof window.fmSeguro === 'function' ? window.fmSeguro(totalFinal) : totalFinal;
            const resumoItens = itensValidos.map(i => `${i.qtd}x ${i.nome}`).join(', ');
            const detalhesComanda = `MESA: ${c.identificacao.toUpperCase()} | TOTAL: R$ ${valorF} | PGTO: ${f.toUpperCase()} | ITENS: ${resumoItens}`;
            await registrarLog('VENDA', 'FECHAMENTO COMANDA', detalhesComanda);
        }

        if (typeof showToast === 'function') showToast('MESA FINALIZADA!', 'sucesso');
        window.fecharModalFechamento();
        if (typeof carregarComandas === 'function') carregarComandas();

        const totalF = typeof window.fmSeguro === 'function' ? window.fmSeguro(totalFinal) : totalFinal;
        
        window.dadosComprovanteAtual = {
            tipo: `COMPROVANTE - MESA ${c.identificacao}`,
            total: totalFinal,
            pagamento: f,
            recebido: recebidoReal,
            troco: trocoFinal,
            itens: itensValidos
        };

        const modalImpressao = document.getElementById('modal-confirmacao-impressao');
        if (modalImpressao) {
            const pText = document.getElementById('texto-modal-impressao');
            if (pText) {
                pText.innerText = `Deseja IMPRIMIR o comprovante de R$ ${totalF}?`;
            }
            modalImpressao.classList.remove('hidden');
            modalImpressao.classList.add('flex');
        }

    } catch (e) {
        console.error('[COMANDAS] Erro ao fechar mesa:', e);
        if (typeof showToast === 'function') showToast('ERRO AO FECHAR MESA', 'erro');
    } finally {
        if (btn) { btn.disabled = false; btn.innerText = "FINALIZAR E FECHAR CONTA"; }
    }
};

/* --- 4. LANÇAMENTO COM CONTROLE INDIVIDUAL POR ITEM --- */

window.toggleCozinhaItemCarrinho = function(index) {
    const item = window.carrinho[index];
    if (!item) return;
    item.cozinha_status = (item.cozinha_status === 'em_preparo') ? 'cancelado_preparo' : 'em_preparo';
    window.abrirConfirmacaoComanda(sessionStorage.getItem('comandaAtivaId'));
};

window.abrirConfirmacaoComanda = async function(id) {
    try {
        const { data: c } = await _supabase.from('comandas').select('*').eq('id', id).single();
        if (!c) return;

        document.getElementById('titulo-confirmacao-mesa').innerText = c.identificacao;

        document.getElementById('itens-confirmacao-comanda').innerHTML = window.carrinho.map((i, idx) => {
            const vaiPraCozinha = window.isItemCozinha(i);
            if (vaiPraCozinha && !i.cozinha_status) i.cozinha_status = 'em_preparo';

            let controleHtml = '';
            if (vaiPraCozinha) {
                const isAtivo = i.cozinha_status === 'em_preparo';
                controleHtml = `
                    <div class="flex items-center gap-2">
                        <span class="text-[7px] font-black ${isAtivo ? 'text-orange-500' : 'text-slate-400'} uppercase">${isAtivo ? 'P/ BRASA' : 'NÃO MANDAR'}</span>
                        <label class="relative inline-flex items-center cursor-pointer scale-90">
                            <input type="checkbox" class="sr-only peer" ${isAtivo ? 'checked' : ''} onchange="window.toggleCozinhaItemCarrinho(${idx})">
                            <div class="w-8 h-4 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-orange-500"></div>
                        </label>
                    </div>`;
            } else {
                controleHtml = `<span class="text-[7px] font-black text-slate-300 dark:text-slate-600 uppercase italic inline-flex items-center gap-0.5"><i data-lucide="package" class="w-2.5 h-2.5" aria-hidden="true"></i> ENTREGA DIRETA</span>`;
            }

            return `
            <div class="flex justify-between items-center p-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                <div class="flex-1 pr-2">
                    <span class="text-[11px] font-black uppercase text-slate-700 dark:text-slate-200 block">${i.qtd}x ${i.nome}</span>
                    <span class="text-[9px] font-bold text-slate-400 block mt-0.5">R$ ${window.fmSeguro(i.preco * i.qtd)}</span>
                </div>
                ${controleHtml}
            </div>`;
        }).join('');

        const switchGlobal = document.getElementById('container-switch-cozinha-global');
        if (switchGlobal) switchGlobal.style.display = 'none';

        document.getElementById('modal-confirmacao-comanda')?.classList.remove('hidden');
        document.getElementById('modal-confirmacao-comanda')?.classList.add('flex');
        if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (e) {
        console.error('[COMANDAS] Erro ao abrir confirmação:', e);
    }
};

window.gravarPedidoComanda = async function() {
    if (!window.carrinho || window.carrinho.length === 0) return;

    try {
        const id = sessionStorage.getItem('comandaAtivaId');
        const { data: c } = await _supabase.from('comandas').select('*').eq('id', id).single();
        if (!c) return;

        const agora = new Date().toISOString();

        const itensProcessados = window.carrinho.map(i => {
            const copia = { ...i };
            copia.hora_pedido = agora;
            
            // CORREÇÃO: Removemos o delete para preservar a divisão feita na hora de lançar
            // delete copia.cozinha_status; 
            
            return copia;
        });

        const novosItens = [...(c.itens || []), ...itensProcessados];
        
        // Ao salvar um pedido novo, o total geral ignora os itens recusados no passado
        const itensValidosParaTotal = novosItens.filter(i => i.cozinha_status !== 'cancelado_preparo');
        const novoTotal = itensValidosParaTotal.reduce((acc, item) => acc + (parseFloat(item.preco) * item.qtd), 0);

        await _supabase.from('comandas').update({
            itens: novosItens,
            total: novoTotal,
            updated_at: agora
        }).eq('id', id);

        if (typeof registrarLog === 'function') {
            const qtdItens = window.carrinho.reduce((acc, i) => acc + i.qtd, 0);
            await registrarLog('SISTEMA', `ADICIONOU ${qtdItens} ITEM(S) NA MESA: ${c.identificacao}`);
        }

        if (typeof showToast === 'function') showToast('PEDIDO LANÇADO!');

        window.carrinho = []; 
        if(typeof renderizarCarrinho === 'function') renderizarCarrinho();

    } catch (e) {
        console.error('[COMANDAS] Erro ao gravar pedido:', e);
        if (typeof showToast === 'function') showToast('ERRO AO LANÇAR', 'erro');
    }
};

window.fecharConfirmacaoComanda = function() {
    // Botão "X" do modal de lançamento: só fecha, sem enviar nem limpar o
    // carrinho — o garçom pode voltar e ajustar os itens antes de confirmar.
    document.getElementById('modal-confirmacao-comanda')?.classList.add('hidden');
};

window.concluirLancamentoComanda = async function() {
    if (!window.carrinho || window.carrinho.length === 0) return;
    await window.gravarPedidoComanda();
    document.getElementById('modal-confirmacao-comanda')?.classList.add('hidden');
    window.carrinho = [];
    window.location.href = 'comandas.html';
};

/* --- 5. IMPRESSÃO INTEGRADA AO MOTOR PRINCIPAL --- */

window.confirmarImpressaoAction = function() {
    const modal = document.getElementById('modal-confirmacao-impressao');
    if (modal) modal.classList.add('hidden');

    if (window.ultimaVendaParaImpressao) {
        if (typeof window.imprimirCupom === 'function') {
            window.imprimirCupom(window.ultimaVendaParaImpressao);
        } else {
            console.error("Motor 'imprimirCupom' não encontrado no print.js");
            if (typeof showToast === 'function') showToast("ERRO: MOTOR DE IMPRESSÃO INATIVO", "erro");
        }
    }
};

window.fecharModalImpressao = function() {
    const modal = document.getElementById('modal-confirmacao-impressao');
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
    window.dadosComandaImpressao = null;
    window.ultimaVendaParaImpressao = null;
};

// Inicializa a tela de comandas se for a página correta
if (document.getElementById('comandas-page')) {
    window.carregarComandas();
}

// Variáveis temporárias para controle
let itemParaRemoverData = null;

/* --- MÓDULO CIRÚRGICO: EXCLUSÃO DE ITEM (COM MODAL NATIVO) --- */

window.itemParaRemoverData = null;

window.removerItemComanda = function(idComanda, indexItem, nomeItem) {
    // --- BLOQUEIO LÓGICO DE PERMISSÃO ---
    const nivelUpper = (localStorage.getItem('userNivel') || 'VENDEDOR').toUpperCase();

    if (nivelUpper !== 'ADMIN' && nivelUpper !== 'GERENTE') {
        if (typeof alertaSistema === 'function') {
            alertaSistema("Você não tem permissão para remover itens de uma comanda em andamento.", "ACESSO NEGADO");
        } else {
            alert("ACESSO NEGADO: Você não tem permissão para remover itens da mesa.");
        }
        return; 
    }
    // ------------------------------------

    // Usa o modal de confirmação mestre do sistema (que está no util.js)
    if (typeof confirmarAcao === 'function') {
        confirmarAcao(
            `Deseja realmente remover o item "${(nomeItem || '').toUpperCase()}" da comanda?`,
            async () => {
                window.itemParaRemoverData = { idComanda, indexItem };
                await window.executarRemocaoItem();
            },
            'Confirmar Exclusão'
        );
    }
};

window.executarRemocaoItem = async function() {
    if (!window.itemParaRemoverData) return;
    const { idComanda, indexItem } = window.itemParaRemoverData;

    try {
        const { data: c } = await _supabase.from('comandas').select('*').eq('id', idComanda).single();
        if (!c) return;

        const itemRemovido = c.itens[indexItem];
        const novosItens = c.itens.filter((_, idx) => idx !== indexItem);
        const novoTotal = novosItens.reduce((acc, i) => acc + (parseFloat(i.preco) * i.qtd), 0);

        const { error } = await _supabase.from('comandas').update({ 
            itens: novosItens, 
            total: novoTotal,
            updated_at: new Date().toISOString() 
        }).eq('id', idComanda);

        if (error) throw error;

        if (typeof registrarLog === 'function') {
            await registrarLog('SISTEMA', `REMOVEU ITEM DA MESA ${c.identificacao}: ${itemRemovido.qtd}x ${itemRemovido.nome}`);
        }

        if (typeof showToast === 'function') showToast('ITEM REMOVIDO!', 'sucesso');
        
        // Atualiza a tela e recarrega os detalhes para o novo total aparecer
        if(typeof carregarComandas === 'function') carregarComandas();
        window.abrirDetalhesComanda(idComanda);

    } catch (e) {
        console.error('Erro ao remover:', e);
        if (typeof showToast === 'function') showToast('ERRO AO REMOVER', 'erro');
    } finally {
        window.itemParaRemoverData = null; // Limpa a memória
    }
};

/* --- MÓDULO: FECHAMENTO DE CONTA --- */

window.abrirModalPagamento = function(idComanda, valorTotal, identificacao) {
    document.getElementById('total-pagamento').innerText = `R$ ${valorTotal.toFixed(2).replace('.', ',')}`;
    document.getElementById('modal-pagamento').classList.remove('hidden');

    document.getElementById('btn-confirmar-pagamento').onclick = async () => {
        const forma = document.getElementById('forma-pagamento').value;
        await window.executarPagamento(idComanda, valorTotal, forma, identificacao);
    };
};

window.fecharModalPagamento = function() {
    document.getElementById('modal-pagamento').classList.add('hidden');
};

window.executarPagamento = async function(idComanda, total, forma, identificacao) {
    try {
        const { error } = await _supabase.from('comandas').update({ 
            status: 'pago',
            forma_pagamento: forma,
            pago_em: new Date().toISOString()
        }).eq('id', idComanda);

        if (error) throw error;

        if (typeof registrarLog === 'function') {
            await registrarLog('FINANCEIRO', `RECEBEU R$ ${total.toFixed(2)} (${forma.toUpperCase()}) DA MESA ${identificacao}`);
        }

        if (typeof showToast === 'function') showToast('PAGAMENTO REALIZADO!', 'sucesso');
        window.fecharModalPagamento();
        
        setTimeout(() => { window.location.href = 'index.html'; }, 1000);

    } catch (e) {
        if (typeof showToast === 'function') showToast('ERRO NO PAGAMENTO', 'erro');
    }
};

/* --- CONTROLE DO MODAL DE IMPRESSÃO --- */
window.fecharModalImpressao = function() {
    const modal = document.getElementById('modal-confirmacao-impressao');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    window.dadosComprovanteAtual = null; // Limpa a memória
};

// Ação do botão "SIM"
window.confirmarImpressaoComprovante = function() {
    if (window.dadosComprovanteAtual) {
        // Dispara a impressão com os dados salvos no fechamento
        window.imprimirTicketVenda(window.dadosComprovanteAtual);
        // Fecha o modal logo em seguida
        window.fecharModalImpressao();
    } else {
        if(typeof showToast === 'function') showToast("Dados da venda não encontrados.", "erro");
    }
};

// Ação do botão "NÃO"
window.fecharModalImpressao = function() {
    const modal = document.getElementById('modal-confirmacao-impressao');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
};
