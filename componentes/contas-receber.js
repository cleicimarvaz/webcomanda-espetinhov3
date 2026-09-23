/* =================================================================================
   MÓDULO: CONTAS A RECEBER / FIADO
   Ledger dedicado (contas_receber) — não sobrecarrega clientes.limite_fiado, que é
   um teto de crédito, não um saldo devedor. Uma linha por conta a receber, ligada
   opcionalmente à venda de origem (historico_vendas) e ao cliente (clientes).
   ================================================================================= */

window.filtroStatusContaReceber = "aberto";

/* =================================================================================
   1. CLIENTE (busca ou cria — não é um CRM completo, só o mínimo pro fiado)
   ================================================================================= */

window.encontrarOuCriarCliente = async function (nome, telefone) {
  if (telefone) {
    const { data } = await _supabase.from("clientes").select("id").eq("telefone", telefone).maybeSingle();
    if (data) return data.id;
  }
  const { data: novo, error } = await _supabase
    .from("clientes")
    .insert([{ nome: nome || null, telefone: telefone || null }])
    .select()
    .single();
  if (error) throw error;
  return novo.id;
};

/* =================================================================================
   2. REGISTRO A PARTIR DE UMA VENDA FIADO (chamado por vendas.js / comandas.js)
   ================================================================================= */

window.registrarContaReceber = async function ({ cliente_id, venda_id, valor, descricao, vencimento, cadastrado_por }) {
  const { error } = await _supabase.from("contas_receber").insert([{
    cliente_id: cliente_id || null,
    venda_id: venda_id || null,
    descricao: descricao || null,
    valor,
    valor_pago: 0,
    vencimento: vencimento || null,
    status: "aberto",
    cadastrado_por: cadastrado_por || localStorage.getItem("userName") || "Sistema",
  }]);
  if (error) throw error;

  if (typeof registrarLog === "function") {
    const vf = typeof window.formatarMoeda === "function" ? window.formatarMoeda(valor) : valor.toFixed(2);
    await registrarLog("FINANCEIRO", `REGISTROU FIADO: R$ ${vf}`);
  }
};

/* =================================================================================
   3. FILTRO E LISTAGEM
   ================================================================================= */

window.filtrarContasReceber = function (status) {
  window.filtroStatusContaReceber = status;

  const btnAberto = document.getElementById("btn-filtro-cr-aberto");
  const btnPago = document.getElementById("btn-filtro-cr-pago");
  const ativa = "bg-orange-500 text-white shadow-sm hover:bg-orange-600";
  const inativa = "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700";

  if (status === "aberto") {
    if (btnAberto) btnAberto.className = `flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${ativa}`;
    if (btnPago) btnPago.className = `flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${inativa}`;
  } else {
    const ativaVerde = ativa.split("orange").join("emerald");
    if (btnAberto) btnAberto.className = `flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${inativa}`;
    if (btnPago) btnPago.className = `flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${ativaVerde}`;
  }

  window.carregarContasReceber();
};

