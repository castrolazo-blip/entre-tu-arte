// Prepara el sitio para Google después de `vite build` (se ejecuta en GitHub Actions):
//  1. dist/sitemap.xml con las páginas fijas + obras, artistas y artículos publicados.
//  2. Una copia de index.html por cada página pública (p. ej. dist/obras.html, dist/obra/12.html)
//     con su título, descripción, enlace canónico y vista previa para redes. Así GitHub Pages
//     responde 200 en esas direcciones (antes caían en 404.html y Google no las indexa).
// Si Supabase no responde, se publican solo las páginas fijas y la publicación sigue adelante.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { SITIO, PAGINAS_SEO, tituloCompleto, seoObra, seoArtista, seoArticulo } from '../src/lib/seo.js'

const DIST = 'dist'
const base = readFileSync(join(DIST, 'index.html'), 'utf8')

// URL y llave pública de Supabase: se leen de src/lib/supabase.js para no duplicarlas
const conf = readFileSync('src/lib/supabase.js', 'utf8')
const SUPABASE_URL = /SUPABASE_URL\s*=\s*'([^']+)'/.exec(conf)?.[1]
const ANON = /SUPABASE_ANON_KEY\s*=\s*'([^']+)'/.exec(conf)?.[1]

// Prioridad y frecuencia para el sitemap; título y descripción salen de src/lib/seo.js
const PAGINAS = [
  { ruta: '/', prioridad: '1.0', frecuencia: 'daily' },
  { ruta: '/obras', prioridad: '0.9', frecuencia: 'daily' },
  { ruta: '/por-pedido', prioridad: '0.8', frecuencia: 'weekly' },
  { ruta: '/marketplace', prioridad: '0.8', frecuencia: 'daily' },
  { ruta: '/colecciones', prioridad: '0.7', frecuencia: 'weekly' },
  { ruta: '/artistas', prioridad: '0.7', frecuencia: 'weekly' },
  { ruta: '/nosotros', prioridad: '0.7', frecuencia: 'monthly' },
  { ruta: '/asesoria', prioridad: '0.6', frecuencia: 'monthly' },
  { ruta: '/blog', prioridad: '0.6', frecuencia: 'weekly' },
  { ruta: '/condiciones-artistas', prioridad: '0.3', frecuencia: 'yearly' },
  { ruta: '/vender', prioridad: '0.5', frecuencia: 'monthly' },
].map(p => ({ ...p, ...(PAGINAS_SEO[p.ruta] || {}) }))

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const recortar = (s, n = 160) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t }
const fecha = v => { const d = v ? new Date(v) : null; return d && !isNaN(d) ? d.toISOString().slice(0, 10) : null }

async function leer(tabla, consulta) {
  if (!SUPABASE_URL || !ANON) return []
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${tabla}?${consulta}`, {
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}` }, signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) { console.warn(`  ${tabla}: respuesta ${res.status}, se omite`); return [] }
    return await res.json()
  } catch (e) { console.warn(`  ${tabla}: ${e.message}, se omite`); return [] }
}

