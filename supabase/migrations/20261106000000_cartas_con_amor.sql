-- ════════════════════════════════════════════════════════════════════════════
-- Cartas con Amor · módulo TEMPORAL dentro del proyecto de Entre tu Arte
--
-- Todo vive con el prefijo cca_ (tablas, funciones y el bucket "cca-cartas"), separado de la
-- tienda: los organizadores del retiro NO son administradores de Entre tu Arte ni pueden tocar
-- obras, consultas, etc. Para quitarlo cuando termine el retiro: docs/cartas/QUITAR_CARTAS.sql
--
-- Se puede ejecutar más de una vez (Supabase › SQL Editor › pegar y ejecutar).
-- ════════════════════════════════════════════════════════════════════════════

-- ── Tablas ──────────────────────────────────────────────────────────────────

-- Usuarios del módulo. administrador: todo · organizador: solo los retiros asignados.
-- puede_leer = false → controla estados, pero no ve el texto ni los archivos de las cartas.
create table if not exists public.cca_usuarios (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  nombre     text not null,
  correo     text,
  rol        text not null default 'organizador' check (rol in ('administrador', 'organizador')),
  puede_leer boolean not null default true,
  activo     boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.cca_retiros (
  id                 uuid primary key default gen_random_uuid(),
  nombre             text not null check (length(nombre) between 2 and 150),
  -- Código del enlace público (difícil de adivinar)
  codigo             text not null unique default substr(md5(random()::text || clock_timestamp()::text), 1, 10),
  inicio             date,
  fin                date,
  lugar              text,
  fecha_limite       timestamptz,
  estado             text not null default 'preparacion'
                     check (estado in ('preparacion', 'activo', 'cerrado', 'archivado')),
  -- Después de la fecha límite: false = no se aceptan cartas · true = se aceptan marcadas como tardías
  aceptar_tardias    boolean not null default false,
  max_mb             int not null default 10 check (max_mb between 1 and 25),
  max_archivos       int not null default 5 check (max_archivos between 1 and 10),
  retencion_dias     int not null default 90 check (retencion_dias between 1 and 3650),
  semaforo_dias      int not null default 5 check (semaforo_dias between 0 and 60),
  mensaje_portal     text,
  responsable_datos  text,
  contacto_privacidad text,
  created_by         uuid default auth.uid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table if not exists public.cca_retiro_organizadores (
  retiro_id uuid not null references public.cca_retiros(id) on delete cascade,
  user_id   uuid not null references public.cca_usuarios(user_id) on delete cascade,
  primary key (retiro_id, user_id)
);

create table if not exists public.cca_parejas (
  id         uuid primary key default gen_random_uuid(),
  retiro_id  uuid not null references public.cca_retiros(id) on delete cascade,
  codigo     text not null,
  nombre_a   text not null,
  nombre_b   text not null,
  contacto_a text,
  contacto_b text,
  notas      text,
  -- retirada: se conserva el historial pero sale de los indicadores activos
  estado     text not null default 'activa' check (estado in ('activa', 'retirada')),
  token      text not null unique default substr(md5(random()::text || clock_timestamp()::text), 1, 12),
  created_at timestamptz not null default now(),
  unique (retiro_id, codigo)
);
create index if not exists cca_parejas_retiro_idx on public.cca_parejas (retiro_id);

-- Familiares y amigos de quienes se espera carta
create table if not exists public.cca_remitentes (
  id                  uuid primary key default gen_random_uuid(),
  retiro_id           uuid not null references public.cca_retiros(id) on delete cascade,
  pareja_id           uuid not null references public.cca_parejas(id) on delete cascade,
  nombre              text not null,
  telefono            text,
  correo              text,
  relacion            text,
  destinatario        text not null default 'ambos' check (destinatario in ('A', 'B', 'ambos')),
  estado              text not null default 'pendiente' check (estado in ('pendiente', 'recibido', 'exento', 'revision')),
  motivo              text,
  invitacion          text not null default 'sin_invitar' check (invitacion in ('sin_invitar', 'invitado')),
  ultimo_recordatorio timestamptz,
  notas               text,
  token               text not null unique default substr(md5(random()::text || clock_timestamp()::text), 1, 12),
  created_at          timestamptz not null default now()
);
create index if not exists cca_remitentes_pareja_idx on public.cca_remitentes (pareja_id);
create index if not exists cca_remitentes_retiro_idx on public.cca_remitentes (retiro_id);

create table if not exists public.cca_cartas (
  id                 uuid primary key default gen_random_uuid(),
  folio              bigint generated always as identity unique,
  retiro_id          uuid not null references public.cca_retiros(id) on delete cascade,
  pareja_id          uuid not null references public.cca_parejas(id) on delete cascade,
  destinatario       text not null check (destinatario in ('A', 'B', 'ambos')),
  remitente_nombre   text not null,
  remitente_contacto text,
  relacion           text,
  origen             text not null default 'digital' check (origen in ('digital', 'fisica')),
  estado             text not null default 'recibida' check (estado in
                     ('recibida', 'en_revision', 'aprobada', 'lista', 'impresa', 'entregada', 'rechazada', 'duplicada')),
  motivo             text,
  incidencia         text,
  remitente_id       uuid references public.cca_remitentes(id) on delete set null,
  tardia             boolean not null default false,
  posible_duplicado  boolean not null default false,
  huella             text,           -- huella del contenido para detectar duplicados
  ip_hash            text,           -- solo para limitar envíos automáticos (no guarda la IP)
  orden              int,
  preparada_por uuid, preparada_en timestamptz,
  impresa_por   uuid, impresa_en   timestamptz,
  entregada_por uuid, entregada_en timestamptz,
  created_by    uuid default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists cca_cartas_retiro_idx on public.cca_cartas (retiro_id, created_at desc);
create index if not exists cca_cartas_pareja_idx on public.cca_cartas (pareja_id);
create index if not exists cca_cartas_remitente_idx on public.cca_cartas (remitente_id);
create index if not exists cca_cartas_ip_idx on public.cca_cartas (ip_hash, created_at);

-- El texto va aparte para que solo lo lean quienes tienen permiso de lectura
create table if not exists public.cca_contenidos (
  carta_id uuid primary key references public.cca_cartas(id) on delete cascade,
  texto    text
);

create table if not exists public.cca_archivos (
  id              uuid primary key default gen_random_uuid(),
  carta_id        uuid not null references public.cca_cartas(id) on delete cascade,
  nombre_original text not null,
  tipo            text not null,
  tamano          bigint not null,
  ruta            text not null unique,   -- dentro del bucket privado "cca-cartas"
  hash            text,
  ilegible        boolean not null default false,
  created_at      timestamptz not null default now()
);
create index if not exists cca_archivos_carta_idx on public.cca_archivos (carta_id);

create table if not exists public.cca_recordatorios (
  id           uuid primary key default gen_random_uuid(),
  retiro_id    uuid not null references public.cca_retiros(id) on delete cascade,
  remitente_id uuid not null references public.cca_remitentes(id) on delete cascade,
  canal        text not null check (canal in ('whatsapp', 'correo', 'copiado', 'otro')),
  mensaje      text,
  usuario_id   uuid default auth.uid(),
  created_at   timestamptz not null default now()
);

create table if not exists public.cca_auditoria (
  id         bigint generated always as identity primary key,
  retiro_id  uuid references public.cca_retiros(id) on delete cascade,
  usuario_id uuid default auth.uid(),
  entidad    text not null,
  entidad_id uuid,
  accion     text not null,
  datos      jsonb,
  created_at timestamptz not null default now()
);
create index if not exists cca_auditoria_entidad_idx on public.cca_auditoria (entidad_id, created_at desc);
create index if not exists cca_auditoria_retiro_idx on public.cca_auditoria (retiro_id, created_at desc);

-- ── Funciones de permiso ────────────────────────────────────────────────────
create or replace function public.cca_es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from cca_usuarios where user_id = auth.uid() and activo and rol = 'administrador')
$$;

create or replace function public.cca_es_usuario() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from cca_usuarios where user_id = auth.uid() and activo)
$$;

create or replace function public.cca_acceso(p_retiro uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select cca_es_admin() or exists (
    select 1 from cca_retiro_organizadores ro join cca_usuarios u on u.user_id = ro.user_id
    where ro.retiro_id = p_retiro and ro.user_id = auth.uid() and u.activo)
$$;

create or replace function public.cca_puede_leer(p_retiro uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select cca_es_admin() or (cca_acceso(p_retiro) and exists (
    select 1 from cca_usuarios where user_id = auth.uid() and activo and puede_leer))
$$;

-- ── Integridad, fechas de control y auditoría ──────────────────────────────
create or replace function public.cca_validar_carta() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from cca_parejas where id = new.pareja_id and retiro_id = new.retiro_id) then
    raise exception 'La pareja no pertenece a este retiro';
  end if;
  if new.remitente_id is not null and not exists (
    select 1 from cca_remitentes where id = new.remitente_id and pareja_id = new.pareja_id) then
    raise exception 'El remitente esperado no pertenece a esta pareja';
  end if;
  if tg_op = 'UPDATE' then
    new.updated_at := now();
    new.folio := old.folio;
    new.created_at := old.created_at;
    new.origen := old.origen;
    if new.estado is distinct from old.estado then
      if new.estado = 'lista'     then new.preparada_por := auth.uid(); new.preparada_en := now(); end if;
      if new.estado = 'impresa'   then new.impresa_por   := auth.uid(); new.impresa_en   := now(); end if;
      if new.estado = 'entregada' then new.entregada_por := auth.uid(); new.entregada_en := now(); end if;
      if new.estado in ('rechazada', 'duplicada') and coalesce(trim(new.motivo), '') = '' then
        raise exception 'Indica el motivo para marcarla como %', new.estado;
      end if;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists cca_validar_carta on public.cca_cartas;
create trigger cca_validar_carta before insert or update on public.cca_cartas
  for each row execute function public.cca_validar_carta();

create or replace function public.cca_validar_remitente() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from cca_parejas where id = new.pareja_id and retiro_id = new.retiro_id) then
    raise exception 'La pareja no pertenece a este retiro';
  end if;
  if new.estado = 'exento' and coalesce(trim(new.motivo), '') = '' then
    raise exception 'Indica el motivo por el que no enviará carta';
  end if;
  return new;
end $$;
drop trigger if exists cca_validar_remitente on public.cca_remitentes;
create trigger cca_validar_remitente before insert or update on public.cca_remitentes
  for each row execute function public.cca_validar_remitente();

-- Un remitente esperado queda "recibido" mientras tenga al menos una carta válida vinculada.
-- "exento" no se toca. Las cartas espontáneas (sin vínculo) no cambian ningún pendiente.
create or replace function public.cca_recalcular_remitente(p_remitente uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_tiene boolean;
begin
  if p_remitente is null then return; end if;
  select exists (select 1 from cca_cartas where remitente_id = p_remitente
                 and estado not in ('rechazada', 'duplicada')) into v_tiene;
  update cca_remitentes set estado = case when v_tiene then 'recibido' else 'pendiente' end
   where id = p_remitente and estado <> 'exento'
     and estado is distinct from (case when v_tiene then 'recibido' else 'pendiente' end)
     and not (estado = 'revision' and not v_tiene);
end $$;

create or replace function public.cca_tras_carta() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then perform cca_recalcular_remitente(new.remitente_id); end if;
  if tg_op in ('UPDATE', 'DELETE') and old.remitente_id is distinct from
     (case when tg_op = 'UPDATE' then new.remitente_id else null end) then
    perform cca_recalcular_remitente(old.remitente_id);
  end if;
  return null;
end $$;
drop trigger if exists cca_tras_carta on public.cca_cartas;
create trigger cca_tras_carta after insert or update or delete on public.cca_cartas
  for each row execute function public.cca_tras_carta();

-- Auditoría genérica: guarda qué cambió, quién y cuándo
create or replace function public.cca_auditar() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_datos jsonb; v_fila jsonb; v_retiro uuid; v_id uuid;
begin
  v_fila := to_jsonb(coalesce(new, old));
  if tg_table_name = 'cca_retiros' then v_retiro := (v_fila->>'id')::uuid;
  else v_retiro := (v_fila->>'retiro_id')::uuid; end if;
  v_id := (v_fila->>'id')::uuid;
  if tg_op = 'UPDATE' then
    select jsonb_object_agg(n.key, jsonb_build_object('antes', o.value, 'despues', n.value)) into v_datos
      from jsonb_each(to_jsonb(new)) n join jsonb_each(to_jsonb(old)) o using (key)
     where n.value is distinct from o.value and n.key not in ('updated_at');
    if v_datos is null then return null; end if;
  elsif tg_op = 'INSERT' then
    v_datos := v_fila - 'ip_hash' - 'huella' - 'token';
  else
    v_datos := v_fila - 'ip_hash' - 'huella' - 'token';
    -- Al borrar un retiro completo no se guarda nada: todo su contenido se elimina en cascada
    if not exists (select 1 from cca_retiros where id = v_retiro) then return null; end if;
  end if;
  insert into cca_auditoria (retiro_id, usuario_id, entidad, entidad_id, accion, datos)
  values (v_retiro, auth.uid(), replace(tg_table_name, 'cca_', ''), v_id, lower(tg_op), v_datos);
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['cca_retiros', 'cca_parejas', 'cca_remitentes', 'cca_cartas'] loop
    execute format('drop trigger if exists cca_auditar on public.%I', t);
    execute format('create trigger cca_auditar after insert or update or delete on public.%I
                    for each row execute function public.cca_auditar()', t);
  end loop;
end $$;

-- ── Seguridad por filas ─────────────────────────────────────────────────────
alter table public.cca_usuarios             enable row level security;
alter table public.cca_retiros              enable row level security;
alter table public.cca_retiro_organizadores enable row level security;
alter table public.cca_parejas              enable row level security;
alter table public.cca_remitentes           enable row level security;
alter table public.cca_cartas               enable row level security;
alter table public.cca_contenidos           enable row level security;
alter table public.cca_archivos             enable row level security;
alter table public.cca_recordatorios        enable row level security;
alter table public.cca_auditoria            enable row level security;

do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies
           where schemaname = 'public' and tablename like 'cca\_%' loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

create policy cca_usuarios_leer on public.cca_usuarios for select
  using (user_id = auth.uid() or public.cca_es_usuario());
create policy cca_usuarios_admin on public.cca_usuarios for all
  using (public.cca_es_admin()) with check (public.cca_es_admin());

create policy cca_retiros_leer on public.cca_retiros for select using (public.cca_acceso(id));
create policy cca_retiros_crear on public.cca_retiros for insert with check (public.cca_es_admin());
create policy cca_retiros_editar on public.cca_retiros for update
  using (public.cca_es_admin()) with check (public.cca_es_admin());
create policy cca_retiros_borrar on public.cca_retiros for delete using (public.cca_es_admin());

create policy cca_org_leer on public.cca_retiro_organizadores for select using (public.cca_acceso(retiro_id));
create policy cca_org_admin on public.cca_retiro_organizadores for all
  using (public.cca_es_admin()) with check (public.cca_es_admin());

-- Parejas y remitentes: los organizadores del retiro los gestionan; borrar solo el administrador
create policy cca_parejas_leer on public.cca_parejas for select using (public.cca_acceso(retiro_id));
create policy cca_parejas_crear on public.cca_parejas for insert with check (public.cca_acceso(retiro_id));
create policy cca_parejas_editar on public.cca_parejas for update
  using (public.cca_acceso(retiro_id)) with check (public.cca_acceso(retiro_id));
create policy cca_parejas_borrar on public.cca_parejas for delete using (public.cca_es_admin());

create policy cca_rem_leer on public.cca_remitentes for select using (public.cca_acceso(retiro_id));
create policy cca_rem_crear on public.cca_remitentes for insert with check (public.cca_acceso(retiro_id));
create policy cca_rem_editar on public.cca_remitentes for update
  using (public.cca_acceso(retiro_id)) with check (public.cca_acceso(retiro_id));
create policy cca_rem_borrar on public.cca_remitentes for delete using (public.cca_acceso(retiro_id));

-- Cartas: el público NO tiene acceso directo; envía solo por la función cca_enviar_carta
create policy cca_cartas_leer on public.cca_cartas for select using (public.cca_acceso(retiro_id));
create policy cca_cartas_crear on public.cca_cartas for insert
  with check (public.cca_acceso(retiro_id) and origen = 'fisica');
create policy cca_cartas_editar on public.cca_cartas for update
  using (public.cca_acceso(retiro_id)) with check (public.cca_acceso(retiro_id));
create policy cca_cartas_borrar on public.cca_cartas for delete using (public.cca_es_admin());

create policy cca_cont_leer on public.cca_contenidos for select using (exists (
  select 1 from public.cca_cartas c where c.id = carta_id and public.cca_puede_leer(c.retiro_id)));
create policy cca_cont_escribir on public.cca_contenidos for insert with check (exists (
  select 1 from public.cca_cartas c where c.id = carta_id and public.cca_puede_leer(c.retiro_id)));
create policy cca_cont_editar on public.cca_contenidos for update using (exists (
  select 1 from public.cca_cartas c where c.id = carta_id and public.cca_puede_leer(c.retiro_id)));

create policy cca_arch_leer on public.cca_archivos for select using (exists (
  select 1 from public.cca_cartas c where c.id = carta_id and public.cca_acceso(c.retiro_id)));
create policy cca_arch_crear on public.cca_archivos for insert with check (exists (
  select 1 from public.cca_cartas c where c.id = carta_id and public.cca_acceso(c.retiro_id))
  and ruta like 'fisicas/%');
create policy cca_arch_editar on public.cca_archivos for update using (exists (
  select 1 from public.cca_cartas c where c.id = carta_id and public.cca_acceso(c.retiro_id)));
create policy cca_arch_borrar on public.cca_archivos for delete using (public.cca_es_admin());

create policy cca_rec_leer on public.cca_recordatorios for select using (public.cca_acceso(retiro_id));
create policy cca_rec_crear on public.cca_recordatorios for insert
  with check (public.cca_acceso(retiro_id) and usuario_id = auth.uid());

create policy cca_aud_leer on public.cca_auditoria for select using (public.cca_acceso(retiro_id));
create policy cca_aud_crear on public.cca_auditoria for insert
  with check (public.cca_acceso(retiro_id) and usuario_id = auth.uid());

-- ── Portal público (sin cuenta) ─────────────────────────────────────────────
-- Devuelve solo lo necesario para escribir: nombre del retiro, plazo y nombres de las parejas.
-- Nunca devuelve cartas, contactos ni notas.
create or replace function public.cca_portal(p_codigo text, p_pareja text default null, p_remitente text default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r cca_retiros; v_rem cca_remitentes; v_parejas jsonb; v_abierto boolean; v_tardio boolean;
begin
  select * into r from cca_retiros where codigo = p_codigo and estado = 'activo';
  if not found then return jsonb_build_object('estado', 'no_disponible'); end if;

  v_tardio := r.fecha_limite is not null and now() > r.fecha_limite;
  v_abierto := not v_tardio or r.aceptar_tardias;

  if nullif(p_remitente, '') is not null then
    select * into v_rem from cca_remitentes where token = p_remitente and retiro_id = r.id;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'a', p.nombre_a, 'b', p.nombre_b) order by p.nombre_a), '[]')
    into v_parejas
    from cca_parejas p
   where p.retiro_id = r.id and p.estado = 'activa'
     and (v_rem.id is null or p.id = v_rem.pareja_id)
     and (v_rem.id is not null or nullif(p_pareja, '') is null or p.token = p_pareja);

  return jsonb_build_object(
    'estado', case when v_abierto then 'abierto' else 'cerrado' end,
    'tardio', v_tardio,
    'nombre', r.nombre, 'inicio', r.inicio, 'fin', r.fin, 'lugar', r.lugar,
    'fecha_limite', r.fecha_limite, 'max_mb', r.max_mb, 'max_archivos', r.max_archivos,
    'mensaje', r.mensaje_portal, 'responsable', r.responsable_datos,
    'contacto_privacidad', r.contacto_privacidad, 'retencion_dias', r.retencion_dias,
    'parejas', v_parejas,
    'remitente', case when v_rem.id is null then null else jsonb_build_object(
      'nombre', v_rem.nombre, 'relacion', v_rem.relacion, 'destinatario', v_rem.destinatario,
      'pareja_id', v_rem.pareja_id) end);
end $$;

-- Recibe una carta. Valida todo del lado del servidor, limita envíos automáticos y
-- vincula sola la carta al remitente esperado cuando viene de su enlace o el nombre coincide.
create or replace function public.cca_enviar_carta(
  p_codigo text, p_pareja uuid, p_destinatario text, p_nombre text,
  p_relacion text default null, p_contacto text default null, p_texto text default null,
  p_archivos jsonb default '[]', p_remitente_token text default null,
  p_consentimiento boolean default false, p_trampa text default null)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  r cca_retiros; v_tardio boolean; v_headers json; v_ip text; v_ip_hash text;
  v_carta uuid; v_folio bigint; v_rem uuid; v_huella text; v_dup boolean := false;
  v_nombre text := btrim(regexp_replace(coalesce(p_nombre, ''), '\s+', ' ', 'g'));
  v_texto text := nullif(btrim(coalesce(p_texto, '')), '');
  a jsonb; o record; v_n int;
begin
  -- Campo trampa para robots: se responde como si nada, sin guardar
  if nullif(p_trampa, '') is not null then
    return jsonb_build_object('folio', 0, 'posible_duplicado', false);
  end if;

  select * into r from cca_retiros where codigo = p_codigo and estado = 'activo';
  if not found then raise exception 'cca:no_disponible'; end if;
  v_tardio := r.fecha_limite is not null and now() > r.fecha_limite;
  if v_tardio and not r.aceptar_tardias then raise exception 'cca:plazo_vencido'; end if;

  if not coalesce(p_consentimiento, false) then raise exception 'cca:sin_consentimiento'; end if;
  if not exists (select 1 from cca_parejas where id = p_pareja and retiro_id = r.id and estado = 'activa') then
    raise exception 'cca:pareja_invalida';
  end if;
  if p_destinatario not in ('A', 'B', 'ambos') then raise exception 'cca:destinatario_invalido'; end if;
  if length(v_nombre) < 2 or length(v_nombre) > 120 then raise exception 'cca:nombre_invalido'; end if;
  if length(coalesce(p_relacion, '')) > 80 or length(coalesce(p_contacto, '')) > 120 then
    raise exception 'cca:dato_largo';
  end if;
  if length(coalesce(v_texto, '')) > 30000 then raise exception 'cca:texto_largo'; end if;
  if jsonb_typeof(coalesce(p_archivos, '[]')) <> 'array' then raise exception 'cca:archivos_invalidos'; end if;
  v_n := jsonb_array_length(coalesce(p_archivos, '[]'));
  if v_n > r.max_archivos then raise exception 'cca:demasiados_archivos'; end if;
  if v_texto is null and v_n = 0 then raise exception 'cca:carta_vacia'; end if;

  -- Límite de envíos por conexión (la IP se guarda solo como huella, nunca en claro)
  begin v_headers := current_setting('request.headers', true)::json; exception when others then v_headers := null; end;
  v_ip := coalesce(v_headers->>'cf-connecting-ip', split_part(v_headers->>'x-forwarded-for', ',', 1), 'sin-ip');
  v_ip_hash := md5(btrim(v_ip) || ':' || r.id::text);
  if (select count(*) from cca_cartas where ip_hash = v_ip_hash and created_at > now() - interval '2 minutes') >= 8
     or (select count(*) from cca_cartas where ip_hash = v_ip_hash and created_at > now() - interval '1 hour') >= 40 then
    raise exception 'cca:demasiados_envios';
  end if;

  -- Remitente esperado: por su enlace personal o por nombre idéntico dentro de la pareja
  if nullif(p_remitente_token, '') is not null then
    select id into v_rem from cca_remitentes where token = p_remitente_token and pareja_id = p_pareja;
  end if;
  if v_rem is null and (select count(*) from cca_remitentes
                        where pareja_id = p_pareja and lower(btrim(nombre)) = lower(v_nombre)) = 1 then
    select id into v_rem from cca_remitentes where pareja_id = p_pareja and lower(btrim(nombre)) = lower(v_nombre);
  end if;

  v_huella := md5(coalesce(v_texto, '') || '|' || coalesce((
    select string_agg(coalesce(x->>'hash', ''), ',' order by x->>'hash') from jsonb_array_elements(p_archivos) x), ''));
  select exists (select 1 from cca_cartas where pareja_id = p_pareja
                 and lower(btrim(remitente_nombre)) = lower(v_nombre)
                 and (huella = v_huella or created_at > now() - interval '15 minutes')) into v_dup;

  insert into cca_cartas (retiro_id, pareja_id, destinatario, remitente_nombre, remitente_contacto, relacion,
                          origen, estado, remitente_id, tardia, posible_duplicado, huella, ip_hash, created_by)
  values (r.id, p_pareja, p_destinatario, v_nombre, nullif(btrim(p_contacto), ''), nullif(btrim(p_relacion), ''),
          'digital', case when v_dup then 'en_revision' else 'recibida' end, v_rem, v_tardio, v_dup, v_huella, v_ip_hash, null)
  returning id, folio into v_carta, v_folio;

  insert into cca_contenidos (carta_id, texto) values (v_carta, v_texto);

  -- Archivos: deben existir de verdad en el bucket privado, recién subidos y sin dueño previo
  for a in select * from jsonb_array_elements(coalesce(p_archivos, '[]')) loop
    if coalesce(a->>'ruta', '') !~ '^entrantes/[0-9a-f-]{36}/[A-Za-z0-9._-]{1,120}$' then
      raise exception 'cca:archivo_invalido';
    end if;
    select name, (metadata->>'size')::bigint as tamano, metadata->>'mimetype' as tipo, created_at into o
      from storage.objects where bucket_id = 'cca-cartas' and name = a->>'ruta';
    if not found or o.created_at < now() - interval '6 hours' then raise exception 'cca:archivo_no_encontrado'; end if;
    if o.tamano > r.max_mb::bigint * 1024 * 1024 then raise exception 'cca:archivo_grande'; end if;
    if o.tipo not in ('application/pdf', 'image/jpeg', 'image/png',
                      'application/vnd.openxmlformats-officedocument.wordprocessingml.document') then
      raise exception 'cca:tipo_no_permitido';
    end if;
    if exists (select 1 from cca_archivos where ruta = o.name) then raise exception 'cca:archivo_repetido'; end if;
    insert into cca_archivos (carta_id, nombre_original, tipo, tamano, ruta, hash)
    values (v_carta, left(coalesce(nullif(a->>'nombre', ''), 'archivo'), 200), o.tipo, o.tamano, o.name,
            left(a->>'hash', 64));
  end loop;

  return jsonb_build_object('folio', v_folio, 'posible_duplicado', v_dup, 'tardia', v_tardio);
end $$;

revoke all on function public.cca_enviar_carta(text, uuid, text, text, text, text, text, jsonb, text, boolean, text) from public;
grant execute on function public.cca_enviar_carta(text, uuid, text, text, text, text, text, jsonb, text, boolean, text) to anon, authenticated;
grant execute on function public.cca_portal(text, text, text) to anon, authenticated;

-- ── Alta de usuarios (el administrador agrega por correo una cuenta ya creada) ──
create or replace function public.cca_agregar_usuario(p_correo text, p_nombre text, p_rol text default 'organizador',
                                                     p_puede_leer boolean default true)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not cca_es_admin() then raise exception 'Solo un administrador puede agregar usuarios'; end if;
  select id into v_id from auth.users where lower(email) = lower(btrim(p_correo));
  if v_id is null then
    raise exception 'No existe una cuenta con ese correo. Créala primero en Supabase › Authentication › Users.';
  end if;
  insert into cca_usuarios (user_id, nombre, correo, rol, puede_leer, activo)
  values (v_id, btrim(p_nombre), lower(btrim(p_correo)), p_rol, p_puede_leer, true)
  on conflict (user_id) do update set nombre = excluded.nombre, rol = excluded.rol,
    puede_leer = excluded.puede_leer, activo = true, correo = excluded.correo;
  return v_id;
end $$;
revoke all on function public.cca_agregar_usuario(text, text, text, boolean) from public, anon;
grant execute on function public.cca_agregar_usuario(text, text, text, boolean) to authenticated;

-- Los administradores de Entre tu Arte entran como administradores de Cartas con Amor
insert into public.cca_usuarios (user_id, nombre, correo, rol)
select a.user_id, coalesce(a.nombre, split_part(u.email, '@', 1)), u.email, 'administrador'
  from public.admins a join auth.users u on u.id = a.user_id
on conflict (user_id) do nothing;

-- ── Almacenamiento privado ──────────────────────────────────────────────────
-- Bucket NO público: los archivos solo se abren con enlaces temporales firmados.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cca-cartas', 'cca-cartas', false, 26214400,
        array['application/pdf', 'image/jpeg', 'image/png',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists cca_subir_publico on storage.objects;
drop policy if exists cca_subir_fisicas on storage.objects;
drop policy if exists cca_leer on storage.objects;
drop policy if exists cca_borrar on storage.objects;

-- Cualquiera puede SUBIR a entrantes/ (el portal); nadie del público puede leer ni listar
create policy cca_subir_publico on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'cca-cartas' and (storage.foldername(name))[1] = 'entrantes');
create policy cca_subir_fisicas on storage.objects for insert to authenticated
  with check (bucket_id = 'cca-cartas' and (storage.foldername(name))[1] = 'fisicas' and public.cca_es_usuario());
-- Leer (y firmar enlaces temporales) solo si el archivo pertenece a una carta que el usuario puede leer
create policy cca_leer on storage.objects for select to authenticated
  using (bucket_id = 'cca-cartas' and exists (
    select 1 from public.cca_archivos a join public.cca_cartas c on c.id = a.carta_id
    where a.ruta = storage.objects.name and public.cca_puede_leer(c.retiro_id)));
create policy cca_borrar on storage.objects for delete to authenticated
  using (bucket_id = 'cca-cartas' and public.cca_es_admin());

notify pgrst, 'reload schema';
