import { useEffect } from 'react'

// Marca visual de Cartas con Amor (independiente de la marca Entre tu Arte)
if (typeof document !== 'undefined' && !document.getElementById('cca-fuente')) {
  const link = document.createElement('link')
  link.id = 'cca-fuente'
  link.rel = 'stylesheet'
  link.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500;1,600&display=swap'
  document.head.appendChild(link)
}

export const serif = { fontFamily: '"Cormorant Garamond", Georgia, serif' }

// Logo de Renova (encuentro matrimonial) + nombre de la aplicación.
// claro = versión blanca para fondos vino · sin claro = versión vino para fondos claros.
export function Marca({ claro = false, compacta = false }) {
  const logo = `${import.meta.env.BASE_URL}cartas/renova-${claro ? 'blanco' : 'rojo'}.png`
  return (
    <div className={`flex items-center ${compacta ? 'gap-2.5' : 'gap-3.5'} ${claro ? 'text-white' : 'text-vino'}`}>
      <img src={logo} alt="Renova · encuentro matrimonial" width="451" height="360"
        className={`${compacta ? 'h-10' : 'h-16'} w-auto shrink-0`} />
      <span className={`self-stretch border-l ${claro ? 'border-white/30' : 'border-vino/20'}`} aria-hidden="true" />
      <span style={serif} className={`font-semibold italic leading-none ${compacta ? 'text-[21px]' : 'text-[26px]'}`}>Cartas<br />con Amor</span>
    </div>
  )
}

// Título de la pestaña y color del navegador mientras se está en el módulo
export function useTituloCartas(titulo) {
  useEffect(() => {
    const previo = document.title
    const meta = document.querySelector('meta[name="theme-color"]')
    const colorPrevio = meta?.getAttribute('content')
    document.title = titulo ? `${titulo} · Cartas con Amor` : 'Cartas con Amor'
    meta?.setAttribute('content', '#7a2621')
    return () => { document.title = previo; if (colorPrevio) meta?.setAttribute('content', colorPrevio) }
  }, [titulo])
}
