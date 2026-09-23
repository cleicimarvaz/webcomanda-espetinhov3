/* =================================================================================
   1. CONFIGURAÇÃO E ESTADO GLOBAL
   ================================================================================= */

// Controle de Versão (Útil para forçar atualização de cache no futuro)
const VERSION = "1.0.5"; 

// Identidade Visual (Centralizada para facilitar mudanças futuras)
const PRIMARY_COLOR = "#e63946"; // Vermelho padrão Espetinho & CIA

// Credenciais do Supabase
const SUPABASE_URL = 'https://quqgblbqrrgmuhrlhuov.supabase.co';
const SUPABASE_KEY = 'sb_publishable_RYMiDWQnmd2umN8w2bdI5A_xz0elzVk';

// Configurações Gerais de UX
const TEMPO_LIMITE_INATIVIDADE = 20 * 60 * 1000; // 20 minutos

// Estilos de Interface Padronizados
const STYLE_ACTIVE = `flex-1 py-3 rounded-full bg-[${PRIMARY_COLOR}] text-white text-[9px] font-black uppercase transition-all font-sans italic tracking-widest shadow-sm`;
const STYLE_INACTIVE = "flex-1 py-3 rounded-full bg-transparent text-slate-400 text-[9px] font-black uppercase transition-all font-sans italic tracking-widest hover:bg-slate-50";

window.CSS_FILTRO_ATIVO = "flex-1 py-3 text-[9px] font-black uppercase rounded-lg transition-all shadow-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-white";
window.CSS_FILTRO_INATIVO = "flex-1 py-3 text-[9px] font-black uppercase rounded-lg transition-all text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50";

/* ---------------------------------------------------------------------------------
   VARIÁVEIS GLOBAIS DE ESTADO
   --------------------------------------------------------------------------------- */
let carrinho = [];
let operacaoPendente = null;      
let produtoEdicaoId = null;       
let comandaEmFechamentoId = null; 
let totalFechamentoCache = 0;     
let comandaAtualDivisao = null;   
let itensParaAbater = [];         
let itensExpandidosDivisao = [];  
let dadosUltimaVenda = null;      
let callbackAuth = null;          

const APP_STATE = {
    get carrinho() { return carrinho; },
    get operacao() { return operacaoPendente; },
    get versao() { return VERSION; }
};

console.log(`🚀 Sistema Espetinho & Cia - v${VERSION} carregado.`);


/* =============================================================
   CONFIGURAÇÕES DO SISTEMA (TICKET E PREFERÊNCIAS)
   ============================================================= */

// Imprime um cupom de exemplo com o layout/tamanho de bobina que estão
// selecionados NA TELA agora, mesmo que o usuário ainda não tenha clicado em
// "Salvar" — assim dá pra comparar os modelos antes de decidir qual usar,
// sem precisar de uma venda real nem salvar a escolha só pra testar.
window.testarImpressaoTicket = function() {
    const layoutSelecionado = document.getElementById('cfg-ticket-layout')?.value || 'padrao';
    const layoutSalvo = localStorage.getItem('ticketLayout');

    localStorage.setItem('ticketLayout', layoutSelecionado);

    const vendaExemplo = {
        data: new Date().toISOString(),
        itens: [
            { nome: 'ESPETINHO DE CARNE', categoria: 'espetos', preco: 10, qtd: 2 },
            { nome: 'REFEIÇÃO COMPLETA', categoria: 'refeicao', preco: 25, qtd: 1 }
        ]
    };

    if (typeof window.imprimirCupom === 'function') {
        window.imprimirCupom(vendaExemplo);
    } else if (typeof showToast === 'function') {
        showToast('MOTOR DE IMPRESSÃO NÃO ENCONTRADO', 'erro');
    }

    // Restaura o layout realmente salvo depois que a impressão já capturou
    // o valor de teste (dispararImpressao/imprimirCupom leem de forma síncrona).
    setTimeout(() => {
        if (layoutSalvo) localStorage.setItem('ticketLayout', layoutSalvo);
        else localStorage.removeItem('ticketLayout');
    }, 2000);
};

/* --- ORDEM DAS CATEGORIAS NA TELA DE VENDAS (item #4) --- */

window.ordemCategoriasState = [];

