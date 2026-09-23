// ==========================================
// eventos-impressao.js — Impressão de listas de reservas, placas de mesa e placas de patrocinadores
// ==========================================

window.imprimirListaReservas = async function () {
  if (!window.eventoIdAtivo) return;

  if (window.showToast)
    window.showToast("Gerando lista de impressão...", "aviso");

  try {
    // Pega o nome do evento que está na tela
    const nomeEvento = document
      .getElementById("modal-reserva-evento-nome")
      .innerText.replace("RESERVAS: ", "");

    // Busca as reservas E a quantidade de mesas do evento ao mesmo tempo
    const [{ data: evento }, { data: reservas, error }] = await Promise.all([
      _supabase
        .from("eventos")
        .select("quantidade_mesas")
        .eq("id", String(window.eventoIdAtivo))
        .single(),
      _supabase
        .from("reservas_evento")
        .select("*")
        .eq("evento_id", String(window.eventoIdAtivo)),
    ]);

    if (error) throw error;

    // Descobre quantas mesas o evento tem (se falhar, pega pelo menos até a maior mesa reservada)
    let totalMesas =
      evento && evento.quantidade_mesas ? parseInt(evento.quantidade_mesas) : 0;

    // Mapeia as reservas para organizar por número da mesa
    let mapaReservas = {};
    let maiorMesaReservada = 0;

    if (reservas) {
      reservas.forEach((res) => {
        // MELHORIA 2: Limpa o nome removendo tudo que estiver entre parênteses (ex: " (DIRETA)")
        let nomeLimpo = res.cliente_nome
          ? res.cliente_nome.replace(/\s*\(.*?\)/g, "").trim()
          : "";

        // MELHORIA 3: Limpa o telefone falso de admin
        let telefoneLimpo = res.cliente_telefone || "";
        if (
          telefoneLimpo.toUpperCase() === "MANUAL - ADMIN" ||
          telefoneLimpo === "N/A"
        ) {
          telefoneLimpo = ""; // Fica em branco
        }

        if (Array.isArray(res.mesas)) {
          res.mesas.forEach((mesa) => {
            let num = parseInt(mesa);
            if (!isNaN(num)) {
              if (num > maiorMesaReservada) maiorMesaReservada = num;

              // Adiciona no mapa (se já tiver, só sobrescreve se for 'confirmada')
              if (!mapaReservas[num] || res.status === "confirmada") {
                mapaReservas[num] = {
                  cliente: nomeLimpo,
                  telefone: telefoneLimpo,
                  status: res.status,
                };
              }
            }
          });
        }
      });
    }

    // Se por acaso a capacidade não foi configurada, imprime pelo menos até a última mesa ocupada
    if (totalMesas === 0) totalMesas = maiorMesaReservada;

    // MELHORIA 1 e 4: Constrói a tabela organizando as linhas vazias e ocupadas
    let linhasTabela = "";
    for (let i = 1; i <= totalMesas; i++) {
      const numStr = String(i).padStart(2, "0");

      if (mapaReservas[i]) {
        const item = mapaReservas[i];
        linhasTabela += `
                    <tr>
                        <td style="font-weight: 900; text-align: center; font-size: 16px; color: #000;">${numStr}</td>
                        <td style="font-weight: bold; color: #1e293b;">${item.cliente.toUpperCase()}</td>
                        <td style="font-weight: bold; color: #475569;">${item.telefone || "-"}</td>
                        <td class="status-${item.status}">${item.status.toUpperCase()}</td>
                    </tr>
                `;
      } else {
        // Mesa Livre (Fica em branco com fundo levemente cinza)
        linhasTabela += `
                    <tr style="background-color: #f8fafc;">
                        <td style="font-weight: 900; text-align: center; font-size: 16px; color: #94a3b8;">${numStr}</td>
                        <td></td>
                        <td></td>
                        <td style="color: #cbd5e1; font-weight: bold; font-style: italic;">LIVRE</td>
                    </tr>
                `;
      }
    }

    // Preparação para Impressão Segura (Iframe invisível)
    const dataHoje = new Date().toLocaleDateString("pt-BR");
    const tituloOriginal = document.title;
    document.title = `Lista_${nomeEvento.replace(/\s+/g, "_")}_${dataHoje.replace(/\//g, "-")}`;

    let iframeAntigo = document.getElementById("iframe-impressao-lista");
    if (iframeAntigo) iframeAntigo.remove();

    let iframe = document.createElement("iframe");
    iframe.id = "iframe-impressao-lista";
    iframe.style.position = "absolute";
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const baseUrl =
      window.location.origin +
      window.location.pathname.substring(
        0,
        window.location.pathname.lastIndexOf("/") + 1,
      );

    const cssModerno = `
            @page { size: A4 portrait; margin: 15mm; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { background: #fff; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; }
            .header-pdf { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #f1f5f9; padding-bottom: 15px; }
            .header-info h1 { font-size: 22px; color: #1e293b; text-transform: uppercase; margin-bottom: 5px; font-weight: 900; }
            .header-info p { color: #64748b; font-size: 12px; font-weight: bold; text-transform: uppercase; }
            .header-logo img { width: 70px; height: 70px; object-fit: cover; border-radius: 12px; }

            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #fff; color: #1e293b; text-transform: uppercase; font-size: 11px; padding: 12px 8px; text-align: left; border-bottom: 2px solid #e2e8f0; font-weight: 900; letter-spacing: 1px; }
            td { border-bottom: 1px solid #f1f5f9; padding: 12px 8px; font-size: 13px; text-transform: uppercase; }

            .status-confirmada { color: #059669; font-weight: 900; }
            .status-pendente { color: #d97706; font-weight: 900; }
        `;

    const html = `<!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <base href="${baseUrl}">
            <style>${cssModerno}</style>
        </head>
        <body>
            <div class="header-pdf">
                <div class="header-info">
                    <h1>${nomeEvento}</h1>
                    <p>Controle Geral de Mesas</p>
                    <small style="color: #94a3b8; font-size: 10px;">Emitido em: ${new Date().toLocaleString("pt-BR")}</small>
                </div>
                <div class="header-logo">
                    <img src="img/logo.jpg?v=2" onerror="this.style.display='none'">
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 10%; text-align: center;">Mesa</th>
                        <th style="width: 45%;">Cliente</th>
                        <th style="width: 25%;">Telefone</th>
                        <th style="width: 20%;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${linhasTabela}
                </tbody>
            </table>
        </body>
        </html>`;

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    // Dispara a impressão aguardando a logo carregar
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => {
        document.title = tituloOriginal;
      }, 1000);
    }, 1000);
  } catch (error) {
    console.error(error);
    if (window.showToast)
      window.showToast("Erro ao gerar impressão da lista.", "erro");
  }
};

