import { createClient } from '@supabase/supabase-js'

// Proyecto de Supabase de Entre tu Arte. La llave pública (anon) puede ir en el código:
// lo que protege los datos son las reglas de seguridad por filas (ver supabase/migrations).
export const SUPABASE_URL = 'https://titmjfkpvlsuazqsfniw.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpdG1qZmtwdmxzdWF6cXNmbml3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MjU2MDgsImV4cCI6MjA5MzQwMTYwOH0.kB_bOCQuIEI8nyIqE1I_ERcXVJWfTl0HaKquOYjwwmI'

export const BUCKET = 'catalogos'

// Ninguna llamada puede quedarse esperando para siempre: si el servidor no contesta, se corta
// (60 s para subir archivos, 30 s para lo demás) y quien llamó puede reintentar o avisar.
function fetchConLimite(url, opciones = {}) {
  const esSubida = /\/storage\/v1\/object\//.test(String(url)) && /POST|PUT/i.test(opciones.method || '')
  const control = new AbortController()
  const reloj = setTimeout(() => control.abort(new Error('timeout: el servidor no respondió a tiempo')), esSubida ? 60000 : 30000)
  if (opciones.signal) {
    if (opciones.signal.aborted) control.abort(opciones.signal.reason)
    else opciones.signal.addEventListener('abort', () => control.abort(opciones.signal.reason), { once: true })
  }
  return fetch(url, { ...opciones, signal: control.signal }).finally(() => clearTimeout(reloj))
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { fetch: fetchConLimite } })

export function urlPublica(ruta) {
  return supabase.storage.from(BUCKET).getPublicUrl(ruta).data.publicUrl
}
