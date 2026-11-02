// Obras en juego: dípticos, trípticos o conjuntos de n piezas.
// piezas = número de piezas (1 = una sola). medidas_piezas = [{alto, ancho}] solo si las
// piezas miden distinto; si miden igual, alto_cm / ancho_cm son la medida de cada pieza.

export function numeroPiezas(o) {
  const n = Math.round(Number(o?.piezas) || 1)
  return Math.min(Math.max(n, 1), 20)
}

export function nombreJuego(n) {
  if (n === 2) return 'Díptico'
  if (n === 3) return 'Tríptico'
  if (n === 4) return 'Políptico de 4 piezas'
  return n > 1 ? `Juego de ${n} piezas` : ''
}

// Etiqueta corta para tarjetas
export function insigniaJuego(n) {
  if (n === 2) return 'Díptico · 2 piezas'
  if (n === 3) return 'Tríptico · 3 piezas'
  return n > 1 ? `Juego de ${n} piezas` : ''
}

// Lista de medidas de cada pieza [{alto, ancho}] (vacía si no hay datos)
export function medidasDePiezas(o) {
  const n = numeroPiezas(o)
  const lista = Array.isArray(o?.medidas_piezas) ? o.medidas_piezas.filter(m => Number(m?.alto) > 0 && Number(m?.ancho) > 0) : []
  if (n > 1 && lista.length) return lista.slice(0, n).map(m => ({ alto: Number(m.alto), ancho: Number(m.ancho) }))
  if (Number(o?.alto_cm) > 0 && Number(o?.ancho_cm) > 0) return Array.from({ length: n }, () => ({ alto: Number(o.alto_cm), ancho: Number(o.ancho_cm) }))
  return []
}

// Tamaño del conjunto colgado en fila, con 5 cm entre piezas
export const SEPARACION_CM = 5
export function medidaConjunto(o) {
  const lista = medidasDePiezas(o)
  if (!lista.length) return null
  return {
    ancho: lista.reduce((s, m) => s + m.ancho, 0) + SEPARACION_CM * (lista.length - 1),
    alto: Math.max(...lista.map(m => m.alto)),
  }
}

// "3 piezas de 60 × 40 cm" o "3 piezas: 80 × 40, 60 × 40 y 80 × 40 cm"
export function textoMedidasJuego(o) {
  const n = numeroPiezas(o)
  const lista = medidasDePiezas(o)
  if (n < 2) return ''
  if (!lista.length) return `${n} piezas`
  const iguales = lista.every(m => m.alto === lista[0].alto && m.ancho === lista[0].ancho)
  if (iguales) return `${n} piezas de ${lista[0].alto} × ${lista[0].ancho} cm`
  const partes = lista.map(m => `${m.alto} × ${m.ancho}`)
  return `${n} piezas: ${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]} cm`
}
