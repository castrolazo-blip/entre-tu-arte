// Cartas con Amor · PDF de impresión por pareja y PDF de resumen.
// Reúne en un solo archivo el texto de las cartas, las fotos, los PDF adjuntos y los Word (DOCX).
// pdf-lib y mammoth se cargan solo al generar, para no hacer pesado el resto del sitio.
import { folioTexto, fecha, rangoFechas, nombreDestinatario, nombrePareja, nombreCompleto } from './constantes.js'

// Nombre para imprimir: completo (hay participantes con el mismo nombre)
const paraQuien = (p, d) => (d === 'ambos' ? nombrePareja(p) : nombreCompleto(p, d))

const ANCHO = 612, ALTO = 792            // Carta (8.5 × 11 in)
const MARGEN = 72
const VINO = [0.478, 0.149, 0.129], ORO = [0.722, 0.537, 0.231], GRIS = [0.4, 0.4, 0.4]

async function iniciar() {
  const lib = await import('pdf-lib')
  const doc = await lib.PDFDocument.create()
  const f = {
    texto: await doc.embedFont(lib.StandardFonts.TimesRoman),
    cursiva: await doc.embedFont(lib.StandardFonts.TimesRomanItalic),
    negrita: await doc.embedFont(lib.StandardFonts.TimesRomanBold),
    sans: await doc.embedFont(lib.StandardFonts.Helvetica),
    sansNegrita: await doc.embedFont(lib.StandardFonts.HelveticaBold),
  }
  const color = c => lib.rgb(...c)
  return { lib, doc, f, color }
}

// Las fuentes estándar del PDF no traen emojis ni algunos símbolos: se cambian o se omiten
const cache = new Map()
function limpiar(texto, fuente) {
  const reemplazos = { '\t': '    ', ' ': ' ', ' ': '\n', ' ': '\n', '❤': '<3', '♥': '<3' }
  let out = ''
  for (const ch of String(texto || '').normalize('NFC')) {
    const c = reemplazos[ch] ?? ch
    if (c === '\n') { out += c; continue }
    const clave = fuente.name + c
    if (!cache.has(clave)) { try { fuente.encodeText(c); cache.set(clave, true) } catch { cache.set(clave, false) } }
    if (cache.get(clave)) out += c
  }
  return out
}

function partirLineas(texto, fuente, tamano, ancho) {
  const lineas = []
  for (const parrafo of limpiar(texto, fuente).replace(/\r\n?/g, '\n').split('\n')) {
    if (!parrafo.trim()) { lineas.push(''); continue }
    let actual = ''
    for (const palabra of parrafo.split(/ +/)) {
      const prueba = actual ? actual + ' ' + palabra : palabra
      if (fuente.widthOfTextAtSize(prueba, tamano) <= ancho) { actual = prueba; continue }
      if (actual) lineas.push(actual)
      // Palabra más larga que la línea (p. ej. un enlace): se corta
      let resto = palabra
      while (fuente.widthOfTextAtSize(resto, tamano) > ancho) {
        let n = resto.length
        while (n > 1 && fuente.widthOfTextAtSize(resto.slice(0, n), tamano) > ancho) n--
        lineas.push(resto.slice(0, n)); resto = resto.slice(n)
      }
      actual = resto
    }
    lineas.push(actual)
  }
  while (lineas.length && !lineas[lineas.length - 1]) lineas.pop()
  return lineas
}

const centrado = (pagina, texto, y, fuente, tamano, color) => {
  const t = limpiar(texto, fuente)
  pagina.drawText(t, { x: (ANCHO - fuente.widthOfTextAtSize(t, tamano)) / 2, y, size: tamano, font: fuente, color })
}

function adorno(ctx, pagina, y) {
  pagina.drawLine({ start: { x: ANCHO / 2 - 60, y }, end: { x: ANCHO / 2 + 60, y }, thickness: 0.8, color: ctx.color(ORO) })
}

function encabezado(ctx, pagina, linea) {
  const t = limpiar(linea, ctx.f.cursiva)
  pagina.drawText(t, { x: MARGEN, y: ALTO - 44, size: 9.5, font: ctx.f.cursiva, color: ctx.color(GRIS) })
  pagina.drawLine({ start: { x: MARGEN, y: ALTO - 52 }, end: { x: ANCHO - MARGEN, y: ALTO - 52 }, thickness: 0.4, color: ctx.color(ORO) })
}

