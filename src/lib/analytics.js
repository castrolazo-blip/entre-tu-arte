import { supabase } from './supabase.js'

// Registra visitas y clics importantes (tabla "analytics", la misma del sitio anterior).
// Además del evento guarda, de forma anónima: un identificador aleatorio del navegador
// (para contar visitantes únicos), de dónde llegó la visita y el tipo de dispositivo.
// No se registran las visitas de quien tiene sesión abierta en el panel.
// Nunca debe interrumpir la navegación: cualquier error se ignora.

const seguro = (f, alterno = null) => { try { return f() } catch { return alterno } }

function visitante() {
  return seguro(() => {
    let id = localStorage.getItem('eta_visitante')
    if (!id) { id = (crypto.randomUUID?.() || String(Math.random()).slice(2) + Date.now()); localStorage.setItem('eta_visitante', id) }
    return id
  })
}

// De dónde llegó: se decide en la primera página de cada sesión y se mantiene
function origen() {
  return seguro(() => {
    let o = sessionStorage.getItem('eta_origen')
    if (o) return o
    const ref = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, '') : ''
    const utm = new URLSearchParams(window.location.search).get('utm_source') || ''
    const fuente = `${utm} ${ref}`.toLowerCase()
    o = /google/.test(fuente) ? 'Google'
      : /instagram/.test(fuente) ? 'Instagram'
      : /facebook|fb\.|m\.me/.test(fuente) ? 'Facebook'
      : /whatsapp|wa\.me/.test(fuente) ? 'WhatsApp'
      : /tiktok/.test(fuente) ? 'TikTok'
      : /bing|yahoo|duckduckgo/.test(fuente) ? 'Otros buscadores'
      : !ref || ref === window.location.hostname.replace(/^www\./, '') ? 'Directo'
      : ref
    sessionStorage.setItem('eta_origen', o)
    return o
  }, 'Directo')
}

const dispositivo = () => seguro(() => (window.innerWidth < 768 ? 'Celular' : window.innerWidth < 1100 ? 'Tablet' : 'Computadora'), null)

// ¿Hay una sesión del panel abierta en este navegador?
const esAdministrador = () => seguro(() => Object.keys(localStorage).some(k => /^sb-.*-auth-token$/.test(k)), false)

let sinColumnasNuevas = false   // la base aún no tiene visitante/origen/dispositivo

export async function registrarEvento(evento, pagina, referenciaId, referenciaNombre) {
  if (esAdministrador()) return
  const fila = {
    evento,
    pagina: pagina || null,
    referencia_id: referenciaId ? String(referenciaId) : null,
    referencia_nombre: referenciaNombre || null,
  }
  try {
    if (!sinColumnasNuevas) {
      const { error } = await supabase.from('analytics').insert({ ...fila, visitante: visitante(), origen: origen(), dispositivo: dispositivo() })
      if (!error) return
      if (!/visitante|origen|dispositivo|schema cache|column/i.test(error.message)) return
      sinColumnasNuevas = true
    }
    await supabase.from('analytics').insert(fila)
  } catch { /* sin conexión: no pasa nada */ }
}
