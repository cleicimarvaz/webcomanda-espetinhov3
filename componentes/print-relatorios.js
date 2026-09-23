/* =================================================================================
   print-relatorios.js — Relatórios A4 (fechamento de turno, cardápio, ranking de
   produtos, comandas, fluxo financeiro e posição de estoque)
   ================================================================================= */

/* ---------------------------------------------------------------------------------
   3. RELATÓRIO DE FECHAMENTO (A4 DASHBOARD PDF)
   --------------------------------------------------------------------------------- */
window.gerarPDFConsolidado = async function (resumo) {
  if (!resumo) return;
  if (typeof showToast === "function") showToast("GERANDO PDF...", "aviso");

  const dataHora = new Date().toLocaleString("pt-BR");
  const logoBase64 = await obterLogoBase64("img/logo.jpg");

  const hoje = new Date();
  const dia = String(hoje.getDate()).padStart(2, "0");
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const ano = hoje.getFullYear();

  const nomeArquivo = `${dia}${mes}${ano}_Fechamento_Turno`;
  const sangriasList = (resumo.movsRaw || []).filter(
    (m) => m.tipo === "SANGRIA",
  );
  let htmlSaidas = "";

  if (sangriasList.length === 0) {
    htmlSaidas = `<tr><td colspan="2" class="text-center" style="color: #94a3b8; font-style: italic;">Nenhuma saída ou sangria registrada neste turno.</td></tr>`;
  } else {
    htmlSaidas = sangriasList
      .map(
        (m) => `
            <tr>
                <td>${(m.motivo || "SANGRIA / RETIRADA").toUpperCase()}</td>
                <td class="text-right" style="color:#ef4444;">- R$ ${window.fmSeguro(m.valor)}</td>
            </tr>
        `,
      )
      .join("");
  }

  const estilos = `
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Helvetica', Arial, sans-serif; padding: 40px; color: #1e293b; background: #fff; line-height: 1.4; }
            .header-pdf { position: relative; border-bottom: 4px solid #e63946; padding-bottom: 20px; margin-bottom: 30px; min-height: 100px; }
            .header-info { padding-right: 110px; }
            .header-info h1 { font-size: 30px; font-weight: 900; font-style: italic; color: #e63946; text-transform: uppercase; margin-bottom: 5px; }
            .header-info p { font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
            .header-logo { position: absolute; right: 0; top: 0; }
            .header-logo img { width: 90px; height: 90px; border-radius: 50%; object-fit: cover; border: 4px solid #f1f5f9; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .grid-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 25px; }
            .grid-pgtos { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 15px; margin-bottom: 30px; }
            .card { background: #ffffff; border: 1px solid #e2e8f0; padding: 18px 12px; border-radius: 12px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
            .card label { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 900; display: block; margin-bottom: 6px; }
            .card b { font-size: 16px; color: #1e293b; font-weight: 900; }
            .box-destaque { background: #f8fafc; border: 2px solid #f1f5f9; padding: 25px; border-radius: 20px; text-align: center; margin-bottom: 30px; }
            .box-destaque label { font-size: 11px; color: #475569; text-transform: uppercase; font-weight: 900; display: block; margin-bottom: 5px; }
            .box-destaque span { font-size: 36px; font-weight: 900; color: #0f172a; display: block; margin-bottom: 5px; }
            .box-destaque small { font-size: 10px; color: #64748b; font-weight: bold; }
            .secao-titulo { font-size: 14px; color: #e63946; font-weight: bold; text-transform: uppercase; border-left: 5px solid #e63946; padding-left: 10px; margin: 30px 0 15px 0; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 25px; }
            th { background: #f1f5f9; padding: 12px; text-align: left; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; }
            td { padding: 12px; border-bottom: 1px solid #f1f5f9; color: #334155; font-weight: bold; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .footer-pdf { margin-top: 50px; text-align: center; font-size: 10px; color: #cbd5e1; border-top: 1px solid #f1f5f9; padding-top: 20px; font-style: italic; }
        </style>
    `;

  const html = `
        <html>
        <head>
            <title>${nomeArquivo}</title>
            ${estilos}
        </head>
        <body>
            <div class="header-pdf">
                <div class="header-info">
                    <h1>${resumo.loja}</h1>
                    <p>Relatório de Fechamento de Turno</p>
                    <small style="color: #94a3b8;">Emitido em: ${dataHora}</small>
                </div>
                <div class="header-logo"><img src="${logoBase64 || ""}" onerror="this.style.display='none'"></div>
            </div>

            <div class="grid-kpis">
                <div class="card"><label>Abertura</label><b>R$ ${window.fmSeguro(resumo.valorInicial)}</b></div>
                <div class="card"><label>Entradas (+)</label><b style="color:#16a34a">R$ ${window.fmSeguro(resumo.suprimentos)}</b></div>
                <div class="card"><label>Saídas (-)</label><b style="color:#ef4444">R$ ${window.fmSeguro(resumo.sangrias)}</b></div>
                <div class="card"><label>Saldo (Gaveta)</label><b style="color:#15803d">R$ ${window.fmSeguro(resumo.saldoGaveta)}</b></div>
            </div>

            <div class="box-destaque">
                <label>Total Vendido (Faturamento Bruto)</label>
                <span>R$ ${window.fmSeguro(resumo.totalVendido)}</span>
                <small>Taxas de Serviço: R$ ${window.fmSeguro(resumo.totalTaxas)} &nbsp;|&nbsp; Descontos: R$ ${window.fmSeguro(resumo.totalDescontos)}</small>
            </div>

            <h3 class="secao-titulo">➔ Meios de Recebimento</h3>
            <div class="grid-pgtos">
                ${Object.entries(resumo.metodos)
                  .sort((a, b) => b[1] - a[1])
                  .map(
                    ([m, t]) => `
                    <div class="card"><label>${m}</label><b style="color:#0284c7">R$ ${window.fmSeguro(t)}</b></div>
                `,
                  )
                  .join("")}
            </div>

            <h3 class="secao-titulo">➔ Saídas e Sangrias (Detalhamento)</h3>
            <table>
                <thead>
                    <tr>
                        <th>Motivo / Descrição</th>
                        <th class="text-right">Valor</th>
                    </tr>
                </thead>
                <tbody>
                    ${htmlSaidas}
                </tbody>
            </table>

            <h3 class="secao-titulo">➔ Saída de Estoque (Produtos)</h3>
            <table>
                <thead><tr><th>Item / Produto</th><th class="text-right">Quantidade</th></tr></thead>
                <tbody>
                    ${Object.entries(resumo.itensVendidos)
                      .sort((a, b) => b[1] - a[1])
                      .map(
                        ([n, q]) => `
                        <tr><td>${n}</td><td class="text-center" style="color:#e63946; font-size: 13px;">${q}x</td></tr>
                    `,
                      )
                      .join("")}
                </tbody>
            </table>

            <h3 class="secao-titulo">➔ Produção por Atendente</h3>
            <table>
                <thead><tr><th>Colaborador</th><th class="text-right">Total Produzido</th></tr></thead>
                <tbody>
                    ${Object.entries(resumo.vendasPorVendedor)
                      .sort((a, b) => b[1] - a[1])
                      .map(
                        ([v, t]) => `
                        <tr><td>${v.toUpperCase()}</td><td class="text-right">R$ ${window.fmSeguro(t)}</td></tr>
                    `,
                      )
                      .join("")}
                </tbody>
            </table>

            <div class="footer-pdf">WebComanda - Sistema de Gestão Inteligente</div>
        </body></html>
    `;

  window.imprimirConteudoIframe(html, nomeArquivo);
};

