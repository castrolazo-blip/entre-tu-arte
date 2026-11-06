import { useEffect } from 'react'
import { MailOpen } from 'lucide-react'

// Marca visual de Cartas con Amor (independiente de la marca Entre tu Arte)
if (typeof document !== 'undefined' && !document.getElementById('cca-fuente')) {
  const link = document.createElement('link')
  link.id = 'cca-fuente'
  link.rel = 'stylesheet'
  link.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500;1,600&display=swap'
  document.head.appendChild(link)
}

export const serif = { fontFamily: '"Cormorant Garamond", Georgia, serif' }

export function Marca({ claro = false, compacta = false }) {
  return (
    <div className={`flex items-center gap-2.5 ${claro ? 'text-white' : 'text-vino'}`}>
      <span className={`flex shrink-0 items-center justify-center rounded-full ${compacta ? 'h-9 w-9' : 'h-11 w-11'} ${claro ? 'bg-white/15' : 'bg-vino-claro'}`}>
        <MailOpen size={compacta ? 18 : 21} strokeWidth={1.8} />
      </span>
      <span className="leading-none">
        <span style={serif} className={`block font-semibold italic ${compacta ? 'text-[22px]' : 'text-[27px]'}`}>Cartas con Amor</span>
        {!compacta && <span className={`mt-1 block text-[10.5px] font-bold uppercase tracking-[0.16em] ${claro ? 'text-white/70' : 'text-oro'}`}>Encuentro matrimonial</span>}
      </span>
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
