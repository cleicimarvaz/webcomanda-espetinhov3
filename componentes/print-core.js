/* =================================================================================
   print-core.js — Motor central de impressão (iframe universal), configuração de
   hardware da impressora térmica, detecção RawBT/Android e geração de CSS por tema
   ================================================================================= */

/* ---------------------------------------------------------------------------------
   0. CONFIGURAÇÃO E CONFIGURADOR CENTRAL DE HARDWARE LOCAL
   --------------------------------------------------------------------------------- */
function obterConfiguracoesImpressora() {
  const tamanho = localStorage.getItem("tamanhoImpressora") || "80";

  if (tamanho === "58") {
    return {
      tamanho: "58",
      pageWidth: "58mm",
      bodyWidth: "52mm", // Margem de respiro para não comer bordas
      fontSizeBase: "11px",
      fontSizeTitulo: "14px",
      maxChars: 32, // Limite de colunas para modo Texto Puro (58mm)
      espacoGuilhotina: "6mm", // Recuo leve para corte manual ou guilhotina curta
    };
  } else {
    return {
      tamanho: "80",
      pageWidth: "80mm",
      bodyWidth: "74mm", // Área útil ideal de impressão em bobinas de 80mm
      fontSizeBase: "13px", // Fonte maior e mais legível
      fontSizeTitulo: "17px",
      maxChars: 48, // Limite expandido de colunas para modo Texto Puro (80mm)
      espacoGuilhotina: "15mm", // Avanço ideal para a lâmina cortar no vazio
    };
  }
}

/* ---------------------------------------------------------------------------------
   1. MOTOR CENTRAL DE RENDERIZAÇÃO (IFRAME OCULTO)
   --------------------------------------------------------------------------------- */
window.imprimirConteudoIframe = function (htmlContent, tituloPDF = null) {
  let tituloOriginal = document.title;

  if (tituloPDF) document.title = tituloPDF;

  let iframeAntigo = document.getElementById("iframe-impressao-universal");
  if (iframeAntigo) iframeAntigo.remove();

  let iframe = document.createElement("iframe");
  iframe.id = "iframe-impressao-universal";
  iframe.style.position = "absolute";
  iframe.style.width = "0px";
  iframe.style.height = "0px";
  iframe.style.border = "none";
  document.body.appendChild(iframe);

  const htmlLimpo = htmlContent.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    "",
  );

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(htmlLimpo);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();

    if (tituloPDF) {
      setTimeout(() => {
        document.title = tituloOriginal;
      }, 1000);
    }
  }, 1200);
};

/* ---------------------------------------------------------------------------------
   2. AUXILIARES E FORMATADORES INTERNOS
   --------------------------------------------------------------------------------- */
window.fmSeguro = (val) =>
  parseFloat(val || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

async function obterLogoBase64(url) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn("Logo não encontrada para o PDF:", url);
    return null;
  }
}

