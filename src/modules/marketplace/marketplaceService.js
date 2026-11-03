import { supabase } from '../../lib/supabase.js'
import { subirArchivo, reducirImagen } from '../admin/adminService.js'

// Envía uno o varios cuadros de un vendedor. Las fotos van a la carpeta marketplace/ (la única
// donde un visitante puede subir) y cada cuadro queda como solicitud pendiente de revisión.
export async function enviarSolicitudes(vendedor, cuadros, alAvanzar) {
  let hechos = 0
  for (const c of cuadros) {
    let urls
    try {
      urls = await Promise.all(c.archivos.map(async a => subirArchivo('marketplace', await reducirImagen(a, 1800, 0.85), null, { upsert: false })))
    } catch (err) {
      if (/permiso/.test(err.message)) throw new Error('El marketplace aún no está activo. Escríbenos por WhatsApp y te ayudamos.')
      throw err
    }
    const { error } = await supabase.from('marketplace_solicitudes').insert({
      tipo_vendedor: vendedor.tipo, nombre: vendedor.nombre.trim(),
      telefono: vendedor.telefono.trim() || null, email: vendedor.email.trim() || null,
      // Artista del cuadro: el propio vendedor si es artista; si no, el que indicó o anónimo
      autor: vendedor.tipo === 'artista' ? vendedor.nombre.trim() : (c.anonimo ? null : c.autor.trim() || null),
      autor_anonimo: vendedor.tipo !== 'artista' && !!c.anonimo,
      titulo: c.titulo.trim() || null, tecnica: c.tecnica.trim() || null, descripcion: c.descripcion.trim() || null,
      alto_cm: Number(c.alto) || null, ancho_cm: Number(c.ancho) || null, piezas: Math.max(1, Number(c.piezas) || 1),
      precio_deseado: Number(String(c.precio).replace(/[^0-9.]/g, '')) || null,
      fotos: urls.map((url, i) => ({ url, rol: ['principal', 'ambiente', 'detalle'][i] || 'detalle' })),
      notas: c.notas?.trim() || null,
    })
    if (error) {
      if (/marketplace_solicitudes|schema cache|does not exist/i.test(error.message)) throw new Error('El marketplace aún no está activo. Escríbenos por WhatsApp y te ayudamos.')
      throw new Error(error.message)
    }
    alAvanzar?.(++hechos)
  }
}
