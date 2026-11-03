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

// Tamaño recomendado según el ancho de la pared (una pieza o tríptico en paredes grandes)
export function tamanoRecomendado(anchoPared, altoPared) {
  const W = Number(anchoPared), H = Number(altoPared) || 260
  if (!(W > 0)) return null
  const proporcion = W <= 300 ? 0.57 : W <= 450 ? 0.5 : 0.4
  const total = redondear10(limitar(W * proporcion, 60, 280))
  if (total > 200) {
    const pieza = redondear10((total - 10) / 3)
    const alto = redondear10(Math.min(H * 0.45, pieza * 1.33))
    return { texto: `tríptico de 3 piezas verticales de ${alto} cm de alto × ${pieza} cm de ancho cada una, separadas 5 cm (conjunto de ${pieza * 3 + 10} cm de ancho)`, anchoTotal: pieza * 3 + 10, piezas: 3 }
  }
  const alto = redondear10(Math.min(H * 0.45, total * 0.67))
  return { texto: `una sola pieza horizontal de ${total} cm de ancho × ${alto} cm de alto`, anchoTotal: total, piezas: 1 }
}

export function promptMontaje(consulta) {
  const d = consulta?.datos || {}
  const espacio = d.espacio || null
  const W = Number(d.pared_ancho_cm) || null, H = Number(d.pared_alto_cm) || null
  const tam = tamanoRecomendado(W, H)
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
  } else {
    l('- Formato y tamaño: proporcional a la pared, ocupando entre la mitad y dos tercios del ancho del mueble o de la zona libre de la pared.')
  }
  l(`- Ubicación: ${UBICACION[espacio] || 'centrado en la pared principal que se ve en la foto'}. Si no hay mueble debajo, el centro del cuadro va a unos 150 cm del piso.`)
  l(`- Montaje: lienzo en bastidor de 3 a 4 cm de grosor, sin marco${tam?.piezas === 3 ? ', las tres piezas alineadas y a la misma altura' : ''}, colgado recto y nivelado.`)
  l()
  l('REGLAS DEL MONTAJE')
  l('- Conserva exactamente la foto original: mismo ángulo de cámara, perspectiva, encuadre, muebles, piso, paredes, puertas y objetos. No agregues, quites ni muevas nada más.')
  l('- Si en esa pared hay otros cuadros, letreros o adornos, retíralos solo en esa zona y deja la pared limpia y continua.')
  l('- Ajusta el cuadro a la perspectiva de la pared, con la misma iluminación y temperatura de color de la foto, y una sombra suave y realista sobre la pared.')
  l('- Resultado fotorrealista y nítido, sin texto, sin logotipos, sin marcas de agua y sin personas.')
  l('- Entrega una sola imagen con la misma proporción que la foto original.')
  return lineas.join('\n')
}
