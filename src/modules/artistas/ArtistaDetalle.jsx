import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { obtenerArtista } from './artistasService.js'
import { aplicarSEO, seoArtista } from '../../lib/seo.js'
import { listarObras } from '../catalogo/obrasService.js'
import TarjetaObra from '../../components/obras/TarjetaObra.jsx'
import CargandoModulo from '../../components/CargandoModulo.jsx'

// Perfil público del artista: biografía y obras. Nunca muestra datos de contacto del artista.
export default function ArtistaDetalle() {
  const { slug } = useParams()
  const [artista, setArtista] = useState(undefined)
  const [obras, setObras] = useState([])

  useEffect(() => {
    obtenerArtista(slug).then(a => {
      setArtista(a)
      if (a) aplicarSEO(seoArtista(a))
      if (a) listarObras({ artistaId: a.id }).then(setObras).catch(() => {})
    }).catch(() => setArtista(null))
  }, [slug])

  if (artista === undefined) return <div className="pt-28"><CargandoModulo /></div>
  if (!artista) return <div className="contenedor pb-24 pt-36 text-center"><h1 className="text-3xl font-semibold">Artista no encontrado</h1><Link to="/artistas" className="btn-oscuro mt-8">Ver artistas</Link></div>

  const disponibles = obras.filter(o => o.estadoEfectivo !== 'vendida')
  const vendidas = obras.filter(o => o.estadoEfectivo === 'vendida')
  return (
    <>
      <section className="bg-tinta pb-14 pt-32 text-white md:pt-40">
        <div className="contenedor flex flex-wrap items-center gap-8">
          {artista.foto_url
            ? <img src={artista.foto_url} alt={artista.nombre} className="h-32 w-32 rounded-full object-cover md:h-40 md:w-40" />
            : <span aria-hidden="true" className="flex h-32 w-32 items-center justify-center rounded-full bg-mostaza text-5xl font-bold text-tinta">{artista.nombre[0]}</span>}
          <div className="max-w-2xl">
            <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-mostaza">Artista{artista.ciudad ? ` · ${artista.ciudad}` : ''}</p>
            <h1 className="mt-2 text-[48px] font-medium leading-none tracking-[-0.045em] md:text-[72px]">{artista.nombre}</h1>
            {artista.bio && <p className="mt-5 whitespace-pre-line text-lg leading-relaxed text-white/80">{artista.bio}</p>}
          </div>
        </div>
      </section>
      <section className="contenedor py-14">
        <h2 className="mb-8 text-[34px] font-medium tracking-[-0.04em]">En existencia</h2>
        {disponibles.length
          ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{disponibles.map(o => <TarjetaObra key={o.id} obra={o} />)}</div>
          : <p className="text-gris">No hay obras disponibles en este momento. Puedes pedir cualquiera de sus obras por pedido.</p>}
        {vendidas.length > 0 && <>
          <h2 className="mb-8 mt-16 text-[34px] font-medium tracking-[-0.04em]">Por pedido</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{vendidas.map(o => <TarjetaObra key={o.id} obra={o} />)}</div>
        </>}
      </section>
    </>
  )
}