// =========================================================================
// FUNÇÃO QUE GERA A PLACA DO EVENTO ATUAL (A4 PAISAGEM)
// =========================================================================
window.imprimirPlacaDoEvento = function (layoutOpcao = 'a4_4', qtdImpressoes = 1) {
    const nomeEvento = window.nomeEventoAtivo || "NOSSO EVENTO";

    // Busca os patrocinadores
    let listaPatroc = window.patrocinadoresEventoAtivo;
    if (typeof listaPatroc === "string") {
        try {
            listaPatroc = JSON.parse(listaPatroc);
        } catch (e) {
            listaPatroc = null;
        }
    }

    const patrocinadores = listaPatroc || [
        { nome: "Supermercado Central", cota: "Ouro" },
        { nome: "Distribuidora de Bebidas", cota: "Ouro" },
        { nome: "Gráfica Rápida", cota: "Prata" },
        { nome: "Açougue do Bairro", cota: "Apoio" },
    ];

    // Monta o HTML dos patrocinadores (flexível para os 3 layouts)
    let htmlPatrocinadores = patrocinadores.map(p => `
        <div class="patrocinador-card">
            <div class="patrocinador-nome">${p.nome.toUpperCase()}</div>
            <div class="patrocinador-cota">COTA ${p.cota.toUpperCase()}</div>
        </div>
    `).join("");

    // Configuração da Térmica (caso seja selecionada)
    const cfg = typeof obterConfiguracoesImpressora === 'function'
        ? obterConfiguracoesImpressora()
        : { pageWidth: '80mm', bodyWidth: '72mm', espacoGuilhotina: '15mm', tamanho: '80' };

    let htmlStr = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <title>Patrocinadores - ${nomeEvento}</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&display=swap');
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Montserrat', sans-serif; background-color: #fff; color: #1e293b; width: 100%; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    `;

    // --- 1. LAYOUT: 4 POR PÁGINA (A4 Retrato) ---
    if (layoutOpcao === 'a4_4') {
        htmlStr += `
            @media print { @page { size: A4 portrait; margin: 10mm; } }
            .placa-wrapper { width: 48%; height: 135mm; float: left; margin: 1%; border: 3px dashed #cbd5e1; padding: 10mm 5mm; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; page-break-inside: avoid; border-radius: 15px;}
            .agradecimento { font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 5px; }
            .titulo { font-size: 26px; font-weight: 900; color: #e63946; text-transform: uppercase; line-height: 1; margin-bottom: 15px; }
            .evento-nome { font-size: 12px; font-weight: 900; background-color: #1e293b; color: #fff; padding: 6px 20px; border-radius: 50px; text-transform: uppercase; margin-bottom: 20px; }
            .grid-patrocinadores { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; width: 100%; }
            .patrocinador-card { background: #f8fafc; border: 2px solid #f1f5f9; border-radius: 10px; padding: 10px; min-width: 45%; flex: 1; }
            .patrocinador-nome { font-size: 14px; font-weight: 900; color: #0f172a; margin-bottom: 5px; }
            .patrocinador-cota { font-size: 10px; font-weight: 900; color: #e63946; text-transform: uppercase; border-top: 1px solid #e2e8f0; padding-top: 5px; }
        `;
    }
    // --- 2. LAYOUT: 2 POR PÁGINA (A4 Retrato) ---
    else if (layoutOpcao === 'a4_2') {
        htmlStr += `
            @media print { @page { size: A4 portrait; margin: 15mm; } }
            .placa-wrapper { width: 100%; height: 130mm; border: 4px solid #1e293b; border-radius: 20px; padding: 15mm 10mm; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; margin-bottom: 10mm; page-break-inside: avoid; }
            .placa-wrapper:nth-child(2n) { page-break-after: always; }
            .agradecimento { font-size: 16px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 8px; }
            .titulo { font-size: 40px; font-weight: 900; color: #e63946; text-transform: uppercase; line-height: 1; margin-bottom: 15px; }
            .evento-nome { font-size: 16px; font-weight: 900; background-color: #1e293b; color: #fff; padding: 8px 30px; border-radius: 50px; text-transform: uppercase; margin-bottom: 25px; }
            .grid-patrocinadores { display: flex; flex-wrap: wrap; justify-content: center; gap: 15px; width: 100%; }
            .patrocinador-card { background: #f8fafc; border: 3px solid #f1f5f9; border-radius: 15px; padding: 15px; min-width: 45%; flex: 1; }
            .patrocinador-nome { font-size: 18px; font-weight: 900; color: #0f172a; margin-bottom: 5px; }
            .patrocinador-cota { font-size: 12px; font-weight: 900; color: #e63946; text-transform: uppercase; border-top: 2px solid #e2e8f0; padding-top: 5px; }
        `;
    }
    // --- 3. LAYOUT: TÉRMICA 80MM ---
    else if (layoutOpcao === 'termica_80') {
        htmlStr += `
            @media print { @page { margin: 0; size: ${cfg.pageWidth} auto; } }
            body { width: ${cfg.bodyWidth}; margin: 0 auto; color: #000 !important; font-family: 'Courier New', Courier, monospace; }
            .placa-wrapper { width: 100%; text-align: center; padding: 10mm 2mm; border-bottom: 2px dashed #000; page-break-after: always; break-after: page; }
            .placa-wrapper:last-child { border-bottom: none; page-break-after: avoid; }
            .agradecimento { font-size: 11px; font-weight: 900; text-transform: uppercase; margin-bottom: 3px; color: #000 !important; }
            .titulo { font-size: 22px; font-weight: 900; text-transform: uppercase; line-height: 1; margin-bottom: 10px; color: #000 !important; }
            .evento-nome { font-size: 14px; font-weight: 900; border: 3px solid #000; padding: 5px 10px; text-transform: uppercase; margin-bottom: 15px; display: inline-block; color: #000 !important; }
            .grid-patrocinadores { display: flex; flex-direction: column; width: 100%; gap: 5px; }
            .patrocinador-card { border: 2px solid #000; border-radius: 8px; padding: 8px 2px; width: 100%; }
            .patrocinador-nome { font-size: 16px; font-weight: 900; color: #000 !important; margin-bottom: 3px; line-height: 1.1; }
            .patrocinador-cota { font-size: 11px; font-weight: 900; text-transform: uppercase; border-top: 1px dashed #000; padding-top: 3px; color: #000 !important; }
        `;
    }

    htmlStr += `
        </style>
    </head>
    <body>
    `;

    // Gera a quantidade de placas solicitada pelo usuário
    for (let i = 0; i < qtdImpressoes; i++) {
        htmlStr += `
        <div class="placa-wrapper">
            <div class="agradecimento">Nosso muito obrigado aos</div>
            <div class="titulo">Patrocinadores</div>
            <div class="evento-nome">${nomeEvento}</div>

            <div class="grid-patrocinadores">
                ${htmlPatrocinadores}
            </div>

            ${layoutOpcao === 'termica_80' ? `<div style="font-size: 16px; line-height: 1.5; color: #fff;">&nbsp;<br>&nbsp;<br>&nbsp;</div>` : ''}
        </div>`;
    }

    htmlStr += `</body></html>`;

    // Dispara para o Motor Universal
    if (typeof window.imprimirConteudoIframe === "function") {
        window.imprimirConteudoIframe(htmlStr, `Patrocinadores_${nomeEvento}`);
    } else {
        const win = window.open("", "_blank");
        win.document.write(htmlStr);
        win.document.close();
        setTimeout(() => {
            win.print();
            win.close();
        }, 800);
    }
};

