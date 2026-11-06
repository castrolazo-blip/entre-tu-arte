// Aviso a Telegram cuando un cliente envía algo (función "entre-tu-arte-aviso").
// Nunca bloquea ni hace fallar el envío del cliente: si el aviso falla, la consulta igual queda en el panel.
export const FUNCION_AVISO_URL = 'https://ivvjbuhppuwpgefwqpuz.supabase.co/functions/v1/entre-tu-arte-aviso'

export function avisar({ tipo, nombre, detalle, lineas }) {
  try {
    fetch(FUNCION_AVISO_URL, {
      method: 'POST', keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo, nombre, detalle, lineas }),
    }).catch(() => {})
  } catch { /* sin conexión */ }
}

// Prueba desde el panel. Devuelve { ok, falta: 'token' | 'chat', chat, error }
export async function probarAviso() {
  const res = await fetch(FUNCION_AVISO_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prueba: true }) })
  return res.json().catch(() => ({ ok: false, error: `Error ${res.status}` }))
}