window.carregarOrdemCategorias = async function() {
    try {
        const { data: produtos } = await _supabase.from('produtos').select('categoria');
        const categoriasUsadas = [...new Set((produtos || []).map((p) => (p.categoria || '').toLowerCase().trim()).filter(Boolean))];

        const { data: cfg } = await _supabase.from('configuracoes_sistema').select('ordem_categorias').eq('id', 1).maybeSingle();
        const salvas = (cfg?.ordem_categorias || '').split(',').map((s) => s.trim()).filter(Boolean);

        // Mantém a ordem já salva (só as categorias que ainda existem), e
        // acrescenta no fim, em ordem alfabética, qualquer categoria nova que
        // tenha aparecido depois da última vez que a ordem foi salva.
        const ordenadas = salvas.filter((c) => categoriasUsadas.includes(c));
        categoriasUsadas.sort((a, b) => a.localeCompare(b)).forEach((c) => {
            if (!ordenadas.includes(c)) ordenadas.push(c);
        });

        window.ordemCategoriasState = ordenadas;
        window.renderizarListaOrdemCategorias();
    } catch (e) {
        console.error('Erro ao carregar ordem das categorias:', e);
    }
};

window.renderizarListaOrdemCategorias = function() {
    const cont = document.getElementById('lista-ordem-categorias');
    if (!cont) return;

    if (window.ordemCategoriasState.length === 0) {
        cont.innerHTML = '<p class="text-[10px] text-slate-400 italic text-center py-6">Nenhuma categoria cadastrada ainda.</p>';
        return;
    }

    cont.innerHTML = window.ordemCategoriasState.map((cat, idx) => `
        <div class="flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
            <span class="text-xs font-black uppercase text-slate-700 dark:text-slate-200">${idx + 1}. ${cat.toUpperCase()}</span>
            <div class="flex gap-1">
                <button onclick="window.moverCategoriaOrdem(${idx}, -1)" ${idx === 0 ? 'disabled' : ''} aria-label="Mover para cima" class="w-8 h-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center disabled:opacity-30 active:scale-95 transition-all"><i data-lucide="chevron-up" class="w-4 h-4"></i></button>
                <button onclick="window.moverCategoriaOrdem(${idx}, 1)" ${idx === window.ordemCategoriasState.length - 1 ? 'disabled' : ''} aria-label="Mover para baixo" class="w-8 h-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center disabled:opacity-30 active:scale-95 transition-all"><i data-lucide="chevron-down" class="w-4 h-4"></i></button>
            </div>
        </div>`).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
};

window.moverCategoriaOrdem = function(idx, delta) {
    const novoIdx = idx + delta;
    if (novoIdx < 0 || novoIdx >= window.ordemCategoriasState.length) return;
    [window.ordemCategoriasState[idx], window.ordemCategoriasState[novoIdx]] = [window.ordemCategoriasState[novoIdx], window.ordemCategoriasState[idx]];
    window.renderizarListaOrdemCategorias();
};

window.salvarOrdemCategorias = async function() {
    try {
        const valor = window.ordemCategoriasState.join(',');
        const { error } = await _supabase.from('configuracoes_sistema').upsert({
            id: 1,
            ordem_categorias: valor,
            updated_at: new Date().toISOString()
        });
        if (error) throw error;

        localStorage.setItem('ordemCategorias', valor);

        if (typeof registrarLog === 'function') {
            await registrarLog('SISTEMA', 'ALTEROU ORDEM DAS CATEGORIAS', valor.toUpperCase());
        }
        if (typeof showToast === 'function') showToast('ORDEM SALVA COM SUCESSO!', 'sucesso');
    } catch (e) {
        console.error('Erro ao salvar ordem das categorias:', e);
        if (typeof showToast === 'function') showToast('ERRO AO SALVAR ORDEM', 'erro');
    }
};

/* --- STATUS "LOJA ABERTA" (badge exibido em inicio.html/cardapio.html) --- */

