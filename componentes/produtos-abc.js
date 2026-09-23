/* =================================================================================
   MÓDULO: CURVA ABC DE PRODUTOS (P6)
   Classifica os produtos pela contribuição de cada um na receita do período,
   usando o mesmo intervalo de datas já usado pelo Ranking de Produtos
   (data-inicio-rel-produtos / data-fim-rel-produtos).
   ================================================================================= */

window.alternarModoRankingProdutos = function (modo) {
  const btnQtd = document.getElementById("btn-prod-modo-qtd");
  const btnAbc = document.getElementById("btn-prod-modo-abc");
  const contQtd = document.getElementById("conteudo-rel-produtos");
  const contAbc = document.getElementById("conteudo-curva-abc");

  const ativo = "flex-1 py-2 rounded-lg bg-blue-500 text-white text-[9px] font-black uppercase transition-all shadow-sm";
  const inativo = "flex-1 py-2 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[9px] font-black uppercase transition-all";

  if (modo === "abc") {
    if (btnQtd) btnQtd.className = inativo;
    if (btnAbc) btnAbc.className = ativo;
    contQtd?.classList.add("hidden");
    contAbc?.classList.remove("hidden");
    window.gerarCurvaABC();
  } else {
    if (btnQtd) btnQtd.className = ativo;
    if (btnAbc) btnAbc.className = inativo;
    contQtd?.classList.remove("hidden");
    contAbc?.classList.add("hidden");
  }
};

window.gerarCurvaABC = async function () {
  const iniInput = document.getElementById("data-inicio-rel-produtos");
  const fimInput = document.getElementById("data-fim-rel-produtos");
  const container = document.getElementById("conteudo-curva-abc");
  if (!iniInput || !fimInput || !container) return;

  const hoje = new Date().toISOString().split("T")[0];
  if (!iniInput.value) iniInput.value = hoje;
  if (!fimInput.value) fimInput.value = hoje;

  const ini = iniInput.value;
  const fim = fimInput.value;

  container.innerHTML = '<p class="text-center text-xs text-slate-400 py-10 font-bold uppercase animate-pulse">Calculando curva ABC...</p>';

  try {
    const { data: vendas, error } = await _supabase
      .from("historico_vendas")
      .select("itens, status")
      .gte("created_at", `${ini}T00:00:00`)
      .lte("created_at", `${fim}T23:59:59`)
      .neq("status", "cancelada");

    if (error) throw error;

    const receitaPorProduto = {};
    let receitaTotal = 0;

    (vendas || []).forEach((v) => {
      let itensArr = [];
      if (typeof v.itens === "string") {
        try { itensArr = JSON.parse(v.itens); } catch (e) { itensArr = []; }
      } else if (Array.isArray(v.itens)) {
        itensArr = v.itens;
      }

      itensArr.forEach((i) => {
        const nome = i.nome || "PRODUTO DESCONHECIDO";
        const preco = parseFloat(i.preco || 0);
        const qtd = parseFloat(i.qtd || i.quantidade || 1);
        const receitaItem = preco * qtd;

        if (!nome.toUpperCase().includes("PGTO") && receitaItem > 0) {
          receitaPorProduto[nome] = (receitaPorProduto[nome] || 0) + receitaItem;
          receitaTotal += receitaItem;
        }
      });
    });

    const ranking = Object.entries(receitaPorProduto).sort((a, b) => b[1] - a[1]);

    if (ranking.length === 0 || receitaTotal === 0) {
      container.innerHTML = '<p class="text-center text-[10px] text-slate-400 py-10 font-black uppercase tracking-widest">Sem vendas de produtos no período.</p>';
      return;
    }

    const fm = typeof window.fmSeguro === "function" ? window.fmSeguro : (v) => v.toFixed(2);
    let receitaAcumulada = 0;

    const linhas = ranking.map(([nome, receita]) => {
      receitaAcumulada += receita;
      const percentualAcumulado = (receitaAcumulada / receitaTotal) * 100;
      const classe = percentualAcumulado <= 80 ? "A" : percentualAcumulado <= 95 ? "B" : "C";
      const corClasse = classe === "A" ? "bg-emerald-100 text-emerald-700" : classe === "B" ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-500";

      return { nome, receita, percentualAcumulado, classe, corClasse };
    });

    const resumoPorClasse = { A: 0, B: 0, C: 0 };
    linhas.forEach((l) => resumoPorClasse[l.classe]++);

    let html = `
      <div class="grid grid-cols-3 gap-2 mb-4">
        <div class="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl text-center border border-emerald-100 dark:border-emerald-800/50">
          <p class="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase">Classe A</p>
          <p class="text-lg font-black text-emerald-600 dark:text-emerald-400">${resumoPorClasse.A}</p>
        </div>
        <div class="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl text-center border border-blue-100 dark:border-blue-800/50">
          <p class="text-[8px] font-black text-blue-600 dark:text-blue-400 uppercase">Classe B</p>
          <p class="text-lg font-black text-blue-600 dark:text-blue-400">${resumoPorClasse.B}</p>
        </div>
        <div class="bg-slate-100 dark:bg-slate-800 p-3 rounded-xl text-center border border-slate-200 dark:border-slate-700">
          <p class="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase">Classe C</p>
          <p class="text-lg font-black text-slate-500 dark:text-slate-400">${resumoPorClasse.C}</p>
        </div>
      </div>`;

    html += linhas.map((l, index) => `
      <div class="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 mb-2 shadow-sm flex items-center justify-between">
        <div class="flex items-center gap-3 min-w-0">
          <span class="text-[10px] font-black text-slate-400 w-6 shrink-0">${index + 1}º</span>
          <h4 class="font-black text-[11px] text-slate-700 dark:text-slate-200 uppercase truncate">${l.nome}</h4>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <span class="text-[8px] font-black uppercase px-2 py-1 rounded-md ${l.corClasse}">${l.classe}</span>
          <div class="bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-lg border border-slate-100 dark:border-slate-700 text-right">
            <span class="font-black text-xs text-emerald-500">R$ ${fm(l.receita)}</span>
            <p class="text-[7px] font-bold text-slate-400 uppercase">${l.percentualAcumulado.toFixed(1)}% acum.</p>
          </div>
        </div>
      </div>`).join("");

    html += `
      <div class="mt-2 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end pr-2">
        <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Receita Total: R$ ${fm(receitaTotal)}</span>
      </div>`;

    container.innerHTML = html;
    if (typeof lucide !== "undefined") lucide.createIcons();
  } catch (e) {
    console.error("[CURVA ABC] Erro:", e);
    container.innerHTML = '<p class="text-center text-xs text-red-500 py-10 font-bold uppercase">Erro ao calcular a curva ABC.</p>';
  }
};
