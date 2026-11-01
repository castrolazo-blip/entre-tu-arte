import { supabase, BUCKET, urlPublica } from '../../lib/supabase.js'

// Sube un archivo al almacenamiento y devuelve su enlace público.
export async function subirArchivo(carpeta, archivo, nombre) {
  const ext = (nombre || archivo.name || 'foto.jpg').split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const ruta = `${carpeta}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(ruta, archivo, { contentType: archivo.type || 'image/jpeg', upsert: true })
  if (error) {
    const codigo = error.statusCode || error.status
    const motivo = /row-level security|policy|unauthorized|403/i.test(`${error.message} ${codigo}`)
      ? 'tu usuario no tiene permiso para subir fotos (revisa la migración y la tabla admins)'
      : /exceeded|too large|413|size/i.test(`${error.message} ${codigo}`) ? 'la foto supera el tamaño máximo del almacenamiento'
      : /mime|type/i.test(error.message) ? 'el almacenamiento no acepta este tipo de archivo' : error.message
    throw new Error(`Almacenamiento: ${motivo}${codigo ? ` (código ${codigo})` : ''}`)
  }
  return urlPublica(ruta)
}

// Reduce una imagen a "max" px de lado mayor antes de subirla (más rápida y liviana).
// Si el navegador no puede reducirla (formato raro o foto enorme), se sube la original.
export async function reducirImagen(archivo, max = 2000, calidad = 0.88) {
  const url = URL.createObjectURL(archivo)
  try {
    const img = await cargarImagen(url)
    const escala = Math.min(1, max / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height))
    const c = document.createElement('canvas')
    c.width = Math.max(1, Math.round((img.naturalWidth || img.width) * escala))
    c.height = Math.max(1, Math.round((img.naturalHeight || img.height) * escala))
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
    const blob = await new Promise(ok => c.toBlob(ok, 'image/jpeg', calidad))
    if (!blob || !blob.size) throw new Error('sin imagen')
    return new File([blob], (archivo.name || 'foto').replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    if (archivo.size > 20 * 1024 * 1024) throw new Error('La foto es demasiado grande (más de 20 MB). Prueba con otra o reduce su tamaño.')
    return archivo
  } finally { URL.revokeObjectURL(url) }
}

export function cargarImagen(src) {
  return new Promise((ok, falla) => {
    const img = new Image()
    // Solo las fotos del servidor necesitan permiso de origen; en fotos locales (blob:) Safari falla con él
    if (/^https?:/.test(src)) img.crossOrigin = 'anonymous'
    img.onload = () => ok(img)
    img.onerror = () => falla(new Error('No se pudo leer la foto'))
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
