// Cartas con Amor · textos, estados y utilidades compartidas por el portal y el panel.

export const BUCKET_CARTAS = 'cca-cartas'

// El control llega hasta «recibida»: las cartas no se leen ni se aprueban, y todas se entregan en el retiro.
// Solo existen dos salidas por error: anulada (spam, carta equivocada) o duplicada, siempre con motivo.
// (La base acepta estados antiguos; aquí cualquier estado válido se muestra como «Recibida».)
const RECIBIDA = { etiqueta: 'Recibida', clase: 'bg-emerald-100 text-emerald-800' }
export const ESTADOS_CARTA = {
  recibida: RECIBIDA, en_revision: RECIBIDA, aprobada: RECIBIDA, lista: RECIBIDA, impresa: RECIBIDA, entregada: RECIBIDA,
  rechazada: { etiqueta: 'Anulada', clase: 'bg-neutral-200 text-neutral-700 line-through' },
  duplicada: { etiqueta: 'Duplicada', clase: 'bg-neutral-200 text-neutral-700' },
}
export const NO_VALIDAS = ['rechazada', 'duplicada']
export const esValida = c => !NO_VALIDAS.includes(c.estado)

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
  // Los errores técnicos (en inglés, de la base o del servidor) nunca se muestran tal cual
  const tecnico = /^(JWT|PGRST)|schema cache|Could not find|function|relation|permission denied|violates|duplicate key|column|syntax|null value|invalid input|cca:/i
  if (texto && !tecnico.test(texto) && texto.length < 200) return texto
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

// Nombres: apodo ("le gusta que le digan") para el trato, nombre completo para identificar
// (hay participantes con el mismo nombre).
export const apodo = (p, d) => (d === 'A' ? (p.apodo_a || p.nombre_a) : (p.apodo_b || p.nombre_b))
export function nombreCompleto(p, d) {
  if (!p) return ''
  return d === 'A' ? [p.nombre_a, p.apellidos_a].filter(Boolean).join(' ') : [p.nombre_b, p.apellidos_b].filter(Boolean).join(' ')
}
// "A" → nombre de quien la recibe
export function nombreDestinatario(pareja, destinatario) {
  if (!pareja) return ''
  if (destinatario === 'A' || destinatario === 'B') return apodo(pareja, destinatario)
  return `${apodo(pareja, 'A')} y ${apodo(pareja, 'B')}`
}
export const nombrePareja = p => (p ? `${apodo(p, 'A')} y ${apodo(p, 'B')}${p.apellidos ? ' ' + p.apellidos : ''}` : '')
// Equipo de servidores
export const nombreEquipo = e => (e ? `Matrimonio ${e.apellidos}` : '')
// Para el mensaje a las familias: "el matrimonio Castro Lazo (Ronald 7000-0000 · Ana 7000-0001)"
export function contactoEquipo(e) {
  if (!e) return ''
  const personas = [[e.esposo_nombre, e.esposo_telefono], [e.esposa_nombre, e.esposa_telefono]]
    .filter(([n]) => n).map(([n, t]) => `${n.split(' ')[0]}${t ? ' ' + t : ''}`)
  return `el matrimonio ${e.apellidos}${personas.length ? ` (${personas.join(' · ')})` : ''}`
}
// Responsable de una pareja: el matrimonio del equipo asignado o el texto del Excel
export const responsableDe = (p, equipo = []) => nombreEquipo(equipo.find(e => e.id === p?.equipo_id)) || p?.responsable || ''
// Clasificación de quién envía la carta (se elige al subirla o registrarla)
export const RELACIONES = ['Papá', 'Mamá', 'Hijo', 'Hija', 'Hermano', 'Hermana', 'Abuelo', 'Abuela', 'Nieto', 'Nieta',
  'Tío', 'Tía', 'Primo', 'Prima', 'Sobrino', 'Sobrina', 'Suegro', 'Suegra', 'Cuñado', 'Cuñada',
  'Padrino', 'Madrina', 'Ahijado', 'Ahijada', 'Amigo', 'Amiga', 'Compañero de trabajo', 'Sacerdote / religioso']
// Relaciones en grupo (p. ej. «Papás», «Hijos») cuando la carta la firman varios
export const RELACIONES_GRUPO = ['Papás', 'Hijos', 'Hermanos', 'Abuelos', 'Tíos', 'Suegros', 'Amigos', 'Familia']
export const ORIGENES = { digital: 'Digital (formulario)', fisica: 'En papel', correo: 'Por correo' }

// ── Enlaces del portal ──
const raiz = () => window.location.origin + import.meta.env.BASE_URL.replace(/\/$/, '')
export function enlacePortal(retiro, { pareja, remitente } = {}) {
  const q = new URLSearchParams({ c: retiro.codigo })
  if (remitente?.token) q.set('r', remitente.token)
  else if (pareja?.token) q.set('p', pareja.token)
  return `${raiz()}/cartas/enviar?${q}`
}

