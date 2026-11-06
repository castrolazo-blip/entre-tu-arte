// Cartas con Amor · acceso a datos (Supabase). Lo que protege la información son las reglas
// de la base de datos (supabase/migrations/20261106000000_cartas_con_amor.sql), no esta capa.
import { supabase } from '../../lib/supabase.js'
import { BUCKET_CARTAS, EXTENSIONES, TIPOS_ARCHIVO } from './constantes.js'

const ok = ({ data, error }) => { if (error) throw error; return data }

// ── Sesión ──
export async function miPerfil(userId) {
  if (!userId) return null
  return ok(await supabase.from('cca_usuarios').select('*').eq('user_id', userId).maybeSingle())
}

// ── Retiros ──
export const listarRetiros = async () =>
  ok(await supabase.from('cca_retiros').select('*').order('inicio', { ascending: false, nullsFirst: false }))
export const guardarRetiro = async (r) => r.id
  ? ok(await supabase.from('cca_retiros').update(limpiarRetiro(r)).eq('id', r.id).select().single())
  : ok(await supabase.from('cca_retiros').insert(limpiarRetiro(r)).select().single())
function limpiarRetiro(r) {
  const campos = ['nombre', 'inicio', 'fin', 'lugar', 'fecha_limite', 'estado', 'aceptar_tardias', 'max_mb', 'max_archivos',
    'retencion_dias', 'semaforo_dias', 'mensaje_portal', 'responsable_datos', 'contacto_privacidad', 'meta_por_persona', 'plantilla_mensaje']
  const o = {}
  for (const c of campos) if (c in r) o[c] = r[c] === '' ? null : r[c]
  return o
}

// ── Datos de un retiro completo (los volúmenes de un retiro son pequeños: se carga todo) ──
export async function cargarRetiro(retiroId) {
  const [parejas, remitentes, cartas, equipo] = await Promise.all([
    supabase.from('cca_parejas').select('*').eq('retiro_id', retiroId).order('codigo'),
    supabase.from('cca_remitentes').select('*').eq('retiro_id', retiroId).order('nombre'),
    supabase.from('cca_cartas').select('*, cca_archivos(id, nombre_original, tipo, tamano, ruta, ilegible)')
      .eq('retiro_id', retiroId).order('created_at', { ascending: false }),
    supabase.from('cca_equipo').select('*').eq('retiro_id', retiroId).order('apellidos'),
  ])
  // Si aún no se ejecutó la migración del equipo, el panel sigue funcionando sin él
  return { parejas: ok(parejas), remitentes: ok(remitentes), cartas: ok(cartas), equipo: equipo.error ? [] : equipo.data }
}

// ── Equipo de servidores ──
export async function guardarEquipo(e) {
  const t = v => (typeof v === 'string' ? v.trim() || null : v ?? null)
  const fila = { retiro_id: e.retiro_id, apellidos: e.apellidos.trim().replace(/\s+/g, ' '), notas: t(e.notas),
    esposo_nombre: t(e.esposo_nombre), esposo_telefono: t(e.esposo_telefono), esposo_correo: t(e.esposo_correo)?.toLowerCase() || null,
    esposa_nombre: t(e.esposa_nombre), esposa_telefono: t(e.esposa_telefono), esposa_correo: t(e.esposa_correo)?.toLowerCase() || null }
  return e.id
    ? ok(await supabase.from('cca_equipo').update(fila).eq('id', e.id).select().single())
    : ok(await supabase.from('cca_equipo').insert(fila).select().single())
}
export const borrarEquipo = async (id) => ok(await supabase.from('cca_equipo').delete().eq('id', id))
export const asignarParejas = async (ids, equipoId) =>
  ok(await supabase.from('cca_parejas').update({ equipo_id: equipoId || null }).in('id', ids).select('id, equipo_id'))
// Un miembro del equipo que entra con su correo registrado obtiene acceso (sin lectura de cartas)
export async function reclamarAcceso() {
  const { data, error } = await supabase.rpc('cca_reclamar_acceso')
  return error ? 0 : data
}

