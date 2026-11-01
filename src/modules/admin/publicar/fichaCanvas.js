// Ficha para redes sociales (1080 × 1350), igual a la del sitio anterior.
// Tres espacios de foto: principal (arriba a la derecha), ambiente (izquierda) y detalle
// (franja inferior). La IA devuelve un "encuadre" por foto (dónde está la obra) y el admin
// puede mover y acercar cada foto a mano ("ajustes").

export const ANCHO = 1080
export const ALTO = 1350

export const HUECOS = {
  principal: { x: 525, y: 0, w: 555, h: 666 },
  ambiente:  { x: 44, y: 437, w: 452, h: 578 },
  detalle:   { x: 0, y: 1037, w: 1080, h: 313 },
}

export function huecoEn(pt) {
  return Object.keys(HUECOS).find(k => {
    const r = HUECOS[k]
    return pt.x >= r.x && pt.x <= r.x + r.w && pt.y >= r.y && pt.y <= r.y + r.h
  }) || null
}

function encuadrar(ctx, img, x, y, w, h, caja, margen, cubrir, ajuste) {
  let { sx, sy, rw, rh } = calcularRecorte(img, w / h, caja, margen, cubrir)
  if (ajuste) {
    const z = ajuste.z || 1
    const ncx = sx + rw / 2 - (ajuste.dx || 0) * rw, ncy = sy + rh / 2 - (ajuste.dy || 0) * rh
    rw /= z; rh /= z
    sx = ncx - rw / 2; sy = ncy - rh / 2
  }
  dibujarRecorte(ctx, img, x, y, w, h, sx, sy, rw, rh)
}

function calcularRecorte(img, a, caja, margen, cubrir) {
  const W = img.width, H = img.height
  let bx = 0, by = 0, bw = W, bh = H
  if (caja) { bx = caja.x * W; by = caja.y * H; bw = caja.w * W; bh = caja.h * H }
  const m = margen * Math.max(bw, bh)
  bx -= m; by -= m; bw += 2 * m; bh += 2 * m
  const cx = bx + bw / 2, cy = by + bh / 2
  const cw = Math.max(bw, bh * a), ch = cw / a
  const centrar = (ini, tam, total) => tam <= total ? Math.min(Math.max(ini, 0), total - tam) : (total - tam) / 2

  if (cubrir || (cw <= W && ch <= H)) {
    let rw = cw, rh = ch
    if (rw > W) { rw = W; rh = rw / a }
    if (rh > H) { rh = H; rw = rh * a }
    const sx = centrar(cx - rw / 2, rw, W), sy = centrar(cy - rh / 2, rh, H)
    const cortaObra = caja && (sx > caja.x * W + 1 || sy > caja.y * H + 1 ||
      sx + rw < (caja.x + caja.w) * W - 1 || sy + rh < (caja.y + caja.h) * H - 1)
    if (cubrir !== 'auto' || !cortaObra) return { sx, sy, rw, rh }
    return calcularRecorte(img, a, caja, 0.04, false)
  }
  return { sx: centrar(cx - cw / 2, cw, W), sy: centrar(cy - ch / 2, ch, H), rw: cw, rh: ch }
}

function dibujarRecorte(ctx, img, x, y, w, h, sx, sy, rw, rh) {
  const W = img.width, H = img.height
  if (sx >= 0 && sy >= 0 && sx + rw <= W && sy + rh <= H) {
    ctx.drawImage(img, sx, sy, rw, rh, x, y, w, h)
    return
  }
  ctx.save()
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip()
  fondoDifuso(ctx, img, x, y, w, h)
  const s = w / rw
  const ix0 = Math.max(0, sx), iy0 = Math.max(0, sy)
  const ix1 = Math.min(W, sx + rw), iy1 = Math.min(H, sy + rh)
  if (ix1 > ix0 && iy1 > iy0) {
    ctx.shadowColor = 'rgba(0,0,0,0.18)'; ctx.shadowBlur = 24
    ctx.drawImage(img, ix0, iy0, ix1 - ix0, iy1 - iy0, x + (ix0 - sx) * s, y + (iy0 - sy) * s, (ix1 - ix0) * s, (iy1 - iy0) * s)
  }
  ctx.restore()
}

