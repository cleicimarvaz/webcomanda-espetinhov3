/* =================================================================================
   MÓDULO DE DIVISÃO DE CONTA (divisao.html) - ESPETINHO & CIA
   Permite fechar uma comanda em partes: por itens selecionados ou por valor
   avulso (abate sem vincular a itens específicos).
   ================================================================================= */

window.divComandaAtual = null;
window.divSelecionados = new Set();
window.divAbaAtual = 'itens';
window.divSubtotalModalCache = 0;

window.carregarComandaDivisao = async function() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id || typeof _supabase === 'undefined') {
        window.location.href = 'comandas.html';
        return;
    }

    try {
        const { data: c, error } = await _supabase.from('comandas').select('*').eq('id', id).single();
        if (error || !c) throw error || new Error('Comanda não encontrada');

        window.divComandaAtual = c;
        window.divSelecionados.clear();
        window.renderizarItensDivisao();
        window.atualizarTotalRestanteDivisao();
        window.atualizarFabDivisao();
    } catch (e) {
        console.error('[DIVISAO] Erro ao carregar comanda:', e);
        if (typeof showToast === 'function') showToast('ERRO AO CARREGAR MESA', 'erro');
        setTimeout(() => { window.location.href = 'comandas.html'; }, 1200);
    }
};

window.atualizarTotalRestanteDivisao = function() {
    const c = window.divComandaAtual;
    const el = document.getElementById('total-restante');
    if (!c || !el) return;
    el.innerText = `R$ ${window.fmSeguro(c.total)}`;
};

window.renderizarItensDivisao = function() {
    const cont = document.getElementById('lista-itens-divisao');
    if (!cont) return;
    const itens = window.divComandaAtual?.itens || [];

    if (itens.length === 0) {
        cont.innerHTML = `
            <div class="col-span-full py-16 text-center opacity-30">
                <p class="font-black uppercase text-[10px] tracking-widest">Nenhum item pendente nesta mesa.</p>
            </div>`;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }

    cont.innerHTML = itens.map((i, idx) => {
        const selecionado = window.divSelecionados.has(idx);
        return `
        <button type="button" onclick="window.toggleItemSelecionadoDivisao(${idx})"
            class="w-full flex items-center justify-between gap-3 p-4 rounded-2xl border-2 transition-all text-left active:scale-[0.98] ${selecionado ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-400 dark:border-emerald-500' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'}">
            <div class="flex items-center gap-3 min-w-0">
                <div class="w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 ${selecionado ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200 dark:border-slate-700'}">
                    ${selecionado ? '<i data-lucide="check" class="w-4 h-4" aria-hidden="true"></i>' : ''}
                </div>
                <span class="font-black text-slate-700 dark:text-slate-200 text-[11px] uppercase truncate">${i.qtd}x ${i.nome}</span>
            </div>
            <span class="font-black text-slate-800 dark:text-white text-xs shrink-0">R$ ${window.fmSeguro(parseFloat(i.preco) * i.qtd)}</span>
        </button>`;
    }).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
};

window.toggleItemSelecionadoDivisao = function(idx) {
    if (window.divSelecionados.has(idx)) {
        window.divSelecionados.delete(idx);
    } else {
        window.divSelecionados.add(idx);
    }
    window.renderizarItensDivisao();
    window.atualizarFabDivisao();
};

window.atualizarFabDivisao = function() {
    const fab = document.getElementById('fab-divisao');
    const badge = document.getElementById('fab-div-count');
    if (!fab || !badge) return;

    const qtd = window.divSelecionados.size;
    fab.classList.toggle('hidden', qtd === 0 || window.divAbaAtual !== 'itens');
    badge.innerText = `${qtd} ${qtd === 1 ? 'item' : 'itens'}`;
};

window.alternarAbasDivisao = function(aba) {
    window.divAbaAtual = aba;

    document.getElementById('aba-div-itens')?.classList.toggle('hidden', aba !== 'itens');
    document.getElementById('aba-div-valor')?.classList.toggle('hidden', aba !== 'valor');

    const act = 'flex-1 py-3 rounded-full bg-[#e63946] text-white text-[9px] font-black uppercase transition-all font-sans italic tracking-widest shadow-sm';
    const inact = 'flex-1 py-3 rounded-full text-slate-400 dark:text-slate-500 text-[9px] font-black uppercase transition-all font-sans italic tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800';
    const btnItens = document.getElementById('btn-div-itens');
    const btnValor = document.getElementById('btn-div-valor');
    if (btnItens) btnItens.className = aba === 'itens' ? act : inact;
    if (btnValor) btnValor.className = aba === 'valor' ? act : inact;

    window.atualizarFabDivisao();
};

