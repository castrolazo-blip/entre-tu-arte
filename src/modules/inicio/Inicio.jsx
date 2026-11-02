import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Camera } from 'lucide-react'
import HeroPortadas from './HeroPortadas.jsx'
import BannerDestacadas from './BannerDestacadas.jsx'
import { listarPortadasPublicas } from './portadasService.js'
import { listarObras } from '../catalogo/obrasService.js'
import TituloSeccion from '../../components/TituloSeccion.jsx'
import FondoImagen from '../../components/FondoImagen.jsx'
import { precio } from '../../lib/formato.js'
import { useConfig } from '../../context/ConfigContext.jsx'

export default function Inicio() {
  const { cfg } = useConfig()
  const [obras, setObras] = useState([])
  const [portadas, setPortadas] = useState([])

  useEffect(() => {
    listarObras({ limite: 300 }).then(setObras).catch(() => setObras([]))
    listarPortadasPublicas().then(setPortadas)
  }, [])

  const enVenta = useMemo(() => obras.filter(o => o.estadoEfectivo !== 'vendida'), [obras])
  const destacadas = useMemo(() => enVenta.filter(o => o.destacada).sort((a, b) => (a.orden_destacada ?? 999) - (b.orden_destacada ?? 999)), [enVenta])
  const vendidas = useMemo(() => { const v = obras.filter(o => o.estadoEfectivo === 'vendida'); return [...v.filter(o => o.fotoReal), ...v.filter(o => !o.fotoReal)].slice(0, 4) }, [obras])
  // Primero las obras con foto real; las del sitio anterior (ficha con texto) al final
  const recientes = useMemo(() => [...enVenta.filter(o => o.fotoReal), ...enVenta.filter(o => !o.fotoReal)].slice(0, 10), [enVenta])
  const conFotoReal = useMemo(() => obras.filter(o => o.fotoReal), [obras])

  // Sin portadas configuradas: se usan las fotos de las destacadas (o de las más recientes)
  const slides = portadas.length ? portadas
    : ((destacadas.filter(o => o.fotoReal).length ? destacadas.filter(o => o.fotoReal) : enVenta.filter(o => o.fotoReal)).length
        ? (destacadas.filter(o => o.fotoReal).length ? destacadas.filter(o => o.fotoReal) : enVenta.filter(o => o.fotoReal))
        : enVenta).filter(o => o.foto).slice(0, 3)
        .map(o => ({ id: o.id, imagen_url: o.foto, boton_texto: 'Ver las obras', boton_enlace: '/obras' }))

  const fotoAmbiente = (enVenta.find(o => o.fotos?.some(f => f.rol === 'ambiente'))?.fotos.find(f => f.rol === 'ambiente')?.url) || conFotoReal[0]?.foto || enVenta[0]?.foto

  return (
    <>
      <HeroPortadas portadas={slides} />
      <BannerDestacadas obras={destacadas} />

      {/* Disponibles: galería limpia que se desliza, solo las obras */}
      <section id="obras" className="bg-crema-clara py-16 md:py-24">
        <div className="contenedor">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <TituloSeccion titulo="Disponibles ahora" />
            <Link to="/obras" className="text-base font-semibold underline decoration-mostaza decoration-[3px] underline-offset-[6px]">Ver todas las obras</Link>
          </div>
        </div>
        {recientes.length ? (
          <div className="sin-scroll flex snap-x snap-mandatory scroll-pl-5 gap-4 overflow-x-auto px-5 pb-2 md:scroll-pl-10 md:gap-6 md:px-[max(2.5rem,calc((100vw-1360px)/2+2.5rem))]">
            {recientes.map(o => (
              <Link key={o.id} to={`/obra/${o.id}`} className="w-[72vw] max-w-[320px] shrink-0 snap-start md:w-[300px]">
                <span className="relative block aspect-[4/5] overflow-hidden rounded-[22px] bg-[#ece7df]">
                  {o.foto && <img src={o.foto} alt={o.titulo} loading="lazy" className="absolute inset-0 h-full w-full object-contain p-5 drop-shadow-[0_12px_16px_rgba(23,22,20,0.25)]" />}
                </span>
                <span className="mt-3 block truncate text-lg font-semibold tracking-tight">{o.titulo}</span>
                <span className="block text-sm text-gris">{[precio(o.precio), o.medidasTexto].filter(Boolean).join(' · ') || 'Ver detalles'}</span>
              </Link>
            ))}
            <Link to="/obras" className="flex w-40 shrink-0 snap-start flex-col items-center justify-center gap-3 rounded-[22px] border-2 border-dashed border-crema-borde text-sm font-semibold">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-tinta text-white"><ArrowRight size={20} /></span>Ver todas
            </Link>
          </div>
        ) : <p className="contenedor text-gris">Pronto publicaremos nuevas obras.</p>}

        <div className="contenedor">
          <Link to="/asesoria" className="relative mt-10 block h-56 overflow-hidden rounded-[26px] text-white shadow-[0_24px_44px_-28px_rgba(23,22,20,0.8)] md:mt-14 md:h-80 md:rounded-[34px]">
            {fotoAmbiente && <img src={fotoAmbiente} alt="" className="absolute inset-0 h-full w-full object-cover" />}
            <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[#3a2c1e]/95 via-[#3a2c1e]/70 to-transparent md:via-[#3a2c1e]/60" />
            <span className="absolute left-6 top-8 max-w-xs md:left-14 md:top-14 md:max-w-md">
              <span className="block text-[30px] font-medium leading-none tracking-[-0.035em] md:text-[48px]">Arte en tu espacio</span>
              <span aria-hidden="true" className="mt-5 block h-[5px] w-12 rounded-full bg-mostaza" />
              <span className="mt-5 hidden text-lg leading-relaxed text-white/90 md:block">Mira cómo se ve cada obra en tu pared antes de comprarla.</span>
            </span>
            <span aria-hidden="true" className="absolute bottom-6 left-6 flex h-12 w-12 items-center justify-center rounded-full bg-white text-tinta md:bottom-12 md:left-14 md:h-[60px] md:w-[60px]"><ArrowRight size={22} /></span>
          </Link>
        </div>
      </section>

      {vendidas.length > 0 && (
        <FondoImagen imagen={vendidas[0]?.foto} velo="claro" difuminado={20} className="py-16 md:py-24">
          <div className="contenedor">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-[34px] font-medium tracking-[-0.04em] md:text-[54px]">Ya tienen hogar</h2>
                <p className="mt-2 text-gris md:text-lg">¿Te gustó una? El artista puede crear una similar a tu medida.</p>
              </div>
              <Link to="/vendidas" className="font-semibold underline decoration-mostaza decoration-[3px] underline-offset-[6px]">Ver todas las vendidas</Link>
            </div>
            <div className="sin-scroll -mx-5 flex gap-4 overflow-x-auto px-5 md:mx-0 md:grid md:grid-cols-4 md:px-0">
              {vendidas.map(o => (
                <Link key={o.id} to={`/obra/${o.id}`} className="w-52 shrink-0 md:w-auto">
                  <span className="relative block aspect-[4/3] overflow-hidden rounded-3xl bg-[#ece7df]">
                    {o.foto && <img src={o.foto} alt={`${o.titulo}, vendida`} loading="lazy" className="absolute inset-0 h-full w-full object-contain p-3" />}
                    <span className="absolute left-3.5 top-3.5 rounded-full bg-tinta px-3 py-1.5 text-[11px] font-bold tracking-wider text-white">VENDIDA</span>
                  </span>
                  <span className="mt-3 block text-lg font-semibold">{o.titulo}</span>
                  <span className="block text-sm text-gris">Pedir una similar →</span>
                </Link>
              ))}
            </div>
          </div>
        </FondoImagen>
      )}

      <FondoImagen imagen={fotoAmbiente} velo="medio" difuminado={4} className="py-16 md:py-28">
        <div className="contenedor flex flex-wrap gap-5 md:gap-6">
          <div className="flex min-w-0 flex-[1_1_420px] flex-col rounded-[26px] bg-mostaza p-7 text-tinta md:rounded-[34px] md:p-12">
            <h2 className="text-[30px] font-semibold leading-[1.02] tracking-[-0.035em] md:text-[44px]">¿No sabes cuál va en tu pared?</h2>
            <p className="mt-4 max-w-md text-[16px] leading-relaxed md:text-lg">Sube una foto con las medidas. Te recomendamos la obra, el tamaño ideal y coordinamos la instalación.</p>
            <Link to="/asesoria" className="btn-oscuro mt-7 self-start"><Camera size={20} />Subir foto de mi pared</Link>
          </div>
          <div className="min-w-0 flex-[1.3_1_520px] rounded-[26px] bg-tinta p-7 text-white md:rounded-[34px] md:p-12">
            <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-mostaza">Nuestros artistas</p>
            <h2 className="mt-3 text-[30px] font-medium leading-[1.02] tracking-[-0.035em] md:text-[44px]">{cfg.nos_titulo}</h2>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/80 md:text-[17px]">{cfg.nos_texto}</p>
            <Link to="/artistas" className="btn-primario mt-7">Conocer a los artistas <ArrowRight size={20} /></Link>
          </div>
        </div>
      </FondoImagen>
    </>
  )
}
