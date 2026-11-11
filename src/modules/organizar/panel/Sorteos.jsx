import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, ChevronRight, Loader2, Gift } from 'lucide-react'
import { ui } from '../marca.jsx'
import { listarSorteos, mensajeError } from '../servicio.js'
import { fechaLarga } from '../fechas.js'

export default function Sorteos() {
  const [sorteos, setSorteos] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => { listarSorteos().then(setSorteos).catch(e => setError(mensajeError(e))) }, [])

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-bold leading-tight">Amigo secreto</h1>
          <p className="text-slate-500">La app sortea y cada quien ve a quién le tocó con su enlace. Nadie más lo ve, ni vos.</p>
        </div>
        <Link to="/organizar/panel/amigo-secreto/nuevo" className={ui.btn}><Plus size={19} />Nuevo sorteo</Link>
      </div>
      {error && <p className="mt-6 rounded-2xl bg-rose-50 p-4 text-rose-800">{error}</p>}
      {!sorteos && !error && <div className="mt-10 flex justify-center"><Loader2 className="animate-spin text-teal-700" /></div>}
      {sorteos && !sorteos.length && (
        <div className={`${ui.tarjeta} mt-5 text-center`}>
          <Gift className="mx-auto text-teal-700" size={32} />
          <p className="mt-2 text-lg font-bold">Todavía no hay sorteos</p>
          <p className="mt-1 text-slate-500">Creá uno, elegí a los participantes (podés copiar los invitados de un evento) y sorteá.</p>
        </div>
      )}
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {(sorteos || []).map(s => {
          const n = s.participantes.length, vistos = s.participantes.filter(p => p.visto_en).length
          return (
            <Link key={s.id} to={`/organizar/panel/amigo-secreto/${s.id}`} className={`${ui.tarjeta} flex items-center gap-3 transition hover:ring-2 hover:ring-teal-700/20`}>
              <div className="min-w-0 flex-1">
                <span className={`${ui.chip} ${s.estado === 'sorteado' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{s.estado === 'sorteado' ? 'Sorteado' : 'Sin sortear'}</span>
                <p className="mt-2 truncate text-[17px] font-bold">🎁 {s.titulo}</p>
                <p className="text-[13px] text-slate-500">{n} participantes{s.monto ? ` · ${s.monto}` : ''}{s.fecha_intercambio ? ` · ${fechaLarga(s.fecha_intercambio)}` : ''}</p>
                {s.estado === 'sorteado' && (
                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-600" style={{ width: `${n ? (vistos / n) * 100 : 0}%` }} /></div>
                    <span className="text-[12px] font-bold text-slate-600">{vistos}/{n} ya vieron</span>
                  </div>
                )}
              </div>
              <ChevronRight className="shrink-0 text-slate-400" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
