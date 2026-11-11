// Fechas como texto 'AAAA-MM-DD' (sin zona horaria) y horas 'HH:MM'.
export const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
export const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
export const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

const dos = n => String(n).padStart(2, '0')
export const aFecha = s => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d) }
export const aTexto = d => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`
export const hoyTexto = () => aTexto(new Date())
export const sumarDias = (s, n) => { const d = aFecha(s); d.setDate(d.getDate() + n); return aTexto(d) }
export const diaSemana = s => aFecha(s).getDay()
const mayuscula = t => t.charAt(0).toUpperCase() + t.slice(1)

// «viernes 4 de diciembre» (con año si no es el actual)
export function fechaLarga(s, { mayus = true, anio } = {}) {
  const d = aFecha(s)
  const conAnio = anio ?? d.getFullYear() !== new Date().getFullYear()
  const t = `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}${conAnio ? ` de ${d.getFullYear()}` : ''}`
  return mayus ? mayuscula(t) : t
}
export const fechaCorta = s => { const d = aFecha(s); return `${mayuscula(DIAS_CORTOS[d.getDay()])} ${d.getDate()} ${MESES_CORTOS[d.getMonth()]}` }

// Todas las fechas posibles de un evento (período + días permitidos)
export function fechasEvento(ev) {
  const lista = []
  if (!ev?.desde || !ev?.hasta) return lista
  const fin = aFecha(ev.hasta)
  for (let d = aFecha(ev.desde); d <= fin && lista.length < 400; d.setDate(d.getDate() + 1)) {
    if ((ev.dias || []).map(Number).includes(d.getDay())) lista.push(aTexto(d))
  }
  return lista
}

export const aMinutos = h => { if (!h) return null; const [a, b] = String(h).split(':').map(Number); return a * 60 + (b || 0) }
export const hhmm = h => (h ? String(h).slice(0, 5) : null)

export function hora12(h) {
  const m = aMinutos(h); if (m == null) return ''
  const hh = Math.floor(m / 60), mm = m % 60
  return `${((hh + 11) % 12) + 1}:${dos(mm)} ${hh < 12 ? 'a. m.' : 'p. m.'}`
}

export function horario(ev) {
  const ini = hhmm(ev?.hora_inicio), fin = hhmm(ev?.hora_fin)
  if (!ini) return ''
  return fin ? `De ${hora12(ini)} a ${hora12(fin)}` : `${hora12(ini)} en adelante`
}

export function diasTexto(dias = []) {
  const s = [...new Set(dias.map(Number))].sort((a, b) => a - b)
  const clave = s.join(',')
  if (s.length === 7) return 'Todos los días'
  if (clave === '1,2,3,4,5') return 'Lunes a viernes'
  if (clave === '0,6') return 'Sábados y domingos'
  if (clave === '1,2,3,4,5,6') return 'Lunes a sábado'
  if (clave === '5,6') return 'Viernes y sábados'
  const orden = [...s.filter(d => d !== 0), ...s.filter(d => d === 0)].map(d => DIAS[d])
  const t = orden.length > 1 ? `${orden.slice(0, -1).join(', ')} y ${orden.at(-1)}` : orden[0] || ''
  return mayuscula(t)
}

// «Del 1 al 19 de diciembre» · «Del 28 de noviembre al 5 de diciembre»
export function periodo(desde, hasta) {
  if (!desde || !hasta) return ''
  const a = aFecha(desde), b = aFecha(hasta)
  const anio = b.getFullYear() !== new Date().getFullYear() || a.getFullYear() !== b.getFullYear()
  if (desde === hasta) return fechaLarga(desde)
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) {
    return `Del ${a.getDate()} al ${b.getDate()} de ${MESES[b.getMonth()]}${anio ? ` de ${b.getFullYear()}` : ''}`
  }
  return `Del ${a.getDate()} de ${MESES[a.getMonth()]}${a.getFullYear() !== b.getFullYear() ? ` de ${a.getFullYear()}` : ''} al ${b.getDate()} de ${MESES[b.getMonth()]}${anio ? ` de ${b.getFullYear()}` : ''}`
}

// ¿Un bloqueo choca con el horario del evento? (misma regla que la base de datos)
export function choca(b, ev) {
  const bDesde = aMinutos(b.desde) ?? 0, bHasta = aMinutos(b.hasta) ?? 24 * 60
  const eIni = aMinutos(ev.hora_inicio) ?? 0, eFin = aMinutos(ev.hora_fin) ?? 24 * 60
  return bDesde < eFin && bHasta > eIni
}

export function textoBloqueo(b) {
  if (!b.desde && !b.hasta) return 'Todo el día'
  if (b.desde && !b.hasta) return `Desde ${hora12(b.desde)}`
  if (!b.desde && b.hasta) return `Hasta ${hora12(b.hasta)}`
  return `${hora12(b.desde)} a ${hora12(b.hasta)}`
}

// ── Agregar a calendario ─────────────────────────────────────────────────────
function inicioFin(ev, fecha) {
  const base = fecha.replace(/-/g, '')
  const ini = aMinutos(ev.hora_inicio) ?? 19 * 60
  const fin = aMinutos(ev.hora_fin) ?? Math.min(ini + 180, 23 * 60 + 59)
  const t = m => `${dos(Math.floor(m / 60))}${dos(m % 60)}00`
  return [`${base}T${t(ini)}`, `${base}T${t(fin)}`]
}

export function enlaceGoogle(ev, fecha) {
  const [a, b] = inicioFin(ev, fecha)
  const p = new URLSearchParams({ action: 'TEMPLATE', text: ev.titulo, dates: `${a}/${b}`, ctz: 'America/El_Salvador' })
  if (ev.lugar) p.set('location', ev.lugar)
  if (ev.descripcion) p.set('details', ev.descripcion)
  return `https://calendar.google.com/calendar/render?${p}`
}

export function descargarIcs(ev, fecha) {
  const [a, b] = inicioFin(ev, fecha)
  const esc = t => String(t || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n')
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Si nos organizamos//ES', 'BEGIN:VEVENT',
    `UID:${ev.id}-${fecha}@sinosorganizamos`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
    `DTSTART;TZID=America/El_Salvador:${a}`, `DTEND;TZID=America/El_Salvador:${b}`,
    `SUMMARY:${esc(ev.titulo)}`, ev.lugar ? `LOCATION:${esc(ev.lugar)}` : '', ev.descripcion ? `DESCRIPTION:${esc(ev.descripcion)}` : '',
    'END:VEVENT', 'END:VCALENDAR'].filter(Boolean).join('\r\n')
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }))
  const a2 = document.createElement('a')
  a2.href = url; a2.download = `${ev.titulo.replace(/[^\p{L}\p{N} ]/gu, '').trim() || 'evento'}.ics`
  document.body.appendChild(a2); a2.click(); a2.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

// «hace 5 min», «hace 2 h», «ayer», «hace 3 días»
export function hace(ts) {
  if (!ts) return ''
  const min = Math.max(0, Math.round((Date.now() - new Date(ts).getTime()) / 60000))
  if (min < 1) return 'ahora'
  if (min < 60) return `hace ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.round(h / 24)
  return d === 1 ? 'ayer' : `hace ${d} días`
}
