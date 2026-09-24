/* =================================================================================
   MÓDULO DE CATÁLOGO DE PRODUTOS E ESTOQUE AVANÇADO (COM AUDITORIA)
   ================================================================================= */

window.produtoEdicaoId = null;

// --- 1. GESTÃO DE CATÁLOGO ---

window.renderizarCatalogo = async function() {
    if (typeof _supabase === 'undefined') return;
    
    const inputPesquisa = document.getElementById('filtro-pesquisa-catalogo');
    const termoPesquisa = inputPesquisa ? inputPesquisa.value.trim() : "";
    const selectOrdem = document.getElementById('ordem-catalogo');
    const criterio = selectOrdem ? selectOrdem.value : 'nome-asc';
    const nivelUsuario = localStorage.getItem('userNivel') || 'VENDEDOR';

    let campo = 'nome';
    let ascendente = true;
    switch (criterio) {
        case 'nome-desc': ascendente = false; break;
        case 'preco-asc': campo = 'preco'; ascendente = true; break;
        case 'preco-desc': campo = 'preco'; ascendente = false; break;
        case 'categoria': campo = 'categoria'; ascendente = true; break;
        default: campo = 'nome'; ascendente = true;
    }

    const { data: pds, error } = await _supabase.from('produtos').select('*').order(campo, { ascending: ascendente });
    const container = document.getElementById('lista-catalogo');
    if (!container || error) return;

    let produtosExibicao = pds;
    if (termoPesquisa) {
        const termoLimpo = typeof removerAcentos === 'function' ? removerAcentos(termoPesquisa) : termoPesquisa.toLowerCase();
        produtosExibicao = pds.filter(p => {
            const nomeStr = typeof removerAcentos === 'function' ? removerAcentos(p.nome) : p.nome.toLowerCase();
            return nomeStr.includes(termoLimpo);
        });
    }

    // NOVO: Verifica se o botão "Ativos" está marcado e esconde os que status === false
    const chkAtivos = document.getElementById('filtro-ocultar-inativos');
    if (chkAtivos && chkAtivos.checked) {
        produtosExibicao = produtosExibicao.filter(p => p.status === true);
    }

    if (produtosExibicao.length === 0) {
        container.innerHTML = '<p class="text-center text-[10px] text-slate-400 py-10 font-black uppercase italic">Nenhum resultado.</p>';
        return;
    }

    const icons = { 'espetos': 'flame', 'cervejas': 'beer', 'bebidas': 'cup-soda', 'refeicao': 'utensils', 'acompanhamentos': 'soup', 'combos': 'package', 'doces': 'candy' };

    container.innerHTML = produtosExibicao.map(p => {
        const statusClass = p.status ? 'opacity-100' : 'opacity-50 grayscale bg-slate-50 dark:bg-slate-800';

        // Esconde os botões de edição para quem não é Administrador
        const botoesAcao = nivelUsuario.toUpperCase() === 'ADMIN' ? `
            <div class="flex gap-2 items-center">
                <button onclick="window.abrirHistoricoPrecos(${p.id}, '${(p.nome || '').replace(/'/g, "\\'")}')"aria-label="Histórico de preço" class="bg-slate-100 dark:bg-slate-800 w-9 h-9 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-700 active:scale-95 transition-all"><i data-lucide="history" class="w-4 h-4" aria-hidden="true"></i></button>
                <button onclick="prepararEdicao(${p.id})" aria-label="Editar produto" class="bg-slate-100 dark:bg-slate-800 w-9 h-9 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-700 active:scale-95 transition-all"><i data-lucide="pencil" class="w-4 h-4" aria-hidden="true"></i></button>
                <button onclick="toggleStatusProduto(${p.id}, ${!p.status})" aria-label="${p.status ? 'Desativar produto' : 'Ativar produto'}" class="bg-slate-100 dark:bg-slate-800 w-9 h-9 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-700 active:scale-95 transition-all"><i data-lucide="circle" class="w-4 h-4 ${p.status ? 'text-emerald-500 fill-emerald-500' : 'text-slate-300'}" aria-hidden="true"></i></button>
                <button onclick="confirmarExclusaoProduto(${p.id})" aria-label="Excluir produto" class="bg-red-50 dark:bg-red-900/20 text-red-500 w-9 h-9 rounded-xl flex items-center justify-center border border-red-100 dark:border-red-800/50 active:scale-95 transition-all"><i data-lucide="trash-2" class="w-4 h-4" aria-hidden="true"></i></button>
            </div>
        ` : '';

// Garante que bebidas e cervejas NUNCA mostrem a etiqueta de cozinha
        const isBebida = p.categoria === 'bebidas' || p.categoria === 'cervejas';
        const badgeCozinha = (p.precisa_preparo !== false && !isBebida)
            ? '<span class="text-[8px] bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-1 py-0.5 rounded font-black ml-2 inline-flex items-center gap-0.5"><i data-lucide="flame" class="w-2.5 h-2.5" aria-hidden="true"></i> COZINHA</span>'
            : '';
        const badgeEstoque = p.controlar_estoque === true
            ? '<span class="text-[8px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1 py-0.5 rounded font-black ml-2 inline-flex items-center gap-0.5"><i data-lucide="package" class="w-2.5 h-2.5" aria-hidden="true"></i> ESTOQUE</span>'
            : '';
        const badgeComplementos = p.pedir_complementos === true
            ? '<span class="text-[8px] bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-1 py-0.5 rounded font-black ml-2 inline-flex items-center gap-0.5"><i data-lucide="list-plus" class="w-2.5 h-2.5" aria-hidden="true"></i> COMPLEMENTOS</span>'
            : '';

        return `
            <div class="bg-white dark:bg-slate-900 p-4 rounded-3xl shadow-sm flex items-center justify-between border-2 border-white dark:border-slate-800 mb-2 transition-all ${statusClass}">
                <div class="flex items-center gap-3">
                    <div class="bg-slate-50 dark:bg-slate-800 w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner"><i data-lucide="${icons[p.categoria] || 'package'}" class="w-6 h-6 text-slate-500" aria-hidden="true"></i></div>
                    <div>
                        <div class="flex items-center flex-wrap gap-y-1">
                            <h4 class="font-black text-[11px] uppercase italic text-slate-800 dark:text-slate-200 leading-tight">${p.nome}</h4>
                            ${badgeCozinha} ${badgeEstoque} ${badgeComplementos}
                        </div>
                        <div class="flex items-center gap-2 mt-1">
                            <span class="text-[10px] font-black text-red-500">R$ ${formatarMoeda(p.preco)}</span>
                            <span class="text-[8px] font-black text-slate-300 uppercase italic">/ ${p.categoria}</span>
                        </div>
                    </div>
                </div>
                ${botoesAcao}
            </div>`;
    }).join('');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

window.alternarAbasAdminProdutos = function(aba) {
    ['lista', 'cadastro', 'estoque'].forEach(id => {
        const el = document.getElementById(`aba-${id}`);
        if(el) el.classList.add('hidden');
        
        const btn = document.getElementById(`btn-aba-${id}`);
        if(btn) btn.className = "flex-1 py-3 rounded-full bg-transparent text-slate-400 dark:text-slate-500 text-[9px] font-black uppercase transition-all font-sans italic tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800";
    });

    const abaAtiva = document.getElementById(`aba-${aba}`);
    const btnAtivo = document.getElementById(`btn-aba-${aba}`);
    
    if (abaAtiva) abaAtiva.classList.remove('hidden');
    if (btnAtivo) btnAtivo.className = "flex-1 py-3 rounded-full bg-[#e63946] text-white text-[9px] font-black uppercase transition-all font-sans italic tracking-widest shadow-sm";

if (aba === 'lista') renderizarCatalogo();
    if (aba === 'estoque') renderizarEstoque();
    if (aba === 'cadastro' && !window.produtoEdicaoId) {
        document.getElementById('p-nome').value = '';
        document.getElementById('p-preco').value = '';
        document.getElementById('p-categoria').value = 'ESPETOS';
        if(document.getElementById('p-controla-estoque')) document.getElementById('p-controla-estoque').checked = false;
        
        // Garante que o botão de cozinha resete corretamente
        if(typeof atualizarToggleCozinha === 'function') atualizarToggleCozinha();
    }
}

// Normaliza texto livre de categoria pro mesmo formato das categorias já
// existentes no banco (minúsculo, sem acento, espaços viram "_"), pra uma
// categoria nova digitada não ficar "solta" com grafia diferente da mesma
// categoria já usada em outro produto (ex: "Sobremesas" vs "sobremesas").
window.normalizarCategoria = function(valor) {
    return (valor || '')
        .toString()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
};

// Preenche a lista de sugestões (datalist) do campo de categoria com as
// categorias já usadas em produtos existentes, pra o usuário poder
// escolher uma já existente OU digitar uma categoria nova — que passa a
// aparecer automaticamente nos filtros de Vendas (ver renderizarCategoriasFiltro).
window.preencherDatalistCategorias = async function() {
    const datalist = document.getElementById('lista-categorias-produto');
    if (!datalist || typeof _supabase === 'undefined') return;
    try {
        const { data, error } = await _supabase.from('produtos').select('categoria');
        if (error) throw error;
        const categorias = [...new Set((data || []).map(p => p.categoria).filter(Boolean))].sort((a, b) => a.localeCompare(b));
        datalist.innerHTML = categorias.map(c => `<option value="${c.toUpperCase()}"></option>`).join('');
    } catch (e) {
        console.error('Erro ao carregar categorias existentes:', e);
    }
};

window.salvarProduto = async function() {
    const nome = document.getElementById('p-nome').value.toUpperCase().trim();

    // ====================================================
    // 0. CAPTURA A NOVA OBSERVAÇÃO PARA O CARDÁPIO
    // ====================================================
    const inputObs = document.getElementById('p-observacao');
    const observacao = inputObs ? inputObs.value.trim() : null;

    const cat = window.normalizarCategoria(document.getElementById('p-categoria').value);

    const inputPreco = document.getElementById('p-preco').value;
    const preco = typeof convMoedaFloat === 'function' ? convMoedaFloat(inputPreco) : parseFloat(inputPreco.replace(/\D/g, "")) / 100;
    
    const controlaEstoque = document.getElementById('p-controla-estoque') ? document.getElementById('p-controla-estoque').checked : false;

    const inputCusto = document.getElementById('p-custo');
    const custo = inputCusto && inputCusto.value
        ? (typeof convMoedaFloat === 'function' ? convMoedaFloat(inputCusto.value) : parseFloat(inputCusto.value.replace(/\D/g, "")) / 100)
        : 0;

    const inputEstoqueMinimo = document.getElementById('p-estoque-minimo');
    const estoqueMinimo = controlaEstoque && inputEstoqueMinimo && inputEstoqueMinimo.value ? parseFloat(inputEstoqueMinimo.value) : 0;

    const fornecedorId = document.getElementById('p-fornecedor')?.value || null;
    const codigoBarras = document.getElementById('p-codigo-barras')?.value.trim() || null;

    // ====================================================
    // 1. CAPTURA O CAMPO DE INGREDIENTES E O TOGGLE
    // ====================================================
    const inputIngredientes = document.getElementById('p-ingredientes');
    const ingredientes = inputIngredientes ? inputIngredientes.value.trim() : null;
    
    // Captura o botão de complementos (Se não encontrar na tela, assume TRUE por padrão)
    const pedirComplementos = document.getElementById('p-pedir-complementos') ? document.getElementById('p-pedir-complementos').checked : true;
    
    let prepara = false;
    if (cat !== 'bebidas' && cat !== 'cervejas') {
        prepara = document.getElementById('p-preparo') ? document.getElementById('p-preparo').checked : true;
    }

    if (!nome || preco <= 0 || !cat) {
        if (typeof showToast === 'function') {
            showToast(!cat ? "INFORME UMA CATEGORIA" : "PREENCHA NOME E PREÇO", "erro");
        } else if (typeof alertaSistema === 'function') {
            alertaSistema("Por favor, preencha o nome, a categoria e um preço maior que zero.", "Campos Inválidos");
        } else {
            alert("Preencha nome, categoria e preço válido");
        }
        return;
    }
    
    if (typeof setLoading === 'function') setLoading('btn-salvar-produto', true);

    try {
        if (window.uploadFotoProdutoPendente && typeof window.enviarFotoProdutoPendente === 'function') {
            await window.enviarFotoProdutoPendente();
        }
        if (window.galeriaProdutoPendente && window.galeriaProdutoPendente.length && typeof window.enviarGaleriaProdutoPendente === 'function') {
            await window.enviarGaleriaProdutoPendente();
        }
        const fotoUrlFinal = document.getElementById('p-foto-url')?.value || null;
        const galeriaFinal = (window.galeriaProdutoUrls && window.galeriaProdutoUrls.length) ? window.galeriaProdutoUrls : null;

        const dados = {
            nome,
            categoria: cat,
            preco,
            status: true,
            precisa_preparo: prepara,
            controlar_estoque: controlaEstoque,
            ingredientes: ingredientes,
            observacao: observacao, // <-- ENVIANDO PARA O BANCO AQUI
            // ====================================================
            // 2. ENVIA A OPÇÃO DE COMPLEMENTOS PARA O BANCO
            // ====================================================
            pedir_complementos: pedirComplementos,
            preco_custo: custo,
            estoque_minimo: estoqueMinimo,
            fornecedor_id: fornecedorId,
            codigo_barras: codigoBarras,
            foto: fotoUrlFinal,
            galeria: galeriaFinal
        };

        if (window.produtoEdicaoId) {
            // Busca o preço atual ANTES de sobrescrever, para registrar o histórico se ele mudar
            const { data: produtoAntigo } = await _supabase.from('produtos').select('preco').eq('id', window.produtoEdicaoId).single();

            const { error } = await _supabase.from('produtos').update(dados).eq('id', window.produtoEdicaoId);
            if (error) throw error;

            if (produtoAntigo && parseFloat(produtoAntigo.preco) !== preco) {
                await _supabase.from('historico_precos').insert([{
                    produto_id: window.produtoEdicaoId,
                    preco_antigo: produtoAntigo.preco,
                    preco_novo: preco,
                    usuario: localStorage.getItem('userName') || 'Sistema'
                }]);
            }

            if(typeof registrarLog === 'function') {
                await registrarLog("ESTOQUE", `EDITOU PRODUTO ID ${window.produtoEdicaoId}: ${nome} | NOVO PREÇO: R$ ${preco.toFixed(2)} | CAT: ${cat.toUpperCase()}`);
            }

        } else {
            dados.estoque_atual = 0; 
            const { error } = await _supabase.from('produtos').insert([dados]);
            if (error) throw error;
            
            if(typeof registrarLog === 'function') {
                await registrarLog("ESTOQUE", `CADASTROU NOVO PRODUTO: ${nome} | PREÇO: R$ ${preco.toFixed(2)} | CAT: ${cat.toUpperCase()}`);
            }
        }

        window.produtoEdicaoId = null;
        if (typeof alternarAbasAdminProdutos === 'function') alternarAbasAdminProdutos('lista');
        if (typeof showToast === 'function') showToast("PRODUTO SALVO COM SUCESSO!");
        if (typeof window.preencherDatalistCategorias === 'function') window.preencherDatalistCategorias();
        
    } catch (e) {
        console.error("Erro ao salvar produto:", e);
        if (typeof showToast === 'function') {
            showToast("ERRO AO SALVAR PRODUTO", "erro");
        } else if (typeof alertaSistema === 'function') {
            alertaSistema("Ocorreu um erro de comunicação ao tentar salvar este produto no banco de dados.", "Erro de Conexão");
        }
    } finally {
        if (typeof setLoading === 'function') setLoading('btn-salvar-produto', false);
    }
}

window.prepararEdicao = async function(id) {
    try {
        const { data: p, error } = await _supabase.from('produtos').select('*').eq('id', id).single();
        if (error || !p) return;

        document.getElementById('p-nome').value = p.nome;
        
        // ====================================================
        // PREENCHE O NOVO CAMPO DE OBSERVAÇÃO NA EDIÇÃO
        // ====================================================
        const inputObs = document.getElementById('p-observacao');
        if (inputObs) {
            inputObs.value = p.observacao || '';
        }

        document.getElementById('p-categoria').value = p.categoria;
        document.getElementById('p-preco').value = typeof formatarMoeda === 'function' ? formatarMoeda(p.preco) : p.preco;
        
        // ====================================================
        // PREENCHE O CAMPO DE INGREDIENTES NA EDIÇÃO
        // ====================================================
        const inputIngredientes = document.getElementById('p-ingredientes');
        if (inputIngredientes) {
            inputIngredientes.value = p.ingredientes || '';
        }

        const checkboxPreparo = document.getElementById('p-preparo');
        if(checkboxPreparo) checkboxPreparo.checked = p.precisa_preparo !== false;

        const checkboxEstoque = document.getElementById('p-controla-estoque');
        if(checkboxEstoque) checkboxEstoque.checked = p.controlar_estoque === true;
        if (typeof window.toggleEstoqueMinimo === 'function') window.toggleEstoqueMinimo();

        // ====================================================
        // PREENCHE O TOGGLE DE PEDIR COMPLEMENTOS
        // ====================================================
        const checkboxComplementos = document.getElementById('p-pedir-complementos');
        if(checkboxComplementos) checkboxComplementos.checked = p.pedir_complementos !== false;

        if (typeof window.atualizarVisibilidadeTogglesProducao === 'function') window.atualizarVisibilidadeTogglesProducao();

        // ====================================================
        // CUSTO, ESTOQUE MÍNIMO, FORNECEDOR, SKU E FOTO
        // ====================================================
        const inputCusto = document.getElementById('p-custo');
        if (inputCusto) inputCusto.value = p.preco_custo ? (typeof formatarMoeda === 'function' ? formatarMoeda(p.preco_custo) : p.preco_custo) : '';

        const inputEstoqueMinimo = document.getElementById('p-estoque-minimo');
        if (inputEstoqueMinimo) inputEstoqueMinimo.value = p.estoque_minimo || '';

        const inputCodigoBarras = document.getElementById('p-codigo-barras');
        if (inputCodigoBarras) inputCodigoBarras.value = p.codigo_barras || '';

        if (typeof window.preencherSelectsFornecedor === 'function') {
            await window.preencherSelectsFornecedor(['p-fornecedor']);
        }
        const selectFornecedor = document.getElementById('p-fornecedor');
        if (selectFornecedor) selectFornecedor.value = p.fornecedor_id || '';

        const inputFotoUrl = document.getElementById('p-foto-url');
        if (inputFotoUrl) inputFotoUrl.value = p.foto || '';
        const previewFoto = document.getElementById('preview-foto-produto');
        if (previewFoto) {
            previewFoto.innerHTML = p.foto
                ? `<img src="${p.foto}" class="w-full h-full object-cover" alt="${p.nome}">`
                : '<i data-lucide="image" class="w-6 h-6 text-slate-300"></i>';
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }

        window.galeriaProdutoUrls = Array.isArray(p.galeria) ? [...p.galeria] : [];
        window.galeriaProdutoPendente = [];
        if (typeof window.renderizarPreviewGaleria === 'function') window.renderizarPreviewGaleria();

        window.produtoEdicaoId = id;
        if (typeof window.toggleEditorComposicaoCombo === 'function') window.toggleEditorComposicaoCombo();
        if (typeof alternarAbasAdminProdutos === 'function') alternarAbasAdminProdutos('cadastro');
    } catch (e) {
        console.error("Erro ao preparar edição:", e);
    }
}

window.cancelarEdicao = function() {
    document.getElementById('p-nome').value = '';
    document.getElementById('p-preco').value = '';
    
    // ====================================================
    // LIMPA O CAMPO DE OBSERVAÇÃO
    // ====================================================
    const inputObs = document.getElementById('p-observacao');
    if(inputObs) inputObs.value = '';
    
    const inputIngredientes = document.getElementById('p-ingredientes');
    if(inputIngredientes) inputIngredientes.value = '';

    const checkboxPreparo = document.getElementById('p-preparo');
    if(checkboxPreparo) checkboxPreparo.checked = true;

    const checkboxEstoque = document.getElementById('p-controla-estoque');
    if(checkboxEstoque) checkboxEstoque.checked = false;
    if (typeof window.toggleEstoqueMinimo === 'function') window.toggleEstoqueMinimo();

    // Reseta o botão de complementos para o padrão (ligado)
    const checkboxComplementos = document.getElementById('p-pedir-complementos');
    if(checkboxComplementos) checkboxComplementos.checked = true;

    // Reseta custo, estoque mínimo, fornecedor, SKU e foto
    const inputCusto = document.getElementById('p-custo');
    if (inputCusto) inputCusto.value = '';
    const inputEstoqueMinimo = document.getElementById('p-estoque-minimo');
    if (inputEstoqueMinimo) inputEstoqueMinimo.value = '';
    const selectFornecedor = document.getElementById('p-fornecedor');
    if (selectFornecedor) selectFornecedor.value = '';
    const inputCodigoBarras = document.getElementById('p-codigo-barras');
    if (inputCodigoBarras) inputCodigoBarras.value = '';
    const inputFotoUrl = document.getElementById('p-foto-url');
    if (inputFotoUrl) inputFotoUrl.value = '';
    const inputFoto = document.getElementById('p-foto');
    if (inputFoto) inputFoto.value = '';
    const previewFoto = document.getElementById('preview-foto-produto');
    if (previewFoto) {
        previewFoto.innerHTML = '<i data-lucide="image" class="w-6 h-6 text-slate-300"></i>';
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    window.galeriaProdutoUrls = [];
    window.galeriaProdutoPendente = [];
    const inputGaleria = document.getElementById('p-galeria');
    if (inputGaleria) inputGaleria.value = '';
    if (typeof window.renderizarPreviewGaleria === 'function') window.renderizarPreviewGaleria();

    window.produtoEdicaoId = null;
    if (typeof window.toggleEditorComposicaoCombo === 'function') window.toggleEditorComposicaoCombo();
    if (typeof alternarAbasAdminProdutos === 'function') alternarAbasAdminProdutos('lista');
}

window.toggleEstoqueMinimo = function () {
    const checkbox = document.getElementById('p-controla-estoque');
    const container = document.getElementById('container-estoque-minimo');
    if (!container) return;
    if (checkbox && checkbox.checked) {
        container.classList.remove('hidden');
    } else {
        container.classList.add('hidden');
    }
};

// Slug do nome do produto pra usar como prefixo do arquivo no Storage —
// antes o nome do arquivo era só timestamp + nome original escolhido pelo
// usuário (ex: "1690000000_IMG_2381.jpg"), impossível de identificar de
// qual produto era só olhando a lista de arquivos no bucket.
window.slugNomeProduto = function (nome) {
    return (nome || 'produto')
        .toString()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40) || 'PRODUTO';
};

// Redimensiona/comprime a imagem no navegador antes do upload (nenhuma
// otimização era feita antes — fotos de celular de 4-8MB iam pro Storage
// do jeito que vieram). Limita a maior dimensão e recomprime como JPEG.
window.otimizarImagemProduto = function (file, maxDim = 1280, quality = 0.82) {
    return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            let { width, height } = img;
            if (width > maxDim || height > maxDim) {
                const escala = maxDim / Math.max(width, height);
                width = Math.round(width * escala);
                height = Math.round(height * escala);
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            canvas.getContext('2d').drawImage(img, 0, 0, width, height);
            canvas.toBlob((blob) => {
                URL.revokeObjectURL(url);
                resolve(blob || file);
            }, 'image/jpeg', quality);
        };
        img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
        img.src = url;
    });
};

