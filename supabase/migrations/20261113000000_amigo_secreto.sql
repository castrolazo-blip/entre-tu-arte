-- ════════════════════════════════════════════════════════════════════════════
-- Si nos organizamos! · Amigo secreto (intercambio de regalos) dentro de cada evento
--
-- El administrador lo activa en un evento (participan sus invitados); la base de datos sortea al azar
-- (un círculo: nadie se saca a sí mismo y cada quien regala y recibe exactamente una vez).
-- Cada participante ve a quién le tocó con su mismo enlace privado, y la lista de deseos
-- general de esa persona (sno_personas.deseo: se escribe una vez y sirve para todos los sorteos).
--
-- Privacidad: las asignaciones (sno_sorteo_asignaciones) NO tienen reglas de lectura.
-- Ni el panel del administrador puede verlas (el administrador también suele participar);
-- solo sabe quién ya vio a su amigo secreto. Cada participante recibe únicamente el suyo.
--
-- Requiere 20261112000000_si_nos_organizamos.sql. Se puede ejecutar más de una vez.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.sno_sorteos (
  id                uuid primary key default gen_random_uuid(),
  titulo            text not null check (length(btrim(titulo)) between 2 and 120),
  mensaje           text check (mensaje is null or length(mensaje) <= 1000),
  monto             text check (monto is null or length(monto) <= 60),   -- «$15 a $20»
  fecha_intercambio date,
  evento_id         uuid references public.sno_eventos(id) on delete cascade,
  estado            text not null default 'preparacion' check (estado in ('preparacion', 'sorteado')),
  sorteado_en       timestamptz,
  created_at        timestamptz not null default now()
);

-- El amigo secreto vive DENTRO de un evento: uno por evento, se borra con el evento
alter table public.sno_sorteos drop constraint if exists sno_sorteos_evento_id_fkey;
alter table public.sno_sorteos add constraint sno_sorteos_evento_id_fkey
  foreign key (evento_id) references public.sno_eventos(id) on delete cascade;
create unique index if not exists sno_sorteos_evento_uq on public.sno_sorteos (evento_id) where evento_id is not null;

-- Lista de deseos GENERAL de cada persona: la escribe una vez y vale para todos sus sorteos
alter table public.sno_personas add column if not exists deseo text;
alter table public.sno_personas drop constraint if exists sno_personas_deseo_check;
alter table public.sno_personas add constraint sno_personas_deseo_check check (deseo is null or length(deseo) <= 500);

create table if not exists public.sno_sorteo_participantes (
  sorteo_id  uuid not null references public.sno_sorteos(id) on delete cascade,
  persona_id uuid not null references public.sno_personas(id) on delete cascade,
  deseo      text check (deseo is null or length(deseo) <= 500),   -- (sin uso: la lista de deseos es de la persona)
  visto_en   timestamptz,                                          -- cuándo descubrió a su amigo secreto
  created_at timestamptz not null default now(),
  primary key (sorteo_id, persona_id)
);
create index if not exists sno_sorteo_part_persona_idx on public.sno_sorteo_participantes (persona_id);
-- Si alguien ya había escrito una lista dentro de un sorteo, pasa a ser su lista general
update public.sno_personas p set deseo = sp.deseo
  from public.sno_sorteo_participantes sp
 where sp.persona_id = p.id and p.deseo is null and sp.deseo is not null;

-- Quién le regala a quién. SIN reglas de lectura: solo sale por sno_ver_amigo.
create table if not exists public.sno_sorteo_asignaciones (
  sorteo_id  uuid not null,
  persona_id uuid not null,      -- quien regala
  regala_a   uuid not null,      -- a quien le regala
  primary key (sorteo_id, persona_id),
  unique (sorteo_id, regala_a),
  check (persona_id <> regala_a),
  foreign key (sorteo_id, persona_id) references public.sno_sorteo_participantes(sorteo_id, persona_id) on delete cascade,
  foreign key (sorteo_id, regala_a) references public.sno_sorteo_participantes(sorteo_id, persona_id) on delete cascade
);

alter table public.sno_sorteos              enable row level security;
alter table public.sno_sorteo_participantes enable row level security;
alter table public.sno_sorteo_asignaciones  enable row level security;

drop policy if exists sno_sorteos_admin on public.sno_sorteos;
drop policy if exists sno_sorteo_part_admin on public.sno_sorteo_participantes;
create policy sno_sorteos_admin on public.sno_sorteos for all
  using (public.sno_es_admin()) with check (public.sno_es_admin());
