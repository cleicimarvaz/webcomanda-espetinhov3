/* =================================================================================
   ingressos.js — Painel administrativo de venda de ingressos de evento
   (tipos de ingresso, venda no balcão, aprovação de solicitações públicas,
   cancelamento e impressão com QR Code)
   ================================================================================= */

window.tiposIngressoAtivo = [];
window.listaIngressosLocal = [];

// ==========================================
// 1. MODAL PRINCIPAL
// ==========================================
window.abrirModalAdminIngressos = async function () {
  const modal = document.getElementById("modal-admin-ingressos");
  if (!modal) return;
  modal.classList.remove("hidden");
  await window.carregarTiposIngresso();
  await window.carregarListaIngressos();
};

window.fecharModalAdminIngressos = function () {
  document.getElementById("modal-admin-ingressos")?.classList.add("hidden");
};

// ==========================================
// 2. TIPOS DE INGRESSO (CRUD)
// ==========================================
window.carregarTiposIngresso = async function () {
  if (!window.eventoIdAtivo) return;
  try {
    const { data, error } = await _supabase
      .from("tipos_ingresso")
      .select("*")
      .eq("evento_id", window.eventoIdAtivo)
      .order("created_at", { ascending: true });

    if (error) throw error;

    window.tiposIngressoAtivo = data || [];
    window.renderizarTiposIngresso();
    window.preencherSelectTiposIngresso();
  } catch (err) {
    console.error("Erro ao carregar tipos de ingresso:", err);
    if (window.showToast) window.showToast("Erro ao carregar tipos de ingresso.", "erro");
    const container = document.getElementById("lista-tipos-ingresso");
    if (container) container.innerHTML = '<p class="text-xs text-red-400 italic px-2">Erro ao carregar tipos de ingresso.</p>';
    const select = document.getElementById("venda-ingresso-tipo");
    if (select) select.innerHTML = '<option value="">Erro ao carregar tipos</option>';
  }
};

window.renderizarTiposIngresso = function () {
  const container = document.getElementById("lista-tipos-ingresso");
  if (!container) return;

  const lista = window.tiposIngressoAtivo || [];
  container.innerHTML = lista.length > 0
    ? lista.map((t) => `
        <div class="flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-xl border ${t.ativo ? "border-slate-200 dark:border-slate-700" : "border-red-100 dark:border-red-900/30 opacity-60"} mb-2">
            <div class="flex-1 min-w-0">
                <p class="text-xs font-black text-slate-700 dark:text-slate-200 uppercase truncate">${t.nome}</p>
                <p class="text-[9px] font-bold text-slate-400 uppercase">R$ ${parseFloat(t.preco).toFixed(2).replace(".", ",")} ${t.quantidade_total ? `• ${t.quantidade_vendida || 0}/${t.quantidade_total} vendidos` : `• ${t.quantidade_vendida || 0} vendidos`}</p>
            </div>
            <div class="flex items-center gap-1 shrink-0">
                <button onclick="window.alternarStatusTipoIngresso('${t.id}', ${!t.ativo})" aria-label="${t.ativo ? "Desativar tipo" : "Ativar tipo"}" class="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 transition-colors">
                    <i data-lucide="circle" class="w-4 h-4 ${t.ativo ? "text-emerald-500 fill-emerald-500" : "text-slate-300"}" aria-hidden="true"></i>
                </button>
                <button onclick="window.removerTipoIngresso('${t.id}')" aria-label="Excluir tipo" class="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 transition-colors">
                    <i data-lucide="trash-2" class="w-4 h-4" aria-hidden="true"></i>
                </button>
            </div>
        </div>
      `).join("")
    : '<p class="text-xs text-slate-400 italic px-2">Nenhum tipo de ingresso cadastrado ainda.</p>';

  if (typeof lucide !== "undefined") lucide.createIcons();
};

