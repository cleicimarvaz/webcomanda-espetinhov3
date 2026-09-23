/* =================================================================================
   MÓDULO: FINANCEIRO AVANÇADO (F3, F4)
   Duas novas abas dentro da tela Financeiro existente: Fluxo de Caixa Projetado
   e Metas de Faturamento.
   ================================================================================= */

const MESES_NOME_PT = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];

/* =================================================================================
   F3. FLUXO DE CAIXA PROJETADO
   ================================================================================= */

window.periodoProjecaoAtual = 15;

window.mudarPeriodoProjecao = function (dias) {
  window.periodoProjecaoAtual = dias;
  [7, 15, 30].forEach((d) => {
    const btn = document.getElementById(`btn-proj-${d}`);
    if (!btn) return;
    btn.className = d === dias
      ? 'flex-1 py-2 text-[9px] font-black uppercase rounded-xl transition-all shadow-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-white'
      : 'flex-1 py-2 text-[9px] font-black uppercase rounded-xl transition-all text-slate-400';
  });
  window.gerarFluxoProjetado();
};

window.gerarFluxoProjetado = async function () {
  const resumo = document.getElementById('resumo-fluxo-projetado');
  const lista = document.getElementById('lista-fluxo-projetado');
  if (!resumo || !lista || typeof _supabase === 'undefined') return;

  lista.innerHTML = '<p class="text-center text-[10px] font-black uppercase text-slate-400 py-10 animate-pulse">Projetando fluxo...</p>';

  try {
    const dias = window.periodoProjecaoAtual || 15;
    const hoje = new Date();
    const hojeStr = hoje.toISOString().split('T')[0];
    const fimJanela = new Date(hoje);
    fimJanela.setDate(fimJanela.getDate() + dias);
    const fimJanelaStr = fimJanela.toISOString().split('T')[0];

    const inicioHistorico = new Date(hoje);
    inicioHistorico.setDate(inicioHistorico.getDate() - 30);

    const [resVendas, resDespesas, resContasReceber] = await Promise.all([
      _supabase.from('historico_vendas').select('total').gte('created_at', inicioHistorico.toISOString()).lte('created_at', hoje.toISOString()).neq('status', 'cancelada').neq('status', 'estornada'),
      _supabase.from('despesas').select('descricao, categoria, valor, vencimento').eq('paga', false).gte('vencimento', hojeStr).lte('vencimento', fimJanelaStr).order('vencimento', { ascending: true }),
      _supabase.from('contas_receber').select('descricao, valor, valor_pago, vencimento, clientes(nome)').in('status', ['aberto', 'parcial']).gte('vencimento', hojeStr).lte('vencimento', fimJanelaStr).order('vencimento', { ascending: true })
    ]);

    const vendasHistorico = resVendas.data || [];
    const despesasFuturas = resDespesas.error ? [] : (resDespesas.data || []);
    const contasReceberFuturas = resContasReceber.error ? [] : (resContasReceber.data || []);

    const totalHistorico = vendasHistorico.reduce((acc, v) => acc + parseFloat(v.total || 0), 0);
    const mediaDiaria = totalHistorico / 30;
    const receitaEsperada = mediaDiaria * dias;

    const totalAPagar = despesasFuturas.reduce((acc, d) => acc + parseFloat(d.valor || 0), 0);
    const totalAReceber = contasReceberFuturas.reduce((acc, c) => acc + (parseFloat(c.valor || 0) - parseFloat(c.valor_pago || 0)), 0);

    const saldoProjetado = receitaEsperada + totalAReceber - totalAPagar;
    const fmtBRL = (v) => 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    resumo.innerHTML = `
      <div class="grid grid-cols-2 gap-2 mb-2">
        <div class="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-center shadow-sm">
          <p class="text-[7px] font-black text-slate-400 uppercase">Receita Esperada</p>
          <p class="text-[11px] font-black text-emerald-500">${fmtBRL(receitaEsperada)}</p>
          <p class="text-[6px] font-bold text-slate-300 uppercase mt-0.5">Média dos últimos 30 dias</p>
        </div>
        <div class="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-center shadow-sm">
          <p class="text-[7px] font-black text-slate-400 uppercase">A Receber (fiado)</p>
          <p class="text-[11px] font-black text-blue-500">${fmtBRL(totalAReceber)}</p>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div class="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-center shadow-sm">
          <p class="text-[7px] font-black text-slate-400 uppercase">Despesas a Pagar</p>
          <p class="text-[11px] font-black text-red-500">${fmtBRL(totalAPagar)}</p>
        </div>
        <div class="bg-slate-800 dark:bg-slate-700 p-3 rounded-xl text-center shadow-lg">
          <p class="text-[7px] font-black text-slate-400 uppercase">Saldo Projetado</p>
          <p class="text-[11px] font-black text-white">${fmtBRL(saldoProjetado)}</p>
        </div>
      </div>
    `;

    const lancamentos = [
      ...despesasFuturas.map((d) => ({ data: d.vencimento, desc: d.descricao, cat: d.categoria || 'DESPESA', valor: d.valor, tipo: 'S' })),
      ...contasReceberFuturas.map((c) => ({ data: c.vencimento, desc: c.descricao || (c.clientes?.nome || 'FIADO'), cat: 'A RECEBER', valor: parseFloat(c.valor || 0) - parseFloat(c.valor_pago || 0), tipo: 'E' }))
    ].sort((a, b) => new Date(a.data) - new Date(b.data));

    lista.innerHTML = lancamentos.length === 0
      ? '<p class="text-center text-[10px] font-bold text-slate-400 uppercase py-10 italic">Nenhum lançamento futuro conhecido neste período</p>'
      : lancamentos.map((item) => `
        <div class="flex justify-between items-center bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div class="flex flex-col">
            <span class="text-[9px] font-black text-slate-700 dark:text-slate-200 uppercase">${item.desc || 'SEM DESCRIÇÃO'}</span>
            <span class="text-[7px] font-bold text-slate-400 uppercase italic">${new Date(item.data + 'T00:00:00').toLocaleDateString('pt-BR')} • ${item.cat}</span>
          </div>
          <span class="text-[10px] font-black ${item.tipo === 'E' ? 'text-emerald-500' : 'text-red-500'}">${item.tipo === 'E' ? '+' : '-'} ${fmtBRL(item.valor)}</span>
        </div>`).join('');
  } catch (e) {
    console.error('[FINANCEIRO] Erro ao gerar fluxo projetado:', e);
    lista.innerHTML = '<p class="text-red-500 text-[10px] text-center font-black uppercase mt-4">Erro ao carregar dados</p>';
  }
};