function getTicketCSS(layout, cfg) {
  let css = `
        @media print {
            @page { margin: 0; size: ${cfg.pageWidth} auto; }
            body { margin: 0; padding: 0; }
        }
        html, body {
            width: ${cfg.pageWidth};
            margin: 0 auto;
            padding: 0;
            background-color: #fff;
            font-family: sans-serif;
            color: #000 !important;
        }
        * { box-sizing: border-box; }

        .ticket-wrapper {
            width: ${cfg.bodyWidth};
            margin: 0 auto;
            position: relative;
            padding-bottom: ${cfg.espacoGuilhotina};
            border-bottom: 2px dashed #000;
            page-break-after: always; /* Mantém o corte por ticket */
            break-after: page;
            text-align: center;
        }
        .ticket-wrapper:last-child { border-bottom: none; page-break-after: avoid; }

        .text-center { text-align: center; }
        .bold { font-weight: 900; }
        .uppercase { text-transform: uppercase; }
        .item-name { display: block; line-height: 1.1; margin-bottom: 4px; font-weight: 900; color: #000 !important; }
        .item-price { display: block; margin-bottom: 4px; color: #000 !important; }
        .instruction-text { display: block; font-weight: 900; margin-top: 5px; color: #000 !important; }
        .footer { font-size: 10px; margin-top: 5px; color: #000 !important; line-height: 1.2; }
    `;

  if (layout === "padrao") {
    css += `
            .ticket-wrapper { padding: 10px 0; text-align: center; }
            .header { margin-bottom: 8px; border-bottom: 1px dashed #000; padding-bottom: 5px; }
            .store-name { font-size: ${cfg.tamanho === "58" ? "13px" : "16px"}; font-weight: 900; text-transform: uppercase; }
            .meta { font-size: 9px; margin-top: 2px; }
            .box-padrao { border: 3px solid #000; border-radius: 10px; padding: 10px 2px; margin: 5px 0; width: 100%; display: block; }
            .item-name { font-size: ${cfg.tamanho === "58" ? "14px" : "18px"}; font-weight: 900; text-transform: uppercase; }
            .item-price { font-size: 12px; }
            .instruction-text { font-size: 11px; margin-top: 8px; text-transform: uppercase; display: inline-block; border-bottom: 2px solid #000; }
        `;
  } else if (layout === "eco") {
    css += `
            body { font-size: ${cfg.fontSizeBase}; font-family: Arial, sans-serif; }
            .ticket-wrapper { padding: 5px 0; margin-bottom: 5px; text-align: left; }
            .header { border-bottom: 1px solid #000; padding-bottom: 4px; margin-bottom: 4px; display: flex; justify-content: space-between; align-items: center; }
            .store-name { font-size: 10px; font-weight: bold; }
            .meta { font-size: 8px; }
            .unified-box { border: 1px solid #999; padding: 4px; margin: 4px 0; }
            .item-name { font-size: 11px; font-weight: bold; margin-bottom: 2px; }
            .item-price { font-size: 10px; margin-bottom: 0; }
            .instruction-text { display: none; }
            .footer { display: block; border-top: 1px dotted #ccc; padding-top: 2px; text-align: right; font-size: 8px;}
        `;
  } else if (layout === "gigante") {
    css += `
            /* Layout Gigante Corrigido */
            .ticket-wrapper {
                padding: 5px 0;
                border-bottom: 2px dashed #000; /* Linha inferior tracejada */
                text-align: center;
                width: ${cfg.bodyWidth};
                margin: 0 auto !important;
            }
            .header { border-bottom: 3px solid #000; padding-bottom: 5px; margin-bottom: 5px; }
            .store-name { font-size: 10px; text-transform: uppercase; font-weight: 900; color: #000 !important; }
            .meta { font-size: 10px; display: block; font-weight: 900; margin-top: 2px; color: #000 !important; }
            .unified-box { border: 5px solid #000; padding: 5px; margin: 5px auto; width: 95%; }
            .item-name {
                font-size: ${cfg.tamanho === "58" ? "20px" : "28px"};
                font-weight: 900;
                line-height: 1;
                margin-bottom: 5px;
                word-break: break-word;
                text-transform: uppercase;
                color: #000 !important;
            }
            .item-price { font-size: 18px; font-weight: 900; display: block; margin-bottom: 5px; color: #000 !important; }
            .instruction-text {
                font-size: 14px;
                background: #000 !important;
                color: #fff !important;
                display: inline-block;
                padding: 6px 12px;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                text-transform: uppercase;
                font-weight: 900;
            }
            .footer {
                display: block;
                font-weight: 900;
                font-size: 12px;
                margin-top: 5px;
                border-top: 1px dashed #000; /* Linha superior do rodapé tracejada */
                padding-top: 5px;
                color: #000 !important;
            }
        `;
  } else if (layout === "escuro") {
    css += `
            .ticket-wrapper { border: 4px solid #000; padding: 10px 2px; text-align: center; background: #fff; }
            .header { background: #000; color: #fff; padding: 5px; margin-bottom: 10px; -webkit-print-color-adjust: exact; }
            .store-name { font-size: 12px; font-weight: 900; }
            .meta { font-size: 8px; color: #ccc; }
            .unified-box { border: 3px solid #000; padding: 10px 2px; margin: 5px 0; }
            .item-name { font-size: 15px; font-weight: 900; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 5px; }
            .item-price { font-size: 13px; font-weight: bold; margin-top: 5px;}
            .instruction-text { font-size: 11px; border-top: 2px solid #000; padding-top: 5px; margin-top: 10px; text-transform: uppercase; font-weight: 900;}
        `;
  } else if (layout === "minimalista") {
    css += `
            /* Design Limpo e Editorial */
            .ticket-wrapper { border-bottom: 1px solid #ccc; padding: 10px 0; text-align: left; }
            .header { border-bottom: none; margin-bottom: 8px; }
            .store-name { font-size: ${cfg.tamanho === "58" ? "12px" : "15px"}; font-weight: 900; letter-spacing: 1px; }
            .meta { font-size: 10px; color: #555; }
            .unified-box { border: none; padding: 4px 0; margin: 4px 0; border-bottom: 1px dotted #aaa; }
            .item-name { font-size: ${cfg.tamanho === "58" ? "14px" : "17px"}; font-weight: bold; letter-spacing: -0.5px; display: block; }
            .item-price { font-size: 11px; font-weight: normal; margin-top: 2px; }
            .instruction-text { border: 1px solid #000; border-radius: 4px; padding: 4px; font-size: 10px; text-align: center; margin-top: 8px; display: block; }
        `;
  } else if (layout === "producao") {
    css += `
            /* Alto Contraste para a Cozinha enxergar de longe */
            .ticket-wrapper { padding: 5px 0; border-bottom: 3px dashed #000; text-align: center; }
            .header { margin-bottom: 5px; }
            .store-name { font-size: 11px; font-weight: bold; }
            .unified-box { border: 2px solid #000; padding: 0; margin: 8px 0; background: #fff; }
            .item-name { background: #000; color: #fff; padding: 6px 2px; font-size: ${cfg.tamanho === "58" ? "16px" : "20px"}; font-weight: 900; text-transform: uppercase; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .item-price { font-size: 12px; font-weight: bold; padding: 4px; }
            .instruction-text { font-size: 13px; font-weight: 900; text-transform: uppercase; margin-top: 5px; }
        `;
  } else if (layout === "fiscal") {
    css += `
            /* Estilo Clássico de Supermercado */
            .ticket-wrapper { padding: 5px 0; border-bottom: 1px dotted #000; text-align: left; font-family: monospace; }
            .header { border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 5px; text-align: center; }
            .store-name { font-size: ${cfg.tamanho === "58" ? "12px" : "14px"}; font-weight: normal; text-transform: uppercase; }
            .unified-box { border: none; padding: 2px 0; margin: 0; display: flex; flex-direction: column; }
            .item-name { font-size: ${cfg.tamanho === "58" ? "11px" : "13px"}; font-weight: bold; text-transform: uppercase; }
            .item-price { font-size: 11px; text-align: right; margin-bottom: 4px; }
            .instruction-text { font-size: 11px; border-top: 1px dashed #000; padding-top: 4px; text-align: center; margin-top: 4px; }
        `;
  } else {
    css += `
            .ticket-wrapper { border-left: 5px solid #e63946; border-right: 5px solid #e63946; padding: 10px 2px; text-align: center; }
            .header { margin-bottom: 5px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
            .store-name { font-size: 11px; font-weight: 900; }
            .meta { font-size: 8px; color: #555; }
            .unified-box { border: 2px solid #000; padding: 8px 2px; margin: 5px 0; background: #f8f8f8; border-radius: 8px; }
            .item-name { font-size: 13px; font-weight: 900; text-transform: uppercase; }
            .item-price { font-size: 11px; font-weight: bold; color: #333; }
            .instruction-text { font-size: 10px; text-decoration: none; text-transform: uppercase; }
            .separator { border-bottom: 1px solid #ccc; margin: 5px 15px; }
        `;
  }
  return css;
}

