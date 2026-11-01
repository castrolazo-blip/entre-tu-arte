-- ════════════════════════════════════════════════════════════════════════════
-- Entre tu Arte · Web modular (v2)
-- Agrega: administradores con login real, artistas, existencias y estado de cada
-- obra, portadas dinámicas, obras destacadas, consultas de clientes y seguridad
-- por filas (RLS) para que solo un administrador pueda escribir.
--
-- ORDEN PARA APLICARLA (ver docs/PUESTA_EN_MARCHA.md):
--   1. Publicar la web nueva.
--   2. Crear el usuario administrador en Supabase › Authentication.
--   3. Ejecutar este archivo en Supabase › SQL Editor.
--   4. Registrar al administrador:  insert into public.admins (user_id, nombre)
--        select id, 'Ronald' from auth.users where email = 'TU_CORREO';
-- Desde ese momento el panel viejo (con contraseña en la página) deja de poder
-- escribir, que es justo lo que se busca.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Administradores ─────────────────────────────────────────────────────────
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nombre  text,
  creado  timestamptz not null default now()
);

create or replace function public.es_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$ select exists (select 1 from public.admins where user_id = auth.uid()) $$;

-- ── Artistas ────────────────────────────────────────────────────────────────
create table if not exists public.artistas (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null,
  slug       text unique,
  bio        text,
  ciudad     text,
  foto_url   text,
  activo     boolean not null default true,
  orden      int not null default 0,
  created_at timestamptz not null default now()
);

