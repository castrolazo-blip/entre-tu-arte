import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// En GitHub Pages el sitio vive en /entre-tu-arte/ (o en / con dominio propio).
// El proceso de publicación define VITE_BASE; en local y en Vercel es "/".
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
})
