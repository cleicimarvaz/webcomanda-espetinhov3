/* =================================================================================
   print-comprovantes.js — Comprovante detalhado de venda, modal de impressão,
   comprovante de despesa e reimpressão de comandas do histórico
   ================================================================================= */

window.imprimirComprovanteModal = function () {
  if (window.dadosComprovanteAtual) {
    window.imprimirTicketVenda(window.dadosComprovanteAtual);
    window.fecharModalImpressaoComprovante();
  } else {
    if (typeof showToast === "function")
      showToast("Dados da venda não encontrados.", "erro");
  }
};

window.fecharModalImpressaoComprovante = function () {
  const modal = document.getElementById("modal-confirmacao-impressao");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
};

window.imprimirComprovanteDespesa = function (id) {
  const cfg = obterConfiguracoesImpressora();
  _supabase
    .from("despesas")
    .select("*")
    .eq("id", id)
    .single()
    .then(({ data: d }) => {
      if (!d) return;
      const html = `<html><head><style>@page { size: ${cfg.pageWidth} auto; margin: 0; } body { width: ${cfg.bodyWidth}; margin: 0 auto; padding: 2mm 0; font-family: 'Courier New', monospace; font-size: ${cfg.fontSizeBase}; font-weight: bold; -webkit-font-smoothing: none; color: #000; }</style></head>
        <body><div style="text-align:center"><b>${localStorage.getItem("nomeLoja") || "ESPETINHO"}</b><br>COMPROVANTE DE DESPESA<br>------------------</div>
        DESC: ${d.descricao}<br>CATEG: ${d.categoria}<br>STATUS: ${d.paga ? "PAGO" : "EM ABERTO"}<br>
        <div style="text-align:center">------------------<br><b style="font-size:15px;">TOTAL: R$ ${window.fmSeguro(d.valor)}</b></div>
        <div style="height: ${cfg.espacoGuilhotina};">.</div>
        </body></html>`;

      window.imprimirConteudoIframe(html, `Despesa_${id}`);
    });
};

// =========================================================================
// VARIÁVEIS E FUNÇÕES INTERCEPTADORAS DO MODAL DE IMPRESSÃO
// =========================================================================

// Variável global para segurar a venda enquanto o modal está aberto
window.vendaPendenteImpressao = null;

// Função chamada pelo botão da lista de vendas
window.abrirModalImpressao = function(venda) {
    window.vendaPendenteImpressao = venda; // Salva a venda atual
    const inputNome = document.getElementById('input-nome-cliente-avulso');

    // Limpa o campo caso tenha resquício da última impressão
    if (inputNome) inputNome.value = "";

    // Abre o modal
    const modal = document.getElementById('modal-nome-cliente');
    if (modal) modal.classList.remove('hidden');

    // Dá foco automático no input para agilizar a digitação
    setTimeout(() => { if (inputNome) inputNome.focus(); }, 100);
};

window.fecharModalImpressao = function() {
    const modal = document.getElementById('modal-nome-cliente');
    if (modal) modal.classList.add('hidden');
    window.vendaPendenteImpressao = null;
};

// Função que os botões dentro do modal vão chamar
window.confirmarImpressao = function(comNome) {
    if (!window.vendaPendenteImpressao) return;

    if (comNome) {
        const inputNome = document.getElementById('input-nome-cliente-avulso');
        const nomeDigitado = inputNome ? inputNome.value.trim() : "";
        // Se clicar em "Com Nome" mas deixar em branco, não imprime nome
        window.vendaPendenteImpressao.cliente_nome = nomeDigitado || "";
    } else {
        // Se clicar em "Sem nome", garante que a propriedade vá vazia
        window.vendaPendenteImpressao.cliente_nome = "";
    }

    // --- LÓGICA DE FILTRAGEM (NOVO) ---
    // Remove itens cancelados pela cozinha antes de mandar para a impressora
    if (window.vendaPendenteImpressao.itens) {
        let itensBrutos = typeof window.vendaPendenteImpressao.itens === 'string' 
            ? JSON.parse(window.vendaPendenteImpressao.itens) 
            : window.vendaPendenteImpressao.itens;
            
        window.vendaPendenteImpressao.itens = itensBrutos.filter(item => item.cozinha_status !== 'cancelado_preparo');
    }
    // ----------------------------------

    // Chama a função principal que desenha o ticket com a venda já atualizada e filtrada
    if (typeof window.imprimirComprovante === 'function') {
        window.imprimirComprovante(window.vendaPendenteImpressao);
    }

    // Esconde o modal
    window.fecharModalImpressao();
};