window.carregarContasReceber = async function () {
  const lista = document.getElementById("lista-contas-receber");
  if (!lista || typeof _supabase === "undefined") return;

  lista.innerHTML = '<p class="text-center text-[10px] font-black text-slate-400 uppercase animate-pulse py-8">Buscando contas...</p>';

  try {
    const { data, error } = await _supabase
      .from("contas_receber")
      .select("*, clientes(nome, telefone)")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const querPago = window.filtroStatusContaReceber === "pago";
    const filtradas = (data || []).filter((c) => (querPago ? c.status === "pago" : c.status !== "pago" && c.status !== "cancelado"));

    if (filtradas.length === 0) {
      lista.innerHTML = `
        <div class="text-center py-10 opacity-40">
            <div class="mb-3 flex justify-center"><i data-lucide="hand-coins" class="w-10 h-10" aria-hidden="true"></i></div>
            <p class="text-[10px] font-black uppercase text-slate-500">Nenhuma conta ${querPago ? "quitada" : "em aberto"} encontrada.</p>
        </div>`;
      if (typeof lucide !== "undefined") lucide.createIcons();
      return;
    }

    const formatM = typeof window.formatarMoeda === "function" ? window.formatarMoeda : (v) => parseFloat(v).toFixed(2);

    lista.innerHTML = filtradas.map((c) => {
      const saldoDevedor = parseFloat(c.valor) - parseFloat(c.valor_pago || 0);
      const badgeStatus = c.status === "parcial"
        ? '<span class="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded text-[8px] font-black uppercase border border-blue-200 dark:border-blue-800">Parcial</span>'
        : c.status === "pago"
          ? '<span class="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded text-[8px] font-black uppercase border border-emerald-200 dark:border-emerald-800">Quitada</span>'
          : '<span class="bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded text-[8px] font-black uppercase border border-orange-200 dark:border-orange-800">Em Aberto</span>';

      const nomeCliente = c.clientes?.nome || c.descricao || `Conta #${c.id}`;
      const vencStr = c.vencimento ? c.vencimento.split("-").reverse().join("/") : "";

      return `
        <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 flex flex-col gap-3 shadow-sm hover:shadow-md transition-all">
            <div class="flex justify-between items-start">
                <div class="flex-1 pr-2">
                    <h4 class="text-xs font-black text-slate-700 dark:text-slate-200 uppercase leading-tight">${nomeCliente}</h4>
                    ${c.clientes?.telefone ? `<p class="text-[9px] font-bold text-slate-400 uppercase mt-0.5">${c.clientes.telefone}</p>` : ""}
                    <div class="mt-2 flex items-center gap-2 flex-wrap">
                        ${vencStr ? `<span class="text-[9px] font-bold text-slate-500 uppercase">Venc: ${vencStr}</span>` : ""}
                        ${badgeStatus}
                    </div>
                </div>
                <div class="text-right">
                    <span class="text-sm font-black ${c.status === "pago" ? "text-emerald-500" : "text-[#e63946]"}">R$ ${formatM(saldoDevedor)}</span>
                    <p class="text-[8px] font-bold text-slate-400 uppercase mt-0.5">de R$ ${formatM(c.valor)}</p>
                </div>
            </div>

            <div class="flex flex-wrap gap-1 border-t border-slate-100 dark:border-slate-700 pt-3 mt-1">
                ${c.status !== "pago" ? `
                    <button onclick="window.abrirFormContaReceber(${c.id})" class="flex-[2] min-w-[95px] whitespace-nowrap bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 py-2 px-1 rounded-lg text-[8px] font-black uppercase active:scale-95 transition-all border border-emerald-200 dark:border-emerald-800 tracking-tighter flex items-center justify-center gap-1">
                        <i data-lucide="hand-coins" class="w-3 h-3" aria-hidden="true"></i> Receber
                    </button>
                ` : `
                    <button onclick="window.imprimirComprovanteContaReceber(${c.id})" class="flex-[2] min-w-[95px] whitespace-nowrap bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 py-2 px-1 rounded-lg text-[8px] font-black uppercase active:scale-95 transition-all border border-slate-200 dark:border-slate-600 shadow-sm flex items-center justify-center gap-1 tracking-tighter">
                        <i data-lucide="printer" class="w-3 h-3" aria-hidden="true"></i> Comprovante
                    </button>
                `}
                <button onclick="window.abrirFormContaReceber(${c.id})" aria-label="Editar conta" class="flex-1 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 py-2 rounded-lg text-[8px] font-black uppercase active:scale-95 transition-all border border-slate-200 dark:border-slate-600 shadow-sm flex items-center justify-center gap-1">
                    <i data-lucide="pencil" class="w-3 h-3" aria-hidden="true"></i> Editar
                </button>
                <button onclick="window.excluirContaReceber(${c.id})" aria-label="Excluir conta" class="flex-none w-9 bg-red-50 dark:bg-red-900/20 text-red-500 py-2 rounded-lg text-[9px] font-black uppercase active:scale-95 transition-all border border-red-100 dark:border-red-900/30 flex items-center justify-center">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5" aria-hidden="true"></i>
                </button>
            </div>
        </div>`;
    }).join("");

    if (typeof lucide !== "undefined") lucide.createIcons();
  } catch (e) {
    console.error("Erro ao listar contas a receber:", e);
    lista.innerHTML = '<p class="text-center text-xs font-bold text-red-500 py-10 uppercase">Erro de conexão com o banco.</p>';
  }
};

