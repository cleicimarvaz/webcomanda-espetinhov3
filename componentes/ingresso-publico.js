/* =================================================================================
   ingresso-publico.js — Página pública de solicitação de ingressos (?evento=ID)
   Cliente escolhe tipo/quantidade, envia os dados e recebe o(s) QR Code(s) na hora.
   O pedido entra como status='pendente' — a confirmação de pagamento é manual,
   feita pelo colaborador no painel (mesmo padrão de aprovarReserva).
   ================================================================================= */

let eventoIdPublico = null;
let whatsappEventoPublico = null;
let tiposIngressoPublico = [];
let tipoSelecionadoPublico = null;
let quantidadeIngressoPublico = 1;

document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  eventoIdPublico = urlParams.get("evento");

  if (!eventoIdPublico) {
    document.getElementById("ev-nome").innerText = "Evento não encontrado.";
    if (window.showToast) window.showToast("Acesso inválido: evento não identificado.", "erro");
    return;
  }

  carregarEventoPublico();

  const form = document.getElementById("form-ingresso-publico");
  if (form) form.addEventListener("submit", enviarSolicitacaoIngresso);
});

// ==========================================
// 1. DADOS DO EVENTO E TIPOS DE INGRESSO
// ==========================================
async function carregarEventoPublico() {
  try {
    const { data, error } = await _supabase
      .from("eventos")
      .select("nome, data_evento, whatsapp_notificacao")
      .eq("id", eventoIdPublico)
      .single();

    if (error) throw error;

    document.getElementById("ev-nome").innerText = data.nome || "Evento";
    whatsappEventoPublico = data.whatsapp_notificacao || null;

    const evDataEl = document.getElementById("ev-data");
    if (data.data_evento && evDataEl) {
      evDataEl.innerText = new Date(data.data_evento).toLocaleDateString("pt-BR");
      evDataEl.style.display = "block";
    }

    await carregarTiposIngressoPublico();
  } catch (err) {
    console.error("Erro ao carregar evento:", err);
    document.getElementById("ev-nome").innerText = "Evento não encontrado.";
    if (window.showToast) window.showToast("Erro ao carregar dados do evento.", "erro");
  }
}

async function carregarTiposIngressoPublico() {
  try {
    const { data, error } = await _supabase
      .from("tipos_ingresso")
      .select("*")
      .eq("evento_id", eventoIdPublico)
      .eq("ativo", true)
      .order("created_at", { ascending: true });

    if (error) throw error;

    tiposIngressoPublico = data || [];

    if (tiposIngressoPublico.length === 0) {
      document.getElementById("container-sem-ingressos").classList.remove("hidden");
      if (typeof lucide !== "undefined") lucide.createIcons();
      return;
    }

    tipoSelecionadoPublico = tiposIngressoPublico[0].id;
    renderizarTiposIngressoPublico();
    document.getElementById("container-solicitacao").classList.remove("hidden");
    atualizarTotalIngressoPublico();
    if (typeof lucide !== "undefined") lucide.createIcons();
  } catch (err) {
    console.error("Erro ao carregar tipos de ingresso:", err);
    if (window.showToast) window.showToast("Erro ao carregar tipos de ingresso.", "erro");
    const semIngressos = document.getElementById("container-sem-ingressos");
    if (semIngressos) {
      semIngressos.querySelector("p").innerText = "Não foi possível carregar os ingressos deste evento. Tente novamente mais tarde.";
      semIngressos.classList.remove("hidden");
    }
    if (typeof lucide !== "undefined") lucide.createIcons();
  }
}

function renderizarTiposIngressoPublico() {
  const container = document.getElementById("lista-tipos-publico");
  if (!container) return;

  container.innerHTML = tiposIngressoPublico.map((t) => {
    const selecionado = t.id === tipoSelecionadoPublico;
    const esgotado = t.quantidade_total != null && (t.quantidade_vendida || 0) >= t.quantidade_total;
    return `
      <button type="button" ${esgotado ? "disabled" : ""} onclick="window.selecionarTipoIngressoPublico('${t.id}')"
        class="w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left ${
          esgotado
            ? "border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed"
            : selecionado
              ? "border-emerald-500 bg-emerald-50"
              : "border-slate-100 bg-white hover:border-emerald-200"
        }">
          <div>
              <p class="text-sm font-black text-slate-800 uppercase">${t.nome}</p>
              <p class="text-[10px] font-bold text-slate-400 uppercase">${esgotado ? "Esgotado" : "Disponível"}</p>
          </div>
          <span class="text-sm font-black ${selecionado ? "text-emerald-600" : "text-slate-700"}">R$ ${parseFloat(t.preco).toFixed(2).replace(".", ",")}</span>
      </button>`;
  }).join("");

  if (typeof lucide !== "undefined") lucide.createIcons();
}

window.selecionarTipoIngressoPublico = function (id) {
  tipoSelecionadoPublico = id;
  renderizarTiposIngressoPublico();
  atualizarTotalIngressoPublico();
};

