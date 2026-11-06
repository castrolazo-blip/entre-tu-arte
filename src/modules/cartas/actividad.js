// Cartas con Amor · bitácora: describe en palabras cada registro de cca_auditoria
import { ESTADOS_CARTA, folioTexto } from './constantes.js'

const CAMPOS = { estado: 'estado', relacion: 'quién la envía', pareja_id: 'pareja', destinatario: 'destinatario', motivo: 'motivo',
  incidencia: 'incidencia', posible_duplicado: 'posible duplicado', orden: 'orden', equipo_id: 'responsable',
  nombre: 'nombre', telefono: 'teléfono', correo: 'correo', ultimo_recordatorio: 'mensaje', invitacion: 'invitación' }

export function describirActividad(a) {
  const d = a.datos || {}
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