window.preverFotoProduto = function (event) {
    const file = event.target.files?.[0];
    const preview = document.getElementById('preview-foto-produto');
    if (!file || !preview) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        preview.innerHTML = `<img src="${e.target.result}" class="w-full h-full object-cover" alt="Pré-visualização">`;
    };
    reader.readAsDataURL(file);

    window.uploadFotoProdutoPendente = file;
};

window.enviarFotoProdutoPendente = async function () {
    const file = window.uploadFotoProdutoPendente;
    if (!file) return;

    try {
        const nome = document.getElementById('p-nome')?.value || 'produto';
        const slug = window.slugNomeProduto(nome);
        const blob = await window.otimizarImagemProduto(file);
        const path = `produtos/${slug}_${Date.now()}.jpg`;
        const { error: erroUpload } = await _supabase.storage.from('produtos').upload(path, blob, { contentType: 'image/jpeg' });
        if (erroUpload) throw erroUpload;

        const { data } = _supabase.storage.from('produtos').getPublicUrl(path);
        document.getElementById('p-foto-url').value = data.publicUrl;
        window.uploadFotoProdutoPendente = null;
    } catch (e) {
        console.error('Erro ao enviar foto do produto:', e);
        if (typeof showToast === 'function') showToast('Erro ao enviar a foto (produto foi salvo sem foto nova).', 'aviso');
    }
};

