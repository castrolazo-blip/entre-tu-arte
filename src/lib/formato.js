import { textoMedidasJuego } from './piezas.js'
// Utilidades de presentación compartidas por la tienda y el panel de administración.

export function precio(valor) {
  const n = Number(valor)
  if (valor === null || valor === undefined || valor === '' || !(n >= 0)) return ''
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })
}

export function numero(texto) {
  const n = parseFloat(String(texto ?? '').replace(/[$\s,]/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export function slugify(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function medidasTexto({ alto_cm, ancho_cm, diametro_cm, medidas, piezas, medidas_piezas }) {
  if (Number(piezas) > 1) return textoMedidasJuego({ alto_cm, ancho_cm, piezas, medidas_piezas })
  if (diametro_cm) return `${Number(diametro_cm)} cm de diámetro`
  if (alto_cm && ancho_cm) return `${Number(alto_cm)} × ${Number(ancho_cm)} cm`
  return medidas || ''
}

export function fechaCorta(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('es-SV', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function mesAnio(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('es-SV', { month: 'long', year: 'numeric' })
}
