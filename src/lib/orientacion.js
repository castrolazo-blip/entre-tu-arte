import { medidaConjunto } from './piezas.js'
// Orientación de una obra: por sus medidas si las tiene; si no, por la foto recortada.
export const ORIENTACIONES = {
  vertical: 'Vertical',
  horizontal: 'Horizontal',
  cuadrada: 'Cuadrada',
  redonda: 'Redonda',
}

export function orientacionPorProporcion(ancho, alto) {
  if (!(ancho > 0) || !(alto > 0)) return null
  const r = ancho / alto
  if (r > 1.08) return 'horizontal'
  if (r < 0.93) return 'vertical'
  return 'cuadrada'
}

// En un juego de varias piezas cuenta el conjunto colgado en fila
export function orientacionPorMedidas(o) {
  const { alto_cm, ancho_cm, diametro_cm } = o
  if (Number(o.piezas) > 1) { const c = medidaConjunto(o); return c ? orientacionPorProporcion(c.ancho, c.alto) : null }
  if (diametro_cm) return 'redonda'
  return orientacionPorProporcion(Number(ancho_cm), Number(alto_cm))
}
