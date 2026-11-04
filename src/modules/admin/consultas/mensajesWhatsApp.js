// Mensajes listos para responder a un cliente por WhatsApp desde Admin › Consultas.
// Se personalizan con el nombre, el espacio y la obra de la consulta.

export const CLAUSULA_PROPUESTA =
  'Esta propuesta, sus imágenes y su diseño son propiedad de Entre tu Arte y se comparten solo para tu evaluación personal. ' +
  'Te pedimos no compartirlos, reproducirlos ni utilizarlos con otros proveedores, artistas o talleres de arte.'

import { anticipoPedido } from '../../../lib/anticipo.js'
import { precio } from '../../../lib/formato.js'

const primerNombre = n => String(n || '').trim().split(/\s+/)[0] || ''

export function mensajesWhatsApp(c, porcentajeAnticipo = 25) {
  const nombre = primerNombre(c?.nombre)
  const hola = nombre ? `Hola, ${nombre}` : 'Hola'
  const d = c?.datos || {}
  const espacio = d.espacio ? ` para tu ${d.espacio.toLowerCase()}` : ''
  const obra = c?.ficha_titulo && c?.ficha_id ? ` sobre la obra "${c.ficha_titulo}"` : ''
  const lista = [
    {
      id: 'gracias', titulo: 'Gracias, en un momento enviamos la propuesta',
      texto: `${hola}, gracias por escribirnos a Entre tu Arte. Recibimos tu solicitud${espacio}${obra} y en un momento te enviamos la propuesta.`,
    },
    {
      id: 'consulta', titulo: 'Pedir más información',
      texto: `${hola}, gracias por tu interés en Entre tu Arte. Para preparar una propuesta ${d.espacio ? `a la medida de tu ${d.espacio.toLowerCase()}` : 'a tu medida'}, ¿nos puedes confirmar:\n\n` +
        `1. Las medidas de la pared (ancho y alto).\n2. Una foto del espacio, de frente y con buena luz.\n3. Los colores o el estilo que te gustan.\n4. Si prefieres una sola pieza, díptico o tríptico.\n\nCon eso te enviamos la propuesta.`,
    },
    {
      id: 'propuesta', titulo: 'Enviar la propuesta solicitada', clausula: true,
      texto: `${hola}, por este medio te envío la propuesta solicitada${espacio}. Es una simulación de referencia: la obra final se pinta a mano, por lo que puede variar ligeramente. Con gusto resolvemos cualquier duda o hacemos ajustes.\n\n` +
        `Importante: ${CLAUSULA_PROPUESTA}`,
    },
  ]
  if (c?.tipo === 'compra' || c?.tipo === 'reserva') lista.unshift({
    id: 'pedido', titulo: 'Confirmar el pedido',
    texto: (() => {
      const total = Number(c?.datos?.total) || 0
      const r = anticipoPedido(c?.datos, porcentajeAnticipo)
      const detalle = r
        ? `\n\n• Total: ${precio(r.total)}\n• Anticipo (${r.pct} %${r.mixto ? ' de las obras por pedido' : ''}): ${precio(r.anticipo)}\n• Saldo contra entrega: ${precio(r.saldo)}`
        : total > 0 ? `\n\n• Total: ${precio(total)}, contra entrega.` : ''
      return `${hola}, gracias por tu pedido en Entre tu Arte${obra}. Te confirmamos la disponibilidad y coordinamos contigo la forma de pago y la entrega.${detalle}`
    })(),
  })
  return lista
}
