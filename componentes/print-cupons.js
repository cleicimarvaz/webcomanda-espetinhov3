/* =================================================================================
   print-cupons.js — Fichas individuais de produção, resumo de venda e cupom simples
   ================================================================================= */

// FORMATO 1: Fichas Individuais (Retirar no Balcão)
window.imprimirCupom = function (venda) {
  const cfg = typeof obterConfiguracoesImpressora === 'function' ? obterConfiguracoesImpressora() : { maxChars: 32, tamanho: '80', bodyWidth: '72mm' };
  const loja = localStorage.getItem("nomeLoja") || "ESPETINHO & CIA";
  const operador = (localStorage.getItem("userName") || "ADMIN").toUpperCase();
  const layout = localStorage.getItem("ticketLayout") || "original";
  const dataVenda = new Date(venda.data || Date.now());
  let itensArray = Array.isArray(venda.itens)
    ? venda.itens
    : JSON.parse(venda.itens || "[]");

  // --- 1. MOTOR DE ORDENAÇÃO DE 3 NÍVEIS ---
  const getPesoOrdenacao = (item) => {
    const cat = (item.categoria || "").toLowerCase().trim();
    if (['refeição', 'refeicao', 'acompanhamento', 'porção', 'porcao'].some(c => cat.includes(c))) return 2;
    if (cat.includes('combo')) return 1;
    return 0;
  };

  itensArray.sort((a, b) => getPesoOrdenacao(a) - getPesoOrdenacao(b));

  const temBar = itensArray.some(item => getPesoOrdenacao(item) < 2 && parseFloat(item.preco) > 0);
  const temCozinha = itensArray.some(item => getPesoOrdenacao(item) === 2 && parseFloat(item.preco) > 0);
  const precisaLinhaCorte = temBar && temCozinha;
  let linhaCorteInserida = false;

  // --- 2. SE FOR MODO RAWBT ANDROID (TEXTO PURO EXPANSÍVEL) ---
  if (
    window.isRawBTThermalMode && window.isRawBTThermalMode() &&
    /android/.test(navigator.userAgent.toLowerCase())
  ) {
    let textoRaw = "\n";

    const alinharCentro = (texto) => {
      const str = String(texto).substring(0, cfg.maxChars);
      return (
        " ".repeat(Math.max(0, Math.floor((cfg.maxChars - str.length) / 2))) + str
      );
    };

    itensArray.forEach((item) => {
      if (parseFloat(item.preco) > 0) {

        // ✂️ GATILHO DA TESOURA RAWBT (Corte visual das categorias)
        if (getPesoOrdenacao(item) === 2 && precisaLinhaCorte && !linhaCorteInserida) {
          textoRaw += "\n" + alinharCentro("- - ✂ - CORTE AQUI - ✂ - -") + "\n\n";
          linhaCorteInserida = true;
        }

        for (let i = 0; i < (item.qtd || 1); i++) {
          const pedidoId = Math.floor(Math.random() * 9000) + 1000;

          textoRaw += alinharCentro(loja) + "\n";
          textoRaw +=
            alinharCentro(
              new Date().toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              }),
            ) + "\n";
          textoRaw += "=".repeat(cfg.maxChars) + "\n";

          textoRaw += alinharCentro(item.nome.toUpperCase()) + "\n";
          textoRaw += alinharCentro(`R$ ${typeof window.fmSeguro === 'function' ? window.fmSeguro(item.preco) : Number(item.preco).toFixed(2).replace('.', ',')}`) + "\n";

          textoRaw += "-".repeat(cfg.maxChars) + "\n";
          textoRaw += alinharCentro("RETIRAR NO BALCAO") + "\n";
          textoRaw += "-".repeat(cfg.maxChars) + "\n";

          const rodape = `PED#${pedidoId} | OP: ${operador.substring(0, 12)}`;
          textoRaw += alinharCentro(rodape) + "\n";

          // ESPAÇAMENTO DA GUILHOTINA DINÂMICO (3 linhas para 58mm, 5 linhas para 80mm)
          textoRaw += "\n".repeat(cfg.tamanho === "58" ? 3 : 5);

          // COMANDO MÁGICO DE CORTE (O RawBT vai ler isso e acionar a lâmina física aqui!)
          textoRaw += "[cut]\n";
        }
      }
    });

    const textoCodificado = encodeURIComponent(textoRaw);
    window.location.href = `intent:${textoCodificado}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`;
    return;
  }

  // --- 3. SE FOR ROTA WEB NAVEGADOR ---
  let html = `<div style="width: 100%; display: flex; flex-direction: column; align-items: center;">`;
  linhaCorteInserida = false;

  itensArray.forEach((item) => {
    if (parseFloat(item.preco) > 0) {

      if (getPesoOrdenacao(item) === 2 && precisaLinhaCorte && !linhaCorteInserida) {
        html += `<div style="width: ${cfg.bodyWidth}; max-width: 100%; margin: 25px 0; text-align: center; border-top: 2px dashed #000; padding-top: 15px; font-weight: 900; font-size: 14px; letter-spacing: 2px; color: #000 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact;">✂ CORTE AQUI ✂</div>`;
        linhaCorteInserida = true;
      }

      for (let i = 0; i < (item.qtd || 1); i++) {
        const pedidoId = Math.floor(Math.random() * 9000) + 1000;

        // Adicionado break-after para forçar navegadores de PC a cortarem as páginas
        html += `<div class="ticket-wrapper" style="width: ${cfg.bodyWidth}; max-width: 100%; margin-bottom: ${cfg.espacoGuilhotina || '15px'}; page-break-after: always; break-after: page;"><div class="header"><div class="store-name">${loja}</div><div class="meta">${dataVenda.toLocaleDateString()} ${dataVenda.toLocaleTimeString().substring(0, 5)}</div></div>`;

        if (layout === "padrao") {
          html += `<div class="box-padrao text-center"><div class="item-name">${item.nome}</div><div class="item-price">VALOR: R$ ${typeof window.fmSeguro === 'function' ? window.fmSeguro(item.preco) : Number(item.preco).toFixed(2).replace('.', ',')}</div></div><div class="instruction-text text-center">RETIRAR NO BALCÃO</div>`;
        } else if (layout === "eco") {
          html += `<div class="unified-box"><div class="item-name">${item.nome}</div><div class="item-price">R$ ${typeof window.fmSeguro === 'function' ? window.fmSeguro(item.preco) : Number(item.preco).toFixed(2).replace('.', ',')}</div></div>`;
        } else {
          html += `<div class="unified-box text-center"><div class="item-name">${item.nome}</div><div class="item-price">VALOR: R$ ${typeof window.fmSeguro === 'function' ? window.fmSeguro(item.preco) : Number(item.preco).toFixed(2).replace('.', ',')}</div>${layout === "original" ? '<div class="separator"></div>' : ""}<div class="instruction-text">RETIRAR NO BALCÃO</div></div>`;
        }
        html += `<div class="footer text-center">PEDIDO #${pedidoId}<br>Op: ${operador}</div></div>`;
      }
    }
  });

  html += `</div>`;

  if (typeof window.dispararImpressao === 'function') {
      window.dispararImpressao(html, layout);
  } else {
      console.error("[IMPRESSÃO] Função dispararImpressao não encontrada.");
  }
};

