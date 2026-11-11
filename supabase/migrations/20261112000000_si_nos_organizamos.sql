-- ════════════════════════════════════════════════════════════════════════════
-- Si nos organizamos! · aplicación INDEPENDIENTE dentro del proyecto de Entre tu Arte
--
-- Encuentra la fecha en que todos pueden: cada participante marca solo cuándo NO puede,
-- la aplicación cruza la información, propone las mejores fechas y se vota.
--
-- Todo vive con el prefijo sno_ y no toca ninguna tabla de la tienda.
--   · Un solo administrador general (tabla sno_admins, cuentas de Supabase Auth).
--   · Los participantes NO tienen cuenta: entran con un enlace privado, largo y revocable.
--   · Privacidad real: los bloqueos (sno_bloqueos) y los votos (sno_votos) no tienen ninguna
--     regla de lectura. Nadie los lee directo; solo salen por funciones que devuelven a cada
--     participante lo suyo, y al administrador conteos agregados.
--
-- Se puede ejecutar más de una vez (Supabase › SQL Editor › pegar y ejecutar).
-- ════════════════════════════════════════════════════════════════════════════

-- ── Tablas ──────────────────────────────────────────────────────────────────

create table if not exists public.sno_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  nombre     text,
  created_at timestamptz not null default now()
);

-- Enlace privado: 40 caracteres al azar (imposible de adivinar). Se puede regenerar (revocar).
create or replace function public.sno_nuevo_token() returns text
language sql volatile set search_path = public as $$
  select replace(gen_random_uuid()::text, '-', '') || substr(md5(random()::text || clock_timestamp()::text), 1, 8)
$$;

-- Agenda general de participantes: se registran una sola vez con nombre y teléfono
create table if not exists public.sno_personas (
  id                uuid primary key default gen_random_uuid(),
  nombre            text not null check (length(btrim(nombre)) between 2 and 80),
  telefono          text check (telefono is null or length(telefono) <= 30),
  token             text not null unique default public.sno_nuevo_token(),
  activo            boolean not null default true,
  created_at        timestamptz not null default now()
);

create table if not exists public.sno_eventos (
  id            uuid primary key default gen_random_uuid(),
  titulo        text not null check (length(btrim(titulo)) between 2 and 120),
  descripcion   text check (descripcion is null or length(descripcion) <= 1000),
  lugar         text check (lugar is null or length(lugar) <= 200),
  desde         date not null,
  hasta         date not null,
  -- Días permitidos: 0 domingo, 1 lunes … 6 sábado
  dias          smallint[] not null default '{1,2,3,4,5}',
  hora_inicio   time not null default '19:00',
  hora_fin      time,                         -- vacío = «en adelante»
  fecha_limite  date,                         -- día máximo para indicar disponibilidad
  -- disponibilidad → votacion → cerrada (sin más votos) → confirmado · o cancelado
  estado        text not null default 'disponibilidad'
                check (estado in ('disponibilidad', 'votacion', 'cerrada', 'confirmado', 'cancelado')),
  opciones      date[] not null default '{}', -- fechas sometidas a votación
  ronda         int not null default 0,       -- 1 = primera votación, 2 = desempate…
  fecha_elegida date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint sno_eventos_rango check (hasta >= desde and hasta - desde <= 366),
  constraint sno_eventos_dias check (cardinality(dias) between 1 and 7 and dias <@ '{0,1,2,3,4,5,6}'::smallint[]),
  constraint sno_eventos_horas check (hora_fin is null or hora_fin > hora_inicio),
  constraint sno_eventos_confirmado check (estado <> 'confirmado' or fecha_elegida is not null)
);

-- Invitados de cada evento. respondio_en vacío = todavía no confirmó su calendario
-- (no responder NO significa estar disponible).
create table if not exists public.sno_invitados (
  evento_id    uuid not null references public.sno_eventos(id) on delete cascade,
  persona_id   uuid not null references public.sno_personas(id) on delete cascade,
  respondio_en timestamptz,
  created_at   timestamptz not null default now(),
  primary key (evento_id, persona_id)
);
create index if not exists sno_invitados_persona_idx on public.sno_invitados (persona_id);

