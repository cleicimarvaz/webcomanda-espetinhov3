// ==========================================
// MÓDULO ADMINISTRATIVO: GESTÃO DE EVENTOS
// eventos-core.js — Estado global, CRUD de evento, modais utilitários compartilhados
// ==========================================
// 1. Variáveis globais de controle para memória
window.listaReservasLocal = [];
window.filtroStatusAtual = "todas";
window.eventoIdAtivo = null;

document.addEventListener("DOMContentLoaded", () => {
  carregarEventosAdmin();
});

// ==========================================
// 1. CARREGAMENTO E LISTAGEM
// ==========================================
window.carregarEventosAdmin = async function () {
  try {
    const { data: eventos, error } = await _supabase
      .from("eventos")
      .select("*")
      .order("data_evento", { ascending: true });

    if (error) throw error;

    // Salva na variável global para o filtro usar depois
    window.listaEventosCompleta = eventos || [];

    // Chama o filtro para renderizar pela primeira vez
    window.filtrarEventos();
  } catch (error) {
    console.error("Erro ao carregar eventos:", error);
  }
};

// ==========================================
// FILTRO DE EVENTOS ATIVOS / TODOS
// ==========================================
window.filtrarEventos = function () {
  const checkboxAtivos = document.getElementById("filtro-ativos");
  const apenasAtivos = checkboxAtivos ? checkboxAtivos.checked : true;

  if (!window.listaEventosCompleta) return;

  // Filtra a lista baseada no status
  const eventosFiltrados = apenasAtivos
    ? window.listaEventosCompleta.filter((ev) => ev.status === "ativo")
    : window.listaEventosCompleta;

  // Envia a lista filtrada para o motor que desenha os cards na tela
  if (typeof window.renderizarCardsEventos === 'function') {
      window.renderizarCardsEventos(eventosFiltrados);
  } else {
      console.error("Função renderizarCardsEventos não encontrada!");
  }
};

// Este é o "motor" que desenha os cards na tela.
window.renderizarCardsEventos = function (eventos) {
  const container = document.getElementById("lista-eventos-admin");
  if (!container) {
    console.error("Elemento 'lista-eventos-admin' não encontrado no HTML!");
    return;
  }

  // Limpa o conteúdo atual
  container.innerHTML = "";

  if (!eventos || eventos.length === 0) {
    container.innerHTML =
      '<div class="col-span-full p-8 text-center text-slate-400 font-bold bg-white dark:bg-slate-900 rounded-[2rem] border border-dashed border-slate-300 dark:border-slate-700">Nenhum evento encontrado.</div>';
    return;
  }

  // Renderiza os novos cards
  container.innerHTML = eventos
    .map((ev) => {
      const dataFormatada = new Date(ev.data_evento).toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      });
      const valorFormatado = parseFloat(ev.valor_mesa).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });
      const nomeEscapado = ev.nome.replace(/'/g, "\\'");

      return `
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm flex flex-col justify-between">
                <div>
                    <div class="flex justify-between items-start mb-2">
                        <h4 class="font-black text-lg text-slate-800 dark:text-white uppercase tracking-tighter leading-tight">${ev.nome}</h4>
                        <span class="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${ev.status === "ativo" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}">
                            ${ev.status}
                        </span>
                    </div>
                    <p class="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><i data-lucide="calendar" class="w-3.5 h-3.5" aria-hidden="true"></i> ${dataFormatada}</p>
                    <p class="text-xs font-bold text-slate-500 mb-4 flex items-center gap-1"><i data-lucide="circle-dollar-sign" class="w-3.5 h-3.5" aria-hidden="true"></i> ${valorFormatado} / Mesa</p>
                </div>

                <div class="flex gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button onclick="window.abrirGestaoReservas('${ev.id}', '${nomeEscapado}')" class="btn-success relative flex-1">
                        Reservas
                        <span id="badge-pendencia-${ev.id}" class="hidden absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full animate-bounce">0</span>
                    </button>
                    <button onclick="window.abrirGerenciamentoEvento('${ev.id}', '${nomeEscapado}')" class="btn-neutral flex-1 flex items-center justify-center gap-1"><i data-lucide="settings" class="w-3.5 h-3.5" aria-hidden="true"></i> Gerenciar</button>
                </div>
                <div class="mt-3">
                    <button onclick="window.copiarLinkEvento('${ev.id}')" class="btn-info w-full flex items-center justify-center gap-1"><i data-lucide="link" class="w-3.5 h-3.5" aria-hidden="true"></i> Copiar Link Público</button>
                </div>
            </div>`;
    })
    .join("");
  if (typeof lucide !== 'undefined') lucide.createIcons();

  // Dispara a atualização dos badges após renderizar
  if (typeof window.atualizarTodosOsBadges === "function") {
    window.atualizarTodosOsBadges();
  }
};


