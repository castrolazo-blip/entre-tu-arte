import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useConfig } from '../../context/ConfigContext.jsx'

// Portada a pantalla completa que rota sola. Las portadas se administran en /admin/portadas;
// si aún no hay ninguna, se usan las fotos de las obras destacadas.
export default function HeroPortadas({ portadas }) {
  const { cfg } = useConfig()
  const [i, setI] = useState(0)
  const total = portadas.length
  const segundos = Math.max(3, Number(cfg.portada_segundos) || 6)

  useEffect(() => {
    if (total < 2) return
    const t = setInterval(() => setI(v => (v + 1) % total), segundos * 1000)
    return () => clearInterval(t)
  }, [total, segundos])

  const p = portadas[i % Math.max(total, 1)] || {}
  const enlace = p.boton_enlace || '/colecciones'
  const externo = /^https?:/.test(enlace)

  return (
    <section className="relative min-h-[100svh] overflow-hidden bg-tinta-suave text-white md:min-h-[88vh]">
      {portadas.map((s, n) => (
        <picture key={s.id || n}>
          {s.imagen_movil_url && <source media="(max-width: 767px)" srcSet={s.imagen_movil_url} />}
          <img src={s.imagen_url} alt="" aria-hidden={n !== i}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${n === i ? 'opacity-100' : 'opacity-0'}`} />
        </picture>
      ))}
      <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[#171614]/80 via-[#171614]/45 to-transparent" />
      <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-[#171614]/40 via-transparent to-[#171614]/70" />

      <div className="contenedor relative flex min-h-[100svh] flex-col justify-end pb-24 pt-32 md:min-h-[88vh] md:justify-center md:pb-16">
        <div className="max-w-2xl">
          <h1 className="text-[56px] font-medium leading-[0.96] tracking-[-0.045em] md:text-[96px]">
            <TitularConAcento texto={p.titular || 'Arte que transforma espacios'} />
          </h1>
          <span aria-hidden="true" className="mt-7 block h-[5px] w-20 rounded-full bg-mostaza" />
          <p className="mt-6 max-w-md text-lg leading-relaxed text-white/90 md:text-xl">
            {p.subtitulo || 'Obras originales para hogares, oficinas y proyectos especiales.'}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {externo
              ? <a href={enlace} className="btn-primario h-16 px-8 text-[17px]">{p.boton_texto || 'Explorar Colecciones'} <ArrowRight size={22} /></a>
              : <Link to={enlace} className="btn-primario h-16 px-8 text-[17px]">{p.boton_texto || 'Explorar Colecciones'} <ArrowRight size={22} /></Link>}
            <Link to="/asesoria" className="btn-claro hidden h-16 md:inline-flex">Asesoría para mi espacio</Link>
          </div>
        </div>
      </div>

      {total > 1 && (
        <div className="absolute inset-x-0 bottom-6 flex justify-center gap-1 md:bottom-8">
          {portadas.map((_, n) => (
            <button key={n} onClick={() => setI(n)} aria-label={`Portada ${n + 1} de ${total}`} className="flex h-8 w-9 items-center justify-center">
              <span className={`h-2.5 rounded-full transition-all ${n === i ? 'w-7 bg-mostaza' : 'w-2.5 bg-white/55'}`} />
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

// La última palabra del titular va en amarillo y cursiva, como "espacios" en el diseño.
function TitularConAcento({ texto }) {
  const palabras = texto.trim().split(/\s+/)
  const ultima = palabras.pop()
  return <>{palabras.join(' ')} <em className="font-bold text-mostaza">{ultima}</em></>
}
