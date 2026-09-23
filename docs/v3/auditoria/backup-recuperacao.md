# Auditoria de backup e recuperação

## Mecanismos atuais

A V2 possui dois caminhos:

### Backup manual

`componentes/backup.js` consulta diretamente um conjunto de tabelas e gera um arquivo JSON para download.

Tabelas incluídas atualmente:

- `usuarios`;
- `produtos`;
- `caixa`;
- `movimentacoes_caixa`;
- `despesas`;
- `comandas`;
- `auditoria`.

### Backup automático

`scripts/backup-diario.js` usa as variáveis de ambiente `SUPABASE_URL` e `SUPABASE_KEY` e é executado por GitHub Actions. O arquivo é enviado ao bucket `backups` no Storage.

O workflow seguro usa secrets do GitHub para fornecer essas variáveis.

Existe também um workflow antigo sem essas variáveis, que apenas inicia o script; com a proteção atual do script, ele encerra sem executar o backup quando os valores não estão configurados.

## Limitações do conjunto atual

O schema documenta 21 tabelas principais, enquanto o backup manual e automático atual cobre somente 7 tabelas. Portanto, o mecanismo atual não representa uma cópia completa do banco.

Também existem dados em Storage e configurações que não estão cobertos por esse conjunto de tabelas.

## Restauração

A restauração manual lê o JSON e executa `upsert` tabela por tabela.

Isso é útil para recuperação simples, mas não equivale a uma restauração transacional: uma tabela pode ser restaurada enquanto outra falha.

Não há, no fluxo atual, uma etapa única de validação integral, versionamento do formato, simulação/dry-run ou rollback da restauração.

## Segurança

O backup inclui `usuarios`, e o modelo atual possui dados de autenticação nessa tabela. Os arquivos de backup devem ser tratados como informação sensível.

O schema atual também prevê políticas públicas no Storage para os buckets relacionados ao sistema. Isso merece revisão antes que backups sejam armazenados ali como artefatos recuperáveis.

Nenhuma credencial secreta deve ficar no repositório. O script automático já foi ajustado para usar variáveis de ambiente.

## Estratégia para a V3

A V3 deve separar:

- backup operacional;
- exportação para suporte;
- snapshot completo do banco;
- arquivos do Storage;
- configuração do sistema;
- auditoria;
- restauração parcial;
- restauração completa.

Também devem ser definidos:

- retenção;
- criptografia;
- controle de acesso;
- identificação de versão do backup;
- checksum/integridade;
- logs de execução;
- alertas de falha;
- teste periódico de restauração.

## Objetivo de recuperação

O requisito deve ser medido por dados efetivamente recuperáveis, não apenas pela existência de um arquivo JSON. Cada tipo de backup precisa ter procedimento documentado de restauração e teste.