import { supabase } from '../../lib/supabase.js'

// ── Mensajes de error comprensibles ──────────────────────────────────────────
const ERRORES = {
  enlace_invalido: 'Este enlace ya no es válido. Pedile al organizador uno nuevo.',
  fecha_invalida: 'Esa fecha ya pasó o está demasiado lejos.',
  horas_invalidas: 'La hora final debe ser después de la inicial.',
  demasiados_bloqueos: 'Tenés demasiadas fechas marcadas.',
  evento_no_disponible: 'Este evento ya no está recibiendo disponibilidad.',
  no_invitado: 'No estás en la lista de invitados de este evento.',
  votacion_cerrada: 'La votación ya está cerrada.',
  opcion_invalida: 'Esa fecha no está entre las opciones.',
  pocas_opciones: 'Elegí al menos 2 fechas para votar (o confirmá una directamente).',
  fecha_fuera_del_evento: 'Esa fecha no pertenece al evento.',
  sin_permiso: 'Tu cuenta no es administradora de Si nos organizamos!',
  pocos_participantes: 'Se necesitan al menos 3 participantes para sortear.',
  sin_sorteo: 'El sorteo todavía no se ha hecho (o se volvió a armar). Esperá el aviso del organizador.',
  deseo_largo: 'La lista de deseos puede tener hasta 500 caracteres.',
  encargo_lleno: 'Ya está cubierto: alguien más lo tomó. Elegí otra cosa.',
}
export function mensajeError(e, porDefecto = 'Algo salió mal. Revisá tu conexión e intentá de nuevo.') {
  const m = String(e?.message || '')
  const clave = m.match(/sno:([a-z_]+)/)?.[1]
  if (clave && ERRORES[clave]) return ERRORES[clave]
  if (/timeout|fetch|network/i.test(m)) return 'Sin conexión. Intentá de nuevo en un momento.'
  return porDefecto
}

async function rpc(nombre, params) {
  const { data, error } = await supabase.rpc(nombre, params)
  if (error) throw error
  return data
}

// ── Participante (con su enlace) ─────────────────────────────────────────────
export const agenda = token => rpc('sno_agenda', { p_token: token })
export const bloquear = (token, fecha, desde = null, hasta = null) =>
  rpc('sno_bloquear', { p_token: token, p_fecha: fecha, p_desde: desde, p_hasta: hasta })
export const desbloquear = (token, ids) => rpc('sno_desbloquear', { p_token: token, p_ids: ids })
export const marcarListo = (token, evento) => rpc('sno_listo', { p_token: token, p_evento: evento })
export const votar = (token, evento, fecha) => rpc('sno_votar', { p_token: token, p_evento: evento, p_fecha: fecha })

// ── Administrador ────────────────────────────────────────────────────────────
export async function esAdmin(userId) {
  const { data, error } = await supabase.from('sno_admins').select('user_id').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return !!data
}

export async function listarEventos() {
  const [{ data, error }, tablero] = await Promise.all([
    supabase.from('sno_eventos').select('*').order('created_at', { ascending: false }),
    rpc('sno_tablero'),
  ])
  if (error) throw error
  const cuentas = Object.fromEntries((tablero || []).map(t => [t.id, t]))
  return data.map(e => ({ ...e, ...(cuentas[e.id] || { invitados: 0, respondieron: 0, votaron: 0 }), id: e.id }))
}

export async function cargarEvento(id) {
  const [{ data, error }, resultados] = await Promise.all([
    supabase.from('sno_eventos').select('*').eq('id', id).single(),
    rpc('sno_resultados', { p_evento: id }),
  ])
  if (error) throw error
  return { evento: data, ...resultados }
}

export async function invitadosDe(id) {
  const { data, error } = await supabase.from('sno_invitados').select('persona_id').eq('evento_id', id)
  if (error) throw error
  return data.map(x => x.persona_id)
}

export async function guardarEvento(datos, invitados, id = null) {
  let evento
  if (id) {
    const { data, error } = await supabase.from('sno_eventos').update(datos).eq('id', id).select().single()
    if (error) throw error
    evento = data
  } else {
    const { data, error } = await supabase.from('sno_eventos').insert(datos).select().single()
    if (error) throw error
    evento = data
  }
  const actuales = id ? await invitadosDe(id) : []
  const nuevos = invitados.filter(p => !actuales.includes(p))
  const quitar = actuales.filter(p => !invitados.includes(p))
  if (nuevos.length) {
    const { error } = await supabase.from('sno_invitados').insert(nuevos.map(persona_id => ({ evento_id: evento.id, persona_id })))
    if (error) throw error
  }
  if (quitar.length) {
    const { error } = await supabase.from('sno_invitados').delete().eq('evento_id', evento.id).in('persona_id', quitar)
    if (error) throw error
  }
  return evento
}