/* --- SELETOR DE FORMA DE PAGAMENTO (grid de ícones, usado nas 2 abas) --- */

window.resetarFormaDivisao = function(contexto) {
    const gridId = contexto === 'valor' ? 'botoes-forma-parcial-valor' : 'botoes-forma-parcial-itens';
    const grid = document.getElementById(gridId);
    if (!grid) return;
    document.getElementById(contexto === 'valor' ? 'forma-parcial-valor' : 'forma-parcial-itens').value = 'Pix';
    const btnPix = grid.querySelector('button:nth-child(2)');
    if (btnPix) window.selecionarFormaDivisao(contexto, 'Pix', btnPix);
};

window.selecionarFormaDivisao = function(contexto, metodo, elementoClicado) {
    const inputId = contexto === 'valor' ? 'forma-parcial-valor' : 'forma-parcial-itens';
    const gridId = contexto === 'valor' ? 'botoes-forma-parcial-valor' : 'botoes-forma-parcial-itens';

    document.getElementById(inputId).value = metodo;

    const classeSelecionado = 'bg-emerald-500 text-white border-emerald-600 dark:bg-emerald-600 dark:border-emerald-500';
    const classeInativo = 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
    const baseClasses = 'btn-pagamento-divisao p-2 rounded-xl text-[10px] font-black uppercase border-2 transition-all active:scale-95 flex flex-col items-center justify-center gap-1';

    document.querySelectorAll(`#${gridId} .btn-pagamento-divisao`).forEach((btn) => {
        btn.className = baseClasses + ' ' + classeInativo;
    });
    elementoClicado.className = baseClasses + ' ' + classeSelecionado;

    if (contexto === 'itens' && typeof window.handlePagamentoParcialChange === 'function') {
        window.handlePagamentoParcialChange();
    }
};

/* --- ABA "POR VALOR": abate um valor avulso sem vincular a itens --- */

window.confirmarAbateValor = function() {
    const c = window.divComandaAtual;
    if (!c) return;

    const valor = window.convMoedaFloat(document.getElementById('valor-parcial').value);
    const forma = document.getElementById('forma-parcial-valor').value;
    const restante = parseFloat(c.total);

    if (!valor || valor <= 0) {
        if (typeof showToast === 'function') showToast('INFORME UM VALOR VÁLIDO', 'erro');
        return;
    }
    if (valor > restante + 0.01) {
        if (typeof showToast === 'function') showToast('VALOR MAIOR QUE O RESTANTE DA MESA', 'erro');
        return;
    }

    if (typeof confirmarAcao !== 'function') return;
    confirmarAcao(
        `Confirma o recebimento de R$ ${window.fmSeguro(valor)} (${forma.toUpperCase()}) referente a esta mesa?`,
        async () => { await window.executarAbateValor(valor, forma); },
        'Confirmar Recebimento'
    );
};

window.executarAbateValor = async function(valor, forma) {
    const c = window.divComandaAtual;
    try {
        const novoTotal = Math.max(0, parseFloat(c.total) - valor);
        const agora = new Date().toISOString();
        const fechaMesa = novoTotal <= 0.01;

        const { error: errHistorico } = await _supabase.from('historico_vendas').insert([{
            itens: [],
            total: valor,
            forma_pagamento: forma,
            vendedor: localStorage.getItem('userName') || 'Caixa',
            comanda_id: c.id,
            created_at: agora
        }]);
        if (errHistorico) throw errHistorico;

        const updatePayload = { total: novoTotal, updated_at: agora };
        if (fechaMesa) { updatePayload.status = 'fechada'; updatePayload.fechada_em = agora; }
        await _supabase.from('comandas').update(updatePayload).eq('id', c.id);

        if (typeof registrarLog === 'function') {
            await registrarLog('VENDA', 'ABATEU VALOR NA MESA (DIVISÃO)', `MESA: ${c.identificacao.toUpperCase()} | VALOR: R$ ${window.fmSeguro(valor)} | PGTO: ${forma.toUpperCase()}`);
        }

        document.getElementById('valor-parcial').value = '';
        if (typeof showToast === 'function') showToast('VALOR RECEBIDO!', 'sucesso');

        if (fechaMesa) {
            if (typeof showToast === 'function') showToast('MESA TOTALMENTE QUITADA!', 'sucesso');
            setTimeout(() => { window.location.href = 'comandas.html'; }, 1000);
            return;
        }

        window.divComandaAtual.total = novoTotal;
        window.atualizarTotalRestanteDivisao();
    } catch (e) {
        console.error('[DIVISAO] Erro ao abater valor:', e);
        if (typeof showToast === 'function') showToast('ERRO AO REGISTRAR RECEBIMENTO', 'erro');
    }
};

