// Títulos y descripciones para Google (una sola fuente: la usan la página al navegar y el
// generador de páginas del sitemap, scripts/generar-seo.mjs). Sin imports: también corre en Node.
//
// Posicionamiento: galería de cuadros decorativos pintados a mano en El Salvador.
// No usar «arte original», «obras originales» ni «pinturas originales».

export const SITIO = 'https://entretuarte.com'
export const MARCA = 'Entre tu Arte'
export const TITULO_INICIO = 'Entre tu Arte | Cuadros Decorativos y Pinturas en El Salvador'
export const DESCRIPCION_INICIO = 'Cuadros decorativos pintados a mano en El Salvador. Elegí entre nuestros diseños o personalizá tu pintura según tus gustos, colores, medidas y espacios.'

export const tituloCompleto = t => (t ? `${t} | ${MARCA}` : TITULO_INICIO)

// Páginas fijas
export const PAGINAS_SEO = {
  '/': { titulo: null, descripcion: DESCRIPCION_INICIO },
  '/obras': {
    titulo: 'Cuadros decorativos pintados a mano en El Salvador',
    descripcion: 'Cuadros decorativos pintados a mano en El Salvador: abstractos, modernos y para cada espacio. En existencia o por pedido, a tu medida y en tus colores.',
  },
  '/por-pedido': {
    titulo: 'Cuadros por pedido y a la medida',
    descripcion: 'Pedí tu cuadro decorativo pintado a mano en El Salvador: lo hacemos a tu medida y en tus colores. Elegí un diseño como inspiración o contanos tu idea.',
  },
  '/vendidas': {
    titulo: 'Cuadros por pedido y a la medida',
    descripcion: 'Pedí tu cuadro decorativo pintado a mano en El Salvador: lo hacemos a tu medida y en tus colores. Elegí un diseño como inspiración o contanos tu idea.',
  },
  '/marketplace': {
    titulo: 'Marketplace de cuadros de artistas salvadoreños',
    descripcion: 'Comprá cuadros de artistas salvadoreños y coleccionistas con la seguridad de Entre tu Arte: pago, entrega e instalación coordinados en El Salvador.',
  },
  '/colecciones': {
    titulo: 'Cuadros decorativos para sala, comedor y habitación',
    descripcion: 'Colecciones de cuadros decorativos pintados a mano para sala, comedor, habitación, oficina y más espacios. Encontrá el cuadro ideal en El Salvador.',
  },
  '/artistas': {
    titulo: 'Artistas de cuadros decorativos en El Salvador',
    descripcion: 'Conocé a los artistas salvadoreños que pintan a mano los cuadros decorativos de Entre tu Arte.',
  },
  '/nosotros': {
    titulo: 'Nuestra historia: cuadros decorativos pintados a mano',
    descripcion: 'Somos Entre tu Arte, galería de cuadros decorativos pintados a mano en El Salvador. Adaptamos cada pintura a tu estilo, tus colores, tus medidas y tu espacio.',
  },
  '/asesoria': {
    titulo: 'Asesoría gratis para elegir tu cuadro decorativo',
    descripcion: 'Enviá una foto de tu pared y te recomendamos el cuadro decorativo ideal, el tamaño y la altura de montaje. Asesoría gratis en El Salvador.',
  },
  '/blog': {
    titulo: 'Ideas para decorar con cuadros',
    descripcion: 'Ideas y consejos para decorar tu hogar u oficina con cuadros decorativos: tamaños, colores, estilos y cómo colgarlos.',
  },
  '/vender': {
    titulo: 'Vendé tus cuadros en El Salvador',
    descripcion: 'Artistas y coleccionistas: publicá tus cuadros en Entre tu Arte. Nosotros atendemos a los compradores y coordinamos la venta en El Salvador.',
  },
  '/condiciones-artistas': {
    titulo: 'Condiciones comerciales para artistas',
    descripcion: 'Condiciones del programa de comercialización de cuadros de Entre tu Arte: comisión, pagos, entrega, promoción y responsabilidades.',
  },
  '/carrito': { titulo: 'Tu carrito', descripcion: DESCRIPCION_INICIO },
}

const recortar = (s, n = 158) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t }

// Página de una obra (f: ficha de la base o normalizada)
export function seoObra(f) {
  const nombre = f?.titulo || 'Cuadro decorativo'
  const porPedido = f?.estado === 'vendida' && f?.origen !== 'marketplace'
  const medidas = f?.medidas || f?.medidasTexto || ''
  const base = `${nombre}: cuadro decorativo pintado a mano en El Salvador${medidas ? `, ${medidas}` : ''}.`
  const extra = porPedido ? ' Disponible por pedido, a tu medida y en tus colores.' : f?.descripcion ? ` ${f.descripcion}` : ' Personalizalo según tus colores, medidas y espacio.'
  return {
    titulo: `${nombre} – Cuadro decorativo pintado a mano`,
    descripcion: recortar(base + extra),
  }
}

// Página de un artista
export function seoArtista(a) {
  const nombre = a?.nombre || 'Artista'
  return {
    titulo: `${nombre} – Artista de cuadros decorativos en El Salvador`,
    descripcion: recortar(a?.bio ? `${a.bio} Cuadros decorativos pintados a mano en Entre tu Arte.` : `Cuadros decorativos pintados a mano por ${nombre} en Entre tu Arte, El Salvador.`),
  }
}

// Artículo del blog
export function seoArticulo(b) {
  return {
    titulo: b?.titulo || 'Ideas para decorar con cuadros',
    descripcion: recortar(b?.resumen || b?.contenido || PAGINAS_SEO['/blog'].descripcion),
  }
}

// Cambia el título y la descripción de la página (al navegar dentro de la web)
export function aplicarSEO({ titulo, descripcion } = {}) {
  if (typeof document === 'undefined') return
  document.title = tituloCompleto(titulo)
  const meta = document.querySelector('meta[name="description"]')
  if (meta) meta.setAttribute('content', descripcion || DESCRIPCION_INICIO)
}