/* =================================================================================
   4. FORMULÁRIO (CRIAÇÃO MANUAL, EDIÇÃO E BAIXA)
   ================================================================================= */

window.abrirFormContaReceber = async function (id = null) {
  const fmtM = typeof window.formatarMoeda === "function" ? window.formatarMoeda : (v) => parseFloat(v).toFixed(2);

  ["cr-id", "cr-cliente-nome", "cr-cliente-telefone", "cr-descricao", "cr-vencimento"].forEach((campoId) => {
    const el = document.getElementById(campoId);
    if (el) el.value = "";
  });
  document.getElementById("cr-valor").value = "";
  document.getElementById("cr-valor-pago").value = fmtM(0);

  const titulo = document.getElementById("titulo-form-conta-receber");
  if (titulo) titulo.innerText = "NOVA CONTA A RECEBER";

  if (id) {
    if (titulo) titulo.innerText = "EDITAR CONTA A RECEBER";
    try {
      const { data, error } = await _supabase.from("contas_receber").select("*, clientes(nome, telefone)").eq("id", id).single();
      if (error) throw error;
      if (data) {
        document.getElementById("cr-id").value = data.id;
        document.getElementById("cr-cliente-nome").value = data.clientes?.nome || "";
        document.getElementById("cr-cliente-telefone").value = data.clientes?.telefone || "";
        document.getElementById("cr-descricao").value = data.descricao || "";
        document.getElementById("cr-valor").value = fmtM(data.valor);
        document.getElementById("cr-valor-pago").value = fmtM(data.valor_pago || 0);
        document.getElementById("cr-vencimento").value = data.vencimento || "";
      }
    } catch (e) {
      console.error("Erro ao carregar conta a receber para edição:", e);
    }
  }

  document.getElementById("view-lista-contas-receber")?.classList.add("hidden");
  document.getElementById("view-form-conta-receber")?.classList.remove("hidden");
};

window.fecharFormContaReceber = function () {
  document.getElementById("view-form-conta-receber")?.classList.add("hidden");
  document.getElementById("view-lista-contas-receber")?.classList.remove("hidden");
};

window.salvarContaReceber = async function () {
  const id = document.getElementById("cr-id").value;
  const nomeCliente = document.getElementById("cr-cliente-nome").value.trim().toUpperCase();
  const telefone = document.getElementById("cr-cliente-telefone").value.trim();
  const descricao = document.getElementById("cr-descricao").value.trim().toUpperCase();
  const vencimento = document.getElementById("cr-vencimento").value || null;

  const conv = typeof window.convMoedaFloat === "function"
    ? window.convMoedaFloat
    : (v) => parseFloat(String(v).replace(/\D/g, "")) / 100 || 0;

  const valor = conv(document.getElementById("cr-valor").value);
  const valorPago = conv(document.getElementById("cr-valor-pago").value);

  if (valor <= 0) {
    if (typeof showToast === "function") showToast("Informe o valor total da conta.", "erro");
    return;
  }
  if (!nomeCliente && !descricao) {
    if (typeof showToast === "function") showToast("Informe o nome do cliente ou uma descrição.", "erro");
    return;
  }

  const status = valorPago >= valor ? "pago" : valorPago > 0 ? "parcial" : "aberto";

  try {
    const clienteId = (nomeCliente || telefone) ? await window.encontrarOuCriarCliente(nomeCliente, telefone) : null;

    const dados = {
      cliente_id: clienteId,
      descricao: descricao || null,
      valor,
      valor_pago: valorPago,
      vencimento,
      status,
      data_pagamento: status === "pago" ? new Date().toISOString() : null,
    };

    if (id) {
      const { error } = await _supabase.from("contas_receber").update(dados).eq("id", id);
      if (error) throw error;
      if (typeof registrarLog === "function") await registrarLog("FINANCEIRO", `ATUALIZOU CONTA A RECEBER: ${nomeCliente || descricao}`);
    } else {
      dados.cadastrado_por = localStorage.getItem("userName") || "Sistema";
      const { error } = await _supabase.from("contas_receber").insert([dados]);
      if (error) throw error;
      if (typeof registrarLog === "function") await registrarLog("FINANCEIRO", `LANÇOU CONTA A RECEBER: ${nomeCliente || descricao}`);
    }

    if (typeof showToast === "function") showToast("Conta a receber salva!", "sucesso");
    window.fecharFormContaReceber();
    window.carregarContasReceber();
  } catch (e) {
    console.error("Erro ao salvar conta a receber:", e);
    if (typeof showToast === "function") showToast("Erro ao gravar no banco de dados.", "erro");
  }
};