/* --- ABA "POR ITENS": paga os itens selecionados --- */

window.abrirResumoDivisao = function() {
    const c = window.divComandaAtual;
    if (!c || window.divSelecionados.size === 0) return;

    const indices = [...window.divSelecionados];
    const itensSelecionados = indices.map((idx) => c.itens[idx]);
    const subtotal = itensSelecionados.reduce((acc, i) => acc + (parseFloat(i.preco) * i.qtd), 0);

    // Um abatimento por valor anterior pode ter deixado o total da mesa menor
    // que a soma "de tabela" dos itens ainda na lista (o abatimento não tira
    // itens do array). Pagar por itens nesse caso cobraria mais do que a
    // mesa realmente deve — bloqueia e orienta a usar "Por Valor".
    if (subtotal > parseFloat(c.total) + 0.01) {
        if (typeof showToast === 'function') {
            showToast('ITENS SELECIONADOS VALEM MAIS QUE O RESTANTE DA MESA. USE "POR VALOR" PARA UM VALOR PARCIAL.', 'erro');
        }
        return;
    }

    window.divSubtotalModalCache = subtotal;

    document.getElementById('itens-divisao-modal').innerHTML = itensSelecionados.map((i) => `
        <div class="flex justify-between py-1.5 text-[10px]">
            <span class="uppercase font-bold text-slate-600 dark:text-slate-300">${i.qtd}x ${i.nome}</span>
            <span class="font-black text-slate-700 dark:text-slate-200">R$ ${window.fmSeguro(parseFloat(i.preco) * i.qtd)}</span>
        </div>`).join('');
    document.getElementById('total-divisao-modal').innerText = `R$ ${window.fmSeguro(subtotal)}`;

    document.getElementById('recebido-divisao').value = '';
    window.resetarFormaDivisao('itens');

    document.getElementById('modal-divisao').classList.remove('hidden');
};

window.fecharModalDivisao = function() {
    document.getElementById('modal-divisao')?.classList.add('hidden');
};

window.handlePagamentoParcialChange = function() {
    const forma = document.getElementById('forma-parcial-itens').value;
    const sessaoTroco = document.getElementById('sessao-troco-divisao');
    const btnConfirmar = document.getElementById('btn-confirmar-abate-itens');

    if (forma === 'Dinheiro') {
        sessaoTroco.classList.remove('hidden');
        sessaoTroco.classList.add('flex');
    } else {
        sessaoTroco.classList.add('hidden');
        sessaoTroco.classList.remove('flex');
    }

    if (btnConfirmar) { btnConfirmar.disabled = false; btnConfirmar.style.opacity = '1'; }
};

window.calcularTrocoDivisao = function() {
    const subtotal = window.divSubtotalModalCache || 0;
    const recebido = window.convMoedaFloat(document.getElementById('recebido-divisao').value);
    const trocoBox = document.getElementById('troco-divisao');
    const btnConfirmar = document.getElementById('btn-confirmar-abate-itens');
    const valorSpan = trocoBox?.querySelector('span:last-child');

    if (!recebido) {
        if (valorSpan) valorSpan.innerText = 'R$ 0,00';
        if (trocoBox) trocoBox.className = 'bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl text-[10px] font-black text-slate-400 dark:text-slate-500 min-w-[90px] flex flex-col justify-center items-center border-2 border-transparent';
        if (btnConfirmar) { btnConfirmar.disabled = false; btnConfirmar.style.opacity = '1'; }
        return;
    }

    if (recebido < subtotal) {
        const falta = subtotal - recebido;
        if (valorSpan) valorSpan.innerText = `R$ ${window.fmSeguro(falta)}`;
        if (trocoBox) trocoBox.className = 'bg-red-50 dark:bg-red-900/20 p-4 rounded-2xl text-[10px] font-black text-red-500 min-w-[90px] flex flex-col justify-center items-center border-2 border-red-200 dark:border-red-800/50';
        if (btnConfirmar) { btnConfirmar.disabled = true; btnConfirmar.style.opacity = '0.5'; }
    } else {
        const troco = recebido - subtotal;
        if (valorSpan) valorSpan.innerText = `R$ ${window.fmSeguro(troco)}`;
        if (trocoBox) trocoBox.className = 'bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl text-[10px] font-black text-emerald-500 min-w-[90px] flex flex-col justify-center items-center border-2 border-emerald-200 dark:border-emerald-800/50';
        if (btnConfirmar) { btnConfirmar.disabled = false; btnConfirmar.style.opacity = '1'; }
    }
};