// Quando carregar a página inicialmente:
// 1. Busque do Supabase
// 2. Salve: window.listaEventosCompleta = dadosDoSupabase;
// 3. Chame: window.filtrarEventos();

window.copiarLinkEvento = function (id) {
  // 1. Pega o caminho atual da URL (ex: /projeto-espetinhoecia/painel.html)
  const pathParts = window.location.pathname.split("/");

  // 2. Remove o nome do arquivo atual para ficar apenas com a pasta
  pathParts.pop();

  // 3. Reconstrói o caminho completo da base + o arquivo correto
  const baseUrl =
    window.location.origin + pathParts.join("/") + "/reserva.html";

  const link = `${baseUrl}?e=${id}`;

  // 4. Copia para o clipboard
  navigator.clipboard.writeText(link).then(() => {
    if (window.showToast)
      window.showToast("Link copiado para a área de transferência!", "sucesso");
    else alert("Link copiado!");
  });
};

// ==========================================
// 2. CRIAÇÃO DE NOVO EVENTO E CONTROLE DO MODAL
// ==========================================

window.abrirModalNovoEvento = function () {
  const modal = document.getElementById("modal-novo-evento");
  modal.classList.remove("hidden");
  modal.classList.add("flex"); // Correção do Bug de alinhamento
};

window.fecharModalNovoEvento = function () {
  const modal = document.getElementById("modal-novo-evento");
  modal.classList.add("hidden");
  modal.classList.remove("flex"); // Correção do Bug de alinhamento
  document.getElementById("form-novo-evento").reset();
};

window.salvarNovoEvento = async function (e) {
  e.preventDefault();
  const btn = document.getElementById("btn-salvar-evento");
  btn.disabled = true;
  btn.innerText = "CRIANDO...";

  try {
    const valorTexto = document.getElementById("ev-valor").value;
    const valorNumerico = parseFloat(
      valorTexto.replace("R$", "").replace(/\./g, "").replace(",", ".").trim(),
    );

    if (isNaN(valorNumerico)) throw new Error("Valor da mesa inválido.");

    // --- CORREÇÃO DE FUSO HORÁRIO PARA NOVO EVENTO ---
    const dataOriginal = document.getElementById("ev-data").value;
    let dataParaBanco = "";
    if (dataOriginal) {
        const [dataParte, horaParte] = dataOriginal.split("T");
        const [ano, mes, dia] = dataParte.split("-");
        const [hora, minuto] = horaParte.split(":");
        // Força o navegador a criar a data no fuso local do computador
        const dataLocal = new Date(ano, mes - 1, dia, hora, minuto);
        dataParaBanco = dataLocal.toISOString(); // Prepara no formato perfeito pro Supabase
    }
    // -------------------------------------------------

    let mapaUrl = null;
    const fileInput = document.getElementById("ev-mapa");

    if (fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const path = `mapas/${Date.now()}_${file.name}`;
      const { error: uploadError } = await _supabase.storage
        .from("eventos")
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { data } = _supabase.storage.from("eventos").getPublicUrl(path);
      mapaUrl = data.publicUrl;
    }

    const novoEvento = {
      nome: document.getElementById("ev-nome").value,
      data_evento: dataParaBanco, // <-- Envia a data corrigida
      valor_mesa: valorNumerico,
      quantidade_mesas: parseInt(document.getElementById("ev-qtd-mesas").value),
      mapa_url: mapaUrl,
      status: "ativo",
    };

    const { error } = await _supabase.from("eventos").insert([novoEvento]);
    if (error) throw error;

    if (typeof registrarLog === "function") {
      await registrarLog("SISTEMA", "CRIOU EVENTO", `${novoEvento.nome} | DATA: ${novoEvento.data_evento} | ${novoEvento.quantidade_mesas} MESA(S)`);
    }

    if (window.showToast)
      window.showToast("Evento criado com sucesso!", "sucesso");

    document.getElementById("form-novo-evento").reset();
    window.fecharModalNovoEvento();
    window.carregarEventosAdmin();
  } catch (error) {
    console.error("Erro ao criar evento:", error);
    if (window.showToast) window.showToast("Erro: " + error.message, "erro");
  } finally {
    btn.disabled = false;
    btn.innerText = "CRIAR EVENTO";
  }
};