// =========================================================================
// FUNÇÃO PRINCIPAL: IMPRIMIR COMPROVANTE DETALHADO
// =========================================================================
window.imprimirComprovante = function (venda) {
  const cfg = typeof obterConfiguracoesImpressora === 'function' ? obterConfiguracoesImpressora() : { maxChars: 32, tamanho: '80', bodyWidth: '72mm' };

  // 1. DADOS CONFIGURÁVEIS (Lendo do localStorage sincronizado com o Banco)
  const loja = localStorage.getItem("nomeLoja") || "ESPETINHO & CIA";
  const cnpj = localStorage.getItem("cnpjLoja") || "";
  const telefone = localStorage.getItem("telefoneLoja") || "";
  const endereco = localStorage.getItem("enderecoLoja") || "";
  const nomeCliente = venda.cliente_nome || ""; // Nome do cliente capturado na venda

  const operador = (localStorage.getItem("userName") || "ADMIN").toUpperCase();
  const dataVenda = new Date(venda.data || venda.dataFinalizacao || venda.criado_em || Date.now());

  let itensArray = Array.isArray(venda.itens) ? venda.itens : JSON.parse(venda.itens || "[]");
  let qtdTotal = 0;
  itensArray.forEach(i => qtdTotal += Number(i.qtd || 1));

  const formataDinheiro = (v) => typeof window.fmSeguro === 'function' ? window.fmSeguro(v) : Number(v).toFixed(2).replace('.', ',');

  // MODO RAWBT ANDROID (Texto Puro)
  if (window.isRawBTThermalMode && window.isRawBTThermalMode() && /android/.test(navigator.userAgent.toLowerCase())) {
      const alinharCentro = (texto) => {
          const str = String(texto).substring(0, cfg.maxChars);
          return " ".repeat(Math.max(0, Math.floor((cfg.maxChars - str.length) / 2))) + str;
      };

      const preencherLinha = (esq, dir) => {
          const espaco = cfg.maxChars - String(esq).length - String(dir).length;
          return String(esq) + (espaco > 0 ? " ".repeat(espaco) : " ") + String(dir);
      };

      let txt = "\n" + (loja ? alinharCentro(loja.toUpperCase()) + "\n" : "");
      if(endereco) txt += alinharCentro(endereco.substring(0, cfg.maxChars)) + "\n";
      if(telefone) txt += alinharCentro("TEL: " + telefone) + "\n";
      if(cnpj) txt += alinharCentro("CNPJ: " + cnpj) + "\n";
      txt += "-".repeat(cfg.maxChars) + "\n";
      if(nomeCliente) txt += "CLIENTE: " + nomeCliente.toUpperCase().substring(0, 20) + "\n";
      txt += "QTD DESC         V.UN   TOTAL\n" + "-".repeat(cfg.maxChars) + "\n";

      itensArray.forEach(item => {
          txt += `${String(item.qtd || 1).padEnd(3, ' ')} ${String(item.nome).substring(0, 12).padEnd(12, ' ')} ${formataDinheiro(item.preco).padStart(6, ' ')} ${formataDinheiro(item.preco * (item.qtd || 1)).padStart(8, ' ')}\n`;
      });

      txt += "-".repeat(cfg.maxChars) + "\n";
      txt += preencherLinha("Total Itens", qtdTotal) + "\n";
      txt += "-".repeat(cfg.maxChars) + "\n";
      txt += preencherLinha("VALOR A PAGAR", "R$ " + formataDinheiro(venda.total)) + "\n";
      txt += preencherLinha("PAGAMENTO", (venda.forma_pagamento || "DINHEIRO").toUpperCase()) + "\n";
      txt += "-".repeat(cfg.maxChars) + "\n";
      txt += alinharCentro("- SEM VALOR FISCAL -") + "\n";
      txt += alinharCentro(`PEDIDO: ${venda.id} | OP: ${operador}`) + "\n";
      txt += alinharCentro(`${dataVenda.toLocaleDateString('pt-BR')} ${dataVenda.toLocaleTimeString('pt-BR')}`) + "\n";
      txt += "\n".repeat(cfg.tamanho === "58" ? 3 : 5);

      const textoCodificado = encodeURIComponent(txt);
      window.location.href = `intent:${textoCodificado}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`;
      return;
  }

  // MODO WEB HTML (Visual elegante em tabela monoespaçada)
  let html = `
  <div style="width: ${cfg.bodyWidth}; margin: 0 auto; font-family: 'Courier New', Courier, monospace; font-size: 11px; color: #000; line-height: 1.3; font-weight: bold; -webkit-font-smoothing: none;">
      <div style="text-align: center; margin-bottom: 8px;">
          ${loja ? `<b style="font-size: 14px;">${loja.toUpperCase()}</b><br>` : ''}
          ${endereco ? endereco.toUpperCase() + '<br>' : ''}
          ${telefone ? 'TEL: ' + telefone + '<br>' : ''}
          ${cnpj ? 'CNPJ: ' + cnpj + '<br>' : ''}
      </div>

      <div style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 4px 0; text-align: center; font-weight: bold; margin-bottom: 5px;">
          COMPROVANTE DE VENDA
      </div>

      ${nomeCliente ? `<div style="margin-bottom: 5px;"><b>CLIENTE:</b> ${nomeCliente.toUpperCase()}</div>` : ''}

      <div style="border-bottom: 1px dashed #000; padding-bottom: 4px; margin-bottom: 5px;">
          <div style="display: flex; font-weight: bold;">
              <div style="width: 12%;">QTD</div>
              <div style="width: 48%;">DESCRIÇÃO</div>
              <div style="width: 20%; text-align: right;">V.UN</div>
              <div style="width: 20%; text-align: right;">TOTAL</div>
          </div>
      </div>`;

  itensArray.forEach(item => {
      const totalItem = parseFloat(item.preco) * (item.qtd || 1);
      html += `
          <div style="display: flex; margin-bottom: 2px;">
              <div style="width: 12%;">${item.qtd || 1}</div>
              <div style="width: 48%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.nome.toUpperCase()}</div>
              <div style="width: 20%; text-align: right;">${formataDinheiro(item.preco)}</div>
              <div style="width: 20%; text-align: right;">${formataDinheiro(totalItem)}</div>
          </div>`;
  });

  html += `
      <div style="border-top: 1px dashed #000; margin-top: 5px; padding-top: 5px;">
          <div style="display: flex; justify-content: space-between;">
              <span>Total Itens</span>
              <span>${qtdTotal}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; margin-top: 4px;">
              <span>VALOR A PAGAR</span>
              <span>R$ ${formataDinheiro(venda.total)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 2px;">
              <span>PAGAMENTO</span>
              <span>${(venda.forma_pagamento || 'DINHEIRO').toUpperCase()}</span>
          </div>
      </div>
      <div style="border-top: 1px dashed #000; margin-top: 8px; padding-top: 8px; text-align: center; font-size: 9px;">
          PEDIDO: ${venda.id} | OP: ${operador}<br>
          ${dataVenda.toLocaleDateString('pt-BR')} ${dataVenda.toLocaleTimeString('pt-BR')}<br>
          - SEM VALOR FISCAL -
      </div>
  </div>`;

  if (typeof window.dispararImpressao === 'function') {
      window.dispararImpressao(html, 'original');
  } else {
      console.error("[IMPRESSÃO] Função dispararImpressao não encontrada.");
  }
};