-- Artistas que ya estaban en la lista del publicador anterior (configuracion.pub_artistas)
insert into public.artistas (nombre, slug)
select distinct trim(v), regexp_replace(lower(translate(trim(v), 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')), '[^a-z0-9]+', '-', 'g')
from public.configuracion c,
     lateral jsonb_array_elements_text(case when c.valor ~ '^\s*\[' then c.valor::jsonb else '[]'::jsonb end) as v
where c.clave = 'pub_artistas' and trim(v) <> ''
on conflict (slug) do nothing;

-- ── Obras (tabla existente "fichas") ────────────────────────────────────────
alter table public.fichas
  add column if not exists descripcion      text,
  add column if not exists estilo           text,
  add column if not exists tecnica          text,
  add column if not exists soporte          text,
  add column if not exists alto_cm          numeric(7,1),
  add column if not exists ancho_cm         numeric(7,1),
  add column if not exists diametro_cm      numeric(7,1),
  add column if not exists medidas          text,
  add column if not exists precio           numeric(10,2),
  add column if not exists anio             int,
  add column if not exists existencias      int not null default 1,
  add column if not exists edicion_total    int,
  add column if not exists artista_id       uuid references public.artistas(id) on delete set null,
  add column if not exists artista_nombre   text,
  add column if not exists fotos            jsonb not null default '[]'::jsonb,
  add column if not exists ficha_url        text,
  add column if not exists publicacion      text,
  add column if not exists espacios         text[] not null default '{}',
  add column if not exists destacada        boolean not null default false,
  add column if not exists orden_destacada  int,
  add column if not exists reservada_hasta  timestamptz,
  add column if not exists vendida_en       timestamptz,
  add column if not exists updated_at       timestamptz not null default now();

update public.fichas set estado = 'disponible' where estado is null;
update public.fichas set existencias = 0 where estado = 'vendida' and existencias <> 0;
alter table public.fichas alter column estado set default 'disponible';
alter table public.fichas drop constraint if exists fichas_estado_check;
alter table public.fichas add constraint fichas_estado_check
  check (estado in ('borrador', 'disponible', 'reservada', 'vendida'));

create index if not exists fichas_estado_idx    on public.fichas (estado);
create index if not exists fichas_destacada_idx on public.fichas (destacada) where destacada;
create index if not exists fichas_artista_idx   on public.fichas (artista_id);

create or replace function public.tocar_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists fichas_updated_at on public.fichas;
create trigger fichas_updated_at before update on public.fichas
  for each row execute function public.tocar_updated_at();

-- Una obra vendida sale sola del banner de destacadas
create or replace function public.fichas_vendida_sale_de_destacadas()
returns trigger language plpgsql as $$
begin
  if new.estado = 'vendida' then
    new.destacada := false;
    if old.estado is distinct from 'vendida' then new.vendida_en := coalesce(new.vendida_en, now()); end if;
  end if;
  return new;
end $$;

drop trigger if exists fichas_vendida_destacada on public.fichas;
create trigger fichas_vendida_destacada before insert or update on public.fichas
  for each row execute function public.fichas_vendida_sale_de_destacadas();

-- ── Portadas dinámicas (carrusel del inicio) ────────────────────────────────
create table if not exists public.portadas (
  id                uuid primary key default gen_random_uuid(),
  imagen_url        text not null,
  imagen_movil_url  text,
  titular           text,
  subtitulo         text,
  boton_texto       text,
  boton_enlace      text,
  ficha_id          text,
  orden             int not null default 0,
  activa            boolean not null default true,
  desde             date,
  hasta             date,
  created_at        timestamptz not null default now()
);

-- ── Consultas de clientes (compra, reserva, encargo, asesoría, contacto) ────
create table if not exists public.consultas (
  id          uuid primary key default gen_random_uuid(),
  tipo        text not null default 'contacto'
              check (tipo in ('compra', 'reserva', 'encargo', 'asesoria', 'contacto')),
  ficha_id    text,
  ficha_titulo text,
  nombre      text not null,
  email       text,
  telefono    text,
  mensaje     text,
  datos       jsonb not null default '{}'::jsonb,
  estado      text not null default 'nueva' check (estado in ('nueva', 'en_proceso', 'cerrada')),
  created_at  timestamptz not null default now()
);

-- ════════════════════════════════════════════════════════════════════════════
-- Seguridad por filas. Se eliminan las políticas anteriores de estas tablas
-- (si existían) para que ninguna regla vieja siga permitiendo escribir sin login.
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare r record;
begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('fichas', 'categorias', 'configuracion', 'blogs', 'analytics',
                        'artistas', 'portadas', 'consultas', 'admins')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

alter table public.admins        enable row level security;
alter table public.artistas      enable row level security;
alter table public.fichas        enable row level security;
alter table public.categorias    enable row level security;
alter table public.configuracion enable row level security;
alter table public.blogs         enable row level security;
alter table public.analytics     enable row level security;
alter table public.portadas      enable row level security;
alter table public.consultas     enable row level security;

-- admins: cada usuario puede saber si él mismo es admin
create policy admins_leer_propio on public.admins for select using (user_id = auth.uid());

-- Lectura pública / escritura solo admin
create policy fichas_leer on public.fichas for select
  using (estado <> 'borrador' or public.es_admin());
create policy fichas_admin on public.fichas for all
  using (public.es_admin()) with check (public.es_admin());

create policy artistas_leer on public.artistas for select using (activo or public.es_admin());
create policy artistas_admin on public.artistas for all
  using (public.es_admin()) with check (public.es_admin());

create policy categorias_leer on public.categorias for select using (true);
create policy categorias_admin on public.categorias for all
  using (public.es_admin()) with check (public.es_admin());

-- La clave de la IA nunca se guarda aquí: está en la función del servidor.
create policy configuracion_leer on public.configuracion for select using (true);
create policy configuracion_admin on public.configuracion for all
  using (public.es_admin()) with check (public.es_admin());

create policy blogs_leer on public.blogs for select using (publicado or public.es_admin());
create policy blogs_admin on public.blogs for all
  using (public.es_admin()) with check (public.es_admin());

create policy portadas_leer on public.portadas for select using (
  public.es_admin() or (
    activa
    and (desde is null or desde <= current_date)
    and (hasta is null or hasta >= current_date)
  )
);
create policy portadas_admin on public.portadas for all
  using (public.es_admin()) with check (public.es_admin());

-- Visitas: cualquiera registra, solo el admin consulta
create policy analytics_registrar on public.analytics for insert with check (true);
create policy analytics_admin on public.analytics for select using (public.es_admin());

-- Consultas: cualquiera envía (siempre como "nueva"); solo el admin lee y gestiona
create policy consultas_enviar on public.consultas for insert with check (estado = 'nueva');
create policy consultas_admin_leer on public.consultas for select using (public.es_admin());
create policy consultas_admin_editar on public.consultas for update
  using (public.es_admin()) with check (public.es_admin());
create policy consultas_admin_borrar on public.consultas for delete using (public.es_admin());

-- ── Almacenamiento (bucket "catalogos") ─────────────────────────────────────
-- Lectura pública. Solo el admin sube, cambia o borra; los clientes solo pueden
-- subir la foto de su pared dentro de la carpeta "asesorias/".
do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (coalesce(qual, '') ilike '%catalogos%' or coalesce(with_check, '') ilike '%catalogos%')
  loop
    execute format('drop policy if exists %I on storage.objects', r.policyname);
  end loop;
end $$;

create policy catalogos_leer on storage.objects for select
  using (bucket_id = 'catalogos');
create policy catalogos_admin_subir on storage.objects for insert
  with check (bucket_id = 'catalogos' and public.es_admin());
create policy catalogos_admin_cambiar on storage.objects for update
  using (bucket_id = 'catalogos' and public.es_admin());
create policy catalogos_admin_borrar on storage.objects for delete
  using (bucket_id = 'catalogos' and public.es_admin());
create policy catalogos_clientes_asesoria on storage.objects for insert
  with check (bucket_id = 'catalogos' and (storage.foldername(name))[1] = 'asesorias');
