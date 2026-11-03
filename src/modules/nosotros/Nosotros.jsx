import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, MessageCircle } from 'lucide-react'
import { PILARES } from './concepto.js'
import { useConfig, enlaceWhatsApp } from '../../context/ConfigContext.jsx'
import { listarObras } from '../catalogo/obrasService.js'

// Nuestra historia y concepto: arte decorativo pintado a mano que se adapta al estilo y al
// tamaño de cada espacio. Los textos se editan en Admin › Configuración (mismas claves que la
// página anterior: nos_titulo, nos_p1 … nos_p4, nos_cierre).

const PASOS = [
  ['Elige', 'Una obra en existencia, una por pedido o una idea propia.'],
  ['Adaptamos', 'Medidas, colores y estilo según tu espacio. Te mostramos cómo quedará.'],
  ['Recibe', 'Pintada a mano y lista para colgar; si quieres, la instalamos.'],
]

export default function Nosotros() {
  const { cfg } = useConfig()
  const [fondo, setFondo] = useState('')
  useEffect(() => {
    listarObras({ estado: 'publicas', limite: 12 }).then(l => {
      const amb = l.flatMap(o => o.fotos || []).find(f => f.rol === 'ambiente')
      setFondo(amb?.mini || amb?.url || l.find(o => o.fotoReal)?.fotoMini || l[0]?.fotoMini || '')
    }).catch(() => {})
  }, [])
  const parrafos = [cfg.nos_p1, cfg.nos_p2, cfg.nos_p3, cfg.nos_p4].filter(Boolean)
  const wa = enlaceWhatsApp(cfg.whatsapp, 'Hola, quiero un cuadro a la medida de mi espacio')

  return (
    <>
      <section className="relative overflow-hidden bg-tinta-suave text-white">
        {fondo && <img src={fondo} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-60" />}
        <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#141210] via-[#141210]/70 to-[#141210]/40" />
        <div className="contenedor relative pb-16 pt-36 md:pb-24 md:pt-48">
          <p className="text-[13px] font-bold uppercase tracking-[0.16em] text-mostaza">Quiénes somos</p>
          <h1 className="mt-3 text-[54px] font-medium leading-[0.96] tracking-[-0.045em] md:text-[92px]">{tituloConAcento(cfg.nos_titulo || 'Nuestra historia')}</h1>
          <span aria-hidden="true" className="mt-7 block h-[5px] w-20 rounded-full bg-mostaza" />
          <p className="mt-6 max-w-xl text-xl leading-relaxed text-white/90 md:text-2xl">{cfg.nos_lema}</p>
        </div>
      </section>

      <section className="contenedor py-14 md:py-20">
        <div className="mx-auto max-w-3xl space-y-5 text-[18px] leading-relaxed text-[#3c3a36] md:text-[20px]">
          {parrafos.map((p, n) => <p key={n} className={n === 0 ? 'text-[21px] font-medium text-tinta md:text-[24px]' : ''}>{p}</p>)}
          {cfg.nos_cierre && <p className="pt-3 text-[24px] font-semibold italic tracking-tight text-tinta md:text-[30px]"><span className="bg-[linear-gradient(transparent_60%,#e8b627_60%)]">{cfg.nos_cierre}</span></p>}
        </div>
      </section>

      <section className="bg-tinta py-14 text-white md:py-20">
        <div className="contenedor">
          <p className="text-[13px] font-bold uppercase tracking-[0.16em] text-mostaza">Nuestro concepto</p>
          <h2 className="mt-3 max-w-2xl text-[34px] font-medium leading-[1.02] tracking-[-0.04em] md:text-[52px]">Arte decorativo que se adapta a ti</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {PILARES.map(({ Icono, titulo, texto }) => (
              <article key={titulo} className="rounded-[26px] bg-white/[0.06] p-7 ring-1 ring-white/10">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-mostaza text-tinta"><Icono size={26} /></span>
                <h3 className="mt-5 text-2xl font-semibold tracking-tight">{titulo}</h3>
                <p className="mt-2 leading-relaxed text-white/75">{texto}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="contenedor py-14 md:py-20">
        <h2 className="text-[34px] font-medium tracking-[-0.04em] md:text-[48px]">Así trabajamos</h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {PASOS.map(([t, d], n) => (
            <li key={t} className="rounded-[26px] bg-white p-7">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-tinta font-bold text-white">{n + 1}</span>
              <h3 className="mt-4 text-2xl font-semibold tracking-tight">{t}</h3>
              <p className="mt-1.5 text-gris">{d}</p>
            </li>
          ))}
        </ol>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/obras" className="btn-primario h-14">Ver las obras <ArrowRight size={20} /></Link>
          {wa
            ? <a href={wa} target="_blank" rel="noreferrer" className="btn-oscuro h-14"><MessageCircle size={20} />Quiero una a mi medida</a>
            : <Link to="/asesoria" className="btn-oscuro h-14">Quiero una a mi medida</Link>}
        </div>
      </section>
    </>
  )
}

function tituloConAcento(texto) {
  const palabras = texto.trim().split(/\s+/)
  const ultima = palabras.pop()
  return <>{palabras.join(' ')} <em className="font-bold text-mostaza">{ultima}</em></>
}