/* --- GALERIA DE FOTOS EXTRAS (item #22: múltiplas imagens por produto) --- */

window.galeriaProdutoUrls = [];
window.galeriaProdutoPendente = [];
const LIMITE_GALERIA_PRODUTO = 6;

window.renderizarPreviewGaleria = function () {
    const cont = document.getElementById('preview-galeria-produto');
    if (!cont) return;

    const thumbBase = 'relative w-14 h-14 rounded-xl overflow-hidden border-2 shrink-0';
    const btnRemover = (tipo, idx) => `<button type="button" onclick="window.removerFotoGaleriaProduto('${tipo}', ${idx})" aria-label="Remover foto" class="absolute top-0 right-0 bg-red-500 text-white w-4 h-4 flex items-center justify-center text-[10px] leading-none rounded-bl-lg">&times;</button>`;

    const thumbsExistentes = window.galeriaProdutoUrls.map((url, idx) => `
        <div class="${thumbBase} border-slate-100 dark:border-slate-700">
            <img src="${url}" class="w-full h-full object-cover" alt="Foto da galeria">
            ${btnRemover('existente', idx)}
        </div>`).join('');

    const thumbsPendentes = window.galeriaProdutoPendente.map((item, idx) => `
        <div class="${thumbBase} border-emerald-300">
            <img src="${item.preview}" class="w-full h-full object-cover" alt="Foto pendente de envio">
            ${btnRemover('pendente', idx)}
        </div>`).join('');

    cont.innerHTML = thumbsExistentes + thumbsPendentes;
};

