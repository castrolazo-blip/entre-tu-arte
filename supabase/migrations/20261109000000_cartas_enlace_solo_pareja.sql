-- ════════════════════════════════════════════════════════════════════════════
-- Cartas con Amor · Cada enlace muestra SOLO a su pareja
--
-- Antes, el enlace general del retiro (/cartas/enviar?c=CÓDIGO) mostraba la lista de todas las
-- parejas para elegir. Ahora el formulario solo funciona con el enlace de una pareja (?p=…) o el
-- enlace personal de un contacto de familia (?r=…), y únicamente devuelve esa pareja.
-- Así nadie que reciba un enlace puede ver quiénes participan en el retiro.
--
-- Se puede ejecutar más de una vez.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.cca_portal(p_codigo text, p_pareja text default null, p_remitente text default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r cca_retiros; v_rem cca_remitentes; v_p cca_parejas; v_abierto boolean; v_tardio boolean;
begin
  select * into r from cca_retiros where codigo = p_codigo and estado = 'activo';
  if not found then return jsonb_build_object('estado', 'no_disponible'); end if;

  if nullif(p_remitente, '') is not null then
    select * into v_rem from cca_remitentes where token = p_remitente and retiro_id = r.id;
  end if;
  if v_rem.id is not null then
    select * into v_p from cca_parejas where id = v_rem.pareja_id and estado = 'activa';
  elsif nullif(p_pareja, '') is not null then
    select * into v_p from cca_parejas where token = p_pareja and retiro_id = r.id and estado = 'activa';
  end if;
  -- Sin pareja válida no se muestra nada (ni la lista del retiro)
  if v_p.id is null then return jsonb_build_object('estado', 'sin_pareja', 'nombre', r.nombre); end if;

  v_tardio := r.fecha_limite is not null and now() > r.fecha_limite;
  v_abierto := not v_tardio or r.aceptar_tardias;

  return jsonb_build_object(
    'estado', case when v_abierto then 'abierto' else 'cerrado' end,
    'tardio', v_tardio,
    'nombre', r.nombre, 'inicio', r.inicio, 'fin', r.fin, 'lugar', r.lugar,
    'fecha_limite', r.fecha_limite, 'max_mb', r.max_mb, 'max_archivos', r.max_archivos,
    'mensaje', r.mensaje_portal, 'responsable', r.responsable_datos,
    'contacto_privacidad', r.contacto_privacidad, 'retencion_dias', r.retencion_dias,
    'meta_por_persona', r.meta_por_persona,
    'parejas', jsonb_build_array(jsonb_build_object('id', v_p.id,
      'a', coalesce(nullif(v_p.apodo_a, ''), v_p.nombre_a), 'b', coalesce(nullif(v_p.apodo_b, ''), v_p.nombre_b),
      'apellidos', v_p.apellidos,
      'na', btrim(v_p.nombre_a || ' ' || coalesce(v_p.apellidos_a, '')),
      'nb', btrim(v_p.nombre_b || ' ' || coalesce(v_p.apellidos_b, '')))),
    'remitente', case when v_rem.id is null then null else jsonb_build_object(
      'nombre', v_rem.nombre, 'relacion', v_rem.relacion, 'destinatario', v_rem.destinatario,
      'pareja_id', v_rem.pareja_id, 'coordinador', v_rem.coordinador) end);
end $$;

grant execute on function public.cca_portal(text, text, text) to anon, authenticated;
notify pgrst, 'reload schema';
