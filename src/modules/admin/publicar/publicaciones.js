import { lienzo } from './imagenObra.js'
import { precio as formatoPrecio } from '../../../lib/formato.js'

// Publicaciones para redes con la marca nueva (Plus Jakarta Sans, tinta, crema y mostaza).
export const FORMATOS = [
  { id: 'catalogo', nombre: 'Ficha de catálogo', medida: 'Post 4:5', w: 1080, h: 1350 },
  { id: 'ambiente', nombre: 'Obra en ambiente', medida: 'Post 4:5', w: 1080, h: 1350 },
  { id: 'historia', nombre: 'Historia', medida: '9:16', w: 1080, h: 1920 },
]

const TINTA = '#17181b', CREMA = '#faf8f4', MOSTAZA = '#e8b627', GRIS = '#5d5a55'
const F = (peso, tam, cursiva = false) => `${cursiva ? 'italic ' : ''}${peso} ${tam}px "Plus Jakarta Sans", system-ui, sans-serif`

export async function cargarFuentes() {
  if (!document.fonts) return
  await Promise.all([F(500, 40), F(600, 40), F(700, 40), F(700, 40, true)].map(f => document.fonts.load(f).catch(() => {})))
}

function redondeado(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
}

function cubrir(ctx, img, x, y, w, h, radio = 0) {
  const iw = img.width, ih = img.height
  const e = Math.max(w / iw, h / ih)
  const sw = w / e, sh = h / e
  ctx.save()
  if (radio) { redondeado(ctx, x, y, w, h, radio); ctx.clip() }
  ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, x, y, w, h)
  ctx.restore()
}

function logo(ctx, x, y, claro, escala = 1) {
  const s = escala
  ctx.save()
  ctx.strokeStyle = MOSTAZA; ctx.lineWidth = 5 * s
  ctx.beginPath(); ctx.moveTo(x + 34 * s, y); ctx.lineTo(x, y); ctx.lineTo(x, y + 96 * s); ctx.lineTo(x + 34 * s, y + 96 * s); ctx.stroke()
  ctx.fillStyle = claro ? '#ffffff' : TINTA
  ctx.font = F(700, 34 * s); ctx.textBaseline = 'alphabetic'
  ctx.fillText('Entre tu', x + 20 * s, y + 42 * s)
  ctx.fillText('Arte', x + 20 * s, y + 80 * s)
  ctx.restore()
}

function pastilla(ctx, texto, x, y, { fondo, color, tam = 30, alineado = 'izq' }) {
  ctx.save()
  ctx.font = F(700, tam)
  const w = ctx.measureText(texto).width + tam * 1.3, h = tam * 1.9
  const px = alineado === 'der' ? x - w : alineado === 'centro' ? x - w / 2 : x
  ctx.fillStyle = fondo; redondeado(ctx, px, y, w, h, h / 2); ctx.fill()
  ctx.fillStyle = color; ctx.textBaseline = 'middle'
  ctx.fillText(texto, px + tam * 0.65, y + h / 2 + 1)
  ctx.restore()
  return { w, h }
}

// Divide el título en líneas que caben en "ancho"; la última palabra va resaltada.
function lineasTitulo(ctx, titulo, ancho, tam) {
  const palabras = titulo.trim().split(/\s+/)
  const lineas = []; let actual = ''
  ctx.font = F(600, tam)
  palabras.forEach(p => {
    const prueba = actual ? actual + ' ' + p : p
    if (ctx.measureText(prueba).width > ancho && actual) { lineas.push(actual); actual = p } else actual = prueba
  })
  if (actual) lineas.push(actual)
  return lineas
}

function titulo(ctx, texto, x, y, ancho, { tam = 84, claro = false, resalte = 'subrayado', centro = false, maxLineas = 3 }) {
  let t = tam, lineas
  do { lineas = lineasTitulo(ctx, texto, ancho, t); t -= 4 } while (lineas.length > maxLineas && t > 40)
  t += 4
  const alto = t * 1.02
  lineas.forEach((linea, i) => {
    const ly = y + i * alto
    const ultima = i === lineas.length - 1
    const partes = linea.split(' ')
    const fin = ultima && partes.length > 1 ? partes.pop() : (ultima && lineas.length > 1 ? partes.pop() : null)
    const inicio = partes.join(' ')
    ctx.font = F(600, t)
    const wInicio = inicio ? ctx.measureText(inicio + ' ').width : 0
    ctx.font = F(700, t, true)
    const wFin = fin ? ctx.measureText(fin).width : 0
    let lx = centro ? x + (ancho - wInicio - wFin) / 2 : x
    ctx.textBaseline = 'alphabetic'
    if (inicio) { ctx.font = F(600, t); ctx.fillStyle = claro ? '#fff' : TINTA; ctx.fillText(inicio, lx, ly); lx += wInicio }
    if (fin) {
      if (resalte === 'subrayado') { ctx.fillStyle = MOSTAZA; ctx.fillRect(lx - 4, ly - t * 0.32, wFin + 8, t * 0.36) }
      ctx.font = F(700, t, true); ctx.fillStyle = resalte === 'color' ? MOSTAZA : (claro ? '#fff' : TINTA)
      ctx.fillText(fin, lx, ly)
    }
  })
  return y + (lineas.length - 1) * alto
}

