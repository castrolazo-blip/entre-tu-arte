import { createClient } from '@supabase/supabase-js'

// Proyecto de Supabase de Entre tu Arte. La llave pública (anon) puede ir en el código:
// lo que protege los datos son las reglas de seguridad por filas (ver supabase/migrations).
export const SUPABASE_URL = 'https://titmjfkpvlsuazqsfniw.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpdG1qZmtwdmxzdWF6cXNmbml3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MjU2MDgsImV4cCI6MjA5MzQwMTYwOH0.kB_bOCQuIEI8nyIqE1I_ERcXVJWfTl0HaKquOYjwwmI'

export const BUCKET = 'catalogos'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export function urlPublica(ruta) {
  return supabase.storage.from(BUCKET).getPublicUrl(ruta).data.publicUrl
}
