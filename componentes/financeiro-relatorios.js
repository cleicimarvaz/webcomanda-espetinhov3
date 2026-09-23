/* =================================================================================
   MÓDULO: RELATÓRIOS FINANCEIROS AVANÇADOS (F2, F5, F6)
   Novas abas dentro da tela Financeiro (view-financeiro), reaproveitando o filtro
   de data já existente (data-inicio-fin / data-fim-fin / mudarFiltroFinanceiro).
   ================================================================================= */

window.abaFinanceiraAtiva = 'fluxo';
const chartsFinanceiro = {};

window.alternarAbaFinanceiro = function (aba) {
  window.abaFinanceiraAtiva = aba;

  ['fluxo', 'categoria', 'dre', 'comparativo', 'projetado', 'metas'].forEach((id) => {
    const btn = document.getElementById(`btn-aba-fin-${id}`);
    const painel = document.getElementById(`aba-fin-${id}`);
    if (btn) btn.className = id === aba
      ? 'shrink-0 px-3 py-2 rounded-lg bg-blue-500 text-white text-[9px] font-black uppercase transition-all shadow-sm'
      : 'shrink-0 px-3 py-2 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[9px] font-black uppercase transition-all';
    if (painel) painel.classList.toggle('hidden', id !== aba);
  });

  if (aba === 'categoria') window.gerarRelatorioDespesasCategoria();
  else if (aba === 'dre') window.gerarDRE();
  else if (aba === 'comparativo') window.gerarComparativoFinanceiro();
  else if (aba === 'projetado' && typeof window.gerarFluxoProjetado === 'function') window.gerarFluxoProjetado();
  else if (aba === 'metas' && typeof window.carregarMetaFaturamento === 'function') window.carregarMetaFaturamento();
  else if (typeof gerarRelatorioFinanceiro === 'function') gerarRelatorioFinanceiro();
};

function obterPeriodoFinanceiroAtual() {
  const inputIni = document.getElementById('data-inicio-fin');
  const inputFim = document.getElementById('data-fim-fin');
  const hoje = new Date().toISOString().split('T')[0];
  return {
    ini: (inputIni && inputIni.value) || hoje,
    fim: (inputFim && inputFim.value) || hoje
  };
}

/* =================================================================================
   F6. DESPESAS POR CATEGORIA
   ================================================================================= */

window.dadosDespesasCategoriaAtual = [];

