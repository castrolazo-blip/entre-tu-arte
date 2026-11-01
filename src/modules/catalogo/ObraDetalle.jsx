import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowRight, ShieldCheck, Frame, Maximize2 } from 'lucide-react'
import { obtenerObra, listarObras, etiquetaExistencias, textoTipo } from './obrasService.js'
import { precio } from '../../lib/formato.js'
import { ORIENTACIONES, orientacionPorMedidas } from '../../lib/orientacion.js'
import { registrarEvento } from '../../lib/analytics.js'
import FormularioConsulta from '../../components/obras/FormularioConsulta.jsx'
import TarjetaObra from '../../components/obras/TarjetaObra.jsx'
import CargandoModulo from '../../components/CargandoModulo.jsx'
import FondoImagen from '../../components/FondoImagen.jsx'

const ROLES = { principal: 'Vista de la obra', ambiente: 'En un ambiente', detalle: 'Detalle de textura' }

export default function ObraDetalle() {
  const { id } = useParams()
  const [obra, setObra] = useState(undefined)
  const [similares, setSimilares] = useState([])
  const [foto, setFoto] = useState(0)
  const [consulta, setConsulta] = useState(null)
  const [ampliada, setAmpliada] = useState(false)
  const [proporciones, setProporciones] = useState({})   // url → ancho/alto de cada foto

  useEffect(() => {
    setObra(undefined); setFoto(0)
    obtenerObra(id).then(o => {
      setObra(o)
      if (!o) return
      document.title = `${o.titulo} · Entre tu Arte`
      registrarEvento('ver_obra', '/obra', o.id, o.titulo)
      const cat = (o.categorias || [])[0]
      listarObras({ estado: 'en_venta', categoria: cat, limite: 5 }).then(l => setSimilares(l.filter(x => x.id !== o.id).slice(0, 4))).catch(() => {})
    }).catch(() => setObra(null))
    return () => { document.title = 'Entre tu Arte · Arte que transforma espacios' }
  }, [id])

  if (obra === undefined) return <div className="pt-28"><CargandoModulo /></div>
  if (!obra) return (
    <div className="contenedor pb-24 pt-36 text-center">
      <h1 className="text-3xl font-semibold">No encontramos esta obra</h1>
      <Link to="/obras" className="btn-oscuro mt-8">Ver obras disponibles</Link>
    </div>
  )

  const vendida = obra.estadoEfectivo === 'vendida'
  const proporcion = Math.min(1.5, Math.max(0.72, proporciones[(obra.fotos[foto] || obra.fotos[0])?.url] || 1.25))
  const reservada = obra.estadoEfectivo === 'reservada'
  const actual = obra.fotos[foto] || obra.fotos[0]
  const ficha = [
    ['Tipo', textoTipo(obra)], ['Certificado', obra.certificado ? 'Incluye certificado de autenticidad' : ''],
    ['Medidas', obra.medidasTexto], ['Formato', ORIENTACIONES[orientacionPorMedidas(obra)]], ['Técnica', obra.tecnica], ['Soporte', obra.soporte],
    ['Estilo', obra.estilo], ['Año', obra.anio], ['Existencias', vendida ? 'Vendida' : etiquetaExistencias(obra)],
  ].filter(f => f[1])
  const palabras = obra.titulo.split(' ')
  const ultima = palabras.length > 1 ? palabras.pop() : null

  return (
    <>
      <div className="contenedor pt-24 text-sm text-gris md:pt-32">
        <Link to="/">Inicio</Link> / <Link to="/obras">Obras</Link> / <span className="font-semibold text-tinta">{obra.titulo}</span>
      </div>
      <section className="contenedor flex flex-wrap items-start gap-10 pb-20 pt-6 md:gap-14">
        <div className="flex min-w-0 flex-[1.2_1_560px] flex-col gap-4">
          {/* El visor toma la forma de la foto (vertical u horizontal) y la muestra completa */}
          <div className="relative overflow-hidden rounded-[28px] bg-tinta-suave shadow-[0_30px_60px_-36px_rgba(23,22,20,0.8)] transition-[aspect-ratio] duration-300 md:rounded-[34px]"
            style={{ aspectRatio: String(proporcion), width: '100%', maxWidth: `calc(78vh * ${proporcion})`, marginInline: 'auto' }}>
            {actual && <img src={actual.url} alt="" aria-hidden="true" className="absolute -inset-8 h-[calc(100%+64px)] w-[calc(100%+64px)] max-w-none object-cover opacity-60" style={{ filter: 'blur(24px)' }} />}
            {actual && <img src={actual.url} alt={`${obra.titulo}, ${ROLES[actual.rol] || 'foto'}`}
              onLoad={e => { const { naturalWidth: w, naturalHeight: h } = e.currentTarget; if (w && h) setProporciones(p => ({ ...p, [actual.url]: w / h })) }}
              className={`absolute inset-0 h-full w-full object-contain ${actual.rol === 'principal' ? 'p-6 drop-shadow-[0_16px_22px_rgba(0,0,0,0.35)]' : ''} ${vendida ? 'grayscale-[40%]' : ''}`} />}
            {actual && <span className="absolute bottom-4 left-4 rounded-full bg-white/95 px-3.5 py-2 text-[13px] font-semibold">{ROLES[actual.rol] || 'Foto'}</span>}
            {actual && <button onClick={() => setAmpliada(true)} aria-label="Ver en pantalla completa" className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/95"><Maximize2 size={18} /></button>}
          </div>
          {obra.fotos.length > 1 && (
            <div role="tablist" aria-label="Fotos de la obra" className="grid grid-cols-3 gap-3 md:gap-4">
              {obra.fotos.map((f, n) => (
                <button key={f.url} role="tab" aria-selected={n === foto} aria-label={ROLES[f.rol] || `Foto ${n + 1}`} onClick={() => setFoto(n)}
                  className={`relative aspect-[4/3] overflow-hidden rounded-[18px] border-[3px] ${n === foto ? 'border-mostaza' : 'border-transparent'}`}>
                  <img src={f.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-[1_1_400px]">
          <span className="inline-flex items-center gap-2 rounded-full bg-tinta px-3.5 py-2 text-[13px] font-bold text-white">
            <span aria-hidden="true" className={`h-2 w-2 rounded-full ${vendida ? 'bg-white' : 'bg-mostaza'}`} />
            {vendida ? 'Vendida' : reservada ? 'Reservada' : etiquetaExistencias(obra)}
          </span>
          <h1 className="mt-5 text-[48px] font-medium leading-[0.98] tracking-[-0.045em] md:text-[72px]">
            {palabras.join(' ')}{ultima && <> <em className="bg-[linear-gradient(transparent_62%,#e8b627_62%)] font-bold">{ultima}</em></>}
          </h1>
          {obra.artista && <p className="mt-4 text-gris">por {obra.artistaSlug ? <Link to={`/artistas/${obra.artistaSlug}`} className="font-semibold text-tinta">{obra.artista}</Link> : <span className="font-semibold text-tinta">{obra.artista}</span>}{obra.anio ? ` · ${obra.anio}` : ''}</p>}
          {obra.descripcion && <p className="mt-6 text-[17px] leading-relaxed text-[#3c3a36] md:text-lg">{obra.descripcion}</p>}

          {!vendida && (
            <p className="mt-7 text-[44px] font-bold tracking-[-0.03em]">{precio(obra.precio) || 'Precio a consultar'}</p>
          )}

          <div className="mt-6 flex flex-col gap-3">
            {vendida ? (
              <button onClick={() => setConsulta('encargo')} className="btn-primario h-16 text-[17px]">Pedir una obra similar <ArrowRight size={20} /></button>
            ) : (
              <>
                <button onClick={() => setConsulta('compra')} disabled={reservada} className="btn-primario h-16 text-[17px]">{reservada ? 'Reservada por otro cliente' : <>Comprar esta obra <ArrowRight size={20} /></>}</button>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setConsulta('reserva')} disabled={reservada} className="btn-contorno px-3 text-[15px]">Reservar 48 h</button>
                  <Link to={`/asesoria?obra=${obra.id}`} className="btn-contorno px-3 text-[15px]"><Frame size={18} />En mi pared</Link>
                </div>
              </>
            )}
            <button onClick={() => setConsulta('contacto')} className="mt-1 text-[15px] font-semibold underline decoration-mostaza decoration-[3px] underline-offset-[6px]">Tengo una pregunta sobre esta obra</button>
          </div>

          {ficha.length > 0 && (
            <dl className="mt-7 grid grid-cols-[max-content_1fr] rounded-[26px] bg-white px-6 py-2 text-[15px]">
              {ficha.map(([k, v], n) => (
                <div key={k} className="contents">
                  <dt className={`py-3.5 pr-6 text-gris ${n ? 'border-t border-[#efebe4]' : ''}`}>{k}</dt>
                  <dd className={`py-3.5 font-semibold ${n ? 'border-t border-[#efebe4]' : ''}`}>{v}</dd>
                </div>
              ))}
            </dl>
          )}
          <div className="mt-4 flex gap-3.5 rounded-[22px] bg-mostaza-fondo p-5 text-sm leading-relaxed">
            <ShieldCheck size={22} className="shrink-0" />
            <p><strong>Compra protegida.</strong> Pagas a Entre tu Arte{obra.certificado ? ' y la obra llega con su certificado de autenticidad' : ''}. Coordinamos el envío y la instalación.</p>
          </div>
        </div>
      </section>

      {similares.length > 0 && (
        <FondoImagen imagen={obra.foto} velo="claro" difuminado={22} className="py-16 md:py-20">
          <div className="contenedor">
            <h2 className="text-[34px] font-medium tracking-[-0.04em] md:text-[44px]">También te puede gustar</h2>
            <span aria-hidden="true" className="acento mb-8 mt-4" />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{similares.map(o => <TarjetaObra key={o.id} obra={o} compacta />)}</div>
          </div>
        </FondoImagen>
      )}

      {consulta && <FormularioConsulta tipo={consulta} obra={obra} onCerrar={() => setConsulta(null)} />}
      {ampliada && actual && (
        <button onClick={() => setAmpliada(false)} aria-label="Cerrar imagen" className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <img src={actual.url} alt={obra.titulo} className="max-h-full max-w-full object-contain" />
        </button>
      )}
    </>
  )
}
