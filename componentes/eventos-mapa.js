// ==========================================
// eventos-mapa.js — Mapa de ocupação de mesas do evento
// ==========================================

window.mesasSelecionadasMap = []; // Memória global das mesas selecionadas

window.abrirMapaOcupacao = async function () {
  const eventoId = window.eventoIdAtivo;
  if (!eventoId) return;

  const inputMesa = document.getElementById("rm-mesa");
  window.mesasSelecionadasMap = inputMesa && inputMesa.value
      ? inputMesa.value.split(",").map((m) => parseInt(m.trim())).filter((m) => !isNaN(m))
      : [];

  try {
    const [{ data: evento }, { data: reservas }] = await Promise.all([
      _supabase.from("eventos").select("quantidade_mesas").eq("id", eventoId).single(),
      _supabase.from("reservas_evento").select("id, mesas, status, cliente_nome").eq("evento_id", String(eventoId)),
    ]);

    const capacidade = evento ? parseInt(evento.quantidade_mesas) || 0 : 0;
    if (capacidade === 0) {
      if (window.showToast) window.showToast("Defina a capacidade de mesas no menu 'Gerenciar' primeiro.", "erro");
      return;
    }

    const dadosMesas = {};

    if (reservas) {
      reservas.forEach((res) => {
        const arrMesas = Array.isArray(res.mesas) ? res.mesas : typeof res.mesas === "string" ? res.mesas.split(",") : [res.mesas];
        arrMesas.forEach((num) => {
          const n = parseInt(num);
          if (n) {
            if (res.status === "confirmada" || !dadosMesas[n] || dadosMesas[n].status !== "confirmada") {
              dadosMesas[n] = {
                status: res.status,
                id: res.id,
                nome: res.cliente_nome || "SEM NOME",
                arrayMesasStr: JSON.stringify(arrMesas)
              };
            }
          }
        });
      });
    }

    const grid = document.getElementById("grid-mapa-mesas");
    let html = "";

    for (let i = 1; i <= capacidade; i++) {
      let corClasses = "";
      let statusAtual = "livre";
      let isSelecionada = window.mesasSelecionadasMap.includes(i);
      let acaoClique = `onclick="window.toggleMesaMapaAcumulativo(${i}, 'livre', this)"`;

      if (dadosMesas[i]) {
        // ==================================================
        // A MÁGICA DA LIMPEZA AQUI:
        // Remove tudo que estiver entre parênteses e espaços extras!
        // ==================================================
        const nomeLimpo = dadosMesas[i].nome.replace(/\s*\(.*?\)/g, "").trim();
        const nomeEscapado = nomeLimpo.replace(/'/g, "\\'");

        if (dadosMesas[i].status === "confirmada") {
          corClasses = "bg-emerald-500 text-white opacity-90 cursor-pointer hover:bg-emerald-600 shadow-md transform hover:scale-105 transition-all";
          statusAtual = "ocupada";
          acaoClique = `onclick="window.abrirModalMesaOcupada('${dadosMesas[i].id}', '${nomeEscapado}', ${dadosMesas[i].arrayMesasStr.replace(/"/g, "'")})"`;

        } else if (dadosMesas[i].status === "pendente") {
          corClasses = "bg-amber-400 text-white opacity-90 cursor-pointer hover:bg-amber-500 shadow-md transform hover:scale-105 transition-all";
          statusAtual = "pendente";
          acaoClique = `onclick="window.abrirModalAcaoPendente('${dadosMesas[i].id}', '${nomeEscapado}', ${dadosMesas[i].arrayMesasStr.replace(/"/g, "'")})"`;
        }
      } else {
        statusAtual = "livre";
        if (isSelecionada) {
          corClasses = "bg-indigo-600 text-white font-black cursor-pointer shadow-lg transform scale-105 ring-2 ring-indigo-300";
        } else {
          corClasses = "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:scale-105 transition-all font-bold shadow-sm";
        }
      }

      html += `<div ${acaoClique} class="aspect-square rounded-xl flex items-center justify-center text-sm transition-all duration-200 ${corClasses}" title="Mesa ${i}">${i}</div>`;
    }

    grid.innerHTML = html;
    document.getElementById("modal-mapa-ocupacao").classList.remove("hidden");
    window.atualizarBotaoConfirmarMapa();
  } catch (err) {
    console.error("Erro ao gerar mapa:", err);
  }
};

// ==========================================
// FUNÇÕES DO MAPA ACUMULATIVO
// ==========================================
window.toggleMesaMapaAcumulativo = function (numero, status, elemento) {
  if (status === "ocupada") {
    if (window.showToast)
      window.showToast(`Mesa ${numero} já ocupada!`, "erro");
    return;
  }
  if (status === "pendente") {
    if (window.showToast)
      window.showToast(`Mesa ${numero} em análise.`, "aviso");
    return;
  }

  const index = window.mesasSelecionadasMap.indexOf(numero);

  if (index > -1) {
    // REMOVER MESA: Tira do array e volta a cor original
    window.mesasSelecionadasMap.splice(index, 1);
    elemento.className = `aspect-square rounded-xl flex items-center justify-center text-sm transition-all duration-200 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:scale-105 font-bold shadow-sm`;
  } else {
    // ADICIONAR MESA: Coloca no array e pinta de azul (indigo)
    window.mesasSelecionadasMap.push(numero);
    elemento.className = `aspect-square rounded-xl flex items-center justify-center text-sm transition-all duration-200 bg-indigo-600 text-white font-black cursor-pointer shadow-lg transform scale-105 ring-2 ring-indigo-300`;
  }

  // Ordena do menor para o maior (ex: 1, 2, 10)
  window.mesasSelecionadasMap.sort((a, b) => a - b);
  window.atualizarBotaoConfirmarMapa();
};

window.atualizarBotaoConfirmarMapa = function () {
  const container = document.getElementById("container-confirmar-mapa");
  const spanQtd = document.getElementById("qtd-mesas-selecionadas");
  if (!container) return;

  if (window.mesasSelecionadasMap.length > 0) {
    container.classList.remove("hidden");
    container.classList.add("flex");
    spanQtd.innerText = window.mesasSelecionadasMap.length;
  } else {
    container.classList.add("hidden");
    container.classList.remove("flex");
  }
};

window.confirmarSelecaoMapa = function () {
  const inputMesa = document.getElementById("rm-mesa");
  if (inputMesa) {
    inputMesa.value = window.mesasSelecionadasMap.join(", ");
  }

  // Esconde o mapa e a gestão de reservas
  document.getElementById("modal-mapa-ocupacao").classList.add("hidden");
  document.getElementById("modal-gestao-reservas").classList.add("hidden");
  document.getElementById("modal-gestao-reservas").classList.remove("flex");

  // Mostra a tela de formulário
  document.getElementById("modal-gerenciar-evento").classList.remove("hidden");
  document.getElementById("modal-gerenciar-evento").classList.add("flex");

  setTimeout(() => {
    document.getElementById("rm-nome").focus();
  }, 400);
};

// ==========================================
// Gerencia o clique na mesa
// ==========================================
window.selecionarMesaPeloMapa = function (numeroMesa, status) {
  // Se estiver ocupada ou pendente, apenas avisa e bloqueia o clique
  if (status === "ocupada") {
    if (window.showToast)
      window.showToast(`A Mesa ${numeroMesa} já está ocupada!`, "erro");
    return;
  }
  if (status === "pendente") {
    if (window.showToast)
      window.showToast(
        `A Mesa ${numeroMesa} possui um pagamento em análise.`,
        "aviso",
      );
    return;
  }

  // Se estiver livre, executa o fluxo de reserva manual:

  // 1. Oculta o modal do mapa
  document.getElementById("modal-mapa-ocupacao").classList.add("hidden");

  // 2. Oculta o modal de Gestão de Reservas (se estiver aberto por trás)
  document.getElementById("modal-gestao-reservas").classList.add("hidden");
  document.getElementById("modal-gestao-reservas").classList.remove("flex");

  // 3. Abre o modal de Gerenciar Evento (onde fica o formulário)
  document.getElementById("modal-gerenciar-evento").classList.remove("hidden");
  document.getElementById("modal-gerenciar-evento").classList.add("flex");

  // 4. Preenche o input do número da mesa automaticamente
  document.getElementById("rm-mesa").value = numeroMesa;

  // 5. Dá um feedback visual e foca no campo Nome para agilizar a digitação
  if (window.showToast)
    window.showToast(`Mesa ${numeroMesa} selecionada!`, "sucesso");

  setTimeout(() => {
    document.getElementById("rm-nome").focus();
  }, 400);
};

window.toggleSelecaoMesa = function (numero, elemento) {
  if (!window.mesasSelecionadas) window.mesasSelecionadas = [];

  const index = window.mesasSelecionadas.indexOf(numero);

  if (index > -1) {
    // Se já está na lista, remove
    window.mesasSelecionadas.splice(index, 1);
    // Remove o estilo de selecionado
    elemento.classList.remove("bg-indigo-600", "text-white");
    elemento.classList.add("bg-slate-50", "text-slate-400");
  } else {
    // Se não está, adiciona
    window.mesasSelecionadas.push(numero);
    // Aplica o estilo de selecionado
    elemento.classList.add("bg-indigo-600", "text-white");
    elemento.classList.remove("bg-slate-50", "text-slate-400");
  }

  // Atualiza o input no seu formulário (rm-mesa)
  const input = document.getElementById("rm-mesa");
  if (input) {
    input.value = window.mesasSelecionadas.sort((a, b) => a - b).join(", ");
  }
};

window.bloquearMesaRapido = async function (numeroMesa) {
  // Agora passamos 'true' no último parâmetro para ativar o campo de input
  const nomeCliente = await window.confirmarAcaoCustom(
    `Bloquear Mesa ${numeroMesa}`,
    "Insira o nome do cliente para confirmar a reserva:",
    false,
    true,
  );

  // Se clicou em cancelar, nomeCliente será null
  if (nomeCliente === null || nomeCliente.trim() === "") return;

  try {
    const { error } = await _supabase.from("reservas_evento").insert([
      {
        evento_id: window.eventoIdAtivo,
        cliente_nome: nomeCliente.trim(),
        mesas: [numeroMesa.toString()],
        status: "confirmada",
        tipo: "PRESENCIAL",
      },
    ]);

    if (error) throw error;

    if (typeof registrarLog === "function") {
      await registrarLog("SISTEMA", "BLOQUEOU MESA (MAPA)", `EVENTO ID ${window.eventoIdAtivo} | MESA ${numeroMesa} | ${nomeCliente.trim()}`);
    }

    if (window.showToast)
      window.showToast(`Mesa ${numeroMesa} garantida!`, "sucesso");

    if (window.atualizarListaSolicitacoes) {
      await window.atualizarListaSolicitacoes();
      window.abrirMapaOcupacao();
    }
  } catch (err) {
    console.error("Erro:", err);
  }
};

// ==========================================
// GERENCIAMENTO DE MESAS OCUPADAS PELO MAPA
// ==========================================

window.abrirModalMesaOcupada = function(idReserva, nomeCliente, arrayMesas) {
    document.getElementById('mesa-ocupada-id').value = idReserva;
    document.getElementById('mesa-ocupada-nome').value = nomeCliente;

    const stringMesas = Array.isArray(arrayMesas) ? arrayMesas.join(', ') : arrayMesas;
    document.getElementById('mesa-ocupada-numeros').innerText = `Mesa(s): ${stringMesas}`;

    document.getElementById('modal-mesa-ocupada').classList.remove('hidden');
};

window.fecharModalMesaOcupada = function() {
    document.getElementById('modal-mesa-ocupada').classList.add('hidden');
};

window.salvarNomeMesaOcupada = async function() {
    const id = document.getElementById('mesa-ocupada-id').value;
    const novoNome = document.getElementById('mesa-ocupada-nome').value.trim();

    if (!id || !novoNome) {
        if(window.showToast) window.showToast("O nome não pode ficar vazio.", "aviso");
        return;
    }

    try {
        const { error } = await _supabase
            .from('reservas_evento')
            .update({ cliente_nome: novoNome })
            .eq('id', id);

        if (error) throw error;

        if (typeof registrarLog === "function") {
            await registrarLog("SISTEMA", "RENOMEOU MESA OCUPADA", `RESERVA ID ${id} | NOVO NOME: ${novoNome}`);
        }

        if(window.showToast) window.showToast("Nome atualizado com sucesso!", "sucesso");
        window.fecharModalMesaOcupada();

        // Atualiza a tela de listagem por trás e recarrega o mapa
        if (typeof window.atualizarListaSolicitacoes === 'function') window.atualizarListaSolicitacoes();
        window.abrirMapaOcupacao();

    } catch (error) {
        console.error(error);
        if(window.showToast) window.showToast("Erro ao atualizar o nome.", "erro");
    }
};

window.cancelarMesaOcupada = async function() {
    const id = document.getElementById('mesa-ocupada-id').value;
    if(!id) return;

    // Usa a sua trava de segurança impecável
    const confirmado = await window.confirmarAcaoCustom(
        "Cancelar Reserva",
        "Tem certeza que deseja cancelar e liberar esta mesa permanentemente?",
        true
    );

    if (!confirmado) return;

    try {
        const { error } = await _supabase
            .from('reservas_evento')
            .delete()
            .eq('id', id);

        if (error) throw error;

        if (typeof registrarLog === "function") {
            await registrarLog("SISTEMA", "CANCELOU MESA OCUPADA (MAPA)", `RESERVA ID ${id}`);
        }

        if(window.showToast) window.showToast("Reserva cancelada e mesa liberada!", "sucesso");
        window.fecharModalMesaOcupada();

        // Atualiza a tela de listagem por trás e recarrega o mapa visualmente livre
        if (typeof window.atualizarListaSolicitacoes === 'function') window.atualizarListaSolicitacoes();
        window.abrirMapaOcupacao();

    } catch(error) {
        console.error(error);
        if(window.showToast) window.showToast("Erro ao liberar mesa.", "erro");
    }
};