// ==========================================
// 4. GERENCIAMENTO DO EVENTO
// ==========================================
window.abrirGerenciamentoEvento = async function (id, nome) {
  window.eventoIdAtivo = id;
  window.nomeEventoAtivo = nome;

  // --- INJETA O ID NO CAMPO OCULTO DO MODAL ---
  const inputId = document.getElementById("rm-evento-id");
  if (inputId) inputId.value = id;

  document.getElementById("gerenciar-nome-evento").innerText = `GERENCIAR: ${nome}`;

  // Busca do DB: incluí "nome", "valor_mesa" e "data_evento" para a edição
  const { data: evento, error } = await _supabase
    .from("eventos")
    .select("nome, valor_mesa, data_evento, quantidade_mesas, whatsapp_notificacao, patrocinadores")
    .eq("id", id)
    .single();

  if (!error && evento) {
    // ---- Preenche os novos campos de EDIÇÃO ----
    const inputNome = document.getElementById("input-editar-nome");
    if (inputNome) inputNome.value = evento.nome || nome;

    const inputValor = document.getElementById("input-editar-valor");
    if (inputValor) {
        const v = parseFloat(evento.valor_mesa || 0).toFixed(2).replace(".", ",");
        inputValor.value = `R$ ${v}`;
    }

    const inputData = document.getElementById("input-editar-data");
    if (inputData && evento.data_evento) {
        // Formata a data do banco (ISO) para o formato exigido pelo input datetime-local (YYYY-MM-DDTHH:mm)
        const dataObj = new Date(evento.data_evento);
        const ano = dataObj.getFullYear();
        const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
        const dia = String(dataObj.getDate()).padStart(2, '0');
        const horas = String(dataObj.getHours()).padStart(2, '0');
        const minutos = String(dataObj.getMinutes()).padStart(2, '0');
        inputData.value = `${ano}-${mes}-${dia}T${horas}:${minutos}`;
    }
    // --------------------------------------------

    document.getElementById("input-capacidade-mesas").value = evento.quantidade_mesas || 0;

    const inputWhats = document.getElementById("input-editar-whatsapp");
    if(inputWhats) inputWhats.value = evento.whatsapp_notificacao || '';

    const patInput = document.getElementById("lista-patrocinadores-input");
    if (patInput) {
      let valor = evento.patrocinadores || "";
      if (valor.startsWith("[")) {
        try {
          const lista = JSON.parse(valor);
          valor = lista.map((item) => item.nome).join("\n");
        } catch (e) {
          console.error("Erro ao converter JSON", e);
        }
      }
      patInput.value = valor;
      window.patrocinadoresEventoAtivo = valor
        .split("\n")
        .filter((n) => n.trim() !== "")
        .map((n) => ({ nome: n }));
    }
  }
  
  const modal = document.getElementById("modal-gerenciar-evento");
  modal.classList.remove("hidden");
  modal.classList.add("flex"); // Correção do Bug de alinhamento
};

