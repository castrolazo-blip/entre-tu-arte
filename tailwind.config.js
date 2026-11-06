/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta de marca: tinta casi negra, crema cálido y amarillo mostaza como acento
        tinta:  { DEFAULT: '#17181b', suave: '#2a2724' },
        crema:  { DEFAULT: '#f6f4f0', clara: '#faf8f4', borde: '#e2ddd4' },
        gris:   { DEFAULT: '#5d5a55' },
        mostaza:{ DEFAULT: '#e8b627', clara: '#fbf0cf', fondo: '#fbf3d9' },
        // Cartas con Amor (módulo temporal): vino y oro del retiro
        vino:   { DEFAULT: '#7a2621', oscuro: '#5c1c18', claro: '#f6e9e6' },
        oro:    { DEFAULT: '#b8893b', claro: '#f5ecd9' },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
}