// FORMATO 3: Reimpressão de Comandas Antigas (Histórico)
window.reimprimirComanda = async function (id) {
  const cfg = obterConfiguracoesImpressora();
  try {
    const { data: m, error } = await _supabase
      .from("comandas")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !m) throw new Error("Comanda não encontrada.");

    const loja = localStorage.getItem("nomeLoja") || "ESPETINHO E CIA";
    const cnpj = localStorage.getItem("empresa_cnpj") || "";
    let itensBrutos = typeof m.itens === "string" ? JSON.parse(m.itens) : m.itens;
    
    // --- LÓGICA DE FILTRAGEM (NOVO) ---
    // Remove itens cancelados pela cozinha do comprovante do cliente
    const itens = (itensBrutos || []).filter(item => item.cozinha_status !== 'cancelado_preparo');
    // ----------------------------------

    const dataF = new Date(m.fechada_em);
    const dataFormatada =
      dataF.toLocaleDateString("pt-BR") +
      " " +
      dataF.toLocaleTimeString("pt-BR");

    // --- ROTA TEXTO RAWBT ANDROID (REIMPRESSÃO ADAPTÁVEL) ---
    if (
      window.isRawBTThermalMode() &&
      /android/.test(navigator.userAgent.toLowerCase())
    ) {
      const alinharCentro = (texto) => {
        const str = String(texto).substring(0, cfg.maxChars);
        return (
          " ".repeat(Math.max(0, Math.floor((cfg.maxChars - str.length) / 2))) +
          str
        );
      };
      const alinharLados = (esq, dir) => {
        const strEsq = String(esq);
        const strDir = String(dir);
        const espacosLivres = cfg.maxChars - strEsq.length - strDir.length;
        if (espacosLivres > 0)
          return strEsq + " ".repeat(espacosLivres) + strDir;
        return (
          strEsq.substring(0, cfg.maxChars - strDir.length - 1) + " " + strDir
        );
      };

      let textoRaw = "\n";
      textoRaw += alinharCentro(loja) + "\n";
      if (cnpj) textoRaw += alinharCentro(`CNPJ: ${cnpj}`) + "\n";
      textoRaw += "-".repeat(cfg.maxChars) + "\n";
      textoRaw +=
        alinharCentro(`2 VIA - ${m.identificacao.toUpperCase()}`) + "\n";
      textoRaw += alinharLados("DATA:", dataFormatada) + "\n";
      textoRaw += "-".repeat(cfg.maxChars) + "\n\n";

      itens.forEach((item) => {
        const precoStr = (parseFloat(item.preco) * item.qtd)
          .toFixed(2)
          .replace(".", ",");
        textoRaw +=
          alinharLados(
            `${item.qtd}x ${item.nome.toUpperCase()}`,
            `R$ ${precoStr}`,
          ) + "\n";
        if (item.detalhes || item.observacao) {
          const obsLimpa = (item.detalhes || item.observacao).replace(
            /<br>/g,
            " | ",
          );
          textoRaw += `   OBS: ${obsLimpa}\n`;
        }
      });

      textoRaw += "\n" + "-".repeat(cfg.maxChars) + "\n";
      textoRaw +=
        alinharLados(
          "TOTAL:",
          `R$ ${parseFloat(m.total).toFixed(2).replace(".", ",")}`,
        ) + "\n";
      textoRaw += "-".repeat(cfg.maxChars) + "\n";
      textoRaw +=
        alinharLados("PAGAMENTO:", m.forma_pagamento || "DINHEIRO") + "\n";
      textoRaw +=
        "\n" +
        alinharCentro("OBRIGADO PELA PREFERENCIA") +
        "\n".repeat(cfg.tamanho === "58" ? 4 : 6);

      const textoCodificado = encodeURIComponent(textoRaw);
      window.location.href = `intent:${textoCodificado}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`;
      return;
    }

    // --- ROTA NAVEGADOR WEB (REIMPRESSÃO ADAPTÁVEL) ---
    let html = `
            <div style="font-family: 'Courier New', Courier, monospace; width: ${cfg.bodyWidth}; padding: 0; color: #000; margin: 0 auto; font-weight: bold; -webkit-font-smoothing: none;">
                <div style="text-align: center; margin-bottom: 10px;">
                    <div style="font-size: ${cfg.fontSizeTitulo}; font-weight: bold;">${loja}</div>
                    ${cnpj ? `<div style="font-size: 11px; text-align: center;">CNPJ: ${cnpj}</div>` : ""}
                    <div style="font-size: 13px; font-weight: bold; margin-top: 4px;">2ª VIA - ${m.identificacao.toUpperCase()}</div>
                    <div style="font-size: 10px; margin-top: 4px;">DATA: ${dataFormatada}</div>
                </div>
                <div style="border-top: 1px dashed #000; margin: 5px 0;"></div>
                <div style="margin-top: 10px;">
                    ${itens
                      .map((item) => {
                        const obsHtml =
                          item.detalhes || item.observacao
                            ? `<div style="font-size: 11px; margin-top: 2px; padding-left: 5px; font-style: italic;">Obs: ${item.detalhes || item.observacao}</div>`
                            : "";
                        return `
                        <div style="margin-bottom: 8px;">
                            <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: bold;">
                                <span>${item.qtd}X ${item.nome.toUpperCase()}</span>
                                <span>R$ ${(parseFloat(item.preco) * item.qtd).toFixed(2).replace(".", ",")}</span>
                            </div>
                            ${obsHtml}
                            <div style="border-top: 1px dashed #eee; margin-top: 4px;"></div>
                        </div>`;
                      })
                      .join("")}
                </div>
                <div style="margin-top: 15px; border-top: 2px dashed #000; padding-top: 8px;">
                    <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: bold;">
                        <span>TOTAL</span>
                        <span>R$ ${parseFloat(m.total).toFixed(2).replace(".", ",")}</span>
                    </div>
                </div>
                <div style="margin-top: 10px; font-size: 11px;"><b>PAGAMENTO:</b> ${m.forma_pagamento || "DINHEIRO"}</div>
                <div style="border-top: 1px dashed #000; margin: 15px 0 5px 0;"></div>
                <div style="text-align: center; font-size: 12px; font-weight: bold; margin-top: 10px;">OBRIGADO PELA PREFERÊNCIA</div>
                <div style="height: ${cfg.espacoGuilhotina};">.</div>
            </div>`;

    window.imprimirConteudoIframe(html, `Reimpressao_Comanda_${id}`);
  } catch (e) {
    console.error("Erro na reimpressão:", e);
  }
};

