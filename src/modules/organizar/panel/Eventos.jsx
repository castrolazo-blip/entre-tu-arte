import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, ChevronRight, Loader2 } from 'lucide-react'
import { ui, ChipEstado } from '../marca.jsx'
import { listarEventos, mensajeError } from '../servicio.js'
import { periodo, diasTexto, horario, fechaLarga, hoyTexto } from '../fechas.js'

export default function Eventos() {
  const [eventos, setEventos] = useState(null)
  const [error, setError] = useState('')
  const [ver, setVer] = useState('activos')

  useEffect(() => { listarEventos().then(setEventos).catch(e => setError(mensajeError(e))) }, [])

  const hoy = hoyTexto()
  const terminado = e => e.estado === 'cancelado' || (e.estado === 'confirmado' && e.fecha_elegida < hoy) || (e.estado === 'disponibilidad' && e.hasta < hoy)
  const lista = (eventos || []).filter(e => (ver === 'activos' ? !terminado(e) : terminado(e)))

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-bold leading-tight">Eventos</h1>
          <p className="text-slate-500">Cada evento tiene sus propios invitados, fechas y votación.</p>
        </div>
        <Link to="/organizar/panel/evento/nuevo" className={ui.btn}><Plus size={19} />Nuevo evento</Link>
      </div>

      <div className="mt-5 flex gap-2">
        {[['activos', 'Activos'], ['terminados', 'Terminados']].map(([k, t]) => (
          <button key={k} onClick={() => setVer(k)} className={`h-10 rounded-full px-4 text-sm font-bold ${ver === k ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'}`}>{t}</button>
        ))}
      </div>

      {error && <p className="mt-6 rounded-2xl bg-rose-50 p-4 text-rose-800">{error}</p>}
      {!eventos && !error && <div className="mt-10 flex justify-center"><Loader2 className="animate-spin text-teal-700" /></div>}
      {eventos && !lista.length && (
        <div className={`${ui.tarjeta} mt-5 text-center`}>
          <p className="text-lg font-bold">{ver === 'activos' ? 'No hay eventos activos' : 'Nada por aquí'}</p>
          {ver === 'activos' && <p className="mt-1 text-slate-500">Creá el primero: nombre, período, días, horario e invitados.</p>}
        </div>
      )}

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {lista.map(e => {
          const pct = e.invitados ? Math.round((e.respondieron / e.invitados) * 100) : 0
          return (
            <Link key={e.id} to={`/organizar/panel/evento/${e.id}`} className={`${ui.tarjeta} flex items-center gap-3 transition hover:ring-2 hover:ring-teal-700/20`}>
              <div className="min-w-0 flex-1">
                <ChipEstado estado={e.estado} />
                <p className="mt-2 truncate text-[17px] font-bold">{e.titulo}</p>
                <p className="text-[13px] text-slate-500">
                  {e.estado === 'confirmado' ? `📅 ${fechaLarga(e.fecha_elegida)} · ${horario(e)}` : `${periodo(e.desde, e.hasta)} · ${diasTexto(e.dias)} · ${horario(e)}`}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-600" style={{ width: `${pct}%` }} /></div>
                  <span className="text-[12px] font-bold text-slate-600">{e.respondieron}/{e.invitados} respondieron</span>
                </div>
                {e.estado === 'votacion' && <p className="mt-1 text-[12px] font-bold text-sky-700">{e.votaron}/{e.invitados} votaron</p>}
              </div>
              <ChevronRight className="shrink-0 text-slate-400" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