window.gerarRelatorioDespesasCategoria = async function () {
  const { ini, fim } = obterPeriodoFinanceiroAtual();
  const lista = document.getElementById('lista-despesas-categoria');
  if (!lista || typeof _supabase === 'undefined') return;

  lista.innerHTML = '<p class="text-center text-[10px] font-black uppercase text-slate-400 py-10 animate-pulse">Calculando...</p>';

  try {
    const { data: despesas, error } = await _supabase
      .from('despesas')
      .select('categoria, valor')
      .eq('paga', true)
      .gte('data_pagamento', ini)
      .lte('data_pagamento', fim);
    if (error) throw error;

    const porCategoria = {};
    (despesas || []).forEach((d) => {
      const cat = (d.categoria || 'OUTROS').toUpperCase();
      porCategoria[cat] = (porCategoria[cat] || 0) + parseFloat(d.valor || 0);
    });

    const linhas = Object.entries(porCategoria).sort((a, b) => b[1] - a[1]);
    window.dadosDespesasCategoriaAtual = linhas.map(([categoria, valor]) => ({ categoria, valor }));

    const container = document.getElementById('chart-despesas-categoria');
    if (linhas.length === 0) {
      if (container) container.innerHTML = '';
      lista.innerHTML = '<p class="text-center text-[10px] font-bold text-slate-400 uppercase py-10 italic">Nenhuma despesa paga neste período</p>';
      return;
    }

    const totalGeral = linhas.reduce((acc, [, v]) => acc + v, 0);
    const fmtBRL = (v) => 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    if (typeof ApexCharts !== 'undefined' && container) {
      if (chartsFinanceiro.categoria) chartsFinanceiro.categoria.destroy();
      container.innerHTML = '';
      const isDark = document.documentElement.classList.contains('dark');
      chartsFinanceiro.categoria = new ApexCharts(container, {
        series: linhas.map(([, v]) => v),
        labels: linhas.map(([c]) => c),
        chart: { type: 'donut', height: 200, foreColor: isDark ? '#94a3b8' : '#64748b' },
        colors: ['#ef4444', '#f59e0b', '#8b5cf6', '#3b82f6', '#10b981', '#ec4899', '#64748b'],
        legend: { position: 'bottom', fontSize: '9px' }, stroke: { show: false }, dataLabels: { enabled: false },
        tooltip: { y: { formatter: (val) => fmtBRL(val) } }
      });
      chartsFinanceiro.categoria.render();
    }

    lista.innerHTML = linhas.map(([categoria, valor]) => {
      const pct = totalGeral > 0 ? (valor / totalGeral) * 100 : 0;
      return `
        <div class="flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <span class="text-[9px] font-black text-slate-700 dark:text-slate-200 uppercase">${categoria}</span>
          <div class="text-right">
            <span class="text-[10px] font-black text-red-500">${fmtBRL(valor)}</span>
            <p class="text-[7px] font-bold text-slate-400 uppercase">${pct.toFixed(1)}%</p>
          </div>
        </div>`;
    }).join('');
  } catch (e) {
    console.error('[FINANCEIRO] Erro ao gerar despesas por categoria:', e);
    lista.innerHTML = '<p class="text-red-500 text-[10px] text-center font-black uppercase mt-4">Erro ao carregar dados</p>';
  }
};

window.exportarDespesasCategoriaExcel = function () {
  if (typeof window.exportarTabelaParaExcel !== 'function') return;
  window.exportarTabelaParaExcel(
    [{ chave: 'categoria', titulo: 'Categoria' }, { chave: 'valor', titulo: 'Valor (R$)' }],
    window.dadosDespesasCategoriaAtual,
    'despesas_por_categoria'
  );
};

/* =================================================================================
   F2. DRE SIMPLIFICADO
   ================================================================================= */

window.dadosDREAtual = [];

