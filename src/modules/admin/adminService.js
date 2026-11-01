import { supabase, BUCKET, urlPublica } from '../../lib/supabase.js'

// Sube un archivo al almacenamiento y devuelve su enlace público.
export async function subirArchivo(carpeta, archivo, nombre) {
  const ext = (nombre || archivo.name || 'foto.jpg').split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const ruta = `${carpeta}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(ruta, archivo, { contentType: archivo.type || 'image/jpeg', upsert: true })
  if (error) throw error
  return urlPublica(ruta)
}

// Reduce una imagen a "max" px de lado mayor antes de subirla (más rápida y liviana).
export async function reducirImagen(archivo, max = 2000, calidad = 0.88) {
  const url = URL.createObjectURL(archivo)
  try {
    const img = await cargarImagen(url)
    const escala = Math.min(1, max / Math.max(img.width, img.height))
    const c = document.createElement('canvas')
    c.width = Math.round(img.width * escala); c.height = Math.round(img.height * escala)
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
    const blob = await new Promise(ok => c.toBlob(ok, 'image/jpeg', calidad))
    return new File([blob], (archivo.name || 'foto').replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
  } finally { URL.revokeObjectURL(url) }
}

export function cargarImagen(src) {
  return new Promise((ok, falla) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => ok(img)
    img.onerror = falla
    img.src = src
  })
}

export async function guardarConfig(clave, valor) {
  const { error } = await supabase.from('configuracion')
    .upsert({ clave, valor, updated_at: new Date().toISOString() }, { onConflict: 'clave' })
  if (error) throw error
}

export async function leerConfig(claves) {
  const { data } = await supabase.from('configuracion').select('clave, valor').in('clave', claves)
  const r = {}
  ;(data || []).forEach(f => { r[f.clave] = f.valor })
  return r
}
