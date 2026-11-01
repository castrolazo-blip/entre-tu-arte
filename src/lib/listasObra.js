import { supabase } from './supabase.js'

// Opciones para técnica, soporte y estilo. Las base vienen aquí; las que agrega el admin se
// guardan en la tabla configuracion (pub_tecnicas, pub_soportes, pub_estilos) y aparecen en
// cualquier dispositivo. pub_tecnicas y pub_soportes son las mismas listas del sitio anterior.
export const LISTAS = {
  tecnicas: {
    clave: 'pub_tecnicas',
    base: ['Acrílico', 'Óleo', 'Técnica mixta', 'Texturas en relieve', 'Hoja de oro', 'Resina', 'Acuarela', 'Spray', 'Carboncillo'],
  },
  soportes: {
    clave: 'pub_soportes',
    base: ['Lienzo', 'Bastidor de pino', 'Bastidor circular de pino', 'Bastidor geométrico de pino', 'Madera', 'Papel de algodón', 'Metal'],
  },
  estilos: {
    clave: 'pub_estilos',
    base: ['Abstracto', 'Contemporáneo', 'Minimalista', 'Japandi', 'Figurativo', 'Paisaje', 'Floral', 'Texturizado', 'Clásico', 'Moderno'],
  },
}

const cache = {}

function parse(v) {
  try { const a = JSON.parse(v || '[]'); return Array.isArray(a) ? a.filter(Boolean) : [] } catch { return [] }
}

export async function cargarLista(tipo) {
  if (cache[tipo]) return cache[tipo]
  const { clave, base } = LISTAS[tipo]
  const { data } = await supabase.from('configuracion').select('valor').eq('clave', clave).maybeSingle()
  cache[tipo] = { extra: parse(data?.valor) }
  cache[tipo].todas = [...new Set([...base, ...cache[tipo].extra])]
  return cache[tipo]
}

export async function agregarALista(tipo, valor) {
  const v = valor.trim()
  if (!v) return
  const lista = await cargarLista(tipo)
  if (lista.todas.some(x => x.toLowerCase() === v.toLowerCase())) return
  const extra = [...lista.extra, v]
  const { error } = await supabase.from('configuracion')
    .upsert({ clave: LISTAS[tipo].clave, valor: JSON.stringify(extra), updated_at: new Date().toISOString() }, { onConflict: 'clave' })
  if (error) throw error
  cache[tipo] = { extra, todas: [...lista.todas, v] }
}

// Varios valores se guardan en un solo texto separados por coma ("Acrílico, Hoja de oro").
export const separar = texto => String(texto || '').split(/\s*,\s*/).map(s => s.trim()).filter(Boolean)
export const unir = valores => valores.join(', ')