function textoAjustado(ctx, texto, x, y, maxW, fuente, color, alinear = 'left') {
  ctx.save(); ctx.font = fuente; ctx.fillStyle = color; ctx.textAlign = alinear; ctx.textBaseline = 'alphabetic'
  ctx.fillText(texto, x, y, maxW); ctx.restore()
}

/**
 * datos: { nombre, artista, tecnica, medidas, precio, existencias } (textos ya listos)
 * imagenes: { obra: canvas/imagen recortada, ambiente: canvas/imagen de la obra en ambiente }
 */
export function dibujarPublicacion(formatoId, { datos, imagenes }) {
  const fmt = FORMATOS.find(f => f.id === formatoId)
  const c = lienzo(fmt.w, fmt.h)
  const ctx = c.getContext('2d')
  const W = fmt.w, H = fmt.h
  const nombre = datos.nombre || 'Nombre de la obra'
  const p = formatoPrecio(datos.precio)
  const meta = [datos.artista, datos.tecnica, datos.medidas].filter(Boolean).join(' · ')

  if (formatoId === 'catalogo') {
    ctx.fillStyle = CREMA; ctx.fillRect(0, 0, W, H)
    logo(ctx, 64, 56, false)
    if (datos.existencias) pastilla(ctx, datos.existencias, W - 64, 74, { fondo: TINTA, color: '#fff', tam: 26, alineado: 'der' })
    ctx.save(); ctx.shadowColor = 'rgba(23,22,20,0.35)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18
    ctx.fillStyle = '#fff'; redondeado(ctx, 64, 200, W - 128, 690, 44); ctx.fill(); ctx.restore()
    if (imagenes.obra) cubrir(ctx, imagenes.obra, 64, 200, W - 128, 690, 44)
    const fin = titulo(ctx, nombre, 64, 1000, W - 128, { tam: 76, maxLineas: 2 })
    textoAjustado(ctx, meta, 64, fin + 62, W - 128, F(500, 30), GRIS)
    if (p) { ctx.font = F(700, 72); ctx.fillStyle = TINTA; ctx.fillText(p, 64, H - 70) }
    textoAjustado(ctx, 'entretuarte · San Salvador', W - 64, H - 82, 460, F(600, 26), GRIS, 'right')
  }

  if (formatoId === 'ambiente') {
    ctx.fillStyle = '#2b2824'; ctx.fillRect(0, 0, W, H)
    if (imagenes.ambiente) cubrir(ctx, imagenes.ambiente, 0, 0, W, H)
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, 'rgba(20,18,15,0.4)'); g.addColorStop(0.3, 'rgba(20,18,15,0)'); g.addColorStop(0.5, 'rgba(20,18,15,0.1)'); g.addColorStop(1, 'rgba(20,18,15,0.9)')
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    logo(ctx, 64, 56, true)
    const fin = titulo(ctx, nombre, 64, H - 330, W - 128, { tam: 96, claro: true, resalte: 'color', maxLineas: 2 })
    ctx.fillStyle = MOSTAZA; redondeado(ctx, 64, fin + 40, 96, 10, 5); ctx.fill()
    textoAjustado(ctx, [datos.medidas, datos.tecnica].filter(Boolean).join(' · '), 64, H - 92, W - 420, F(500, 32), 'rgba(255,255,255,0.88)')
    if (p) pastilla(ctx, p, W - 64, H - 140, { fondo: MOSTAZA, color: TINTA, tam: 40, alineado: 'der' })
  }

  if (formatoId === 'historia') {
    ctx.fillStyle = TINTA; ctx.fillRect(0, 0, W, H)
    logo(ctx, W / 2 - 100, 120, true, 1.3)
    ctx.textAlign = 'center'
    ctx.font = F(700, 34); ctx.fillStyle = MOSTAZA; ctx.fillText('N U E V A   O B R A', W / 2, 370)
    ctx.textAlign = 'left'
    if (imagenes.obra) {
      const iw = W - 160, ih = 820
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 50; ctx.fillStyle = '#000'; redondeado(ctx, 80, 430, iw, ih, 40); ctx.fill(); ctx.restore()
      cubrir(ctx, imagenes.obra, 80, 430, iw, ih, 40)
    }
    const fin = titulo(ctx, nombre, 80, 1400, W - 160, { tam: 86, claro: true, resalte: 'color', centro: true, maxLineas: 2 })
    textoAjustado(ctx, [datos.medidas, datos.existencias].filter(Boolean).join(' · '), W / 2, fin + 70, W - 160, F(500, 34), 'rgba(255,255,255,0.78)', 'center')
    pastilla(ctx, p ? `Disponible · ${p}` : 'Disponible', W / 2, H - 230, { fondo: MOSTAZA, color: TINTA, tam: 40, alineado: 'centro' })
  }
  return c
}
