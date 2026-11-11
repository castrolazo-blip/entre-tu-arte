import { useEffect } from 'react'
import { CalendarCheck2 } from 'lucide-react'

// Si nos organizamos! · identidad propia (independiente de Entre tu Arte)
export const NOMBRE_APP = 'Si nos organizamos!'
export const COLOR_APP = '#0f766e'

export function Marca({ claro = false, chica = false }) {
  return (
    <div className={`flex items-center gap-2.5 ${claro ? 'text-white' : 'text-teal-800'}`}>
      <span className={`grid shrink-0 place-items-center rounded-2xl ${claro ? 'bg-white/15' : 'bg-teal-700 text-white'} ${chica ? 'h-9 w-9' : 'h-12 w-12'}`}>
        <CalendarCheck2 size={chica ? 19 : 25} strokeWidth={2.2} />
      </span>
      <span className={`font-bold leading-[1.05] tracking-tight ${chica ? 'text-[17px]' : 'text-[22px]'}`}>
        Si nos<br />organizamos!
      </span>
    </div>
  )
}

// Título de la pestaña, color del navegador y noindex mientras se está en la aplicación
export function useTituloApp(titulo) {
  useEffect(() => {
    const previo = document.title
    const meta = document.querySelector('meta[name="theme-color"]')
    const colorPrevio = meta?.getAttribute('content')
    document.title = titulo ? `${titulo} · ${NOMBRE_APP}` : NOMBRE_APP
    meta?.setAttribute('content', COLOR_APP)
    const robots = document.createElement('meta')
    robots.name = 'robots'
    robots.content = 'noindex, nofollow'
    document.head.appendChild(robots)
    return () => { document.title = previo; if (colorPrevio) meta?.setAttribute('content', colorPrevio); robots.remove() }
  }, [titulo])
}

// Clases reutilizables
export const ui = {
  fondo: 'min-h-screen bg-[#eef4f2] text-slate-900',
  tarjeta: 'rounded-3xl bg-white p-5 shadow-[0_12px_30px_-24px_rgba(15,60,55,0.55)]',
  btn: 'inline-flex h-12 items-center justify-center gap-2 rounded-full bg-teal-700 px-6 font-semibold text-white transition hover:bg-teal-800 disabled:opacity-50',
  btnSuave: 'inline-flex h-12 items-center justify-center gap-2 rounded-full border border-teal-700/25 bg-white px-5 font-semibold text-teal-800 transition hover:border-teal-700 disabled:opacity-50',
  btnMini: 'inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 text-[13px] font-semibold text-slate-700 transition hover:border-teal-700 hover:text-teal-800 disabled:opacity-50',
  campo: 'h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[15px] outline-none transition focus:border-teal-700 focus:bg-white',
  etiqueta: 'block text-[13px] font-semibold text-slate-700',
  chip: 'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-bold',
}

export const ESTADOS = {
  disponibilidad: { texto: 'Marcando fechas', clase: 'bg-amber-100 text-amber-800' },
  votacion:       { texto: 'En votación',     clase: 'bg-sky-100 text-sky-800' },
  cerrada:        { texto: 'Votación cerrada', clase: 'bg-violet-100 text-violet-800' },
  confirmado:     { texto: 'Confirmado',      clase: 'bg-emerald-100 text-emerald-800' },
  cancelado:      { texto: 'Cancelado',       clase: 'bg-slate-200 text-slate-600' },
}

export function ChipEstado({ estado }) {
  const e = ESTADOS[estado] || ESTADOS.disponibilidad
  return <span className={`${ui.chip} ${e.clase}`}>{e.texto}</span>
}