// ==========================================
// FUNÇÃO DE SALVAR EDIÇÃO DE NOME, VALOR E DATA
// ==========================================
window.salvarEdicaoBasicaEvento = async function() {
  if (!window.eventoIdAtivo) return;

  const inputNome = document.getElementById("input-editar-nome");
  const inputValor = document.getElementById("input-editar-valor");
  const inputData = document.getElementById("input-editar-data");

  const nome = inputNome ? inputNome.value.trim().toUpperCase() : "";
  const valorTexto = inputValor ? inputValor.value : "0";
  const valorNumerico = parseFloat(valorTexto.replace("R$", "").replace(/\./g, "").replace(",", ".").trim());
  const dataEvento = inputData ? inputData.value : "";

  if (!nome) {
      if (window.showToast) window.showToast("O nome não pode ficar vazio.", "erro");
      return;
  }
  if (isNaN(valorNumerico)) {
      if (window.showToast) window.showToast("Valor da mesa inválido.", "erro");
      return;
  }
  if (!dataEvento) {
      if (window.showToast) window.showToast("A data e hora não podem ficar vazias.", "erro");
      return;
  }

  // --- CORREÇÃO DE FUSO HORÁRIO PARA EDIÇÃO ---
  let dataParaBanco = "";
  const [dataParte, horaParte] = dataEvento.split("T");
  const [ano, mes, dia] = dataParte.split("-");
  const [hora, minuto] = horaParte.split(":");
  const dataLocal = new Date(ano, mes - 1, dia, hora, minuto);
  dataParaBanco = dataLocal.toISOString();
  // --------------------------------------------

  try {
      const { error } = await _supabase
          .from("eventos")
          .update({ 
              nome: nome, 
              valor_mesa: valorNumerico,
              data_evento: dataParaBanco // <-- Envia a data corrigida
          })
          .eq("id", window.eventoIdAtivo);

      if (error) throw error;

      if (typeof registrarLog === "function") {
          await registrarLog("SISTEMA", "EDITOU EVENTO", `EVENTO ID ${window.eventoIdAtivo} | NOME: ${nome} | VALOR: ${valorNumerico}`);
      }

      if (window.showToast) window.showToast("Dados do evento atualizados!", "sucesso");

      // Atualiza a tela sem recarregar tudo
      document.getElementById("gerenciar-nome-evento").innerText = `GERENCIAR: ${nome}`;
      window.nomeEventoAtivo = nome;
      window.carregarEventosAdmin();
  } catch (err) {
      console.error(err);
      if (window.showToast) window.showToast("Erro ao atualizar dados.", "erro");
  }
};

window.salvarNovaCapacidade = async function () {
  const novoTotal = parseInt(
    document.getElementById("input-capacidade-mesas").value,
  );
  const eventoId = window.eventoIdAtivo;

  if (isNaN(novoTotal) || novoTotal < 0) {
    if (window.showToast)
      window.showToast("Digite uma quantidade válida.", "erro");
    return;
  }

  try {
    // Trava de Segurança: Verifica qual a maior mesa reservada atualmente
    const { data: reservas, error: errRes } = await _supabase
      .from("reservas_evento")
      .select("mesas")
      .eq("evento_id", eventoId);

    if (errRes) throw errRes;

    let mesasOcupadas = [];
    reservas.forEach((r) => {
      if (Array.isArray(r.mesas)) mesasOcupadas.push(...r.mesas);
      else if (r.mesas) mesasOcupadas.push(parseInt(r.mesas));
    });

    const maiorMesaOcupada =
      mesasOcupadas.length > 0 ? Math.max(...mesasOcupadas) : 0;

    if (novoTotal < maiorMesaOcupada) {
      alert(
        `Atenção: Você já tem reservas até a mesa ${maiorMesaOcupada}. Não é possível reduzir para ${novoTotal} mesas.`,
      );
      return;
    }

    // Atualiza no banco
    const { error } = await _supabase
      .from("eventos")
      .update({ quantidade_mesas: novoTotal })
      .eq("id", eventoId);

    if (error) throw error;

    if (typeof registrarLog === "function") {
      await registrarLog("SISTEMA", "ALTEROU CAPACIDADE DE MESAS", `EVENTO ID ${eventoId} | NOVO TOTAL: ${novoTotal}`);
    }

    if (window.showToast) window.showToast("Capacidade atualizada!", "sucesso");
  } catch (err) {
    console.error(err);
    if (window.showToast) window.showToast("Erro ao salvar.", "erro");
  }
};

window.fecharGerenciamentoEvento = function () {
  window.eventoIdAtivo = null;
  const modal = document.getElementById("modal-gerenciar-evento");
  modal.classList.add("hidden");
  modal.classList.remove("flex"); // Correção do Bug de alinhamento
};

window.alterarStatusEvento = async function (novoStatus) {
  if (!window.eventoIdAtivo) return;

  const confirmado = await window.mostrarConfirmacaoCustom(
    "Alterar Status",
    `Deseja alterar o status do evento para ${novoStatus.toUpperCase()}?`,
  );

  if (!confirmado) return;

  try {
    const { error } = await _supabase
      .from("eventos")
      .update({ status: novoStatus })
      .eq("id", window.eventoIdAtivo);
    if (error) throw error;

    if (typeof registrarLog === "function") {
      await registrarLog("SISTEMA", "ALTEROU STATUS DE EVENTO", `EVENTO ID ${window.eventoIdAtivo} | NOVO STATUS: ${novoStatus.toUpperCase()}`);
    }

    if (window.showToast)
      window.showToast(`Evento atualizado para ${novoStatus}!`, "sucesso");
    window.carregarEventosAdmin();
    window.fecharGerenciamentoEvento();
  } catch (err) {
    console.error(err);
    if (window.showToast) window.showToast("Erro ao alterar status.", "erro");
  }
};

