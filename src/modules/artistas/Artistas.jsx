import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { listarArtistas } from './artistasService.js'
import { listarObras } from '../catalogo/obrasService.js'
import TituloSeccion from '../../components/TituloSeccion.jsx'
import CargandoModulo from '../../components/CargandoModulo.jsx'
import { useConfig } from '../../context/ConfigContext.jsx'

export default function Artistas() {
  const { cfg } = useConfig()
  const [artistas, setArtistas] = useState(null)
  const [obras, setObras] = useState([])
  useEffect(() => {
    listarArtistas().then(setArtistas).catch(() => setArtistas([]))
    listarObras({ limite: 500 }).then(setObras).catch(() => {})
  }, [])

  return (
    <div className="contenedor pb-24 pt-28 md:pt-36">
      <TituloSeccion titulo="Nuestros" resaltado="artistas" className="mb-10">
        <p className="mt-5 max-w-2xl text-lg text-gris">{cfg.nos_texto}</p>
      </TituloSeccion>
      {!artistas ? <CargandoModulo /> : !artistas.length ? <p className="rounded-[28px] bg-white p-12 text-center text-gris">Muy pronto presentaremos a nuestros artistas.</p> : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {artistas.map(a => {
            const suyas = obras.filter(o => o.artista_id === a.id)
            const portada = a.foto_url || suyas.find(o => o.foto)?.fotoMini
            return (
              <Link key={a.id} to={`/artistas/${a.slug}`} className="tarjeta overflow-hidden">
                <span className="relative block aspect-[4/3] bg-tinta">
                  {portada && <img src={portada} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />}
                </span>
                <span className="block p-6">
                  <span className="block text-2xl font-semibold tracking-tight">{a.nombre}</span>
                  {a.ciudad && <span className="block text-sm text-gris">{a.ciudad}</span>}
                  <span className="mt-4 flex items-center justify-between text-sm font-semibold">
                    {suyas.filter(o => o.estadoEfectivo !== 'vendida').length} obras disponibles <ArrowRight size={18} />
                  </span>
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
