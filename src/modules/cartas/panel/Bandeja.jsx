import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Package, Mail, Paperclip, Copy as CopyIcon, Clock, Filter } from 'lucide-react'
import { useCartas } from '../CartasContext.jsx'
import { useVentana } from '../borrador.js'
import { esValida, folioTexto, fecha, nombreDestinatario, nombrePareja } from '../constantes.js'
import { Etiqueta, Titulo, Vacio, btn } from '../ui.jsx'
import DetalleCarta from './DetalleCarta.jsx'
import CartaFisica from './CartaFisica.jsx'

const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export default function Bandeja() {
  const { cartas, parejas, esAdmin, miEquipo } = useCartas()
  const [params, setParams] = useSearchParams()
  const [f, setF] = useState({ pareja: params.get('pareja') || '', estado: params.get('estado') || '', origen: '', destinatario: '', q: '', desde: '', hasta: '', vinculo: '' })
  const [fisica, abrirFisica, cerrarFisica] = useVentana('registrar')
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))
  const abierta = params.get('carta')
  const relaciones = useMemo(() => [...new Set(cartas.map(c => c.relacion).filter(Boolean))].sort(), [cartas])
  const porId = useMemo(() => Object.fromEntries(parejas.map(p => [p.id, p])), [parejas])

  const lista = useMemo(() => cartas.filter(c => {
    if (f.pareja && c.pareja_id !== f.pareja) return false
    // Por defecto solo las válidas (recibidas); las anuladas/duplicadas aparte
    if (f.estado === '' && !esValida(c)) return false
    if (f.estado === 'anuladas' && esValida(c)) return false
    if (f.origen && c.origen !== f.origen) return false
    if (f.destinatario && c.destinatario !== f.destinatario) return false
    if (f.vinculo === '__dup' && !c.posible_duplicado) return false
    if (f.vinculo === '__sin' && c.relacion) return false
    if (f.vinculo && !f.vinculo.startsWith('__') && c.relacion !== f.vinculo) return false
    if (f.desde && c.created_at.slice(0, 10) < f.desde) return false
    if (f.hasta && c.created_at.slice(0, 10) > f.hasta) return false
    if (f.q) {
      const p = porId[c.pareja_id]
      if (!norm(`${folioTexto(c.folio)} ${c.remitente_nombre} ${c.relacion} ${c.recibida_de} ${p?.codigo} ${p?.nombre_a} ${p?.nombre_b} ${p && nombrePareja(p)} ${p?.apellidos_a} ${p?.apellidos_b}`).includes(norm(f.q))) return false
    }
    return true
  }), [cartas, f, porId])

  const abrir = id => { const n = new URLSearchParams(params); id ? n.set('carta', id) : n.delete('carta'); setParams(n, { replace: true }) }
  const filtrosActivos = Object.values(f).filter(Boolean).length
  return (
    <div>
      <Titulo titulo="Cartas" subtitulo={`${lista.length} de ${cartas.length} cartas`}>
        <button onClick={() => abrirFisica()} className={btn.vino}><Package size={16} />Registrar cartas recibidas</button>
      </Titulo>

      <div className="mb-4 rounded-[22px] bg-white p-3">
        <div className="flex flex-wrap gap-2">
          <label className="relative min-w-[200px] flex-[2]">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gris" />
            <input value={f.q} onChange={e => set('q', e.target.value)} placeholder="Folio, remitente o pareja" className="campo pl-10" />
          </label>
          <select value={f.pareja} onChange={e => set('pareja', e.target.value)} className="campo min-w-[160px] flex-1" aria-label="Pareja">
            <option value="">Todas las parejas</option>
            {parejas.filter(p => esAdmin || !miEquipo || p.equipo_id === miEquipo.id).map(p => <option key={p.id} value={p.id}>{p.codigo} · {nombrePareja(p)}</option>)}
          </select>
          {esAdmin && <select value={f.estado} onChange={e => set('estado', e.target.value)} className="campo min-w-[150px] flex-1" aria-label="Estado">
            <option value="">Recibidas</option>
            <option value="anuladas">Anuladas o duplicadas</option>
            <option value="todas">Todas</option>
          </select>}
        </div>
        {esAdmin && <details className="mt-2" open={filtrosActivos > 2}>
          <summary className="flex cursor-pointer items-center gap-1.5 px-1 text-[13px] font-semibold text-gris"><Filter size={14} />Más filtros</summary>
          <div className="mt-2 grid gap-2 sm:grid-cols-5">
            <select value={f.origen} onChange={e => set('origen', e.target.value)} className="campo" aria-label="Origen">
              <option value="">Todos los orígenes</option><option value="digital">Por enlace</option><option value="fisica">En papel</option><option value="correo">Por correo</option>
            </select>
            <select value={f.destinatario} onChange={e => set('destinatario', e.target.value)} className="campo" aria-label="Destinatario">
              <option value="">Cualquier destinatario</option><option value="A">Para el esposo</option><option value="B">Para la esposa</option>
            </select>
            <select value={f.vinculo} onChange={e => set('vinculo', e.target.value)} className="campo" aria-label="Quién la envía">
              <option value="">Cualquier remitente</option>
              {relaciones.map(r => <option key={r} value={r}>{r}</option>)}
              <option value="__sin">Sin clasificar</option>
              <option value="__dup">Posibles duplicados</option>
            </select>
            <input type="date" value={f.desde} onChange={e => set('desde', e.target.value)} className="campo" aria-label="Desde" />
            <input type="date" value={f.hasta} onChange={e => set('hasta', e.target.value)} className="campo" aria-label="Hasta" />
          </div>
        </details>}
      </div>

      {!lista.length ? <Vacio titulo={cartas.length ? 'Ninguna carta coincide con los filtros' : 'Aún no han llegado cartas'}>{!cartas.length && 'Comparte el enlace del retiro con familiares y amigos.'}</Vacio> : (
        <ul className="divide-y divide-crema-borde overflow-hidden rounded-[22px] bg-white">
          {lista.map(c => {
            const p = porId[c.pareja_id]
            return (
              <li key={c.id} className="flex items-stretch">
                <button onClick={() => abrir(c.id)} className="flex min-w-0 flex-1 flex-col gap-1 px-4 py-3.5 text-left hover:bg-crema-clara sm:flex-row sm:items-center sm:gap-4">
                  <span className="flex items-center gap-2 sm:w-28 sm:flex-col sm:items-start sm:gap-0.5">
                    <span className="text-xs font-bold text-gris">{folioTexto(c.folio)}</span>
                    <span className="text-[11px] text-gris">{fecha(c.created_at, true)}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{c.relacion || <span className="text-amber-700">Sin clasificar</span>}{c.remitente_nombre !== c.relacion && <span className="font-normal text-gris"> · {c.remitente_nombre}</span>}</span>
                    <span className="block truncate text-sm text-gris">Para {nombreDestinatario(p, c.destinatario)} <span className="text-xs">({p?.codigo}{p?.apellidos ? ` · ${p.apellidos}` : ''})</span>{c.recibida_de && <span className="text-xs"> · entregó {c.recibida_de}</span>}</span>
                  </span>
                  <span className="flex flex-wrap items-center gap-1.5">
                    {c.origen === 'fisica' && <Marca icono={Package} t="Papel" />}
                    {c.origen === 'correo' && <Marca icono={Mail} t="Correo" />}
                    {c.cca_archivos?.length > 0 && <Marca icono={Paperclip} t={c.cca_archivos.length} />}
                    {c.posible_duplicado && <Marca icono={CopyIcon} t="¿Duplicada?" alerta />}
                    {c.tardia && <Marca icono={Clock} t="Tardía" alerta />}
                    {c.incidencia && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700">Incidencia</span>}
                    {!esValida(c) && <Etiqueta estado={c.estado} />}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {abierta && <DetalleCarta cartaId={abierta} onCerrar={() => abrir(null)} />}
      {fisica && <CartaFisica parejaInicial={f.pareja} onCerrar={cerrarFisica} clave="bandeja" />}
    </div>
  )
}

const Marca = ({ icono: I, t, alerta }) => (
  <span className={`inline-flex h-6 items-center gap-1 rounded-full px-2 text-[11px] font-bold ${alerta ? 'bg-amber-100 text-amber-800' : 'bg-crema text-gris'}`}><I size={12} />{t}</span>
)
