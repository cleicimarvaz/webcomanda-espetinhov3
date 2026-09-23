// Script de backup automático diário, rodado pelo GitHub Actions.
// As credenciais são fornecidas por variáveis de ambiente/Secrets do GitHub.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn('Backup não executado: SUPABASE_URL e SUPABASE_KEY não estão configuradas.');
    process.exit(0);
}

const TABELAS_BACKUP = [
    'usuarios',
    'produtos',
    'caixa',
    'movimentacoes_caixa',
    'despesas',
    'comandas',
    'auditoria',
];

async function buscarTabela(nome) {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/${nome}?select=*`, {
        headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
        },
    });
    if (!resp.ok) {
        console.error(`Aviso: falha ao buscar "${nome}" (${resp.status}), pulando.`);
        return [];
    }
    return resp.json();
}

async function subirArquivo(caminho, conteudoJson) {
    const resp = await fetch(`${SUPABASE_URL}/storage/v1/object/backups/${caminho}`, {
        method: 'POST',
        headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'x-upsert': 'true',
        },
        body: conteudoJson,
    });
    if (!resp.ok) {
        throw new Error(`Falha ao subir "${caminho}": ${resp.status} ${await resp.text()}`);
    }
}

async function main() {
    console.log('Iniciando backup automático...');

    const backupData = {};
    for (const tabela of TABELAS_BACKUP) {
        console.log(`Lendo tabela: ${tabela}`);
        backupData[tabela] = await buscarTabela(tabela);
    }

    backupData._info = {
        data_geracao: new Date().toISOString(),
        sistema: 'WebComanda - Espetinho & Cia',
        origem: 'backup automático (GitHub Actions, 04:00 diário)',
    };

    const conteudoJson = JSON.stringify(backupData, null, 2);
    const dataArquivo = new Date().toISOString().split('T')[0];

    await subirArquivo(`historico/backup_${dataArquivo}.json`, conteudoJson);
    console.log(`Backup do dia salvo: historico/backup_${dataArquivo}.json`);

    await subirArquivo('ultimo-backup.json', conteudoJson);
    console.log('Backup mais recente atualizado: ultimo-backup.json');

    console.log('Backup automático concluído com sucesso.');
}

main().catch((err) => {
    console.error('ERRO NO BACKUP AUTOMÁTICO:', err);
    process.exit(1);
});
