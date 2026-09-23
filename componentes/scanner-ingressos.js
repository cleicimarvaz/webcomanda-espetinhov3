/* =================================================================================
   scanner-ingressos.js — Leitura de QR Code de ingressos pela câmera do celular.
   O QR só contém o codigo_unico; a validação é sempre feita consultando o Supabase
   na hora (nunca confia em dado embutido no próprio QR). Exige toque explícito
   ("Escanear Próximo") antes de liberar a leitura do ingresso seguinte.
   ================================================================================= */

let leitorQrIngresso = null;
let leituraEmProcessamento = false;

document.addEventListener("DOMContentLoaded", () => {
  if (typeof Html5Qrcode === "undefined") {
    console.error("Biblioteca html5-qrcode não carregada.");
    if (window.showToast) window.showToast("Erro ao carregar o leitor de QR Code.", "erro");
    return;
  }

  leitorQrIngresso = new Html5Qrcode("reader");
  leitorQrIngresso
    .start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      onLeituraQrSucesso,
      () => {},
    )
    .catch((err) => {
      console.error("Erro ao iniciar a câmera:", err);
      if (window.showToast) window.showToast("Não foi possível acessar a câmera. Verifique as permissões.", "erro");
    });
});

async function onLeituraQrSucesso(codigoDecodificado) {
  if (leituraEmProcessamento) return;
  leituraEmProcessamento = true;

  if (leitorQrIngresso) {
    try { await leitorQrIngresso.pause(true); } catch (e) { /* já pausado */ }
  }

  await validarIngressoEscaneado(codigoDecodificado.trim());
}

async function validarIngressoEscaneado(codigoUnico) {
  try {
    const { data: ingresso, error } = await _supabase
      .from("ingressos")
      .select("*, tipos_ingresso(nome), eventos(nome)")
      .eq("codigo_unico", codigoUnico)
      .maybeSingle();

    if (error) throw error;

    if (!ingresso) {
      exibirResultadoIngresso({ ok: false, titulo: "INGRESSO INVÁLIDO", subtitulo: "QR Code não encontrado no sistema" });
      return;
    }

    if (ingresso.status === "cancelado") {
      exibirResultadoIngresso({
        ok: false, titulo: "CANCELADO", subtitulo: "Este ingresso foi cancelado",
        ingresso,
      });
      return;
    }

    if (ingresso.status === "utilizado") {
      const horaUso = ingresso.data_utilizacao ? new Date(ingresso.data_utilizacao).toLocaleString("pt-BR") : "--";
      exibirResultadoIngresso({
        ok: false, titulo: "JÁ UTILIZADO", subtitulo: `Entrada já registrada em ${horaUso}`,
        ingresso,
      });
      return;
    }

    if (ingresso.status === "pendente") {
      exibirResultadoIngresso({
        ok: false, titulo: "PAGAMENTO PENDENTE", subtitulo: "Não confirmado — não libere a entrada",
        ingresso,
      });
      return;
    }

    if (ingresso.status !== "confirmado") {
      exibirResultadoIngresso({ ok: false, titulo: "INGRESSO INVÁLIDO", subtitulo: `Status desconhecido: ${ingresso.status}` });
      return;
    }

    // Status confirmado: libera a entrada e marca como utilizado
    const usuarioLogado = localStorage.getItem("userName") || "SISTEMA";
    const { error: erroUpdate } = await _supabase
      .from("ingressos")
      .update({ status: "utilizado", data_utilizacao: new Date().toISOString(), validado_por: usuarioLogado })
      .eq("id", ingresso.id)
      .eq("status", "confirmado");

    if (erroUpdate) throw erroUpdate;

    if (typeof registrarLog === "function") {
      await registrarLog("SEGURANÇA", "INGRESSO VALIDADO", `Entrada liberada para ${(ingresso.comprador_nome || "").toUpperCase()}`);
    }

    exibirResultadoIngresso({ ok: true, titulo: "ENTRADA LIBERADA", subtitulo: "Ingresso válido", ingresso });
  } catch (err) {
    console.error("Erro ao validar ingresso:", err);
    exibirResultadoIngresso({ ok: false, titulo: "ERRO NA VALIDAÇÃO", subtitulo: "Tente escanear novamente" });
  }
}

function exibirResultadoIngresso({ ok, titulo, subtitulo, ingresso }) {
  document.getElementById("container-leitor").classList.add("hidden");
  const container = document.getElementById("container-resultado");
  container.classList.remove("hidden");

  const painel = document.getElementById("painel-resultado");
  painel.className = `rounded-[2rem] p-6 text-center border-4 ${ok ? "bg-emerald-500/10 border-emerald-500" : "bg-red-500/10 border-red-500"}`;

  const icone = document.getElementById("icone-resultado");
  icone.setAttribute("data-lucide", ok ? "check-circle-2" : "x-circle");
  icone.className = `w-16 h-16 mx-auto mb-3 ${ok ? "text-emerald-400" : "text-red-400"}`;

  document.getElementById("titulo-resultado").innerText = titulo;
  document.getElementById("titulo-resultado").className = `text-2xl font-black uppercase tracking-tighter ${ok ? "text-emerald-400" : "text-red-400"}`;
  document.getElementById("subtitulo-resultado").innerText = subtitulo;

  const detalhes = document.getElementById("detalhes-resultado");
  if (ingresso) {
    detalhes.innerHTML = `
      <p class="text-sm font-black uppercase truncate">${ingresso.comprador_nome || "--"}</p>
      <p class="text-[10px] font-bold text-slate-300 uppercase">${ingresso.tipos_ingresso?.nome || "Ingresso"} • ${ingresso.eventos?.nome || ""}</p>
    `;
    detalhes.classList.remove("hidden");
  } else {
    detalhes.innerHTML = "";
    detalhes.classList.add("hidden");
  }

  if (typeof lucide !== "undefined") lucide.createIcons();
}

window.escanearProximoIngresso = async function () {
  document.getElementById("container-resultado").classList.add("hidden");
  document.getElementById("container-leitor").classList.remove("hidden");
  leituraEmProcessamento = false;

  if (leitorQrIngresso) {
    try { await leitorQrIngresso.resume(); } catch (e) {
      console.error("Erro ao retomar a câmera:", e);
    }
  }
};
