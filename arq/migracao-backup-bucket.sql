-- =====================================================================
-- BUCKET DE STORAGE PARA BACKUP AUTOMÁTICO DIÁRIO
-- =====================================================================
-- O backup automático (rodado via GitHub Actions todo dia às 04:00,
-- ver .github/workflows/backup-diario.yml) sobe um arquivo JSON pra
-- esse bucket usando a mesma chave publicável (anon) que o resto do
-- sistema já usa no navegador — por isso a política de escrita segue
-- o mesmo padrão público já usado nos buckets "produtos"/"eventos"
-- (ver arq/schema-completo-novo-banco.sql, seção 6.2).
--
-- Idempotente: seguro rodar de novo se precisar.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('backups', 'backups', true, 20971520, array['application/json'])
on conflict (id) do nothing;

do $$
declare
  acao text;
begin
  foreach acao in array array['Leitura', 'Escrita', 'Atualizacao', 'Exclusao']
  loop
    execute format('drop policy if exists "%s publica bucket backups" on storage.objects;', acao);
  end loop;
  execute 'create policy "Leitura publica bucket backups" on storage.objects for select using (bucket_id = ''backups'');';
  execute 'create policy "Escrita publica bucket backups" on storage.objects for insert with check (bucket_id = ''backups'');';
  execute 'create policy "Atualizacao publica bucket backups" on storage.objects for update using (bucket_id = ''backups'');';
  execute 'create policy "Exclusao publica bucket backups" on storage.objects for delete using (bucket_id = ''backups'');';
end $$;