window.gerarDRE = async function () {
  const { ini, fim } = obterPeriodoFinanceiroAtual();
  const container = document.getElementById('conteudo-dre');
  if (!container || typeof _supabase === 'undefined') return;

  container.innerHTML = '<p class="text-center text-[10px] font-black uppercase text-slate-400 py-10 animate-pulse">Calculando DRE...</p>';

  try {
    const dtIniISO = ini + 'T00:00:00Z';
    const dtFimISO = fim + 'T23:59:59Z';

    const [resVendas, resDespesas] = await Promise.all([
      _supabase.from('historico_vendas').select('total, itens').gte('created_at', dtIniISO).lte('created_at', dtFimISO).neq('status', 'cancelada').neq('status', 'estornada'),
      _supabase.from('despesas').select('categoria, valor').eq('paga', true).gte('data_pagamento', ini).lte('data_pagamento', fim)
    ]);
    if (resVendas.error) throw resVendas.error;
    if (resDespesas.error) throw resDespesas.error;

    const vendas = resVendas.data || [];
    const despesas = resDespesas.data || [];

    let receitaBruta = 0;
    let cmv = 0;
    vendas.forEach((v) => {
      receitaBruta += parseFloat(v.total || 0);
      let itensArr = [];
      if (typeof v.itens === 'string') {
        try { itensArr = JSON.parse(v.itens); } catch (e) { itensArr = []; }
      } else if (Array.isArray(v.itens)) {
        itensArr = v.itens;
      }
      itensArr.forEach((i) => {
        const custoUnit = parseFloat(i.preco_custo || 0);
        const qtd = parseFloat(i.qtd || i.quantidade || 1);
        cmv += custoUnit * qtd;
      });
    });

    const despesasPorCategoria = {};
    let totalDespesas = 0;
    despesas.forEach((d) => {
      const cat = (d.categoria || 'OUTROS').toUpperCase();
      despesasPorCategoria[cat] = (despesasPorCategoria[cat] || 0) + parseFloat(d.valor || 0);
      totalDespesas += parseFloat(d.valor || 0);
    });

    const lucroBruto = receitaBruta - cmv;
    const lucroLiquido = lucroBruto - totalDespesas;
    const fmtBRL = (v) => 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    window.dadosDREAtual = [
      { linha: 'RECEITA BRUTA', valor: receitaBruta },
      { linha: '(-) CMV (CUSTO DOS PRODUTOS VENDIDOS)', valor: -cmv },
      { linha: '= LUCRO BRUTO', valor: lucroBruto },
      ...Object.entries(despesasPorCategoria).map(([cat, v]) => ({ linha: `(-) DESPESA: ${cat}`, valor: -v })),
      { linha: '= LUCRO LÍQUIDO', valor: lucroLiquido }
    ];

    const linha = (texto, valor, destaque = false) => `
      <div class="flex items-center justify-between ${destaque ? 'bg-slate-800 dark:bg-slate-700' : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800'} p-3 rounded-2xl shadow-sm">
        <span class="text-[9px] font-black uppercase ${destaque ? 'text-white' : 'text-slate-700 dark:text-slate-200'}">${texto}</span>
        <span class="text-[10px] font-black ${destaque ? 'text-white' : (valor < 0 ? 'text-red-500' : 'text-emerald-500')}">${valor < 0 ? '- ' : ''}${fmtBRL(Math.abs(valor))}</span>
      </div>`;

    container.innerHTML = [
      linha('Receita Bruta', receitaBruta),
      linha('(-) CMV (Custo dos Produtos Vendidos)', -cmv),
      linha('= Lucro Bruto', lucroBruto, true),
      ...Object.entries(despesasPorCategoria).map(([cat, v]) => linha(`(-) Despesa: ${cat}`, -v)),
      linha('= Lucro Líquido', lucroLiquido, true)
    ].join('');
  } catch (e) {
    console.error('[FINANCEIRO] Erro ao gerar DRE:', e);
    container.innerHTML = '<p class="text-red-500 text-[10px] text-center font-black uppercase mt-4">Erro ao carregar dados</p>';
  }
};

window.exportarDREExcel = function () {
  if (typeof window.exportarTabelaParaExcel !== 'function') return;
  window.exportarTabelaParaExcel(
    [{ chave: 'linha', titulo: 'DRE' }, { chave: 'valor', titulo: 'Valor (R$)' }],
    window.dadosDREAtual,
    'dre_simplificado'
  );
};

/* =================================================================================
   F5. COMPARATIVO ENTRE PERÍODOS
   ================================================================================= */

window.dadosComparativoAtual = [];

async function totalizarPeriodoFinanceiro(dataIni, dataFim) {
  const dtIniISO = dataIni + 'T00:00:00Z';
  const dtFimISO = dataFim + 'T23:59:59Z';

  const [resVendas, resDespesas] = await Promise.all([
    _supabase.from('historico_vendas').select('total').gte('created_at', dtIniISO).lte('created_at', dtFimISO).neq('status', 'cancelada').neq('status', 'estornada'),
    _supabase.from('despesas').select('valor').eq('paga', true).gte('data_pagamento', dataIni).lte('data_pagamento', dataFim)
  ]);

  const receita = (resVendas.data || []).reduce((acc, v) => acc + parseFloat(v.total || 0), 0);
  const despesas = (resDespesas.data || []).reduce((acc, d) => acc + parseFloat(d.valor || 0), 0);
  return { receita, despesas, saldo: receita - despesas };
}