/* =================================================================================
   F4. METAS DE FATURAMENTO
   ================================================================================= */

window.inicializarSeletoresMeta = function () {
  const selectMes = document.getElementById('meta-mes');
  const inputAno = document.getElementById('meta-ano');
  if (!selectMes || !inputAno || selectMes.options.length > 0) return;

  selectMes.innerHTML = MESES_NOME_PT.map((nome, i) => `<option value="${i + 1}">${nome}</option>`).join('');
  const hoje = new Date();
  selectMes.value = hoje.getMonth() + 1;
  inputAno.value = hoje.getFullYear();
};

window.carregarMetaFaturamento = async function () {
  window.inicializarSeletoresMeta();
  const mes = parseInt(document.getElementById('meta-mes')?.value);
  const ano = parseInt(document.getElementById('meta-ano')?.value);
  const inputValor = document.getElementById('meta-valor');
  if (!mes || !ano || !inputValor || typeof _supabase === 'undefined') return;

  try {
    const { data, error } = await _supabase.from('metas_faturamento').select('valor_meta').eq('ano', ano).eq('mes', mes).maybeSingle();
    if (error) throw error;

    const fm = typeof window.formatarMoeda === 'function' ? window.formatarMoeda : (v) => parseFloat(v).toFixed(2);
    inputValor.value = data ? fm(data.valor_meta) : '';
  } catch (e) {
    console.error('[FINANCEIRO] Erro ao carregar meta:', e);
  }

  window.atualizarProgressoMeta();
};

