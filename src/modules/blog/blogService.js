import { supabase } from '../../lib/supabase.js'

export async function listarArticulos() {
  const { data, error } = await supabase.from('blogs').select('*').eq('publicado', true).order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function obtenerArticulo(id) {
  const { data, error } = await supabase.from('blogs').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}