window.exportarFechamentoPDF = function (res) {
  window.gerarPDFConsolidado(res);
};

/* ---------------------------------------------------------------------------------
   4. GERAÇÃO DE CARDÁPIO (A4 PORTRAIT)
   --------------------------------------------------------------------------------- */
window.gerarCardapioPDF = function () {
  const modal = document.getElementById("modal-gerar-cardapio");
  if (modal) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    document.getElementById("input-msg-cardapio")?.focus();
  }
};

window.fecharModalCardapio = function () {
  const modal = document.getElementById("modal-gerar-cardapio");
  if (modal) modal.classList.add("hidden");
};

window.processarImpressaoCardapio = async function () {
  const radio = document.querySelector('input[name="modelo-cardapio"]:checked');
  const modelo = radio ? radio.value : "classico";
  const mensagem =
    document.getElementById("input-msg-cardapio")?.value.toUpperCase() ||
    "AGRADECEMOS A PREFERÊNCIA!";

  window.fecharModalCardapio();

  if (typeof isDatabaseReady === "function" && !isDatabaseReady()) return;
  if (typeof showToast === "function") showToast("GERANDO CARDÁPIO...");

  const loja = localStorage.getItem("nomeLoja") || "ESPETINHO & CIA";
  const logoBase64 = await obterLogoBase64("img/logo.jpg");

  try {
    const { data: produtos } = await _supabase
      .from("produtos")
      .select("*")
      .eq("status", true)
      .order("nome");

    if (!produtos || produtos.length === 0) {
      if (typeof alertaSistema === "function")
        alertaSistema("Não há produtos ativos.", "Cardápio Vazio");
      return;
    }

    if (modelo === "classico") {
      window.gerarTemplateClassico(produtos, loja, logoBase64, mensagem);
    } else if (modelo === "texto") {
      window.gerarTemplateTextoSimples(produtos, loja, mensagem);
    } else {
      // CORRIGIDO: alterado de 'message' para 'mensagem'
      window.gerarTemplateModerno(produtos, loja, logoBase64, mensagem);
    }
  } catch (e) {
    console.error("Erro ao gerar cardápio", e);
    if (typeof showToast === "function")
      showToast("ERRO AO GERAR CARDÁPIO", "erro");
  }
};

window.gerarTemplateClassico = function (produtos, loja, logoBase64, mensagem) {
  const icons = {
    espetos: "🍢",
    cervejas: "🍺",
    bebidas: "🥤",
    refeicao: "🍽️",
    acompanhamentos: "🍚",
    combos: "🍻",
  };
  const categoriesObj = {};

  produtos.forEach((p) => {
    const cat = (p.categoria || "outros").toLowerCase();
    if (!categoriesObj[cat]) categoriesObj[cat] = [];
    categoriesObj[cat].push(p);
  });

  const ordem = ["espetos", "refeicao", "acompanhamentos", "bebidas"];
  const chaves = [
    ...ordem.filter((c) => categoriesObj[c]),
    ...Object.keys(categoriesObj).filter((c) => !ordem.includes(c)),
  ];

  let html = chaves
    .map(
      (key) => `
        <div class="categoria-section">
            <h3 class="categoria-titulo">${icons[key] || "📦"} ${key.toUpperCase()}</h3>
            <div class="itens-grid">
                ${categoriesObj[key]
                  .map(
                    (i) => `
                    <div style="display: flex; flex-direction: column; margin-bottom: 4px; page-break-inside: avoid;">
                        <div class="item-info" style="margin-bottom: 1px;">
                            <span class="item-nome">${i.nome.toUpperCase()}</span>
                            <div class="linha-pontilhada"></div>
                            <span class="item-preco">R$ ${window.fmSeguro(i.preco)}</span>
                        </div>
                        ${i.observacao ? `<div style="font-size: 9px; font-weight: 600; color: #64748b; font-style: italic; line-height: 1.1; text-transform: uppercase;">${i.observacao}</div>` : ""}
                    </div>
                `,
                  )
                  .join("")}
            </div>
        </div>`,
    )
    .join("");

  window.abrirJanelaImpressao(loja, logoBase64, html, mensagem, "classico");
};

window.gerarTemplateModerno = function (produtos = [], loja = "Loja", logoBase64 = "", mensagem = "") {
    // 1. BLINDAGEM: Garante que os produtos existam e sejam um array
    if (!Array.isArray(produtos) || produtos.length === 0) {
        console.warn("Nenhum produto recebido para gerar o cardápio.");
        if (typeof window.showToast === 'function') window.showToast("Nenhum produto encontrado.", "erro");
        return;
    }

    try {
        const categorias = [
            ...new Set(produtos.map((p) => (p.categoria || "outros").toLowerCase())),
        ];

        let html = categorias
            .map(
                (cat) => `
                <div class="cat-section-moderno">
                    <div class="cat-titulo-moderno">${cat.toUpperCase()}</div>
                    ${produtos
                        .filter((p) => (p.categoria || "outros").toLowerCase() === cat)
                        .map(
                            (p) => {
                                // 2. BLINDAGEM: Evita quebra se o nome for nulo ou undefined
                                const nomeProduto = (p.nome || "Item sem nome").toUpperCase();

                                // 3. BLINDAGEM: Garante que o preço seja formatado mesmo se a fmSeguro falhar
                                let precoFormatado = "0,00";
                                if (typeof window.fmSeguro === 'function') {
                                    precoFormatado = window.fmSeguro(p.preco);
                                } else {
                                    precoFormatado = Number(p.preco || 0).toFixed(2).replace('.', ',');
                                }

                                return `
                                <div style="margin-bottom: 6px; page-break-inside: avoid; break-inside: avoid;">
                                    <div class="item-moderno" style="margin-bottom: 1px;">
                                        <span class="item-nome-moderno">${nomeProduto}</span>
                                        <div class="item-dots-moderno"></div>
                                        <span class="item-preco-moderno">R$ ${precoFormatado}</span>
                                    </div>
                                    ${p.observacao ? `<div style="font-size: 9px; color: #64748b; font-weight: 600; font-style: italic; line-height: 1.1; text-transform: uppercase; margin-top: -1px;">${p.observacao}</div>` : ""}
                                </div>
                                `;
                            }
                        )
                        .join("")}
                </div>`
            )
            .join("");

        // 4. BLINDAGEM: Verifica se a função de impressão final existe
        if (typeof window.abrirJanelaImpressao === 'function') {
            window.abrirJanelaImpressao(loja, logoBase64, html, mensagem, "moderno");
        } else {
            console.error("Erro: A função window.abrirJanelaImpressao não foi encontrada.");
        }

    } catch (error) {
        console.error("Erro crítico ao montar o template moderno:", error);
    }
};

