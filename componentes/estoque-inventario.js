/* =================================================================================
   MÓDULO: INVENTÁRIO VIA PLANILHA (item #13)
   Exporta os produtos com controle de estoque pra uma planilha (contagem
   física em branco), o usuário preenche offline e reimporta — o sistema
   calcula a diferença, registra as movimentações de entrada/saída e
   agrupa tudo num "lote" de inventário (tabela inventarios) pra ficar
   rastreável, diferente de um ajuste manual avulso.
   ================================================================================= */

const COLUNAS_MODELO_INVENTARIO = ['id', 'nome', 'categoria', 'estoque_atual', 'contagem_fisica'];

window.linhasImportacaoInventario = [];

window.exportarInventarioParaExcel = async function () {
    if (typeof XLSX === 'undefined' || typeof _supabase === 'undefined') return;

    try {
        const v3Ativo = localStorage.getItem('v3_estoque_transacional') === 'true';

        if (v3Ativo) {
            if (!window.estoqueAdapterV3) {
                throw new Error('Adaptador de estoque V3 não carregado.');
            }

            const contexto = await window.organizacaoServiceV3.obterContextoAtual();
            let contextoFinal = contexto;

            if (!contextoFinal.unidadeId && contextoFinal.unidades.length === 1) {
                contextoFinal = await window.organizacaoServiceV3.definirUnidadeAtual(contextoFinal.unidades[0].id);
            }

            if (!contextoFinal.unidadeId) {
                throw new Error(
                    contextoFinal.unidades.length > 1
                        ? 'Selecione a unidade antes de exportar o inventário.'
                        : 'Nenhuma unidade ativa disponível para o inventário.'
                );
            }

            if (typeof _supabaseV3 === 'undefined' || !_supabaseV3) {
                throw new Error('Banco V3 não configurado.');
            }

            const { data: produtos, error } = await _supabaseV3
                .from('produtos')
                .select('id, nome, categoria')
                .eq('controlar_estoque', true)
                .eq('empresa_id', contextoFinal.empresaId)
                .order('nome');

            if (error) throw error;

            const ids = (produtos || []).map((p) => p.id);
            const saldoResult = await window.estoqueAdapterV3.obterSaldos(ids);
            if (!saldoResult.handled) throw new Error('Não foi possível consultar o estoque V3.');

            const saldosPorProduto = new Map(
                (saldoResult.data || []).map((item) => [item.produto_id, Number(item.saldo || 0)])
            );

            const linhas = (produtos || []).map((p) => ({
                id: p.id,
                nome: p.nome,
                categoria: p.categoria,
                estoque_atual: saldosPorProduto.get(p.id) || 0,
                contagem_fisica: ''
            }));

            const planilha = XLSX.utils.json_to_sheet(linhas, { header: COLUNAS_MODELO_INVENTARIO });
            const livro = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(livro, planilha, 'Inventario');
            XLSX.writeFile(
                livro,
                `inventario_${contextoFinal.unidade.nome}_${new Date().toISOString().slice(0, 10)}.xlsx`
            );
            return;
        }

        const { data: produtos, error } = await _supabase
            .from('produtos')
            .select('id, nome, categoria, estoque_atual')
            .eq('controlar_estoque', true)
            .order('nome');
        if (error) throw error;

        if (!produtos || produtos.length === 0) {
            if (typeof showToast === 'function') showToast('NENHUM PRODUTO COM CONTROLE DE ESTOQUE', 'aviso');
            return;
        }

        const linhas = produtos.map((p) => ({
            id: p.id,
            nome: p.nome,
            categoria: p.categoria,
            estoque_atual: p.estoque_atual || 0,
            contagem_fisica: ''
        }));

        const planilha = XLSX.utils.json_to_sheet(linhas, { header: COLUNAS_MODELO_INVENTARIO });
        const livro = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(livro, planilha, 'Inventario');
        XLSX.writeFile(livro, `inventario_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e) {
        console.error('Erro ao exportar inventário:', e);
        if (typeof showToast === 'function') showToast('ERRO AO EXPORTAR INVENTÁRIO', 'erro');
    }
};

window.abrirImportacaoInventario = function () {
    document.getElementById('passo-selecao-inventario').classList.remove('hidden');
    document.getElementById('passo-previa-inventario').classList.add('hidden');
    const inputArquivo = document.getElementById('input-arquivo-inventario');
    if (inputArquivo) inputArquivo.value = '';
    window.linhasImportacaoInventario = [];

    const modal = document.getElementById('modal-importacao-inventario');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

window.fecharImportacaoInventario = function () {
    const modal = document.getElementById('modal-importacao-inventario');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    window.linhasImportacaoInventario = [];
};

window.handleArquivoImportacaoInventario = async function (event) {
    const arquivo = event.target.files[0];
    if (!arquivo || typeof XLSX === 'undefined' || typeof _supabase === 'undefined') return;

    const leitor = new FileReader();
    leitor.onload = async function (e) {
        try {
            const dados = new Uint8Array(e.target.result);
            const livro = XLSX.read(dados, { type: 'array' });
            const primeiraAba = livro.Sheets[livro.SheetNames[0]];
            const linhasBrutas = XLSX.utils.sheet_to_json(primeiraAba, { defval: '' });

            const ids = linhasBrutas.map((l) => parseInt(l.id)).filter((id) => !isNaN(id));
            const v3Ativo = localStorage.getItem('v3_estoque_transacional') === 'true';

            let produtosBanco = [];

            if (v3Ativo) {
                if (typeof _supabaseV3 === 'undefined' || !_supabaseV3) {
                    throw new Error('Banco V3 não configurado.');
                }

                if (!window.estoqueAdapterV3) {
                    throw new Error('Adaptador de estoque V3 não carregado.');
                }

                const { data, error } = await _supabaseV3
                    .from('produtos')
                    .select('id, nome, controlar_estoque')
                    .in('id', ids);

                if (error) throw error;
                produtosBanco = data || [];

                const saldoResult = await window.estoqueAdapterV3.obterSaldos(ids);
                if (!saldoResult.handled) throw new Error('Não foi possível consultar o estoque V3.');

                const saldosPorProduto = new Map(
                    (saldoResult.data || []).map((item) => [item.produto_id, Number(item.saldo || 0)])
                );

                for (const produto of produtosBanco) {
                    produto.estoque_atual = saldosPorProduto.get(produto.id) || 0;
                }
            } else {
                const { data, error } = await _supabase
                    .from('produtos')
                    .select('id, nome, controlar_estoque, estoque_atual')
                    .in('id', ids);

                if (error) throw error;
                produtosBanco = data || [];
            }

            const produtosPorId = new Map(produtosBanco.map((p) => [p.id, p]));

            window.linhasImportacaoInventario = linhasBrutas.map((linha) => window.validarLinhaImportacaoInventario(linha, produtosPorId));
            window.renderizarPreviaImportacaoInventario();

            document.getElementById('passo-selecao-inventario').classList.add('hidden');
            document.getElementById('passo-previa-inventario').classList.remove('hidden');
        } catch (err) {
            console.error('Erro ao ler planilha de inventário:', err);
            if (typeof showToast === 'function') showToast('ARQUIVO INVÁLIDO OU CORROMPIDO', 'erro');
        }
    };
    leitor.readAsArrayBuffer(arquivo);
};

window.validarLinhaImportacaoInventario = function (linha, produtosPorId) {
    const erros = [];
    const id = parseInt(linha.id);

    const produto = !isNaN(id) ? produtosPorId.get(id) : null;
    if (isNaN(id) || !produto) {
        erros.push('Produto não encontrado (id inválido ou apagado)');
    } else if (produto.controlar_estoque !== true) {
        erros.push('Este produto não controla estoque');
    }

    let contagem = null;
    if (linha.contagem_fisica === '' || linha.contagem_fisica === undefined || linha.contagem_fisica === null) {
        erros.push('Contagem física em branco');
    } else {
        contagem = parseFloat(String(linha.contagem_fisica).replace(',', '.'));
        if (isNaN(contagem) || contagem < 0) erros.push('Contagem física inválida');
    }

    const estoqueBanco = produto ? parseFloat(produto.estoque_atual || 0) : 0;
    const diferenca = contagem !== null && !isNaN(contagem) ? contagem - estoqueBanco : 0;

    return {
        valido: erros.length === 0,
        erros,
        dados: {
            produto_id: !isNaN(id) ? id : null,
            nome: produto ? produto.nome : (linha.nome || '(DESCONHECIDO)'),
            estoque_banco: estoqueBanco,
            contagem_fisica: contagem,
            diferenca
        }
    };
};

window.renderizarPreviaImportacaoInventario = function () {
    const lista = document.getElementById('lista-previa-inventario');
    const resumo = document.getElementById('resumo-previa-inventario');
    const btnConfirmar = document.getElementById('btn-confirmar-inventario');
    if (!lista || !resumo) return;

    const linhas = window.linhasImportacaoInventario || [];
    const validas = linhas.filter((l) => l.valido);
    const invalidas = linhas.length - validas.length;
    const comAjuste = validas.filter((l) => l.dados.diferenca !== 0).length;

    resumo.innerHTML = `<span class="text-emerald-500">${validas.length} válida(s)</span> <span class="text-blue-500 ml-2">${comAjuste} com ajuste</span>${invalidas > 0 ? ` <span class="text-red-500 ml-2">${invalidas} com erro</span>` : ''}`;

    lista.innerHTML = linhas.map((l) => {
        if (!l.valido) {
            return `
            <div class="p-3 rounded-xl border-2 border-red-100 dark:border-red-800/50 bg-red-50/50 dark:bg-red-900/10">
                <span class="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase truncate block">${l.dados.nome}</span>
                <p class="text-[8px] font-bold text-red-500 uppercase mt-0.5">${l.erros.join(' · ')}</p>
            </div>`;
        }

        const diff = l.dados.diferenca;
        const corDiff = diff > 0 ? 'text-emerald-500' : diff < 0 ? 'text-red-500' : 'text-slate-400';
        const rotuloDiff = diff > 0 ? `+${diff}` : diff;

        return `
        <div class="p-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2">
            <div class="min-w-0">
                <span class="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase truncate block">${l.dados.nome}</span>
                <p class="text-[8px] font-bold text-slate-400 uppercase mt-0.5">SISTEMA: ${l.dados.estoque_banco} → CONTAGEM: ${l.dados.contagem_fisica}</p>
            </div>
            <span class="text-xs font-black ${corDiff} shrink-0">${rotuloDiff}</span>
        </div>`;
    }).join('') || '<p class="text-[9px] text-slate-400 italic px-1">Nenhuma linha encontrada na planilha.</p>';

    if (btnConfirmar) btnConfirmar.disabled = validas.length === 0;
};

window.confirmarImportacaoInventario = async function () {
    const linhasValidas = (window.linhasImportacaoInventario || []).filter((l) => l.valido).map((l) => l.dados);
    if (linhasValidas.length === 0 || typeof _supabase === 'undefined') return;

    const linhasComAjuste = linhasValidas.filter((l) => l.diferenca !== 0);
    const usuario = localStorage.getItem('userName') || 'Admin';
    const btnConfirmar = document.getElementById('btn-confirmar-inventario');

    if (typeof setLoading === 'function') setLoading('btn-confirmar-inventario', true);
    else if (btnConfirmar) btnConfirmar.disabled = true;

    try {
        const v3Ativo = localStorage.getItem('v3_estoque_transacional') === 'true';

        if (v3Ativo) {
            if (!window.estoqueAdapterV3) {
                throw new Error('Adaptador de estoque V3 não carregado.');
            }

            const linhasV3 = linhasValidas.map((linha) => ({
                id: linha.produto_id,
                contagem_fisica: linha.contagem_fisica
            }));

            const resultadoV3 = await window.estoqueAdapterV3.concluirInventario({
                linhas: linhasV3
            });

            if (!resultadoV3.handled) {
                throw new Error('Inventário V3 não processado.');
            }

            if (typeof showToast === 'function') {
                showToast(`INVENTÁRIO CONCLUÍDO! ${resultadoV3.data?.total_ajustados || 0} PRODUTO(S) AJUSTADO(S).`);
            }

            window.fecharImportacaoInventario();
            if (typeof renderizarEstoque === 'function') renderizarEstoque();
            return;
        }

        const { data: inventario, error: errInventario } = await _supabase
            .from('inventarios')
            .insert([{
                usuario,
                total_produtos: linhasValidas.length,
                total_ajustados: linhasComAjuste.length
            }])
            .select()
            .single();
        if (errInventario) throw errInventario;

        for (const linha of linhasComAjuste) {
            const { error: errUpdate } = await _supabase
                .from('produtos')
                .update({ estoque_atual: linha.contagem_fisica })
                .eq('id', linha.produto_id);
            if (errUpdate) throw errUpdate;

            const { error: errMov } = await _supabase.from('estoque_movimentacoes').insert([{
                produto_id: linha.produto_id,
                tipo: linha.diferenca > 0 ? 'entrada' : 'saida',
                quantidade: Math.abs(linha.diferenca),
                motivo: `INVENTÁRIO #${inventario.id} (CONTAGEM FÍSICA)`,
                usuario,
                inventario_id: inventario.id
            }]);
            if (errMov) throw errMov;
        }

        if (typeof registrarLog === 'function') {
            await registrarLog('ESTOQUE', 'INVENTÁRIO VIA PLANILHA', `LOTE #${inventario.id} | ${linhasValidas.length} PRODUTO(S) CONFERIDO(S), ${linhasComAjuste.length} AJUSTADO(S)`);
        }

        if (typeof showToast === 'function') showToast(`INVENTÁRIO CONCLUÍDO! ${linhasComAjuste.length} PRODUTO(S) AJUSTADO(S).`);
        window.fecharImportacaoInventario();
        if (typeof renderizarEstoque === 'function') renderizarEstoque();
    } catch (e) {
        console.error('Erro ao confirmar inventário:', e);
        if (typeof showToast === 'function') showToast('ERRO AO PROCESSAR INVENTÁRIO', 'erro');
    } finally {
        if (typeof setLoading === 'function') setLoading('btn-confirmar-inventario', false);
        else if (btnConfirmar) btnConfirmar.disabled = false;
    }
};
