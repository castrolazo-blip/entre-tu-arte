// Procesa la foto principal: recorta la obra usando el encuadre que detectó la IA y mejora
// la luz y el color (niveles automáticos suaves). Todo ocurre en el navegador.

const MAX_LADO = 2000

export function lienzo(w, h) {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h))
  return c
}

// caja: {x, y, w, h} en fracciones de la foto. Sin caja se usa la foto completa.
export function recortarObra(img, caja, margen = 0) {
  const W = img.naturalWidth || img.width, H = img.naturalHeight || img.height
  let x = 0, y = 0, w = W, h = H
  if (caja) {
    const mx = margen * W, my = margen * H
    x = Math.max(0, caja.x * W - mx); y = Math.max(0, caja.y * H - my)
    w = Math.min(W - x, caja.w * W + 2 * mx); h = Math.min(H - y, caja.h * H + 2 * my)
  }
  const escala = Math.min(1, MAX_LADO / Math.max(w, h))
  const c = lienzo(w * escala, h * escala)
  const ctx = c.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, x, y, w, h, 0, 0, c.width, c.height)
  return c
}

// Niveles automáticos: estira el contraste entre los percentiles 0.5 % y 99.5 %, acerca el brillo
// medio a un punto agradable y sube un poco la saturación. Con límites para no exagerar.
export function mejorarImagen(origen) {
  const c = lienzo(origen.width, origen.height)
  const ctx = c.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(origen, 0, 0)
  const datos = ctx.getImageData(0, 0, c.width, c.height)
  const d = datos.data
  const hist = new Uint32Array(256)
  const paso = Math.max(1, Math.floor(d.length / 4 / 250000)) * 4
  let n = 0
  for (let i = 0; i < d.length; i += paso) { hist[(d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0]++; n++ }
  const percentil = p => { let acum = 0; for (let v = 0; v < 256; v++) { acum += hist[v]; if (acum >= n * p) return v } return 255 }
  let bajo = percentil(0.005), alto = percentil(0.995)
  if (alto - bajo < 60) { bajo = Math.max(0, bajo - 20); alto = Math.min(255, alto + 20) }
  const ganancia = Math.min(1.6, 255 / Math.max(1, alto - bajo))
  const medio = percentil(0.5)
  const medioEstirado = Math.min(1, Math.max(0.01, ((medio - bajo) * ganancia) / 255))
  const gamma = Math.min(1.25, Math.max(0.8, Math.log(0.5) / Math.log(medioEstirado)))
  const tabla = new Uint8ClampedArray(256)
  for (let v = 0; v < 256; v++) {
    const lineal = Math.min(1, Math.max(0, ((v - bajo) * ganancia) / 255))
    tabla[v] = Math.round(Math.pow(lineal, 1 / gamma) * 255)
  }
  const sat = 1.08
  for (let i = 0; i < d.length; i += 4) {
    let r = tabla[d[i]], g = tabla[d[i + 1]], b = tabla[d[i + 2]]
    const l = r * 0.299 + g * 0.587 + b * 0.114
    d[i] = l + (r - l) * sat; d[i + 1] = l + (g - l) * sat; d[i + 2] = l + (b - l) * sat
  }
  ctx.putImageData(datos, 0, 0)
  return c
}

export function aBlob(canvas, calidad = 0.9) {
  return new Promise(ok => canvas.toBlob(ok, 'image/jpeg', calidad))
}

// Gira una imagen en pasos de 90° (en sentido del reloj). Devuelve la misma imagen si giro = 0.
export function girarImagen(img, giro = 0) {
  const g = ((giro % 360) + 360) % 360
  if (!g) return img
  const W = img.naturalWidth || img.width, H = img.naturalHeight || img.height
  const c = lienzo(g === 180 ? W : H, g === 180 ? H : W)
  const ctx = c.getContext('2d')
  ctx.translate(c.width / 2, c.height / 2)
  ctx.rotate(g * Math.PI / 180)
  ctx.drawImage(img, -W / 2, -H / 2)
  return c
}

// Recuadro {x, y, w, h} (fracciones) después de girar la imagen 90° en sentido del reloj
export function girarCaja(caja) {
  if (!caja) return caja
  return { x: 1 - (caja.y + caja.h), y: caja.x, w: caja.h, h: caja.w }
}