create policy sno_sorteo_part_admin on public.sno_sorteo_participantes for all
  using (public.sno_es_admin()) with check (public.sno_es_admin());
-- sno_sorteo_asignaciones: sin reglas a propósito.

-- Si cambian los participantes de un sorteo ya hecho, el sorteo se anula y hay que volver a sortear
create or replace function public.sno_tras_cambio_participantes() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_sorteo uuid := coalesce(new.sorteo_id, old.sorteo_id);
begin
  if exists (select 1 from sno_sorteos where id = v_sorteo and estado = 'sorteado') then
    delete from sno_sorteo_asignaciones where sorteo_id = v_sorteo;
    update sno_sorteos set estado = 'preparacion', sorteado_en = null where id = v_sorteo;
    update sno_sorteo_participantes set visto_en = null where sorteo_id = v_sorteo;
  end if;
  return null;
end $$;
drop trigger if exists sno_tras_cambio_participantes on public.sno_sorteo_participantes;
create trigger sno_tras_cambio_participantes after insert or delete on public.sno_sorteo_participantes
  for each row execute function public.sno_tras_cambio_participantes();

-- Activa el amigo secreto de un evento con sus invitados actuales
create or replace function public.sno_activar_amigo(p_evento uuid, p_monto text default null,
                                                     p_fecha date default null, p_mensaje text default null)
returns uuid language plpgsql volatile security definer set search_path = public as $$
declare v_id uuid; v_titulo text;
begin
  if not sno_es_admin() then raise exception 'sno:sin_permiso'; end if;
  select id into v_id from sno_sorteos where evento_id = p_evento;
  if v_id is not null then return v_id; end if;
  select titulo into v_titulo from sno_eventos where id = p_evento;
  if v_titulo is null then raise exception 'sno:evento_no_encontrado'; end if;
  insert into sno_sorteos (titulo, evento_id, monto, fecha_intercambio, mensaje)
  values (left('Amigo secreto · ' || v_titulo, 120), p_evento, nullif(btrim(p_monto), ''), p_fecha, nullif(btrim(p_mensaje), ''))
  returning id into v_id;
  insert into sno_sorteo_participantes (sorteo_id, persona_id)
  select v_id, persona_id from sno_invitados where evento_id = p_evento;
  return v_id;
end $$;

-- Los participantes del amigo secreto siguen a los invitados del evento
create or replace function public.sno_espejo_invitados() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_sorteo uuid;
begin
  select id into v_sorteo from sno_sorteos where evento_id = coalesce(new.evento_id, old.evento_id);
  if v_sorteo is null then return null; end if;
  if tg_op = 'INSERT' then
    insert into sno_sorteo_participantes (sorteo_id, persona_id) values (v_sorteo, new.persona_id) on conflict do nothing;
  else
    delete from sno_sorteo_participantes where sorteo_id = v_sorteo and persona_id = old.persona_id;
  end if;
  return null;
end $$;
drop trigger if exists sno_espejo_invitados on public.sno_invitados;
create trigger sno_espejo_invitados after insert or delete on public.sno_invitados
  for each row execute function public.sno_espejo_invitados();

-- Sortear (o volver a sortear): orden al azar y cada quien le regala al siguiente del círculo
create or replace function public.sno_sortear(p_sorteo uuid) returns int
language plpgsql volatile security definer set search_path = public as $$
declare v_ids uuid[]; v_n int;
begin
  if not sno_es_admin() then raise exception 'sno:sin_permiso'; end if;
  if not exists (select 1 from sno_sorteos where id = p_sorteo) then raise exception 'sno:sorteo_no_encontrado'; end if;
  select array_agg(persona_id order by random()) into v_ids from sno_sorteo_participantes where sorteo_id = p_sorteo;
  v_n := coalesce(cardinality(v_ids), 0);
  if v_n < 3 then raise exception 'sno:pocos_participantes'; end if;
  delete from sno_sorteo_asignaciones where sorteo_id = p_sorteo;
  insert into sno_sorteo_asignaciones (sorteo_id, persona_id, regala_a)
  select p_sorteo, v_ids[i], v_ids[(i % v_n) + 1] from generate_series(1, v_n) i;
  update sno_sorteo_participantes set visto_en = null where sorteo_id = p_sorteo;
  update sno_sorteos set estado = 'sorteado', sorteado_en = now() where id = p_sorteo;
  return v_n;
