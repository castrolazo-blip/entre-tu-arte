import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Plus, ChevronRight, Loader2, Copy, MessageCircle, RefreshCw } from 'lucide-react'
import { ui, ChipEstado } from '../marca.jsx'
import { listarEventos, mensajeError } from '../servicio.js'
import { periodo, diasTexto, horario, fechaLarga, hoyTexto, hace } from '../fechas.js'
import { textoStatusGeneral } from '../whatsapp.js'

export default function Eventos() {
  const [eventos, setEventos] = useState(null)
  const [error, setError] = useState('')
  const [ver, setVer] = useState('activos')

  const [actualizado, setActualizado] = useState(null)
  const cargar = () => listarEventos().then(l => { setEventos(l); setActualizado(new Date()) }).catch(e => setError(mensajeError(e)))
  // Status en vivo: se actualiza cada minuto y al volver a la pantalla
  useEffect(() => {
    cargar()
    const reloj = setInterval(() => { if (document.visibilityState === 'visible') cargar() }, 60000)
    const alVolver = () => { if (document.visibilityState === 'visible') cargar() }
    document.addEventListener('visibilitychange', alVolver)
    return () => { clearInterval(reloj); document.removeEventListener('visibilitychange', alVolver) }
  }, [])

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

      {eventos && ver === 'activos' && lista.length > 0 && <StatusGeneral eventos={lista} actualizado={actualizado} recargar={cargar} />}

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
                <Faltan e={e} />
              </div>
              <ChevronRight className="shrink-0 text-slate-400" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}

// Quién falta en cada evento (por responder o por votar) y cuándo fue la última respuesta
function Faltan({ e }) {
  const votando = e.estado === 'votacion' || e.estado === 'cerrada'
  if (e.estado !== 'disponibilidad' && !votando) return null
  const faltan = (votando ? e.sin_voto : e.pendientes) || []
  return (
    <div className="mt-2 text-[12px]">
      {faltan.length
        ? <p className="font-semibold text-amber-700">⏳ Faltan: {faltan.map(n => n.split(' ')[0]).join(', ')}</p>
        : <p className="font-semibold text-emerald-700">✅ {votando ? 'Ya votaron todos' : 'Ya respondieron todos'}</p>}
      {!votando && e.ultima_respuesta && <p className="text-slate-400">Última respuesta {hace(e.ultima_respuesta)}</p>}
    </div>
  )
}

function StatusGeneral({ eventos, actualizado, recargar }) {
  const abiertos = eventos.filter(e => e.estado !== 'cancelado')
  const pendientes = abiertos.reduce((s, e) => s + ((e.estado === 'votacion' ? e.sin_voto : e.estado === 'disponibilidad' ? e.pendientes : []) || []).length, 0)
  const texto = textoStatusGeneral(abiertos)
  async function copiar() {
    try { await navigator.clipboard.writeText(texto); toast.success('Status copiado') } catch { toast.error('No se pudo copiar') }
  }
  return (
    <div className={`${ui.tarjeta} mt-5`}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <p className="font-bold">Status de hoy</p>
          <p className="text-sm text-slate-500">{pendientes ? `${pendientes} ${pendientes === 1 ? 'respuesta pendiente' : 'respuestas pendientes'} en ${abiertos.length} ${abiertos.length === 1 ? 'evento' : 'eventos'}` : 'Nadie tiene pendientes 🎉'}{actualizado && ` · actualizado ${actualizado.toLocaleTimeString('es-SV', { hour: 'numeric', minute: '2-digit' })}`}</p>
        </div>
        <button onClick={recargar} className={ui.btnMini} title="Actualizar"><RefreshCw size={14} /></button>
        <button onClick={copiar} className={ui.btnMini}><Copy size={14} />Copiar status</button>
        <a href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noreferrer" className={ui.btnMini}><MessageCircle size={14} className="text-[#25D366]" />WhatsApp</a>
      </div>
    </div>
  )
}