// Fondo difuminado (funciona también en Safari, que no soporta ctx.filter)
function fondoDifuso(ctx, img, x, y, w, h) {
  const t = document.createElement('canvas')
  t.width = 24; t.height = Math.max(1, Math.round(24 * h / w))
  const tc = t.getContext('2d')
  const r = t.width / t.height
  let sw = img.width, sh = img.height
  if (sw / sh > r) sw = sh * r; else sh = sw / r
  tc.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, t.width, t.height)
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(t, x, y, w, h)
  ctx.fillStyle = 'rgba(244,242,238,0.35)'; ctx.fillRect(x, y, w, h)
}

function centroCaja(caja, f) {
  const c = caja || { x: 0, y: 0, w: 1, h: 1 }
  return { x: c.x + c.w * (1 - f) / 2, y: c.y + c.h * (1 - f) / 2, w: c.w * f, h: c.h * f }
}

function lineas(ctx, texto, ancho) {
  const r = []
  let actual = ''
  String(texto || '').split(/\s+/).filter(Boolean).forEach(p => {
    const prueba = actual ? actual + ' ' + p : p
    if (ctx.measureText(prueba).width > ancho && actual) { r.push(actual); actual = p }
    else actual = prueba
  })
  if (actual) r.push(actual)
  return r
}

