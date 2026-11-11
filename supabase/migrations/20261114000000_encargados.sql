-- ════════════════════════════════════════════════════════════════════════════
-- Si nos organizamos! · Encargados («quién lleva qué») dentro de cada evento
--
-- El administrador arma la lista (pastel, carne, hielo, vino, mesas, limpieza…) con cupos;
-- los invitados se apuntan desde su enlace o el administrador los asigna.
-- A diferencia del calendario y del amigo secreto, esta lista la ven TODOS los invitados del
-- evento (es para coordinarse), con el primer nombre de cada responsable. Nunca teléfonos.
--
-- Requiere 20261112000000 y 20261113000000. Se puede ejecutar más de una vez.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.sno_encargos (
  id         uuid primary key default gen_random_uuid(),
  evento_id  uuid not null references public.sno_eventos(id) on delete cascade,
  nombre     text not null check (length(btrim(nombre)) between 2 and 60),
  detalle    text check (detalle is null or length(detalle) <= 200),   -- «2 bolsas», «para 12 personas»
  cupos      int not null default 1 check (cupos between 1 and 20),     -- cuántas personas pueden apuntarse
  orden      int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists sno_encargos_evento_idx on public.sno_encargos (evento_id, orden);

create table if not exists public.sno_encargo_responsables (
  encargo_id uuid not null references public.sno_encargos(id) on delete cascade,
  persona_id uuid not null references public.sno_personas(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (encargo_id, persona_id)
);
create index if not exists sno_encargo_resp_persona_idx on public.sno_encargo_responsables (persona_id);

alter table public.sno_encargos             enable row level security;
alter table public.sno_encargo_responsables enable row level security;
drop policy if exists sno_encargos_admin on public.sno_encargos;
drop policy if exists sno_encargo_resp_admin on public.sno_encargo_responsables;
create policy sno_encargos_admin on public.sno_encargos for all
  using (public.sno_es_admin()) with check (public.sno_es_admin());
create policy sno_encargo_resp_admin on public.sno_encargo_responsables for all
  using (public.sno_es_admin()) with check (public.sno_es_admin());

-- Solo pueden ser responsables los invitados del evento, y sin pasarse de los cupos
create or replace function public.sno_validar_responsable() returns trigger
language plpgsql security definer set search_path = public as $$
declare e sno_encargos;
begin
  select * into e from sno_encargos where id = new.encargo_id;
  if not exists (select 1 from sno_invitados where evento_id = e.evento_id and persona_id = new.persona_id) then
    raise exception 'sno:no_invitado';
  end if;
  if (select count(*) from sno_encargo_responsables where encargo_id = new.encargo_id) >= e.cupos then
    raise exception 'sno:encargo_lleno';
  end if;
  return new;
end $$;
drop trigger if exists sno_validar_responsable on public.sno_encargo_responsables;
create trigger sno_validar_responsable before insert on public.sno_encargo_responsables
  for each row execute function public.sno_validar_responsable();

-- Si alguien deja de estar invitado, deja de ser responsable de lo que había tomado
create or replace function public.sno_soltar_al_desinvitar() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from sno_encargo_responsables r using sno_encargos e
   where e.id = r.encargo_id and e.evento_id = old.evento_id and r.persona_id = old.persona_id;
  return null;
end $$;
drop trigger if exists sno_soltar_al_desinvitar on public.sno_invitados;
create trigger sno_soltar_al_desinvitar after delete on public.sno_invitados
  for each row execute function public.sno_soltar_al_desinvitar();

-- Participante: «Yo lo llevo» / «Ya no lo llevo»
create or replace function public.sno_tomar_encargo(p_token text, p_encargo uuid) returns boolean
language plpgsql volatile security definer set search_path = public as $$
declare v_persona uuid;
begin
  select id into v_persona from sno_personas where token = p_token and activo;
  if v_persona is null then raise exception 'sno:enlace_invalido'; end if;
  if exists (select 1 from sno_encargos en join sno_eventos ev on ev.id = en.evento_id
              where en.id = p_encargo and ev.estado = 'cancelado') then raise exception 'sno:evento_no_disponible'; end if;
  insert into sno_encargo_responsables (encargo_id, persona_id) values (p_encargo, v_persona) on conflict do nothing;
  update sno_personas set actualizado_en = now() where id = v_persona;
  return true;
end $$;

create or replace function public.sno_soltar_encargo(p_token text, p_encargo uuid) returns boolean
language plpgsql volatile security definer set search_path = public as $$
declare v_persona uuid;
begin
  select id into v_persona from sno_personas where token = p_token and activo;
  if v_persona is null then raise exception 'sno:enlace_invalido'; end if;
  delete from sno_encargo_responsables where encargo_id = p_encargo and persona_id = v_persona;
  update sno_personas set actualizado_en = now() where id = v_persona;
  return true;
end $$;

-- La agenda incluye la lista de encargos de cada evento
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
                   where s.evento_id = e.id),
        'encargos', coalesce((select jsonb_agg(jsonb_build_object('id', en.id, 'nombre', en.nombre, 'detalle', en.detalle,
                    'cupos', en.cupos,
                    'responsables', coalesce((select jsonb_agg(jsonb_build_object('nombre', split_part(btrim(pr.nombre), ' ', 1),
                                       'yo', pr.id = p.id) order by r.created_at)
                                     from sno_encargo_responsables r join sno_personas pr on pr.id = r.persona_id
                                    where r.encargo_id = en.id), '[]'::jsonb)) order by en.orden, en.created_at)
                    from sno_encargos en where en.evento_id = e.id), '[]'::jsonb)
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

revoke all on function public.sno_tomar_encargo(text, uuid) from public;
revoke all on function public.sno_soltar_encargo(text, uuid) from public;
grant execute on function public.sno_tomar_encargo(text, uuid) to anon, authenticated;
grant execute on function public.sno_soltar_encargo(text, uuid) to anon, authenticated;
grant execute on function public.sno_agenda(text) to anon, authenticated;

notify pgrst, 'reload schema';
