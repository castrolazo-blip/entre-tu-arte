import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listarArticulos } from './blogService.js'
import { fechaCorta } from '../../lib/formato.js'
import TituloSeccion from '../../components/TituloSeccion.jsx'
import CargandoModulo from '../../components/CargandoModulo.jsx'

export default function Blog() {
  const [articulos, setArticulos] = useState(null)
  useEffect(() => { listarArticulos().then(setArticulos).catch(() => setArticulos([])) }, [])
  return (
    <div className="contenedor pb-24 pt-28 md:pt-36">
      <TituloSeccion titulo="Ideas para" resaltado="decorar" className="mb-10" />
      {!articulos ? <CargandoModulo /> : !articulos.length ? <p className="text-gris">Pronto publicaremos artículos.</p> : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {articulos.map(a => (
            <Link key={a.id} to={`/blog/${a.id}`} className="tarjeta overflow-hidden">
              <span className="relative block aspect-[16/10] bg-crema-borde">
                {(a.imagen_portada_url || a.imagen1_url) && <img src={a.imagen_portada_url || a.imagen1_url} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />}
              </span>
              <span className="block p-6">
                <span className="block text-[13px] text-gris">{fechaCorta(a.created_at)}</span>
                <span className="mt-1 block text-xl font-semibold leading-snug tracking-tight">{a.titulo}</span>
                {a.subtitulo && <span className="mt-2 block text-[15px] text-gris">{a.subtitulo}</span>}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
