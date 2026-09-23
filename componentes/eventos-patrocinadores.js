// ==========================================
// eventos-patrocinadores.js — CRUD de patrocinadores do evento
// ==========================================

/**
 * GERENCIADOR DE PATROCINADORES - MÓDULO CONSOLIDADO
 */

// Troca o ícone do botão de salvar/editar patrocinador (substitui outerHTML pois,
// uma vez convertido em <svg> pelo lucide.createIcons(), o elemento não aceita
// mais reatribuição de innerText/atributo data-lucide).
function atualizarIconeBotaoPatrocinador(nomeIcone) {
  const btn = document.querySelector('#modal-admin-patrocinadores form button[type="submit"]');
  if (!btn) return;
  btn.innerHTML = `<i data-lucide="${nomeIcone}" class="w-5 h-5" aria-hidden="true"></i>`;
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// 1. Abertura do Modal Centralizado
window.abrirModalAdminPatrocinadores = async function () {
  await window.carregarPatrocinadores();
  document
    .getElementById("modal-admin-patrocinadores")
    .classList.remove("hidden");
  window.renderizarListaPatrocinadores();
};

// Adicione isso à sua função de fechar
window.fecharModalAdminPatrocinadores = function () {
  document.getElementById("modal-admin-patrocinadores").classList.add("hidden");
  // Reseta o formulário
  document.getElementById("novo-patrocinador-nome").value = "";
  atualizarIconeBotaoPatrocinador("plus");
  document.querySelector("#modal-admin-patrocinadores form label").innerText =
    "Adicionar Patrocinador";
  window.modoEdicaoIndex = null;
};

// 2. Carregamento dos dados do Supabase (Tratativa JSON)
window.carregarPatrocinadores = async function () {
  try {
    const { data, error } = await _supabase
      .from("eventos")
      .select("patrocinadores")
      .eq("id", window.eventoIdAtivo)
      .single();

    if (error) throw error;

    if (data && data.patrocinadores) {
      window.patrocinadoresEventoAtivo =
        typeof data.patrocinadores === "string"
          ? JSON.parse(data.patrocinadores)
          : data.patrocinadores;
    } else {
      window.patrocinadoresEventoAtivo = [];
    }
    return window.patrocinadoresEventoAtivo;
  } catch (err) {
    console.error("Erro ao carregar patrocinadores:", err);
    return [];
  }
};

// 3. Renderização da Lista no Modal
window.renderizarListaPatrocinadores = function () {
  const container = document.getElementById("lista-admin-patrocinadores");
  const lista = window.patrocinadoresEventoAtivo || [];

  container.innerHTML =
    lista.length > 0
      ? lista
          .map(
            (p, index) => `
            <div class="flex justify-between items-center bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
                <span class="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wide">${p.nome}</span>
                <div class="flex items-center gap-2">
                    <button onclick="window.editarPatrocinador(${index})" aria-label="Editar patrocinador" class="bg-blue-50 border border-blue-100 text-blue-600 w-9 h-9 flex items-center justify-center rounded-lg hover:bg-blue-100 transition-all">
                        <i data-lucide="pencil" class="w-4 h-4" aria-hidden="true"></i>
                    </button>
                    <button onclick="window.removerPatrocinador(${index})" aria-label="Remover patrocinador" class="bg-red-50 border border-red-100 text-red-600 w-9 h-9 flex items-center justify-center rounded-lg hover:bg-red-100 transition-all">
                        <i data-lucide="trash-2" class="w-4 h-4" aria-hidden="true"></i>
                    </button>
                </div>
            </div>
        `,
          )
          .join("")
      : '<p class="text-xs text-slate-400 italic px-2">Nenhum cadastrado ainda.</p>';
  if (typeof lucide !== 'undefined') lucide.createIcons();
};

// 4. Ações de CRUD (Salvar, Editar, Remover)
// 1. Variável global para controle (coloque no topo do seu script)
window.modoEdicaoIndex = null;

// 2. Função de Salvar (Ajustada)
window.salvarNovoPatrocinador = async function (event) {
  if (event) event.preventDefault();

  const input = document.getElementById("novo-patrocinador-nome");
  const nome = input.value.trim();
  if (!nome) return;

  let lista = window.patrocinadoresEventoAtivo || [];
  const eraEdicao = window.modoEdicaoIndex !== null && window.modoEdicaoIndex !== undefined;

  // LÓGICA DE EDIÇÃO: Verifica se o índice é um número válido
  if (eraEdicao) {
    lista[window.modoEdicaoIndex].nome = nome;
    window.modoEdicaoIndex = null; // Reseta após salvar a edição
  } else {
    // LÓGICA DE ADIÇÃO
    lista.push({ nome });
  }

  const { error } = await _supabase
    .from("eventos")
    .update({ patrocinadores: JSON.stringify(lista) })
    .eq("id", window.eventoIdAtivo);

  if (!error) {
    if (typeof registrarLog === "function") {
      await registrarLog("SISTEMA", eraEdicao ? "EDITOU PATROCINADOR" : "ADICIONOU PATROCINADOR", `EVENTO ID ${window.eventoIdAtivo} | ${nome}`);
    }
    window.patrocinadoresEventoAtivo = lista;
    input.value = "";

    // Reset visual do botão e label
    atualizarIconeBotaoPatrocinador("plus");
    document.querySelector("#modal-admin-patrocinadores form label").innerText =
      "Adicionar Patrocinador";

    window.renderizarListaPatrocinadores();
  } else {
    alert("Erro ao salvar no banco!");
  }
};

// 3. Função de Editar (Ajustada para garantir que o índice seja gravado)
window.editarPatrocinador = function (index) {
  const lista = window.patrocinadoresEventoAtivo || [];
  const patrocinador = lista[index];

  // Armazena o índice do que estamos editando
  window.modoEdicaoIndex = index;

  // Preenche o input
  const input = document.getElementById("novo-patrocinador-nome");
  input.value = patrocinador.nome;
  input.focus();

  // Muda o visual para indicar modo edição
  atualizarIconeBotaoPatrocinador("refresh-cw");
  document.querySelector("#modal-admin-patrocinadores form label").innerText =
    "Editando Patrocinador";
};

window.removerPatrocinador = async function (index) {
  let lista = window.patrocinadoresEventoAtivo || [];
  const removido = lista[index];
  lista.splice(index, 1);

  await _supabase
    .from("eventos")
    .update({ patrocinadores: JSON.stringify(lista) })
    .eq("id", window.eventoIdAtivo);

  if (typeof registrarLog === "function") {
    await registrarLog("SISTEMA", "REMOVEU PATROCINADOR", `EVENTO ID ${window.eventoIdAtivo} | ${removido?.nome || `ÍNDICE ${index}`}`);
  }

  window.patrocinadoresEventoAtivo = lista;
  window.renderizarListaPatrocinadores();
};