window.adicionarFotosGaleriaProduto = function (event) {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;

    const totalAtual = window.galeriaProdutoUrls.length + window.galeriaProdutoPendente.length;
    const espacoRestante = Math.max(0, LIMITE_GALERIA_PRODUTO - totalAtual);

    if (files.length > espacoRestante && typeof showToast === 'function') {
        showToast(`MÁXIMO DE ${LIMITE_GALERIA_PRODUTO} FOTOS NA GALERIA`, 'aviso');
    }

    files.slice(0, espacoRestante).forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            window.galeriaProdutoPendente.push({ file, preview: e.target.result });
            window.renderizarPreviewGaleria();
        };
        reader.readAsDataURL(file);
    });
};

window.removerFotoGaleriaProduto = function (tipo, idx) {
    if (tipo === 'existente') window.galeriaProdutoUrls.splice(idx, 1);
    else window.galeriaProdutoPendente.splice(idx, 1);
    window.renderizarPreviewGaleria();
};

window.enviarGaleriaProdutoPendente = async function () {
    if (!window.galeriaProdutoPendente.length) return;

    const nome = document.getElementById('p-nome')?.value || 'produto';
    const slug = window.slugNomeProduto(nome);

    for (const item of window.galeriaProdutoPendente) {
        try {
            const blob = await window.otimizarImagemProduto(item.file);
            const path = `produtos/${slug}_galeria_${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`;
            const { error } = await _supabase.storage.from('produtos').upload(path, blob, { contentType: 'image/jpeg' });
            if (error) throw error;

            const { data } = _supabase.storage.from('produtos').getPublicUrl(path);
            window.galeriaProdutoUrls.push(data.publicUrl);
        } catch (e) {
            console.error('Erro ao enviar foto da galeria:', e);
            if (typeof showToast === 'function') showToast('Erro ao enviar uma das fotos da galeria.', 'aviso');
        }
    }
    window.galeriaProdutoPendente = [];
};