window.atualizarMapaEvento = async function () {
  if (!window.eventoIdAtivo) return;

  const fileInput = document.getElementById("ev-update-mapa");
  if (fileInput.files.length === 0) {
    if (window.showToast)
      window.showToast("Selecione uma imagem primeiro.", "aviso");
    return;
  }

  try {
    const file = fileInput.files[0];
    const path = `mapas/${Date.now()}_${file.name}`;

    const { error: uploadError } = await _supabase.storage
      .from("eventos")
      .upload(path, file);
    if (uploadError) throw uploadError;

    const { data } = _supabase.storage.from("eventos").getPublicUrl(path);

    const { error: dbError } = await _supabase
      .from("eventos")
      .update({ mapa_url: data.publicUrl })
      .eq("id", window.eventoIdAtivo);
    if (dbError) throw dbError;

    if (window.showToast)
      window.showToast("Mapa atualizado com sucesso!", "sucesso");
    fileInput.value = "";
  } catch (err) {
    console.error(err);
    if (window.showToast) window.showToast("Erro ao atualizar o mapa.", "erro");
  }
};

window.excluirEvento = async function () {
  if (!window.eventoIdAtivo) return;

  // Aciona a nova função de Prompt Customizado
  const confirmado = await window.mostrarPromptCustom(
    "Excluir Evento",
    "Esta ação apagará o evento e todas as reservas vinculadas. Digite EXCLUIR abaixo para confirmar.",
    "EXCLUIR",
  );

  if (!confirmado) {
    if (window.showToast) window.showToast("Exclusão cancelada.", "aviso");
    return;
  }

  try {
    await _supabase
      .from("reservas_evento")
      .delete()
      .eq("evento_id", window.eventoIdAtivo);

    const { error } = await _supabase
      .from("eventos")
      .delete()
      .eq("id", window.eventoIdAtivo);
    if (error) throw error;

    if (typeof registrarLog === "function") {
      await registrarLog("SEGURANÇA", "EXCLUIU EVENTO", `${window.nomeEventoAtivo || `ID ${window.eventoIdAtivo}`} (INCLUINDO RESERVAS VINCULADAS)`);
    }

    if (window.showToast)
      window.showToast("Evento excluído permanentemente.", "sucesso");
    window.carregarEventosAdmin();
    window.fecharGerenciamentoEvento();
  } catch (err) {
    console.error(err);
    if (window.showToast) window.showToast("Erro ao excluir o evento.", "erro");
  }
};

// ==========================================
// FUNÇÕES UTILITÁRIAS DE MODAIS CUSTOMIZADOS
// (usadas por todos os módulos de eventos)
// ==========================================

window.mostrarConfirmacaoCustom = function (titulo, mensagem) {
  return new Promise((resolve) => {
    const modal = document.getElementById("modal-confirmacao-custom");
    const txtTitulo = document.getElementById("confirm-titulo");
    const txtMensagem = document.getElementById("confirm-mensagem");
    const btnSim = document.getElementById("btn-confirm-sim");
    const btnCancelar = document.getElementById("btn-confirm-cancelar");

    txtTitulo.innerText = titulo.toUpperCase();
    txtMensagem.innerText = mensagem;

    modal.classList.remove("hidden");
    modal.classList.add("flex"); // Correção do Bug de alinhamento

    btnSim.onclick = () => {
      modal.classList.add("hidden");
      modal.classList.remove("flex"); // Correção do Bug de alinhamento
      resolve(true);
    };

    btnCancelar.onclick = () => {
      modal.classList.add("hidden");
      modal.classList.remove("flex"); // Correção do Bug de alinhamento
      resolve(false);
    };
  });
};

