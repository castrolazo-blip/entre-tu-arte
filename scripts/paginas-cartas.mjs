// Cartas con Amor (módulo temporal): copias de index.html para /cartas/enviar, /cartas/entrar y /cartas/panel.
// Así GitHub Pages responde 200 y la vista previa de WhatsApp muestra "Cartas con Amor" (no la tienda).
// Todas llevan noindex: no deben aparecer en Google. Para quitar el módulo, borra este archivo y su paso en publicar.yml.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const base = readFileSync('dist/index.html', 'utf8')
const esc = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

function pagina(titulo, descripcion, imagen) {
  return base
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(titulo)}</title>`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(descripcion)}" />\n    <meta name="robots" content="noindex, nofollow" />`)
    .replace(/<meta name="theme-color"[^>]*>/, '<meta name="theme-color" content="#7a2621" />')
    .replace(/<link rel="canonical"[^>]*>\n?\s*/, '')
    .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${esc(titulo)}" />`)
    .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${esc(descripcion)}" />`)
    .replace(/<meta property="og:site_name"[^>]*>/, '<meta property="og:site_name" content="Cartas con Amor" />')
    .replace(/<meta property="og:url"[^>]*>\n?\s*/, '')
    .replace(/<meta property="og:image"[^>]*>/, imagen ? `<meta property="og:image" content="${imagen}" />` : '')
    .replace(/<script type="application\/ld\+json">.*?<\/script>\n?\s*/s, '')
}

mkdirSync('dist/cartas', { recursive: true })
writeFileSync('dist/cartas/enviar.html', pagina('Escribe una carta · Cartas con Amor',
  'Escribe una carta para una pareja que vivirá un encuentro matrimonial. Es privada y será una sorpresa.',
  'https://entretuarte.com/cartas/renova-rojo.png'))
writeFileSync('dist/cartas/equipo.html', pagina('Mis parejas · Cartas con Amor', 'Enlace privado del equipo de cartas.'))
const privada = pagina('Cartas con Amor · Organizadores', 'Acceso para el equipo organizador del retiro.')
writeFileSync('dist/cartas/entrar.html', privada)
writeFileSync('dist/cartas/panel.html', privada)
console.log('Páginas de Cartas con Amor: dist/cartas/{enviar,equipo,entrar,panel}.html')
