// Cartas con Amor · bitácora: describe en palabras cada registro de cca_auditoria
import { ESTADOS_CARTA, folioTexto } from './constantes.js'

const CAMPOS = { estado: 'estado', relacion: 'quién la envía', pareja_id: 'pareja', destinatario: 'destinatario', motivo: 'motivo',
  incidencia: 'incidencia', posible_duplicado: 'posible duplicado', orden: 'orden', equipo_id: 'responsable',
  nombre: 'nombre', telefono: 'teléfono', correo: 'correo', ultimo_recordatorio: 'mensaje', invitacion: 'invitación' }

export function describirActividad(a) {
  const d = a.datos || {}
  if (a.entidad === 'gestion') {
    const { tipo, texto } = describirGestion(d)
    const verbo = { Llamada: 'llamó a', Nota: 'anotó sobre' }[tipo]
    return `${verbo || `envió «${tipo}» a`} ${d.contacto || 'un contacto'}${texto ? `: ${texto}` : ''}`
  }
  if (a.entidad === 'equipo' && a.accion === 'entrada') return `entró con el enlace del Matrimonio ${d.matrimonio || ''}`.trim()
  if (a.entidad === 'equipo') return { insert: 'agregó un matrimonio al equipo', update: 'editó un matrimonio del equipo', delete: 'quitó un matrimonio del equipo' }[a.accion] || a.accion
  if (a.entidad === 'cartas') {
    if (a.accion === 'lectura') return 'abrió el contenido de una carta'
    if (a.accion === 'insert') return `${a.usuario_id ? 'registró' : 'llegó por enlace'} la carta ${folioTexto(d.folio)}${d.relacion ? ` (${d.relacion})` : ''}`
    if (a.accion === 'delete') return `eliminó la carta ${folioTexto(d.folio)}`
    if (d.estado) return `${ESTADOS_CARTA[d.estado.despues]?.etiqueta === 'Recibida' ? 'restauró' : 'marcó como ' + (ESTADOS_CARTA[d.estado.despues]?.etiqueta || '').toLowerCase()} una carta`
    return `corrigió ${Object.keys(d).map(k => CAMPOS[k] || k).join(', ')} de una carta`
  }
  if (a.entidad === 'remitentes') {
    if (d.ultimo_recordatorio) return 'envió el mensaje a un contacto de familia'
    if (d.estado?.despues === 'recibido') return 'un contacto de familia entregó cartas'
    return { insert: 'agregó un contacto de familia', update: `editó un contacto (${Object.keys(d).map(k => CAMPOS[k] || k).join(', ')})`, delete: 'quitó un contacto de familia' }[a.accion]
  }
  if (a.entidad === 'parejas') {
    if (d.equipo_id) return 'asignó el matrimonio responsable de una pareja'
    return { insert: `agregó la pareja ${d.codigo || ''}`, update: 'editó una pareja', delete: 'eliminó una pareja' }[a.accion]
  }
  if (a.entidad === 'impresion') return a.accion === 'pdf' ? 'generó el PDF de impresión' : a.accion === 'zip' ? 'descargó los originales' : a.accion
  if (a.entidad === 'retiros') return { insert: 'creó el retiro', update: 'editó el retiro' }[a.accion] || a.accion
  return `${a.accion} ${a.entidad}`
}

export const quien = (a, usuarios) => (a.usuario_id ? usuarios[a.usuario_id]?.nombre || 'Organizador' : 'Formulario público')

const TIPOS = { whatsapp: 'Mensaje por WhatsApp', correo: 'Correo', copiado: 'Mensaje copiado', llamada: 'Llamada', nota: 'Nota', otro: 'Gestión' }

// Tipo y texto visibles de una gestión (las guardadas como «otro» traen el tipo al inicio del texto)
export function describirGestion(g) {
  if (g.canal === 'otro' && /^(Llamada|Nota)\b/.test(g.mensaje || '')) {
    const [, tipo, resto] = g.mensaje.match(/^(Llamada|Nota):?\s*([\s\S]*)$/)
    return { tipo, texto: resto || '' }
  }
  if (g.canal === 'whatsapp') return { tipo: g.mensaje === 'Seguimiento' ? 'Seguimiento por WhatsApp' : g.mensaje === 'Enlace' ? 'Enlace por WhatsApp' : 'Bienvenida por WhatsApp', texto: '' }
  return { tipo: TIPOS[g.canal] || 'Gestión', texto: g.canal === 'llamada' || g.canal === 'nota' || g.canal === 'otro' ? g.mensaje || '' : '' }
}

// Las gestiones (mensajes, llamadas, notas) como movimientos de la bitácora
export const gestionesComoActividad = (gestiones, remitentes) => {
  const porId = Object.fromEntries(remitentes.map(r => [r.id, r]))
  return gestiones.map(g => ({ id: 'g-' + g.id, usuario_id: g.usuario_id, entidad: 'gestion', accion: g.canal, created_at: g.created_at,
    datos: { ...g, contacto: porId[g.remitente_id]?.nombre, pareja_id: porId[g.remitente_id]?.pareja_id } }))
}
// El cambio de «último mensaje» del contacto ya queda como gestión: no se repite en la bitácora
export const esMensajeRepetido = a => a.entidad === 'remitentes' && a.accion === 'update' && a.datos
  && Object.keys(a.datos).every(k => k === 'ultimo_recordatorio' || k === 'invitacion')