// ── Recordatorios ──
// Mensaje para los contactos de la familia (coordinadores). Editable por retiro (Retiros › Editar).
// Variables: {nombre} {pareja} {responsable} {meta} {fecha_limite} {enlace}
export const PLANTILLA_FAMILIAS = `¡Venga Tu Reino!

Estimados Familiares:
Esperamos que se encuentren bien. Nos dirigimos a ustedes pues *{pareja}* participarán en el próximo retiro *Renova 02* para matrimonios, el cual se realizará los días *27, 28 y 29 de noviembre.* Como parte muy importante de las actividades SORPRESA necesitamos pedirles su ayuda, para que por favor escriban unas cartas a *{pareja}* que servirán de apoyo en un momento crucial del retiro.

⚠️ *INFORMACIÓN IMPORTANTE SOBRE LA ENTREGA LAS CARTAS:* ⚠️
Para garantizar que todas las cartas sean entregadas correctamente les pedimos:
1. Identificar *cada carta* con el *nombre y apellido completo del matrimonio y quién le envía la carta* (ej. Para: Alberto y Katia López, De: hermano, padres, amigos, etc// _Solemos tener participantes con los mismos nombres, por lo que identificar correctamente las cartas es *muy* importante._)
2. Recolectar todas las cartas y *entregarnos el paquete completo.*
3. *Solo se recibirán cartas*, por favor no enviar regalos, globos, comida, peluches, etc. (Estos pueden llevarlos el día Domingo en la misa de cierre si así lo desean)
4. Les pedimos su ayuda para que los participantes *NO SEPAN QUE EXISTEN ESTAS CARTAS.* será de gran sorpresa para ellos recibirlas.
5. Lo ideal es que cada participante reciba *_al menos {meta} cartas_*, por lo que se pide que involucren a otros familiares y amigos o personas que hayan sido una influencia importante en su vida.

*LUGAR Y HORARIOS DE ENTREGA:*
Pueden hacer la entrega de cartas con {responsable}
- 📍 *Lugar:* Colegio Highlands ubicado en Carretera a Santa Tecla y pje privado
- ⏱️ *Horarios:* Lunes a viernes: 9 am - 2:30 pm
- 🗓️ *La FECHA LÍMITE* para la entrega de cartas será el *{fecha_limite}*

📲 *POR ESTE ENLACE:* 📲
También pueden escribir la carta o subir una foto o escaneo aquí (una carta a la vez). Es privado y solo llegará a *{pareja}*:
{enlace}

📩 *CORREO ELECTRÓNICO:* 📩
Sí tienen familiares / amigos cercanos en el extranjero pueden enviar sus cartas por correo electrónico a: *cartasrenova@gmail.com*

Es muy importante colocar en el SUBJECT / ASUNTO el *nombre y apellido completo del matrimonio y quién envía la carta.* Si desean y se les facilita pueden escribirla a mano, escanearla y enviarla al correo, nosotros nos encargamos de imprimirla. Le reiteramos que todas las cartas son _totalmente confidenciales, nadie las leerá, se imprimen y se meten al sobre correspondiente._

*CONTACTOS DE APOYO:*
Candy Castro
+503 7877 5465
Cecy Compte
+503 7870 0724
Kandy de Duque
+503 7988 7974

Agradecemos de antemano su apoyo, quedamos a sus órdenes para resolver cualquier duda.

Atentamente,
Equipo Cartas RENOVA by Regnum Christi`

export function fechaLarga(iso) {
  if (!iso) return 'la fecha indicada'
  return new Date(iso).toLocaleDateString('es-SV', { weekday: 'long', day: 'numeric', month: 'long' }).replace(',', '')
}

export function mensajeFamilias({ retiro, pareja, remitente, enlace, responsable }) {
  const plantilla = retiro.plantilla_mensaje?.trim() || PLANTILLA_FAMILIAS
  const valores = {
    nombre: (remitente?.nombre || '').split(' ')[0], pareja: nombrePareja(pareja),
    responsable: responsable || pareja.responsable || 'el equipo de cartas', meta: retiro.meta_por_persona || 10,
    fecha_limite: fechaLarga(retiro.fecha_limite), enlace,
  }
  return plantilla.replace(/\{(nombre|pareja|responsable|meta|fecha_limite|enlace)\}/g, (_, k) => valores[k])
}

// Ojo: el mensaje es para familiares y amigos; las parejas no deben enterarse (es sorpresa).
export function mensajeRecordatorio({ retiro, pareja, remitente, enlace, responsable }) {
  if (remitente.coordinador) return mensajeFamilias({ retiro, pareja, remitente, enlace, responsable })
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

// Con meta (p. ej. 10 por persona): verde = ambos la alcanzaron; rojo = plazo cerca y
// alguno no llega a la mitad; amarillo = en camino. Sin meta: según cartas y pendientes.
export function semaforo({ retiro, cartasValidas, pendientes, x }) {
  const dias = retiro?.fecha_limite ? (new Date(retiro.fecha_limite) - Date.now()) / 86400000 : null
  const cerca = dias !== null && dias <= (retiro?.semaforo_dias ?? 5)
  const meta = retiro?.meta_por_persona || 0
  if (meta && x) {
    if (x.faltanA === 0 && x.faltanB === 0) return 'verde'
    return cerca && Math.min(x.paraA, x.paraB) < meta / 2 ? 'rojo' : 'amarillo'
  }
  // Rojo: sin ninguna carta y el plazo está cerca (o ya pasó). Amarillo: sin cartas o con pendientes.
  if (cartasValidas === 0) return cerca ? 'rojo' : 'amarillo'
  return pendientes > 0 ? 'amarillo' : 'verde'
}
export const COLOR_SEMAFORO = { rojo: 'bg-rose-500', amarillo: 'bg-amber-400', verde: 'bg-emerald-500' }
export const TEXTO_SEMAFORO = { rojo: 'Atención', amarillo: 'En seguimiento', verde: 'Al día' }
