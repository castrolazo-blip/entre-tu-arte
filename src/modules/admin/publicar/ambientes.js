import { lienzo } from './imagenObra.js'

// Salas de muestra dibujadas (pared con luz, piso y mueble) donde se coloca la obra a escala.
// La pared visible mide ANCHO_PARED_CM; la obra se dibuja según sus medidas reales.
export const AMBIENTES = [
  { id: 'sala', nombre: 'Sala clara', pared: ['#efe9df', '#ddd4c6'], piso: ['#cdbfa9', '#b9a88f'], paredCm: 330 },
  { id: 'comedor', nombre: 'Comedor', pared: ['#e8e1d5', '#d2c7b6'], piso: ['#9c8670', '#86705b'], paredCm: 300 },
  { id: 'oficina', nombre: 'Oficina', pared: ['#dedad3', '#c7c1b7'], piso: ['#8f8578', '#7a7065'], paredCm: 300 },
]

function redondeado(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
}

function mueble(ctx, id, W, H, pisoY) {
  ctx.save()
  if (id === 'sala') {
    // Sofá
    const sw = W * 0.62, sx = (W - sw) / 2
    ctx.fillStyle = '#d8cfc1'; redondeado(ctx, sx, pisoY - H * 0.2, sw, H * 0.13, 26); ctx.fill()
    ctx.fillStyle = '#e4dccf'; redondeado(ctx, sx - W * 0.02, pisoY - H * 0.1, sw + W * 0.04, H * 0.1, 22); ctx.fill()
    ctx.fillStyle = '#efe9df'
    redondeado(ctx, sx + sw * 0.08, pisoY - H * 0.17, sw * 0.16, H * 0.08, 16); ctx.fill()
    redondeado(ctx, sx + sw * 0.76, pisoY - H * 0.17, sw * 0.16, H * 0.08, 16); ctx.fill()
    // Planta
    ctx.fillStyle = '#b9a68a'; redondeado(ctx, W * 0.07, pisoY - H * 0.11, W * 0.06, H * 0.11, 10); ctx.fill()
    ctx.fillStyle = '#5f6e57'; ctx.beginPath(); ctx.ellipse(W * 0.1, pisoY - H * 0.2, W * 0.045, H * 0.11, 0, 0, Math.PI * 2); ctx.fill()
  } else if (id === 'comedor') {
    const tw = W * 0.5, tx = (W - tw) / 2
    ctx.fillStyle = '#5a4636'; ctx.fillRect(tx, pisoY - H * 0.15, tw, H * 0.025)
    ctx.fillRect(tx + tw * 0.08, pisoY - H * 0.13, W * 0.012, H * 0.13); ctx.fillRect(tx + tw * 0.92 - W * 0.012, pisoY - H * 0.13, W * 0.012, H * 0.13)
    ctx.fillStyle = '#efe9df'; ctx.beginPath(); ctx.ellipse(W / 2, pisoY - H * 0.17, W * 0.035, H * 0.02, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#c9b89e'
    ;[0.18, 0.82].forEach(f => { redondeado(ctx, W * f - W * 0.04, pisoY - H * 0.2, W * 0.08, H * 0.2, 12); ctx.fill() })
  } else {
    const dw = W * 0.42, dx = W * 0.2
    ctx.fillStyle = '#3b3632'; ctx.fillRect(dx, pisoY - H * 0.15, dw, H * 0.02)
    ctx.fillRect(dx + W * 0.01, pisoY - H * 0.13, W * 0.01, H * 0.13); ctx.fillRect(dx + dw - W * 0.02, pisoY - H * 0.13, W * 0.01, H * 0.13)
    ctx.fillStyle = '#2b2724'; redondeado(ctx, dx + dw * 0.35, pisoY - H * 0.24, dw * 0.3, H * 0.1, 12); ctx.fill()
    ctx.fillStyle = '#b9a68a'; redondeado(ctx, W * 0.74, pisoY - H * 0.3, W * 0.12, H * 0.3, 8); ctx.fill()
  }
  ctx.restore()
}

// obra: canvas o imagen de la obra recortada. cm: { alto, ancho } (opcional).
export function dibujarAmbiente(obra, ambiente, cm = {}, W = 1600, H = 1200) {
  const c = lienzo(W, H)
  const ctx = c.getContext('2d')
  const pisoY = H * 0.8
  // Pared con luz cenital suave
  const gp = ctx.createRadialGradient(W * 0.5, H * 0.05, W * 0.05, W * 0.5, H * 0.35, W * 0.8)
  gp.addColorStop(0, ambiente.pared[0]); gp.addColorStop(1, ambiente.pared[1])
  ctx.fillStyle = gp; ctx.fillRect(0, 0, W, pisoY)
  const gf = ctx.createLinearGradient(0, pisoY, 0, H)
  gf.addColorStop(0, ambiente.piso[0]); gf.addColorStop(1, ambiente.piso[1])
  ctx.fillStyle = gf; ctx.fillRect(0, pisoY, W, H - pisoY)
  ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.fillRect(0, pisoY - 3, W, 6)

  // Tamaño de la obra a escala de la pared (con límites para que siempre se vea bien)
  const pxPorCm = W / ambiente.paredCm
  const ow = obra.width, oh = obra.height
  let anchoPx = cm.ancho ? cm.ancho * pxPorCm : W * 0.34
  let altoPx = cm.alto ? cm.alto * pxPorCm : anchoPx * oh / ow
  if (!cm.alto || !cm.ancho) altoPx = anchoPx * oh / ow
  const maxW = W * 0.6, maxH = pisoY * 0.5
  const f = Math.min(1, maxW / anchoPx, maxH / altoPx)
  anchoPx *= f; altoPx *= f
  const x = (W - anchoPx) / 2
  const y = Math.max(H * 0.08, pisoY * 0.46 - altoPx / 2)

  ctx.save()
  ctx.shadowColor = 'rgba(30,24,18,0.35)'; ctx.shadowBlur = W * 0.02; ctx.shadowOffsetY = W * 0.008
  ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, anchoPx, altoPx)
  ctx.restore()
  ctx.drawImage(obra, x, y, anchoPx, altoPx)
  // Brillo suave de la luz sobre la obra
  const gl = ctx.createLinearGradient(0, y, 0, y + altoPx)
  gl.addColorStop(0, 'rgba(255,255,255,0.07)'); gl.addColorStop(1, 'rgba(0,0,0,0.05)')
  ctx.fillStyle = gl; ctx.fillRect(x, y, anchoPx, altoPx)

  mueble(ctx, ambiente.id, W, H, pisoY)
  return c
}
