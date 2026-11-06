import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Search, Package, Mail, Paperclip, Copy as CopyIcon, Clock, Filter, CheckSquare } from 'lucide-react'
import { useCartas } from '../CartasContext.jsx'
import { actualizarCartas } from '../cartasService.js'
import { ESTADOS_CARTA, folioTexto, fecha, nombreDestinatario, nombrePareja, mensajeError } from '../constantes.js'
import { Etiqueta, Titulo, Vacio, btn } from '../ui.jsx'
import DetalleCarta from './DetalleCarta.jsx'
import CartaFisica from './CartaFisica.jsx'

const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export default function Bandeja() {
  const { cartas, parejas, recargar } = useCartas()
  const [params, setParams] = useSearchParams()
  const [f, setF] = useState({ pareja: params.get('pareja') || '', estado: params.get('estado') || '', origen: '', destinatario: '', q: '', desde: '', hasta: '', vinculo: '' })
  const [fisica, setFisica] = useState(false)
  const [seleccion, setSeleccion] = useState(new Set())
  const [masivo, setMasivo] = useState(false)
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))
  const abierta = params.get('carta')
  const porId = useMemo(() => Object.fromEntries(parejas.map(p => [p.id, p])), [parejas])

  const lista = useMemo(() => cartas.filter(c => {
    if (f.pareja && c.pareja_id !== f.pareja) return false
    if (f.estado === 'activas' ? ['rechazada', 'duplicada'].includes(c.estado) : f.estado && c.estado !== f.estado) return false
    if (f.origen && c.origen !== f.origen) return false
    if (f.destinatario && c.destinatario !== f.destinatario) return false
    if (f.vinculo === 'adicional' && c.remitente_id) return false
    if (f.vinculo === 'vinculada' && !c.remitente_id) return false
    if (f.vinculo === 'duplicado' && !c.posible_duplicado) return false
    if (f.desde && c.created_at.slice(0, 10) < f.desde) return false
    if (f.hasta && c.created_at.slice(0, 10) > f.hasta) return false
    if (f.q) {
      const p = porId[c.pareja_id]
      if (!norm(`${folioTexto(c.folio)} ${c.remitente_nombre} ${c.relacion} ${c.recibida_de} ${p?.codigo} ${p?.nombre_a} ${p?.nombre_b} ${p && nombrePareja(p)} ${p?.apellidos_a} ${p?.apellidos_b}`).includes(norm(f.q))) return false
    }
    return true
  }), [cartas, f, porId])

  const abrir = id => { const n = new URLSearchParams(params); id ? n.set('carta', id) : n.delete('carta'); setParams(n, { replace: true }) }
  const alternar = id => setSeleccion(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  async function cambiarVarias(estado) {
    const ids = [...seleccion]
    let motivo = null
    if (['rechazada', 'duplicada'].includes(estado)) { motivo = window.prompt('Motivo:'); if (!motivo) return }
    try {
      await actualizarCartas(ids, motivo ? { estado, motivo } : { estado })
      toast.success(`${ids.length} cartas actualizadas`)
      setSeleccion(new Set()); await recargar()
    } catch (err) { toast.error(mensajeError(err)) }
  }

  const filtrosActivos = Object.values(f).filter(Boolean).length
  return (
    <div>
      <Titulo titulo="Cartas" subtitulo={`${lista.length} de ${cartas.length} cartas`}>
        <button onClick={() => { setMasivo(!masivo); setSeleccion(new Set()) }} className={btn.contorno}><CheckSquare size={16} />{masivo ? 'Terminar selección' : 'Seleccionar'}</button>
        <button onClick={() => setFisica(true)} className={btn.vino}><Package size={16} />Registrar cartas recibidas</button>
      </Titulo>

      <div className="mb-4 rounded-[22px] bg-white p-3">
        <div className="flex flex-wrap gap-2">
          <label className="relative min-w-[200px] flex-[2]">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gris" />
            <input value={f.q} onChange={e => set('q', e.target.value)} placeholder="Folio, remitente o pareja" className="campo pl-10" />
          </label>
          <select value={f.pareja} onChange={e => set('pareja', e.target.value)} className="campo min-w-[160px] flex-1" aria-label="Pareja">
            <option value="">Todas las parejas</option>
            {parejas.map(p => <option key={p.id} value={p.id}>{p.codigo} · {nombrePareja(p)}</option>)}
          </select>
          <select value={f.estado} onChange={e => set('estado', e.target.value)} className="campo min-w-[150px] flex-1" aria-label="Estado">
            <option value="">Todos los estados</option>
            <option value="activas">Sin rechazadas/duplicadas</option>
            {Object.entries(ESTADOS_CARTA).map(([k, v]) => <option key={k} value={k}>{v.etiqueta}</option>)}
          </select>
        </div>
        <details className="mt-2" open={filtrosActivos > 2}>
          <summary className="flex cursor-pointer items-center gap-1.5 px-1 text-[13px] font-semibold text-gris"><Filter size={14} />Más filtros</summary>
          <div className="mt-2 grid gap-2 sm:grid-cols-5">
            <select value={f.origen} onChange={e => set('origen', e.target.value)} className="campo" aria-label="Origen">
              <option value="">Todos los orígenes</option><option value="digital">Formulario</option><option value="fisica">En papel</option><option value="correo">Por correo</option>
            </select>
            <select value={f.destinatario} onChange={e => set('destinatario', e.target.value)} className="campo" aria-label="Destinatario">
              <option value="">Cualquier destinatario</option><option value="A">Integrante A</option><option value="B">Integrante B</option><option value="ambos">Ambos</option>
            </select>
            <select value={f.vinculo} onChange={e => set('vinculo', e.target.value)} className="campo" aria-label="Vínculo">
              <option value="">Todas</option><option value="vinculada">De remitente esperado</option><option value="adicional">Adicionales</option><option value="duplicado">Posibles duplicados</option>
            </select>
            <input type="date" value={f.desde} onChange={e => set('desde', e.target.value)} className="campo" aria-label="Desde" />
            <input type="date" value={f.hasta} onChange={e => set('hasta', e.target.value)} className="campo" aria-label="Hasta" />
          </div>
        </details>
      </div>

      {masivo && seleccion.size > 0 && (
        <div className="sticky top-[70px] z-10 mb-3 flex flex-wrap items-center gap-2 rounded-[20px] bg-tinta p-3 text-white lg:top-3">
          <span className="px-2 text-sm font-semibold">{seleccion.size} seleccionadas →</span>
          {['en_revision', 'aprobada', 'lista', 'rechazada', 'duplicada'].map(e => (
            <button key={e} onClick={() => cambiarVarias(e)} className="h-9 rounded-full bg-white/10 px-3.5 text-[13px] font-semibold hover:bg-white/20">{ESTADOS_CARTA[e].etiqueta}</button>
          ))}
        </div>
      )}

      {!lista.length ? <Vacio titulo={cartas.length ? 'Ninguna carta coincide con los filtros' : 'Aún no han llegado cartas'}>{!cartas.length && 'Comparte el enlace del retiro con familiares y amigos.'}</Vacio> : (
        <ul className="divide-y divide-crema-borde overflow-hidden rounded-[22px] bg-white">
          {lista.map(c => {
            const p = porId[c.pareja_id]
            return (
              <li key={c.id} className="flex items-stretch">
                {masivo && (
                  <label className="flex items-center pl-4">
                    <input type="checkbox" checked={seleccion.has(c.id)} onChange={() => alternar(c.id)} className="h-5 w-5 accent-[#7a2621]" aria-label={`Seleccionar ${folioTexto(c.folio)}`} />
                  </label>
                )}
                <button onClick={() => (masivo ? alternar(c.id) : abrir(c.id))} className="flex min-w-0 flex-1 flex-col gap-1 px-4 py-3.5 text-left hover:bg-crema-clara sm:flex-row sm:items-center sm:gap-4">
                  <span className="flex items-center gap-2 sm:w-28 sm:flex-col sm:items-start sm:gap-0.5">
                    <span className="text-xs font-bold text-gris">{folioTexto(c.folio)}</span>
                    <span className="text-[11px] text-gris">{fecha(c.created_at, true)}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{c.remitente_nombre}{c.relacion && <span className="font-normal text-gris"> · {c.relacion}</span>}</span>
                    <span className="block truncate text-sm text-gris">Para {nombreDestinatario(p, c.destinatario)} <span className="text-xs">({p?.codigo}{p?.apellidos ? ` · ${p.apellidos}` : ''})</span>{c.recibida_de && <span className="text-xs"> · entregó {c.recibida_de}</span>}</span>
                  </span>
                  <span className="flex flex-wrap items-center gap-1.5">
                    {c.origen === 'fisica' && <Marca icono={Package} t="Papel" />}
                    {c.origen === 'correo' && <Marca icono={Mail} t="Correo" />}
                    {c.cca_archivos?.length > 0 && <Marca icono={Paperclip} t={c.cca_archivos.length} />}
                    {!c.remitente_id && <span className="rounded-full bg-oro-claro px-2 py-0.5 text-[11px] font-bold text-oro">Adicional</span>}
                    {c.posible_duplicado && <Marca icono={CopyIcon} t="¿Duplicada?" alerta />}
                    {c.tardia && <Marca icono={Clock} t="Tardía" alerta />}
                    {c.incidencia && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700">Incidencia</span>}
                    <Etiqueta estado={c.estado} />
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {abierta && <DetalleCarta cartaId={abierta} onCerrar={() => abrir(null)} />}
      {fisica && <CartaFisica parejaInicial={f.pareja} onCerrar={() => setFisica(false)} />}
    </div>
  )
}

const Marca = ({ icono: I, t, alerta }) => (
  <span className={`inline-flex h-6 items-center gap-1 rounded-full px-2 text-[11px] font-bold ${alerta ? 'bg-amber-100 text-amber-800' : 'bg-crema text-gris'}`}><I size={12} />{t}</span>
)
