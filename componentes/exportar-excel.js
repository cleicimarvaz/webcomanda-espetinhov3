/* =================================================================================
   MÓDULO: EXPORTAÇÃO GENÉRICA PARA EXCEL
   Generaliza o truque já usado em eventos-reservas.js (window.exportarParaExcel):
   monta uma <table> HTML e baixa como .xls via Blob — sem nenhuma biblioteca,
   funciona em qualquer navegador que já rode o resto do sistema.
   ================================================================================= */

/**
 * @param {Array<{chave: string, titulo: string}>} colunas - ordem e cabeçalho das colunas
 * @param {Array<Object>} linhas - um objeto por linha; cada valor é lido por colunas[i].chave
 * @param {string} nomeArquivo - sem extensão, ex: "relatorio_financeiro"
 */
window.exportarTabelaParaExcel = function (colunas, linhas, nomeArquivo) {
  if (!Array.isArray(colunas) || colunas.length === 0) return;

  if (!linhas || linhas.length === 0) {
    if (typeof showToast === "function") showToast("Nada para exportar.", "aviso");
    return;
  }

  let html = `
        <table border="1">
            <tr style="background-color: #059669; color: #ffffff; font-weight: bold;">
                ${colunas.map((c) => `<th>${c.titulo}</th>`).join("")}
            </tr>`;

  linhas.forEach((linha) => {
    html += `
            <tr>
                ${colunas.map((c) => `<td>${linha[c.chave] ?? ""}</td>`).join("")}
            </tr>`;
  });

  html += `</table>`;

  const blob = new Blob([html], { type: "application/vnd.ms-excel" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${nomeArquivo || "relatorio"}.xls`;
  link.click();
};
