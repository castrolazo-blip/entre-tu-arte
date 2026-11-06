// Cartas con Amor · textos, estados y utilidades compartidas por el portal y el panel.

export const BUCKET_CARTAS = 'cca-cartas'

export const ESTADOS_CARTA = {
  recibida:    { etiqueta: 'Recibida',          clase: 'bg-sky-100 text-sky-800' },
  en_revision: { etiqueta: 'En revisión',       clase: 'bg-amber-100 text-amber-800' },
  aprobada:    { etiqueta: 'Aprobada',          clase: 'bg-emerald-100 text-emerald-800' },
  lista:       { etiqueta: 'Lista para imprimir', clase: 'bg-teal-100 text-teal-800' },
  impresa:     { etiqueta: 'Impresa',           clase: 'bg-indigo-100 text-indigo-800' },
  entregada:   { etiqueta: 'Entregada',         clase: 'bg-vino text-white' },
  rechazada:   { etiqueta: 'Rechazada',         clase: 'bg-neutral-200 text-neutral-700 line-through' },
  duplicada:   { etiqueta: 'Duplicada',         clase: 'bg-neutral-200 text-neutral-700' },
}
// Orden del flujo normal; rechazada y duplicada requieren motivo
export const FLUJO = ['recibida', 'en_revision', 'aprobada', 'lista', 'impresa', 'entregada']
export const NO_VALIDAS = ['rechazada', 'duplicada']
export const APROBADAS = ['aprobada', 'lista', 'impresa', 'entregada']

export const ESTADOS_REMITENTE = {
  pendiente: { etiqueta: 'Pendiente',          clase: 'bg-amber-100 text-amber-800' },
  recibido:  { etiqueta: 'Recibido',           clase: 'bg-emerald-100 text-emerald-800' },
  exento:    { etiqueta: 'No enviará',         clase: 'bg-neutral-200 text-neutral-700' },
  revision:  { etiqueta: 'Requiere revisión',  clase: 'bg-rose-100 text-rose-800' },
}

export const ESTADOS_RETIRO = {
  preparacion: { etiqueta: 'En preparación', clase: 'bg-amber-100 text-amber-800' },
  activo:      { etiqueta: 'Activo',         clase: 'bg-emerald-100 text-emerald-800' },
  cerrado:     { etiqueta: 'Cerrado',        clase: 'bg-neutral-200 text-neutral-700' },
  archivado:   { etiqueta: 'Archivado',      clase: 'bg-neutral-200 text-neutral-500' },
}

export const TIPOS_ARCHIVO = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
}
export const EXTENSIONES = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
export const ACEPTA = '.pdf,.docx,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png,application/vnd.openxmlformats-officedocument.wordprocessingml.document'

// Errores de la base de datos (cca:...) traducidos para personas
const ERRORES = {
  no_disponible: 'Este enlace ya no está disponible. Consulta con quien te lo envió.',
  plazo_vencido: 'La fecha límite para enviar cartas ya pasó.',
  sin_consentimiento: 'Debes aceptar el aviso de privacidad para enviar tu carta.',
  pareja_invalida: 'Elige a quién va dirigida la carta.',
  destinatario_invalido: 'Elige a quién va dirigida la carta.',
  nombre_invalido: 'Escribe tu nombre (entre 2 y 120 letras).',
  dato_largo: 'La relación o el contacto son demasiado largos.',
  texto_largo: 'La carta es demasiado larga. Puedes adjuntarla como archivo.',
  carta_vacia: 'Escribe tu carta o adjunta un archivo.',
  demasiados_archivos: 'Adjuntaste demasiados archivos.',
  demasiados_envios: 'Se enviaron muchas cartas seguidas desde esta conexión. Espera unos minutos y vuelve a intentarlo.',
  archivo_invalido: 'Uno de los archivos no es válido.',
  archivo_no_encontrado: 'Uno de los archivos no terminó de subirse. Vuelve a intentarlo.',
  archivo_grande: 'Uno de los archivos supera el tamaño permitido.',
  tipo_no_permitido: 'Solo se aceptan archivos PDF, Word (DOCX), JPG o PNG.',
  archivo_repetido: 'Ese archivo ya se había enviado.',
}
export function mensajeError(error, porDefecto = 'No se pudo completar. Revisa tu conexión e inténtalo de nuevo.') {
  const texto = String(error?.message || error || '')
  const m = /cca:([a-z_]+)/.exec(texto)
  if (m && ERRORES[m[1]]) return ERRORES[m[1]]
  if (/timeout|Failed to fetch|NetworkError|network/i.test(texto)) return 'La conexión está lenta o se cortó. Inténtalo de nuevo.'
  if (texto && !/^(JWT|PGRST|new row violates)/.test(texto) && texto.length < 200 && !/cca:/.test(texto)) return texto
  return porDefecto
}