// Controle do Modal
window.abrirModalImpressaoPlacas = function () {
  document.getElementById("modal-imprimir-placas").classList.remove("hidden");
  document.getElementById("modal-imprimir-placas").classList.add("flex");
};

window.fecharModalImpressaoPlacas = function () {
  document.getElementById("modal-imprimir-placas").classList.add("hidden");
  document.getElementById("modal-imprimir-placas").classList.remove("flex");
};

// Lógica de Impressão
window.gerarPlacasA5 = async function (tipo, formatoSaida, layoutOpcao = 'a4_4') {
  if (!window.eventoIdAtivo) return;

  if (typeof window.fecharModalImpressaoPlacas === "function") {
    window.fecharModalImpressaoPlacas();
  }

  try {
    if (window.showToast) window.showToast("Buscando dados...", "aviso");

    const [{ data: evento, error: errEv }, { data: reservas, error: errRes }] =
      await Promise.all([
        _supabase.from("eventos").select("quantidade_mesas").eq("id", window.eventoIdAtivo).single(),
        _supabase.from("reservas_evento").select("*").eq("evento_id", String(window.eventoIdAtivo)),
      ]);

    if (errEv) throw errEv;
    if (errRes) throw errRes;

    const totalMesas = evento ? parseInt(evento.quantidade_mesas) || 0 : 0;

    if ((tipo === "disponiveis" || tipo === "todas") && totalMesas <= 0) {
      if (window.showToast) window.showToast("Defina a capacidade primeiro.", "erro");
      return;
    }

    let mesasReservadas = [];
    reservas.forEach((res) => {
      if (Array.isArray(res.mesas)) {
        let nomeLimpo = res.cliente_nome ? res.cliente_nome.replace(/\s*\(.*?\)/g, "").trim() : "";
        res.mesas.forEach((mesa) => {
          mesasReservadas.push({ mesa: parseInt(mesa), cliente: nomeLimpo, reservado: true });
        });
      }
    });

    let listaFinal = [];
    if (tipo === "reservadas") {
      listaFinal = mesasReservadas.sort((a, b) => a.mesa - b.mesa);
    } else if (tipo === "disponiveis") {
      for (let i = 1; i <= totalMesas; i++) {
        let estaReservada = mesasReservadas.find((r) => r.mesa === i);
        if (!estaReservada) listaFinal.push({ mesa: i, cliente: "", reservado: false });
      }
    } else if (tipo === "todas") {
      for (let i = 1; i <= totalMesas; i++) {
        let estaReservada = mesasReservadas.find((r) => r.mesa === i);
        listaFinal.push(estaReservada ? estaReservada : { mesa: i, cliente: "", reservado: false });
      }
    }

    if (listaFinal.length === 0) {
      if (window.showToast) window.showToast("Nenhuma mesa encontrada.", "erro");
      return;
    }

    const dataHoje = new Date().toLocaleDateString("pt-BR").replace(/\//g, "-");
    const nomeDoArquivo = formatoSaida === "pdf" ? `Placas_${tipo}_${dataHoje}` : "Impressao_Placas";
    const tituloOriginal = document.title;
    document.title = nomeDoArquivo;

    let iframeAntigo = document.getElementById("iframe-impressao-placas");
    if (iframeAntigo) iframeAntigo.remove();

    let iframe = document.createElement("iframe");
    iframe.id = "iframe-impressao-placas";
    iframe.style.position = "absolute";
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const baseUrl = window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf("/") + 1);
    const cfg = typeof obterConfiguracoesImpressora === 'function' ? obterConfiguracoesImpressora() : { pageWidth: '80mm', bodyWidth: '72mm' };

    let htmlStr = `<!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <base href="${baseUrl}">
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #fff; color: #000; }
    `;

    if (layoutOpcao === 'a4_4') {
        htmlStr += `
            @page { size: A4 portrait; margin: 0; }
            body { width: 210mm; }
            .folha-a4 { width: 210mm; height: 296mm; padding: 10mm; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 15px; page-break-after: always; margin: 0 auto; }
            .folha-a4:last-child { page-break-after: auto; }

            .card { border: 5px solid #000; border-radius: 16px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center; padding: 25px 20px; overflow: hidden; background: #fff; box-sizing: border-box; }

            .badge { background-color: #000; color: #fff; padding: 8px 25px; border-radius: 50px; font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: 4px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

            .meio-container { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; width: 100%; padding: 0 5px; }

            /* Margem aumentada de 15px para 35px para criar a "quebra de linha" visual */
            .mesa { font-size: 48px; font-weight: 900; line-height: 1; color: #000; white-space: nowrap; margin-bottom: 35px; }
            .cliente-label { font-size: 13px; color: #000; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 8px; font-weight: bold; opacity: 0.8; }

            .cliente-nome { font-weight: 900; color: #000; text-transform: uppercase; word-break: keep-all; overflow-wrap: normal; max-width: 100%; line-height: 1.05; }

            .logo-rodape { display: flex; flex-direction: column; align-items: center; gap: 6px; width: 100%; }
            .logo-rodape img { height: 65px; width: 65px; object-fit: cover; border-radius: 50%; border: 3px solid #000; }
            .logo-texto { font-size: 12px; font-weight: 900; color: #000; text-transform: uppercase; letter-spacing: 2px; }
        `;
    } else if (layoutOpcao === 'a4_2') {
        htmlStr += `
            @page { size: A4 portrait; margin: 0; }
            body { width: 210mm; }
            .folha-a4 { width: 210mm; height: 296mm; padding: 15mm; display: grid; grid-template-columns: 1fr; grid-template-rows: 1fr 1fr; gap: 20px; page-break-after: always; margin: 0 auto; }
            .folha-a4:last-child { page-break-after: auto; }

            .card { border: 6px solid #000; border-radius: 20px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center; padding: 45px 30px; overflow: hidden; background: #fff; box-sizing: border-box; }

            .badge { background-color: #000; color: #fff; padding: 10px 35px; border-radius: 50px; font-size: 16px; font-weight: 900; text-transform: uppercase; letter-spacing: 5px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

            .meio-container { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; width: 100%; padding: 0 10px; }

            /* Margem aumentada de 25px para 55px */
            .mesa { font-size: 65px; font-weight: 900; line-height: 1; color: #000; white-space: nowrap; margin-bottom: 55px; }
            .cliente-label { font-size: 16px; color: #000; text-transform: uppercase; letter-spacing: 4px; margin-bottom: 12px; font-weight: bold; opacity: 0.8; }

            .cliente-nome { font-weight: 900; color: #000; text-transform: uppercase; word-break: keep-all; overflow-wrap: normal; max-width: 100%; line-height: 1.05; }

            .logo-rodape { display: flex; flex-direction: column; align-items: center; gap: 8px; width: 100%; }
            .logo-rodape img { height: 90px; width: 90px; object-fit: cover; border-radius: 50%; border: 4px solid #000; }
            .logo-texto { font-size: 14px; font-weight: 900; color: #000; text-transform: uppercase; letter-spacing: 2px; }
        `;
    } else if (layoutOpcao === 'termica_80') {
        htmlStr += `
            @media print { @page { margin: 0; size: ${cfg.pageWidth} auto; } }
            body { width: ${cfg.bodyWidth}; margin: 0 auto; color: #000 !important; background: #fff; }
            .wrapper-termico { width: 100%; padding: 6mm 0; page-break-after: always; break-after: page; box-sizing: border-box; }
            .wrapper-termico:last-child { page-break-after: avoid; }

            .card { border: 4px solid #000; border-radius: 16px; display: block; text-align: center; padding: 25px 15px; width: 96%; margin: 0 auto; box-sizing: border-box; }
            .badge { background-color: #000; color: #fff !important; padding: 6px 20px; border-radius: 50px; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 3px; display: inline-block; margin-bottom: 15px; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

            .meio-container { margin: 10px 0 20px 0; }

            /* Margem aumentada de 10px para 22px na térmica */
            .mesa { font-size: 28px; font-weight: 900; margin-bottom: 22px; line-height: 1; color: #000 !important; white-space: nowrap; }
            .cliente-label { font-size: 11px; color: #000 !important; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px; font-weight: bold; display: block; opacity: 0.8; }

            .cliente-nome { font-weight: 900; color: #000 !important; text-transform: uppercase; word-break: keep-all; overflow-wrap: normal; max-width: 95%; margin: 0 auto; display: block; line-height: 1.1; }

            .logo-rodape { text-align: center; width: 100%; display: block; margin-top: 15px; }
            .logo-rodape img { height: 42px; width: 42px; object-fit: cover; border-radius: 50%; border: 2px solid #000; display: block; margin: 0 auto 5px auto; }
            .logo-texto { font-size: 11px; font-weight: 900; color: #000 !important; text-transform: uppercase; letter-spacing: 1px; display: block; }
        `;
    }

    htmlStr += `</style></head><body>`;

    const calcularTamanhoFonte = (texto, layout) => {
        if (layout === 'termica_80') return '24px';

        const palavras = texto.split(' ');
        const maiorPalavra = Math.max(...palavras.map(p => p.length));
        const totalLetras = texto.length;

        if (layout === 'a4_4') {
            if (maiorPalavra >= 12) return '30px';
            if (maiorPalavra >= 8) return '38px';
            if (totalLetras <= 12) return '46px';
            return '34px';
        }

        if (layout === 'a4_2') {
            if (maiorPalavra >= 12) return '50px';
            if (maiorPalavra >= 8) return '60px';
            if (totalLetras <= 12) return '75px';
            return '55px';
        }
    };

    let passoIncremento = layoutOpcao === 'a4_4' ? 4 : (layoutOpcao === 'a4_2' ? 2 : 1);

    for (let i = 0; i < listaFinal.length; i += passoIncremento) {
      const grupoMesas = listaFinal.slice(i, i + passoIncremento);
      if (layoutOpcao !== 'termica_80') htmlStr += `<div class="folha-a4">`;

      grupoMesas.forEach((item) => {
        const nomeResp = item.cliente.toUpperCase();
        const tamFonte = calcularTamanhoFonte(nomeResp, layoutOpcao);

        const badgeHtml = item.reservado
            ? `<div class="badge">RESERVADO</div>`
            : `<div class="badge" style="opacity: 0;">LIVRE</div>`;

        const clienteHtml = item.reservado ? `
            <div class="cliente-label">Responsável</div>
            <div class="cliente-nome" style="font-size: ${tamFonte} !important;">${nomeResp}</div>
        ` : "";

        if (layoutOpcao === 'termica_80') {
            htmlStr += `
                <div class="wrapper-termico">
                    <div class="card">
                        ${badgeHtml}
                        <div class="meio-container">
                            <div class="mesa">MESA ${String(item.mesa).padStart(2, "0")}</div>
                            ${clienteHtml}
                        </div>
                        <div class="logo-rodape">
                            <img src="img/logo.jpg?v=2" onerror="this.style.display='none'">
                            <span class="logo-texto">ESPETINHO & CIA</span>
                        </div>
                    </div>
                    <div style="font-size: 16px; line-height: 1.5; color: #fff;">&nbsp;<br>&nbsp;<br>&nbsp;</div>
                </div>
            `;
        } else {
            htmlStr += `
                <div class="card">
                    ${badgeHtml}
                    <div class="meio-container">
                        <div class="mesa">MESA ${String(item.mesa).padStart(2, "0")}</div>
                        ${clienteHtml}
                    </div>
                    <div class="logo-rodape">
                        <img src="img/logo.jpg?v=2" onerror="this.style.display='none'">
                        <span class="logo-texto">ESPETINHO & CIA</span>
                    </div>
                </div>
            `;
        }
      });

      if (layoutOpcao !== 'termica_80') htmlStr += `</div>`;
    }

    htmlStr += `</body></html>`;

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(htmlStr);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => { document.title = tituloOriginal; }, 1000);
      if (window.showToast) window.showToast("Lote de placas gerado com sucesso!", "sucesso");
    }, 1500);
  } catch (error) {
    console.error(error);
    if (window.showToast) window.showToast("Erro ao processar a base de dados.", "erro");
  }
};

