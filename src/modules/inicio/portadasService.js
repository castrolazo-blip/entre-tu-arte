import { supabase } from '../../lib/supabase.js'

// Portadas activas y vigentes (las reglas de la base de datos ya filtran por fechas para el público).
export async function listarPortadasPublicas() {
  const { data, error } = await supabase.from('portadas').select('*').order('orden').order('created_at')
  if (error) return []
  const hoy = new Date().toISOString().slice(0, 10)
  return (data || []).filter(p => p.activa && (!p.desde || p.desde <= hoy) && (!p.hasta || p.hasta >= hoy))
}