/* ---------------------------------------------------------------------------------
   5. IMPRESSÃO TÉRMICA DINÂMICA (58MM / 80MM AUTODETECTÁVEL)
   --------------------------------------------------------------------------------- */
window.isRawBTThermalMode = function () {
  const formatoGlobal = (
    localStorage.getItem("formatoImpressao") || ""
  ).toLowerCase();
  const modoConfigurado = (
    localStorage.getItem("modoImpressao") || ""
  ).toLowerCase();
  return (
    ["direto", "rawbt", "termico"].includes(modoConfigurado) ||
    ["direto", "rawbt", "termico"].includes(formatoGlobal)
  );
};

window.dispararImpressao = function (conteudoHtml, layout) {
  const cfg = obterConfiguracoesImpressora();
  const ua = navigator.userAgent.toLowerCase();
  const isAndroid = /android/.test(ua);

  if (window.isRawBTThermalMode() && isAndroid) {
    const htmlCompleto = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    html, body { margin: 0; padding: 0; width: ${cfg.pageWidth}; background: #fff; color: #000; font-family: 'Courier New', monospace; }
                    ${getTicketCSS(layout, cfg)}
                </style>
            </head>
            <body>
                ${conteudoHtml}
                <div style="height: ${cfg.espacoGuilhotina};">.</div>
            </body>
            </html>
        `;

    const base64Html = btoa(unescape(encodeURIComponent(htmlCompleto)));
    const urlRawBT = `intent:base64,${base64Html}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`;
    window.location.href = urlRawBT;
    return;
  }

  const htmlIframe = `<html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;width:${cfg.pageWidth};}@media print{.no-print{display:none!important;}}${getTicketCSS(layout, cfg)}</style></head><body>${conteudoHtml}<div style="height: ${cfg.espacoGuilhotina};">.</div></body></html>`;
  window.imprimirConteudoIframe(htmlIframe, "Cupom_Impressao");
};

window.enviarParaImpressora = function (texto) {
  const cfg = obterConfiguracoesImpressora();
  const ua = navigator.userAgent.toLowerCase();
  const isAndroid = /android/.test(ua);
  const base64Texto = btoa(unescape(encodeURIComponent(texto)));

  if (isAndroid && window.isRawBTThermalMode()) {
    window.location.href = "rawbt:base64," + base64Texto;
  } else {
    const html = `<pre style="font-family:monospace;font-size:${cfg.fontSizeBase};white-space:pre-wrap;padding:10px;width:${cfg.bodyWidth};">${texto}</pre><div style="height: ${cfg.espacoGuilhotina};">.</div>`;
    window.imprimirConteudoIframe(html, "Ticket_Texto");
  }
};