window.salvarMetaFaturamento = async function () {
  const mes = parseInt(document.getElementById('meta-mes')?.value);
  const ano = parseInt(document.getElementById('meta-ano')?.value);
  const inputValor = document.getElementById('meta-valor');
  if (!mes || !ano || !inputValor || typeof _supabase === 'undefined') return;

  const valorMeta = typeof convMoedaFloat === 'function' ? convMoedaFloat(inputValor.value) : parseFloat(inputValor.value.replace(/\D/g, '')) / 100;
  if (isNaN(valorMeta) || valorMeta <= 0) {
    if (typeof showToast === 'function') showToast('INFORME UM VALOR DE META VÁLIDO', 'erro');
    return;
  }

  try {
    const { error } = await _supabase.from('metas_faturamento').upsert([{ ano, mes, valor_meta: valorMeta }], { onConflict: 'ano,mes' });
    if (error) throw error;

    if (typeof registrarLog === 'function') {
      await registrarLog('FINANCEIRO', 'META DE FATURAMENTO', `META DE ${MESES_NOME_PT[mes - 1]}/${ano} DEFINIDA EM R$ ${valorMeta.toFixed(2)}`);
    }
    if (typeof showToast === 'function') showToast('META SALVA COM SUCESSO!');
    window.atualizarProgressoMeta();
  } catch (e) {
    console.error('[FINANCEIRO] Erro ao salvar meta:', e);
    if (typeof showToast === 'function') showToast('ERRO AO SALVAR META', 'erro');
  }
};

window.atualizarProgressoMeta = async function () {
  const container = document.getElementById('progresso-meta-faturamento');
  const mes = parseInt(document.getElementById('meta-mes')?.value);
  const ano = parseInt(document.getElementById('meta-ano')?.value);
  const inputValor = document.getElementById('meta-valor');
  if (!container || !mes || !ano || typeof _supabase === 'undefined') return;

  const valorMeta = inputValor && inputValor.value
    ? (typeof convMoedaFloat === 'function' ? convMoedaFloat(inputValor.value) : parseFloat(inputValor.value.replace(/\D/g, '')) / 100)
    : 0;

  if (!valorMeta) {
    container.innerHTML = '<p class="text-center text-[10px] font-bold text-slate-400 uppercase py-6 italic">Nenhuma meta definida para este mês</p>';
    return;
  }

  try {
    const inicioMes = new Date(ano, mes - 1, 1).toISOString();
    const fimMes = new Date(ano, mes, 0, 23, 59, 59).toISOString();

    const { data: vendas, error } = await _supabase.from('historico_vendas').select('total').gte('created_at', inicioMes).lte('created_at', fimMes).neq('status', 'cancelada').neq('status', 'estornada');
    if (error) throw error;

    const faturamento = (vendas || []).reduce((acc, v) => acc + parseFloat(v.total || 0), 0);
    const pct = Math.min((faturamento / valorMeta) * 100, 100);
    const pctReal = (faturamento / valorMeta) * 100;
    const fmtBRL = (v) => 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const corBarra = pctReal >= 100 ? 'bg-emerald-500' : pctReal >= 60 ? 'bg-blue-500' : 'bg-amber-500';

    container.innerHTML = `
      <div class="bg-white dark:bg-slate-900 p-4 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
        <div class="flex justify-between items-center mb-2">
          <span class="text-[9px] font-black text-slate-700 dark:text-slate-200 uppercase">${MESES_NOME_PT[mes - 1]}/${ano}</span>
          <span class="text-[10px] font-black ${pctReal >= 100 ? 'text-emerald-500' : 'text-slate-500 dark:text-slate-400'}">${pctReal.toFixed(1)}%</span>
        </div>
        <div class="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-3">
          <div class="h-full ${corBarra} transition-all" style="width:${pct}%"></div>
        </div>
        <div class="flex justify-between text-[8px] font-bold text-slate-400 uppercase">
          <span>Faturado: <span class="text-slate-700 dark:text-slate-200">${fmtBRL(faturamento)}</span></span>
          <span>Meta: <span class="text-slate-700 dark:text-slate-200">${fmtBRL(valorMeta)}</span></span>
        </div>
      </div>
    `;
  } catch (e) {
    console.error('[FINANCEIRO] Erro ao calcular progresso da meta:', e);
    container.innerHTML = '<p class="text-red-500 text-[10px] text-center font-black uppercase mt-4">Erro ao carregar dados</p>';
  }
};