-- Calendario privado de cada persona, compartido entre todos sus eventos.
-- Sin horas = todo el día · con horas = solo ese tramo (hora_hasta vacía = «en adelante»).
create table if not exists public.sno_bloqueos (
  id          uuid primary key default gen_random_uuid(),
  persona_id  uuid not null references public.sno_personas(id) on delete cascade,
  fecha       date not null,
  hora_desde  time,
  hora_hasta  time,
  created_at  timestamptz not null default now(),
  constraint sno_bloqueos_horas check (hora_desde is null or hora_hasta is null or hora_hasta > hora_desde)
);
create index if not exists sno_bloqueos_persona_idx on public.sno_bloqueos (persona_id, fecha);

-- Un voto por participante y evento (votar de nuevo cambia el voto, no lo duplica)
create table if not exists public.sno_votos (
  evento_id  uuid not null,
  persona_id uuid not null,
  fecha      date not null,
  ronda      int not null,
  created_at timestamptz not null default now(),
  primary key (evento_id, persona_id),
  foreign key (evento_id, persona_id) references public.sno_invitados(evento_id, persona_id) on delete cascade
);

-- ── Utilidades ──────────────────────────────────────────────────────────────

create or replace function public.sno_es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from sno_admins where user_id = auth.uid())
$$;

create or replace function public.sno_hoy() returns date
language sql stable as $$ select (now() at time zone 'America/El_Salvador')::date $$;

-- ¿Un bloqueo choca con el horario del evento? (vacíos = inicio o fin del día)
create or replace function public.sno_choca(b_desde time, b_hasta time, e_inicio time, e_fin time) returns boolean
language sql immutable as $$
  select coalesce(b_desde, '00:00'::time) < coalesce(e_fin, '24:00'::time)
     and coalesce(b_hasta, '24:00'::time) > e_inicio
$$;

-- Fechas posibles de un evento: dentro del período y en los días permitidos
create or replace function public.sno_fechas_evento(p_evento uuid) returns setof date
language sql stable security definer set search_path = public as $$
  select d::date from sno_eventos e, generate_series(e.desde, e.hasta, interval '1 day') d
   where e.id = p_evento and extract(dow from d)::int = any(e.dias)
   order by 1
$$;

create or replace function public.sno_tocar_evento() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  if new.estado = 'confirmado' and new.fecha_elegida is not null
     and not (new.fecha_elegida between new.desde and new.hasta
              and extract(dow from new.fecha_elegida)::int = any(new.dias)) then
    raise exception 'sno:fecha_fuera_del_evento';
  end if;
  return new;
end $$;
drop trigger if exists sno_tocar_evento on public.sno_eventos;
create trigger sno_tocar_evento before update on public.sno_eventos
  for each row execute function public.sno_tocar_evento();

-- ── Seguridad por filas ─────────────────────────────────────────────────────
alter table public.sno_admins    enable row level security;
alter table public.sno_personas  enable row level security;
alter table public.sno_eventos   enable row level security;
alter table public.sno_invitados enable row level security;
alter table public.sno_bloqueos  enable row level security;
alter table public.sno_votos     enable row level security;

do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies
           where schemaname = 'public' and tablename like 'sno\_%' loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

create policy sno_admins_propio on public.sno_admins for select using (user_id = auth.uid());
create policy sno_personas_admin on public.sno_personas for all
  using (public.sno_es_admin()) with check (public.sno_es_admin());
create policy sno_eventos_admin on public.sno_eventos for all
  using (public.sno_es_admin()) with check (public.sno_es_admin());
create policy sno_invitados_admin on public.sno_invitados for all
  using (public.sno_es_admin()) with check (public.sno_es_admin());
-- sno_bloqueos y sno_votos: SIN reglas a propósito → nadie los lee ni escribe directo.

-- ── Participante (sin cuenta, con su enlace) ────────────────────────────────

