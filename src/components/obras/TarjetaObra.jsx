import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { precio } from '../../lib/formato.js'
import { insignia, etiquetaExistencias } from '../../modules/catalogo/obrasService.js'

export default function TarjetaObra({ obra, compacta = false }) {
  const tag = insignia(obra)
  const vendida = obra.estadoEfectivo === 'vendida'
  return (
    <article className="tarjeta overflow-hidden">
      <Link to={`/obra/${obra.id}`} className="relative block aspect-[4/3] bg-[#ece7df]">
        {obra.foto && <img src={obra.foto} alt={obra.titulo} loading="lazy" className={`absolute inset-0 h-full w-full object-contain p-4 drop-shadow-[0_10px_14px_rgba(23,22,20,0.25)]`} />}
        <span className={`absolute left-4 top-4 rounded-full px-3.5 py-2 text-xs font-bold ${tag.clase}`}>{tag.texto}</span>
        {obra.tipo_obra === 'interpretacion' && <span className="absolute right-4 top-4 rounded-full bg-white/95 px-3 py-2 text-xs font-bold">Interpretación</span>}
        {obra.tipo_obra === 'original' && obra.certificado && <span className="absolute right-4 top-4 rounded-full bg-white/95 px-3 py-2 text-xs font-bold">Original · Certificada</span>}
      </Link>
      <div className={compacta ? 'p-4' : 'p-5 md:p-6'}>
        {obra.artista && <p className="text-[13px] font-semibold text-gris">{obra.artista}</p>}
        <h3 className="mt-1 text-[22px] font-semibold leading-tight tracking-tight md:text-[25px]">{obra.titulo}</h3>
        <p className="mt-1 text-[15px] text-gris">{[obra.tecnica, obra.medidasTexto].filter(Boolean).join(' · ')}</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div>
            {vendida
              ? <span className="text-sm font-semibold">Pedir una similar →</span>
              : <span className="text-[24px] font-bold tracking-tight md:text-[26px]">{precio(obra.precio) || 'Consultar precio'}</span>}
            {!vendida && <span className="block text-[13px] text-gris">{etiquetaExistencias(obra)}</span>}
          </div>
          <Link to={`/obra/${obra.id}`} aria-label={`Ver ${obra.titulo}`} className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-tinta text-white">
            <ArrowRight size={20} />
          </Link>
        </div>
      </div>
    </article>
  )
}