// FORMATO 2: Resumo Completo da Venda / Pré-Conta Consolidada
window.imprimirTicketVenda = function (dadosVenda) {
  const cfg = obterConfiguracoesImpressora();
  const loja = localStorage.getItem("nomeLoja") || "ESPETINHO E CIA";
  const cnpj = localStorage.getItem("empresa_cnpj") || "";

  const ua = navigator.userAgent.toLowerCase();
  const isAndroid = /android/.test(ua);
  const isIOS = /iphone|ipad|ipod/.test(ua);

  const itensArray = Array.isArray(dadosVenda.itens)
    ? dadosVenda.itens
    : JSON.parse(dadosVenda.itens || "[]");
  const itensAgrupados = {};

  itensArray.forEach((i) => {
    if (parseFloat(i.preco) > 0) {
      const obs = i.detalhes || i.observacao || "";
      const chave = `${i.nome.trim().toUpperCase()}_${obs.trim().toUpperCase()}`;
      if (!itensAgrupados[chave]) {
        itensAgrupados[chave] = { ...i };
      } else {
        itensAgrupados[chave].qtd += i.qtd;
      }
    }
  });

  const dataFormatada = new Date(
    dadosVenda.created_at || dadosVenda.data || Date.now(),
  ).toLocaleString("pt-BR");
  const isPreConta = dadosVenda.tipo && dadosVenda.tipo.includes("PRÉ-CONTA");

  // --- ROTA TEXTO RAWBT ANDROID COMPATÍVEL ---
  if (
    typeof window.isRawBTThermalMode === "function" &&
    window.isRawBTThermalMode() &&
    isAndroid
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
      if (espacosLivres > 0) return strEsq + " ".repeat(espacosLivres) + strDir;
      return (
        strEsq.substring(0, cfg.maxChars - strDir.length - 1) + " " + strDir
      );
    };

    let textoRaw = "\n";
    textoRaw += alinharCentro(loja) + "\n";
    if (cnpj) textoRaw += alinharCentro(`CNPJ: ${cnpj}`) + "\n";
    textoRaw += "-".repeat(cfg.maxChars) + "\n";
    textoRaw += alinharCentro(dadosVenda.tipo || "VENDA") + "\n";
    textoRaw += alinharLados("DATA:", dataFormatada) + "\n";
    textoRaw += "-".repeat(cfg.maxChars) + "\n\n";

    Object.values(itensAgrupados).forEach((i) => {
      const precoStr = window.fmSeguro
        ? window.fmSeguro(i.preco * i.qtd)
        : (i.preco * i.qtd).toFixed(2);
      textoRaw +=
        alinharLados(`${i.qtd}x ${i.nome.toUpperCase()}`, precoStr) + "\n";
    });

    textoRaw += "\n" + "-".repeat(cfg.maxChars) + "\n";
    const totalStr = window.fmSeguro
      ? window.fmSeguro(dadosVenda.total)
      : parseFloat(dadosVenda.total).toFixed(2);
    textoRaw += alinharLados("TOTAL:", `R$ ${totalStr}`) + "\n";

    if (dadosVenda.troco > 0) {
      const recStr = window.fmSeguro
        ? window.fmSeguro(dadosVenda.recebido)
        : parseFloat(dadosVenda.recebido).toFixed(2);
      const trcStr = window.fmSeguro
        ? window.fmSeguro(dadosVenda.troco)
        : parseFloat(dadosVenda.troco).toFixed(2);
      textoRaw += alinharLados("RECEBIDO:", `R$ ${recStr}`) + "\n";
      textoRaw += alinharLados("TROCO:", `R$ ${trcStr}`) + "\n";
    }

    textoRaw += "-".repeat(cfg.maxChars) + "\n";
    if (!isPreConta) {
      const formaPgto = (
        dadosVenda.forma_pagamento ||
        dadosVenda.pagamento ||
        "DINHEIRO"
      ).toUpperCase();
      textoRaw += alinharLados("PAGAMENTO:", formaPgto) + "\n";
    }

    textoRaw +=
      "\n" +
      alinharCentro("OBRIGADO PELA PREFERENCIA") +
      "\n".repeat(cfg.tamanho === "58" ? 4 : 6);
    const textoCodificado = encodeURIComponent(textoRaw);
    window.location.href = `intent:${textoCodificado}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`;
    return;
  }

  // --- ROTA NAVEGADOR WEB (COMPUTADORES / IOS VIA OPENLABELS) ---
  let htmlItens = "";
  Object.values(itensAgrupados).forEach((i) => {
    const precoFormatado = window.fmSeguro
      ? window.fmSeguro(i.preco * i.qtd)
      : (i.preco * i.qtd).toFixed(2);
    htmlItens += `
        <div class="item-row-container">
            <div class="item-row">
                <div class="item-name">${i.qtd}x ${i.nome.toUpperCase()}</div>
                <div class="item-price">R$ ${precoFormatado}</div>
            </div>
        </div>`;
  });

  let pgtoHtml = !isPreConta
    ? `<div class="pgto-box">PAGAMENTO: ${(dadosVenda.forma_pagamento || dadosVenda.pagamento || "DINHEIRO").toUpperCase()}</div>`
    : "";
  let trocoHtml = "";

  if (dadosVenda.troco > 0) {
    const recFormat = window.fmSeguro
      ? window.fmSeguro(dadosVenda.recebido)
      : parseFloat(dadosVenda.recebido).toFixed(2);
    const trocoFormat = window.fmSeguro
      ? window.fmSeguro(dadosVenda.troco)
      : parseFloat(dadosVenda.troco).toFixed(2);

    trocoHtml = `
        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-top: 4px; width: 100%;">
            <span class="bold">RECEBIDO</span>
            <span class="bold">R$ ${recFormat}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 900; margin-top: 2px; width: 100%;">
            <span>TROCO</span>
            <span>R$ ${trocoFormat}</span>
        </div>`;
  }

  const htmlCompleto = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            @page { margin: 0; size: ${cfg.pageWidth} auto; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: 'Courier New', Courier, monospace;
                width: ${cfg.bodyWidth} !important;
                max-width: ${cfg.bodyWidth} !important;
                margin: 0 auto;
                padding: 0;
                background: #fff;
                color: #000 !important;
                font-size: ${cfg.fontSizeBase};
                line-height: 1.2;
                overflow-x: hidden;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .text-center { text-align: center; }
            .bold { font-weight: 900 !important; color: #000 !important; }
            .uppercase { text-transform: uppercase; }
            .divisor { border-top: 1px dashed #000; margin: 6px 0; width: 100%; }
            .store-name { font-size: ${cfg.fontSizeTitulo}; font-weight: 900; margin-bottom: 2px; }
            .meta { font-size: 10px; margin-bottom: 6px; }
            .item-row-container { margin-bottom: 4px; padding-bottom: 2px; width: 100%; }
            .item-row { display: flex; justify-content: space-between; align-items: flex-start; width: 100%; }
            .item-name { font-weight: 900; flex: 1; padding-right: 4px; word-wrap: break-word; overflow-wrap: break-word; word-break: break-word; }
            .item-price { font-weight: 900; white-space: nowrap; text-align: right; }
            .total-row { display: flex; justify-content: space-between; font-size: 15px; font-weight: 900; margin-top: 6px; width: 100%; }
            .pgto-box { font-size: 11px; font-weight: 900; margin-top: 5px; }
            .footer { margin-top: 12px; font-size: 11px; }
        </style>
    </head>
    <body>
        <div class="text-center">
            <div class="store-name">${loja}</div>
            ${cnpj ? `<div class="bold" style="font-size:11px; margin-bottom: 2px;">CNPJ: ${cnpj}</div>` : ""}
            <div class="bold uppercase" style="font-size:12px; margin-bottom: 4px;">${dadosVenda.tipo || "VENDA"}</div>
            <div class="meta bold">DATA: ${dataFormatada}</div>
        </div>
        <div class="divisor"></div>
        <div>${htmlItens}</div>
        <div class="divisor"></div>
        <div class="total-row">
            <span>TOTAL</span>
            <span>R$ ${window.fmSeguro ? window.fmSeguro(dadosVenda.total) : parseFloat(dadosVenda.total).toFixed(2)}</span>
        </div>
        ${trocoHtml}
        ${pgtoHtml}
        <div class="divisor"></div>
        <div class="footer text-center bold">OBRIGADO PELA PREFERÊNCIA</div>
        <div style="height: ${cfg.espacoGuilhotina};">.</div>
    </body>
    </html>`;

  if (localStorage.getItem("modoImpressao") === "direto" && isIOS) {
    window.location.href =
      "openlabels://print?text=" + encodeURIComponent(htmlCompleto);
    return;
  }

  window.imprimirConteudoIframe(
    htmlCompleto,
    `Ticket_${dadosVenda.id || "Conta"}`,
  );
};

window.gerarTicketHTML = function (dados, loja) {
  const cfg = obterConfiguracoesImpressora();
  const cnpj = localStorage.getItem("empresa_cnpj") || "";
  let htmlItens = "";

  if (dados.itens) {
    const itensAgrupadosHtml = {};
    const itensArray = Array.isArray(dados.itens)
      ? dados.itens
      : JSON.parse(dados.itens || "[]");

    itensArray.forEach((i) => {
      if (parseFloat(i.preco) > 0) {
        const chave = i.nome.trim().toUpperCase();
        if (!itensAgrupadosHtml[chave]) {
          itensAgrupadosHtml[chave] = { ...i };
        } else {
          itensAgrupadosHtml[chave].qtd += i.qtd;
        }
      }
    });

    Object.values(itensAgrupadosHtml).forEach((i) => {
      htmlItens += `
            <div style="margin-bottom: 4px; border-bottom: 1px dashed #ccc; padding-bottom: 3px;">
                <div style="font-size:${cfg.fontSizeBase}; font-weight: bold; text-transform: uppercase; line-height: 1.1; word-wrap: break-word;">
                    ${i.qtd}x ${i.nome}
                </div>
                <div style="text-align: right; font-size:${cfg.fontSizeBase}; font-weight: bold; margin-top: 2px;">
                    R$ ${window.fmSeguro(i.preco * i.qtd)}
                </div>
            </div>`;
    });
  }

  const isPreConta = dados.tipo && dados.tipo.includes("PRÉ-CONTA");
  let pgtoHtml = !isPreConta
    ? `<div style="font-size:11px; margin-top:5px;">PAGAMENTO: ${(dados.forma_pagamento || dados.pagamento || "DINHEIRO").toUpperCase()}</div><div class="divisor"></div>`
    : `<div class="divisor"></div>`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            @page { margin: 0; size: ${cfg.pageWidth} auto; }
            /* MÁGICA AQUI: margin: 0 auto; para centralizar o body no papel */
            html, body { width: ${cfg.bodyWidth} !important; max-width: ${cfg.bodyWidth} !important; margin: 0 auto; background-color: #fff; color: #000; font-family: 'Courier New', Courier, monospace; font-size: ${cfg.fontSizeBase}; line-height: 1.2; }
            .text-center { text-align: center; }
            .divisor { border-top: 1px dashed #000; margin: 6px 0; }
            .bold { font-weight: bold; }
        </style>
    </head>
    <body>
        <div style="padding: 1mm 0;">
            <div class="text-center bold" style="font-size:${cfg.fontSizeTitulo}; margin-bottom: 2px;">${loja}</div>
            ${cnpj ? `<div class="text-center" style="font-size:10px; margin-bottom: 2px;">CNPJ: ${cnpj}</div>` : ""}
            <div class="text-center bold" style="font-size:12px; margin-bottom: 6px;">${dados.tipo || "VENDA"}</div>
            <div class="text-center" style="font-size:9px; margin-bottom: 6px;">DATA: ${new Date(dados.created_at || dados.data || Date.now()).toLocaleString("pt-BR")}</div>
            <div class="divisor"></div>
            ${htmlItens}
            <div style="display:flex; justify-content:space-between; font-size:14px; font-weight:bold; margin-top:6px;">
                <span>TOTAL</span>
                <span>R$ ${window.fmSeguro(dados.total)}</span>
            </div>
            ${pgtoHtml}
            <div class="text-center bold" style="margin-top:12px; font-size:11px;">OBRIGADO PELA PREFERÊNCIA</div>
            <div style="height: ${cfg.espacoGuilhotina};">.</div>
        </div>
    </body>
    </html>`;

  window.imprimirConteudoIframe(html, `Cupom_${loja}`);
};