window.mostrarPromptCustom = function (titulo, mensagem, palavraChave) {
  return new Promise((resolve) => {
    // Usando os IDs exatos que estão no seu eventos.html
    const modal = document.getElementById("modal-confirmacao-custom");
    const txtTitulo = document.getElementById("confirm-titulo");
    const txtMensagem = document.getElementById("confirm-mensagem");
    const input = document.getElementById("input-confirm-nome");
    const btnSim = document.getElementById("btn-confirm-sim");
    const btnCancelar = document.getElementById("btn-confirm-cancelar");

    // Preenche os textos
    txtTitulo.innerText = titulo.toUpperCase();
    txtMensagem.innerText = mensagem;
    
    // Configura e mostra o input
    input.value = "";
    input.placeholder = `Digite ${palavraChave}`;
    input.classList.remove("hidden"); // Garante que o input apareça para o usuário digitar

    // Mostra o modal
    modal.classList.remove("hidden");
    modal.classList.add("flex"); // Correção do Bug de alinhamento
    input.focus();

    btnSim.onclick = () => {
      if (input.value === palavraChave) {
        modal.classList.add("hidden");
        modal.classList.remove("flex"); // Correção do Bug de alinhamento
        input.classList.add("hidden"); // Esconde o input de novo para não bugar outros modais
        resolve(true);
      } else {
        if (window.showToast)
          window.showToast(
            `Digite ${palavraChave} exatamente como solicitado.`,
            "erro"
          );
      }
    };

    btnCancelar.onclick = () => {
      modal.classList.add("hidden");
      modal.classList.remove("flex"); // Correção do Bug de alinhamento
      input.classList.add("hidden"); // Esconde o input de novo
      resolve(false);
    };
  });
};

// ==========================================
// FUNÇÃO DO MODAL DE CONFIRMAÇÃO CUSTOMIZADO (com input opcional)
// ==========================================
window.confirmarAcaoCustom = function (
  titulo,
  mensagem,
  isPerigo = false,
  solicitarNome = false,
) {
  return new Promise((resolve) => {
    const modal = document.getElementById("modal-confirmacao-custom");
    const tituloEl = document.getElementById("confirm-titulo");
    const mensagemEl = document.getElementById("confirm-mensagem");
    const inputNome = document.getElementById("input-confirm-nome"); // O novo campo que adicionamos no HTML
    const btnSim = document.getElementById("btn-confirm-sim");
    const btnNao = document.getElementById("btn-confirm-cancelar");

    // Preenche os textos
    tituloEl.innerText = titulo;
    mensagemEl.innerText = mensagem;

    // Gerencia o campo de input
    if (solicitarNome) {
      inputNome.classList.remove("hidden");
      inputNome.value = ""; // Limpa qualquer texto anterior
    } else {
      inputNome.classList.add("hidden");
    }

    // Muda a cor do botão de confirmação
    if (isPerigo) {
      btnSim.className =
        "w-2/3 bg-red-500 hover:bg-red-600 text-white font-black py-3 rounded-xl text-[10px] uppercase tracking-widest shadow-lg shadow-red-500/30 transition-all active:scale-95";
    } else {
      btnSim.className =
        "w-2/3 bg-emerald-500 hover:bg-emerald-600 text-white font-black py-3 rounded-xl text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/30 transition-all active:scale-95";
    }

    // Mostra o modal
    modal.classList.remove("hidden");
    modal.classList.add("flex"); // Correção do Bug de alinhamento

    // Função para limpar e resolver
    const fecharEResolver = (resultado) => {
      const valorRetorno =
        resultado && solicitarNome ? inputNome.value : resultado;

      btnSim.onclick = null;
      btnNao.onclick = null;
      modal.classList.add("hidden");
      modal.classList.remove("flex"); // Correção do Bug de alinhamento
      resolve(valorRetorno);
    };

    btnSim.onclick = () => fecharEResolver(true);
    btnNao.onclick = () => fecharEResolver(false);
  });
};

window.salvarWhatsAppNotificacaoEdicao = async function () {
  if (!window.eventoIdAtivo) return;

  const input = document.getElementById("input-editar-whatsapp");
  let numeroLimpo = input.value.replace(/\D/g, "");

  // Se o usuário digitou sem o 55, a lógica abaixo garante que salve certo
  // Se o número tiver 11 ou 12 dígitos, ele assume que é um celular com DDD
  if (numeroLimpo.length >= 10 && numeroLimpo.length <= 11) {
    numeroLimpo = "55" + numeroLimpo;
  }

  try {
    const { error } = await _supabase
      .from("eventos")
      .update({ whatsapp_notificacao: numeroLimpo })
      .eq("id", String(window.eventoIdAtivo));

    if (error) throw error;

    if (typeof registrarLog === "function") {
      await registrarLog("SISTEMA", "ALTEROU WHATSAPP DE NOTIFICAÇÃO DO EVENTO", `EVENTO ID ${window.eventoIdAtivo} | NÚMERO: ${numeroLimpo}`);
    }

    window.whatsappNotificacaoAtivo = numeroLimpo;
    if (window.showToast) window.showToast("WhatsApp atualizado!", "sucesso");
  } catch (error) {
    if (window.showToast) window.showToast("Erro ao salvar.", "erro");
  }
};

