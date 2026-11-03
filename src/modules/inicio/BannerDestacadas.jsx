import { Link } from 'react-router-dom'
import { useConfig } from '../../context/ConfigContext.jsx'
import { precio } from '../../lib/formato.js'
import { insignia } from '../catalogo/obrasService.js'

// Franja de obras destacadas debajo de la portada (se eligen en /admin/destacadas).
export default function BannerDestacadas({ obras }) {
  const { cfg } = useConfig()
  if (!obras.length) return null
  return (
    <section aria-label="Obras destacadas" className="bg-tinta py-6 text-white md:py-8">
      <div className="contenedor flex flex-col gap-5 md:flex-row md:items-center md:gap-8">
        <div className="flex items-center justify-between gap-3 md:w-56 md:flex-none md:flex-col md:items-start">
          <div className="flex items-center gap-3 md:flex-col md:items-start">
            <span className="rounded-full bg-mostaza px-3 py-1.5 text-xs font-bold text-tinta">{cfg.banner_etiqueta}</span>
            <p className="text-lg font-semibold tracking-tight md:text-[26px] md:leading-tight">{cfg.banner_titulo}</p>
          </div>
          <Link to="/obras" className="text-sm text-white/75">Ver todas →</Link>
        </div>
        <div className="sin-scroll -mx-5 flex gap-3 overflow-x-auto px-5 md:mx-0 md:grid md:flex-1 md:grid-cols-4 md:overflow-visible md:px-0">
          {obras.slice(0, 8).map(o => (
            <Link key={o.id} to={`/obra/${o.id}`} className="w-44 shrink-0 overflow-hidden rounded-[20px] bg-white/[0.07] md:flex md:w-auto md:items-center md:gap-3 md:p-2.5">
              <span className="relative block h-28 md:h-[70px] md:w-[84px] md:shrink-0 md:overflow-hidden md:rounded-[14px]">
                {o.foto && <img src={o.fotoMini || o.foto} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />}
              </span>
              <span className="block p-3 md:p-0">
                <span className="block text-[11px] font-bold text-mostaza">{insignia(o).texto}</span>
                <span className="block truncate text-[15px] font-bold">{o.titulo}</span>
                <span className="block text-sm text-white/80">{precio(o.precio)}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