function escribirTexto(ctx, texto, linea) {
  const tam = 12.5, alto = 19
  const lineas = partirLineas(texto, ctx.f.texto, tam, ANCHO - MARGEN * 2)
  let pagina = null, y = 0
  for (const l of lineas) {
    if (!pagina || y < MARGEN) {
      pagina = ctx.doc.addPage([ANCHO, ALTO]); encabezado(ctx, pagina, linea); y = ALTO - MARGEN - 18
    }
    if (l) pagina.drawText(l, { x: MARGEN, y, size: tam, font: ctx.f.texto, color: ctx.color([0.1, 0.1, 0.1]) })
    y -= alto
  }
}

function paginaAviso(ctx, titulo, detalle, linea) {
  const p = ctx.doc.addPage([ANCHO, ALTO]); encabezado(ctx, p, linea)
  centrado(p, titulo, ALTO / 2 + 10, ctx.f.negrita, 14, ctx.color(VINO))
  centrado(p, detalle, ALTO / 2 - 14, ctx.f.texto, 11, ctx.color(GRIS))
}

async function agregarImagen(ctx, bytes, tipo, linea) {
  const img = tipo === 'image/png' ? await ctx.doc.embedPng(bytes) : await ctx.doc.embedJpg(bytes)
  const p = ctx.doc.addPage([ANCHO, ALTO]); encabezado(ctx, p, linea)
  const maxW = ANCHO - 72, maxH = ALTO - 100
  const escala = Math.min(maxW / img.width, maxH / img.height, 1.5)
  const w = img.width * escala, h = img.height * escala
  p.drawImage(img, { x: (ANCHO - w) / 2, y: (ALTO - 62 - h) / 2 + 6, width: w, height: h })
}

async function agregarPdf(ctx, bytes) {
  const origen = await ctx.lib.PDFDocument.load(bytes, { ignoreEncryption: true })
  const paginas = await ctx.doc.copyPages(origen, origen.getPageIndices())
  paginas.forEach(p => ctx.doc.addPage(p))
}

async function textoDocx(bytes) {
  const mammoth = (await import('mammoth/mammoth.browser.js')).default
  const { value } = await mammoth.extractRawText({ arrayBuffer: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) })
  return value
}

function portada(ctx, { retiro, pareja, total }) {
  const p = ctx.doc.addPage([ANCHO, ALTO])
  p.drawRectangle({ x: 36, y: 36, width: ANCHO - 72, height: ALTO - 72, borderColor: ctx.color(ORO), borderWidth: 0.8 })
  centrado(p, 'Cartas con Amor', ALTO - 250, ctx.f.cursiva, 40, ctx.color(VINO))
  adorno(ctx, p, ALTO - 275)
  centrado(p, 'para', ALTO - 320, ctx.f.cursiva, 16, ctx.color(GRIS))
  const np = nombrePareja(pareja)
  centrado(p, np, ALTO - 356, ctx.f.texto, np.length > 34 ? 20 : 26, ctx.color([0.12, 0.12, 0.12]))
  centrado(p, retiro.nombre, 150, ctx.f.texto, 13, ctx.color(GRIS))
  if (retiro.inicio) centrado(p, rangoFechas(retiro.inicio, retiro.fin), 130, ctx.f.cursiva, 11, ctx.color(GRIS))
  centrado(p, `${total} ${total === 1 ? 'carta' : 'cartas'}`, 100, ctx.f.texto, 10, ctx.color(ORO))
}

function separador(ctx, { carta, pareja }) {
  const p = ctx.doc.addPage([ANCHO, ALTO])
  p.drawRectangle({ x: 36, y: 36, width: ANCHO - 72, height: ALTO - 72, borderColor: ctx.color(ORO), borderWidth: 0.6 })
  centrado(p, 'Para', ALTO / 2 + 90, ctx.f.cursiva, 16, ctx.color(GRIS))
  const nombre = paraQuien(pareja, carta.destinatario)
  centrado(p, nombre, ALTO / 2 + 50, ctx.f.cursiva, nombre.length > 30 ? 22 : 30, ctx.color(VINO))
  adorno(ctx, p, ALTO / 2 + 25)
  centrado(p, 'con amor de', ALTO / 2 - 10, ctx.f.cursiva, 14, ctx.color(GRIS))
  centrado(p, carta.remitente_nombre, ALTO / 2 - 42, ctx.f.texto, 20, ctx.color([0.12, 0.12, 0.12]))
  if (carta.relacion) centrado(p, carta.relacion, ALTO / 2 - 64, ctx.f.cursiva, 12, ctx.color(GRIS))
  centrado(p, folioTexto(carta.folio), 60, ctx.f.sans, 7, ctx.color([0.7, 0.7, 0.7]))
}