window.mascaraTelefone = function (input) {
  let valor = input.value.replace(/\D/g, "");
  valor = valor.replace(/^(\d{2})(\d)/g, "($1) $2");
  valor = valor.replace(/(\d{5})(\d)/, "$1-$2");
  input.value = valor.substring(0, 15);
};

window.formatarTelefone = function (value) {
  if (!value) return "";
  let v = value.replace(/\D/g, "");

  // Se começar com 55, removemos para formatar apenas o número nacional
  if (v.startsWith("55")) {
    v = v.substring(2);
  }

  if (v.length > 9) {
    return `(${v.substring(0, 2)}) ${v.substring(2, 7)}-${v.substring(7)}`;
  } else if (v.length > 2) {
    return `(${v.substring(0, 2)}) ${v.substring(2)}`;
  } else if (v.length > 0) {
    return `(${v}`;
  }
  return v;
};

window.carregarWhatsAppNoModal = async function () {
  if (!window.eventoIdAtivo) return;

  try {
    const { data: evento, error } = await _supabase
      .from("eventos")
      .select("whatsapp_notificacao")
      .eq("id", String(window.eventoIdAtivo))
      .single();

    if (error) throw error;

    // Preenche o input se o dado existir
    const input = document.getElementById("input-editar-whatsapp");
    if (input && evento && evento.whatsapp_notificacao) {
      // Removemos o '55' apenas para exibir formatado no input (se desejar)
      // ou deixamos o número completo.
      input.value = evento.whatsapp_notificacao;
    }
  } catch (error) {
    console.error("Erro ao carregar WhatsApp para edição:", error);
  }
};

// =========================================================================
// COMPRESSOR DE IMAGEM PARA O MAPA DO EVENTO - ATUALIZADO PARA RETORNAR BLOB
// =========================================================================
window.comprimirImagemMapa = function(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;

            img.onload = () => {
                const canvas = document.createElement('canvas');
                // Trava o tamanho máximo para 1200px (excelente para mapas, leve para o banco)
                const MAX_WIDTH = 1200;
                const MAX_HEIGHT = 1200;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                } else {
                    if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Converter para BLOB em vez de Base64 (Otimizado pro Storage do Supabase)
                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/jpeg', 0.7);
            };
            img.onerror = error => reject(error);
        };
        reader.onerror = error => reject(error);
    });
};

