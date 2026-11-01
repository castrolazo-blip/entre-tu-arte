import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { listarObras, listarCategorias } from '../catalogo/obrasService.js'
import { mesAnio } from '../../lib/formato.js'
import CargandoModulo from '../../components/CargandoModulo.jsx'
import FormularioConsulta from '../../components/obras/FormularioConsulta.jsx'

export default function Vendidas() {
  const [obras, setObras] = useState(null)
  const [categorias, setCategorias] = useState([])
  const [filtro, setFiltro] = useState('')
  const [encargo, setEncargo] = useState(null)

  useEffect(() => {
    listarObras({ estado: 'vendida' }).then(setObras).catch(() => setObras([]))
    listarCategorias().then(setCategorias).catch(() => {})
  }, [])
  const lista = useMemo(() => (obras || []).filter(o => !filtro || (o.categorias || []).includes(filtro)), [obras, filtro])
  const fondo = obras?.[0]?.foto

  return (
    <>
      <section className="relative overflow-hidden bg-tinta-suave text-white">
        {fondo && <img src={fondo} alt="" aria-hidden="true" className="absolute -inset-10 h-[calc(100%+80px)] w-[calc(100%+80px)] max-w-none object-cover" style={{ filter: 'blur(6px)' }} />}
        <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[#141210]/95 via-[#141210]/75 to-[#141210]/50" />
        <div className="contenedor relative pb-16 pt-32 md:pb-24 md:pt-44">
          <h1 className="text-[56px] font-medium leading-[0.96] tracking-[-0.045em] md:text-[96px]">Ya encontraron<br /><em className="font-bold text-mostaza">hogar</em></h1>
          <span aria-hidden="true" className="mt-7 block h-[5px] w-20 rounded-full bg-mostaza" />
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/85">Estas obras ya fueron vendidas. Si alguna te enamora, el artista puede crear una similar a tu medida y en tus colores.</p>
          {obras && <p className="mt-8 inline-block rounded-3xl bg-mostaza px-6 py-4 text-tinta"><span className="block text-4xl font-bold">{obras.length}</span><span className="text-sm font-semibold">obras en hogares y oficinas</span></p>}
        </div>
      </section>

      <section className="contenedor py-12 md:py-16">
        <div className="sin-scroll -mx-5 mb-9 flex gap-2 overflow-x-auto px-5 md:mx-0 md:flex-wrap md:px-0">
          <button onClick={() => setFiltro('')} className={`chip ${!filtro ? 'chip-on' : 'chip-off'}`}>Todas</button>
          {categorias.map(c => <button key={c.id} onClick={() => setFiltro(c.nombre)} className={`chip ${filtro === c.nombre ? 'chip-on' : 'chip-off'}`}>{c.nombre}</button>)}
        </div>
        {!obras ? <CargandoModulo /> : !lista.length ? <p className="rounded-[28px] bg-white p-12 text-center text-gris">Aún no hay obras vendidas en esta colección.</p> : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {lista.map(o => (
              <article key={o.id} className="tarjeta overflow-hidden">
                <Link to={`/obra/${o.id}`} className="relative block aspect-[4/3]">
                  {o.foto && <img src={o.foto} alt={`${o.titulo}, vendida`} loading="lazy" className="absolute inset-0 h-full w-full object-cover grayscale-[55%]" />}
                  <span className="absolute left-4 top-4 rounded-full bg-tinta px-3.5 py-2 text-xs font-bold tracking-wider text-white">VENDIDA</span>
                </Link>
                <div className="p-6">
                  <h2 className="text-[23px] font-semibold tracking-tight">{o.titulo}</h2>
                  <p className="mt-1 text-sm text-gris">{[o.tecnica, o.medidasTexto].filter(Boolean).join(' · ')}</p>
                  {o.vendida_en && <p className="text-sm text-gris">Vendida en {mesAnio(o.vendida_en)}</p>}
                  <button onClick={() => setEncargo(o)} className="btn-contorno mt-5 h-[52px] w-full text-[15px]">Pedir una similar <ArrowRight size={18} /></button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="contenedor pb-24">
        <div className="flex flex-wrap items-center justify-between gap-8 rounded-[34px] bg-mostaza p-8 md:p-12">
          <div className="max-w-xl">
            <h2 className="text-[34px] font-semibold leading-[1.02] tracking-[-0.04em] md:text-[44px]">Una obra hecha solo para ti</h2>
            <ol className="mt-5 space-y-2.5 text-[17px]">
              {['Nos dices medidas, colores y la obra que te inspira', 'El artista te presenta un boceto a través de nosotros', 'Anticipo del 50 % y entrega en 3 a 4 semanas'].map((t, n) => (
                <li key={t} className="flex items-center gap-3.5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tinta text-sm font-bold text-white">{n + 1}</span>{t}</li>
              ))}
            </ol>
          </div>
          <button onClick={() => setEncargo({ id: null, titulo: 'Encargo a medida' })} className="btn-oscuro h-16">Solicitar un encargo <ArrowRight size={20} /></button>
        </div>
      </section>
      {encargo && <FormularioConsulta tipo="encargo" obra={encargo.id ? encargo : null} onCerrar={() => setEncargo(null)} />}
    </>
  )
}
