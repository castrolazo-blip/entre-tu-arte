// Aviso por Telegram cuando entra una consulta o una solicitud del Marketplace en entretuarte.com.
// Vive en el mismo proyecto que la función de IA. Secretos (se ponen en Supabase > Edge Functions > Secrets):
//   ETA_TELEGRAM_TOKEN  token del bot (lo da @BotFather)
//   ETA_TELEGRAM_CHAT   tu número de chat (si falta, la prueba del panel te lo muestra)
// El mensaje es corto a propósito: sin teléfono ni datos del cliente; el detalle se ve en el panel.

const ORIGENES = ['https://entretuarte.com', 'https://www.entretuarte.com', 'https://castrolazo-blip.github.io', 'http://localhost:5173', 'http://localhost:4173']
const PANEL = 'https://entretuarte.com/admin'
const TIPOS: Record<string, [string, string]> = {
  asesoria: ['🖼️ Nueva consulta de Asesoría', '/consultas'],
  encargo: ['🎨 Nuevo encargo', '/consultas'],
  compra: ['🛒 Nuevo pedido', '/consultas'],
  reserva: ['📌 Nueva reserva', '/consultas'],
  consulta: ['💬 Nueva consulta', '/consultas'],
  marketplace: ['🏷️ Nueva solicitud del Marketplace', '/marketplace'],
}

// Límite simple contra abuso: máximo 40 avisos por hora en cada instancia
let ventana = Date.now(), enviados = 0

function cors(origen: string | null) {
  return {
    'Access-Control-Allow-Origin': origen && ORIGENES.includes(origen) ? origen : ORIGENES[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    'Content-Type': 'application/json',
  }
}

const limpiar = (t: unknown, n: number) => String(t ?? '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, n)
// "Tomás Alejandro Figueroa Martínez" -> "Tomás F." · "Ana López" -> "Ana L."
function nombreCorto(n: string) {
  const p = limpiar(n, 80).split(' ').filter(Boolean)
  if (!p.length) return 'Cliente'
  return p.length > 1 ? `${p[0]} ${p[p.length > 3 ? 2 : 1][0]}.` : p[0]
}

Deno.serve(async req => {
  const origen = req.headers.get('origin')
  const h = cors(origen)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: h })
  if (req.method !== 'POST' || !origen || !ORIGENES.includes(origen)) return new Response(JSON.stringify({ error: 'No permitido' }), { status: 403, headers: h })

  const token = Deno.env.get('ETA_TELEGRAM_TOKEN')
  const chat = Deno.env.get('ETA_TELEGRAM_CHAT')
  if (!token) return new Response(JSON.stringify({ ok: false, falta: 'token' }), { headers: h })

  const cuerpo = await req.json().catch(() => ({}))
  const api = `https://api.telegram.org/bot${token}`

  // Prueba desde el panel: si aún no hay número de chat, se busca en el último mensaje que recibió el bot
  if (cuerpo.prueba && !chat) {
    const r = await fetch(`${api}/getUpdates`).then(x => x.json()).catch(() => null)
    const ultimo = r?.result?.filter((u: any) => u.message?.chat?.id).pop()
    return new Response(JSON.stringify({ ok: false, falta: 'chat', chat: ultimo?.message?.chat?.id ?? null }), { headers: h })
  }
  if (!chat) return new Response(JSON.stringify({ ok: false, falta: 'chat' }), { headers: h })

  if (Date.now() - ventana > 3600_000) { ventana = Date.now(); enviados = 0 }
  if (++enviados > 40) return new Response(JSON.stringify({ ok: false, error: 'Demasiados avisos' }), { status: 429, headers: h })

  let texto: string
  if (cuerpo.prueba) texto = '✅ ¡Listo! Los avisos de Entre tu Arte llegan a este chat.'
  else {
    const [titulo, ruta] = TIPOS[limpiar(cuerpo.tipo, 20)] || TIPOS.consulta
    const detalle = limpiar(cuerpo.detalle, 120)
    texto = `${titulo}\n${nombreCorto(cuerpo.nombre)}${detalle ? ' — ' + detalle : ''}\n\nVer en el panel: ${PANEL}${ruta}`
  }

  const r = await fetch(`${api}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text: texto, disable_web_page_preview: true }),
  }).then(x => x.json()).catch(e => ({ ok: false, description: String(e) }))
  return new Response(JSON.stringify({ ok: !!r.ok, error: r.ok ? undefined : r.description }), { headers: h })
})
