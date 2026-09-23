// ==========================================
// eventos-reservas.js — Gestão de reservas de mesa de um evento
// (aprovação, listagem, filtros/busca, badges de pendência)
// ==========================================

// ==========================================
// FILTROS E BUSCA EM TEMPO REAL
// ==========================================

window.filtrarReservas = function (status) {
  // Atualiza a variável global que guarda o filtro clicado
  window.filtroStatusAtual = status;
  window.aplicarFiltrosEBusca();
};

window.aplicarFiltrosEBusca = function () {
  // 1. Pega o texto digitado de forma segura
  const inputBusca = document.getElementById("input-busca-reserva");
  const termoBusca = inputBusca ? inputBusca.value.toLowerCase().trim() : "";

  // 2. Filtra a lista que está na memória local
  const reservasFiltradas = window.listaReservasLocal.filter((res) => {
    // --- Regra 1: Filtro de Botões (Todas / Pendentes / Confirmadas) ---
    // Força tudo para minúsculo para garantir que vai achar, independente de como está no banco
    const statusReserva = String(res.status || "").toLowerCase();
    const passaStatus =
      window.filtroStatusAtual === "todas" ||
      statusReserva === window.filtroStatusAtual;

    // --- Regra 2: Filtro de Busca por Texto ---
    // Usa o cliente_nome corretamente
    const nomeCliente = String(
      res.cliente_nome || res.nome || "",
    ).toLowerCase();
    const mesaStr = Array.isArray(res.mesas)
      ? res.mesas.join(", ")
      : String(res.mesas || "");

    // Verifica se o texto digitado bate com o nome ou com o número da mesa
    const passaBusca =
      termoBusca === "" ||
      nomeCliente.includes(termoBusca) ||
      mesaStr.includes(termoBusca);

    // A reserva só aparece na tela se passar nas duas regras
    return passaStatus && passaBusca;
  });

  // 3. Manda a lista já filtrada para desenhar na tela
  window.desenharCardsReservas(reservasFiltradas);
};

window.atualizarTodosOsBadges = async function () {
  try {
    // Busca todas as reservas pendentes de todos os eventos de uma vez
    const { data: reservas, error } = await _supabase
      .from("reservas_evento")
      .select("evento_id, status")
      .eq("status", "pendente");

    if (error) throw error;

    // Limpa todos os contadores primeiro (esconde todos)
    document
      .querySelectorAll('[id^="badge-pendencia-"]')
      .forEach((el) => el.classList.add("hidden"));

    // Preenche apenas os que possuem pendências
    reservas.forEach((res) => {
      const badge = document.getElementById(`badge-pendencia-${res.evento_id}`);
      if (badge) {
        // Incrementa o contador
        let atual = parseInt(badge.innerText) || 0;
        badge.innerText = atual + 1;
        badge.classList.remove("hidden");
      }
    });
  } catch (err) {
    console.error("Erro ao atualizar badges:", err);
  }
};

// ==========================================
// 3. GESTÃO DE RESERVAS (APROVAÇÃO E LISTAGEM)
// ==========================================
window.abrirGestaoReservas = function (id, nome) {
  window.eventoIdAtivo = id;
  document.getElementById("modal-reserva-evento-nome").innerText =
    `RESERVAS: ${nome}`;
  document.getElementById("modal-gestao-reservas").classList.remove("hidden");
  window.atualizarListaSolicitacoes();
};

window.fecharModalReservas = function () {
  window.eventoIdAtivo = null;
  document.getElementById("modal-gestao-reservas").classList.add("hidden");
};