window.carregarStatusLoja = async function() {
    try {
        const { data } = await _supabase.from('configuracoes_sistema').select('valor').eq('chave', 'loja_aberta').maybeSingle();
        const aberta = data ? data.valor === 'true' : true;

        const toggle = document.getElementById('toggle-loja-aberta');
        const label = document.getElementById('label-status-loja');
        const icone = document.getElementById('icone-status-loja');
        if (toggle) toggle.checked = aberta;
        if (label) label.innerText = aberta ? 'Loja aberta para pedidos' : 'Loja fechada no momento';

        const toggleCozinha = document.getElementById('toggle-loja-aberta-cozinha');
        if (toggleCozinha) toggleCozinha.checked = aberta;

        if (icone) {
            icone.classList.toggle('bg-emerald-100', aberta);
            icone.classList.toggle('dark:bg-emerald-900/30', aberta);
            icone.classList.toggle('text-emerald-600', aberta);
            icone.classList.toggle('dark:text-emerald-400', aberta);
            icone.classList.toggle('bg-slate-200', !aberta);
            icone.classList.toggle('dark:bg-slate-800', !aberta);
            icone.classList.toggle('text-slate-500', !aberta);
            icone.classList.toggle('dark:text-slate-400', !aberta);
        }
    } catch (e) {
        console.error('Erro ao carregar status da loja:', e);
    }
};

window.salvarStatusLoja = async function(aberta) {
    try {
        const { data: existente } = await _supabase.from('configuracoes_sistema').select('id').eq('chave', 'loja_aberta').maybeSingle();

        const valor = aberta ? 'true' : 'false';
        const { error } = existente
            ? await _supabase.from('configuracoes_sistema').update({ valor, updated_at: new Date().toISOString() }).eq('id', existente.id)
            : await _supabase.from('configuracoes_sistema').insert({ chave: 'loja_aberta', valor });
        if (error) throw error;

        if (typeof registrarLog === 'function') {
            await registrarLog('SISTEMA', aberta ? 'ABRIU A LOJA' : 'FECHOU A LOJA', '');
        }
        if (typeof showToast === 'function') showToast(aberta ? 'LOJA MARCADA COMO ABERTA' : 'LOJA MARCADA COMO FECHADA', 'sucesso');
        window.carregarStatusLoja();
    } catch (e) {
        console.error('Erro ao salvar status da loja:', e);
        if (typeof showToast === 'function') showToast('ERRO AO ATUALIZAR STATUS DA LOJA', 'erro');
    }
};

// Checa o status "loja aberta" antes de permitir um NOVO pedido (venda no
// balcão ou abertura de mesa). Não bloqueia pagar/fechar comandas que já
// estavam em andamento. Falha aberta (retorna true) se não conseguir
// consultar o banco, pra um problema de rede não travar todas as vendas.
window.verificarLojaAbertaOuAvisar = async function() {
    try {
        const { data } = await _supabase.from('configuracoes_sistema').select('valor').eq('chave', 'loja_aberta').maybeSingle();
        const aberta = data ? data.valor === 'true' : true;
        if (!aberta) {
            const msg = 'LOJA FECHADA. ATIVE A LOJA EM CONFIGURAÇÕES PARA RECEBER NOVOS PEDIDOS.';
            if (typeof showToast === 'function') showToast(msg, 'erro');
            else if (typeof alertaSistema === 'function') alertaSistema('Ative a loja em Configurações para receber novos pedidos.', 'Loja Fechada');
            else alert(msg);
        }
        return aberta;
    } catch (e) {
        console.error('Erro ao verificar status da loja:', e);
        return true;
    }
};

// Mostra quando foi o último backup automático (lido do próprio arquivo
// na nuvem, via _info.data_geracao gravada por scripts/backup-diario.js)
// e o último backup manual (guardado só neste navegador, em localStorage).
window.carregarStatusUltimoBackup = async function() {
    const labelAuto = document.getElementById('label-ultimo-backup-automatico');
    const labelManual = document.getElementById('label-ultimo-backup-manual');

    const formatarData = (isoStr) => new Date(isoStr).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    if (labelAuto) {
        try {
            const resp = await fetch('https://quqgblbqrrgmuhrlhuov.supabase.co/storage/v1/object/public/backups/ultimo-backup.json', { cache: 'no-store' });
            if (!resp.ok) throw new Error('Backup automático ainda não foi gerado.');
            const json = await resp.json();
            const dataGeracao = json?._info?.data_geracao;
            labelAuto.innerText = dataGeracao ? `Último backup automático: ${formatarData(dataGeracao)}` : 'Backup automático ainda não disponível.';
        } catch (e) {
            labelAuto.innerText = 'Backup automático ainda não disponível.';
        }
    }

    if (labelManual) {
        const ultimoManual = localStorage.getItem('ultimoBackup');
        labelManual.innerText = ultimoManual ? `Último backup manual (neste aparelho): ${formatarData(ultimoManual)}` : 'Nenhum backup manual feito neste aparelho ainda.';
    }
};