// Mede a altura real do cardápio montado (num container invisível, fora da
// tela) e calcula um fator de "zoom" pra ele caber inteiro numa única página
// A4 — poucos itens ficam com fonte/espaçamento maiores, muitos itens ficam
// menores, sempre ocupando a folha inteira em vez de sobrar espaço em
// branco ou vazar pra uma segunda página.
window.calcularZoomParaCaberA4 = function (cssTexto, corpoHtml) {
  const MM_PARA_PX = 96 / 25.4;
  const MARGEM_PAGINA_MM = 8; // bate com @page { margin: 8mm } abaixo
  const PADDING_BODY_PX = 15; // bate com body { padding: 15px } abaixo

  const larguraDisponivel = (210 - MARGEM_PAGINA_MM * 2) * MM_PARA_PX - PADDING_BODY_PX * 2;
  const alturaDisponivel = (297 - MARGEM_PAGINA_MM * 2) * MM_PARA_PX - PADDING_BODY_PX * 2;

  const medidor = document.createElement("div");
  medidor.style.cssText = `position:absolute; left:-9999px; top:0; width:${larguraDisponivel}px; visibility:hidden;`;
  medidor.innerHTML = `<style>${cssTexto}</style>${corpoHtml}`;
  document.body.appendChild(medidor);

  const alturaMedida = medidor.scrollHeight;
  document.body.removeChild(medidor);

  if (!alturaMedida) return 1;

  // Limites de segurança: nunca deixa gigante demais com poucos itens, nem
  // ilegível com muitos.
  return Math.max(0.55, Math.min(alturaDisponivel / alturaMedida, 1.6));
};