// 1. A função que busca no Supabase e alimenta o sistema
window.atualizarListaSolicitacoes = async function () {
  const container = document.getElementById("lista-solicitacoes-reservas");
  if (container) {
    container.innerHTML =
      '<div class="text-center text-sm font-bold py-8 text-slate-400 italic animate-pulse">Carregando solicitações...</div>';
  }

  try {
    // Busca todas as reservas deste evento no banco
    const { data: reservas, error } = await _supabase
      .from("reservas_evento")
      .select("*")
      .eq("evento_id", window.eventoIdAtivo)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Guarda os dados na memória global para a busca ser instantânea
    window.listaReservasLocal = reservas || [];

    // Atualiza os valores de dinheiro e ocupação lá em cima
    if (window.atualizarDashboardFinanceiro) {
      window.atualizarDashboardFinanceiro(window.eventoIdAtivo);
    }

    // Aplica os filtros (que por padrão vai mostrar todas) e desenha na tela
    if (window.aplicarFiltrosEBusca) {
      window.aplicarFiltrosEBusca();
    }
  } catch (err) {
    console.error("Erro ao carregar reservas:", err);
    if (container) {
      container.innerHTML =
        '<div class="text-center text-red-500 font-bold py-8">Erro ao carregar reservas.</div>';
    }
  }
};