/**
 * cartas: [{ carta, texto, archivos: [{ nombre_original, tipo, ruta, ilegible }] }] en el orden de impresión
 * leerArchivo(ruta) → Uint8Array
 * Devuelve { blob, problemas: [{ folio, archivo, error }] }
 */
export async function pdfDePareja({ retiro, pareja, cartas, conPortada = true, conSeparadores = true, leerArchivo, alAvanzar }) {
  const ctx = await iniciar()
  const problemas = []
  if (conPortada) portada(ctx, { retiro, pareja, total: cartas.length })
  let i = 0
  for (const { carta, texto, archivos } of cartas) {
    alAvanzar?.(++i, cartas.length)
    const linea = `Para ${paraQuien(pareja, carta.destinatario)} · de ${carta.remitente_nombre} · ${pareja.codigo}`
    if (conSeparadores) separador(ctx, { carta, pareja })
    if (texto?.trim()) escribirTexto(ctx, texto, linea)
    for (const a of archivos || []) {
      try {
        const bytes = await leerArchivo(a.ruta)
        if (a.tipo === 'application/pdf') await agregarPdf(ctx, bytes)
        else if (a.tipo.startsWith('image/')) await agregarImagen(ctx, bytes, a.tipo, linea)
        else if (a.tipo.includes('wordprocessingml')) escribirTexto(ctx, await textoDocx(bytes), linea)
      } catch (e) {
        problemas.push({ folio: carta.folio, archivo: a.nombre_original, error: String(e?.message || e) })
        paginaAviso(ctx, 'No se pudo incluir un archivo', `${a.nombre_original} (${folioTexto(carta.folio)}): revisar el original`, linea)
      }
    }
    if (!texto?.trim() && !(archivos || []).length) paginaAviso(ctx, 'Carta sin contenido', folioTexto(carta.folio), linea)
  }
  ctx.doc.setTitle(`Cartas para ${nombrePareja(pareja)}`)
  ctx.doc.setCreator('Cartas con Amor')
  const bytes = await ctx.doc.save()
  return { blob: new Blob([bytes], { type: 'application/pdf' }), problemas }
}

// Lista de control para la entrega física (una línea por carta, con casilla)
export async function pdfControl({ retiro, filas }) {
  const ctx = await iniciar()
  let p = null, y = 0
  const nueva = () => {
    p = ctx.doc.addPage([ANCHO, ALTO]); y = ALTO - 60
    p.drawText(limpiar(`Lista de cartas · ${retiro.nombre}`, ctx.f.sansNegrita), { x: 40, y, size: 12, font: ctx.f.sansNegrita, color: ctx.color(VINO) })
    y -= 16
    p.drawText(`Generado el ${fecha(new Date().toISOString(), true)}`, { x: 40, y, size: 8, font: ctx.f.sans, color: ctx.color(GRIS) })
    y -= 24
    const cab = ['', 'Folio', 'Pareja', 'Para', 'De', 'Origen']
    const xs = [40, 60, 115, 270, 370, 500]
    cab.forEach((t, i) => p.drawText(t, { x: xs[i], y, size: 8, font: ctx.f.sansNegrita }))
    y -= 14
  }
  nueva()
  const xs = [40, 60, 115, 270, 370, 500], anchos = [0, 50, 150, 95, 125, 80]
  const corta = (t, w) => { let s = limpiar(t, ctx.f.sans); while (s && ctx.f.sans.widthOfTextAtSize(s, 8) > w) s = s.slice(0, -1); return s }
  for (const f of filas) {
    if (y < 50) nueva()
    p.drawRectangle({ x: 40, y: y - 2, width: 9, height: 9, borderColor: ctx.color(GRIS), borderWidth: 0.6 })
    ;[null, f.folio, f.pareja, f.para, f.de, f.estado].forEach((t, i) => { if (i) p.drawText(corta(t, anchos[i] - 4), { x: xs[i], y, size: 8, font: ctx.f.sans }) })
    y -= 15
  }
  return new Blob([await ctx.doc.save()], { type: 'application/pdf' })
}

