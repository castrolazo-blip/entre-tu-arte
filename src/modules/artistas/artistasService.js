import { supabase } from '../../lib/supabase.js'

export async function listarArtistas() {
  const { data, error } = await supabase.from('artistas').select('*').eq('activo', true).order('orden').order('nombre')
  if (error) throw error
  return data || []
}

export async function obtenerArtista(slug) {
  const { data, error } = await supabase.from('artistas').select('*').eq('slug', slug).maybeSingle()
  if (error) throw error
  return data
}
