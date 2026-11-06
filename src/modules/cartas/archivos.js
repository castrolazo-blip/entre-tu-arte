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

// ── Excel (.xlsx) sin librerías: un .xlsx es un ZIP con XML. Devuelve filas de la primera hoja. ──
export async function leerXLSX(file) {
  const { unzipSync, strFromU8 } = await import('fflate')
  const zip = unzipSync(new Uint8Array(await file.arrayBuffer()))
  const xml = ruta => (zip[ruta] ? new DOMParser().parseFromString(strFromU8(zip[ruta]), 'application/xml') : null)
  const compartidos = [...(xml('xl/sharedStrings.xml')?.getElementsByTagName('si') || [])]
    .map(si => [...si.getElementsByTagName('t')].map(t => t.textContent).join(''))
  // Primera hoja según el libro (no siempre es sheet1.xml)
  const libro = xml('xl/workbook.xml'), rels = xml('xl/_rels/workbook.xml.rels')
  const rid = libro?.getElementsByTagName('sheet')[0]?.getAttribute('r:id')
  const destino = [...(rels?.getElementsByTagName('Relationship') || [])].find(r => r.getAttribute('Id') === rid)?.getAttribute('Target')
  const hoja = xml(destino ? 'xl/' + destino.replace(/^\/?xl\//, '') : 'xl/worksheets/sheet1.xml')
  if (!hoja) throw new Error('No se encontró la hoja del Excel')
  const col = ref => [...ref.replace(/\d+/g, '')].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1
  const filas = []
  for (const row of hoja.getElementsByTagName('row')) {
    const fila = []
    for (const c of row.getElementsByTagName('c')) {
      const t = c.getAttribute('t'), v = c.getElementsByTagName('v')[0]?.textContent
      let valor = ''
      if (t === 's') valor = compartidos[Number(v)] ?? ''
      else if (t === 'inlineStr') valor = [...c.getElementsByTagName('t')].map(x => x.textContent).join('')
      else valor = v ?? ''
      fila[col(c.getAttribute('r'))] = String(valor).replace(/ /g, ' ').trim()
    }
    filas.push(Array.from(fila, v => v ?? ''))
  }
  return filas.filter(f => f.some(Boolean))
}

// Teléfono de El Salvador: deja solo 8 dígitos (o con 503). Un DUI u otro dato no es teléfono.
export function limpiarTelefono(v) {
  const d = String(v || '').replace(/\D/g, '')
  if (/dui/i.test(String(v))) return ''
  if (d.length === 8) return d
  if (d.length === 11 && d.startsWith('503')) return d.slice(3)
  return d.length >= 10 ? d : ''
}

const clave = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

// Formato del Excel de inscripción de Renova: una fila por matrimonio y dos contactos de la familia
export function interpretarInscripcion(filas) {
  const enc = filas[0].map(clave)
  const i = (...nombres) => { for (const n of nombres) { const k = enc.indexOf(clave(n)); if (k >= 0) return k } return -1 }
  const c = {
    num: i('Num Pareja'), resp: i('RESPONSABLE'), apMat: i('APELLIDOS MATRIMONIO'),
    apA: i('APELLIDOS ESPOSO'), nomA: i('NOMBRES'), apodoA: i('LE GUSTA QUE LE DIGAN'), celA: i('CELULAR'),
    apB: i('APELLIDOS ESPOSA'), nomB: i('NOMBRES2'), apodoB: i('LE GUSTA QUE LE DIGAN2'), celB: i('CELULAR2'),
    inv: i('INVITADOS POR'), celInv: i('CELULAR3'),
    c1: i('NOMBRE 1er CONTACTO'), r1: i('RELACIÓN'), t1: i('CELULAR4'),
    c2: i('Nombre segundo contacto'), r2: i('Relación o parentesco 2'), t2: i('Celular 23'),
  }
  if (c.nomA < 0 || c.nomB < 0 || c.apMat < 0) return null      // no es el formato de inscripción
  const v = (f, k) => (k >= 0 ? f[k] || '' : '')
  // "pichinte choussy" → "Pichinte Choussy", sin tocar "de", "del", "la", "y"
  const capital = s => s.replace(/\s+/g, ' ').trim().replace(/(^|\s)(\p{Ll})(\p{L}*)/gu,
    (m, a, b, r) => (/^(de|del|la|las|los|y)$/.test(b + r) ? m : a + b.toUpperCase() + r))
  return filas.slice(1).filter(f => v(f, c.nomA) || v(f, c.nomB)).map((f, n) => {
    const num = v(f, c.num) || String(n + 1)
    const contactos = [[c.c1, c.r1, c.t1], [c.c2, c.r2, c.t2]]
      .map(([a, b, t]) => ({ nombre: capital(v(f, a)), relacion: v(f, b), telefono: limpiarTelefono(v(f, t)), original: v(f, t) }))
      .filter(x => x.nombre)
    const invitados = [v(f, c.inv), v(f, c.celInv)].filter(Boolean).join(' · ')
    return {
      pareja: {
        codigo: 'P' + String(num).padStart(2, '0'),
        nombre_a: capital(v(f, c.nomA)), apellidos_a: capital(v(f, c.apA)), apodo_a: capital(v(f, c.apodoA)) || null, contacto_a: limpiarTelefono(v(f, c.celA)) || null,
        nombre_b: capital(v(f, c.nomB)), apellidos_b: capital(v(f, c.apB)), apodo_b: capital(v(f, c.apodoB)) || null, contacto_b: limpiarTelefono(v(f, c.celB)) || null,
        apellidos: capital(v(f, c.apMat)) || null, responsable: v(f, c.resp) || null, invitados_por: invitados || null,
      },
      contactos,
    }
  })
}
