import { supabase } from './supabase.js'

// Registra visitas y clics importantes (tabla "analytics", la misma del sitio anterior).
// Nunca debe interrumpir la navegación: cualquier error se ignora.
export async function registrarEvento(evento, pagina, referenciaId, referenciaNombre) {
  try {
    await supabase.from('analytics').insert({
      evento,
      pagina: pagina || null,
      referencia_id: referenciaId ? String(referenciaId) : null,
      referencia_nombre: referenciaNombre || null,
    })
  } catch { /* sin conexión: no pasa nada */ }
}
