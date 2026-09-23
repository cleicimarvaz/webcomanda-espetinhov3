/* =================================================================================
   MÓDULO: COMBOS COM COMPOSIÇÃO (P5)
   Permite que um produto de categoria "combos" declare quais produtos/quantidades
   o compõem (produto_composicao), e expande a lista de itens vendidos para incluir
   os componentes na hora de dar baixa no estoque.

   GARANTIA DE COMPORTAMENTO: para qualquer venda sem nenhum produto combo (a
   grande maioria hoje), expandirItensComCombos devolve o MESMO array recebido,
   sem nenhuma query extra além de um único select indexado — main.js continua
   executando exatamente as mesmas queries de sempre para essas vendas.
   ================================================================================= */

window.expandirItensComCombos = async function (itensVendidos) {
  if (typeof _supabase === "undefined" || !itensVendidos || itensVendidos.length === 0) return itensVendidos;

  const ids = [...new Set(itensVendidos.map((i) => i.id))];

  const { data: composicoes, error } = await _supabase
    .from("produto_composicao")
    .select("combo_id, componente_id, quantidade")
    .in("combo_id", ids);

  if (error || !composicoes || composicoes.length === 0) return itensVendidos; // caminho de vendas normais, sem combo

  const extras = [];
  itensVendidos.forEach((item) => {
    composicoes
      .filter((c) => c.combo_id === item.id)
      .forEach((parte) => {
        extras.push({
          ...item,
          id: parte.componente_id,
          qtd: (parseFloat(item.qtd) || 1) * parseFloat(parte.quantidade),
          nome: `${item.nome} (COMPONENTE)`,
        });
      });
  });

  return [...itensVendidos, ...extras]; // itens originais nunca são removidos/alterados
};

/* =================================================================================
   EDITOR DE COMPOSIÇÃO (dentro do cadastro de produtos, só quando categoria=combos)
   ================================================================================= */

window.produtosDisponiveisParaCombo = [];
window.composicaoAtualCombo = [];

window.toggleEditorComposicaoCombo = function () {
  const categoria = document.getElementById("p-categoria")?.value;
  const container = document.getElementById("container-composicao-combo");
  if (!container) return;

  if (categoria === "combos" && window.produtoEdicaoId) {
    container.classList.remove("hidden");
    window.carregarComposicaoCombo(window.produtoEdicaoId);
  } else {
    container.classList.add("hidden");
  }
};

window.carregarComposicaoCombo = async function (comboId) {
  const lista = document.getElementById("lista-composicao-combo");
  const select = document.getElementById("select-componente-combo");
  if (!lista) return;

  try {
    // Produtos disponíveis como componente: qualquer produto que NÃO seja combo (sem combo-de-combo)
    const { data: produtos, error: errProdutos } = await _supabase
      .from("produtos")
      .select("id, nome")
      .neq("categoria", "combos")
      .eq("status", true)
      .order("nome", { ascending: true });
    if (errProdutos) throw errProdutos;
    window.produtosDisponiveisParaCombo = produtos || [];

    if (select) {
      select.innerHTML = window.produtosDisponiveisParaCombo.map((p) => `<option value="${p.id}">${p.nome}</option>`).join("");
    }

    const { data: composicao, error: errComposicao } = await _supabase
      .from("produto_composicao")
      .select("id, componente_id, quantidade, produtos:componente_id(nome)")
      .eq("combo_id", comboId);
    if (errComposicao) throw errComposicao;

    window.composicaoAtualCombo = composicao || [];
    window.renderizarComposicaoCombo();
  } catch (e) {
    console.error("Erro ao carregar composição do combo:", e);
  }
};

window.renderizarComposicaoCombo = function () {
  const lista = document.getElementById("lista-composicao-combo");
  if (!lista) return;

  const itens = window.composicaoAtualCombo || [];
  lista.innerHTML = itens.length > 0
    ? itens.map((c) => `
        <div class="flex items-center justify-between bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700 mb-1">
            <span class="text-[10px] font-bold text-slate-700 dark:text-slate-200 uppercase">${c.quantidade}x ${c.produtos?.nome || "Produto"}</span>
            <button type="button" onclick="window.removerComponenteCombo(${c.id})" aria-label="Remover componente" class="w-7 h-7 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-lg flex items-center justify-center"><i data-lucide="x" class="w-3.5 h-3.5" aria-hidden="true"></i></button>
        </div>`).join("")
    : '<p class="text-[9px] text-slate-400 italic px-1">Nenhum componente adicionado ainda.</p>';

  if (typeof lucide !== "undefined") lucide.createIcons();
};

window.adicionarComponenteCombo = async function () {
  const comboId = window.produtoEdicaoId;
  const componenteId = document.getElementById("select-componente-combo")?.value;
  const quantidade = parseFloat(document.getElementById("input-qtd-componente-combo")?.value || "1");

  if (!comboId) {
    if (typeof showToast === "function") showToast("Salve o combo antes de adicionar componentes.", "erro");
    return;
  }
  if (!componenteId || quantidade <= 0) {
    if (typeof showToast === "function") showToast("Selecione um componente e uma quantidade válida.", "erro");
    return;
  }
  if (parseInt(componenteId) === parseInt(comboId)) {
    if (typeof showToast === "function") showToast("Um combo não pode se compor dele mesmo.", "erro");
    return;
  }

  try {
    const { error } = await _supabase.from("produto_composicao").insert([{
      combo_id: comboId,
      componente_id: componenteId,
      quantidade,
    }]);
    if (error) throw error;

    if (typeof registrarLog === "function") {
      const nomeComponente = window.produtosDisponiveisParaCombo.find((p) => String(p.id) === String(componenteId))?.nome || `ID ${componenteId}`;
      await registrarLog("ESTOQUE", "ADICIONOU COMPONENTE AO COMBO", `COMBO ID ${comboId} | COMPONENTE: ${nomeComponente} | QTD: ${quantidade}`);
    }

    document.getElementById("input-qtd-componente-combo").value = "1";
    await window.carregarComposicaoCombo(comboId);
  } catch (e) {
    console.error("Erro ao adicionar componente ao combo:", e);
    if (typeof showToast === "function") showToast("Erro ao adicionar componente (talvez já exista na lista).", "erro");
  }
};

window.removerComponenteCombo = async function (composicaoId) {
  try {
    const { error } = await _supabase.from("produto_composicao").delete().eq("id", composicaoId);
    if (error) throw error;
    if (typeof registrarLog === "function") {
      await registrarLog("ESTOQUE", "REMOVEU COMPONENTE DO COMBO", `COMBO ID ${window.produtoEdicaoId} | COMPOSIÇÃO ID: ${composicaoId}`);
    }
    await window.carregarComposicaoCombo(window.produtoEdicaoId);
  } catch (e) {
    console.error("Erro ao remover componente do combo:", e);
  }
};
