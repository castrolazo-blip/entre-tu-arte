import { supabase } from '../../lib/supabase.js'
import { medidasTexto } from '../../lib/formato.js'
import { numeroPiezas } from '../../lib/piezas.js'

// ── Normalización ───────────────────────────────────────────────────────────
// Las obras viejas solo tienen "imagen_url" (la ficha diseñada). Las nuevas guardan sus
// fotos en "fotos" ([{url, rol}]). Aquí se unifican para que la tienda no distinga.

export const ESTADOS = {
  disponible: { etiqueta: 'Disponible', clase: 'bg-white text-green-800' },
  reservada:  { etiqueta: 'Reservada', clase: 'bg-mostaza text-tinta' },
  vendida:    { etiqueta: 'Vendida', clase: 'bg-tinta text-white' },
  borrador:   { etiqueta: 'Borrador', clase: 'bg-crema-borde text-tinta' },
}

export const TIPOS_OBRA = {
  original: 'Diseño propio',
  interpretacion: 'Interpretación',
}

// Texto para la ficha: "Diseño propio" o "Interpretación de «La noche estrellada» (Van Gogh)"
export function textoTipo(f) {
  if (f.tipo_obra === 'interpretacion') return f.inspirada_en ? `Interpretación de ${f.inspirada_en}` : 'Interpretación de otra obra'
  if (f.tipo_obra === 'original') return 'Diseño propio'
  return ''
}

export function estadoEfectivo(f) {
  // Una reserva vencida vuelve a estar disponible sin esperar a que el admin la libere
  if (f.estado === 'reservada' && f.reservada_hasta && new Date(f.reservada_hasta) < new Date()) return 'disponible'
  return f.estado || 'disponible'
}

// En la tienda una obra vendida se ofrece "Por pedido": el artista la vuelve a pintar.
export const POR_PEDIDO = 'Por pedido'
export const esMarketplace = f => f?.origen === 'marketplace'
// Solo las obras de Entre tu Arte se pueden volver a pintar por pedido
export const esPorPedido = f => estadoEfectivo(f) === 'vendida' && !esMarketplace(f)

export function etiquetaExistencias(f) {
  const estado = estadoEfectivo(f)
  if (estado === 'vendida') return esMarketplace(f) ? 'Vendida' : POR_PEDIDO
  if (estado === 'reservada') return 'Reservada por 48 horas'
  if (f.edicion_total) return `${f.existencias ?? 0} de ${f.edicion_total} disponibles`
  if ((f.existencias ?? 1) <= 1) return 'Pieza única'
  return `${f.existencias} disponibles`
}

export function insignia(f) {
  const estado = estadoEfectivo(f)
  if (estado === 'vendida') return esMarketplace(f) ? { texto: 'Vendida', clase: 'bg-tinta text-white' } : { texto: POR_PEDIDO, clase: 'bg-mostaza text-tinta' }
  if (estado !== 'disponible') return { texto: ESTADOS[estado].etiqueta, clase: ESTADOS[estado].clase }
  if (f.edicion_total && f.existencias === 1) return { texto: 'Última pieza', clase: 'bg-tinta text-white' }
  if (f.edicion_total) return { texto: 'Edición limitada', clase: 'bg-white text-tinta' }
  return { texto: 'En existencia', clase: 'bg-white text-green-800' }
}

export function normalizarObra(f) {
  if (!f) return null
  const fotos = Array.isArray(f.fotos) && f.fotos.length
    ? f.fotos.filter(x => x && x.url)
    : (f.imagen_url ? [{ url: f.imagen_url, rol: 'principal' }] : [])
  // Si la base aún no tiene la columna "piezas", se lee del texto de medidas ("3 piezas de …")
  const deTexto = /^(\d+) piezas/.exec(f.medidas || '')
  const piezas = f.piezas != null ? numeroPiezas(f) : deTexto ? numeroPiezas({ piezas: deTexto[1] }) : 1
  return {
    ...f,
    piezas,
    titulo: f.titulo || 'Obra sin título',
    fotos,
    foto: fotos[0]?.url || f.imagen_url || '',
    // Versión liviana para tarjetas y galerías (si la foto aún no tiene miniatura, la grande)
    fotoMini: fotos[0]?.mini || fotos[0]?.url || f.imagen_url || '',
    fotoReal: Array.isArray(f.fotos) && f.fotos.some(x => x && x.url),
    medidasTexto: f.piezas == null && deTexto ? f.medidas : medidasTexto(f),
    artista: f.artistas?.nombre || f.artista_nombre || '',
    artistaSlug: f.artistas?.slug || null,
    estadoEfectivo: estadoEfectivo(f),
  }
}

const CAMPOS = '*, artistas(id, nombre, slug)'

// ── Consultas ───────────────────────────────────────────────────────────────
// origen: 'entre_tu_arte' (por defecto: las obras de la marca), 'marketplace' o 'todas'.
// Se filtra después de leer para que funcione aunque la base aún no tenga la columna "origen".
export async function listarObras({ estado, categoria, artistaId, destacadas, limite, orden = 'recientes', busqueda, origen = 'entre_tu_arte' } = {}) {
  let q = supabase.from('fichas').select(CAMPOS).neq('estado', 'borrador')
  if (estado === 'vendida') q = q.eq('estado', 'vendida')
  else if (estado === 'en_venta') q = q.in('estado', ['disponible', 'reservada'])
  else if (estado === 'publicas') q = q.in('estado', ['disponible', 'reservada', 'vendida'])
  else if (estado) q = q.eq('estado', estado)
  if (categoria) q = q.contains('categorias', [categoria])
  if (artistaId) q = q.eq('artista_id', artistaId)
  if (destacadas) q = q.eq('destacada', true)
  const b = String(busqueda || '').replace(/[,()%*\\]/g, ' ').trim()
  if (b) q = q.or(`titulo.ilike.%${b}%,estilo.ilike.%${b}%,artista_nombre.ilike.%${b}%,tecnica.ilike.%${b}%`)
  if (destacadas) q = q.order('orden_destacada', { ascending: true, nullsFirst: false })
  if (orden === 'precio_asc') q = q.order('precio', { ascending: true, nullsFirst: false })
  else if (orden === 'precio_desc') q = q.order('precio', { ascending: false, nullsFirst: false })
  else if (estado === 'vendida') q = q.order('vendida_en', { ascending: false, nullsFirst: false })
  q = q.order('created_at', { ascending: false })
  if (limite && origen === 'todas') q = q.limit(limite)
  const { data, error } = await q
  if (error) throw error
  const lista = (data || []).map(normalizarObra)
    .filter(o => origen === 'todas' || (origen === 'marketplace' ? esMarketplace(o) : !esMarketplace(o)))
  return limite ? lista.slice(0, limite) : lista
}

export async function obtenerObra(id) {
  const { data, error } = await supabase.from('fichas').select(CAMPOS).eq('id', id).maybeSingle()
  if (error) throw error
  return normalizarObra(data)
}

export async function listarCategorias() {
  const { data, error } = await supabase.from('categorias').select('*').order('nombre')
  if (error) throw error
  return data || []
}

export async function enviarConsulta(consulta) {
  const { error } = await supabase.from('consultas').insert({ ...consulta, estado: 'nueva' })
  if (error) throw error
}