window.confirmarAbateItens = async function() {
    const c = window.divComandaAtual;
    const btn = document.getElementById('btn-confirmar-abate-itens');
    if (!c || window.divSelecionados.size === 0) return;

    const forma = document.getElementById('forma-parcial-itens').value;
    const subtotal = window.divSubtotalModalCache || 0;
    const indices = [...window.divSelecionados].sort((a, b) => a - b);
    const itensPagos = indices.map((idx) => c.itens[idx]);

    if (subtotal > parseFloat(c.total) + 0.01) {
        if (typeof showToast === 'function') showToast('ITENS VALEM MAIS QUE O RESTANTE DA MESA', 'erro');
        window.fecharModalDivisao();
        return;
    }

    let recebidoReal = subtotal;
    let trocoFinal = 0;
    if (forma === 'Dinheiro') {
        const recebido = window.convMoedaFloat(document.getElementById('recebido-divisao').value);
        if (recebido > 0) {
            if (recebido < subtotal) {
                if (typeof showToast === 'function') showToast('VALOR RECEBIDO INSUFICIENTE', 'erro');
                return;
            }
            recebidoReal = recebido;
            trocoFinal = recebido - subtotal;
        }
    }

    try {
        if (btn) { btn.disabled = true; btn.innerText = 'PROCESSANDO...'; }
        const agora = new Date().toISOString();

        const { error: errHistorico } = await _supabase.from('historico_vendas').insert([{
            itens: itensPagos,
            total: subtotal,
            forma_pagamento: forma,
            valor_recebido: recebidoReal,
            troco: trocoFinal,
            vendedor: localStorage.getItem('userName') || 'Caixa',
            comanda_id: c.id,
            created_at: agora
        }]);
        if (errHistorico) throw errHistorico;

        const indicesSet = new Set(indices);
        const novosItens = c.itens.filter((_, idx) => !indicesSet.has(idx));
        // Usa o total ATUAL da comanda (não a soma dos itens restantes) para não
        // "esquecer" abatimentos por valor já recebidos antes deste pagamento
        // (aba "Por Valor" reduz o total sem tirar itens do array).
        const novoTotal = Math.max(0, parseFloat(c.total) - subtotal);
        const fechaMesa = novoTotal <= 0.01;

        const updatePayload = { itens: novosItens, total: novoTotal, updated_at: agora };
        if (fechaMesa) { updatePayload.status = 'fechada'; updatePayload.fechada_em = agora; }
        await _supabase.from('comandas').update(updatePayload).eq('id', c.id);

        if (typeof window.processarBaixaEstoqueAutomatica === 'function') {
            window.processarBaixaEstoqueAutomatica(itensPagos, `DIVISÃO MESA ${c.identificacao}`);
        }

        if (typeof registrarLog === 'function') {
            const resumoItens = itensPagos.map((i) => `${i.qtd}x ${i.nome}`).join(', ');
            await registrarLog('VENDA', 'PAGAMENTO PARCIAL POR ITENS (DIVISÃO)', `MESA: ${c.identificacao.toUpperCase()} | TOTAL: R$ ${window.fmSeguro(subtotal)} | PGTO: ${forma.toUpperCase()} | ITENS: ${resumoItens}`);
        }

        window.fecharModalDivisao();
        if (typeof showToast === 'function') showToast('PAGAMENTO REGISTRADO!', 'sucesso');

        if (fechaMesa) {
            if (typeof showToast === 'function') showToast('MESA TOTALMENTE QUITADA!', 'sucesso');
            setTimeout(() => { window.location.href = 'comandas.html'; }, 1000);
            return;
        }

        window.divComandaAtual.itens = novosItens;
        window.divComandaAtual.total = novoTotal;
        window.divSelecionados.clear();
        window.renderizarItensDivisao();
        window.atualizarTotalRestanteDivisao();
        window.atualizarFabDivisao();
    } catch (e) {
        console.error('[DIVISAO] Erro ao confirmar pagamento por itens:', e);
        if (typeof showToast === 'function') showToast('ERRO AO REGISTRAR PAGAMENTO', 'erro');
    } finally {
        if (btn) { btn.disabled = false; btn.innerText = 'CONFIRMAR PAGAMENTO'; }
    }
};

if (document.getElementById('divisao-page')) {
    window.carregarComandaDivisao();
    document.addEventListener('DOMContentLoaded', () => window.resetarFormaDivisao('valor'));
}