export function formatoPrecio(texto) {
  const n = parseFloat(String(texto).replace(/[$\s,]/g, ''))
  if (!(n >= 0)) return String(texto)
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * fotos:   [{ img: HTMLImageElement, encuadre?: {x,y,w,h} }] (0 = principal, 1 = ambiente, 2 = detalle)
 * ajustes: { principal?: {dx,dy,z}, ambiente?: ..., detalle?: ... }
 * datos:   { nombre, artista, tecnica, soporte, anio, medidas, estilo, descripcion, precio }
 * logo:    imagen opcional del logo (se usa la marca superior, como en el sitio anterior)
 */
export function dibujarFicha(canvas, { fotos, ajustes = {}, datos = {}, logo }) {
  const ctx = canvas.getContext('2d')
  const W = ANCHO, H = ALTO, M = 44
  const ORO = '#a8885a', TINTA = '#1c1c1c', GRIS = '#4a4a4a'
  ctx.fillStyle = '#f4f2ee'; ctx.fillRect(0, 0, W, H)
  if (!fotos.length) return

  const principal = fotos[0].img
  const cajaP = fotos[0].encuadre
  const hp = HUECOS.principal, ha = HUECOS.ambiente, hd = HUECOS.detalle
  encuadrar(ctx, principal, hp.x, hp.y, hp.w, hp.h, cajaP, 0.06, false, ajustes.principal)
  if (fotos[1]) encuadrar(ctx, fotos[1].img, ha.x, ha.y, ha.w, ha.h, fotos[1].encuadre, 0.4, fotos[1].encuadre ? 'auto' : false, ajustes.ambiente)
  else encuadrar(ctx, principal, ha.x, ha.y, ha.w, ha.h, centroCaja(cajaP, 0.7), 0, true, ajustes.ambiente)
  if (fotos[2]) encuadrar(ctx, fotos[2].img, hd.x, hd.y, hd.w, hd.h, fotos[2].encuadre, 0, true, ajustes.detalle)
  else encuadrar(ctx, principal, hd.x, hd.y, hd.w, hd.h, centroCaja(cajaP, 0.35), 0, true, ajustes.detalle)

  // Título: la última palabra grande y en negrita; el resto, fino y espaciado encima
  const palabras = (datos.nombre || 'Nombre de la obra').toUpperCase().split(/\s+/)
  const grande = palabras.pop()
  const pequeno = palabras.join(' ')
  ctx.fillStyle = TINTA; ctx.textBaseline = 'alphabetic'
  if (pequeno) {
    ctx.font = '300 34px Jost, sans-serif'
    ctx.letterSpacing = '12px'
    ctx.fillText(pequeno, M, 78, 460)
  }
  let tam = 112
  ctx.letterSpacing = '-2px'
  do { ctx.font = '600 ' + tam + 'px Jost, sans-serif'; tam -= 4 }
  while (ctx.measureText(grande).width > 460 && tam > 40)
  ctx.fillText(grande, M - 3, pequeno ? 186 : 160)
  ctx.letterSpacing = '0px'
  ctx.fillStyle = ORO; ctx.fillRect(M, 214, 78, 2)

  // Ficha técnica
  const filas = [
    ['ARTISTA', datos.artista], ['TÉCNICA', datos.tecnica], ['SOPORTE', datos.soporte],
    ['AÑO', datos.anio], ['MEDIDAS', datos.medidas], ['ESTILO', datos.estilo],
  ].filter(f => f[1])
  filas.forEach(([etiqueta, valor], i) => {
    const y = 264 + i * 27
    ctx.fillStyle = GRIS; ctx.font = '400 14px Jost, sans-serif'; ctx.letterSpacing = '4px'
    ctx.fillText(etiqueta + ':', M, y)
    ctx.fillStyle = TINTA; ctx.font = '300 18px Jost, sans-serif'; ctx.letterSpacing = '0.3px'
    ctx.fillText(String(valor), 193, y, 300)
  })
  ctx.letterSpacing = '0px'
  if (filas.length) { ctx.fillStyle = '#9a9a9a'; ctx.fillRect(166, 246, 1, filas.length * 27) }

  // Descripción: se reduce la letra si no cabe sobre el recuadro de precio
  ctx.fillStyle = ORO; ctx.fillRect(535, 697, 106, 2)
  const precio = String(datos.precio || '').trim()
  const limite = precio ? 920 : 1010
  let fs = 24, ls
  do {
    ctx.font = '300 ' + fs + 'px Jost, sans-serif'; ctx.letterSpacing = '0.6px'
    ls = lineas(ctx, datos.descripcion, 415)
    fs -= 1
  } while (735 + ls.length * fs * 1.4 > limite && fs > 14)
  fs += 1
  ctx.fillStyle = TINTA
  ls.forEach((l, i) => ctx.fillText(l, 535, 752 + i * fs * 1.36))
  ctx.letterSpacing = '0px'

  if (precio) {
    ctx.strokeStyle = ORO; ctx.lineWidth = 1.5
    ctx.strokeRect(535, 936, 326, 77)
    ctx.fillStyle = TINTA; ctx.font = '400 16px Jost, sans-serif'; ctx.letterSpacing = '5px'
    ctx.fillText('PRECIO:', 563, 982)
    ctx.letterSpacing = '0px'
    ctx.font = '600 36px Jost, sans-serif'
    ctx.fillText(formatoPrecio(precio), 680, 987, 165)
  }

  if (logo && logo.naturalWidth) {
    const lw = logo.naturalWidth, lh = logo.naturalHeight
    ctx.globalCompositeOperation = 'multiply'
    ctx.drawImage(logo, lw * 0.36, lh * 0.05, lw * 0.30, lh * 0.32, 955, 892, 100, 107)
    ctx.globalCompositeOperation = 'source-over'
  }
}

// Convierte la respuesta de la IA en cajas de encuadre por foto.
export function encuadresDesdeIA(encuadres) {
  const r = {}
  ;(encuadres || []).forEach(e => {
    const n = v => Math.min(1, Math.max(0, Number(v) || 0))
    const caja = { x: n(e.x), y: n(e.y), w: n(e.ancho), h: n(e.alto) }
    caja.w = Math.min(caja.w, 1 - caja.x); caja.h = Math.min(caja.h, 1 - caja.y)
    if (caja.w > 0.05 && caja.h > 0.05) r[(e.foto || 1) - 1] = caja
  })
  return r
}
