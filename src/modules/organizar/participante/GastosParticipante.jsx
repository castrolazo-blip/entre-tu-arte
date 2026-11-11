import { Wallet } from 'lucide-react'
import { ui } from '../marca.jsx'
import { calcularReparto, dinero } from '../gastos.js'

// Cuadre de gastos del evento: total, cuánto toca a cada quien y quién le paga a quién
export default function GastosParticipante({ ev }) {
  const personas = ev.reparto || []
  const r = calcularReparto(personas.map(p => ({ ...p, pagado: Number(p.pagado) })))
  if (!r.total) return null
  const yo = personas.find(p => p.yo)
  const mio = yo ? r.saldos[yo.id] || 0 : 0
  const mios = r.transferencias.filter(t => t.de.yo || t.a.yo)
  const otros = r.transferencias.filter(t => !t.de.yo && !t.a.yo)
  return (
    <div className={ui.tarjeta}>
      <h3 className="flex items-center gap-2 text-lg font-bold"><Wallet size={20} className="text-teal-700" />Gastos</h3>
      <p className="mt-1 text-[14px] text-slate-600">Total {dinero(r.total)} · somos {r.pagan} · toca <b>{dinero(r.cuota)}</b> c/u</p>
      <div className={`mt-3 rounded-2xl p-4 ${mio < 0 ? 'bg-rose-50 text-rose-900' : mio > 0 ? 'bg-emerald-50 text-emerald-900' : 'bg-slate-50 text-slate-700'}`}>
        {mios.length ? mios.map((t, k) => (
          <p key={k} className="text-[17px] font-bold">{t.de.yo ? `Le pagás ${dinero(t.monto)} a ${t.a.nombre}` : `${t.de.nombre} te paga ${dinero(t.monto)}`}</p>
        )) : <p className="text-[17px] font-bold">{yo && !yo.paga ? 'No entrás en el reparto' : 'Estás a mano ✅'}</p>}
        {yo && <p className="mt-1 text-[13px] opacity-80">Gastaste {dinero(Math.round(Number(yo.pagado) * 100))}{yo.paga ? ` · te toca ${dinero(r.cuota)}` : ''}</p>}
      </div>
      {otros.length > 0 && (
        <ul className="mt-3 space-y-1 text-[13px] text-slate-600">
          {otros.map((t, k) => <li key={k}>{t.de.nombre} le paga {dinero(t.monto)} a {t.a.nombre}</li>)}
        </ul>
      )}
      <p className="mt-3 text-[12px] text-slate-400">Se recalcula cuando alguien anota lo que gastó.</p>
    </div>
  )
}
