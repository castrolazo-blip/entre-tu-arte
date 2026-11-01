// Cliente de la función "entre-tu-arte-obra" (vive en el proyecto de Supabase donde está la clave
// de Anthropic). Recibe los enlaces de hasta 3 fotos y genera en segundo plano: nombre,
// descripción, estilo, técnica, espacios, texto para redes, hashtags y encuadres.
export const FUNCION_IA_URL = 'https://ivvjbuhppuwpgefwqpuz.supabase.co/functions/v1/entre-tu-arte-obra'

const CLAVE_LOCAL = 'eta_clave_ia'

export function leerClaveIA() { try { return localStorage.getItem(CLAVE_LOCAL) || '' } catch { return '' } }
export function guardarClaveIA(v) { try { v ? localStorage.setItem(CLAVE_LOCAL, v) : localStorage.removeItem(CLAVE_LOCAL) } catch { /* modo privado */ } }

export async function iniciarTrabajoIA({ urls, notas, clave }) {
  const res = await fetch(FUNCION_IA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-eta-clave': clave },
    body: JSON.stringify({ urls, notas }),
  })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401) guardarClaveIA('')
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`)
  return data.id
}

// Espera el resultado consultando cada 5 s. Tolera cortes de red (el trabajo sigue en el servidor).
export async function esperarTrabajoIA(id, clave, { onAviso, cancelado } = {}) {
  for (;;) {
    await new Promise(r => setTimeout(r, 5000))
    if (cancelado?.()) return null
    let data
    try {
      const res = await fetch(`${FUNCION_IA_URL}?id=${encodeURIComponent(id)}`, { headers: { 'x-eta-clave': clave } })
      data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`)
    } catch (err) {
      if (err instanceof TypeError) { onAviso?.('Sin conexión, reintentando…'); continue }
      throw err
    }
    if (data.estado === 'pendiente' && Date.now() - new Date(data.creado).getTime() > 10 * 60 * 1000)
      throw new Error('La IA tardó demasiado. Vuelve a intentarlo.')
    if (data.estado === 'error') throw new Error(data.error || 'La IA no pudo generar la ficha.')
    if (data.estado === 'listo') return data.resultado || {}
  }
}
