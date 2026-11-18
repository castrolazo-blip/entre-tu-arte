import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base relativa: funciona en la raíz o dentro de una carpeta (ej. entretuarte.com/menu/).
// postcss vacío: no heredar la configuración del sitio que la contiene.
export default defineConfig({ plugins: [react()], base: './', css: { postcss: {} } });
