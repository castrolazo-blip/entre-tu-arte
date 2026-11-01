import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Identificador de esta versión: en GitHub Actions es el commit; en local, la hora de compilación.
const VERSION = (process.env.GITHUB_SHA || '').slice(0, 7) || `local-${Date.now()}`

// Publica dist/version.json para que las pestañas abiertas detecten una versión nueva y se recarguen
// (GitHub Pages deja que el navegador guarde la página varios minutos).
const archivoVersion = () => ({
  name: 'archivo-version',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version: VERSION }) })
  },
})

// En GitHub Pages el sitio vive en /entre-tu-arte/ (o en / con dominio propio).
// El proceso de publicación define VITE_BASE; en local y en Vercel es "/".
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  define: { __VERSION__: JSON.stringify(VERSION) },
  plugins: [react(), archivoVersion()],
})