window.salvarEvento = async function(event) {
    if (event) event.preventDefault();

    // Captura os dados do HTML (verifique se os IDs batem com seu formulário)
    // Aqui assumi ev-id para edição, e ev-nome para o título. Ajuste se necessário!
    const idInput = document.getElementById('ev-id');
    const idEvento = idInput ? idInput.value : null;

    const inputNome = document.getElementById('ev-nome');
    const nome = inputNome ? inputNome.value.trim().toUpperCase() : 'NOVO EVENTO';

    if (!nome) {
        if (typeof showToast === 'function') showToast("Dê um nome ao evento!", "erro");
        return;
    }

    // Trava o botão para não enviar duas vezes
    const btnSalvar = document.getElementById('btn-salvar-evento');
    if (btnSalvar) btnSalvar.disabled = true;

    try {
        // --- MÁGICA DA IMAGEM: AGORA USANDO SUPABASE STORAGE ---
        const inputMapa = document.getElementById('ev-mapa');
        let mapaUrlFinal = null;

        if (inputMapa && inputMapa.files.length > 0) {
            if (typeof showToast === 'function') showToast("Processando imagem do mapa...", "info");
            
            // 1. Gera o Blob da imagem otimizada
            const blobMapa = await window.comprimirImagemMapa(inputMapa.files[0]);
            
            // 2. Faz o Upload físico pro Supabase Storage
            const path = `mapas/${Date.now()}_${inputMapa.files[0].name}`;
            const { error: uploadError } = await _supabase.storage.from("eventos").upload(path, blobMapa, {
                contentType: 'image/jpeg',
                upsert: true
            });
            if (uploadError) throw uploadError;

            // 3. Pega a URL limpa do arquivo salvo
            const { data: publicData } = _supabase.storage.from("eventos").getPublicUrl(path);
            mapaUrlFinal = publicData.publicUrl;
        }

        // Monta os dados para o Supabase
        const dadosEvento = {
            nome: nome,
            // (Adicione aqui outros campos do seu evento: data, status, etc)
        };

        // Só atualiza a imagem no banco se o usuário tiver feito upload de uma nova
        if (mapaUrlFinal) {
            dadosEvento.mapa_url = mapaUrlFinal;
        }

        // Envia pro Banco
        if (idEvento) {
            // Se tem ID, é Edição (Update)
            const { error } = await _supabase.from('eventos').update(dadosEvento).eq('id', idEvento);
            if (error) throw error;
        } else {
            // Se não tem ID, é Novo Evento (Insert)
            const { error } = await _supabase.from('eventos').insert([dadosEvento]);
            if (error) throw error;
        }

        if (typeof showToast === 'function') showToast("Evento salvo com sucesso!", "sucesso");

        // Limpa o formulário e atualiza a tela
        if (inputMapa) inputMapa.value = '';
        if (typeof fecharModalFormEvento === 'function') fecharModalFormEvento();
        if (typeof carregarEventos === 'function') carregarEventos(); // Recarrega a lista
        window.carregarEventosAdmin();

    } catch (e) {
        console.error("Erro ao salvar evento:", e);
        if (typeof showToast === 'function') showToast("Erro de conexão ao salvar.", "erro");
    } finally {
        // Libera o botão
        if (btnSalvar) btnSalvar.disabled = false;
    }
};

window.salvarNovoMapa = async function() {
    const input = document.getElementById('input-atualizar-mapa');
    const idEvento = document.getElementById('rm-evento-id').value; // Usamos o ID que já está oculto no modal

    if (!idEvento) {
        if (typeof showToast === 'function') showToast("Erro: ID do evento não encontrado.", "erro");
        return;
    }

    if (!input.files || input.files.length === 0) {
        if (typeof showToast === 'function') showToast("Por favor, selecione uma imagem do seu dispositivo.", "erro");
        return;
    }

    const btn = document.getElementById('btn-salvar-mapa');
    const textoOriginal = btn.innerText;
    btn.innerText = "COMPRIMINDO E ENVIANDO...";
    btn.disabled = true;

    try {
        // 1. Usa o compressor para diminuir o tamanho da foto e gera um Arquivo (Blob)
        const blobMapa = await window.comprimirImagemMapa(input.files[0]);

        // 2. Faz o upload pro Supabase Storage
        const path = `mapas/${Date.now()}_mapa_att_${idEvento}.jpg`;
        const { error: uploadError } = await _supabase.storage.from("eventos").upload(path, blobMapa, {
            contentType: 'image/jpeg',
            upsert: true
        });
        
        if (uploadError) throw uploadError;

        // 3. Pega a URL pública
        const { data: publicData } = _supabase.storage.from("eventos").getPublicUrl(path);
        const mapaUrl = publicData.publicUrl;

        btn.innerText = "SALVANDO NO BANCO...";

        // 4. Salva a URL nova direto na coluna mapa_url do evento específico
        const { error } = await _supabase
            .from('eventos')
            .update({ mapa_url: mapaUrl })
            .eq('id', idEvento);

        if (error) throw error;

        if (typeof registrarLog === 'function') {
            await registrarLog('SISTEMA', 'ATUALIZOU MAPA DO EVENTO', `EVENTO ID ${idEvento}`);
        }

        if (typeof showToast === 'function') showToast("Mapa atualizado no Storage com sucesso!", "sucesso");

        // 5. Limpa o input após o sucesso
        input.value = '';

        // 6. Atualiza as telas
        if (typeof carregarEventos === 'function') {
            carregarEventos();
        }
        window.carregarEventosAdmin();

    } catch (error) {
        console.error("Erro ao salvar novo mapa:", error);
        if (typeof showToast === 'function') {
            showToast("Erro ao processar e enviar imagem.", "erro");
        }
    } finally {
        // Volta o botão ao normal
        btn.innerText = textoOriginal;
        btn.disabled = false;
    }
};
