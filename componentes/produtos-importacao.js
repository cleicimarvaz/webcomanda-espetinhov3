/* =================================================================================
   MÓDULO: IMPORTAÇÃO EM MASSA DE PRODUTOS VIA PLANILHA (P8)
   Lê um .xlsx (SheetJS), valida cada linha e exige confirmação explícita numa
   pré-visualização antes de gravar qualquer coisa no banco.
   ================================================================================= */

const CATEGORIAS_VALIDAS_IMPORTACAO = ['espetos', 'bebidas', 'cervejas', 'refeicao', 'acompanhamentos', 'combos'];
const COLUNAS_MODELO_IMPORTACAO = ['nome', 'categoria', 'preco', 'preco_custo', 'estoque_minimo', 'codigo_barras'];

window.linhasImportacaoProdutos = [];

window.abrirImportacaoProdutos = function () {
  document.getElementById('passo-selecao-importacao').classList.remove('hidden');
  document.getElementById('passo-previa-importacao').classList.add('hidden');
  const inputArquivo = document.getElementById('input-arquivo-importacao');
  if (inputArquivo) inputArquivo.value = '';
  window.linhasImportacaoProdutos = [];

  const modal = document.getElementById('modal-importacao-produtos');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  if (typeof lucide !== 'undefined') lucide.createIcons();
};

window.fecharImportacaoProdutos = function () {
  const modal = document.getElementById('modal-importacao-produtos');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  window.linhasImportacaoProdutos = [];
};

window.baixarModeloImportacaoProdutos = function () {
  if (typeof XLSX === 'undefined') return;
  const exemplo = [
    { nome: 'ESPETINHO DE CARNE', categoria: 'espetos', preco: 10, preco_custo: 5, estoque_minimo: '', codigo_barras: '' }
  ];
  const planilha = XLSX.utils.json_to_sheet(exemplo, { header: COLUNAS_MODELO_IMPORTACAO });
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, planilha, 'Produtos');
  XLSX.writeFile(livro, 'modelo-importacao-produtos.xlsx');
};

window.handleArquivoImportacaoProdutos = function (event) {
  const arquivo = event.target.files[0];
  if (!arquivo || typeof XLSX === 'undefined') return;

  const leitor = new FileReader();
  leitor.onload = function (e) {
    try {
      const dados = new Uint8Array(e.target.result);
      const livro = XLSX.read(dados, { type: 'array' });
      const primeiraAba = livro.Sheets[livro.SheetNames[0]];
      const linhasBrutas = XLSX.utils.sheet_to_json(primeiraAba, { defval: '' });

      window.linhasImportacaoProdutos = linhasBrutas.map(window.validarLinhaImportacaoProduto);
      window.renderizarPreviaImportacaoProdutos();

      document.getElementById('passo-selecao-importacao').classList.add('hidden');
      document.getElementById('passo-previa-importacao').classList.remove('hidden');
    } catch (err) {
      console.error('Erro ao ler planilha de importação:', err);
      if (typeof showToast === 'function') showToast('ARQUIVO INVÁLIDO OU CORROMPIDO', 'erro');
    }
  };
  leitor.readAsArrayBuffer(arquivo);
};

window.validarLinhaImportacaoProduto = function (linha) {
  const erros = [];

  const nome = String(linha.nome || '').trim().toUpperCase();
  if (!nome) erros.push('Nome vazio');

  const categoria = String(linha.categoria || '').trim().toLowerCase();
  if (!CATEGORIAS_VALIDAS_IMPORTACAO.includes(categoria)) {
    erros.push(`Categoria inválida (use: ${CATEGORIAS_VALIDAS_IMPORTACAO.join(', ')})`);
  }

  const preco = parseFloat(String(linha.preco).replace(',', '.'));
  if (isNaN(preco) || preco <= 0) erros.push('Preço inválido');

  let precoCusto = 0;
  if (linha.preco_custo !== '' && linha.preco_custo !== undefined && linha.preco_custo !== null) {
    precoCusto = parseFloat(String(linha.preco_custo).replace(',', '.'));
    if (isNaN(precoCusto) || precoCusto < 0) erros.push('Preço de custo inválido');
  }

  let estoqueMinimo = 0;
  if (linha.estoque_minimo !== '' && linha.estoque_minimo !== undefined && linha.estoque_minimo !== null) {
    estoqueMinimo = parseFloat(String(linha.estoque_minimo).replace(',', '.'));
    if (isNaN(estoqueMinimo) || estoqueMinimo < 0) erros.push('Estoque mínimo inválido');
  }

  const codigoBarras = String(linha.codigo_barras || '').trim() || null;

  return {
    valido: erros.length === 0,
    erros,
    dados: {
      nome,
      categoria,
      preco: isNaN(preco) ? 0 : preco,
      preco_custo: isNaN(precoCusto) ? 0 : precoCusto,
      estoque_minimo: isNaN(estoqueMinimo) ? 0 : estoqueMinimo,
      codigo_barras: codigoBarras,
      status: true,
      precisa_preparo: categoria !== 'bebidas' && categoria !== 'cervejas',
      controlar_estoque: false,
      pedir_complementos: true,
      estoque_atual: 0
    }
  };
};