// Página HTML con sus propios metadatos (mismo contenido que index.html; la app carga igual)
function pagina({ ruta, titulo, descripcion, imagen, datos }) {
  const url = SITIO + ruta
  let html = base
  const reemplazar = (patron, valor) => { html = html.replace(patron, valor) }
  if (titulo) {
    const t = esc(tituloCompleto(titulo))
    reemplazar(/<title>[^<]*<\/title>/, `<title>${t}</title>`)
    reemplazar(/(<meta property="og:title" content=")[^"]*(")/, `$1${t}$2`)
  }
  if (descripcion) {
    const d = esc(recortar(descripcion))
    reemplazar(/(<meta name="description" content=")[^"]*(")/, `$1${d}$2`)
    reemplazar(/(<meta property="og:description" content=")[^"]*(")/, `$1${d}$2`)
  }
  if (imagen) reemplazar(/(<meta property="og:image" content=")[^"]*(")/, `$1${esc(imagen)}$2`)
  reemplazar(/(<link rel="canonical" href=")[^"]*(")/, `$1${esc(url)}$2`)
  reemplazar(/(<meta property="og:url" content=")[^"]*(")/, `$1${esc(url)}$2`)
  // Datos estructurados de la página (p. ej. producto con precio y disponibilidad)
  if (datos) html = html.replace('</head>', () => `<script type="application/ld+json">${JSON.stringify(datos).replace(/</g, '\\u003c')}</script></head>`)
  if (ruta !== '/') {
    const archivo = join(DIST, ruta.slice(1) + '.html')
    mkdirSync(dirname(archivo), { recursive: true })
    writeFileSync(archivo, html)
  }
}

const urls = PAGINAS.map(p => ({ loc: SITIO + p.ruta, prioridad: p.prioridad, frecuencia: p.frecuencia }))
PAGINAS.forEach(pagina)

console.log('Leyendo contenido publicado de Supabase…')
const [fichas, artistas, blogs] = await Promise.all([
  leer('fichas', 'select=*&estado=neq.borrador&order=created_at.desc'),
  leer('artistas', 'select=*&activo=eq.true'),
  leer('blogs', 'select=*&publicado=eq.true'),
])

for (const f of fichas) {
  const marketplace = f.origen === 'marketplace'
  if (marketplace && f.estado === 'vendida') continue   // ya no se puede comprar
  const foto = (Array.isArray(f.fotos) && f.fotos.find(x => x?.url)?.url) || f.imagen_url || null
  const ruta = `/obra/${f.id}`
  const seo = seoObra(f)
  const precio = Number(f.precio) || 0
  const datos = {
    '@context': 'https://schema.org', '@type': 'Product',
    name: f.titulo || 'Cuadro decorativo', description: seo.descripcion,
    image: foto || undefined, category: 'Cuadros decorativos', brand: { '@type': 'Brand', name: 'Entre tu Arte' },
    ...(precio ? { offers: {
      '@type': 'Offer', url: SITIO + ruta, priceCurrency: 'USD', price: precio,
      availability: f.estado === 'vendida' ? 'https://schema.org/PreOrder' : f.estado === 'reservada' ? 'https://schema.org/LimitedAvailability' : 'https://schema.org/InStock',
      areaServed: 'SV',
    } } : {}),
  }
  pagina({ ruta, ...seo, imagen: foto, datos })
  urls.push({ loc: SITIO + ruta, lastmod: fecha(f.updated_at || f.created_at), prioridad: '0.8', frecuencia: 'weekly', imagen: foto, tituloImagen: f.titulo })
}
for (const a of artistas) {
  if (!a.slug) continue
  const ruta = `/artistas/${encodeURIComponent(a.slug)}`
  pagina({ ruta, ...seoArtista(a), imagen: a.foto_url })
  urls.push({ loc: SITIO + ruta, lastmod: fecha(a.updated_at || a.created_at), prioridad: '0.6', frecuencia: 'weekly' })
}
for (const b of blogs) {
  const ruta = `/blog/${b.id}`
  pagina({ ruta, ...seoArticulo(b), imagen: b.portada_url || b.imagen_url })
  urls.push({ loc: SITIO + ruta, lastmod: fecha(b.updated_at || b.created_at), prioridad: '0.5', frecuencia: 'monthly' })
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.map(u => `  <url>
    <loc>${esc(u.loc)}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>${u.frecuencia}</changefreq>
    <priority>${u.prioridad}</priority>${u.imagen ? `\n    <image:image><image:loc>${esc(u.imagen)}</image:loc>${u.tituloImagen ? `<image:title>${esc(u.tituloImagen)}</image:title>` : ''}</image:image>` : ''}
  </url>`).join('\n')}
</urlset>
`
writeFileSync(join(DIST, 'sitemap.xml'), xml)
console.log(`sitemap.xml: ${urls.length} direcciones (${fichas.length} obras leídas, ${artistas.length} artistas, ${blogs.length} artículos)`)
