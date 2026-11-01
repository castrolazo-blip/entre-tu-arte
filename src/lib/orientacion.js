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

export function orientacionPorMedidas({ alto_cm, ancho_cm, diametro_cm }) {
  if (diametro_cm) return 'redonda'
  return orientacionPorProporcion(Number(ancho_cm), Number(alto_cm))
}
