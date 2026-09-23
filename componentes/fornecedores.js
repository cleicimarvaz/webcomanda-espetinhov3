/* =================================================================================
   MÓDULO: FORNECEDORES — cadastro compartilhado usado por Despesas e Produtos
   ================================================================================= */

/* =================================================================================
   1. NAVEGAÇÃO ENTRE A ABA DE FORNECEDORES E A LISTA DE DESPESAS
   ================================================================================= */

window.abrirAbaFornecedores = function () {
  document.getElementById("view-lista-despesas")?.classList.add("hidden");
  document.getElementById("view-form-despesa")?.classList.add("hidden");
  document.getElementById("view-lista-fornecedores")?.classList.remove("hidden");
  window.carregarFornecedores();
};

window.fecharAbaFornecedores = function () {
  document.getElementById("view-lista-fornecedores")?.classList.add("hidden");
  document.getElementById("view-form-fornecedor")?.classList.add("hidden");
  document.getElementById("view-lista-despesas")?.classList.remove("hidden");
};

/* =================================================================================
   2. LISTAGEM
   ================================================================================= */

window.carregarFornecedores = async function () {
  const lista = document.getElementById("lista-fornecedores");
  if (!lista || typeof _supabase === "undefined") return;

  lista.innerHTML = '<p class="text-center text-[10px] font-black text-slate-400 uppercase animate-pulse py-8">Buscando fornecedores...</p>';

  try {
    const { data, error } = await _supabase
      .from("fornecedores")
      .select("*")
      .order("nome", { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      lista.innerHTML = `
        <div class="text-center py-10 opacity-40">
            <div class="mb-3 flex justify-center"><i data-lucide="truck" class="w-10 h-10" aria-hidden="true"></i></div>
            <p class="text-[10px] font-black uppercase text-slate-500">Nenhum fornecedor cadastrado ainda.</p>
        </div>`;
      if (typeof lucide !== "undefined") lucide.createIcons();
      return;
    }

    lista.innerHTML = data.map((f) => `
        <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center justify-between gap-3 shadow-sm ${f.ativo ? "" : "opacity-50 grayscale"}">
            <div class="flex-1 min-w-0">
                <span class="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">${f.categoria || "OUTROS"}</span>
                <h4 class="text-xs font-black text-slate-700 dark:text-slate-200 uppercase leading-tight truncate">${f.nome}</h4>
                ${f.telefone ? `<p class="text-[9px] font-bold text-slate-400 uppercase mt-0.5">${f.telefone}</p>` : ""}
            </div>
            <div class="flex items-center gap-1 shrink-0">
                <button onclick="window.abrirFormFornecedor(${f.id})" aria-label="Editar fornecedor" class="w-9 h-9 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-600 active:scale-95 transition-all"><i data-lucide="pencil" class="w-3.5 h-3.5" aria-hidden="true"></i></button>
                <button onclick="window.toggleAtivoFornecedor(${f.id}, ${!f.ativo})" aria-label="${f.ativo ? "Desativar" : "Ativar"} fornecedor" class="w-9 h-9 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-600 active:scale-95 transition-all"><i data-lucide="circle" class="w-3.5 h-3.5 ${f.ativo ? "text-emerald-500 fill-emerald-500" : "text-slate-300"}" aria-hidden="true"></i></button>
                <button onclick="window.excluirFornecedor(${f.id})" aria-label="Excluir fornecedor" class="w-9 h-9 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-lg flex items-center justify-center border border-red-100 dark:border-red-900/30 active:scale-95 transition-all"><i data-lucide="trash-2" class="w-3.5 h-3.5" aria-hidden="true"></i></button>
            </div>
        </div>`).join("");

    if (typeof lucide !== "undefined") lucide.createIcons();
  } catch (e) {
    console.error("Erro ao listar fornecedores:", e);
    lista.innerHTML = '<p class="text-center text-xs font-bold text-red-500 py-10 uppercase">Erro de conexão com o banco.</p>';
  }
};

/* =================================================================================
   3. FORMULÁRIO E SALVAMENTO
   ================================================================================= */

window.abrirFormFornecedor = async function (id = null) {
  ["f-id", "f-nome", "f-telefone", "f-cnpj", "f-email", "f-endereco", "f-observacoes"].forEach((campoId) => {
    const el = document.getElementById(campoId);
    if (el) el.value = "";
  });
  const categoria = document.getElementById("f-categoria");
  if (categoria) categoria.value = "OUTROS";

  const titulo = document.getElementById("titulo-form-fornecedor");
  if (titulo) titulo.innerText = "NOVO FORNECEDOR";

  if (id) {
    if (titulo) titulo.innerText = "EDITAR FORNECEDOR";
    try {
      const { data, error } = await _supabase.from("fornecedores").select("*").eq("id", id).single();
      if (error) throw error;
      if (data) {
        document.getElementById("f-id").value = data.id;
        document.getElementById("f-nome").value = data.nome || "";
        document.getElementById("f-categoria").value = data.categoria || "OUTROS";
        document.getElementById("f-telefone").value = data.telefone || "";
        document.getElementById("f-cnpj").value = data.cnpj_cpf || "";
        document.getElementById("f-email").value = data.email || "";
        document.getElementById("f-endereco").value = data.endereco || "";
        document.getElementById("f-observacoes").value = data.observacoes || "";
      }
    } catch (e) {
      console.error("Erro ao carregar fornecedor para edição:", e);
    }
  }

  document.getElementById("view-lista-fornecedores")?.classList.add("hidden");
  document.getElementById("view-form-fornecedor")?.classList.remove("hidden");
};

window.fecharFormFornecedor = function () {
  document.getElementById("view-form-fornecedor")?.classList.add("hidden");
  document.getElementById("view-lista-fornecedores")?.classList.remove("hidden");
};

window.salvarFornecedor = async function () {
  const id = document.getElementById("f-id").value;
  const nome = document.getElementById("f-nome").value.trim().toUpperCase();

  if (!nome) {
    if (typeof showToast === "function") showToast("Digite o nome do fornecedor.", "erro");
    return;
  }

  const dados = {
    nome,
    categoria: document.getElementById("f-categoria").value,
    telefone: document.getElementById("f-telefone").value.trim() || null,
    cnpj_cpf: document.getElementById("f-cnpj").value.trim() || null,
    email: document.getElementById("f-email").value.trim() || null,
    endereco: document.getElementById("f-endereco").value.trim() || null,
    observacoes: document.getElementById("f-observacoes").value.trim() || null,
  };

  try {
    if (id) {
      const { error } = await _supabase.from("fornecedores").update(dados).eq("id", id);
      if (error) throw error;
      if (typeof registrarLog === "function") await registrarLog("FINANCEIRO", `EDITOU FORNECEDOR: ${nome}`);
    } else {
      const { error } = await _supabase.from("fornecedores").insert([dados]);
      if (error) throw error;
      if (typeof registrarLog === "function") await registrarLog("FINANCEIRO", `CADASTROU FORNECEDOR: ${nome}`);
    }

    if (typeof showToast === "function") showToast("Fornecedor salvo com sucesso!", "sucesso");
    window.fecharFormFornecedor();
    window.carregarFornecedores();
  } catch (e) {
    console.error("Erro ao salvar fornecedor:", e);
    if (typeof showToast === "function") showToast("Erro ao gravar fornecedor no banco.", "erro");
  }
};

/* =================================================================================
   4. AÇÕES RÁPIDAS (ATIVAR/DESATIVAR, EXCLUIR)
   ================================================================================= */

window.toggleAtivoFornecedor = async function (id, novoStatus) {
  try {
    const { data: fornecedor, error } = await _supabase.from("fornecedores").update({ ativo: novoStatus }).eq("id", id).select("nome").maybeSingle();
    if (error) throw error;
    if (typeof registrarLog === "function") {
      await registrarLog("FINANCEIRO", novoStatus ? "ATIVOU FORNECEDOR" : "DESATIVOU FORNECEDOR", fornecedor?.nome || `ID ${id}`);
    }
    window.carregarFornecedores();
  } catch (e) {
    console.error("Erro ao alterar status do fornecedor:", e);
    if (typeof showToast === "function") showToast("Erro ao alterar status.", "erro");
  }
};

window.excluirFornecedor = function (id) {
  const deletar = async () => {
    try {
      const { data: fornecedor } = await _supabase.from("fornecedores").select("nome").eq("id", id).maybeSingle();
      const { error } = await _supabase.from("fornecedores").delete().eq("id", id);
      if (error) throw error;
      if (typeof registrarLog === "function") {
        await registrarLog("FINANCEIRO", "EXCLUIU FORNECEDOR", fornecedor?.nome || `ID ${id}`);
      }
      if (typeof showToast === "function") showToast("Fornecedor excluído.", "sucesso");
      window.carregarFornecedores();
    } catch (e) {
      console.error("Erro ao excluir fornecedor:", e);
      if (typeof showToast === "function") showToast("Não foi possível excluir (verifique se há despesas/produtos vinculados).", "erro");
    }
  };

  if (typeof confirmarAcao === "function") {
    confirmarAcao("Excluir este fornecedor permanentemente?", deletar, "EXCLUIR FORNECEDOR");
  } else if (confirm("Excluir fornecedor?")) {
    deletar();
  }
};

/* =================================================================================
   5. PONTO DE REUSO: preenche qualquer <select> de fornecedor na página atual
   ================================================================================= */

window.preencherSelectsFornecedor = async function (idsDeSelects) {
  if (typeof _supabase === "undefined" || !Array.isArray(idsDeSelects)) return;

  const selects = idsDeSelects.map((id) => document.getElementById(id)).filter(Boolean);
  if (selects.length === 0) return;

  try {
    const { data, error } = await _supabase
      .from("fornecedores")
      .select("id, nome")
      .eq("ativo", true)
      .order("nome", { ascending: true });

    if (error) throw error;

    const optionsHtml = '<option value="">Sem fornecedor</option>' +
      (data || []).map((f) => `<option value="${f.id}">${f.nome}</option>`).join("");

    selects.forEach((select) => {
      const valorAtual = select.value;
      select.innerHTML = optionsHtml;
      if (valorAtual) select.value = valorAtual;
    });
  } catch (e) {
    console.error("Erro ao preencher select de fornecedores:", e);
  }
};
