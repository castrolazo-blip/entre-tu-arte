// Cartas con Amor · CSV (importar/exportar para Excel), descargas y ZIP de respaldo.

// Lee CSV con comillas; detecta "," o ";" (Excel en español suele guardar con ";")
export function leerCSV(texto) {
  const limpio = texto.replace(/^﻿/, '')
  const primera = limpio.split(/\r?\n/)[0] || ''
  const sep = (primera.match(/;/g) || []).length > (primera.match(/,/g) || []).length ? ';' : ','
  const filas = []
  let fila = [], campo = '', comillas = false
  for (let i = 0; i < limpio.length; i++) {
    const c = limpio[i]
    if (comillas) {
      if (c === '"' && limpio[i + 1] === '"') { campo += '"'; i++ }
      else if (c === '"') comillas = false
      else campo += c
    } else if (c === '"') comillas = true
    else if (c === sep) { fila.push(campo); campo = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && limpio[i + 1] === '\n') i++
      fila.push(campo); filas.push(fila); fila = []; campo = ''
    } else campo += c
  }
  if (campo || fila.length) { fila.push(campo); filas.push(fila) }
  const utiles = filas.filter(f => f.some(v => v.trim()))
  if (!utiles.length) return []
  const norm = s => s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_')
  const encabezados = utiles[0].map(norm)
  return utiles.slice(1).map(f => Object.fromEntries(encabezados.map((h, i) => [h, (f[i] || '').trim()])))
}

export function aCSV(filas, columnas) {
  const esc = v => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lineas = [columnas.map(c => esc(c.titulo)).join(',')]
  for (const f of filas) lineas.push(columnas.map(c => esc(typeof c.valor === 'function' ? c.valor(f) : f[c.valor])).join(','))
  return '﻿' + lineas.join('\r\n')   // BOM: Excel respeta tildes y eñes
}

export function descargar(contenido, nombre, tipo = 'text/csv;charset=utf-8') {
  const blob = contenido instanceof Blob ? contenido : new Blob([contenido], { type: tipo })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = nombre
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export const nombreArchivo = s => String(s || 'archivo').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'archivo'

// entradas: { 'carpeta/archivo.pdf': Uint8Array | string }
export async function crearZip(entradas) {
  const { zipSync, strToU8 } = await import('fflate')
  const datos = {}
  for (const [ruta, contenido] of Object.entries(entradas)) {
    datos[ruta] = [typeof contenido === 'string' ? strToU8(contenido) : contenido, { level: /\.(jpe?g|png|pdf|docx|zip)$/i.test(ruta) ? 0 : 6 }]
  }
  return new Blob([zipSync(datos)], { type: 'application/zip' })
}

export const PLANTILLA_PAREJAS = 'codigo,nombre_a,nombre_b,contacto_a,contacto_b,notas\r\nP01,María López,Juan Pérez,7000-0000,7000-0001,\r\n'
export const PLANTILLA_REMITENTES = 'codigo_pareja,nombre,telefono,correo,relacion,destinatario\r\nP01,Ana Pérez,7000-0002,,Hija,ambos\r\nP01,Rosa López,,rosa@correo.com,Mamá de María,A\r\n'
