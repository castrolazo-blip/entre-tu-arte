import { periodo, diasTexto, horario, fechaLarga, aFecha } from './fechas.js'

// Teléfono para wa.me: solo dígitos; 8 dígitos = El Salvador (503)
export function telWa(tel) {
  const n = String(tel || '').replace(/\D/g, '')
  if (!n) return ''
  return n.length === 8 ? `503${n}` : n
}

export const enlacePersonal = (token, eventoId) =>
  `${window.location.origin}${import.meta.env.BASE_URL}organizar/mi?c=${token}${eventoId ? `&e=${eventoId}` : ''}`

export const urlWhatsApp = (tel, texto) => `https://wa.me/${telWa(tel)}?text=${encodeURIComponent(texto)}`

const primerNombre = n => String(n || '').trim().split(/\s+/)[0] || ''
const firma = '\n\n_Si nos organizamos!_'
const limite = ev => (ev.fecha_limite ? `\n\n⏰ Por favor marcalo antes del *${fechaLarga(ev.fecha_limite, { mayus: false })}*.` : '')

export function msgInvitacion(nombre, ev, url) {
  return `Hola ${primerNombre(nombre)} 👋\n\nEstamos organizando *${ev.titulo}*.\n📅 ${periodo(ev.desde, ev.hasta)} · ${diasTexto(ev.dias)}\n🕖 ${horario(ev)}` +
    `\n\nEn tu enlace privado marcá solo los días que *NO podés*. Nadie más ve tu calendario:\n${url}` + limite(ev) + firma
}

export function msgRecordatorio(nombre, ev, url) {
  return `Hola ${primerNombre(nombre)} 🙌 Solo faltás vos para encontrar la fecha de *${ev.titulo}*.\n\nTe toma 1 minuto: marcá los días que no podés (o confirmá que podés todos):\n${url}` + limite(ev) + firma
}

export function msgVotacion(nombre, ev, url) {
  return `Hola ${primerNombre(nombre)} 🗳️ Ya tenemos las fechas en que más pueden para *${ev.titulo}*.\n\nVotá por tu favorita aquí:\n${url}` + firma
}

export function msgConfirmado(nombre, ev, url) {
  const d = aFecha(ev.fecha_elegida)
  return `Hola ${primerNombre(nombre)} 🎉 ¡Quedó confirmado!\n\n*${ev.titulo}*\n📅 ${fechaLarga(ev.fecha_elegida, { anio: d.getFullYear() !== new Date().getFullYear() })}\n🕖 ${horario(ev)}` +
    (ev.lugar ? `\n📍 ${ev.lugar}` : '') + `\n\nAgregalo a tu calendario desde aquí:\n${url}` + firma
}

export function msgEnlaceGeneral(nombre, url) {
  return `Hola ${primerNombre(nombre)} 👋 Este es tu enlace privado de *Si nos organizamos!*\n\nAhí vas a ver los eventos a los que te invitemos, marcar los días que no podés y votar por la fecha. No necesitás cuenta ni contraseña; guardalo y no lo compartás:\n${url}` + firma
}

// Mensajes según el momento del evento y si la persona ya respondió (el primero es el principal)
export function mensajesPara(inv, ev, url) {
  if (ev.estado === 'confirmado') return [{ texto: msgConfirmado(inv.nombre, ev, url), etiqueta: 'Avisar fecha' }]
  if (ev.estado === 'votacion') return [{ texto: msgVotacion(inv.nombre, ev, url), etiqueta: inv.voto ? 'Reenviar' : 'Pedir voto' }]
  if (ev.estado === 'disponibilidad' && !inv.respondio_en) return [
    { texto: msgInvitacion(inv.nombre, ev, url), etiqueta: 'Invitar' },
    { texto: msgRecordatorio(inv.nombre, ev, url), etiqueta: 'Recordar' },
  ]
  return [{ texto: msgInvitacion(inv.nombre, ev, url), etiqueta: 'Reenviar' }]
}