// Função para salvar as preferências do Ticket (AGORA COM CNPJ)
window.salvarConfiguracoes = async function() {
    // 1. Captura os valores do HTML
    const nomeLoja = document.getElementById('cfg-nome-loja')?.value || 'Espetinho & Cia';
    const cnpj = document.getElementById('config-cnpj')?.value || '';
    const telefone = document.getElementById('cfg-telefone-loja')?.value || ''; // NOVO CAMPO
    const endereco = document.getElementById('cfg-endereco-loja')?.value || ''; // NOVO CAMPO
    const layout = document.getElementById('cfg-ticket-layout')?.value || 'padrao';
    const modo = document.getElementById('cfg-modo-impressao')?.value || 'direto';
    
    // Identifica quem está logado para salvar o modo de impressão
    const usuarioLogado = localStorage.getItem('userName') || localStorage.getItem('usuarioLogado');

    // Feedback visual no botão
    if (typeof setLoading === 'function') {
        setLoading('btn-salvar-cfg', true);
    }

    try {
        // --- AÇÃO 1: SALVAR DADOS DA LOJA (Nuvem Supabase) ---
        const { error: errLoja } = await _supabase.from('configuracoes_sistema').upsert({
            id: 1, 
            nome_loja: nomeLoja,
            cnpj: cnpj,
            telefone: telefone, // ENVIANDO PARA O BANCO
            endereco: endereco, // ENVIANDO PARA O BANCO
            ticket_layout: layout,
            updated_at: new Date().toISOString()
        });
        if (errLoja) throw errLoja;

        // --- AÇÃO 2: SALVAR MODO DE IMPRESSÃO DO USUÁRIO (Nuvem) ---
        if (usuarioLogado) {
            const { error: errUser } = await _supabase.from('usuarios')
                .update({ modo_impressao: modo })
                .eq('nome', usuarioLogado); 
            
            if (errUser) console.error("Erro ao salvar modo do usuário:", errUser);
        }

        // --- AÇÃO 3: SINCRONIZAR MEMÓRIA LOCAL (LocalStorage) ---
        localStorage.setItem('nomeLoja', nomeLoja);
        localStorage.setItem('cnpjLoja', cnpj); // Ajustado para bater com a impressão
        localStorage.setItem('telefoneLoja', telefone); // SALVANDO NA MEMÓRIA
        localStorage.setItem('enderecoLoja', endereco); // SALVANDO NA MEMÓRIA
        localStorage.setItem('ticketLayout', layout);
        localStorage.setItem('modoImpressao', modo);

        // Auditoria
        if (typeof registrarLog === 'function') {
            await registrarLog('SISTEMA', `ALTEROU CONFIGURAÇÕES: ${nomeLoja} | CNPJ: ${cnpj}`);
        }

        if (typeof showToast === 'function') showToast('CONFIGURAÇÕES SALVAS COM SUCESSO!', 'sucesso');

    } catch (e) {
        console.error("Erro geral ao salvar:", e);
        if (typeof showToast === 'function') showToast('ERRO AO CONECTAR COM O BANCO', 'erro');
    } finally {
        if (typeof setLoading === 'function') {
            setLoading('btn-salvar-cfg', false, '<i data-lucide="save" class="w-4 h-4"></i> SALVAR');
        }
    }
};
// Função para carregar os dados salvos quando a tela abre (AGORA COM CNPJ)
window.carregarConfiguracoesNaTela = async function() {
    // 1. Tenta buscar os dados oficiais lá no banco primeiro (Sincronização)
    try {
        const { data: configBD } = await _supabase.from('configuracoes_sistema').select('*').eq('id', 1).single();
        if (configBD) {
            localStorage.setItem('nomeLoja', configBD.nome_loja || '');
            localStorage.setItem('ticketLayout', configBD.ticket_layout || 'padrao');
            // Ajustado para 'cnpjLoja' para manter padrão com o script de impressão
            localStorage.setItem('cnpjLoja', configBD.cnpj || ''); 
            // Adicionado os novos campos do banco
            localStorage.setItem('telefoneLoja', configBD.telefone || ''); 
            localStorage.setItem('enderecoLoja', configBD.endereco || ''); 
        }
    } catch (e) {
        console.warn("Usando dados locais. Não foi possível conectar ao banco:", e);
    }

    // 2. Agora sim, preenche os campos da tela com o que temos de mais atualizado
    const nome = localStorage.getItem('nomeLoja');
    const layout = localStorage.getItem('ticketLayout');
    const modo = localStorage.getItem('modoImpressao');
    const cnpj = localStorage.getItem('cnpjLoja'); // Lendo a chave ajustada
    const telefone = localStorage.getItem('telefoneLoja'); // Lendo o novo campo
    const endereco = localStorage.getItem('enderecoLoja'); // Lendo o novo campo

    if (nome) {
        const inputNome = document.getElementById('cfg-nome-loja');
        if (inputNome) inputNome.value = nome;
    }
    if (layout) {
        const selectLayout = document.getElementById('cfg-ticket-layout');
        if (selectLayout) selectLayout.value = layout;
    }
    if (modo) {
        const selectModo = document.getElementById('cfg-modo-impressao');
        if (selectModo) selectModo.value = modo;
    }
    if (cnpj) {
        const inputCnpj = document.getElementById('config-cnpj');
        if (inputCnpj) inputCnpj.value = cnpj;
    }
    if (telefone) {
        const inputTelefone = document.getElementById('cfg-telefone-loja');
        if (inputTelefone) inputTelefone.value = telefone;
    }
    if (endereco) {
        const inputEndereco = document.getElementById('cfg-endereco-loja');
        if (inputEndereco) inputEndereco.value = endereco;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Chama a função assíncrona para buscar os dados na nuvem assim que abrir
    window.carregarConfiguracoesNaTela();
});

