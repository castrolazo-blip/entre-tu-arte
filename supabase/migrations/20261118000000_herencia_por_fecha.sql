-- ════════════════════════════════════════════════════════════════════════════
-- Si nos organizamos! · Respuestas heredadas FECHA POR FECHA
--
-- Antes, para heredar la respuesta, UN solo evento respondido tenía que cubrir todo el nuevo.
-- Ahora cuenta cada fecha: si la persona ya confirmó su calendario en cualquier evento que
-- incluye ese día (y un horario que cubre el del nuevo), ese día cuenta como respondido.
-- Si entre todos sus eventos cubre todas las fechas futuras del nuevo, queda como
-- «Respondió (de otro evento)». Si no, solo quedan pendientes los días que nunca ha visto.
--
-- Requiere 20261112000000 … 20261117000000. Se puede ejecutar más de una vez.
-- ════════════════════════════════════════════════════════════════════════════

-- ¿La persona ya confirmó un evento (distinto a p_excluir) que incluye ese día y cubre ese horario?
create or replace function public.sno_fecha_cubierta(p_persona uuid, p_fecha date, p_ini time, p_fin time, p_excluir uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from sno_invitados oi join sno_eventos f on f.id = oi.evento_id
                  where oi.persona_id = p_persona and oi.evento_id <> p_excluir and oi.respondio_en is not null
                    and f.estado <> 'cancelado'
                    and p_fecha between f.desde and f.hasta and extract(dow from p_fecha)::int = any(f.dias)
                    and f.hora_inicio <= p_ini
                    and coalesce(f.hora_fin, '24:00'::time) >= coalesce(p_fin, '24:00'::time))
$$;

-- ¿Todas las fechas futuras del evento ya están cubiertas por lo que respondió en otros eventos?
create or replace function public.sno_cubierto_total(p_persona uuid, p_evento uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from sno_fechas_evento(p_evento) d where d >= sno_hoy())
     and not exists (select 1 from sno_eventos e, sno_fechas_evento(p_evento) d
                      where e.id = p_evento and d >= sno_hoy()
                        and not sno_fecha_cubierta(p_persona, d, e.hora_inicio, e.hora_fin, p_evento))
$$;

-- Al invitar: hereda la respuesta si entre todos sus eventos ya cubre todas las fechas
create or replace function public.sno_heredar_respuesta() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.respondio_en is null and sno_cubierto_total(new.persona_id, new.evento_id) then
    new.respondio_en := now();
    new.heredado := true;
  end if;
  return new;
end $$;

-- Al confirmar un calendario: los demás eventos que ya quedan cubiertos también heredan
create or replace function public.sno_propagar_respuesta() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.respondio_en is not null and old.respondio_en is null then
    update sno_invitados i set respondio_en = now(), heredado = true
      from sno_eventos e
     where e.id = i.evento_id and i.persona_id = new.persona_id and i.evento_id <> new.evento_id
       and i.respondio_en is null and e.estado = 'disponibilidad'
       and sno_cubierto_total(i.persona_id, i.evento_id);
  end if;
  return null;
end $$;
drop trigger if exists sno_propagar_respuesta on public.sno_invitados;
create trigger sno_propagar_respuesta after update of respondio_en on public.sno_invitados
  for each row execute function public.sno_propagar_respuesta();

-- Aplicar a los eventos que ya existen
update public.sno_invitados i set respondio_en = now(), heredado = true
  from public.sno_eventos e
 where e.id = i.evento_id and i.respondio_en is null and e.estado = 'disponibilidad'
   and public.sno_cubierto_total(i.persona_id, i.evento_id);

-- Resultados: cada fecha cubierta por otro evento respondido cuenta como respondida;
-- por invitado, cuántas de las fechas futuras ya tiene cubiertas
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
        select f.fecha, i.persona_id,
               (i.respondio_en is not null or sno_fecha_cubierta(i.persona_id, f.fecha, e.hora_inicio, e.hora_fin, e.id)) as resp,
               (exists (select 1 from sno_bloqueos b where b.persona_id = i.persona_id and b.fecha = f.fecha
                        and sno_choca(b.hora_desde, b.hora_hasta, e.hora_inicio, e.hora_fin))
                or sno_ocupado_por_evento(i.persona_id, f.fecha, e.hora_inicio, e.hora_fin, e.id)) as ocupado
          from f left join sno_invitados i on i.evento_id = e.id)
      select jsonb_agg(jsonb_build_object('fecha', fecha, 'pueden', pueden, 'no_pueden', no_pueden,
                                          'sin_respuesta', sin_respuesta,
                                          'eventos', (select jsonb_agg(distinct o.titulo) from sno_eventos o
                                                       join sno_invitados oi on oi.evento_id = o.id
                                                       join sno_invitados ei on ei.persona_id = oi.persona_id and ei.evento_id = e.id
                                                      where o.id <> e.id and o.estado = 'confirmado' and o.fecha_elegida = t.fecha
                                                        and sno_choca(o.hora_inicio, o.hora_fin, e.hora_inicio, e.hora_fin))) order by fecha)
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
               'token', p.token, 'activo', p.activo, 'respondio_en', i.respondio_en, 'actualizado_en', p.actualizado_en,
               'heredado', i.heredado,
               'posibles', (select count(*) from sno_fechas_evento(e.id) d where d >= sno_hoy()),
               'cubiertas', case when i.respondio_en is not null then (select count(*) from sno_fechas_evento(e.id) d where d >= sno_hoy())
                                 else (select count(*) from sno_fechas_evento(e.id) d where d >= sno_hoy()
                                        and sno_fecha_cubierta(p.id, d, e.hora_inicio, e.hora_fin, e.id)) end,
               'voto', exists (select 1 from sno_votos v where v.evento_id = e.id and v.persona_id = p.id and v.ronda = e.ronda))
               order by p.nombre)
        from sno_invitados i join sno_personas p on p.id = i.persona_id where i.evento_id = e.id), '[]'::jsonb));
end $$;

revoke all on function public.sno_fecha_cubierta(uuid, date, time, time, uuid) from public, anon;
revoke all on function public.sno_cubierto_total(uuid, uuid) from public, anon;

notify pgrst, 'reload schema';