window.imprimirPlacaPatrocinadores = function (listaSelecionada = null, layoutOpcao = 'a4_4') {
    const nomes = listaSelecionada || window.patrocinadoresEventoAtivo || [];
    if (nomes.length === 0) return alert("Nenhum patrocinador para imprimir!");

    const nomeEvento = window.nomeEventoAtivo || "ESPETINHO & CIA";
    const baseUrl = window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf("/") + 1);

    const cfg = typeof obterConfiguracoesImpressora === 'function' ? obterConfiguracoesImpressora() : { pageWidth: '80mm', bodyWidth: '72mm' };

    let htmlStr = `<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <base href="${baseUrl}">
        <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #fff; color: #000; }
    `;

    if (layoutOpcao === 'a4_4') {
        htmlStr += `
            @page { size: A4 portrait; margin: 0; }
            body { width: 210mm; }
            .folha-a4 { width: 210mm; height: 296mm; padding: 10mm; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 15px; page-break-after: always; margin: 0 auto; box-sizing: border-box; }
            .folha-a4:last-child { page-break-after: auto; }

            .card { border: 5px solid #000; border-radius: 16px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center; padding: 30px 20px; overflow: hidden; background: #fff; box-sizing: border-box; }

            .badge { background-color: #000; color: #fff; padding: 8px 25px; border-radius: 50px; font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: 4px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

            .meio-container { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; width: 100%; padding: 0 5px; }

            /* TRAVA ANTI-QUEBRA DE PALAVRA APLICADA AQUI */
            .patrocinador-nome { font-weight: 900; color: #000; text-transform: uppercase; word-break: keep-all; overflow-wrap: normal; max-width: 100%; line-height: 1.1; }

            .cota-badge { border: 2px solid #000; color: #000; padding: 6px 18px; border-radius: 8px; font-size: 13px; font-weight: 900; letter-spacing: 2px; margin-top: 15px; text-transform: uppercase; }

            .logo-rodape { display: flex; flex-direction: column; align-items: center; gap: 6px; width: 100%; }
            .logo-rodape img { height: 75px; width: 75px; object-fit: cover; border-radius: 50%; border: 3px solid #000; }
            .logo-texto { font-size: 12px; font-weight: 900; color: #000; text-transform: uppercase; letter-spacing: 2px; }
        `;
    } else if (layoutOpcao === 'a4_2') {
        htmlStr += `
            @page { size: A4 portrait; margin: 0; }
            body { width: 210mm; }
            .folha-a4 { width: 210mm; height: 296mm; padding: 15mm; display: grid; grid-template-columns: 1fr; grid-template-rows: 1fr 1fr; gap: 20px; page-break-after: always; margin: 0 auto; box-sizing: border-box; }
            .folha-a4:last-child { page-break-after: auto; }

            .card { border: 6px solid #000; border-radius: 20px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center; padding: 50px 30px; overflow: hidden; background: #fff; box-sizing: border-box; }

            .badge { background-color: #000; color: #fff; padding: 10px 35px; border-radius: 50px; font-size: 16px; font-weight: 900; text-transform: uppercase; letter-spacing: 5px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

            .meio-container { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; width: 100%; padding: 0 10px; }

            /* TRAVA ANTI-QUEBRA DE PALAVRA APLICADA AQUI */
            .patrocinador-nome { font-weight: 900; color: #000; text-transform: uppercase; word-break: keep-all; overflow-wrap: normal; max-width: 100%; line-height: 1.1; }

            .cota-badge { border: 3px solid #000; color: #000; padding: 8px 24px; border-radius: 10px; font-size: 18px; font-weight: 900; letter-spacing: 3px; margin-top: 25px; text-transform: uppercase; }

            .logo-rodape { display: flex; flex-direction: column; align-items: center; gap: 8px; width: 100%; }
            .logo-rodape img { height: 110px; width: 110px; object-fit: cover; border-radius: 50%; border: 4px solid #000; }
            .logo-texto { font-size: 15px; font-weight: 900; color: #000; text-transform: uppercase; letter-spacing: 2px; }
        `;
    } else if (layoutOpcao === 'termica_80') {
        htmlStr += `
            @media print { @page { margin: 0; size: ${cfg.pageWidth} auto; } }
            body { width: ${cfg.bodyWidth}; margin: 0 auto; color: #000 !important; background: #fff; }
            .wrapper-termico { width: 100%; padding: 6mm 0; page-break-after: always; break-after: page; box-sizing: border-box; }
            .wrapper-termico:last-child { page-break-after: avoid; }

            .card { border: 4px solid #000; border-radius: 16px; display: block; text-align: center; padding: 25px 15px; width: 96%; margin: 0 auto; box-sizing: border-box; }
            .badge { background-color: #000; color: #fff !important; padding: 6px 20px; border-radius: 50px; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 3px; display: inline-block; margin-bottom: 20px; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

            .meio-container { margin: 10px 0 25px 0; }
            /* TRAVA ANTI-QUEBRA DE PALAVRA APLICADA AQUI */
            .patrocinador-nome { font-weight: 900; color: #000 !important; text-transform: uppercase; word-break: keep-all; overflow-wrap: normal; line-height: 1.1; }

            .cota-badge { border-top: 2px dashed #000; padding-top: 8px; margin-top: 10px; font-size: 12px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; display: inline-block; color: #000 !important; }

            .logo-rodape { text-align: center; width: 100%; display: block; margin-top: 15px; }
            .logo-rodape img { height: 42px; width: 42px; object-fit: cover; border-radius: 50%; border: 2px solid #000; display: block; margin: 0 auto 5px auto; }
            .logo-texto { font-size: 11px; font-weight: 900; color: #000 !important; text-transform: uppercase; letter-spacing: 1px; display: block; }
        `;
    }

    htmlStr += `</style></head><body>`;

    // MOTOR INTELIGENTE: Mede a maior palavra e o tamanho total para estourar a fonte com segurança
    const calcularTamanhoFontePatroc = (texto, layout) => {
        if (layout === 'termica_80') return '26px';

        // Separa o nome em palavras para descobrir o tamanho do maior bloco indivisível
        const palavras = texto.split(' ');
        const maiorPalavra = Math.max(...palavras.map(p => p.length));
        const totalLetras = texto.length;

        if (layout === 'a4_4') {
            // Se tiver uma palavra monstruosa tipo "SOBRANCELHAS" (12 letras)
            if (maiorPalavra >= 12) return '35px';
            // Palavras médias ("MARCINHA", "SAMUEL")
            if (maiorPalavra >= 8) return '45px';
            // Frases curtas e nomes pequenos explodem de tamanho
            if (totalLetras <= 12) return '60px';
            return '40px';
        }

        if (layout === 'a4_2') {
            if (maiorPalavra >= 12) return '62px';
            if (maiorPalavra >= 8) return '75px';
            if (totalLetras <= 12) return '95px';
            return '68px';
        }
    };

    let passoIncremento = layoutOpcao === 'a4_4' ? 4 : (layoutOpcao === 'a4_2' ? 2 : 1);

    for (let i = 0; i < nomes.length; i += passoIncremento) {
        const grupo = nomes.slice(i, i + passoIncremento);
        if (layoutOpcao !== 'termica_80') htmlStr += `<div class="folha-a4">`;

        grupo.forEach((nome) => {
            const nomeFormatado = typeof nome === "object" ? nome.nome : nome;
            const nomeUpper = nomeFormatado.toUpperCase().trim();

            const tamFonte = calcularTamanhoFontePatroc(nomeUpper, layoutOpcao);

            const cotaExtra = typeof nome === "object" && nome.cota
                ? `<div class="cota-badge">COTA ${nome.cota.toUpperCase()}</div>`
                : '';

            if (layoutOpcao === 'termica_80') {
                htmlStr += `
                    <div class="wrapper-termico">
                        <div class="card">
                            <div class="badge">Patrocinador</div>
                            <div class="meio-container">
                                <div class="patrocinador-nome" style="font-size: ${tamFonte} !important;">
                                    ${nomeUpper}
                                </div>
                                ${cotaExtra}
                            </div>
                            <div class="logo-rodape">
                                <img src="img/logo.jpg?v=2" onerror="this.style.display='none'">
                                <span class="logo-texto">ESPETINHO & CIA</span>
                            </div>
                        </div>
                        <div style="font-size: 16px; line-height: 1.5; color: #fff;">&nbsp;<br>&nbsp;<br>&nbsp;</div>
                    </div>
                `;
            } else {
                htmlStr += `
                    <div class="card">
                        <div class="badge">Patrocinador</div>
                        <div class="meio-container">
                            <div class="patrocinador-nome" style="font-size: ${tamFonte} !important;">
                                ${nomeUpper}
                            </div>
                            ${cotaExtra}
                        </div>
                        <div class="logo-rodape">
                            <img src="img/logo.jpg?v=2" onerror="this.style.display='none'">
                            <span class="logo-texto">ESPETINHO & CIA</span>
                        </div>
                    </div>
                `;
            }
        });

        if (layoutOpcao !== 'termica_80') htmlStr += `</div>`;
    }

    htmlStr += `</body></html>`;

    if (typeof window.imprimirConteudoIframe === "function") {
        window.imprimirConteudoIframe(htmlStr, "Placas_Patrocinadores");
    } else {
        const win = window.open("", "_blank");
        win.document.write(htmlStr);
        win.document.close();
        setTimeout(() => { win.print(); win.close(); }, 800);
    }
};
