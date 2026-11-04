// Arma el prompt para que una IA de imágenes (ChatGPT, Gemini…) haga el montaje del cuadro en la
// foto del espacio del cliente. Plantilla genérica: se llena con los datos de la asesoría.

const redondear10 = v => Math.round(v / 10) * 10
const limitar = (v, a, b) => Math.min(b, Math.max(a, v))

// Dónde va el cuadro según el tipo de espacio
const UBICACION = {
  'Sala': 'centrado sobre el sofá, con el borde inferior del cuadro a 20–25 cm del respaldo',
  'Comedor': 'centrado sobre la mesa del comedor o el aparador, con el borde inferior a 25–30 cm del mueble',
  'Habitación principal': 'centrado sobre el cabecero de la cama, con el borde inferior a 20–30 cm del cabecero',
  'Habitación': 'centrado sobre la cama o el mueble principal, con el borde inferior a 20–30 cm del mueble',
  'Oficina': 'en la pared detrás o frente al escritorio, centrado y a la altura de la vista',
  'Recibidor o entrada': 'centrado sobre la consola o el mueble de entrada; si no hay mueble, centrado en la pared',
  'Pasillo': 'centrado en la pared, a la altura de la vista',
}

// Formatos posibles del cuadro (la asesoría guarda la preferencia del cliente en datos.formato)
export const FORMATOS = { '': 'Recomendado', una: 'Una pieza', diptico: 'Díptico (2)', triptico: 'Tríptico (3)' }

// Tamaño según el ancho de la pared. Sin formato elegido: una pieza, o tríptico si pasa de 2 m.
export function tamanoRecomendado(anchoPared, altoPared, formato = '') {
  const W = Number(anchoPared), H = Number(altoPared) || 260
  if (!(W > 0)) return null
  const proporcion = W <= 300 ? 0.57 : W <= 450 ? 0.5 : 0.4
  const total = redondear10(limitar(W * proporcion, 60, 280))
  const piezas = formato === 'una' ? 1 : formato === 'diptico' ? 2 : formato === 'triptico' ? 3 : (total > 200 ? 3 : 1)
  if (piezas === 1) {
    const ancho = Math.min(total, 200)   // una pieza más ancha deja de ser práctica de pintar y transportar
    const alto = redondear10(Math.min(H * 0.45, ancho * 0.67))
    return { texto: `una sola pieza horizontal de ${ancho} cm de ancho × ${alto} cm de alto`, anchoTotal: ancho, piezas: 1 }
  }
  const conjunto = limitar(total, piezas === 2 ? 80 : 120, piezas === 2 ? 220 : 280)
  const pieza = redondear10((conjunto - 5 * (piezas - 1)) / piezas)
  const alto = redondear10(Math.min(H * 0.45, pieza * 1.33))
  const forma = alto > pieza ? ' verticales' : ''
  const nombre = piezas === 2 ? `díptico de 2 piezas${forma}` : `tríptico de 3 piezas${forma}`
  const ancho = pieza * piezas + 5 * (piezas - 1)
  return { texto: `${nombre} de ${alto} cm de alto × ${pieza} cm de ancho cada una, separadas 5 cm (conjunto de ${ancho} cm de ancho)`, anchoTotal: ancho, piezas }
}

// Prompts para pedir ajustes a la IA en el mismo chat, debajo de la imagen
export const SEGUIMIENTO = [
  ['Más grande', 'Haz el cuadro un 20 % más grande, manteniendo la misma altura del centro y la separación entre piezas.'],
  ['Centrar', 'Centra el cuadro en la pared y sobre el mueble principal, sin cambiar nada más de la foto.'],
  ['Otros colores', 'Haz una segunda versión con la misma composición, pero en una variante de colores más suave que armonice con el espacio.'],
  ['Con marco', 'Agrega un marco flotante delgado en color nogal, sin cambiar la obra ni el resto de la foto.'],
  ['Otra propuesta', 'Haz una propuesta distinta de cuadro con el mismo tamaño, ubicación y estilo, para que el cliente pueda comparar.'],
]

