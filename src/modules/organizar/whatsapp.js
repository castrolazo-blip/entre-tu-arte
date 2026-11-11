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

// ── Status para compartir (en el grupo o para uno mismo) ─────────────────────
const lista = nombres => nombres.map(n => primerNombre(n)).join(', ')

export function textoStatus(ev, invitados) {
  const n = invitados.length
  if (ev.estado === 'votacion' || ev.estado === 'cerrada') {
    const si = invitados.filter(i => i.voto), no = invitados.filter(i => !i.voto)
    return `📊 *${ev.titulo}* · votación\n${si.length} de ${n} ya votaron` +
      (si.length ? `\n✅ Votaron: ${lista(si.map(i => i.nombre))}` : '') +
      (no.length ? `\n⏳ Faltan: ${lista(no.map(i => i.nombre))}` : '\n🎉 ¡Ya votaron todos!')
  }
  if (ev.estado === 'confirmado') return `📅 *${ev.titulo}* quedó confirmado: ${fechaLarga(ev.fecha_elegida, { mayus: false })}, ${horario(ev).toLowerCase()}.`
  const si = invitados.filter(i => i.respondio_en), no = invitados.filter(i => !i.respondio_en)
  return `📊 *${ev.titulo}*\n${si.length} de ${n} ya marcaron sus fechas` +
    (si.length ? `\n✅ Listos: ${lista(si.map(i => i.nombre))}` : '') +
    (no.length ? `\n⏳ Faltan: ${lista(no.map(i => i.nombre))}` : '\n🎉 ¡Ya respondieron todos!') +
    (ev.fecha_limite ? `\n⏰ Plazo: ${fechaLarga(ev.fecha_limite, { mayus: false })}` : '')
}

export function textoStatusGeneral(eventos) {
  const lineas = eventos.map(e => {
    if (e.estado === 'votacion' || e.estado === 'cerrada') {
      return `🗳️ *${e.titulo}*: ${e.votaron}/${e.invitados} votaron${e.sin_voto?.length ? ` · faltan ${lista(e.sin_voto)}` : ' ✅'}`
    }
    if (e.estado === 'confirmado') return `📅 *${e.titulo}*: confirmado para el ${fechaLarga(e.fecha_elegida, { mayus: false })}`
    return `📝 *${e.titulo}*: ${e.respondieron}/${e.invitados} respondieron${e.pendientes?.length ? ` · faltan ${lista(e.pendientes)}` : ' ✅'}`
  })
  return `📊 *Status de Si nos organizamos!*\n\n${lineas.join('\n')}`
}

// ── Amigo secreto ────────────────────────────────────────────────────────────
const detallesSorteo = s => [s.monto ? `💵 Monto: ${s.monto}` : '', s.fecha_intercambio ? `📅 Intercambio: ${fechaLarga(s.fecha_intercambio, { mayus: false })}` : '']
  .filter(Boolean).join('\n')

export function msgSorteoInvitacion(nombre, s, url) {
  const d = detallesSorteo(s)
  return `Hola ${primerNombre(nombre)} 🎁 En *${s.titulo.replace(/^Amigo secreto · /, '')}* vamos a hacer amigo secreto.${d ? `\n${d}` : ''}\n\nEn tu enlace privado escribí tu lista de deseos (la verá solo quien te regale). Cuando hagamos el sorteo te aviso:\n${url}` + firma
}

export function msgSorteoListo(nombre, s, url) {
  const d = detallesSorteo(s)
  return `Hola ${primerNombre(nombre)} 🎁 ¡Ya se hizo el sorteo de *${s.titulo}*!${d ? `\n${d}` : ''}\n\nAbrí tu enlace privado y tocá «Descubrir» para ver a quién te tocó. Nadie más lo ve, ni el organizador. 🤫\n${url}` + firma
}

export function textoStatusSorteo(s, participantes) {
  if (s.estado !== 'sorteado') return `🎁 *${s.titulo}*: ${participantes.length} participantes, el sorteo todavía no se ha hecho.`
  const si = participantes.filter(p => p.visto_en), no = participantes.filter(p => !p.visto_en)
  return `🎁 *${s.titulo}*\n${si.length} de ${participantes.length} ya vieron a quién les tocó` +
    (si.length ? `\n✅ Ya vieron: ${lista(si.map(p => p.nombre))}` : '') +
    (no.length ? `\n⏳ Faltan: ${lista(no.map(p => p.nombre))}` : '\n🎉 ¡Ya lo vieron todos!')
}

// ── Encargados ───────────────────────────────────────────────────────────────
export const SUGERIDOS = ['🍽️ Comida', '🎂 Pastel', '🥩 Carne', '🍚 Arroz', '🥗 Ensalada', '🥖 Pan', '🍿 Boquitas', '🍰 Postre',
  '🥤 Bebidas', '🧊 Hielo', '🍷 Vino', '🍺 Cerveza', '🥤 Vasos y platos', '🪑 Mesas', '🪑 Sillas', '🏠 Casa / lugar', '🧹 Limpieza', '🎵 Música']

// Cosas que suelen llevar varias personas: se agregan como «sin límite»
export const SUGERIDOS_VARIOS = ['🍿 Boquitas', '🍰 Postre', '🥤 Bebidas', '🍷 Vino', '🍺 Cerveza']

// cupos: 1 = una persona · N = hasta N · null = sin límite
export const encargoCubierto = i => (i.cupos == null ? i.nombres.length > 0 : i.nombres.length >= i.cupos)
export const textoCupos = c => (c == null ? 'varios, sin límite' : c === 1 ? '1 persona' : `hasta ${c} personas`)

// items: [{ nombre, detalle, cupos, nombres: ['Laura', …] }]
export function textoEncargos(ev, items) {
  const cubiertos = items.filter(encargoCubierto).length
  const lineas = items.map(i => {
    const quien = i.nombres.length ? lista(i.nombres) : ''
    const det = i.detalle ? ` (${i.detalle})` : ''
    if (i.cupos == null) return `• ${i.nombre}${det} · pueden ser varios: ${quien || '⏳ nadie todavía'}`
    const falta = i.cupos - i.nombres.length
    return `• ${i.nombre}${det}: ${quien}${falta > 0 ? `${quien ? ' + ' : ''}⏳ ${falta === 1 && !quien ? 'falta' : `falta${falta > 1 ? 'n' : ''} ${falta}`}` : ' ✅'}`
  })
  return `🧾 *${ev.titulo}* · quién lleva qué\n${cubiertos} de ${items.length} cubiertos\n\n${lineas.join('\n')}\n\nPara apuntarte, abrí tu enlace del evento y tocá «Yo lo llevo».` + firma
}