// ── Parejas ──
export const guardarPareja = async (p) => {
  const t = v => (typeof v === 'string' ? v.trim() || null : v ?? null)
  const fila = { retiro_id: p.retiro_id, codigo: p.codigo?.trim(), nombre_a: p.nombre_a?.trim(), nombre_b: p.nombre_b?.trim(),
    apellidos: t(p.apellidos), apellidos_a: t(p.apellidos_a), apellidos_b: t(p.apellidos_b), apodo_a: t(p.apodo_a), apodo_b: t(p.apodo_b),
    responsable: t(p.responsable), invitados_por: t(p.invitados_por),
    contacto_a: t(p.contacto_a), contacto_b: t(p.contacto_b), notas: t(p.notas), estado: p.estado || 'activa' }
  return p.id
    ? ok(await supabase.from('cca_parejas').update(fila).eq('id', p.id).select().single())
    : ok(await supabase.from('cca_parejas').insert(fila).select().single())
}
export const insertarParejas = async (filas) => ok(await supabase.from('cca_parejas').insert(filas).select())

// Excel de inscripción: crea las parejas y sus contactos de familia (coordinadores)
export async function insertarInscripcion(retiroId, items) {
  const creadas = await insertarParejas(items.map(x => ({ ...x.pareja, retiro_id: retiroId })))
  const porCodigo = Object.fromEntries(creadas.map(p => [p.codigo, p]))
  const contactos = items.flatMap(x => x.contactos.map(c => ({
    retiro_id: retiroId, pareja_id: porCodigo[x.pareja.codigo].id, nombre: c.nombre, relacion: c.relacion || null,
    telefono: c.telefono || null, notas: c.telefono || !c.original ? null : `Dato original: ${c.original}`,
    destinatario: 'ambos', coordinador: true,
  })))
  if (contactos.length) await insertarRemitentes(contactos)
  return { parejas: creadas.length, contactos: contactos.length }
}

// ── Remitentes esperados ──
export const guardarRemitente = async (r) => {
  const fila = { retiro_id: r.retiro_id, pareja_id: r.pareja_id, nombre: r.nombre?.trim(), telefono: r.telefono || null,
    correo: r.correo || null, relacion: r.relacion || null, destinatario: r.destinatario || 'ambos',
    estado: r.estado || 'pendiente', motivo: r.motivo || null, notas: r.notas || null, coordinador: !!r.coordinador }
  return r.id
    ? ok(await supabase.from('cca_remitentes').update(fila).eq('id', r.id).select().single())
    : ok(await supabase.from('cca_remitentes').insert(fila).select().single())
}
export const insertarRemitentes = async (filas) => ok(await supabase.from('cca_remitentes').insert(filas).select())
export const actualizarRemitente = async (id, cambios) =>
  ok(await supabase.from('cca_remitentes').update(cambios).eq('id', id).select().single())
export const borrarRemitente = async (id) => ok(await supabase.from('cca_remitentes').delete().eq('id', id))

export async function registrarRecordatorio({ retiro_id, remitente_id, canal, mensaje, usuario_id }) {
  ok(await supabase.from('cca_recordatorios').insert({ retiro_id, remitente_id, canal, mensaje, usuario_id }))
  return actualizarRemitente(remitente_id, { ultimo_recordatorio: new Date().toISOString(), invitacion: 'invitado' })
}
export const listarRecordatorios = async (retiroId) =>
  ok(await supabase.from('cca_recordatorios').select('*').eq('retiro_id', retiroId).order('created_at', { ascending: false }))

// ── Cartas ──
export const actualizarCarta = async (id, cambios) =>
  ok(await supabase.from('cca_cartas').update(cambios).eq('id', id).select('*, cca_archivos(id, nombre_original, tipo, tamano, ruta, ilegible)').single())
export const actualizarCartas = async (ids, cambios) =>
  ok(await supabase.from('cca_cartas').update(cambios).in('id', ids).select('id'))

export async function textoCarta(cartaId) {
  const { data, error } = await supabase.from('cca_contenidos').select('texto').eq('carta_id', cartaId).maybeSingle()
  if (error) throw error
  return data?.texto ?? null
}
export async function textosCartas(ids) {
  if (!ids.length) return {}
  const filas = ok(await supabase.from('cca_contenidos').select('carta_id, texto').in('carta_id', ids))
  return Object.fromEntries(filas.map(f => [f.carta_id, f.texto]))
}

export const historial = async (entidadId) =>
  ok(await supabase.from('cca_auditoria').select('*').eq('entidad_id', entidadId).order('created_at', { ascending: false }).limit(50))
