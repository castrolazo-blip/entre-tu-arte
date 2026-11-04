// Mensajes de WhatsApp para quienes venden cuadros en el Marketplace (artistas o particulares).
// s: la solicitud; extra: { precioVenta, comision, alVendedor, enlace, vendida, pago }
import { precio } from '../../../lib/formato.js'

const primerNombre = n => String(n || '').trim().split(/\s+/)[0] || ''

export function mensajesVendedor(s, extra = {}) {
  const hola = primerNombre(s?.nombre) ? `Hola, ${primerNombre(s.nombre)}` : 'Hola'
  const cuadro = s?.titulo ? `tu cuadro "${s.titulo}"` : 'tu cuadro'
  const lista = []

  if (s?.estado === 'pendiente') {
    lista.push({
      id: 'recibido', titulo: 'Recibimos tus cuadros',
      texto: `${hola}, gracias por confiar en Entre tu Arte. Recibimos ${cuadro} y lo estamos revisando. En breve te escribimos con nuestra propuesta de publicación.`,
    })
    lista.push({
      id: 'info', titulo: 'Pedir más información',
      texto: `${hola}, gracias por enviarnos ${cuadro}. Para revisarlo bien, ¿nos ayudas con lo siguiente?\n\n` +
        '1. Fotos de frente, con buena luz natural y sin reflejos.\n2. Medidas exactas (alto y ancho) y si tiene marco.\n3. Estado del cuadro (rayones, golpes o detalles).\n4. Autor, año y si está firmado o tiene certificado.\n\nCon eso te enviamos la propuesta.',
    })
    if (extra.precioVenta > 0) lista.push({
      id: 'propuesta', titulo: 'Propuesta de precio y comisión', destacado: true, nota: 'Usa el precio y la comisión que pusiste arriba',
      texto: `${hola}, ya revisamos ${cuadro} y nos encantaría publicarlo en Entre tu Arte.\n\n` +
        `Te proponemos:\n• Precio de venta: ${precio(extra.precioVenta)}\n• Comisión de Entre tu Arte: ${extra.comision}%\n• Tú recibes: ${precio(extra.alVendedor)} cuando se concrete la venta\n\n` +
        'El cuadro se queda contigo hasta la venta; nosotros atendemos a los compradores y coordinamos el pago y la entrega. ¿Estás de acuerdo para publicarlo?',
    })
    lista.push({
      id: 'no', titulo: 'No lo publicaremos por ahora',
      texto: `${hola}, muchas gracias por enviarnos ${cuadro}. Por ahora no podremos incluirlo en nuestro catálogo, pero te tendremos en cuenta para próximas colecciones. ¡Gracias por pensar en Entre tu Arte!`,
    })
  }

  if (s?.estado === 'aprobada' && !extra.vendida) lista.push({
    id: 'publicado', titulo: 'Tu cuadro ya está publicado',
    texto: `${hola}, ¡${cuadro} ya está publicado en Entre tu Arte!${extra.enlace ? `\n\nPuedes verlo aquí: ${extra.enlace}` : ''}\n\n` +
      'Si se vende por otro medio o deja de estar disponible, avísanos de inmediato para retirarlo de la página.',
  })

  if (s?.estado === 'aprobada' && extra.vendida) lista.push({
    id: 'vendido', titulo: 'Se vendió: coordinar entrega y pago', destacado: true,
    texto: `${hola}, ¡buenas noticias! Se vendió ${cuadro}.\n\n` +
      `• Precio de venta: ${precio(s.precio_publicado)}\n• Comisión de Entre tu Arte: ${s.comision_pct ?? '—'}%\n• Te corresponden: ${precio(extra.pago)}\n\n` +
      'Coordinemos la entrega o recolección del cuadro. Te pagamos dentro de los 7 días hábiles después del pago completo del comprador y la entrega. ¿Cuándo lo tendrías listo?',
  })

  if (s?.estado === 'pagada') lista.push({
    id: 'pagado', titulo: 'Confirmar el pago',
    texto: `${hola}, te confirmamos el pago de ${precio(extra.pago)} por la venta de ${cuadro}. ¡Gracias por confiar en Entre tu Arte! Cuando tengas más obras, con gusto las publicamos.`,
  })

  return lista
}