end $$;

-- Participante: descubre a quién le tocó (y su lista de deseos). Marca que ya lo vio.
create or replace function public.sno_ver_amigo(p_token text, p_sorteo uuid) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare v_persona uuid; v_amigo uuid;
begin
  select id into v_persona from sno_personas where token = p_token and activo;
  if v_persona is null then raise exception 'sno:enlace_invalido'; end if;
  select regala_a into v_amigo from sno_sorteo_asignaciones where sorteo_id = p_sorteo and persona_id = v_persona;
  if v_amigo is null then raise exception 'sno:sin_sorteo'; end if;
  update sno_sorteo_participantes set visto_en = coalesce(visto_en, now())
   where sorteo_id = p_sorteo and persona_id = v_persona;
  update sno_personas set actualizado_en = now() where id = v_persona;
  return (select jsonb_build_object('nombre', p.nombre, 'deseo', p.deseo) from sno_personas p where p.id = v_amigo);
end $$;

-- Participante: escribe su lista de deseos general (la verá quien le regale, en cualquier sorteo)
drop function if exists public.sno_mi_deseo(text, uuid, text);
create or replace function public.sno_mi_deseo(p_token text, p_deseo text) returns boolean
language plpgsql volatile security definer set search_path = public as $$
declare v_persona uuid;
begin
  select id into v_persona from sno_personas where token = p_token and activo;
  if v_persona is null then raise exception 'sno:enlace_invalido'; end if;
  if length(coalesce(p_deseo, '')) > 500 then raise exception 'sno:deseo_largo'; end if;
  update sno_personas set deseo = nullif(btrim(p_deseo), ''), actualizado_en = now() where id = v_persona;
  return true;
end $$;

-- La agenda del participante ahora incluye sus sorteos (sin decir a quién le tocó)
create or replace function public.sno_agenda(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare p sno_personas; v_hoy date := sno_hoy();
begin
  select * into p from sno_personas where token = p_token and activo;
  if not found then return jsonb_build_object('estado', 'no_encontrado'); end if;
  return jsonb_build_object(
    'estado', 'ok', 'hoy', v_hoy, 'nombre', p.nombre, 'deseo', p.deseo,
    'eventos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id, 'titulo', e.titulo, 'descripcion', e.descripcion, 'lugar', e.lugar,
        'desde', e.desde, 'hasta', e.hasta, 'dias', e.dias,
        'hora_inicio', to_char(e.hora_inicio, 'HH24:MI'), 'hora_fin', to_char(e.hora_fin, 'HH24:MI'),
        'fecha_limite', e.fecha_limite, 'estado', e.estado, 'ronda', e.ronda,
        'opciones', case when e.estado in ('votacion', 'cerrada') then to_jsonb(e.opciones) else '[]'::jsonb end,
        'fecha_elegida', e.fecha_elegida,
        'respondio', i.respondio_en is not null,
        'mi_voto', (select v.fecha from sno_votos v where v.evento_id = e.id and v.persona_id = p.id and v.ronda = e.ronda),
        'amigo', (select jsonb_build_object('id', s.id, 'monto', s.monto, 'mensaje', s.mensaje,
                    'fecha_intercambio', s.fecha_intercambio, 'estado', s.estado,
                    'participantes', (select count(*) from sno_sorteo_participantes x where x.sorteo_id = s.id),
                    'visto', sp.visto_en is not null)
                    from sno_sorteos s join sno_sorteo_participantes sp on sp.sorteo_id = s.id and sp.persona_id = p.id
                   where s.evento_id = e.id)
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

revoke all on function public.sno_sortear(uuid) from public, anon;
revoke all on function public.sno_activar_amigo(uuid, text, date, text) from public, anon;
grant execute on function public.sno_activar_amigo(uuid, text, date, text) to authenticated;
grant execute on function public.sno_sortear(uuid) to authenticated;
revoke all on function public.sno_ver_amigo(text, uuid) from public;
revoke all on function public.sno_mi_deseo(text, text) from public;
grant execute on function public.sno_ver_amigo(text, uuid) to anon, authenticated;
grant execute on function public.sno_mi_deseo(text, text) to anon, authenticated;
grant execute on function public.sno_agenda(text) to anon, authenticated;

notify pgrst, 'reload schema';