window.excluirContaReceber = function (id) {
  const deletar = async () => {
    try {
      const { data: contaAntes } = await _supabase.from("contas_receber").select("descricao, valor, clientes(nome)").eq("id", id).maybeSingle();
      const { error } = await _supabase.from("contas_receber").delete().eq("id", id);
      if (error) throw error;
      if (typeof registrarLog === "function") {
        const rotulo = contaAntes?.clientes?.nome || contaAntes?.descricao || `ID ${id}`;
        await registrarLog("FINANCEIRO", "EXCLUIU CONTA A RECEBER", `${rotulo} | VALOR: R$ ${(contaAntes?.valor || 0).toFixed(2)}`);
      }
      if (typeof showToast === "function") showToast("Conta apagada.", "sucesso");
      window.carregarContasReceber();
    } catch (e) {
      console.error("Erro ao excluir conta a receber:", e);
    }
  };

  if (typeof confirmarAcao === "function") {
    confirmarAcao("Apagar permanentemente esta conta a receber?", deletar, "EXCLUIR");
  } else if (confirm("Apagar?")) {
    deletar();
  }
};

/* =================================================================================
   5. COMPROVANTE
   ================================================================================= */

window.imprimirComprovanteContaReceber = function (id) {
  const cfg = obterConfiguracoesImpressora();
  _supabase.from("contas_receber").select("*, clientes(nome, telefone)").eq("id", id).single().then(({ data: c }) => {
    if (!c) return;
    const fm = typeof window.formatarMoeda === "function" ? window.formatarMoeda : (v) => parseFloat(v).toFixed(2);
    const dPag = c.data_pagamento ? new Date(c.data_pagamento).toLocaleDateString("pt-BR") : "---";

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                @page { margin: 0; size: ${cfg.pageWidth} auto; }
                body { font-family: 'Courier New', monospace; width: ${cfg.bodyWidth}; margin: 0 auto; padding: 2mm 0; font-size: ${cfg.fontSizeBase}; line-height: 1.4; color: #000; }
                .c { text-align: center; }
                .b { font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="c b">${localStorage.getItem("nomeLoja") || "ESPETINHO & CIA"}</div>
            <div class="c">RECIBO DE QUITAÇÃO — CONTA A RECEBER</div>
            <hr style="border:0.5px dashed #000">
            <div><span class="b">CLIENTE:</span> ${c.clientes?.nome || c.descricao || "---"}</div>
            ${c.descricao ? `<div><span class="b">DESCRIÇÃO:</span> ${c.descricao}</div>` : ""}
            <div><span class="b">VALOR TOTAL:</span> R$ ${fm(c.valor)}</div>
            <div><span class="b">VALOR PAGO:</span> R$ ${fm(c.valor_pago)}</div>
            <div><span class="b">QUITADO EM:</span> ${dPag}</div>
            <hr style="border:0.5px dashed #000">
            <div class="c" style="font-size:8px">Espetinho & Cia</div>
            <div style="height: ${cfg.espacoGuilhotina};">.</div>
        </body>
        </html>
    `;

    window.imprimirConteudoIframe(html, `Recibo_ContaReceber_${id}`);
  });
};
