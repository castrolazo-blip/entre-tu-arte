import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { obtenerArticulo } from './blogService.js'
import { fechaCorta } from '../../lib/formato.js'
import CargandoModulo from '../../components/CargandoModulo.jsx'

export default function Articulo() {
  const { id } = useParams()
  const [a, setA] = useState(undefined)
  useEffect(() => { obtenerArticulo(id).then(setA).catch(() => setA(null)) }, [id])
  if (a === undefined) return <div className="pt-28"><CargandoModulo /></div>
  if (!a) return <div className="contenedor pb-24 pt-36 text-center"><h1 className="text-3xl font-semibold">Artículo no encontrado</h1><Link to="/blog" className="btn-oscuro mt-8">Volver al blog</Link></div>
  const bloques = [[a.bloque1, a.imagen1_url], [a.bloque2, a.imagen2_url], [a.bloque3, a.imagen3_url]]
  return (
    <article className="mx-auto max-w-3xl px-5 pb-24 pt-28 md:pt-36">
      <Link to="/blog" className="text-sm font-semibold text-gris">← Blog</Link>
      <p className="mt-6 text-sm text-gris">{fechaCorta(a.created_at)}</p>
      <h1 className="mt-2 text-[40px] font-medium leading-[1.05] tracking-[-0.04em] md:text-[56px]">{a.titulo}</h1>
      {a.subtitulo && <p className="mt-4 text-xl text-gris">{a.subtitulo}</p>}
      {a.imagen_portada_url && <img src={a.imagen_portada_url} alt="" className="mt-8 w-full rounded-[28px]" />}
      {bloques.map(([texto, img], n) => (texto || img) && (
        <div key={n} className="mt-8">
          {texto && <p className="whitespace-pre-line text-[17px] leading-[1.8] text-[#3c3a36]">{texto}</p>}
          {img && <img src={img} alt="" loading="lazy" className="mt-6 w-full rounded-[24px]" />}
        </div>
      ))}
      <div className="mt-14 rounded-[28px] bg-mostaza p-8">
        <p className="text-2xl font-semibold tracking-tight">¿Buscas la obra ideal para tu espacio?</p>
        <Link to="/asesoria" className="btn-oscuro mt-5">Pedir asesoría gratis</Link>
      </div>
    </article>
  )
}