window.reimprimirComandaDetalhada = async function (id) {
  try {
    const { data: m, error } = await _supabase
      .from("comandas")
      .select("*")
      .eq("id", id)
      .single();
      
    if (error || !m) throw new Error("Comanda não encontrada.");

    // --- LÓGICA DE FILTRAGEM PARA A IMPRESSORA ---
    const itensParaImpressao = (m.itens || []).filter(item => {
        // 1. O item NÃO pode estar cancelado na cozinha
        const naoEstaCancelado = item.cozinha_status !== 'cancelado_preparo';
        
        // 2. O item DEVE ser um item de preparo na cozinha (ignora bebidas/sem preparo)
        // Usa a sua função global para checar, garantindo que não quebre se ela falhar
        const vaiParaCozinha = typeof window.isItemCozinha === 'function' ? window.isItemCozinha(item) : true;
        
        // Só passa para a impressora se atender às duas regras acima
        return naoEstaCancelado && vaiParaCozinha;
    });
    // ---------------------------------------------

    const vendaAdaptada = {
      id: m.id,
      cliente_nome: m.identificacao, 
      dataFinalizacao: m.fechada_em,
      itens: itensParaImpressao, // <-- Agora enviamos a lista limpa, já filtrada
      total: m.total,
      forma_pagamento: m.forma_pagamento
    };

    if (typeof window.imprimirComprovante === 'function') {
      window.imprimirComprovante(vendaAdaptada);
    } else {
      console.error("[IMPRESSÃO] Função imprimirComprovante não encontrada.");
    }
    
  } catch (e) {
    console.error("Erro na reimpressão detalhada:", e);
    if (typeof showToast === "function") {
      showToast("Erro ao buscar dados da comanda.", "erro");
    }
  }
};

function imprimirConteudoHTML(conteudo) {
  window.imprimirConteudoIframe(conteudo, "Reimpressao_Comanda");
}