export const actividadReciente = async (retiroId, limite = 12) =>
  ok(await supabase.from('cca_auditoria').select('*').eq('retiro_id', retiroId).order('created_at', { ascending: false }).limit(limite))
export const registrarAccion = async ({ retiro_id, usuario_id, entidad, entidad_id = null, accion, datos = null }) =>
  supabase.from('cca_auditoria').insert({ retiro_id, usuario_id, entidad, entidad_id, accion, datos })

export const marcarArchivo = async (id, ilegible) =>
  ok(await supabase.from('cca_archivos').update({ ilegible }).eq('id', id))

// Enlace temporal (5 minutos) para ver o descargar un archivo privado
export async function enlaceArchivo(ruta, descargar = false, segundos = 300) {
  const { data, error } = await supabase.storage.from(BUCKET_CARTAS).createSignedUrl(ruta, segundos, descargar ? { download: true } : undefined)
  if (error) throw error
  return data.signedUrl
}
export async function bytesArchivo(ruta) {
  const { data, error } = await supabase.storage.from(BUCKET_CARTAS).download(ruta)
  if (error) throw error
  return new Uint8Array(await data.arrayBuffer())
}

// Carta física: se crea la carta, se suben las fotos o escaneos y se registran
export async function registrarCartaFisica({ carta, texto, archivos, puedeLeer }) {
  const nueva = ok(await supabase.from('cca_cartas').insert({
    retiro_id: carta.retiro_id, pareja_id: carta.pareja_id, destinatario: carta.destinatario,
    remitente_nombre: carta.remitente_nombre.trim(), relacion: carta.relacion || null,
    remitente_contacto: carta.remitente_contacto || null, remitente_id: carta.remitente_id || null,
    coordinador_id: carta.coordinador_id || null, recibida_de: carta.recibida_de || null,
    origen: carta.origen === 'correo' ? 'correo' : 'fisica', estado: carta.estado || 'recibida',
  }).select().single())
  if (puedeLeer && texto?.trim()) ok(await supabase.from('cca_contenidos').insert({ carta_id: nueva.id, texto: texto.trim() }))
  for (const archivo of archivos) {
    const { ruta, tipo, tamano, hash, nombre } = await subirArchivo(archivo, 'fisicas/' + nueva.id)
    ok(await supabase.from('cca_archivos').insert({ carta_id: nueva.id, nombre_original: nombre, tipo, tamano, ruta, hash }))
  }
  return nueva
}

// ── Archivos: validación, compresión de fotos y subida ──
export function tipoDeArchivo(file) {
  if (TIPOS_ARCHIVO[file.type]) return file.type
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  return EXTENSIONES[ext] || null
}

// Revisa la "firma" real del archivo (no basta con la extensión)
export async function firmaValida(file, tipo) {
  const b = new Uint8Array(await file.slice(0, 8).arrayBuffer())
  if (tipo === 'application/pdf') return b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46
  if (tipo === 'image/png') return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47
  if (tipo === 'image/jpeg') return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff
  if (tipo.includes('wordprocessingml')) return b[0] === 0x50 && b[1] === 0x4b
  return false
}

// Las fotos grandes del celular se reducen antes de subir (conexiones lentas)
export async function comprimirFoto(file, tipo) {
  if (!tipo.startsWith('image/') || file.size < 2.5 * 1024 * 1024) return file
  try {
    const bitmap = await createImageBitmap(file)
    const escala = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * escala); canvas.height = Math.round(bitmap.height * escala)
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.86))
    if (!blob || blob.size >= file.size) return file
    return new File([blob], file.name.replace(/\.(png|jpe?g)$/i, '') + '.jpg', { type: 'image/jpeg' })
  } catch { return file }
}

async function huella(file) {
  try {
    const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
    return [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, '0')).join('')
  } catch { return null }
}

const nombreSeguro = (nombre, tipo) => {
  const ext = TIPOS_ARCHIVO[tipo] || 'bin'
  const base = nombre.replace(/\.[^.]+$/, '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'carta'
  return `${base}.${ext}`
}
const uuid = () => (crypto.randomUUID ? crypto.randomUUID()
  : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16) }))