window.salvarNovoTipoIngresso = async function (event) {
  if (event) event.preventDefault();
  if (!window.eventoIdAtivo) return;

  const inputNome = document.getElementById("tipo-ingresso-nome");
  const inputPreco = document.getElementById("tipo-ingresso-preco");
  const inputQtd = document.getElementById("tipo-ingresso-qtd");

  const nome = inputNome?.value.trim();
  const preco = parseFloat((inputPreco?.value || "0").replace(",", "."));
  const qtdTexto = inputQtd?.value.trim();
  const quantidadeTotal = qtdTexto ? parseInt(qtdTexto) : null;

  if (!nome) {
    if (window.showToast) window.showToast("Digite o nome do tipo de ingresso.", "erro");
    return;
  }
  if (isNaN(preco) || preco < 0) {
    if (window.showToast) window.showToast("Digite um preço válido.", "erro");
    return;
  }

  try {
    const { error } = await _supabase.from("tipos_ingresso").insert([{
      evento_id: window.eventoIdAtivo,
      nome,
      preco,
      quantidade_total: quantidadeTotal && !isNaN(quantidadeTotal) ? quantidadeTotal : null,
      ativo: true,
    }]);

    if (error) throw error;

    if (typeof registrarLog === "function") {
      await registrarLog("VENDA", "CRIOU TIPO DE INGRESSO", `EVENTO ID ${window.eventoIdAtivo} | ${nome} | R$ ${preco.toFixed(2)}`);
    }

    if (window.showToast) window.showToast("Tipo de ingresso criado!", "sucesso");
    if (inputNome) inputNome.value = "";
    if (inputPreco) inputPreco.value = "";
    if (inputQtd) inputQtd.value = "";
    await window.carregarTiposIngresso();
  } catch (err) {
    console.error("Erro ao salvar tipo de ingresso:", err);
    if (window.showToast) window.showToast("Erro ao salvar tipo de ingresso.", "erro");
  }
};

window.alternarStatusTipoIngresso = async function (id, novoStatus) {
  try {
    const { data: tipo, error } = await _supabase.from("tipos_ingresso").update({ ativo: novoStatus }).eq("id", id).select("nome").maybeSingle();
    if (error) throw error;
    if (typeof registrarLog === "function") {
      await registrarLog("VENDA", novoStatus ? "ATIVOU TIPO DE INGRESSO" : "DESATIVOU TIPO DE INGRESSO", tipo?.nome || `ID ${id}`);
    }
    await window.carregarTiposIngresso();
  } catch (err) {
    console.error("Erro ao alterar status do tipo de ingresso:", err);
    if (window.showToast) window.showToast("Erro ao alterar status.", "erro");
  }
};

window.removerTipoIngresso = async function (id) {
  const confirmado = await window.confirmarAcaoCustom(
    "Excluir Tipo de Ingresso",
    "Tem certeza? Ingressos já vendidos deste tipo não serão afetados, mas o tipo deixará de poder ser vendido.",
    true,
  );
  if (!confirmado) return;

  try {
    const { data: tipo } = await _supabase.from("tipos_ingresso").select("nome").eq("id", id).maybeSingle();
    const { error } = await _supabase.from("tipos_ingresso").delete().eq("id", id);
    if (error) throw error;
    if (typeof registrarLog === "function") {
      await registrarLog("VENDA", "EXCLUIU TIPO DE INGRESSO", tipo?.nome || `ID ${id}`);
    }
    if (window.showToast) window.showToast("Tipo de ingresso excluído.", "sucesso");
    await window.carregarTiposIngresso();
  } catch (err) {
    console.error("Erro ao excluir tipo de ingresso:", err);
    if (window.showToast) window.showToast("Erro ao excluir tipo de ingresso.", "erro");
  }
};

window.preencherSelectTiposIngresso = function () {
  const select = document.getElementById("venda-ingresso-tipo");
  if (!select) return;

  const ativos = (window.tiposIngressoAtivo || []).filter((t) => t.ativo);
  select.innerHTML = ativos.length > 0
    ? ativos.map((t) => `<option value="${t.id}" data-preco="${t.preco}">${t.nome} — R$ ${parseFloat(t.preco).toFixed(2).replace(".", ",")}</option>`).join("")
    : '<option value="">Nenhum tipo ativo — cadastre um tipo primeiro</option>';

  window.atualizarValorVendaIngresso();
};

window.atualizarValorVendaIngresso = function () {
  const select = document.getElementById("venda-ingresso-tipo");
  const inputValor = document.getElementById("venda-ingresso-valor");
  if (!select || !inputValor) return;
  const opcao = select.selectedOptions[0];
  const preco = opcao ? parseFloat(opcao.getAttribute("data-preco") || "0") : 0;
  inputValor.value = preco.toFixed(2).replace(".", ",");
};

