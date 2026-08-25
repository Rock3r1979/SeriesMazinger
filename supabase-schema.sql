-- ============================================================
-- SERIESMAZINGER - Esquema de base de datos (Fase 1)
-- Pega TODO este contenido en: Supabase → SQL Editor → Run
-- ============================================================

-- Perfiles (para compartir perfiles públicos en el futuro)
create table if not exists perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  alias text,
  bio text,
  avatar text,
  actualizado timestamptz default now()
);

-- Estado de la app sincronizado (listas, vistos, puntuaciones, recordatorios)
create table if not exists datos_usuario (
  usuario_id uuid not null references auth.users(id) on delete cascade,
  clave text not null,
  datos jsonb not null default '[]'::jsonb,
  actualizado timestamptz default now(),
  primary key (usuario_id, clave)
);

-- ============================================================
-- SEGURIDAD (RLS): cada usuario solo toca SUS datos
-- ============================================================
alter table perfiles enable row level security;
alter table datos_usuario enable row level security;

drop policy if exists "perfil propio" on perfiles;
create policy "perfil propio"
  on perfiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "perfiles visibles" on perfiles;
create policy "perfiles visibles"
  on perfiles for select
  using (true);

drop policy if exists "datos propios" on datos_usuario;
create policy "datos propios"
  on datos_usuario for all
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);
