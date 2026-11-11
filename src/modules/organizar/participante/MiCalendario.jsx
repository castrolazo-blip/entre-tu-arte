import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, Trash2, Loader2, Lock } from 'lucide-react'
import { ui } from '../marca.jsx'
import { bloquear, desbloquear, mensajeError } from '../servicio.js'
import { fechaLarga, textoBloqueo, fechasEvento, choca } from '../fechas.js'

// Calendario privado general: lo que se marca aquí aplica a todos los eventos que coincidan
export default function MiCalendario({ token, bloqueos, eventos, hoy, onBloqueos }) {
  const [fecha, setFecha] = useState('')
  const [tipo, setTipo] = useState('dia')
  const [desde, setDesde] = useState('15:00')
  const [hasta, setHasta] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [borrando, setBorrando] = useState(null)

  const abiertos = useMemo(() => eventos.filter(e => e.estado === 'disponibilidad').map(e => ({ ...e, fechas: new Set(fechasEvento(e)) })), [eventos])
  const porFecha = useMemo(() => {
    const m = new Map()
    for (const b of [...bloqueos].sort((a, b) => a.fecha.localeCompare(b.fecha))) { if (!m.has(b.fecha)) m.set(b.fecha, []); m.get(b.fecha).push(b) }
    return [...m.entries()]
  }, [bloqueos])

  async function agregar(e) {
    e.preventDefault()
    if (!fecha) { toast.error('Elegí la fecha'); return }
    const [d, h] = tipo === 'dia' ? [null, null] : [desde || null, hasta || null]
    if (tipo === 'horas' && !d) { toast.error('Indicá desde qué hora'); return }
    setGuardando(true)
    try {
      const id = await bloquear(token, fecha, d, h)
      onBloqueos(l => (l.some(b => b.id === id) ? l : [...l, { id, fecha, desde: d, hasta: h }]))
      toast.success('Agregado a tu calendario')
      setFecha('')
    } catch (err) { toast.error(mensajeError(err)) }
    finally { setGuardando(false) }
  }

  async function quitar(b) {
    setBorrando(b.id)
    try { await desbloquear(token, [b.id]); onBloqueos(l => l.filter(x => x.id !== b.id)) }
    catch (err) { toast.error(mensajeError(err)) }
    finally { setBorrando(null) }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={agregar} className={ui.tarjeta}>
        <h3 className="text-lg font-bold">Cuándo no puedo</h3>
        <p className="mt-1 text-[14px] text-slate-600">Lo que anotás aquí se aplica solo a todos tus eventos que caigan ese día y a esa hora.</p>
        <label className={`${ui.etiqueta} mt-4`}>Fecha
          <input type="date" min={hoy} value={fecha} onChange={e => setFecha(e.target.value)} className={`${ui.campo} mt-1.5`} />
        </label>
        <div className="mt-3 grid grid-cols-2 gap-1 rounded-2xl bg-slate-50 p-1 text-[13px] font-semibold">
          {[['dia', 'Todo el día'], ['horas', 'Solo unas horas']].map(([k, t]) => (
            <button type="button" key={k} onClick={() => setTipo(k)} className={`h-10 rounded-xl ${tipo === k ? 'bg-white text-teal-800 shadow-sm ring-1 ring-teal-700/30' : 'text-slate-500'}`}>{t}</button>
          ))}
        </div>
        {tipo === 'horas' && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className={ui.etiqueta}>Desde<input type="time" value={desde} onChange={e => setDesde(e.target.value)} className={`${ui.campo} mt-1.5`} /></label>
            <label className={ui.etiqueta}>Hasta <span className="font-normal text-slate-400">(opcional)</span><input type="time" value={hasta} onChange={e => setHasta(e.target.value)} className={`${ui.campo} mt-1.5`} /></label>
          </div>
        )}
        <button disabled={guardando} className={`${ui.btn} mt-4 w-full`}>{guardando ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}Agregar</button>
      </form>

      <div className={ui.tarjeta}>
        <h3 className="text-lg font-bold">Mis días ocupados</h3>
        {!porFecha.length && <p className="mt-2 text-sm text-slate-500">No tenés nada marcado. ¡Qué buena agenda! 🙌</p>}
        <ul className="mt-3 divide-y divide-slate-100">
          {porFecha.map(([f, lista]) => (
            <li key={f} className="py-3">
              <p className="font-bold">{fechaLarga(f)}</p>
              {lista.map(b => {
                const afecta = abiertos.filter(e => e.fechas.has(f) && choca(b, e))
                return (
                  <div key={b.id} className="mt-1.5 flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-700">{textoBloqueo(b)}</p>
                      {afecta.length > 0 && <p className="truncate text-[12px] font-semibold text-rose-600">Cuenta para: {afecta.map(e => e.titulo).join(', ')}</p>}
                    </div>
                    <button onClick={() => quitar(b)} disabled={borrando === b.id} className={ui.btnMini} aria-label="Quitar">
                      {borrando === b.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                )
              })}
            </li>
          ))}
        </ul>
        <p className="mt-3 flex items-center gap-1.5 text-[12px] text-slate-500"><Lock size={13} />Nadie más ve este calendario.</p>
      </div>
    </div>
  )
}