export async function actualizarEvento(id, cambios) {
  const { data, error } = await supabase.from('sno_eventos').update(cambios).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function borrarEvento(id) {
  const { error } = await supabase.from('sno_eventos').delete().eq('id', id)
  if (error) throw error
}

export const abrirVotacion = (id, opciones) => rpc('sno_abrir_votacion', { p_evento: id, p_opciones: opciones })

export async function listarPersonas() {
  const { data, error } = await supabase.from('sno_personas').select('*').order('nombre')
  if (error) throw error
  return data
}

export async function guardarPersona(datos, id = null) {
  const q = id ? supabase.from('sno_personas').update(datos).eq('id', id) : supabase.from('sno_personas').insert(datos)
  const { data, error } = await q.select().single()
  if (error) throw error
  return data
}

export async function borrarPersona(id) {
  const { error } = await supabase.from('sno_personas').delete().eq('id', id)
  if (error) throw error
}

export const nuevoEnlace = id => rpc('sno_nuevo_enlace', { p_persona: id })

// ── Amigo secreto ────────────────────────────────────────────────────────────
export const verAmigo = (token, sorteo) => rpc('sno_ver_amigo', { p_token: token, p_sorteo: sorteo })
export const guardarDeseo = (token, deseo) => rpc('sno_mi_deseo', { p_token: token, p_deseo: deseo })
export const sortear = id => rpc('sno_sortear', { p_sorteo: id })

export const activarAmigo = (evento, { monto, fecha, mensaje } = {}) =>
  rpc('sno_activar_amigo', { p_evento: evento, p_monto: monto || null, p_fecha: fecha || null, p_mensaje: mensaje || null })

// Amigo secreto de un evento (o null si no está activado). Nunca trae quién le regala a quién.
export async function amigoDeEvento(eventoId) {
  const { data, error } = await supabase.from('sno_sorteos')
    .select('*, sno_sorteo_participantes(persona_id, visto_en, sno_personas(id, nombre, telefono, token, activo, deseo))')
    .eq('evento_id', eventoId).maybeSingle()
  if (error) throw error
  if (!data) return null
  const participantes = (data.sno_sorteo_participantes || [])
    .map(p => ({ ...p.sno_personas, deseo: undefined, persona_id: p.persona_id, visto_en: p.visto_en, tiene_deseo: !!p.sno_personas?.deseo }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
  return { ...data, sno_sorteo_participantes: undefined, participantes }
}

export async function actualizarSorteo(id, cambios) {
  const { error } = await supabase.from('sno_sorteos').update(cambios).eq('id', id)
  if (error) throw error
}

export async function borrarSorteo(id) {
  const { error } = await supabase.from('sno_sorteos').delete().eq('id', id)
  if (error) throw error
}

// ── Encargados («quién lleva qué») ───────────────────────────────────────────
export const tomarEncargo = (token, encargo) => rpc('sno_tomar_encargo', { p_token: token, p_encargo: encargo })
export const soltarEncargo = (token, encargo) => rpc('sno_soltar_encargo', { p_token: token, p_encargo: encargo })

export async function encargosDe(eventoId) {
  const { data, error } = await supabase.from('sno_encargos')
    .select('*, sno_encargo_responsables(persona_id, created_at)').eq('evento_id', eventoId)
    .order('orden').order('created_at')
  if (error) throw error
  return data.map(e => ({ ...e, responsables: (e.sno_encargo_responsables || []).map(r => r.persona_id), sno_encargo_responsables: undefined }))
}
export async function crearEncargos(eventoId, items) {
  const { error } = await supabase.from('sno_encargos').insert(items.map(x => ({ evento_id: eventoId, ...x })))
  if (error) throw error
}
export async function actualizarEncargo(id, cambios) {
  const { error } = await supabase.from('sno_encargos').update(cambios).eq('id', id)
  if (error) throw error
}
export async function borrarEncargo(id) {
  const { error } = await supabase.from('sno_encargos').delete().eq('id', id)
  if (error) throw error
}
export async function asignarEncargo(encargo, persona) {
  const { error } = await supabase.from('sno_encargo_responsables').insert({ encargo_id: encargo, persona_id: persona })
  if (error) throw error
}
export async function quitarResponsable(encargo, persona) {
  const { error } = await supabase.from('sno_encargo_responsables').delete().eq('encargo_id', encargo).eq('persona_id', persona)
  if (error) throw error
}
