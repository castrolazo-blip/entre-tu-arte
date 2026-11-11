// Si nos organizamos!: copias de index.html para /organizar/mi, /organizar/entrar y /organizar/panel.
// Así GitHub Pages responde 200 y la vista previa de WhatsApp muestra «Si nos organizamos!» (no la tienda).
// Todas llevan noindex: los enlaces son privados y no deben aparecer en Google.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const base = readFileSync('dist/index.html', 'utf8')
const esc = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

function pagina(titulo, descripcion) {
  return base
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(titulo)}</title>`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(descripcion)}" />\n    <meta name="robots" content="noindex, nofollow" />`)
    .replace(/<meta name="theme-color"[^>]*>/, '<meta name="theme-color" content="#0f766e" />')
    .replace(/<link rel="canonical"[^>]*>\n?\s*/, '')
    .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${esc(titulo)}" />`)
    .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${esc(descripcion)}" />`)
    .replace(/<meta property="og:site_name"[^>]*>/, '<meta property="og:site_name" content="Si nos organizamos!" />')
    .replace(/<meta property="og:url"[^>]*>\n?\s*/, '')
    .replace(/<meta property="og:image"[^>]*>\n?\s*/, '')
    .replace(/<script type="application\/ld\+json">.*?<\/script>\n?\s*/s, '')
}

mkdirSync('dist/organizar', { recursive: true })
writeFileSync('dist/organizar/mi.html', pagina('Si nos organizamos! · Tu calendario privado',
  'Marcá solo los días que no podés. La aplicación encuentra la fecha en que todos pueden.'))
const admin = pagina('Si nos organizamos! · Administración', 'Panel del organizador.')
writeFileSync('dist/organizar/entrar.html', admin)
writeFileSync('dist/organizar/panel.html', admin)
console.log('Páginas de Si nos organizamos!: dist/organizar/{mi,entrar,panel}.html')