/* -------------------------------------------------------------
   FUNÇÃO DE TESTE DE IMPRESSÃO (CONECTADA AO PRINT.JS)
   ------------------------------------------------------------- */
window.visualizarTicketTeste = function() {
    if (typeof showToast === 'function') showToast('GERANDO TICKETS DE TESTE...', 'aviso');
    
    // Monta a venda simulada para a Cozinha/Bar
    const vendaTeste = {
        id: "TESTE-001",
        data: new Date().toISOString(),
        criado_em: new Date().toISOString(),
        total: 31.50, 
        forma_pagamento: 'Dinheiro',
        vendedor: localStorage.getItem('userName') || 'TESTE',
        cliente_nome: 'CLIENTE VIP',
        itens: [
            { nome: 'ESPETO DE CARNE', qtd: 2, preco: 12.00 }, // Vai gerar 2 tickets separados
            { nome: 'REFRIGERANTE LATA', qtd: 1, preco: 7.50 }  // Vai gerar 1 ticket
        ]
    };

    // Manda para o motor de Tickets Individuais
    if (typeof window.imprimirCupom === 'function') {
        window.imprimirCupom(vendaTeste);
    } else {
        if (typeof showToast === 'function') showToast('ERRO: MOTOR DE CUPOM NÃO ENCONTRADO', 'erro');
    }
};

window.mascaraCNPJ = function(input) {
    let v = input.value.replace(/\D/g, ''); // Remove tudo que não é número
    if (v.length > 14) v = v.substring(0, 14); // Limita a 14 números
    
    v = v.replace(/^(\d{2})(\d)/, '$1.$2');
    v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
    v = v.replace(/\.(\d{3})(\d)/, '.$1/$2');
    v = v.replace(/(\d{4})(\d)/, '$1-$2');
    
    input.value = v;
};

window.mascaraTelefone = function(input) {
    // Remove tudo o que não for número
    let valor = input.value.replace(/\D/g, "");
    
    // Se não tiver nada, sai
    if (valor.length === 0) {
        input.value = "";
        return;
    }

    // Aplica a formatação dependendo da quantidade de números
    if (valor.length <= 10) {
        // Formato Fixo: (XX) XXXX-XXXX
        valor = valor.replace(/^(\d{2})(\d)/g, "($1) $2");
        valor = valor.replace(/(\d{4})(\d)/, "$1-$2");
    } else {
        // Formato Celular: (XX) XXXXX-XXXX
        valor = valor.replace(/^(\d{2})(\d)/g, "($1) $2");
        valor = valor.replace(/(\d{5})(\d)/, "$1-$2");
    }

    // Limita o tamanho máximo para 15 caracteres (com a formatação) e atualiza o input
    input.value = valor.substring(0, 15);
};

