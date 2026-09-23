-- =====================================================================
-- MIGRAÇÃO: Venda de Ingressos de Evento com validação por QR Code
-- =====================================================================
-- Rode este script no SQL Editor do seu projeto Supabase.
--
-- IMPORTANTE: a coluna evento_id abaixo assume que "eventos.id" é do
-- tipo UUID (padrão do Supabase quando a tabela é criada pelo painel
-- com "Enable Row Level Security" e chave primária padrão). Se a sua
-- tabela "eventos" usa um ID numérico (bigint/int8/serial), troque
-- "uuid" por "bigint" nas duas colunas "evento_id" abaixo antes de
-- rodar o script.
-- =====================================================================

-- 1. Tipos de ingresso de um evento (ex: Pista, VIP, Meia-entrada)
create table if not exists public.tipos_ingresso (
    id uuid primary key default gen_random_uuid(),
    evento_id uuid not null references public.eventos(id) on delete cascade,
    nome text not null,
    preco numeric(10,2) not null check (preco >= 0),
    quantidade_total integer, -- null = sem limite de quantidade
    quantidade_vendida integer not null default 0,
    ativo boolean not null default true,
    created_at timestamptz not null default now()
);

create index if not exists idx_tipos_ingresso_evento on public.tipos_ingresso(evento_id);

-- 2. Ingressos vendidos (um registro por ingresso individual, com QR próprio)
create table if not exists public.ingressos (
    id uuid primary key default gen_random_uuid(),
    evento_id uuid not null references public.eventos(id) on delete cascade,
    tipo_ingresso_id uuid not null references public.tipos_ingresso(id) on delete restrict,
    codigo_unico uuid not null default gen_random_uuid() unique, -- é isto que vai codificado no QR
    comprador_nome text not null,
    comprador_telefone text,
    canal_venda text not null check (canal_venda in ('balcao', 'publico')),
    valor_pago numeric(10,2) not null default 0,
    status text not null default 'pendente' check (status in ('pendente', 'confirmado', 'utilizado', 'cancelado')),
    vendido_por text, -- nome do colaborador que registrou a venda (canal 'balcao')
    data_venda timestamptz not null default now(),
    data_utilizacao timestamptz,
    validado_por text, -- nome do colaborador que validou o ingresso na entrada
    created_at timestamptz not null default now()
);

create index if not exists idx_ingressos_evento on public.ingressos(evento_id);
create index if not exists idx_ingressos_codigo on public.ingressos(codigo_unico);
create index if not exists idx_ingressos_status on public.ingressos(status);

-- =====================================================================
-- OPCIONAL, MAS RECOMENDADO: Row Level Security (RLS)
-- =====================================================================
-- A auditoria técnica deste projeto (arq/auditoria-tecnica-2026-07-27.md)
-- identificou que toda a autorização do sistema hoje depende de RLS bem
-- configurado no Supabase, já que o client roda com a chave pública.
-- Sem RLS, qualquer pessoa pode inserir um ingresso já com
-- status='confirmado' diretamente pela API, pulando a validação do
-- colaborador. As políticas abaixo são um ponto de partida razoável;
-- ajuste-as à sua estratégia de autenticação real.
--
-- alter table public.tipos_ingresso enable row level security;
-- alter table public.ingressos enable row level security;
--
-- -- Leitura pública (necessária para a página pública de ingressos
-- -- mostrar tipos/preços e para o comprador ver seu próprio QR):
-- create policy "Leitura publica de tipos de ingresso"
--     on public.tipos_ingresso for select using (true);
-- create policy "Leitura publica de ingressos"
--     on public.ingressos for select using (true);
--
-- -- Escrita: idealmente restrita a uma role autenticada de
-- -- colaborador/admin. Substitua "true" por uma checagem real de
-- -- autenticação (ex: auth.role() = 'authenticated') assim que o
-- -- sistema migrar do localStorage para o Supabase Auth.
-- create policy "Escrita de ingressos"
--     on public.ingressos for insert with check (true);
-- create policy "Atualizacao de ingressos"
--     on public.ingressos for update using (true);