// Resumen del retiro: totales y avance por pareja
export async function pdfResumen({ retiro, totales, filas }) {
  const ctx = await iniciar()
  let p = ctx.doc.addPage([ANCHO, ALTO]); let y = ALTO - 60
  p.drawText(limpiar('Cartas con Amor · Resumen', ctx.f.sansNegrita), { x: 40, y, size: 15, font: ctx.f.sansNegrita, color: ctx.color(VINO) })
  y -= 18
  p.drawText(limpiar(`${retiro.nombre}${retiro.inicio ? ' · ' + rangoFechas(retiro.inicio, retiro.fin) : ''}`, ctx.f.sans), { x: 40, y, size: 10, font: ctx.f.sans })
  y -= 13
  p.drawText(`Generado el ${fecha(new Date().toISOString(), true)}`, { x: 40, y, size: 8, font: ctx.f.sans, color: ctx.color(GRIS) })
  y -= 28
  const kpis = Object.entries(totales)
  kpis.forEach(([k, v], i) => {
    const x = 40 + (i % 3) * 180, yy = y - Math.floor(i / 3) * 38
    p.drawText(String(v), { x, y: yy, size: 16, font: ctx.f.sansNegrita, color: ctx.color(VINO) })
    p.drawText(limpiar(k, ctx.f.sans), { x, y: yy - 12, size: 8, font: ctx.f.sans, color: ctx.color(GRIS) })
  })
  y -= Math.ceil(kpis.length / 3) * 38 + 16
  const xs = [40, 90, 290, 350, 410, 470, 530]
  const cab = ['Código', 'Pareja', 'Recibidas', 'Esposo', 'Esposa', 'Faltan', 'Estado']
  const cabecera = () => { cab.forEach((t, i) => p.drawText(t, { x: xs[i], y, size: 8, font: ctx.f.sansNegrita })); y -= 14 }
  cabecera()
  for (const f of filas) {
    if (y < 50) { p = ctx.doc.addPage([ANCHO, ALTO]); y = ALTO - 60; cabecera() }
    let nombre = limpiar(f.pareja, ctx.f.sans)
    while (ctx.f.sans.widthOfTextAtSize(nombre, 8) > 190) nombre = nombre.slice(0, -1)
    ;[f.codigo, nombre, f.recibidas, f.paraA, f.paraB, f.faltan, f.estado]
      .forEach((t, i) => p.drawText(limpiar(String(t ?? ''), ctx.f.sans), { x: xs[i], y, size: 8, font: ctx.f.sans }))
    y -= 13
  }
  return new Blob([await ctx.doc.save()], { type: 'application/pdf' })
}

// Etiquetas para los sobres: una por persona (10 por hoja carta), con nombre completo y número de cartas
export async function pdfEtiquetas({ retiro, personas }) {
  const ctx = await iniciar()
  const W = 270, H = 136, X0 = 36, Y0 = ALTO - 50
  personas.forEach((e, i) => {
    if (i % 10 === 0) ctx.doc.addPage([ANCHO, ALTO])
    const p = ctx.doc.getPages()[ctx.doc.getPageCount() - 1]
    const col = i % 2, fila = Math.floor((i % 10) / 2)
    const x = X0 + col * (W + 0), y = Y0 - (fila + 1) * H
    p.drawRectangle({ x: x + 4, y: y + 4, width: W - 8, height: H - 8, borderColor: ctx.color(ORO), borderWidth: 0.6 })
    const t = (texto, dy, fuente, tam, color = [0.12, 0.12, 0.12]) => {
      let s = limpiar(texto, fuente), tm = tam
      while (fuente.widthOfTextAtSize(s, tm) > W - 30 && tm > 8) tm -= 0.5
      p.drawText(s, { x: x + (W - fuente.widthOfTextAtSize(s, tm)) / 2, y: y + dy, size: tm, font: fuente, color: ctx.color(color) })
    }
    t('Para', H - 34, ctx.f.cursiva, 11, GRIS)
    t(e.nombre, H - 58, ctx.f.negrita, 16, VINO)
    t(e.matrimonio, H - 80, ctx.f.texto, 11.5)
    t(`${e.codigo} · ${e.cartas} ${e.cartas === 1 ? 'carta' : 'cartas'}`, 26, ctx.f.sans, 8.5, GRIS)
    t(retiro.nombre, 14, ctx.f.cursiva, 8, GRIS)
  })
  return new Blob([await ctx.doc.save()], { type: 'application/pdf' })
}