export function promptMontaje(consulta, formato) {
  const d = consulta?.datos || {}
  const espacio = d.espacio || null
  const W = Number(d.pared_ancho_cm) || null, H = Number(d.pared_alto_cm) || null
  const tam = tamanoRecomendado(W, H, formato ?? d.formato ?? '')
  const obra = consulta?.ficha_titulo && consulta?.ficha_id ? consulta.ficha_titulo : null
  const colores = d.colores || null
  const pedido = (consulta?.mensaje || '').trim()
  const lineas = []
  const l = (t = '') => lineas.push(t)

  l('Crea un montaje fotorrealista de decoración de interiores usando la FOTO ADJUNTA del espacio de mi cliente. El objetivo es mostrarle con claridad cómo se vería un cuadro de Entre tu Arte en su pared.')
  l()
  l('DATOS DEL ESPACIO')
  l(`- Tipo de espacio: ${espacio || 'el que se ve en la foto'}.`)
  if (W || H) l(`- Medidas de la pared: ${W ? `${W} cm de ancho` : 'ancho no indicado'} × ${H ? `${H} cm de alto` : 'alto no indicado'}.`)
  if (d.estilo && d.estilo !== 'No estoy seguro') l(`- Estilo del espacio: ${d.estilo}.`)
  if (colores) l(`- Colores que le gustan al cliente: ${colores}.`)
  if (pedido) l(`- Lo que pidió el cliente: "${pedido}".`)
  l()
  l('EL CUADRO')
  if (obra) {
    l(`- Usa la obra "${obra}" de la SEGUNDA imagen adjunta tal cual: sin cambiar sus colores, composición ni proporciones.`)
  } else {
    const paleta = colores || (pedido ? 'los colores que pidió el cliente (si no menciona colores, en tonos que armonicen con el espacio de la foto)' : 'colores que armonicen con el espacio de la foto')
    l(`- Diseña un cuadro decorativo ${/abstract/i.test(pedido) || !pedido ? 'abstracto' : 'acorde a lo que pidió el cliente'}, pintado a mano en acrílico sobre lienzo, con textura visible y pinceladas con relieve, en ${paleta}.`)
    l(`- Debe ser coherente con el estilo ${d.estilo && d.estilo !== 'No estoy seguro' ? d.estilo.toLowerCase() : 'del espacio'} y verse como una obra de arte real de galería, no como una impresión digital ni un póster.`)
  }
  if (tam) {
    l(`- Formato y tamaño: ${tam.texto}.`)
    if (W) l(`- Respeta la escala real: usa el ancho de la pared (${W} cm) como referencia; el cuadro debe ocupar cerca del ${Math.round(tam.anchoTotal / W * 100)} % del ancho de la pared.`)
  } else if (FORMATOS[formato ?? d.formato ?? '']) {
    const f = formato ?? d.formato ?? ''
    l(`- Formato y tamaño: ${f === 'diptico' ? 'díptico de 2 piezas verticales' : f === 'triptico' ? 'tríptico de 3 piezas verticales' : f === 'una' ? 'una sola pieza horizontal' : 'el que mejor se adapte'}, proporcional a la pared, ocupando entre la mitad y dos tercios del ancho del mueble o de la zona libre de la pared.`)
  } else {
    l('- Formato y tamaño: proporcional a la pared, ocupando entre la mitad y dos tercios del ancho del mueble o de la zona libre de la pared.')
  }
  l(`- Ubicación: ${UBICACION[espacio] || 'centrado en la pared principal que se ve en la foto'}. Si no hay mueble debajo, el centro del cuadro va a unos 150 cm del piso.`)
  l(`- Montaje: lienzo en bastidor de 3 a 4 cm de grosor, sin marco${tam?.piezas > 1 ? ', las piezas alineadas y a la misma altura' : ''}, colgado recto y nivelado.`)
  l()
  l('REGLAS DEL MONTAJE')
  l('- Conserva exactamente la foto original: mismo ángulo de cámara, perspectiva, encuadre, muebles, piso, paredes, puertas y objetos. No agregues, quites ni muevas nada más.')
  l('- Si en esa pared hay otros cuadros, letreros o adornos, retíralos solo en esa zona y deja la pared limpia y continua.')
  l('- Ajusta el cuadro a la perspectiva de la pared, con la misma iluminación y temperatura de color de la foto, y una sombra suave y realista sobre la pared.')
  l('- Resultado fotorrealista y nítido, sin texto, sin logotipos, sin marcas de agua y sin personas.')
  l('- Entrega una sola imagen con la misma proporción que la foto original.')
  return lineas.join('\n')
}