// =========================================================================
// GESTÃO DE COMPLEMENTOS (MOLHOS E FARINHAS)
// =========================================================================

// Abre o modal principal e carrega os dados
window.abrirModalAdminComplementos = function() {
    const modal = document.getElementById('modal-admin-complementos');
    if (modal) modal.classList.remove('hidden');
    carregarAdminComplementos();
};

// Fecha o modal principal
window.fecharModalAdminComplementos = function() {
    const modal = document.getElementById('modal-admin-complementos');
    if (modal) modal.classList.add('hidden');
};

// Função genérica para exibir erros (Substitui o "alert")
window.mostrarAlertaComplemento = function(mensagem) {
    const modal = document.getElementById('modal-alerta-complemento');
    const texto = document.getElementById('texto-alerta-complemento');
    if (texto) texto.innerText = mensagem;
    if (modal) modal.classList.remove('hidden');
};

// Busca os itens no Supabase
window.carregarAdminComplementos = async function() {
    const divLista = document.getElementById('lista-admin-complementos');
    if (!divLista) return;
    
    try {
        const { data, error } = await _supabase
            .from('complementos')
            .select('*')
            .order('tipo', { ascending: true })
            .order('nome', { ascending: true });
        
        if (error) throw error;

        if (!data || data.length === 0) {
            divLista.innerHTML = '<p class="text-xs text-slate-400 italic">Nenhum complemento cadastrado.</p>';
            return;
        }

        // ATUALIZADO: Os botões de Editar e Excluir agora chamam os modais e passam o nome
        divLista.innerHTML = data.map(c => `
            <div class="flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-xl border ${c.ativo ? 'border-slate-100 dark:border-slate-700' : 'border-red-100 dark:border-red-900/30 opacity-60'} mb-2">
                <div class="flex items-center gap-3">
                    <span class="text-xl"><i data-lucide="${c.tipo === 'molho' ? 'flask-conical' : 'soup'}" class="w-5 h-5 text-slate-500" aria-hidden="true"></i></span>
                    <div>
                        <p class="text-sm font-bold text-slate-700 dark:text-slate-200 ${!c.ativo && 'line-through'}">${c.nome}</p>
                        <p class="text-[9px] uppercase font-black ${c.ativo ? 'text-emerald-500' : 'text-red-500'}">${c.ativo ? 'Visível' : 'Oculto'}</p>
                    </div>
                </div>
                <div class="flex items-center gap-1">
                    <button onclick="abrirModalEditar('${c.id}', '${c.nome}')" aria-label="Editar complemento" class="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" title="Editar Nome">
                        <i data-lucide="pencil" class="w-4 h-4" aria-hidden="true"></i>
                    </button>
                    <button onclick="abrirModalExcluir('${c.id}', '${c.nome}')" aria-label="Excluir complemento" class="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors" title="Excluir Definitivamente">
                        <i data-lucide="trash-2" class="w-4 h-4" aria-hidden="true"></i>
                    </button>
                    <button onclick="alternarStatusComplemento('${c.id}', ${c.ativo})" class="text-[10px] font-bold px-2 h-8 rounded-lg uppercase tracking-wider ${c.ativo ? 'bg-orange-50 text-orange-600 hover:bg-orange-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'} transition-colors ml-1">
                        ${c.ativo ? 'Ocultar' : 'Ativar'}
                    </button>
                </div>
            </div>
        `).join('');
        if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (e) {
        console.error("Erro ao carregar lista admin de complementos:", e);
        divLista.innerHTML = '<p class="text-xs text-red-500 font-bold">Erro ao carregar lista.</p>';
    }
};

// Adiciona novo item
window.adicionarComplemento = async function(e) {
    e.preventDefault();
    const nomeInput = document.getElementById('novo-comp-nome');
    const tipoInput = document.getElementById('novo-comp-tipo');
    const btn = e.target.querySelector('button[type="submit"]'); // Assumindo que tem um botão submit
    
    if (!nomeInput.value) return;
    if (btn) btn.disabled = true; // Trava o botão

    try {
        const { error } = await _supabase.from('complementos').insert([
            { nome: nomeInput.value, tipo: tipoInput.value, ativo: true }
        ]);
        if (error) throw error;

        if (typeof registrarLog === 'function') {
            await registrarLog('SISTEMA', 'CADASTROU COMPLEMENTO', `${nomeInput.value.toUpperCase()} | TIPO: ${tipoInput.value.toUpperCase()}`);
        }

        nomeInput.value = '';
        if(typeof showToast === 'function') showToast("Adicionado com sucesso!");
        carregarAdminComplementos(); 
    } catch (e) {
        console.error("Erro ao adicionar:", e);
        mostrarAlertaComplemento("Erro ao adicionar item. Verifique sua conexão.");
    } finally {
        if (btn) btn.disabled = false; // Libera o botão
    }
};

// Alterna entre Visível e Oculto
window.alternarStatusComplemento = async function(id, statusAtual) {
    try {
        const { data: comp, error } = await _supabase.from('complementos').update({ ativo: !statusAtual }).eq('id', id).select('nome').maybeSingle();
        if (error) throw error;
        if (typeof registrarLog === 'function') {
            await registrarLog('SISTEMA', !statusAtual ? 'ATIVOU COMPLEMENTO' : 'DESATIVOU COMPLEMENTO', comp?.nome || `ID ${id}`);
        }
        carregarAdminComplementos();
    } catch (e) {
        console.error("Erro ao atualizar status:", e);
        mostrarAlertaComplemento("Erro ao atualizar status do item.");
    }
};

// --- FLUXO DE EXCLUSÃO (Substitui o window.excluirComplemento) ---
window.abrirModalExcluir = function(id, nome) {
    document.getElementById('excluir-comp-id').value = id;
    document.getElementById('excluir-comp-nome-display').innerText = nome;
    document.getElementById('modal-excluir-complemento').classList.remove('hidden');
};

window.confirmarExclusaoComplemento = async function() {
    const id = document.getElementById('excluir-comp-id').value;
    const nomeExibido = document.getElementById('excluir-comp-nome-display')?.innerText;

    try {
        const { error } = await _supabase.from('complementos').delete().eq('id', id);
        if (error) throw error;

        if (typeof registrarLog === 'function') {
            await registrarLog('SISTEMA', 'EXCLUIU COMPLEMENTO', nomeExibido || `ID ${id}`);
        }

        document.getElementById('modal-excluir-complemento').classList.add('hidden');
        if(typeof showToast === 'function') showToast("Item excluído!");
        carregarAdminComplementos(); 
    } catch (e) {
        console.error("Erro ao excluir:", e);
        document.getElementById('modal-excluir-complemento').classList.add('hidden');
        mostrarAlertaComplemento("Não foi possível excluir este item. Tente novamente.");
    }
};

// --- FLUXO DE EDIÇÃO (Substitui o window.editarComplemento) ---
window.abrirModalEditar = function(id, nomeAtual) {
    document.getElementById('edit-comp-id').value = id;
    document.getElementById('edit-comp-nome').value = nomeAtual;
    document.getElementById('modal-editar-complemento').classList.remove('hidden');
    
    // Dá foco automático no campo de texto ao abrir
    setTimeout(() => document.getElementById('edit-comp-nome').focus(), 100);
};

window.salvarEdicaoComplemento = async function() {
    const id = document.getElementById('edit-comp-id').value;
    const novoNome = document.getElementById('edit-comp-nome').value.trim();
    const btn = document.getElementById('btn-salvar-edicao'); // Dê este ID ao seu botão de salvar no modal
    
    if (!novoNome) return;
    if (btn) btn.disabled = true;

    try {
        const { error } = await _supabase.from('complementos').update({ nome: novoNome }).eq('id', id);
        if (error) throw error;

        if (typeof registrarLog === 'function') {
            await registrarLog('SISTEMA', 'RENOMEOU COMPLEMENTO', `ID ${id} | NOVO NOME: ${novoNome.toUpperCase()}`);
        }

        document.getElementById('modal-editar-complemento').classList.add('hidden');
        if(typeof showToast === 'function') showToast("Nome atualizado!");
        carregarAdminComplementos(); 
    } catch (e) {
        console.error("Erro ao editar:", e);
        mostrarAlertaComplemento("Erro ao salvar nome.");
    } finally {
        if (btn) btn.disabled = false;
    }
};