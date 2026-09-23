/* =================================================================================
   MÓDULO DE AUTENTICAÇÃO (LOGIN) - ATUALIZADO COM AUDITORIA 3.0 E LEMBRAR-ME
   ================================================================================= */

// =================================================================
// 1. VERIFICAR "LEMBRAR-ME" AO CARREGAR A PÁGINA
// =================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Busca se existe um usuário salvo especificamente pelo "Lembrar-me"
    const usuarioSalvo = localStorage.getItem('lembrar_usuario_login');
    
    if (usuarioSalvo) {
        const inputUser = document.getElementById('user');
        const checkboxLembrar = document.getElementById('lembrar-me');
        const inputPass = document.getElementById('pass');
        
        if (inputUser && checkboxLembrar) {
            inputUser.value = usuarioSalvo; // Preenche o usuário
            checkboxLembrar.checked = true; // Deixa a caixinha marcada
            
            // Dá foco no campo de senha para agilizar a vida do usuário
            if (inputPass) {
                setTimeout(() => inputPass.focus(), 100);
            }
        }
    }
});

// =================================================================
// FUNÇÃO DA NOTIFICAÇÃO EM PÍLULA (RODAPÉ)
// =================================================================
window.mostrarPilula = function(mensagem, tipo = 'sucesso') {
    // Remove pílula anterior se existir, para não empilhar
    const pilulaAntiga = document.getElementById('notificacao-pilula');
    if (pilulaAntiga) pilulaAntiga.remove();

    // Cria a nova pílula
    const pilula = document.createElement('div');
    pilula.id = 'notificacao-pilula';
    
    // Define a cor baseada no tipo (Verde para sucesso, Vermelho para erro)
    const corFundo = tipo === 'sucesso' ? 'bg-green-500' : 'bg-red-500';
    const icone = tipo === 'sucesso' ? 'check-circle-2' : 'alert-triangle';

    // Classes do Tailwind para o formato de pílula e animação (fica invisível e mais para baixo no início)
    pilula.className = `fixed bottom-10 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-2xl text-sm font-bold text-white transition-all duration-300 translate-y-10 opacity-0 flex items-center gap-2 ${corFundo}`;
    pilula.setAttribute('role', 'status');
    pilula.setAttribute('aria-live', 'polite');

    pilula.innerHTML = `<i data-lucide="${icone}" class="w-4 h-4 shrink-0" aria-hidden="true"></i> <span>${mensagem}</span>`;

    document.body.appendChild(pilula);
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Dá um tempinho mínimo para o navegador renderizar e depois aciona a animação de subir
    setTimeout(() => {
        pilula.classList.remove('translate-y-10', 'opacity-0');
        pilula.classList.add('translate-y-0', 'opacity-100');
    }, 10);
    
    // Some após 3 segundos
    setTimeout(() => {
        pilula.classList.remove('translate-y-0', 'opacity-100');
        pilula.classList.add('translate-y-10', 'opacity-0');
        setTimeout(() => pilula.remove(), 300); // Remove do HTML após a animação de descida
    }, 3000);
};

// =================================================================
// FUNÇÃO DE LOGIN ATUALIZADA COM A PÍLULA E LEMBRAR-ME
// =================================================================
window.fazerLogin = async function(event) {
    if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
    }

    const btnEntrar = document.getElementById('btn-entrar');
    const usuarioInput = document.getElementById('user').value.trim().toLowerCase();
    const senhaInput = document.getElementById('pass').value;
    
    if (!usuarioInput || !senhaInput) {
        mostrarPilula("Preencha usuário e senha!", "erro");
        return;
    }

    if (typeof _supabase === 'undefined' || !_supabase) {
        console.error("❌ [LOGIN] Erro: Conexão com Supabase não inicializada.");
        mostrarPilula("Erro: Sem conexão com o banco de dados.", "erro");
        return;
    }

    try {
        if (btnEntrar) {
            btnEntrar.disabled = true;
            btnEntrar.innerText = "AUTENTICANDO...";
            btnEntrar.classList.add('opacity-70', 'cursor-not-allowed');
        }

        const { data: user, error } = await _supabase
            .from('usuarios')
            .select('*')
            .eq('usuario', usuarioInput)
            .eq('senha', senhaInput)
            .single();

        if (error || !user) {
            mostrarPilula("Usuário ou senha incorretos!", "erro");
            // Sem sessão ainda: registrarLog cai no padrão 'SISTEMA' como usuário.
            if (typeof registrarLog === 'function') {
                await registrarLog('SEGURANÇA', 'FALHA DE LOGIN', `TENTATIVA COM LOGIN: ${usuarioInput.toUpperCase()}`);
            }
            restaurarBotao();
            return;
        }

        if (user.ativo === false) {
            mostrarPilula("Usuário inativo. Fale com a gerência.", "erro");
            if (typeof registrarLog === 'function') {
                await registrarLog('SEGURANÇA', 'TENTATIVA DE LOGIN EM CONTA INATIVA', `LOGIN: ${usuarioInput.toUpperCase()}`);
            }
            restaurarBotao();
            return;
        }

        // SALVA DADOS DA SESSÃO NO NAVEGADOR
        const nomeUsuario = user.nome || user.usuario;
        localStorage.setItem('userName', nomeUsuario);
        localStorage.setItem('userLogin', user.usuario);
        localStorage.setItem('userNivel', user.nivel || 'VENDEDOR');
        localStorage.setItem('ultimoAcesso', Date.now().toString()); 
        localStorage.setItem('userId', user.id); 
        localStorage.setItem('modoImpressao', user.modo_impressao || 'navegador');

        // 2. LÓGICA DO "LEMBRAR-ME"
        const checkboxLembrar = document.getElementById('lembrar-me');
        if (checkboxLembrar && checkboxLembrar.checked) {
            // Se marcou, salva o login para a próxima vez
            localStorage.setItem('lembrar_usuario_login', user.usuario);
        } else {
            // Se não marcou, garante que não fique salvo
            localStorage.removeItem('lembrar_usuario_login');
        }

        // REGISTRO DE AUDITORIA
        if (typeof registrarLog === 'function') {
            const nomeLog = nomeUsuario.toUpperCase();
            const loginLog = user.usuario.toUpperCase();
            const nivelLog = (user.nivel || 'VENDEDOR').toUpperCase();

            await registrarLog(
                'SEGURANÇA', 
                'LOGIN NO SISTEMA', 
                `O USUÁRIO ${nomeLog} (LOGIN: ${loginLog}) ACESSOU O SISTEMA. NÍVEL: ${nivelLog}`
            );
        }

        // SUCESSO! Mostra a pílula verde e espera 1 segundo para o usuário ler
        mostrarPilula("Login aprovado! Entrando...", "sucesso");
        
        setTimeout(() => {
            window.location.href = 'home.html';
        }, 1000); 

    } catch (e) {
        console.error("❌ [LOGIN] Erro fatal no processo:", e);
        mostrarPilula("Erro de conexão com o servidor", "erro");
        restaurarBotao();
    }

    function restaurarBotao() {
        if (btnEntrar) {
            btnEntrar.disabled = false;
            btnEntrar.innerText = "ENTRAR NO SISTEMA";
            btnEntrar.classList.remove('opacity-70', 'cursor-not-allowed');
        }
    }
}