-- Todo lo que ve un participante: su nombre, sus eventos y SU calendario. Nada de los demás.
create or replace function public.sno_agenda(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare p sno_personas; v_hoy date := sno_hoy();
begin
  select * into p from sno_personas where token = p_token and activo;
  if not found then return jsonb_build_object('estado', 'no_encontrado'); end if;
  return jsonb_build_object(
    'estado', 'ok', 'hoy', v_hoy, 'nombre', p.nombre,
    'eventos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id, 'titulo', e.titulo, 'descripcion', e.descripcion, 'lugar', e.lugar,
        'desde', e.desde, 'hasta', e.hasta, 'dias', e.dias,
        'hora_inicio', to_char(e.hora_inicio, 'HH24:MI'), 'hora_fin', to_char(e.hora_fin, 'HH24:MI'),
        'fecha_limite', e.fecha_limite, 'estado', e.estado, 'ronda', e.ronda,
        'opciones', case when e.estado in ('votacion', 'cerrada') then to_jsonb(e.opciones) else '[]'::jsonb end,
        'fecha_elegida', e.fecha_elegida,
        'respondio', i.respondio_en is not null,
        'mi_voto', (select v.fecha from sno_votos v where v.evento_id = e.id and v.persona_id = p.id and v.ronda = e.ronda)
      ) order by case e.estado when 'votacion' then 0 when 'disponibilidad' then 1 when 'cerrada' then 2 else 3 end,
                 coalesce(e.fecha_elegida, e.desde))
        from sno_invitados i join sno_eventos e on e.id = i.evento_id
       where i.persona_id = p.id and e.estado <> 'cancelado'
         and (e.estado <> 'confirmado' or e.fecha_elegida >= v_hoy - 30)), '[]'::jsonb),
    'bloqueos', coalesce((
      select jsonb_agg(jsonb_build_object('id', b.id, 'fecha', b.fecha,
               'desde', to_char(b.hora_desde, 'HH24:MI'), 'hasta', to_char(b.hora_hasta, 'HH24:MI'))
               order by b.fecha, b.hora_desde nulls first)
        from sno_bloqueos b where b.persona_id = p.id and b.fecha >= v_hoy), '[]'::jsonb));
end $$;

create or replace function public.sno_bloquear(p_token text, p_fecha date, p_desde time default null, p_hasta time default null)
returns uuid language plpgsql volatile security definer set search_path = public as $$
declare v_persona uuid; v_id uuid;
begin
  select id into v_persona from sno_personas where token = p_token and activo;
  if v_persona is null then raise exception 'sno:enlace_invalido'; end if;
  if p_fecha is null or p_fecha < sno_hoy() or p_fecha > sno_hoy() + 730 then raise exception 'sno:fecha_invalida'; end if;
  if p_desde is not null and p_hasta is not null and p_hasta <= p_desde then raise exception 'sno:horas_invalidas'; end if;
  if (select count(*) from sno_bloqueos where persona_id = v_persona and fecha >= sno_hoy()) >= 1000 then
    raise exception 'sno:demasiados_bloqueos';
  end if;
  select id into v_id from sno_bloqueos where persona_id = v_persona and fecha = p_fecha
     and hora_desde is not distinct from p_desde and hora_hasta is not distinct from p_hasta;
  if v_id is null then
    insert into sno_bloqueos (persona_id, fecha, hora_desde, hora_hasta)
    values (v_persona, p_fecha, p_desde, p_hasta) returning id into v_id;
  end if;
  return v_id;
end $$;

create or replace function public.sno_desbloquear(p_token text, p_ids uuid[]) returns int
language plpgsql volatile security definer set search_path = public as $$
declare v_persona uuid; v_n int;
begin
  select id into v_persona from sno_personas where token = p_token and activo;
  if v_persona is null then raise exception 'sno:enlace_invalido'; end if;
  delete from sno_bloqueos where persona_id = v_persona and id = any(p_ids);
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- «Listo, ya marqué mi calendario» para un evento (también si puede todos los días)
create or replace function public.sno_listo(p_token text, p_evento uuid) returns boolean
language plpgsql volatile security definer set search_path = public as $$
declare v_persona uuid;
begin
  select id into v_persona from sno_personas where token = p_token and activo;
  if v_persona is null then raise exception 'sno:enlace_invalido'; end if;
  if not exists (select 1 from sno_eventos where id = p_evento and estado = 'disponibilidad') then
    raise exception 'sno:evento_no_disponible';
  end if;
  update sno_invitados set respondio_en = now() where evento_id = p_evento and persona_id = v_persona;
  if not found then raise exception 'sno:no_invitado'; end if;
  return true;