// 2. A função que desenha os cards na tela (chamada pela busca)
window.desenharCardsReservas = function (reservas) {
  const container = document.getElementById("lista-solicitacoes-reservas");
  if (!container) return;

  if (!reservas || reservas.length === 0) {
    container.innerHTML =
      '<div class="text-center text-sm font-bold py-8 text-slate-400 italic">Nenhuma reserva encontrada para este filtro.</div>';
    return;
  }

  container.innerHTML = reservas
    .map((res) => {
      const isConfirmada = res.status === "confirmada";

      // Cores fixas (sem dark:) para garantir modo claro sempre
      const statusClass = isConfirmada
        ? "bg-emerald-100 text-emerald-700"
        : "bg-amber-100 text-amber-700";

      const mesaStr = Array.isArray(res.mesas)
        ? res.mesas.join(", ")
        : String(res.mesas || "");

      const nomeCliente = res.cliente_nome || "SEM NOME";
      const telefoneCliente = res.cliente_telefone || "";
      const telefoneInfo = telefoneCliente
        ? `<p class="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase mt-1 truncate">WPP: ${telefoneCliente}</p>`
        : "";

      // --- AJUSTE APLICADO AQUI: Prepara os dados para o Modal ---
      const nomeEscapado = nomeCliente.replace(/'/g, "\\'");
      const arrayStringMap = JSON.stringify(res.mesas || []).replace(/"/g, "'");

      const botaoAprovar = !isConfirmada
        ? `
            <button onclick="window.abrirModalAcaoPendente('${res.id}', '${nomeEscapado}', ${arrayStringMap})" class="flex-1 sm:flex-none w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[9px] uppercase tracking-widest py-2.5 sm:py-2 px-1 rounded-lg shadow-sm transition-all active:scale-95 text-center">
                Aprovar
            </button>
        `
        : "";
      // -----------------------------------------------------------

      const botaoCancelar = `
            <button onclick="window.excluirReserva('${res.id}')" class="flex-1 sm:flex-none w-full bg-red-500 hover:bg-red-600 text-white font-black text-[9px] uppercase tracking-widest py-2.5 sm:py-2 px-1 rounded-lg shadow-sm transition-all active:scale-95 text-center">
                Cancelar
            </button>
        `;

      const botaoComprovante = res.comprovante_url
        ? `
            <button onclick="window.verComprovante('${res.comprovante_url}')" class="flex-1 sm:flex-none w-full bg-slate-100 text-slate-600 hover:bg-slate-200 font-black text-[9px] uppercase tracking-widest py-2.5 sm:py-2 px-1 rounded-lg transition-all text-center">
                Ver PIX
            </button>
        `
        : "";

      return `
        <div class="bg-white p-4 rounded-xl md:rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 md:gap-4 animate-fade-in shadow-sm hover:shadow-md transition-shadow">

            <div class="flex-1 min-w-0 w-full">
                <div class="flex items-center justify-between sm:justify-start gap-2 mb-1 flex-wrap">
                    <h5 class="font-black text-sm md:text-base text-slate-800 uppercase tracking-tight leading-none truncate" title="${nomeCliente}">${nomeCliente}</h5>
                    <span class="text-[8px] md:text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${statusClass} shrink-0">
                        ${res.status}
                    </span>
                </div>
                ${telefoneInfo}
                <div class="mt-2 md:mt-3 bg-slate-50 inline-block px-3 py-1.5 rounded-lg border border-slate-100">
                    <p class="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wide">Mesa(s): <span class="text-emerald-600 font-black text-sm md:text-base ml-1">${mesaStr}</span></p>
                </div>
                ${res.tipo ? `<p class="text-[8px] md:text-[9px] font-black text-indigo-500 uppercase mt-2 tracking-wider">${res.tipo}</p>` : ""}
            </div>

            <div class="flex flex-row sm:flex-col gap-2 w-full sm:w-[90px] border-t sm:border-t-0 sm:border-l border-slate-100 pt-3 sm:pt-0 sm:pl-3 mt-2 sm:mt-0 shrink-0">
                ${botaoAprovar}
                ${botaoCancelar}
                ${botaoComprovante}
            </div>

        </div>`;
    })
    .join("");
};

window.abrirComprovante = function (url) {
  document.getElementById("img-comprovante-preview").src = url;
  document.getElementById("modal-ver-comprovante").classList.remove("hidden");
};

window.fecharModalComprovante = function () {
  document.getElementById("modal-ver-comprovante").classList.add("hidden");
  document.getElementById("img-comprovante-preview").src = "";
};

// ==========================================
// 1. ATUALIZAÇÃO: SALVAR RESERVA MANUAL
// ==========================================
window.salvarReservaManual = async function (e) {
  e.preventDefault();
  if (!window.eventoIdAtivo) return;

  const btnClicado = e.target.closest ? e.target.closest('button') : null;
  const textoOriginal = btnClicado ? btnClicado.innerHTML : "Aguarde...";

  if (btnClicado) {
    btnClicado.disabled = true;
    btnClicado.innerHTML = '<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin inline" aria-hidden="true"></i> PROCESSANDO...';
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  try {
    const inputMesas = document.getElementById("rm-mesa").value;
    const listaMesas = inputMesas
      .split(",")
      .map((m) => m.trim())
      .filter((m) => m !== "" && !isNaN(parseInt(m))); 

    const nome = document.getElementById("rm-nome").value;
    const tipo = document.getElementById("rm-tipo").value;

    const campoStatus = document.getElementById("rm-status");
    const statusDesejado = campoStatus ? campoStatus.value : "confirmada";

    if (listaMesas.length === 0)
      throw new Error("Selecione pelo menos uma mesa no mapa.");


    // --- CORREÇÃO DEFINITIVA DO ERRO JSONB ---
    
    // 1. Busca todas as reservas apenas deste evento, SEM usar o .overlaps()
    const { data: reservasAtuais, error: errBusca } = await _supabase
      .from("reservas_evento")
      .select("mesas")
      .eq("evento_id", String(window.eventoIdAtivo));

    if (errBusca) throw errBusca;

    // 2. Junta todas as mesas que já estão ocupadas num único array do JavaScript
    let mesasJaOcupadas = [];
    if (reservasAtuais) {
      reservasAtuais.forEach(res => {
        if (Array.isArray(res.mesas)) {
          mesasJaOcupadas.push(...res.mesas.map(String)); // Converte tudo pra string
        } else if (res.mesas) {
          mesasJaOcupadas.push(String(res.mesas));
        }
      });
    }

    // 3. Verifica se o usuário está tentando pegar uma mesa que já está no array de ocupadas
    const temConflito = listaMesas.some(mesaEscolhida => mesasJaOcupadas.includes(String(mesaEscolhida)));

    if (temConflito) {
      throw new Error("Uma ou mais mesas selecionadas já estão reservadas!");
    }
    
    // -----------------------------------------


    // 4. Monta a nova reserva com o status correto
    const novaReserva = {
      evento_id: String(window.eventoIdAtivo),
      mesas: listaMesas,
      cliente_nome: `${nome} (${tipo})`,
      cliente_telefone: "MANUAL - ADMIN",
      status: statusDesejado, 
    };

    const { error } = await _supabase
      .from("reservas_evento")
      .insert([novaReserva]);

    if (error) throw error;

    if (typeof registrarLog === "function") {
      await registrarLog("SISTEMA", "CADASTROU RESERVA MANUAL", `EVENTO ID ${window.eventoIdAtivo} | ${novaReserva.cliente_nome} | MESA(S): ${listaMesas.join(", ")} | STATUS: ${statusDesejado.toUpperCase()}`);
    }

    if (window.showToast)
      window.showToast(`Reserva (${statusDesejado.toUpperCase()}) efetuada!`, "sucesso");

    // Limpa o formulário e o mapa
    document.getElementById("form-reserva-manual").reset();
    if (window.limparSelecao) window.limparSelecao();

    // Atualiza a lista na tela e o mapa
    if (typeof window.carregarReservasAdmin === 'function') window.carregarReservasAdmin();
    if (typeof window.carregarMapaEventos === 'function') window.carregarMapaEventos();

  } catch (error) {
    console.error(error);
    if (window.showToast) window.showToast(error.message, "erro");
  } finally {
    if (btnClicado) {
      btnClicado.disabled = false;
      btnClicado.innerHTML = textoOriginal;
    }
  }
};


// ==========================================
// 2. GERENCIAR PENDÊNCIAS
// ==========================================

// Função para abrir a telinha de aprovação com os dados corretos
window.abrirModalAcaoPendente = function(idReserva, nomeCliente, arrayMesas) {
    document.getElementById('acao-pendente-id').value = idReserva;
    document.getElementById('acao-pendente-nome').innerText = nomeCliente;

    // Formata o array visualmente: [10, 11] vira "10, 11"
    const stringMesas = Array.isArray(arrayMesas) ? arrayMesas.join(', ') : arrayMesas;
    document.getElementById('acao-pendente-mesas').innerText = `Mesas: ${stringMesas}`;

    document.getElementById('modal-acao-pendente').classList.remove('hidden');
};

// Disparada pelo botão Verde do modal de ação pendente
// (fluxo de aprovação canônico — substitui as duplicatas processarStatusReserva/aprovarReserva
// que existiam antes da reestruturação e não estavam mais ligadas a nenhum botão do HTML)
window.confirmarReservaPendente = async function() {
    const id = document.getElementById('acao-pendente-id').value;
    if(!id) return;

    try {
        const { error } = await _supabase
            .from('reservas_evento')
            .update({ status: 'confirmada' })
            .eq('id', id);

        if (error) throw error;

        if (typeof registrarLog === "function") {
            await registrarLog("FINANCEIRO", "CONFIRMOU PAGAMENTO DE RESERVA", `RESERVA ID ${id}`);
        }

        if(window.showToast) window.showToast("Pagamento confirmado com sucesso!", "sucesso");
        document.getElementById('modal-acao-pendente').classList.add('hidden');

        // ==========================================
        // LÓGICA DE ENVIO DO WHATSAPP
        // ==========================================
        const reserva = window.listaReservasLocal.find((r) => r.id === id);
        if (reserva && reserva.cliente_telefone && reserva.cliente_telefone !== "MANUAL - ADMIN") {
            let telefonePuro = String(reserva.cliente_telefone).replace(/\D/g, "");
            if (telefonePuro.length === 10 || telefonePuro.length === 11) {
                telefonePuro = "55" + telefonePuro;
            }
            const nomeCliente = reserva.cliente_nome || "Cliente";
            const mesaStr = Array.isArray(reserva.mesas) ? reserva.mesas.join(", ") : reserva.mesas;
            const mensagem = `Olá, *${nomeCliente}*! 🎉\n\nO seu pagamento foi recebido e a sua reserva para a(s) mesa(s) *${mesaStr}* foi *confirmada* com sucesso!\n\nAgradecemos a preferência e aguardamos você.`;

            const urlWhatsapp = `https://wa.me/${telefonePuro}?text=${encodeURIComponent(mensagem)}`;
            window.open(urlWhatsapp, "_blank");
        }
        // ==========================================

        // Recarrega os dados visuais
        if (typeof window.carregarReservasAdmin === 'function') window.carregarReservasAdmin();
        if (typeof window.carregarMapaEventos === 'function') window.carregarMapaEventos();
        if (typeof window.atualizarListaSolicitacoes === 'function') window.atualizarListaSolicitacoes();

    } catch(error) {
        console.error(error);
        if(window.showToast) window.showToast("Erro ao confirmar pagamento", "erro");
    }
};

// Disparada pelo botão Vermelho do modal de ação pendente
window.liberarReservaPendente = async function() {
    const id = document.getElementById('acao-pendente-id').value;
    if(!id) return;

    // Chamando o seu modal customizado no lugar do confirm() nativo
    const confirmado = await window.confirmarAcaoCustom(
        "Liberar Mesa",
        "Tem certeza que deseja cancelar essa reserva e liberar a mesa para venda?",
        true // Esse 'true' diz para o modal que é uma ação de perigo (botão vermelho)
    );

    // Se o usuário clicou em "Não", a função para aqui
    if(!confirmado) return;

    try {
        // Exclui a reserva do banco, liberando as mesas imediatamente
        const { error } = await _supabase
            .from('reservas_evento')
            .delete()
            .eq('id', id);

        if (error) throw error;

        if (typeof registrarLog === "function") {
            await registrarLog("SISTEMA", "LIBEROU RESERVA PENDENTE", `RESERVA ID ${id}`);
        }

        if(window.showToast) window.showToast("Reserva cancelada. Mesa livre!", "sucesso");
        document.getElementById('modal-acao-pendente').classList.add('hidden');

        // Recarrega os dados visuais
        if (typeof window.carregarReservasAdmin === 'function') window.carregarReservasAdmin();
        if (typeof window.carregarMapaEventos === 'function') window.carregarMapaEventos();
        if (typeof window.atualizarListaSolicitacoes === 'function') window.atualizarListaSolicitacoes();

    } catch(error) {
        console.error(error);
        if(window.showToast) window.showToast("Erro ao liberar mesa", "erro");
    }
};

window.cancelarReserva = async function (reservaId) {
  // Confirmação customizada para evitar erros
  const confirmado = await window.mostrarConfirmacaoCustom(
    "Cancelar Reserva",
    "Tem certeza que deseja cancelar esta reserva? A mesa voltará a ficar disponível para outros clientes.",
  );

  if (!confirmado) return;

  try {
    const { error } = await _supabase
      .from("reservas_evento")
      .delete()
      .eq("id", reservaId);
    if (error) throw error;

    if (typeof registrarLog === "function") {
      await registrarLog("SISTEMA", "CANCELOU RESERVA", `RESERVA ID ${reservaId}`);
    }

    if (window.showToast)
      window.showToast("Reserva cancelada com sucesso!", "sucesso");
    window.atualizarListaSolicitacoes(); // Recarrega a lista
  } catch (err) {
    console.error(err);
    if (window.showToast) window.showToast("Erro ao cancelar reserva.", "erro");
  }
};

window.excluirReserva = async function (reservaId) {
  // Chama o modal customizado (isPerigo = true, para ficar vermelho)
  const confirmado = await window.confirmarAcaoCustom(
    "Cancelar Reserva",
    "Deseja realmente cancelar e excluir esta reserva? As mesas serão liberadas.",
    true,
  );
  if (!confirmado) return;

  try {
    const { error } = await _supabase
      .from("reservas_evento")
      .delete()
      .eq("id", reservaId);

    if (error) throw error;

    if (typeof registrarLog === "function") {
      await registrarLog("SISTEMA", "EXCLUIU RESERVA", `RESERVA ID ${reservaId}`);
    }

    if (window.showToast)
      window.showToast("Reserva cancelada e mesas liberadas!", "sucesso");

    if (window.atualizarListaSolicitacoes) {
      window.atualizarListaSolicitacoes();
    }
  } catch (err) {
    console.error("Erro ao cancelar:", err);
    if (window.showToast) window.showToast("Erro ao cancelar reserva.", "erro");
  }
};

window.exportarParaCSV = function () {
  // Busca todos os elementos de reserva na tela (ou você pode buscar do Supabase novamente)
  // Aqui usaremos os dados que já estão na sua lista se ela estiver populada
  const reservasParaExportar = window.listaReservasAtuais || [];

  if (reservasParaExportar.length === 0) {
    if (window.showToast)
      window.showToast("Nenhuma reserva para exportar.", "aviso");
    return;
  }

  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "MESA,CLIENTE,TELEFONE,STATUS\n"; // Cabeçalho

  reservasParaExportar.forEach((res) => {
    const mesas = Array.isArray(res.mesas) ? res.mesas.join(";") : res.mesas;
    const linha = `${mesas},${res.cliente_nome},${res.cliente_telefone},${res.status}`;
    csvContent += linha + "\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "reservas_evento.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Função para exportar
window.exportarParaExcel = function () {
  const dados = window.listaReservasAtuais;
  if (!dados || dados.length === 0) {
    if (window.showToast) window.showToast("Nada para exportar.", "aviso");
    return;
  }

  // Criamos uma tabela HTML simples que o Excel interpreta como Planilha
  let html = `
        <table border="1">
            <tr style="background-color: #059669; color: #ffffff; font-weight: bold;">
                <th>MESA</th>
                <th>CLIENTE</th>
                <th>TELEFONE</th>
                <th>STATUS</th>
            </tr>`;

  dados.forEach((r) => {
    const mesas = Array.isArray(r.mesas) ? r.mesas.join(", ") : r.mesas;
    html += `
            <tr>
                <td>${mesas}</td>
                <td>${r.cliente_nome}</td>
                <td>${r.cliente_telefone}</td>
                <td>${r.status.toUpperCase()}</td>
            </tr>`;
  });

  html += `</table>`;

  // Cria o arquivo com extensão .xls
  const blob = new Blob([html], { type: "application/vnd.ms-excel" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "lista_reservas.xls";
  link.click();
};

window.verificarPendencias = function (reservas, eventoId = null) {
  // 1. Filtra as reservas que estão com status 'pendente'
  // Se um eventoId for fornecido, filtra apenas as pendências daquele evento
  const pendentes = eventoId
    ? reservas.filter(
        (r) =>
          r.status === "pendente" && String(r.evento_id) === String(eventoId),
      )
    : reservas.filter((r) => r.status === "pendente");

  // 2. Define o ID do badge no HTML:
  // Se for um card de evento, o ID será 'badge-pendencia-ID_DO_EVENTO'
  // Se for um badge geral no menu, o ID será apenas 'badge-pendencia'
  const badgeId = eventoId ? `badge-pendencia-${eventoId}` : "badge-pendencia";
  const badge = document.getElementById(badgeId);

  // 3. Atualiza o elemento visual
  if (badge) {
    badge.innerText = pendentes.length;

    // Se houver pendências, remove a classe 'hidden' para exibir o número
    // Se o contador for 0, adiciona 'hidden' para esconder o badge
    badge.classList.toggle("hidden", pendentes.length === 0);
  }
};