// ── Formato ──
export const folioTexto = f => (f ? 'CA-' + String(f).padStart(4, '0') : '')

export function fecha(iso, conHora = false) {
  if (!iso) return ''
  const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso)
  if (isNaN(d)) return ''
  return d.toLocaleString('es-SV', conHora
    ? { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }
    : { day: 'numeric', month: 'long', year: 'numeric' })
}

export function rangoFechas(inicio, fin) {
  if (!inicio) return ''
  if (!fin || fin === inicio) return fecha(inicio)
  const a = new Date(inicio + 'T12:00:00'), b = new Date(fin + 'T12:00:00')
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) {
    return `${a.getDate()} al ${b.getDate()} de ${b.toLocaleString('es-SV', { month: 'long' })} de ${b.getFullYear()}`
  }
  return `${fecha(inicio)} al ${fecha(fin)}`
}

export function tamanoTexto(bytes) {
  const n = Number(bytes) || 0
  if (n < 1024 * 1024) return Math.max(1, Math.round(n / 1024)) + ' KB'
  return (n / 1024 / 1024).toFixed(1) + ' MB'
}

// "A" → nombre de quien la recibe
export function nombreDestinatario(pareja, destinatario) {
  if (!pareja) return ''
  if (destinatario === 'A') return pareja.nombre_a
  if (destinatario === 'B') return pareja.nombre_b
  return `${pareja.nombre_a} y ${pareja.nombre_b}`
}
export const nombrePareja = p => (p ? `${p.nombre_a} y ${p.nombre_b}` : '')

// ── Enlaces del portal ──
const raiz = () => window.location.origin + import.meta.env.BASE_URL.replace(/\/$/, '')
export function enlacePortal(retiro, { pareja, remitente } = {}) {
  const q = new URLSearchParams({ c: retiro.codigo })
  if (remitente?.token) q.set('r', remitente.token)
  else if (pareja?.token) q.set('p', pareja.token)
  return `${raiz()}/cartas/enviar?${q}`
}

// ── Recordatorios ──
// Ojo: el mensaje es para familiares y amigos; las parejas no deben enterarse (es sorpresa).
export function mensajeRecordatorio({ retiro, pareja, remitente, enlace }) {
  const para = nombreDestinatario(pareja, remitente.destinatario)
  const plazo = retiro.fecha_limite ? ` Te pedimos enviarla a más tardar el ${fecha(retiro.fecha_limite)}.` : ''
  const nombre = (remitente.nombre || '').split(' ')[0]
  return `Hola ${nombre}, te saludamos del equipo de ${retiro.nombre}. ` +
    `${nombrePareja(pareja)} vivirán un encuentro matrimonial${retiro.inicio ? ` (${rangoFechas(retiro.inicio, retiro.fin)})` : ''} ` +
    `y queremos sorprenderles con cartas de las personas que más les quieren. ` +
    `¿Nos ayudas escribiendo una carta para ${para}? Es privada: solo la leerán ellos durante el retiro.` +
    `${plazo}\n\nEscríbela o súbela aquí: ${enlace}\n\nPor favor, no les comentes nada: es una sorpresa. ¡Gracias!`
}

// Teléfono de El Salvador por defecto (8 dígitos → +503)
export function telefonoWhatsApp(tel) {
  const d = String(tel || '').replace(/\D/g, '')
  if (!d) return ''
  return d.length === 8 ? '503' + d : d
}

export function semaforo({ retiro, cartasValidas, pendientes }) {
  const dias = retiro?.fecha_limite ? (new Date(retiro.fecha_limite) - Date.now()) / 86400000 : null
  const cerca = dias !== null && dias <= (retiro?.semaforo_dias ?? 5)
  // Rojo: sin ninguna carta y el plazo está cerca (o ya pasó). Amarillo: sin cartas o con pendientes.
  if (cartasValidas === 0) return cerca ? 'rojo' : 'amarillo'
  return pendientes > 0 ? 'amarillo' : 'verde'
}
export const COLOR_SEMAFORO = { rojo: 'bg-rose-500', amarillo: 'bg-amber-400', verde: 'bg-emerald-500' }
export const TEXTO_SEMAFORO = { rojo: 'Atención', amarillo: 'En seguimiento', verde: 'Al día' }