window.abrirJanelaImpressao = function (
  loja,
  logoBase64,
  conteudo,
  mensagem,
  estilo,
) {
  const dataHora = new Date().toLocaleString("pt-BR");
  const nomePdf = `Cardapio_${loja.replace(/\s+/g, "_")}`;

  const cssHeader = `
        .header-pdf { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #e63946; padding-bottom: 10px; margin-bottom: 15px; }
        .header-info h1 { font-size: 22px; font-weight: 900; font-style: italic; color: #e63946; text-transform: uppercase; margin-bottom: 2px; line-height: 1; }
        .header-info p { font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px; }
        .header-logo img { width: 55px; height: 55px; border-radius: 50%; object-fit: cover; border: 2px solid #f1f5f9; }
        @media print {
            @page { margin: 8mm; size: A4 portrait; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 0 !important; }
            .categoria-section, .cat-section-moderno { page-break-inside: avoid; break-inside: avoid; }
        }
    `;

  const cssClassico = `@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&display=swap');
    body{font-family:'Montserrat',sans-serif;color:#1e293b;}
    ${cssHeader}
    .categoria-titulo{color:#e63946;border-bottom:2px solid #e63946;margin-bottom:8px;text-transform:uppercase;font-size:13px;margin-top:12px; font-weight: 900;}
    .itens-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 20px;}
    .item-info{display:flex;align-items:baseline;font-weight:700;font-size:11px;}
    .linha-pontilhada{flex-grow:1;border-bottom:1px dotted #ccc;margin:0 6px;}`;

  const cssModerno = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
    body{font-family:'Inter',sans-serif;color:#1e293b;}
    ${cssHeader}
    .content { column-count: 2; column-gap: 25px; }
    .cat-titulo-moderno{color:#e63946;font-weight:900;border-bottom:2px solid #f1f5f9;margin:0 0 8px 0; padding-top: 10px; text-transform:uppercase;font-size:13px; break-after: avoid; page-break-after: avoid;}
    .cat-section-moderno { break-inside: avoid; page-break-inside: avoid; margin-bottom: 8px; }
    .item-moderno{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px;font-size:11px;font-weight:700;}
    .item-dots-moderno{flex:1;border-bottom:1px dotted #cbd5e1;margin:0 8px;}`;

  const cssEscolhida = estilo === "classico" ? cssClassico : cssModerno;

  const corpoHtml = `
        <div class="header-pdf">
            <div class="header-info">
                <h1>${loja}</h1>
                <p>Cardápio de Produtos</p>
                <small style="color: #94a3b8; font-size: 8px;">Atualizado em: ${dataHora}</small>
            </div>
            <div class="header-logo">
                <img src="${logoBase64 || ""}" onerror="this.style.display='none'">
            </div>
        </div>
        <div class="content">${conteudo}</div>
        <div class="footer">${mensagem}</div>`;

  const cssParaMedicao = `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        ${cssEscolhida}
        .footer { margin-top: 15px; text-align: center; padding: 10px; border-top: 2px dashed #eee; font-weight: 900; color: #e63946; font-size: 11px; }
    `;
  const zoom = window.calcularZoomParaCaberA4(cssParaMedicao, corpoHtml);

  const html = `<!DOCTYPE html>
    <html>
    <head>
        <title>Cardápio - ${loja}</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { background: #fff; padding: 15px; width: 100%; margin: 0 auto; }
            ${cssEscolhida}
            .footer { margin-top: 15px; text-align: center; padding: 10px; border-top: 2px dashed #eee; font-weight: 900; color: #e63946; font-size: 11px; page-break-inside: avoid; }
            .pagina-zoom { zoom: ${zoom}; }
        </style>
    </head>
    <body>
        <div class="pagina-zoom">${corpoHtml}</div>
    </body>
    </html>`;

  window.imprimirConteudoIframe(html, nomePdf);
};

// Item #15: cardápio como texto corrido, no formato/largura da bobina térmica
// configurada (58mm/80mm) — pra quem só tem impressora de cupom e não quer
// gastar papel A4 num PDF colorido.
window.gerarTemplateTextoSimples = function (produtos, loja, mensagem) {
  const cfg = typeof obterConfiguracoesImpressora === "function"
    ? obterConfiguracoesImpressora()
    : { pageWidth: "80mm", bodyWidth: "74mm", fontSizeBase: "13px" };

  const categoriasObj = {};
  produtos.forEach((p) => {
    const cat = (p.categoria || "outros").toLowerCase();
    if (!categoriasObj[cat]) categoriasObj[cat] = [];
    categoriasObj[cat].push(p);
  });

  const secoes = Object.keys(categoriasObj)
    .map((cat) => {
      const linhas = categoriasObj[cat]
        .map((p) => {
          const nome = (p.nome || "").toUpperCase();
          const preco = `R$ ${window.fmSeguro(p.preco)}`;
          const obs = p.observacao
            ? `<div style="font-size: 10px; font-style: italic; color: #444;">${p.observacao}</div>`
            : "";
          return `
            <div style="display: flex; justify-content: space-between; gap: 6px; margin-top: 4px;">
                <span style="font-weight: 900;">${nome}</span>
                <span style="white-space: nowrap;">${preco}</span>
            </div>
            ${obs}`;
        })
        .join("");
      return `
        <div style="margin-top: 10px; border-bottom: 1px dashed #000; padding-bottom: 2px; font-weight: 900; text-transform: uppercase;">${cat}</div>
        ${linhas}`;
    })
    .join("");

  const html = `<!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Cardapio_Texto_${loja.replace(/\s+/g, "_")}</title>
        <style>
            * { box-sizing: border-box; }
            @media print { @page { margin: 0; size: ${cfg.pageWidth} auto; } body { margin: 0; } }
            html, body { width: ${cfg.pageWidth}; margin: 0 auto; padding: 0; background: #fff; color: #000; font-family: monospace, Arial; }
            .wrapper { width: ${cfg.bodyWidth}; margin: 10px auto; font-size: ${cfg.fontSizeBase}; }
            .titulo { text-align: center; font-weight: 900; text-transform: uppercase; font-size: 15px; border-bottom: 2px solid #000; padding-bottom: 6px; }
            .footer { text-align: center; margin-top: 14px; border-top: 1px dashed #000; padding-top: 8px; font-weight: 900; }
        </style>
    </head>
    <body>
        <div class="wrapper">
            <div class="titulo">${loja}<br><span style="font-size: 10px; font-weight: normal;">CARDÁPIO</span></div>
            ${secoes}
            <div class="footer">${mensagem}</div>
        </div>
    </body>
    </html>`;

  window.imprimirConteudoIframe(html, `Cardapio_Texto_${loja.replace(/\s+/g, "_")}`);
};

/* ---------------------------------------------------------------------------------
   7. QR CODE DO CARDÁPIO DIGITAL (item #16)
   --------------------------------------------------------------------------------- */
window.gerarQRCodeCardapio = async function () {
  if (typeof QRCode === "undefined") {
    if (typeof showToast === "function") showToast("BIBLIOTECA DE QR CODE NÃO CARREGADA", "erro");
    return;
  }

  window.fecharModalCardapio();
  if (typeof showToast === "function") showToast("GERANDO QR CODE...");

  const loja = localStorage.getItem("nomeLoja") || "ESPETINHO & CIA";
  const urlCardapio = new URL("cardapio.html", window.location.href).href;

  try {
    const qrDataUrl = await QRCode.toDataURL(urlCardapio, { width: 320, margin: 2 });

    const html = `<!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <title>QRCode_Cardapio_${loja.replace(/\s+/g, "_")}</title>
          <style>
              * { box-sizing: border-box; }
              @media print { @page { margin: 10mm; size: A4 portrait; } }
              body { font-family: Arial, sans-serif; text-align: center; padding: 20px; color: #000; }
              h1 { font-size: 22px; font-weight: 900; text-transform: uppercase; margin-bottom: 4px; }
              p { font-size: 12px; font-weight: bold; text-transform: uppercase; color: #444; margin-bottom: 24px; }
              img { width: 260px; height: 260px; border: 4px solid #000; border-radius: 12px; padding: 12px; }
              .url { margin-top: 16px; font-size: 11px; word-break: break-all; color: #666; }
          </style>
      </head>
      <body>
          <h1>${loja}</h1>
          <p>Aponte a câmera do celular para ver o cardápio digital</p>
          <img src="${qrDataUrl}" alt="QR Code do cardápio">
          <div class="url">${urlCardapio}</div>
      </body>
      </html>`;

    window.imprimirConteudoIframe(html, `QRCode_Cardapio_${loja.replace(/\s+/g, "_")}`);
  } catch (e) {
    console.error("Erro ao gerar QR Code do cardápio:", e);
    if (typeof showToast === "function") showToast("ERRO AO GERAR QR CODE", "erro");
  }
};

/* ---------------------------------------------------------------------------------
   6. MOTOR DE IMPRESSÃO A4 (RANKINGS E FLUXOS DE ESTOQUE)
   --------------------------------------------------------------------------------- */
window.imprimirRelatorioAtual = async function (tipo = null) {
  const relatorioEstoque = document.getElementById("view-estoque");
  const relatorioFinanceiro = document.getElementById("view-financeiro");
  const relatorioProdutos = document.getElementById("view-produtos");

  if (
    tipo === "produtos" ||
    (relatorioProdutos && !relatorioProdutos.classList.contains("hidden"))
  ) {
    if (typeof window.imprimirPDFProdutos === "function")
      await window.imprimirPDFProdutos();
    return;
  }
  if (
    tipo === "estoque" ||
    (relatorioEstoque && !relatorioEstoque.classList.contains("hidden"))
  ) {
    if (typeof window.imprimirPDFEstoque === "function")
      await window.imprimirPDFEstoque();
    return;
  }
  if (
    tipo === "financeiro" ||
    (relatorioFinanceiro && !relatorioFinanceiro.classList.contains("hidden"))
  ) {
    if (typeof window.imprimirFluxoFinanceiro === "function")
      window.imprimirFluxoFinanceiro();
    return;
  }
  if (tipo === "comandas") {
    if (typeof window.imprimirPDFComandas === "function")
      await window.imprimirPDFComandas();
    return;
  }
  if (tipo === "despesas") {
    if (typeof window.imprimirPDFDespesas === "function")
      await window.imprimirPDFDespesas();
    return;
  }
  if (tipo === "estornos") {
    if (typeof window.imprimirPDFEstornos === "function")
      await window.imprimirPDFEstornos();
    return;
  }
  window.print();
};

window.imprimirPDFProdutos = async function () {
  const dIni = document.getElementById("data-inicio-rel-produtos")?.value;
  const dFim = document.getElementById("data-fim-rel-produtos")?.value;

  if (!dIni || !dFim) {
    if (typeof showToast === "function")
      showToast("Selecione um período primeiro.", "aviso");
    return;
  }

  if (typeof showToast === "function")
    showToast("GERANDO PDF DO RANKING...", "aviso");

  try {
    const { data: vendas, error } = await _supabase
      .from("historico_vendas")
      .select("itens")
      .gte("created_at", `${dIni}T00:00:00`)
      .lte("created_at", `${dFim}T23:59:59`)
      .neq("status", "cancelada");

    if (error) throw error;

    const contagem = {};
    (vendas || []).forEach((v) => {
      let itensArr = Array.isArray(v.itens)
        ? v.itens
        : JSON.parse(v.itens || "[]");
      itensArr.forEach((i) => {
        const nome = i.nome || "PRODUTO DESCONHECIDO";
        const precoItem = parseFloat(i.preco || 0);
        const qtdItem = parseFloat(i.qtd || i.quantidade || 1);
        if (!nome.toUpperCase().includes("PGTO") && precoItem > 0) {
          contagem[nome] = (contagem[nome] || 0) + qtdItem;
        }
      });
    });

    const ranking = Object.entries(contagem).sort((a, b) => b[1] - a[1]);
    const logoBase64 =
      typeof obterLogoBase64 === "function"
        ? await obterLogoBase64("img/logo.jpg")
        : "";
    const nomeLoja = (
      localStorage.getItem("nomeLoja") || "ESPETINHO & CIA"
    ).toUpperCase();
    const dataEmissao = new Date().toLocaleString("pt-BR");

    const hoje = new Date();
    const nomeArquivo = `${String(hoje.getDate()).padStart(2, "0")}${String(hoje.getMonth() + 1).padStart(2, "0")}${hoje.getFullYear()}_Ranking_Produtos`;

    const estilos = `
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Helvetica', Arial, sans-serif; padding: 40px; color: #1e293b; background: #fff; line-height: 1.4; }
                .header-pdf { position: relative; border-bottom: 4px solid #e63946; padding-bottom: 20px; margin-bottom: 30px; min-height: 100px; }
                .header-info { padding-right: 110px; }
                .header-info h1 { font-size: 30px; font-weight: 900; font-style: italic; color: #e63946; text-transform: uppercase; margin-bottom: 5px; }
                .header-info p { font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
                .header-logo { position: absolute; right: 0; top: 0; }
                .header-logo img { width: 90px; height: 90px; border-radius: 50%; object-fit: cover; border: 4px solid #f1f5f9; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .secao-titulo { font-size: 14px; color: #e63946; font-weight: bold; text-transform: uppercase; border-left: 5px solid #e63946; padding-left: 10px; margin: 30px 0 15px 0; }
                table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 25px; }
                th { background: #f1f5f9; padding: 12px; text-align: left; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; }
                td { padding: 12px; border-bottom: 1px solid #f1f5f9; color: #334155; font-weight: bold; }
                .pos { width: 60px; text-align: center; font-size: 14px; }
                .qtd { width: 120px; text-align: right; color: #10b981; }
                .footer-pdf { margin-top: 50px; text-align: center; font-size: 10px; color: #cbd5e1; border-top: 1px solid #f1f5f9; padding-top: 20px; font-style: italic; }
            </style>
        `;

    const linhas = ranking
      .map(([nome, qtd], index) => {
        const medalhas = ["🥇", "🥈", "🥉"];
        const icone = medalhas[index] || `${index + 1}º`;
        return `<tr><td class="pos">${icone}</td><td>${nome}</td><td class="qtd">${qtd} UNIDADES</td></tr>`;
      })
      .join("");

    const html = `
            <html>
            <head><title>${nomeArquivo}</title>${estilos}</head>
            <body>
                <div class="header-pdf">
                    <div class="header-info">
                        <h1>${nomeLoja}</h1>
                        <p>Ranking de Produtos Mais Vendidos</p>
                        <small style="color: #94a3b8;">Período: ${new Date(dIni + "T12:00:00").toLocaleDateString("pt-BR")} até ${new Date(dFim + "T12:00:00").toLocaleDateString("pt-BR")}</small>
                    </div>
                    <div class="header-logo"><img src="${logoBase64 || ""}" onerror="this.style.display='none'"></div>
                </div>
                <h3 class="secao-titulo">➔ Desempenho de Vendas</h3>
                <table>
                    <thead><tr><th class="pos">Pos</th><th>Descrição do Produto</th><th class="qtd">Quantidade</th></tr></thead>
                    <tbody>${linhas}</tbody>
                </table>
                <div class="footer-pdf">WebComanda - Emitido em ${dataEmissao}</div>
            </body></html>`;

    window.imprimirConteudoIframe(html, nomeArquivo);
  } catch (e) {
    console.error("Erro PDF Ranking:", e);
  }
};

window.imprimirPDFComandas = async function () {
  let dIni = document.getElementById("data-inicio-comandas")?.value;
  let dFim = document.getElementById("data-fim-comandas")?.value;

  if (!dIni || !dFim) {
    dIni =
      dIni ||
      document.getElementById("data-inicio-fin")?.value ||
      new Date().toISOString().split("T")[0];
    dFim =
      dFim ||
      document.getElementById("data-fim-fin")?.value ||
      new Date().toISOString().split("T")[0];
  }

  if (typeof showToast === "function")
    showToast("GERANDO RELATÓRIO DE VENDAS...", "aviso");

  try {
    const { data: vendas, error } = await _supabase
      .from("historico_vendas")
      .select("*")
      .gte("created_at", `${dIni}T00:00:00`)
      .lte("created_at", `${dFim}T23:59:59`)
      .neq("status", "cancelada")
      .order("created_at", { ascending: true });

    if (error) throw error;

    let totalBruto = 0;
    const pagamentos = {};
    const itensVendidos = {};

    vendas.forEach((v) => {
      totalBruto += parseFloat(v.total || 0);
      const mtd = (
        v.forma_pagamento ||
        v.metodo_pagamento ||
        "NÃO INFORMADO"
      ).toUpperCase();
      pagamentos[mtd] = (pagamentos[mtd] || 0) + parseFloat(v.total || 0);

      let itensArr = Array.isArray(v.itens)
        ? v.itens
        : JSON.parse(v.itens || "[]");
      itensArr.forEach((i) => {
        const nome = i.nome || "PRODUTO";
        const qtd = parseFloat(i.qtd || i.quantidade || 1);
        itensVendidos[nome] = (itensVendidos[nome] || 0) + qtd;
      });
    });

    const linhasComandas = vendas
      .map((v) => {
        const hora = new Date(v.created_at).toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        });
        return `<tr><td>${hora}</td><td>${(v.mesa || "BALCÃO").toUpperCase()}</td><td>${(v.forma_pagamento || v.metodo_pagamento || "---").toUpperCase()}</td><td class="text-right">R$ ${parseFloat(v.total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td></tr>`;
      })
      .join("");

    const logoBase64 =
      typeof obterLogoBase64 === "function"
        ? await obterLogoBase64("img/logo.jpg")
        : "";
    const nomeLoja = (
      localStorage.getItem("nomeLoja") || "ESPETINHO & CIA"
    ).toUpperCase();
    const hoje = new Date();
    const nomeArquivo = `${String(hoje.getDate()).padStart(2, "0")}${String(hoje.getMonth() + 1).padStart(2, "0")}${hoje.getFullYear()}_Relatorio_Comandas`;

    const estilos = `
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #1e293b; background: #fff; line-height: 1.4; }
                .header-pdf { position: relative; border-bottom: 4px solid #e63946; padding-bottom: 20px; margin-bottom: 30px; min-height: 100px; }
                .header-info h1 { font-size: 30px; font-weight: 900; font-style: italic; color: #e63946; text-transform: uppercase; margin-bottom: 5px; }
                .header-info p { font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
                .header-logo { position: absolute; right: 0; top: 0; }
                .header-logo img { width: 90px; height: 90px; border-radius: 50%; object-fit: cover; border: 4px solid #f1f5f9; }
                .grid-resumo { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px; }
                .card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 12px; border-left: 5px solid #e63946; }
                .card label { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 900; display: block; }
                .card b { font-size: 18px; color: #1e293b; font-weight: 900; }
                .secao-titulo { font-size: 14px; color: #e63946; font-weight: bold; text-transform: uppercase; border-left: 5px solid #e63946; padding-left: 10px; margin: 30px 0 15px 0; background: #fff5f5; padding-top: 5px; padding-bottom: 5px; }
                table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 25px; }
                th { background: #f1f5f9; padding: 10px; text-align: left; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; }
                td { padding: 10px; border-bottom: 1px solid #f1f5f9; color: #334155; font-weight: bold; }
                .text-right { text-align: right; }
                .footer-pdf { margin-top: 50px; text-align: center; font-size: 10px; color: #cbd5e1; border-top: 1px solid #f1f5f9; padding-top: 20px; font-style: italic; }
            </style>
        `;

    const html = `
            <html><head><title>${nomeArquivo}</title>${estilos}</head>
            <body>
                <div class="header-pdf">
                    <div class="header-info">
                        <h1>${nomeLoja}</h1>
                        <p>Relatório Geral de Vendas e Comandas</p>
                        <small style="color: #94a3b8;">Período: ${new Date(dIni + "T12:00:00").toLocaleDateString("pt-BR")} até ${new Date(dFim + "T12:00:00").toLocaleDateString("pt-BR")}</small>
                    </div>
                    <div class="header-logo"><img src="${logoBase64}" onerror="this.style.display='none'"></div>
                </div>
                <div class="grid-resumo">
                    <div class="card"><label>Faturamento Total</label><b>R$ ${totalBruto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</b></div>
                    <div class="card" style="border-color: #10b981;"><label>Qtd Comandas</label><b>${vendas.length} Finalizadas</b></div>
                </div>
                <h3 class="secao-titulo">➔ Resumo Financeiro</h3>
                <table><thead><tr><th>Método de Pagamento</th><th class="text-right">Total Recebido</th></tr></thead><tbody>
                    ${Object.entries(pagamentos)
                      .map(
                        ([m, v]) =>
                          `<tr><td>${m}</td><td class="text-right">R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td></tr>`,
                      )
                      .join("")}
                </tbody></table>
                <h3 class="secao-titulo">➔ Saída Global de Itens</h3>
                <table><thead><tr><th>Descrição do Produto</th><th class="text-right">Quantidade</th></tr></thead><tbody>
                    ${Object.entries(itensVendidos)
                      .sort((a, b) => b[1] - a[1])
                      .map(
                        ([n, q]) =>
                          `<tr><td>${n}</td><td class="text-right">${q} UN</td></tr>`,
                      )
                      .join("")}
                </tbody></table>
                <h3 class="secao-titulo">➔ Relação Detalhada de Comandas</h3>
                <table><thead><tr><th style="width: 60px;">Hora</th><th>Mesa/Cliente</th><th>Pagamento</th><th class="text-right">Total</th></tr></thead><tbody>
                    ${linhasComandas}
                </tbody></table>
                <div class="footer-pdf">WebComanda - Sistema de Gestão Inteligente</div>
            </body></html>`;

    window.imprimirConteudoIframe(html, nomeArquivo);
  } catch (e) {
    console.error(e);
  }
};

window.imprimirPDFEstornos = async function () {
  const dIni = document.getElementById("data-inicio-estornos")?.value;
  const dFim = document.getElementById("data-fim-estornos")?.value;

  if (!dIni || !dFim) {
    if (typeof showToast === "function")
      showToast("Selecione um período primeiro.", "aviso");
    return;
  }

  if (typeof showToast === "function")
    showToast("GERANDO RELATÓRIO DE ESTORNOS...", "aviso");

  try {
    const { data: estornos, error } = await _supabase
      .from("historico_vendas")
      .select("*")
      .eq("status", "estornada")
      .gte("estornado_em", `${dIni}T00:00:00`)
      .lte("estornado_em", `${dFim}T23:59:59`)
      .order("estornado_em", { ascending: true });

    if (error) throw error;

    const totalEstornado = (estornos || []).reduce((s, v) => s + parseFloat(v.total || 0), 0);

    const linhas = (estornos || [])
      .map((v) => {
        const dataHora = new Date(v.estornado_em || v.created_at).toLocaleString("pt-BR");
        return `<tr><td>${dataHora}</td><td>${(v.forma_pagamento || "---").toUpperCase()}</td><td>${(v.autorizado_por || "---").toUpperCase()}</td><td class="text-right">R$ ${parseFloat(v.total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td></tr>`;
      })
      .join("");

    const logoBase64 =
      typeof obterLogoBase64 === "function"
        ? await obterLogoBase64("img/logo.jpg")
        : "";
    const nomeLoja = (
      localStorage.getItem("nomeLoja") || "ESPETINHO & CIA"
    ).toUpperCase();
    const hoje = new Date();
    const nomeArquivo = `${String(hoje.getDate()).padStart(2, "0")}${String(hoje.getMonth() + 1).padStart(2, "0")}${hoje.getFullYear()}_Relatorio_Estornos`;

    const estilos = `
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #1e293b; background: #fff; line-height: 1.4; }
                .header-pdf { position: relative; border-bottom: 4px solid #e63946; padding-bottom: 20px; margin-bottom: 30px; min-height: 100px; }
                .header-info h1 { font-size: 30px; font-weight: 900; font-style: italic; color: #e63946; text-transform: uppercase; margin-bottom: 5px; }
                .header-info p { font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
                .header-logo { position: absolute; right: 0; top: 0; }
                .header-logo img { width: 90px; height: 90px; border-radius: 50%; object-fit: cover; border: 4px solid #f1f5f9; }
                .grid-resumo { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px; }
                .card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 12px; border-left: 5px solid #e63946; }
                .card label { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 900; display: block; }
                .card b { font-size: 18px; color: #1e293b; font-weight: 900; }
                table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 25px; }
                th { background: #f1f5f9; padding: 10px; text-align: left; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; }
                td { padding: 10px; border-bottom: 1px solid #f1f5f9; color: #334155; font-weight: bold; }
                .text-right { text-align: right; }
                .footer-pdf { margin-top: 50px; text-align: center; font-size: 10px; color: #cbd5e1; border-top: 1px solid #f1f5f9; padding-top: 20px; font-style: italic; }
            </style>
        `;

    const html = `
            <html><head><title>${nomeArquivo}</title>${estilos}</head>
            <body>
                <div class="header-pdf">
                    <div class="header-info">
                        <h1>${nomeLoja}</h1>
                        <p>Relatório de Cancelamentos / Estornos</p>
                        <small style="color: #94a3b8;">Período: ${new Date(dIni + "T12:00:00").toLocaleDateString("pt-BR")} até ${new Date(dFim + "T12:00:00").toLocaleDateString("pt-BR")}</small>
                    </div>
                    <div class="header-logo"><img src="${logoBase64}" onerror="this.style.display='none'"></div>
                </div>
                <div class="grid-resumo">
                    <div class="card"><label>Qtd. Estornada</label><b>${(estornos || []).length}</b></div>
                    <div class="card"><label>Valor Total Estornado</label><b>R$ ${totalEstornado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</b></div>
                </div>
                <table><thead><tr><th>Data/Hora do Estorno</th><th>Forma de Pagamento</th><th>Autorizado Por</th><th class="text-right">Valor</th></tr></thead><tbody>
                    ${linhas || '<tr><td colspan="4" style="text-align:center;">Nenhum estorno neste período.</td></tr>'}
                </tbody></table>
                <div class="footer-pdf">WebComanda - Sistema de Gestão Inteligente</div>
            </body></html>`;

    window.imprimirConteudoIframe(html, nomeArquivo);
  } catch (e) {
    console.error(e);
  }
};

window.imprimirFluxoFinanceiro = async function () {
  const dataIni = document.getElementById("data-inicio-fin")?.value;
  const dataFim = document.getElementById("data-fim-fin")?.value;
  const resumoHTML =
    document.getElementById("resumo-financeiro-cards")?.innerHTML || "";
  const listaHTML =
    document.getElementById("conteudo-rel-financeiro")?.innerHTML || "";

  if (!resumoHTML || resumoHTML.includes("Processando")) {
    if (typeof showToast === "function")
      showToast("Aguarde o carregamento dos dados.", "aviso");
    return;
  }

  if (typeof showToast === "function")
    showToast("GERANDO PDF FINANCEIRO...", "aviso");

  let dataStr = "PERÍODO: GERAL";
  if (dataIni && dataFim) {
    const dI = new Date(dataIni + "T12:00:00").toLocaleDateString("pt-BR");
    const dF = new Date(dataFim + "T12:00:00").toLocaleDateString("pt-BR");
    dataStr = dI === dF ? `DATA: ${dI}` : `PERÍODO: ${dI} ATÉ ${dF}`;
  }

  const dataEmissao = new Date().toLocaleString("pt-BR");
  const nomeLoja = (
    localStorage.getItem("nomeLoja") || "ESPETINHO & CIA"
  ).toUpperCase();
  let logoBase64 =
    typeof obterLogoBase64 === "function"
      ? await obterLogoBase64("img/logo.jpg")
      : "";

  const hoje = new Date();
  const nomeArquivo = `${String(hoje.getDate()).padStart(2, "0")}${String(hoje.getMonth() + 1).padStart(2, "0")}${hoje.getFullYear()}_Fluxo_Financeiro`;

  const estilos = `
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            @page { size: A4 portrait; margin: 15mm; }
            body { font-family: 'Helvetica', Arial, sans-serif; padding: 20px; color: #1e293b; background: #fff !important; line-height: 1.4; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .header-pdf { position: relative; border-bottom: 4px solid #e63946; padding-bottom: 20px; margin-bottom: 30px; min-height: 100px; }
            .header-info { padding-right: 110px; }
            .header-info h1 { font-size: 30px; font-weight: 900; font-style: italic; color: #e63946; text-transform: uppercase; margin-bottom: 5px; }
            .header-logo { position: absolute; right: 0; top: 0; }
            .header-logo img { width: 90px; height: 90px; border-radius: 50%; object-fit: cover; border: 4px solid #f1f5f9; }
            .secao-titulo { font-size: 14px; color: #e63946; font-weight: bold; text-transform: uppercase; border-left: 5px solid #e63946; padding-left: 10px; margin: 30px 0 15px 0; }
            .footer-pdf { margin-top: 50px; text-align: center; font-size: 10px; color: #cbd5e1; border-top: 1px solid #f1f5f9; padding-top: 20px; font-style: italic; }
            .shadow-sm, .shadow-lg, .shadow-2xl { box-shadow: none !important; }
            .rounded-2xl, .rounded-xl { border-radius: 8px !important; border: 1px solid #e2e8f0 !important; }
            .bg-slate-900, .bg-slate-800, .dark\\:bg-slate-900 { background-color: #f8fafc !important; }
            .dark\\:text-white, .text-white { color: #1e293b !important; }
            .text-emerald-500 { color: #10b981 !important; font-weight: 900 !important; }
            .text-red-500 { color: #ef4444 !important; font-weight: 900 !important; }
        </style>
    `;

  const cardsHTML =
    typeof resumoCardsLimpos === "function"
      ? resumoCardsLimpos(resumoHTML)
      : resumoHTML;

  const htmlPrint = `
        <!DOCTYPE html>
        <html lang="pt-br">
        <head>
            <meta charset="UTF-8">
            <title>${nomeArquivo}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            ${estilos}
        </head>
        <body>
            <div class="header-pdf">
                <div class="header-info">
                    <h1>${nomeLoja}</h1>
                    <p>Relatório de Fluxo de Caixa (Financeiro)</p>
                    <small style="color: #94a3b8;">Emitido em: ${dataEmissao} &nbsp;|&nbsp; ${dataStr}</small>
                </div>
                <div class="header-logo"><img src="${logoBase64 || ""}" onerror="this.style.display='none'"></div>
            </div>
            <h3 class="secao-titulo">➔ Resumo Consolidado</h3>
            <div class="grid grid-cols-3 gap-4 mb-8">${cardsHTML}</div>
            <h3 class="secao-titulo">➔ Detalhamento dos Lançamentos</h3>
            <div class="space-y-2">${listaHTML}</div>
            <div class="footer-pdf">WebComanda - Sistema de Gestão Inteligente</div>
        </body></html>`;

  window.imprimirConteudoIframe(htmlPrint, nomeArquivo);
};

function resumoCardsLimpos(html) {
  return html
    .replace(/onclick="[^"]*"/g, "")
    .replace(/cursor-pointer/g, "")
    .replace(/hover:border-emerald-200/g, "")
    .replace(/hover:border-red-200/g, "");
}

window.imprimirPDFEstoque = async function () {
  if (typeof showToast === "function")
    showToast("GERANDO PDF DE ESTOQUE...", "aviso");

  try {
    const { data: produtos, error } = await _supabase
      .from("produtos")
      .select("*")
      .eq("controlar_estoque", true)
      .order("nome");

    if (error || !produtos) throw error;

    const operador = (
      localStorage.getItem("userName") || "ADMIN"
    ).toUpperCase();
    const dataEmissao = new Date().toLocaleString("pt-BR");
    const nomeLoja = (
      localStorage.getItem("nomeLoja") || "ESPETINHO & CIA"
    ).toUpperCase();
    let logoBase64 =
      typeof obterLogoBase64 === "function"
        ? await obterLogoBase64("img/logo.jpg")
        : "";

    const hoje = new Date();
    const nomeArquivo = `${String(hoje.getDate()).padStart(2, "0")}${String(hoje.getMonth() + 1).padStart(2, "0")}${hoje.getFullYear()}_Relatorio_Estoque`;

    const estilos = `
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Helvetica', Arial, sans-serif; padding: 40px; color: #1e293b; background: #fff; line-height: 1.4; }
                .header-pdf { position: relative; border-bottom: 4px solid #e63946; padding-bottom: 20px; margin-bottom: 30px; min-height: 100px; }
                .header-info h1 { font-size: 30px; font-weight: 900; font-style: italic; color: #e63946; text-transform: uppercase; margin-bottom: 5px; }
                .header-logo { position: absolute; right: 0; top: 0; }
                .header-logo img { width: 90px; height: 90px; border-radius: 50%; object-fit: cover; border: 4px solid #f1f5f9; }
                .secao-titulo { font-size: 14px; color: #e63946; font-weight: bold; text-transform: uppercase; border-left: 5px solid #e63946; padding-left: 10px; margin: 30px 0 15px 0; }
                table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 25px; }
                th { background: #f1f5f9; padding: 12px; text-align: left; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; }
                td { padding: 12px; border-bottom: 1px solid #f1f5f9; color: #334155; font-weight: bold; }
                .text-right { text-align: right; }
                .text-center { text-align: center; }
                .footer-pdf { margin-top: 50px; text-align: center; font-size: 10px; color: #cbd5e1; border-top: 1px solid #f1f5f9; padding-top: 20px; font-style: italic; }
            </style>
        `;

    let linhasTabela = produtos
      .map((p) => {
        const qtd = parseFloat(p.estoque_atual || 0);
        const minimoProduto = parseFloat(p.estoque_minimo) || 5;
        const alerta =
          qtd <= minimoProduto
            ? '<span style="color:#ef4444; font-size:9px; font-weight:900; margin-left:6px;">(BAIXO)</span>'
            : "";
        const corQtd = qtd <= minimoProduto ? "color:#ef4444;" : "color:#15803d;";

        return `<tr><td class="text-center" style="font-weight: 900; ${corQtd} font-size: 13px;">${qtd}</td><td>${p.nome.toUpperCase()} ${alerta}</td><td>${(p.categoria || "N/A").toUpperCase()}</td><td class="text-right" style="color: #64748b;">R$ ${window.fmSeguro(p.preco_custo || 0)}</td><td class="text-right">R$ ${window.fmSeguro(p.preco || 0)}</td></tr>`;
      })
      .join("");

    const html = `
        <!DOCTYPE html>
        <html>
        <head><title>${nomeArquivo}</title>${estilos}</head>
        <body>
            <div class="header-pdf">
                <div class="header-info">
                    <h1>${nomeLoja}</h1>
                    <p>Relatório de Posição de Estoque</p>
                    <small style="color: #94a3b8;">Emitido em: ${dataEmissao} &nbsp;|&nbsp; Operador: ${operador}</small>
                </div>
                <div class="header-logo"><img src="${logoBase64 || ""}" onerror="this.style.display='none'"></div>
            </div>
            <h3 class="secao-titulo">➔ Inventário Atual</h3>
            <table><thead><tr><th style="width: 10%" class="text-center">QTD</th><th style="width: 40%">DESCRIÇÃO</th><th style="width: 20%">CATEGORIA</th><th style="width: 15%" class="text-right">PREÇO CUSTO</th><th style="width: 15%" class="text-right">PREÇO VENDA</th></tr></thead><tbody>${linhasTabela}</tbody></table>
            <div class="footer-pdf">WebComanda - Sistema de Gestão Inteligente</div>
        </body></html>`;

    window.imprimirConteudoIframe(html, nomeArquivo);
  } catch (err) {
    console.error("Erro ao gerar PDF:", err);
  }
};