// Sube a la carpeta indicada ("entrantes" para el portal) dentro del bucket privado
export async function subirArchivo(file, carpeta = 'entrantes') {
  const tipo = tipoDeArchivo(file)
  if (!tipo) throw new Error('cca:tipo_no_permitido')
  const final = await comprimirFoto(file, tipo)
  const tipoFinal = tipoDeArchivo(final)
  const ruta = carpeta === 'entrantes' ? `entrantes/${uuid()}/${nombreSeguro(final.name, tipoFinal)}`
    : `${carpeta}/${uuid().slice(0, 8)}-${nombreSeguro(final.name, tipoFinal)}`
  const hash = await huella(final)
  let ultimoError
  for (let intento = 0; intento < 3; intento++) {
    const { error } = await supabase.storage.from(BUCKET_CARTAS).upload(ruta, final, { contentType: tipoFinal, upsert: false })
    if (!error) return { ruta, tipo: tipoFinal, tamano: final.size, hash, nombre: file.name.slice(0, 200) }
    ultimoError = error
    if (/exists|Duplicate/i.test(error.message)) break
    await new Promise(r => setTimeout(r, 1500 * (intento + 1)))
  }
  throw ultimoError
}

// ── Portal público ──
export const portal = async (codigo, pareja, remitente) =>
  ok(await supabase.rpc('cca_portal', { p_codigo: codigo, p_pareja: pareja || null, p_remitente: remitente || null }))
export const enviarCarta = async (datos) => ok(await supabase.rpc('cca_enviar_carta', datos))

// ── Usuarios y organizadores ──
export const listarUsuarios = async () => ok(await supabase.from('cca_usuarios').select('*').order('nombre'))
export const agregarUsuario = async ({ correo, nombre, rol, puede_leer }) =>
  ok(await supabase.rpc('cca_agregar_usuario', { p_correo: correo, p_nombre: nombre, p_rol: rol, p_puede_leer: puede_leer }))
export const actualizarUsuario = async (user_id, cambios) =>
  ok(await supabase.from('cca_usuarios').update(cambios).eq('user_id', user_id))
export const listarOrganizadores = async () => ok(await supabase.from('cca_retiro_organizadores').select('*'))
export const asignarOrganizador = async (retiro_id, user_id, asignar) => asignar
  ? ok(await supabase.from('cca_retiro_organizadores').upsert({ retiro_id, user_id }))
  : ok(await supabase.from('cca_retiro_organizadores').delete().eq('retiro_id', retiro_id).eq('user_id', user_id))

// ── Retención: borra archivos y cartas del retiro y lo deja archivado ──
export async function eliminarContenidoRetiro(retiroId) {
  const cartas = ok(await supabase.from('cca_cartas').select('id, cca_archivos(ruta)').eq('retiro_id', retiroId))
  const rutas = cartas.flatMap(c => c.cca_archivos.map(a => a.ruta))
  for (let i = 0; i < rutas.length; i += 100) {
    const { error } = await supabase.storage.from(BUCKET_CARTAS).remove(rutas.slice(i, i + 100))
    if (error) throw error
  }
  ok(await supabase.from('cca_cartas').delete().eq('retiro_id', retiroId))
  return ok(await supabase.from('cca_retiros').update({ estado: 'archivado' }).eq('id', retiroId).select().single())
}

// ── Enlace privado de cada matrimonio del equipo (sin cuenta) ──
export const equipoBandeja = async (token) => ok(await supabase.rpc('cca_equipo_bandeja', { p_token: token }))
export const equipoRegistrar = async ({ token, pareja, lineas, coordinador, entrego }) =>
  ok(await supabase.rpc('cca_equipo_registrar', { p_token: token, p_pareja: pareja, p_lineas: lineas, p_coordinador: coordinador || null, p_entrego: entrego || null }))
export const equipoRecordatorio = async ({ token, remitente, canal, mensaje }) =>
  ok(await supabase.rpc('cca_equipo_recordatorio', { p_token: token, p_remitente: remitente, p_canal: canal, p_mensaje: mensaje }))
// Nuevo enlace: el anterior deja de funcionar
export async function cambiarEnlaceEquipo(id) {
  const token = [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, '0')).join('')
  return ok(await supabase.from('cca_equipo').update({ token }).eq('id', id).select().single())
}
export const enlaceEquipo = (token) => `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, '')}/cartas/equipo?t=${token}`