// ==========================================
// 2. QUANTIDADE E TOTAL
// ==========================================
window.alterarQuantidadeIngresso = function (delta) {
  const nova = quantidadeIngressoPublico + delta;
  if (nova < 1 || nova > 10) return;
  quantidadeIngressoPublico = nova;
  document.getElementById("qtd-ingressos").innerText = String(quantidadeIngressoPublico);
  atualizarTotalIngressoPublico();
};

function atualizarTotalIngressoPublico() {
  const tipo = tiposIngressoPublico.find((t) => t.id === tipoSelecionadoPublico);
  const preco = tipo ? parseFloat(tipo.preco) : 0;
  const total = preco * quantidadeIngressoPublico;
  document.getElementById("valor-total-ingressos").innerText = total.toFixed(2).replace(".", ",");
}

// ==========================================
// 3. ENVIO DA SOLICITAÇÃO
// ==========================================
async function enviarSolicitacaoIngresso(e) {
  e.preventDefault();

  if (!tipoSelecionadoPublico) {
    if (window.showToast) window.showToast("Selecione um tipo de ingresso.", "erro");
    return;
  }

  const tipo = tiposIngressoPublico.find((t) => t.id === tipoSelecionadoPublico);
  if (!tipo) return;

  const nome = document.getElementById("cli-nome").value.trim();
  const telefone = document.getElementById("cli-tel").value.trim();

  const btn = document.getElementById("btn-enviar-ingresso");
  if (btn) { btn.disabled = true; btn.innerText = "ENVIANDO..."; }

  try {
    const linhas = Array.from({ length: quantidadeIngressoPublico }, () => ({
      evento_id: eventoIdPublico,
      tipo_ingresso_id: tipoSelecionadoPublico,
      comprador_nome: nome,
      comprador_telefone: telefone,
      canal_venda: "publico",
      valor_pago: parseFloat(tipo.preco),
      status: "pendente",
    }));

    const { data, error } = await _supabase.from("ingressos").insert(linhas).select();
    if (error) throw error;

    if (typeof registrarLog === "function") {
      await registrarLog("VENDA", "SOLICITAÇÃO PÚBLICA DE INGRESSO", `${nome} | ${quantidadeIngressoPublico}x ${tipo.nome} | EVENTO ID ${eventoIdPublico}`);
    }

    if (window.showToast) window.showToast("Solicitação enviada!", "sucesso");

    await exibirQRCodesGerados(data || [], tipo.nome);
    enviarNotificacaoWhatsAppIngresso(nome, tipo.nome, quantidadeIngressoPublico);

    document.getElementById("container-solicitacao").classList.add("hidden");
    document.getElementById("container-confirmacao").classList.remove("hidden");
  } catch (err) {
    console.error("Erro ao enviar solicitação de ingresso:", err);
    if (window.showToast) window.showToast("Erro ao enviar solicitação. Tente novamente.", "erro");
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i data-lucide="check-circle" class="w-5 h-5"></i> SOLICITAR INGRESSO'; if (typeof lucide !== "undefined") lucide.createIcons(); }
  }
}

async function exibirQRCodesGerados(ingressos, nomeTipo) {
  const container = document.getElementById("lista-qrcodes-gerados");
  if (!container) return;
  container.innerHTML = "";

  for (const ing of ingressos) {
    if (typeof QRCode === "undefined") continue;
    try {
      const qrDataUrl = await QRCode.toDataURL(ing.codigo_unico, { width: 200, margin: 1 });
      const card = document.createElement("div");
      card.className = "bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-100 text-center";
      card.innerHTML = `
          <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">${nomeTipo}</p>
          <img src="${qrDataUrl}" class="mx-auto rounded-lg" alt="QR Code do ingresso">
          <p class="text-[9px] font-bold text-slate-300 mt-3 break-all">${ing.codigo_unico}</p>
          <span class="inline-block mt-3 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-amber-100 text-amber-700">Aguardando confirmação</span>`;
      container.appendChild(card);
    } catch (err) {
      console.error("Erro ao gerar QR do ingresso:", err);
    }
  }
}

function enviarNotificacaoWhatsAppIngresso(nome, nomeTipo, quantidade) {
  const numeroDestino = (whatsappEventoPublico || "3398620041").replace(/\D/g, "");
  const numeroCompleto = numeroDestino.length <= 11 ? `55${numeroDestino}` : numeroDestino;
  const mensagem = `Olá! Me chamo *${nome}*. Acabei de solicitar *${quantidade}x ${nomeTipo}* para o evento pelo sistema.\n\nAguardo a confirmação do pagamento!`;
  window.open(`https://wa.me/${numeroCompleto}?text=${encodeURIComponent(mensagem)}`, "_blank");
}

window.reiniciarSolicitacaoIngresso = function () {
  document.getElementById("form-ingresso-publico")?.reset();
  quantidadeIngressoPublico = 1;
  document.getElementById("qtd-ingressos").innerText = "1";
  document.getElementById("container-confirmacao").classList.add("hidden");
  document.getElementById("container-solicitacao").classList.remove("hidden");
  atualizarTotalIngressoPublico();
};
