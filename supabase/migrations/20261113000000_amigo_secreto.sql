-- ════════════════════════════════════════════════════════════════════════════
-- Si nos organizamos! · Amigo secreto (intercambio de regalos)
--
-- El administrador arma el sorteo y elige participantes; la base de datos sortea al azar
-- (un círculo: nadie se saca a sí mismo y cada quien regala y recibe exactamente una vez).
-- Cada participante ve a quién le tocó con su mismo enlace privado.
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
  evento_id         uuid references public.sno_eventos(id) on delete set null,
  estado            text not null default 'preparacion' check (estado in ('preparacion', 'sorteado')),
  sorteado_en       timestamptz,
  created_at        timestamptz not null default now()
);

create table if not exists public.sno_sorteo_participantes (
  sorteo_id  uuid not null references public.sno_sorteos(id) on delete cascade,
  persona_id uuid not null references public.sno_personas(id) on delete cascade,
  deseo      text check (deseo is null or length(deseo) <= 500),   -- lista de deseos (la ve quien le regala)
  visto_en   timestamptz,                                          -- cuándo descubrió a su amigo secreto
  created_at timestamptz not null default now(),
  primary key (sorteo_id, persona_id)
);
create index if not exists sno_sorteo_part_persona_idx on public.sno_sorteo_participantes (persona_id);

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
  return (select jsonb_build_object('nombre', p.nombre, 'deseo', sp.deseo)
            from sno_personas p join sno_sorteo_participantes sp on sp.persona_id = p.id and sp.sorteo_id = p_sorteo
           where p.id = v_amigo);
end $$;

-- Participante: escribe su lista de deseos (la verá quien le regale)
create or replace function public.sno_mi_deseo(p_token text, p_sorteo uuid, p_deseo text) returns boolean
language plpgsql volatile security definer set search_path = public as $$
declare v_persona uuid;
begin
  select id into v_persona from sno_personas where token = p_token and activo;
  if v_persona is null then raise exception 'sno:enlace_invalido'; end if;
  if length(coalesce(p_deseo, '')) > 500 then raise exception 'sno:deseo_largo'; end if;
  update sno_sorteo_participantes set deseo = nullif(btrim(p_deseo), '')
   where sorteo_id = p_sorteo and persona_id = v_persona;
  if not found then raise exception 'sno:no_invitado'; end if;
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
    'sorteos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'titulo', s.titulo, 'mensaje', s.mensaje, 'monto', s.monto,
        'fecha_intercambio', s.fecha_intercambio, 'estado', s.estado,
        'participantes', (select count(*) from sno_sorteo_participantes x where x.sorteo_id = s.id),
        'mi_deseo', sp.deseo, 'visto', sp.visto_en is not null
      ) order by s.created_at desc)
        from sno_sorteo_participantes sp join sno_sorteos s on s.id = sp.sorteo_id
       where sp.persona_id = p.id
         and (s.fecha_intercambio is null or s.fecha_intercambio >= v_hoy - 30)), '[]'::jsonb),
    'bloqueos', coalesce((
      select jsonb_agg(jsonb_build_object('id', b.id, 'fecha', b.fecha,
               'desde', to_char(b.hora_desde, 'HH24:MI'), 'hasta', to_char(b.hora_hasta, 'HH24:MI'))
               order by b.fecha, b.hora_desde nulls first)
        from sno_bloqueos b where b.persona_id = p.id and b.fecha >= v_hoy), '[]'::jsonb));
end $$;

revoke all on function public.sno_sortear(uuid) from public, anon;
grant execute on function public.sno_sortear(uuid) to authenticated;
revoke all on function public.sno_ver_amigo(text, uuid) from public;
revoke all on function public.sno_mi_deseo(text, uuid, text) from public;
grant execute on function public.sno_ver_amigo(text, uuid) to anon, authenticated;
grant execute on function public.sno_mi_deseo(text, uuid, text) to anon, authenticated;
grant execute on function public.sno_agenda(text) to anon, authenticated;

notify pgrst, 'reload schema';