end $$;

create or replace function public.sno_votar(p_token text, p_evento uuid, p_fecha date) returns boolean
language plpgsql volatile security definer set search_path = public as $$
declare v_persona uuid; e sno_eventos;
begin
  select id into v_persona from sno_personas where token = p_token and activo;
  if v_persona is null then raise exception 'sno:enlace_invalido'; end if;
  select * into e from sno_eventos where id = p_evento;
  if not found or e.estado <> 'votacion' then raise exception 'sno:votacion_cerrada'; end if;
  if not (p_fecha = any(e.opciones)) then raise exception 'sno:opcion_invalida'; end if;
  if not exists (select 1 from sno_invitados where evento_id = p_evento and persona_id = v_persona) then
    raise exception 'sno:no_invitado';
  end if;
  insert into sno_votos (evento_id, persona_id, fecha, ronda) values (p_evento, v_persona, p_fecha, e.ronda)
  on conflict (evento_id, persona_id) do update set fecha = excluded.fecha, ronda = excluded.ronda, created_at = now();
  return true;
end $$;

-- ── Administrador ───────────────────────────────────────────────────────────

-- Resultados AGREGADOS de un evento: por fecha cuántos pueden, cuántos no y cuántos no han
-- respondido. Nunca dice quién bloqueó qué ni a qué hora. Votos: totales por fecha y si
-- cada invitado ya votó (no por cuál fecha).
create or replace function public.sno_resultados(p_evento uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare e sno_eventos;
begin
  if not sno_es_admin() then raise exception 'sno:sin_permiso'; end if;
  select * into e from sno_eventos where id = p_evento;
  if not found then raise exception 'sno:evento_no_encontrado'; end if;
  return jsonb_build_object(
    'hoy', sno_hoy(),
    'fechas', coalesce((
      with f as (select fecha from sno_fechas_evento(e.id) fecha),
      x as (
        select f.fecha, i.persona_id, i.respondio_en is not null as resp,
               exists (select 1 from sno_bloqueos b where b.persona_id = i.persona_id and b.fecha = f.fecha
                        and sno_choca(b.hora_desde, b.hora_hasta, e.hora_inicio, e.hora_fin)) as ocupado
          from f left join sno_invitados i on i.evento_id = e.id)
      select jsonb_agg(jsonb_build_object('fecha', fecha, 'pueden', pueden, 'no_pueden', no_pueden,
                                          'sin_respuesta', sin_respuesta) order by fecha)
        from (select fecha,
                     count(*) filter (where persona_id is not null and resp and not ocupado) as pueden,
                     count(*) filter (where persona_id is not null and ocupado) as no_pueden,
                     count(*) filter (where persona_id is not null and not resp and not ocupado) as sin_respuesta
                from x group by fecha) t), '[]'::jsonb),
    'votos', coalesce((
      select jsonb_agg(jsonb_build_object('fecha', fecha, 'votos', n) order by n desc, fecha)
        from (select fecha, count(*) n from sno_votos where evento_id = e.id and ronda = e.ronda group by fecha) v), '[]'::jsonb),
    'invitados', coalesce((
      select jsonb_agg(jsonb_build_object('persona_id', p.id, 'nombre', p.nombre, 'telefono', p.telefono,
               'token', p.token, 'activo', p.activo, 'respondio_en', i.respondio_en,
               'voto', exists (select 1 from sno_votos v where v.evento_id = e.id and v.persona_id = p.id and v.ronda = e.ronda))
               order by p.nombre)
        from sno_invitados i join sno_personas p on p.id = i.persona_id where i.evento_id = e.id), '[]'::jsonb));
end $$;

-- Resumen de todos los eventos para el tablero (cuántos respondieron / votaron)
create or replace function public.sno_tablero() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not sno_es_admin() then raise exception 'sno:sin_permiso'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', e.id,
             'invitados', (select count(*) from sno_invitados i where i.evento_id = e.id),
             'respondieron', (select count(*) from sno_invitados i where i.evento_id = e.id and i.respondio_en is not null),
             'votaron', (select count(*) from sno_votos v where v.evento_id = e.id and v.ronda = e.ronda)))
      from sno_eventos e), '[]'::jsonb);