window.gerarComparativoFinanceiro = async function () {
  const { ini, fim } = obterPeriodoFinanceiroAtual();
  const container = document.getElementById('conteudo-comparativo-financeiro');
  if (!container || typeof _supabase === 'undefined') return;

  container.innerHTML = '<p class="text-center text-[10px] font-black uppercase text-slate-400 py-10 animate-pulse">Comparando períodos...</p>';

  try {
    const dataIni = new Date(ini + 'T00:00:00');
    const dataFim = new Date(fim + 'T00:00:00');
    const duracaoDias = Math.round((dataFim - dataIni) / 86400000) + 1;

    const finAnteriorFim = new Date(dataIni);
    finAnteriorFim.setDate(finAnteriorFim.getDate() - 1);
    const iniAnterior = new Date(finAnteriorFim);
    iniAnterior.setDate(iniAnterior.getDate() - (duracaoDias - 1));

    const toISO = (d) => d.toISOString().split('T')[0];

    const [atual, anterior] = await Promise.all([
      totalizarPeriodoFinanceiro(ini, fim),
      totalizarPeriodoFinanceiro(toISO(iniAnterior), toISO(finAnteriorFim))
    ]);

    const variacao = (novo, velho) => velho === 0 ? (novo > 0 ? 100 : 0) : ((novo - velho) / Math.abs(velho)) * 100;

    window.dadosComparativoAtual = [
      { metrica: 'RECEITA', periodo_atual: atual.receita, periodo_anterior: anterior.receita, variacao_pct: variacao(atual.receita, anterior.receita) },
      { metrica: 'DESPESAS', periodo_atual: atual.despesas, periodo_anterior: anterior.despesas, variacao_pct: variacao(atual.despesas, anterior.despesas) },
      { metrica: 'SALDO', periodo_atual: atual.saldo, periodo_anterior: anterior.saldo, variacao_pct: variacao(atual.saldo, anterior.saldo) }
    ];

    const fmtBRL = (v) => 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    container.innerHTML = `
      <p class="text-[8px] font-bold text-slate-400 uppercase mb-3 tracking-tighter">Período anterior equivalente: ${toISO(iniAnterior)} a ${toISO(finAnteriorFim)}</p>
      ${window.dadosComparativoAtual.map((l) => `
        <div class="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm mb-2">
          <div class="flex items-center justify-between mb-2">
            <span class="text-[9px] font-black text-slate-700 dark:text-slate-200 uppercase">${l.metrica}</span>
            <span class="text-[9px] font-black ${l.variacao_pct >= 0 ? 'text-emerald-500' : 'text-red-500'}">${l.variacao_pct >= 0 ? '+' : ''}${l.variacao_pct.toFixed(1)}%</span>
          </div>
          <div class="flex justify-between text-[8px] font-bold text-slate-400 uppercase">
            <span>Atual: <span class="text-slate-700 dark:text-slate-200">${fmtBRL(l.periodo_atual)}</span></span>
            <span>Anterior: <span class="text-slate-700 dark:text-slate-200">${fmtBRL(l.periodo_anterior)}</span></span>
          </div>
        </div>`).join('')}
    `;
  } catch (e) {
    console.error('[FINANCEIRO] Erro ao gerar comparativo:', e);
    container.innerHTML = '<p class="text-red-500 text-[10px] text-center font-black uppercase mt-4">Erro ao carregar dados</p>';
  }
};

window.exportarComparativoExcel = function () {
  if (typeof window.exportarTabelaParaExcel !== 'function') return;
  window.exportarTabelaParaExcel(
    [
      { chave: 'metrica', titulo: 'Métrica' },
      { chave: 'periodo_atual', titulo: 'Período Atual (R$)' },
      { chave: 'periodo_anterior', titulo: 'Período Anterior (R$)' },
      { chave: 'variacao_pct', titulo: 'Variação (%)' }
    ],
    window.dadosComparativoAtual,
    'comparativo_financeiro'
  );
};