window.abrirHistoricoPrecos = async function (id, nomeProduto) {
    const modal = document.getElementById('modal-historico-precos');
    const lista = document.getElementById('lista-historico-precos');
    const titulo = document.getElementById('titulo-historico-precos');
    if (!modal || !lista) return;

    if (titulo) titulo.innerText = `Histórico de Preço — ${nomeProduto || ''}`;
    lista.innerHTML = '<p class="text-center text-[10px] font-black text-slate-400 uppercase animate-pulse py-8">Buscando histórico...</p>';
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    try {
        const { data, error } = await _supabase
            .from('historico_precos')
            .select('*')
            .eq('produto_id', id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
            lista.innerHTML = '<p class="text-center text-[10px] text-slate-400 py-10 font-black uppercase italic">Nenhuma alteração de preço registrada ainda.</p>';
            return;
        }

        const fm = typeof window.formatarMoeda === 'function' ? window.formatarMoeda : (v) => parseFloat(v || 0).toFixed(2);

        lista.innerHTML = data.map((h) => {
            const subiu = parseFloat(h.preco_novo) >= parseFloat(h.preco_antigo);
            const dataStr = new Date(h.created_at).toLocaleString('pt-BR');
            return `
            <div class="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <div>
                    <p class="text-[9px] font-bold text-slate-400 uppercase">${dataStr}</p>
                    <p class="text-[9px] font-bold text-slate-400 uppercase">Por: ${h.usuario || 'Sistema'}</p>
                </div>
                <div class="flex items-center gap-1.5">
                    <span class="text-[10px] font-bold text-slate-400 line-through">R$ ${fm(h.preco_antigo)}</span>
                    <i data-lucide="${subiu ? 'arrow-up-right' : 'arrow-down-right'}" class="w-3.5 h-3.5 ${subiu ? 'text-red-500' : 'text-emerald-500'}" aria-hidden="true"></i>
                    <span class="text-xs font-black ${subiu ? 'text-red-500' : 'text-emerald-500'}">R$ ${fm(h.preco_novo)}</span>
                </div>
            </div>`;
        }).join('');

        if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (e) {
        console.error('Erro ao buscar histórico de preços:', e);
        lista.innerHTML = '<p class="text-center text-xs font-bold text-red-500 py-10 uppercase">Erro ao carregar histórico.</p>';
    }
};

window.fecharHistoricoPrecos = function () {
    document.getElementById('modal-historico-precos')?.classList.add('hidden');
};

window.toggleStatusProduto = async function(id, novoStatus) {
    try {
        const { error } = await _supabase.from('produtos').update({ status: novoStatus }).eq('id', id);
        if (error) throw error;
        
        // LOG DE AUDITORIA: MUDANÇA DE STATUS
        if(typeof registrarLog === 'function') registrarLog("STATUS PRODUTO", `ID: ${id} | NOVO STATUS: ${novoStatus ? 'ATIVO' : 'INATIVO'}`);
        
        renderizarCatalogo();
    } catch (e) {
        console.error("Erro ao mudar status:", e);
        if(typeof showToast === 'function') showToast("ERRO AO ATUALIZAR STATUS", "erro");
    }
}

window.confirmarExclusaoProduto = function(id) {
    const mensagem = "Esta ação removerá o produto do cardápio permanentemente. Deseja continuar?";
    const titulo = "EXCLUIR PRODUTO";

    // 1. Isolamos toda a lógica de exclusão no callback
    const acaoDeletarProduto = async () => {
        try {
            // Busca o nome do produto ANTES de apagar para deixar o log perfeito
            const { data: produto, error: errBusca } = await _supabase
                .from('produtos')
                .select('nome')
                .eq('id', id)
                .single();

            if (errBusca) throw errBusca;

            // Executa a exclusão no banco
            const { error: errDel } = await _supabase.from('produtos').delete().eq('id', id);
            if (errDel) throw errDel;
            
            // --- LOG DE AUDITORIA DETALHADO ---
            if (typeof registrarLog === 'function') {
                const nomeProduto = produto ? produto.nome : `ID ${id}`;
                await registrarLog("ESTOQUE", `EXCLUIU PRODUTO: ${nomeProduto} (ID: ${id})`);
            }
            
            // Atualiza a interface
            if (typeof renderizarCatalogo === 'function') renderizarCatalogo();
            if (typeof showToast === 'function') showToast("PRODUTO EXCLUÍDO!", "sucesso");

        } catch (e) {
            console.error("Erro ao excluir produto:", e);
            
            // Tratamento de erro padronizado
            if (typeof showToast === 'function') {
                showToast("ERRO AO EXCLUIR PRODUTO", "erro");
            } else if (typeof alertaSistema === 'function') {
                alertaSistema("Não foi possível excluir o produto do banco de dados. Tente novamente.", "Erro de Conexão");
            }
        }
    };

    // 2. Chama o nosso modal padronizado de Confirmação (com fallback para o nativo)
    if (typeof confirmarAcao === 'function') {
        confirmarAcao(mensagem, acaoDeletarProduto, titulo);
    } else {
        if (confirm("Deseja realmente excluir este produto?")) {
            acaoDeletarProduto();
        }
    }
}

// --- 2. GESTÃO DE ESTOQUE (INVENTÁRIO) ---

window.renderizarEstoque = async function() {
    if (typeof _supabase === 'undefined') return;

    const v3Ativo = localStorage.getItem('v3_estoque_transacional') === 'true';
    let pds = [];
    let saldosPorProduto = new Map();
    let unidadeNome = '';

    if (v3Ativo) {
        try {
            if (!window.estoqueAdapterV3) {
                throw new Error('Adaptador de estoque V3 não carregado.');
            }

            const contexto = await window.organizacaoServiceV3.obterContextoAtual();
            let contextoFinal = contexto;

            if (!contextoFinal.unidadeId && contextoFinal.unidades.length === 1) {
                contextoFinal = await window.organizacaoServiceV3.definirUnidadeAtual(contextoFinal.unidades[0].id);
            }

            if (!contextoFinal.unidadeId) {
                const containerSemUnidade = document.getElementById('lista-estoque');
                if (containerSemUnidade) {
                    containerSemUnidade.innerHTML = `
                        <div class="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl border border-amber-100 dark:border-amber-800/50">
                            <p class="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase italic">
                                ${contextoFinal.unidades.length > 1
                                    ? 'Selecione uma unidade para visualizar o estoque.'
                                    : 'Nenhuma unidade ativa disponível para visualizar o estoque.'}
                            </p>
                        </div>`;
                }
                return;
            }

            unidadeNome = contextoFinal.unidade?.nome || '';

            if (typeof _supabaseV3 === 'undefined' || !_supabaseV3) {
                throw new Error('Banco V3 não configurado.');
            }

            const { data, error } = await _supabaseV3
                .from('produtos')
                .select('*')
                .eq('controlar_estoque', true)
                .eq('empresa_id', contextoFinal.empresaId)
                .order('nome');

            if (error) throw error;

            pds = data || [];

            const saldoResult = await window.estoqueAdapterV3.obterSaldos(pds.map((p) => p.id));
            if (!saldoResult.handled) throw new Error('Não foi possível consultar os saldos V3.');

            saldosPorProduto = new Map(
                (saldoResult.data || []).map((item) => [item.produto_id, Number(item.saldo || 0)])
            );
        } catch (e) {
            console.error('Erro ao carregar estoque V3:', e);
            const containerErro = document.getElementById('lista-estoque');
            if (containerErro) {
                containerErro.innerHTML = '<p class="text-center text-[10px] text-red-400 py-10 font-black uppercase italic">Erro ao carregar estoque da unidade.</p>';
            }
            return;
        }
    } else {
        const { data } = await _supabase
            .from('produtos')
            .select('*')
            .eq('controlar_estoque', true)
            .order('nome');

        pds = data || [];
    }

    const container = document.getElementById('lista-estoque');
    if (!container) return;

    if (!pds || pds.length === 0) {
        container.innerHTML = '<p class="text-center text-[10px] text-slate-400 py-10 font-black uppercase italic">Nenhum produto configurado para controle de estoque.</p>';
        return;
    }

    container.innerHTML = pds.map(p => {
        const saldoAtual = v3Ativo ? (saldosPorProduto.get(p.id) || 0) : (p.estoque_atual || 0);
        const limiteMinimo = Number(p.estoque_minimo || 5);

        return `
        <div class="bg-white dark:bg-slate-900 p-4 rounded-3xl shadow-sm flex items-center justify-between border-2 border-slate-100 dark:border-slate-800 mb-2">
            <div>
                <h4 class="font-black text-[11px] uppercase italic text-slate-800 dark:text-slate-200 leading-tight">${p.nome}</h4>
                <div class="flex items-center gap-2 mt-1">
                    <span class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase">Qtd Atual:</span>
                    <span class="text-[14px] font-black ${saldoAtual <= limiteMinimo ? 'text-red-500' : 'text-emerald-500'}">${saldoAtual}</span>
                    ${v3Ativo && unidadeNome ? `<span class="text-[8px] font-black text-slate-300 dark:text-slate-600 uppercase">/ ${unidadeNome}</span>` : ''}
                </div>
            </div>
            <button onclick="abrirModalEstoque(${p.id}, '${String(p.nome || '').replace(/'/g, "\\'")}')" class="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-xl text-[9px] font-black uppercase border border-blue-100 dark:border-blue-800/50 active:scale-95 transition-all">
                Ajustar
            </button>
        </div>`;
    }).join('');
}
window.abrirModalEstoque = function(id, nome) {
    document.getElementById('id-produto-movimentacao').value = id;
    document.getElementById('nome-produto-movimentacao').innerText = nome;
    document.getElementById('qtd-movimentacao').value = '';
    document.getElementById('motivo-movimentacao').value = '';
    document.getElementById('modal-movimentacao-estoque').classList.remove('hidden');
    document.getElementById('modal-movimentacao-estoque').classList.add('flex');
}

window.fecharModalEstoque = function() {
    document.getElementById('modal-movimentacao-estoque').classList.add('hidden');
    document.getElementById('modal-movimentacao-estoque').classList.remove('flex');
}

window.salvarMovimentacao = async function() {
    const idProd = document.getElementById('id-produto-movimentacao').value;
    const tipo = document.getElementById('tipo-movimentacao').value;
    const qtd = parseFloat(document.getElementById('qtd-movimentacao').value);
    const motivo = document.getElementById('motivo-movimentacao').value.trim().toUpperCase();
    const usuario = localStorage.getItem('userName') || 'Admin';

    // ----------------------------------------------------
    // VALIDAÇÃO 1: QUANTIDADE
    // ----------------------------------------------------
    if (!qtd || qtd <= 0) {
        if (typeof showToast === 'function') {
            showToast("Informe uma quantidade válida", "erro");
        } else if (typeof alertaSistema === 'function') {
            alertaSistema("Por favor, informe uma quantidade válida maior que zero para movimentar o estoque.", "Atenção");
        } else {
            alert("Quantidade inválida");
        }
        return;
    }

    // ----------------------------------------------------
    // VALIDAÇÃO 2: MOTIVO
    // ----------------------------------------------------
    if (!motivo) {
        if (typeof showToast === 'function') {
            showToast("Informe o motivo", "erro");
        } else if (typeof alertaSistema === 'function') {
            alertaSistema("Por favor, informe o motivo deste ajuste de estoque (ex: Compra, Perda, Vencimento).", "Atenção");
        } else {
            alert("Informe o motivo");
        }
        return;
    }

    if (typeof setLoading === 'function') setLoading('btn-salvar-movimentacao', true);

    try {
        // ============================================================
        // PONTE V3 (FEATURE FLAG)
        // ============================================================
        // Desligada por padrão para preservar o comportamento da V2.
        // Quando ativada, a operação passa pelo serviço/RPC transacional.
        const v3Ativo = localStorage.getItem('v3_estoque_transacional') === 'true';

        if (v3Ativo) {
            if (!window.estoqueAdapterV3) {
                throw new Error('Adaptador de estoque V3 não carregado.');
            }

            const resultadoV3 = await window.estoqueAdapterV3.salvarMovimentacao({
                produtoId: Number(idProd),
                tipo,
                quantidade: qtd,
                motivo
            });

            if (resultadoV3?.handled) {
                if (typeof showToast === 'function') showToast('ESTOQUE ATUALIZADO!');
                fecharModalEstoque();
                if (typeof renderizarEstoque === 'function') renderizarEstoque();
                return;
            }
        }

        // ============================================================
        // FLUXO LEGADO V2
        // ============================================================
        // Mantido como fallback enquanto a feature flag estiver desligada.
        // Buscamos o nome e o estoque atual para um log mais completo
        const { data: p, error: errP } = await _supabase.from('produtos').select('nome, estoque_atual').eq('id', idProd).single();
        if (errP) throw errP;

        let novoEstoque = parseFloat(p.estoque_atual || 0);

        if (tipo === 'entrada') novoEstoque += qtd;
        else novoEstoque -= qtd;

        // 1. Atualiza o saldo no produto
        const { error: errUpdate } = await _supabase.from('produtos').update({ estoque_atual: novoEstoque }).eq('id', idProd);
        if (errUpdate) throw errUpdate;

        // 2. Registra na tabela de movimentações (histórico do produto)
        const { error: errMov } = await _supabase.from('estoque_movimentacoes').insert([{
            produto_id: idProd, 
            tipo, 
            quantidade: qtd, 
            motivo, 
            usuario
        }]);
        if (errMov) throw errMov;

        // --- REGISTRO DE AUDITORIA DETALHADO ---
        if(typeof registrarLog === 'function') {
            await registrarLog("ESTOQUE", `AJUSTE MANUAL: ${tipo.toUpperCase()} DE ${qtd} UNID. EM: ${p.nome} | MOTIVO: ${motivo}`);
        }

        if (typeof showToast === 'function') showToast("ESTOQUE ATUALIZADO!");
        
        fecharModalEstoque();
        
        if (typeof renderizarEstoque === 'function') renderizarEstoque(); 

    } catch (e) {
        console.error("Erro estoque:", e);
        // ----------------------------------------------------
        // TRATAMENTO DE ERRO NO CATCH
        // ----------------------------------------------------
        if (typeof showToast === 'function') {
            showToast("ERRO AO ATUALIZAR ESTOQUE", "erro");
        } else if (typeof alertaSistema === 'function') {
            alertaSistema("Ocorreu um erro de comunicação com o banco de dados. Tente novamente.", "Erro");
        }
    } finally {
        if (typeof setLoading === 'function') setLoading('btn-salvar-movimentacao', false);
    }
}

// Categorias em que produção/estoque/complementos fazem sentido de verdade
// (espetinho, prato feito, porção) — bebida, combo, etc. não usam nenhum
// desses três controles, então os blocos inteiros ficam escondidos.
const CATEGORIAS_COM_TOGGLES_PRODUCAO = ['espetos', 'refeicao', 'acompanhamentos'];

// Só mostra/esconde os 3 blocos conforme a categoria, sem mexer no valor dos
// checkboxes — usado na edição, onde o valor já vem carregado do produto.
window.atualizarVisibilidadeTogglesProducao = function() {
    const categoriaRaw = document.getElementById('p-categoria').value;
    const categoria = typeof window.normalizarCategoria === 'function' ? window.normalizarCategoria(categoriaRaw) : categoriaRaw.toLowerCase().trim();
    const mostrar = CATEGORIAS_COM_TOGGLES_PRODUCAO.includes(categoria);

    ['container-toggle-preparo', 'container-toggle-estoque', 'container-toggle-complementos'].forEach((id) => {
        document.getElementById(id)?.classList.toggle('hidden', !mostrar);
    });

    return mostrar;
}

// Chamado quando o usuário TROCA a categoria no formulário (novo produto ou
// mudança manual na edição): além de mostrar/esconder, reseta os valores
// pro padrão de cada categoria.
window.atualizarToggleCozinha = function() {
    const categoriaRaw = document.getElementById('p-categoria').value;
    const categoria = typeof window.normalizarCategoria === 'function' ? window.normalizarCategoria(categoriaRaw) : categoriaRaw.toLowerCase().trim();
    const mostrar = window.atualizarVisibilidadeTogglesProducao();

    const togglePreparo = document.getElementById('p-preparo');
    if (togglePreparo) {
        togglePreparo.checked = mostrar && categoria !== 'bebidas' && categoria !== 'cervejas';
    }

    if (!mostrar) {
        const checkboxEstoque = document.getElementById('p-controla-estoque');
        if (checkboxEstoque) { checkboxEstoque.checked = false; window.toggleEstoqueMinimo(); }
        const checkboxComplementos = document.getElementById('p-pedir-complementos');
        if (checkboxComplementos) checkboxComplementos.checked = false;
    }
}