end $$;

-- Abre (o reabre para desempatar) la votación entre las fechas elegidas. Cada apertura es
-- una ronda nueva: los votos anteriores dejan de contar.
create or replace function public.sno_abrir_votacion(p_evento uuid, p_opciones date[]) returns int
language plpgsql volatile security definer set search_path = public as $$
declare v_ronda int; v_opciones date[];
begin
  if not sno_es_admin() then raise exception 'sno:sin_permiso'; end if;
  select array_agg(distinct o order by o) into v_opciones from unnest(p_opciones) o;
  if coalesce(cardinality(v_opciones), 0) < 2 then raise exception 'sno:pocas_opciones'; end if;
  if exists (select 1 from unnest(v_opciones) o where o not in (select * from sno_fechas_evento(p_evento))) then
    raise exception 'sno:fecha_fuera_del_evento';
  end if;
  update sno_eventos set estado = 'votacion', opciones = v_opciones, ronda = ronda + 1, fecha_elegida = null
   where id = p_evento returning ronda into v_ronda;
  if v_ronda is null then raise exception 'sno:evento_no_encontrado'; end if;
  delete from sno_votos where evento_id = p_evento and ronda < v_ronda;
  return v_ronda;
end $$;

-- Revocar el enlace de una persona: el anterior deja de funcionar al instante
create or replace function public.sno_nuevo_enlace(p_persona uuid) returns text
language plpgsql volatile security definer set search_path = public as $$
declare v_token text;
begin
  if not sno_es_admin() then raise exception 'sno:sin_permiso'; end if;
  update sno_personas set token = sno_nuevo_token() where id = p_persona returning token into v_token;
  return v_token;
end $$;

-- ── Permisos de las funciones ───────────────────────────────────────────────
revoke all on function public.sno_agenda(text) from public;
revoke all on function public.sno_bloquear(text, date, time, time) from public;
revoke all on function public.sno_desbloquear(text, uuid[]) from public;
revoke all on function public.sno_listo(text, uuid) from public;
revoke all on function public.sno_votar(text, uuid, date) from public;
grant execute on function public.sno_agenda(text) to anon, authenticated;
grant execute on function public.sno_bloquear(text, date, time, time) to anon, authenticated;
grant execute on function public.sno_desbloquear(text, uuid[]) to anon, authenticated;
grant execute on function public.sno_listo(text, uuid) to anon, authenticated;
grant execute on function public.sno_votar(text, uuid, date) to anon, authenticated;

revoke all on function public.sno_resultados(uuid) from public, anon;
revoke all on function public.sno_tablero() from public, anon;
revoke all on function public.sno_abrir_votacion(uuid, date[]) from public, anon;
revoke all on function public.sno_nuevo_enlace(uuid) from public, anon;
revoke all on function public.sno_fechas_evento(uuid) from public, anon;
grant execute on function public.sno_resultados(uuid) to authenticated;
grant execute on function public.sno_tablero() to authenticated;
grant execute on function public.sno_abrir_votacion(uuid, date[]) to authenticated;
grant execute on function public.sno_nuevo_enlace(uuid) to authenticated;

-- ── Administrador general ───────────────────────────────────────────────────
-- El administrador de Entre tu Arte es también el administrador de Si nos organizamos!
-- (para otra cuenta: insert into public.sno_admins (user_id, nombre) select id, 'Nombre' from auth.users where email = '…';)
insert into public.sno_admins (user_id, nombre)
select a.user_id, a.nombre from public.admins a
on conflict (user_id) do nothing;

notify pgrst, 'reload schema';
