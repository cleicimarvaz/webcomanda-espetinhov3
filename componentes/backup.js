/* =================================================================================
   backup.js — Exportação e restauração de backup JSON do sistema, e lembrete
   automático de backup periódico
   ================================================================================= */

// =================================================================
// SISTEMA DE BACKUP E RESTAURAÇÃO (JSON)
// =================================================================

// 📋 Lista EXATA das tabelas do seu Supabase (Corrigido)
const tabelasParaBackup = [
    'usuarios',
    'produtos',
    'caixa',                // Corrigido para o singular
    'movimentacoes_caixa',  // Substituiu o resumos_caixa
    'despesas',
    'comandas',
    'auditoria'
];

// 1. FUNÇÃO DE EXPORTAR (BAIXAR ARQUIVO)
window.fazerBackupSistema = async function() {
    try {
        if (typeof mostrarPilula === 'function') mostrarPilula("Gerando backup... Aguarde", "sucesso");

        const btn = event.currentTarget;
        const textoOriginal = btn.innerText;
        btn.innerText = "BAIXANDO...";
        btn.disabled = true;

        const backupData = {};

        // Busca os dados de cada tabela
        for (const tabela of tabelasParaBackup) {
            const { data, error } = await _supabase.from(tabela).select('*');
            if (error) {
                console.error(`Erro ao buscar dados da tabela ${tabela}:`, error);
                continue;
            }
            backupData[tabela] = data;
        }

        // Adiciona a data e hora do backup no arquivo
        backupData['_info'] = {
            data_geracao: new Date().toISOString(),
            sistema: "WebComanda - Espetinho & Cia"
        };

        // Cria o arquivo JSON e força o download
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);

        // Nome do arquivo com a data de hoje (ex: backup_webcomanda_2026-03-31.json)
        const dataAtual = new Date().toISOString().split('T')[0];
        downloadAnchorNode.setAttribute("download", `backup_webcomanda_${dataAtual}.json`);

        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();

        if (typeof mostrarPilula === 'function') mostrarPilula("Backup baixado com sucesso!", "sucesso");

        if (typeof registrarLog === 'function') {
            await registrarLog('SEGURANÇA', 'BACKUP MANUAL EXPORTADO', `ARQUIVO: BACKUP_WEBCOMANDA_${dataAtual}.JSON`);
        }

        localStorage.setItem('ultimoBackup', new Date().toISOString());
        if (typeof window.carregarStatusUltimoBackup === 'function') window.carregarStatusUltimoBackup();
        btn.innerText = textoOriginal;
        btn.disabled = false;

    } catch (error) {
        console.error("Erro no backup:", error);
        if (typeof mostrarPilula === 'function') mostrarPilula("Erro ao gerar backup.", "erro");
    }


};

// 2. FUNÇÃO DE RESTAURAR (LER ARQUIVO E ENVIAR PRO BANCO)
window.processarArquivoRestore = function(inputElement) {
    const file = inputElement.files[0];
    if (!file) return;

    // TRUQUE: Guardamos o arquivo na variável "file" e já limpamos o input.
    // Isso evita que o botão "trave" se o usuário cancelar a operação no modal.
    inputElement.value = '';

    // ----------------------------------------------------
    // SUBSTITUIÇÃO DO CONFIRM E ALERT
    // ----------------------------------------------------
    if (typeof confirmarAcao === 'function') {
        confirmarAcao(
            "Você está prestes a sobrescrever os dados do sistema com as informações deste arquivo. Tem certeza absoluta de que deseja continuar?",
            () => executarRestoreBaseDados(file), // Chama a lógica apenas se clicar em SIM
            "ATENÇÃO EXTREMA"
        );
    } else {
        // Fallback de segurança
        const confirmacao = confirm("ATENÇÃO EXTREMA!\n\nVocê está prestes a sobrescrever os dados...\n\nTem certeza absoluta?");
        if (confirmacao) executarRestoreBaseDados(file);
    }

    // Isolamos a lógica gigante dentro de uma função para o código ficar limpo
    function executarRestoreBaseDados(arquivoBackup) {
        const reader = new FileReader();

        reader.onload = async function(e) {
            try {
                if (typeof mostrarPilula === 'function') mostrarPilula("Restaurando dados... NÃO FECHE A TELA!", "sucesso");

                const contents = e.target.result;
                const backupData = JSON.parse(contents);

                // Importa as tabelas na mesma ordem para respeitar dependências
                for (const tabela of tabelasParaBackup) {
                    if (backupData[tabela] && backupData[tabela].length > 0) {

                        // O comando UPSERT insere dados novos e atualiza os que já existem
                        const { error } = await _supabase
                            .from(tabela)
                            .upsert(backupData[tabela]);

                        if (error) {
                            console.error(`❌ Erro ao restaurar a tabela ${tabela}:`, error);
                        } else {
                            console.log(`✅ Tabela ${tabela} restaurada com sucesso!`);
                        }
                    }
                }

                if (typeof registrarLog === 'function') {
                    await registrarLog('SEGURANÇA', 'RESTAURAÇÃO DE BACKUP', `ARQUIVO: ${arquivoBackup.name} | TABELAS: ${tabelasParaBackup.filter((t) => backupData[t]?.length > 0).join(', ')}`);
                }

                if (typeof mostrarPilula === 'function') mostrarPilula("Restauração concluída! Reiniciando sistema...", "sucesso");

                // Recarrega a página para puxar os dados novos
                setTimeout(() => {
                    window.location.reload();
                }, 2000);

            } catch (error) {
                console.error("Erro na restauração:", error);
                if (typeof mostrarPilula === 'function') mostrarPilula("Erro: Arquivo inválido ou corrompido.", "erro");

                // Substituição do Alert final de erro
                if (typeof alertaSistema === 'function') {
                    alertaSistema("Erro ao ler o arquivo. Certifique-se de que é um backup válido gerado pelo sistema.", "Erro de Restauração");
                } else {
                    alert("Erro ao ler o arquivo. Certifique-se de que é um backup válido gerado pelo sistema.");
                }
            }
        };

        reader.readAsText(arquivoBackup);
    }
};

// =================================================================
// LEMBRETE AUTOMÁTICO DE BACKUP
// =================================================================
window.verificarLembreteBackup = function() {
    const ultimoBackup = localStorage.getItem('ultimoBackup');

    // Pega a função de notificação que estiver disponível
    const notificar = typeof mostrarPilula === 'function' ? mostrarPilula :
                     (typeof showToast === 'function' ? showToast : alert);

    if (!ultimoBackup) {
        // Se nunca fez backup neste navegador
        setTimeout(() => notificar("Recomendado: Faça um Backup!", "erro"), 3000);
    } else {
        // Se já fez, verifica se faz mais de 3 dias
        const dataUltimo = new Date(ultimoBackup);
        const agora = new Date();
        const diferencaDias = (agora - dataUltimo) / (1000 * 60 * 60 * 24);

        if (diferencaDias > 3) {
            setTimeout(() => notificar("Atenção: Faça um Backup dos dados!", "erro"), 3000);
        }
    }
};

// Faz o lembrete rodar silenciosamente quando o sistema abre
document.addEventListener('DOMContentLoaded', () => {
    // Dá um tempinho (3 seg) para não embolar com a mensagem de "Login Aprovado"
    setTimeout(() => {
        if (typeof window.verificarLembreteBackup === 'function') {
            window.verificarLembreteBackup();
        }
    }, 3000);
});