// ==========================================
// 3. VENDA NO BALCÃO (canal_venda = 'balcao', status já confirmado)
// ==========================================
window.venderIngressoBalcao = async function (event) {
  if (event) event.preventDefault();
  if (!window.eventoIdAtivo) return;

  const btn = document.getElementById("btn-vender-ingresso-balcao");
  const tipoId = document.getElementById("venda-ingresso-tipo")?.value;
  const comprador = document.getElementById("venda-ingresso-comprador")?.value.trim();
  const telefone = document.getElementById("venda-ingresso-telefone")?.value.trim();
  const valorTexto = document.getElementById("venda-ingresso-valor")?.value || "0";
  const valorPago = parseFloat(valorTexto.replace(",", "."));

  if (!tipoId) {
    if (window.showToast) window.showToast("Selecione o tipo de ingresso.", "erro");
    return;
  }
  if (!comprador) {
    if (window.showToast) window.showToast("Digite o nome do comprador.", "erro");
    return;
  }
  if (isNaN(valorPago) || valorPago < 0) {
    if (window.showToast) window.showToast("Valor recebido inválido.", "erro");
    return;
  }

  if (btn) { btn.disabled = true; btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin" aria-hidden="true"></i> Vendendo...'; if (typeof lucide !== "undefined") lucide.createIcons(); }

  try {
    const usuarioLogado = localStorage.getItem("userName") || "SISTEMA";

    const { data, error } = await _supabase.from("ingressos").insert([{
      evento_id: window.eventoIdAtivo,
      tipo_ingresso_id: tipoId,
      comprador_nome: comprador,
      comprador_telefone: telefone || null,
      canal_venda: "balcao",
      valor_pago: valorPago,
      status: "confirmado",
      vendido_por: usuarioLogado,
    }]).select().single();

    if (error) throw error;

    // Incrementa o contador de vendidos do tipo (best-effort, não trava a venda se falhar)
    const tipo = (window.tiposIngressoAtivo || []).find((t) => t.id === tipoId);
    if (tipo) {
      await _supabase.from("tipos_ingresso").update({ quantidade_vendida: (tipo.quantidade_vendida || 0) + 1 }).eq("id", tipoId);
    }

    if (window.showToast) window.showToast("Ingresso vendido com sucesso!", "sucesso");
    if (typeof registrarLog === "function") {
      await registrarLog("VENDA", "INGRESSO VENDIDO", `Ingresso para ${comprador.toUpperCase()} vendido no balcão por R$ ${valorPago.toFixed(2)}`);
    }

    document.getElementById("form-venda-ingresso-balcao")?.reset();
    await window.carregarTiposIngresso();
    await window.carregarListaIngressos();

    // Oferece impressão imediata
    window.imprimirIngresso(data, tipo ? tipo.nome : "");
  } catch (err) {
    console.error("Erro ao vender ingresso:", err);
    if (window.showToast) window.showToast("Erro ao vender ingresso.", "erro");
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i data-lucide="shopping-cart" class="w-4 h-4" aria-hidden="true"></i> Vender no Balcão'; if (typeof lucide !== "undefined") lucide.createIcons(); }
  }
};

// ==========================================
// 4. LISTAGEM, APROVAÇÃO E CANCELAMENTO
// ==========================================
window.carregarListaIngressos = async function () {
  if (!window.eventoIdAtivo) return;
  const container = document.getElementById("lista-ingressos-vendidos");
  if (container) container.innerHTML = '<div class="text-center text-sm font-bold py-8 text-slate-400 italic animate-pulse">Carregando ingressos...</div>';

  try {
    const { data, error } = await _supabase
      .from("ingressos")
      .select("*, tipos_ingresso(nome)")
      .eq("evento_id", window.eventoIdAtivo)
      .order("data_venda", { ascending: false });

    if (error) throw error;

    window.listaIngressosLocal = data || [];
    window.renderizarListaIngressos();
  } catch (err) {
    console.error("Erro ao carregar ingressos:", err);
    if (container) container.innerHTML = '<div class="text-center text-red-500 font-bold py-8">Erro ao carregar ingressos.</div>';
  }
};

window.renderizarListaIngressos = function () {
  const container = document.getElementById("lista-ingressos-vendidos");
  if (!container) return;

  const lista = window.listaIngressosLocal || [];
  if (lista.length === 0) {
    container.innerHTML = '<div class="text-center text-sm font-bold py-8 text-slate-400 italic">Nenhum ingresso vendido ainda.</div>';
    return;
  }

  const statusClasses = {
    confirmado: "bg-emerald-100 text-emerald-700",
    pendente: "bg-amber-100 text-amber-700",
    utilizado: "bg-slate-200 text-slate-600",
    cancelado: "bg-red-100 text-red-700",
  };

  container.innerHTML = lista.map((ing) => {
    const nomeEscapado = (ing.comprador_nome || "").replace(/'/g, "\\'");
    const botaoAprovar = ing.status === "pendente"
      ? `<button onclick="window.aprovarIngressoPendente('${ing.id}')" class="flex-1 sm:flex-none bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[9px] uppercase tracking-widest py-2 px-3 rounded-lg shadow-sm transition-all active:scale-95">Aprovar</button>`
      : "";
    const botaoImprimir = ing.status === "confirmado" || ing.status === "utilizado"
      ? `<button onclick="window.reimprimirIngresso('${ing.id}')" aria-label="Reimprimir ingresso" class="flex-1 sm:flex-none bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-[9px] uppercase tracking-widest py-2 px-3 rounded-lg transition-all active:scale-95 flex items-center justify-center gap-1"><i data-lucide="printer" class="w-3 h-3" aria-hidden="true"></i> Ticket</button>`
      : "";
    const botaoCancelar = ing.status !== "cancelado" && ing.status !== "utilizado"
      ? `<button onclick="window.cancelarIngresso('${ing.id}')" aria-label="Cancelar ingresso" class="flex-1 sm:flex-none bg-red-50 dark:bg-red-900/20 text-red-500 font-black text-[9px] uppercase tracking-widest py-2 px-3 rounded-lg transition-all active:scale-95">Cancelar</button>`
      : "";

    return `
    <div class="bg-white dark:bg-slate-900 p-4 rounded-xl md:rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 md:gap-4 shadow-sm mb-2">
        <div class="flex-1 min-w-0 w-full">
            <div class="flex items-center gap-2 mb-1 flex-wrap">
                <h5 class="font-black text-sm text-slate-800 dark:text-slate-100 uppercase tracking-tight truncate" title="${ing.comprador_nome}">${ing.comprador_nome}</h5>
                <span class="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${statusClasses[ing.status] || "bg-slate-100 text-slate-500"}">${ing.status}</span>
                ${ing.canal_venda === "publico" ? '<span class="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-600">Site</span>' : ""}
            </div>
            <p class="text-[10px] font-bold text-slate-400 uppercase">${ing.tipos_ingresso?.nome || "Ingresso"} • R$ ${parseFloat(ing.valor_pago || 0).toFixed(2).replace(".", ",")}</p>
            ${ing.comprador_telefone ? `<p class="text-[9px] font-bold text-slate-400 uppercase mt-0.5">WPP: ${ing.comprador_telefone}</p>` : ""}
        </div>
        <div class="flex flex-row sm:flex-col gap-2 w-full sm:w-auto shrink-0">
            ${botaoAprovar}
            ${botaoImprimir}
            ${botaoCancelar}
        </div>
    </div>`;
  }).join("");

  if (typeof lucide !== "undefined") lucide.createIcons();
};

window.aprovarIngressoPendente = async function (id) {
  const confirmado = await window.confirmarAcaoCustom(
    "Aprovar Ingresso",
    "Confirma que o pagamento deste ingresso foi recebido?",
    false,
  );
  if (!confirmado) return;

  try {
    const { error } = await _supabase.from("ingressos").update({ status: "confirmado" }).eq("id", id);
    if (error) throw error;

    const ingresso = (window.listaIngressosLocal || []).find((i) => i.id === id);

    if (typeof registrarLog === "function") {
      await registrarLog("FINANCEIRO", "APROVOU PAGAMENTO DE INGRESSO", `${ingresso?.comprador_nome || `ID ${id}`}`);
    }

    if (window.showToast) window.showToast("Ingresso confirmado!", "sucesso");

    if (ingresso && ingresso.comprador_telefone) {
      let telefonePuro = String(ingresso.comprador_telefone).replace(/\D/g, "");
      if (telefonePuro.length === 10 || telefonePuro.length === 11) telefonePuro = "55" + telefonePuro;
      const mensagem = `Olá, *${ingresso.comprador_nome}*! 🎉\n\nSeu pagamento foi confirmado e seu ingresso já está válido para entrada no evento. Guarde o QR Code que enviamos/entregamos — ele será conferido na portaria.\n\nAté lá!`;
      window.open(`https://wa.me/${telefonePuro}?text=${encodeURIComponent(mensagem)}`, "_blank");
    }

    await window.carregarListaIngressos();
  } catch (err) {
    console.error("Erro ao aprovar ingresso:", err);
    if (window.showToast) window.showToast("Erro ao aprovar ingresso.", "erro");
  }
};

window.cancelarIngresso = async function (id) {
  const confirmado = await window.confirmarAcaoCustom(
    "Cancelar Ingresso",
    "Tem certeza que deseja cancelar este ingresso? Ele deixará de ser aceito na validação de entrada.",
    true,
  );
  if (!confirmado) return;

  try {
    const ingresso = (window.listaIngressosLocal || []).find((i) => i.id === id);
    const { error } = await _supabase.from("ingressos").update({ status: "cancelado" }).eq("id", id);
    if (error) throw error;
    if (typeof registrarLog === "function") {
      await registrarLog("SEGURANÇA", "CANCELOU INGRESSO", `${ingresso?.comprador_nome || `ID ${id}`}`);
    }
    if (window.showToast) window.showToast("Ingresso cancelado.", "sucesso");
    await window.carregarListaIngressos();
  } catch (err) {
    console.error("Erro ao cancelar ingresso:", err);
    if (window.showToast) window.showToast("Erro ao cancelar ingresso.", "erro");
  }
};

window.reimprimirIngresso = async function (id) {
  try {
    const { data, error } = await _supabase.from("ingressos").select("*, tipos_ingresso(nome)").eq("id", id).single();
    if (error || !data) throw error || new Error("Ingresso não encontrado.");
    window.imprimirIngresso(data, data.tipos_ingresso?.nome || "");
  } catch (err) {
    console.error("Erro ao reimprimir ingresso:", err);
    if (window.showToast) window.showToast("Erro ao reimprimir ingresso.", "erro");
  }
};

// ==========================================
// 5. IMPRESSÃO DO INGRESSO (QR embutido, reaproveita o motor de print-core.js)
// ==========================================
window.imprimirIngresso = async function (ingresso, tipoNome) {
  if (!ingresso || !ingresso.codigo_unico) {
    if (window.showToast) window.showToast("Dados do ingresso incompletos para impressão.", "erro");
    return;
  }

  if (typeof QRCode === "undefined") {
    console.error("Biblioteca QRCode não carregada.");
    if (window.showToast) window.showToast("Biblioteca de QR Code não carregada.", "erro");
    return;
  }

  try {
    const qrDataUrl = await QRCode.toDataURL(ingresso.codigo_unico, { width: 220, margin: 1 });
    const cfg = typeof obterConfiguracoesImpressora === "function"
      ? obterConfiguracoesImpressora()
      : { pageWidth: "80mm", bodyWidth: "74mm" };
    const nomeLoja = localStorage.getItem("nomeLoja") || "ESPETINHO & CIA";
    const nomeEvento = window.nomeEventoAtivo || "EVENTO";
    const dataEmissao = new Date(ingresso.data_venda || Date.now()).toLocaleString("pt-BR");

    const html = `
      <div style="width: ${cfg.bodyWidth}; margin: 0 auto; font-family: 'Courier New', Courier, monospace; color: #000; text-align: center;">
          <div style="font-size: 15px; font-weight: 900; text-transform: uppercase;">${nomeLoja}</div>
          <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; margin-top: 2px;">INGRESSO — ${nomeEvento}</div>
          <div style="border-top: 1px dashed #000; margin: 8px 0;"></div>
          <div style="font-size: 12px; font-weight: 900; text-transform: uppercase;">${(tipoNome || "INGRESSO").toUpperCase()}</div>
          <div style="font-size: 13px; font-weight: 900; text-transform: uppercase; margin-top: 4px;">${(ingresso.comprador_nome || "").toUpperCase()}</div>
          <div style="margin: 10px 0;"><img src="${qrDataUrl}" style="width: 160px; height: 160px;"></div>
          <div style="font-size: 9px; word-break: break-all;">${ingresso.codigo_unico}</div>
          <div style="border-top: 1px dashed #000; margin: 8px 0;"></div>
          <div style="font-size: 9px;">Emitido em: ${dataEmissao}</div>
          <div style="font-size: 9px; font-weight: 900; margin-top: 4px;">APRESENTE ESTE QR NA ENTRADA</div>
      </div>`;

    if (typeof window.imprimirConteudoIframe === "function") {
      window.imprimirConteudoIframe(html, `Ingresso_${(ingresso.comprador_nome || "cliente").replace(/\s+/g, "_")}`);
    }
  } catch (err) {
    console.error("Erro ao gerar QR do ingresso:", err);
    if (window.showToast) window.showToast("Erro ao gerar o QR Code do ingresso.", "erro");
  }
};

// ==========================================
// 6. LINK PÚBLICO DE INGRESSOS
// ==========================================
window.copiarLinkIngressos = function () {
  if (!window.eventoIdAtivo) return;
  const pathParts = window.location.pathname.split("/");
  pathParts.pop();
  const baseUrl = window.location.origin + pathParts.join("/") + "/ingresso-publico.html";
  const link = `${baseUrl}?evento=${window.eventoIdAtivo}`;

  navigator.clipboard.writeText(link).then(() => {
    if (window.showToast) window.showToast("Link de ingressos copiado!", "sucesso");
  });
};
