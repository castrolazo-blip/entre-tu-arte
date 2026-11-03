-- Marketplace: cuadros de artistas salvadoreños y de coleccionistas que se venden a través de
-- Entre tu Arte. El comprador solo trata con la página; los datos del vendedor y el precio que
-- recibe quedan en una tabla privada (solo el administrador la lee). Se puede ejecutar más de una vez.

-- Las obras publicadas indican de dónde vienen (las de siempre quedan como 'entre_tu_arte')
alter table public.fichas add column if not exists origen text not null default 'entre_tu_arte';
alter table public.fichas drop constraint if exists fichas_origen_check;
alter table public.fichas add constraint fichas_origen_check check (origen in ('entre_tu_arte', 'marketplace'));

-- Solicitudes de venta (privadas)
create table if not exists public.marketplace_solicitudes (
  id               uuid primary key default gen_random_uuid(),
  tipo_vendedor    text not null default 'artista' check (tipo_vendedor in ('artista', 'coleccionista')),
  nombre           text not null,
  telefono         text,
  email            text,
  titulo           text,
  descripcion      text,
  tecnica          text,
  alto_cm          numeric,
  ancho_cm         numeric,
  piezas           smallint not null default 1,
  precio_deseado   numeric,
  fotos            jsonb not null default '[]'::jsonb,
  notas            text,
  estado           text not null default 'pendiente'
                   check (estado in ('pendiente', 'aprobada', 'rechazada', 'pagada')),
  ficha_id         text,
  precio_publicado numeric,
  comision_pct     numeric,
  nota_admin       text,
  created_at       timestamptz not null default now(),
  actualizado      timestamptz
);

-- Artista de cada cuadro (el vendedor puede tener cuadros de distintos artistas; null = anónimo)
alter table public.marketplace_solicitudes add column if not exists autor text;
alter table public.marketplace_solicitudes add column if not exists autor_anonimo boolean not null default false;

alter table public.marketplace_solicitudes enable row level security;
drop policy if exists mkt_enviar on public.marketplace_solicitudes;
drop policy if exists mkt_admin_leer on public.marketplace_solicitudes;
drop policy if exists mkt_admin_editar on public.marketplace_solicitudes;
drop policy if exists mkt_admin_borrar on public.marketplace_solicitudes;
-- Cualquiera puede enviar una solicitud nueva; solo el administrador la ve y la gestiona
create policy mkt_enviar on public.marketplace_solicitudes for insert
  with check (estado = 'pendiente' and ficha_id is null and precio_publicado is null and comision_pct is null);
create policy mkt_admin_leer on public.marketplace_solicitudes for select using (public.es_admin());
create policy mkt_admin_editar on public.marketplace_solicitudes for update using (public.es_admin()) with check (public.es_admin());
create policy mkt_admin_borrar on public.marketplace_solicitudes for delete using (public.es_admin());

-- Fotos que suben los vendedores (carpeta marketplace/ del almacenamiento)
drop policy if exists catalogos_marketplace_subir on storage.objects;
create policy catalogos_marketplace_subir on storage.objects for insert
  with check (bucket_id = 'catalogos' and (storage.foldername(name))[1] = 'marketplace');

notify pgrst, 'reload schema';