window.renderizarPreviaImportacaoProdutos = function () {
  const lista = document.getElementById('lista-previa-importacao');
  const resumo = document.getElementById('resumo-previa-importacao');
  const btnConfirmar = document.getElementById('btn-confirmar-importacao');
  if (!lista || !resumo) return;

  const linhas = window.linhasImportacaoProdutos || [];
  const validas = linhas.filter((l) => l.valido).length;
  const invalidas = linhas.length - validas;

  resumo.innerHTML = `<span class="text-emerald-500">${validas} válida(s)</span>${invalidas > 0 ? ` <span class="text-red-500 ml-2">${invalidas} com erro</span>` : ''}`;

  lista.innerHTML = linhas.map((l) => `
    <div class="p-3 rounded-xl border-2 ${l.valido ? 'border-emerald-100 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-900/10' : 'border-red-100 dark:border-red-800/50 bg-red-50/50 dark:bg-red-900/10'}">
      <div class="flex items-center justify-between gap-2">
        <span class="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase truncate">${l.dados.nome || '(SEM NOME)'}</span>
        <i data-lucide="${l.valido ? 'check-circle' : 'alert-circle'}" class="w-3.5 h-3.5 shrink-0 ${l.valido ? 'text-emerald-500' : 'text-red-500'}" aria-hidden="true"></i>
      </div>
      ${l.valido
        ? `<p class="text-[8px] font-bold text-slate-400 uppercase mt-0.5">${l.dados.categoria} · R$ ${l.dados.preco.toFixed(2)}</p>`
        : `<p class="text-[8px] font-bold text-red-500 uppercase mt-0.5">${l.erros.join(' · ')}</p>`}
    </div>`).join('') || '<p class="text-[9px] text-slate-400 italic px-1">Nenhuma linha encontrada na planilha.</p>';

  if (btnConfirmar) btnConfirmar.disabled = validas === 0;
  if (typeof lucide !== 'undefined') lucide.createIcons();
};

window.confirmarImportacaoProdutos = async function () {
  const linhasValidas = (window.linhasImportacaoProdutos || []).filter((l) => l.valido).map((l) => l.dados);
  if (linhasValidas.length === 0 || typeof _supabase === 'undefined') return;

  const btnConfirmar = document.getElementById('btn-confirmar-importacao');
  if (typeof setLoading === 'function') setLoading('btn-confirmar-importacao', true);
  else if (btnConfirmar) btnConfirmar.disabled = true;

  try {
    const comCodigo = linhasValidas.filter((p) => p.codigo_barras);
    const semCodigo = linhasValidas.filter((p) => !p.codigo_barras);

    if (comCodigo.length > 0) {
      const { error } = await _supabase.from('produtos').upsert(comCodigo, { onConflict: 'codigo_barras' });
      if (error) throw error;
    }
    if (semCodigo.length > 0) {
      const { error } = await _supabase.from('produtos').insert(semCodigo);
      if (error) throw error;
    }

    if (typeof registrarLog === 'function') {
      await registrarLog('ESTOQUE', 'IMPORTAÇÃO EM MASSA', `${linhasValidas.length} PRODUTO(S) IMPORTADO(S) VIA PLANILHA`);
    }

    if (typeof showToast === 'function') showToast(`${linhasValidas.length} PRODUTO(S) IMPORTADO(S) COM SUCESSO!`);
    window.fecharImportacaoProdutos();
    if (typeof renderizarCatalogo === 'function') renderizarCatalogo();
  } catch (err) {
    console.error('Erro ao confirmar importação de produtos:', err);
    if (typeof showToast === 'function') showToast('ERRO AO IMPORTAR PRODUTOS', 'erro');
  } finally {
    if (typeof setLoading === 'function') setLoading('btn-confirmar-importacao', false);
    else if (btnConfirmar) btnConfirmar.disabled = false;
  }
};
