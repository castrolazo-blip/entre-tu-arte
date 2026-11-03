import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

// Cada colección (tabla "categorias") con la foto de su obra más reciente y cuántas obras tiene.
export default function TarjetasColecciones({ categorias, obras, limite }) {
  const tarjetas = categorias.map(c => {
    const suyas = obras.filter(o => (o.categorias || []).includes(c.nombre))
    const portada = suyas.find(o => o.estadoEfectivo !== 'vendida' && o.foto) || suyas.find(o => o.foto)
    return { ...c, foto: portada?.fotoMini || portada?.foto, cantidad: suyas.filter(o => o.estadoEfectivo !== 'vendida').length }
  }).filter(c => c.foto)
  const lista = limite ? tarjetas.slice(0, limite) : tarjetas
  if (!lista.length) return null
  return (
    <div className="grid grid-cols-2 gap-3.5 md:gap-5 lg:grid-cols-4">
      {lista.map(c => (
        <Link key={c.id} to={`/obras?coleccion=${encodeURIComponent(c.nombre)}`}
          className="relative block aspect-square overflow-hidden rounded-[22px] text-white shadow-[0_14px_26px_-18px_rgba(23,22,20,0.7)] md:rounded-[28px]">
          <img src={c.foto} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-500 hover:scale-105" />
          <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#12100e]/75" />
          <span className="absolute inset-x-4 bottom-3.5 flex items-end justify-between gap-2 md:inset-x-6 md:bottom-5">
            <span className="text-[17px] font-semibold leading-tight md:text-[22px]">{c.nombre}
              <span className="block text-xs font-normal opacity-85 md:text-[13px]">{c.cantidad} {c.cantidad === 1 ? 'obra' : 'obras'}</span>
            </span>
            <ArrowRight size={20} className="mb-1 shrink-0" />
          </span>
        </Link>
      ))}
    </div>
  )
}
