import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { listarObras, listarCategorias } from '../catalogo/obrasService.js'
import { precio } from '../../lib/formato.js'
import { useConfig } from '../../context/ConfigContext.jsx'
import { leerOrden, ordenarObras } from '../../lib/ordenObras.js'
import CargandoModulo from '../../components/CargandoModulo.jsx'
import FormularioConsulta from '../../components/obras/FormularioConsulta.jsx'

export default function Vendidas() {
  const [obras, setObras] = useState(null)
  const [categorias, setCategorias] = useState([])
  const [filtro, setFiltro] = useState('')
  const [encargo, setEncargo] = useState(null)
  const { cfg } = useConfig()

  useEffect(() => {
    listarObras({ estado: 'vendida' }).then(setObras).catch(() => setObras([]))
    listarCategorias().then(setCategorias).catch(() => {})
  }, [])
  const lista = useMemo(() => ordenarObras(obras || [], leerOrden(cfg)).filter(o => !filtro || (o.categorias || []).includes(filtro)), [obras, filtro, cfg])
  const fondo = obras?.[0]?.foto

  return (
    <>
      <section className="relative overflow-hidden bg-tinta-suave text-white">
        {fondo && <img src={fondo} alt="" aria-hidden="true" className="absolute -inset-10 h-[calc(100%+80px)] w-[calc(100%+80px)] max-w-none object-cover" style={{ filter: 'blur(6px)' }} />}
        <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[#141210]/95 via-[#141210]/75 to-[#141210]/50" />
        <div className="contenedor relative pb-16 pt-32 md:pb-24 md:pt-44">
          <h1 className="text-[56px] font-medium leading-[0.96] tracking-[-0.045em] md:text-[96px]">Obras<br /><em className="font-bold text-mostaza">por pedido</em></h1>
          <span aria-hidden="true" className="mt-7 block h-[5px] w-20 rounded-full bg-mostaza" />
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/85">Cada una se pinta a mano para ti: igual a la de la foto, a tu medida o en tus colores. Entrega en {cfg.pedido_tiempo}.</p>
          {obras && <p className="mt-8 inline-block rounded-3xl bg-mostaza px-6 py-4 text-tinta"><span className="block text-4xl font-bold">{obras.length}</span><span className="text-sm font-semibold">obras para pedir</span></p>}
        </div>
      </section>

      <section className="contenedor pt-10 md:pt-14">
        <div className="flex flex-wrap items-center justify-between gap-8 rounded-[34px] bg-mostaza p-8 md:p-12">
          <div className="max-w-xl">
            <h2 className="text-[34px] font-semibold leading-[1.02] tracking-[-0.04em] md:text-[44px]">Una obra hecha solo para ti</h2>
            <ol className="mt-5 space-y-2.5 text-[17px]">
              {['Elige una obra como inspiración o cuéntanos tu idea', 'El artista te presenta un boceto a través de nosotros', `Anticipo del ${cfg.pedido_anticipo} % y entrega en ${cfg.pedido_tiempo}`].map((t, n) => (
                <li key={t} className="flex items-center gap-3.5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tinta text-sm font-bold text-white">{n + 1}</span>{t}</li>
              ))}
            </ol>
          </div>
          <div className="flex flex-col items-start gap-3">
            <a href="#obras-por-pedido" onClick={e => { e.preventDefault(); document.getElementById('obras-por-pedido')?.scrollIntoView({ behavior: 'smooth' }) }} className="btn-oscuro h-16">Elegir la obra que me inspira <ArrowRight size={20} className="rotate-90" /></a>
            <Link to="/asesoria" className="font-semibold underline decoration-tinta/40 decoration-2 underline-offset-4">¿Tienes tu propia idea o la foto de un cuadro que te gusta? Pide tu cotización</Link>
          </div>
        </div>
      </section>

      <section id="obras-por-pedido" className="contenedor scroll-mt-28 py-12 md:py-16">
        <div className="sin-scroll -mx-5 mb-9 flex gap-2 overflow-x-auto px-5 md:mx-0 md:flex-wrap md:px-0">
          <button onClick={() => setFiltro('')} className={`chip ${!filtro ? 'chip-on' : 'chip-off'}`}>Todas</button>
          {categorias.map(c => <button key={c.id} onClick={() => setFiltro(c.nombre)} className={`chip ${filtro === c.nombre ? 'chip-on' : 'chip-off'}`}>{c.nombre}</button>)}
        </div>
        {!obras ? <CargandoModulo /> : !lista.length ? <p className="rounded-[28px] bg-white p-12 text-center text-gris">Aún no hay obras por pedido en esta colección.</p> : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {lista.map(o => (
              <article key={o.id} className="tarjeta overflow-hidden">
                <Link to={`/obra/${o.id}`} className="relative block aspect-[4/3] bg-[#ece7df]">
                  {o.foto && <img src={o.fotoMini || o.foto} alt={`${o.titulo}, por pedido`} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-contain p-3" />}
                  <span className="absolute left-4 top-4 rounded-full bg-mostaza px-3.5 py-2 text-xs font-bold tracking-wider text-tinta">POR PEDIDO</span>
                </Link>
                <div className="p-6">
                  <h2 className="text-[23px] font-semibold tracking-tight">{o.titulo}</h2>
                  <p className="mt-1 text-sm text-gris">{[o.tecnica, o.medidasTexto].filter(Boolean).join(' · ')}</p>
                  {precio(o.precio) && <p className="mt-3 text-[22px] font-bold tracking-tight">{precio(o.precio)}<span className="ml-1.5 text-xs font-semibold text-gris">referencial</span></p>}
                  <Link to={`/obra/${o.id}`} className="btn-primario mt-4 h-[52px] w-full text-[15px]">Pedir esta obra <ArrowRight size={18} /></Link>
                  <button onClick={() => setEncargo(o)} className="mt-2 w-full text-sm font-semibold underline decoration-mostaza decoration-2 underline-offset-4">La quiero a mi medida o en otros colores</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {encargo && <FormularioConsulta tipo="encargo" obra={encargo.id ? encargo : null} onCerrar={() => setEncargo(null)} />}
    </>
  )
}
