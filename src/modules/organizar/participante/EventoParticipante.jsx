import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { ArrowLeft, Check, Lock, MapPin, CalendarPlus, Download, Loader2, Vote, PartyPopper, Clock } from 'lucide-react'
import { ui, ChipEstado } from '../marca.jsx'
import Calendario from '../Calendario.jsx'
import AmigoParticipante from './AmigoParticipante.jsx'
import EncargosParticipante from './EncargosParticipante.jsx'
import ComidaParticipante from './ComidaParticipante.jsx'
import { bloquear, desbloquear, marcarListo, votar, mensajeError } from '../servicio.js'
import { fechasEvento, periodo, diasTexto, horario, fechaLarga, choca, textoBloqueo, enlaceGoogle, descargarIcs, hhmm } from '../fechas.js'

export default function EventoParticipante({ ev, token, bloqueos, hoy, deseo, onBloqueos, recargar, volver }) {
  return (
    <div className="space-y-4">
      <div className={ui.tarjeta}>
        <button onClick={volver} className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500"><ArrowLeft size={16} />Mis eventos</button>
        <ChipEstado estado={ev.estado} />
        <h2 className="mt-2 text-[22px] font-bold leading-tight">{ev.titulo}</h2>
        <div className="mt-3 flex flex-wrap gap-2 text-[13px] font-semibold text-slate-600">
          <span className="rounded-full bg-slate-100 px-3 py-1.5">{periodo(ev.desde, ev.hasta)}</span>
          <span className="rounded-full bg-slate-100 px-3 py-1.5">{horario(ev)}</span>
          <span className="rounded-full bg-slate-100 px-3 py-1.5">{diasTexto(ev.dias)}</span>
        </div>
        {ev.lugar && <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-600"><MapPin size={15} />{ev.lugar}</p>}
        {ev.descripcion && <p className="mt-3 whitespace-pre-line text-[15px] text-slate-700">{ev.descripcion}</p>}
      </div>

      {ev.estado === 'disponibilidad' && <Disponibilidad ev={ev} token={token} bloqueos={bloqueos} hoy={hoy} onBloqueos={onBloqueos} recargar={recargar} />}
      {(ev.estado === 'votacion' || ev.estado === 'cerrada') && <Votacion ev={ev} token={token} bloqueos={bloqueos} recargar={recargar} />}
      {ev.estado === 'confirmado' && <Confirmado ev={ev} />}
      <ComidaParticipante ev={ev} token={token} recargar={recargar} />
      <EncargosParticipante ev={ev} token={token} recargar={recargar} />
      {ev.amigo && <AmigoParticipante s={ev.amigo} token={token} deseo={deseo} recargar={recargar} />}
    </div>
  )
}

// ── Paso 1: marcar cuándo NO puede ──────────────────────────────────────────
function Disponibilidad({ ev, token, bloqueos, hoy, onBloqueos, recargar }) {
  const [modo, setModo] = useState('horario')      // horario del evento · todo el día
  const [ocupado, setOcupado] = useState(() => new Set())
  const [enviando, setEnviando] = useState(false)
  const posibles = useMemo(() => new Set(fechasEvento(ev)), [ev])
  const vencido = ev.fecha_limite && hoy > ev.fecha_limite

  const porFecha = useMemo(() => {
    const m = {}
    for (const b of bloqueos) (m[b.fecha] ||= []).push(b)
    return m
  }, [bloqueos])
  const noPuedo = f => (porFecha[f] || []).some(b => choca(b, ev))
  const marcadas = [...posibles].filter(f => f >= hoy && noPuedo(f)).length
  const futuras = [...posibles].filter(f => f >= hoy).length

  async function tocar(fecha) {
    if (ocupado.has(fecha)) return
    setOcupado(s => new Set(s).add(fecha))
    try {
      const chocan = (porFecha[fecha] || []).filter(b => choca(b, ev))
      if (chocan.length) {
        const ids = chocan.map(b => b.id)
        await desbloquear(token, ids)
        onBloqueos(l => l.filter(b => !ids.includes(b.id)))
        if (chocan.some(b => hhmm(b.desde) !== hhmm(ev.hora_inicio) || hhmm(b.hasta) !== hhmm(ev.hora_fin))) {
          toast('Lo quitamos de tu calendario: también cuenta para tus otros eventos ese día.', { icon: '🗓️', duration: 5000 })
        }
      } else {
        const [desde, hasta] = modo === 'dia' ? [null, null] : [hhmm(ev.hora_inicio), hhmm(ev.hora_fin)]
        const id = await bloquear(token, fecha, desde, hasta)
        onBloqueos(l => [...l, { id, fecha, desde, hasta }])
      }
    } catch (e) { toast.error(mensajeError(e)) }
    finally { setOcupado(s => { const n = new Set(s); n.delete(fecha); return n }) }
  }

  async function listo() {
    setEnviando(true)
    try { await marcarListo(token, ev.id); await recargar(); toast.success('¡Gracias! Tu disponibilidad quedó guardada.') }
    catch (e) { toast.error(mensajeError(e)) }
    finally { setEnviando(false) }
  }

  return (
    <div className={ui.tarjeta}>
      <h3 className="text-lg font-bold">Mi disponibilidad privada</h3>
      <p className="mt-1 text-[15px] text-slate-600">Tocá los días en que <b>no podés</b> ({horario(ev).toLowerCase()}). Tocá otra vez para desmarcar.</p>
      {ev.fecha_limite && (
        <p className={`mt-3 flex items-center gap-1.5 text-sm font-semibold ${vencido ? 'text-rose-700' : 'text-amber-700'}`}>
          <Clock size={15} />{vencido ? 'El plazo era el ' : 'Plazo: '}{fechaLarga(ev.fecha_limite, { mayus: false })}
        </p>
      )}

      <div className="mt-4 rounded-2xl bg-slate-50 p-1.5 text-[13px] font-semibold">
        <p className="px-2 pb-1.5 pt-1 text-slate-500">Al tocar un día, marco que no puedo:</p>
        <div className="grid grid-cols-2 gap-1">
          {[['horario', 'Solo a esa hora'], ['dia', 'Todo el día']].map(([k, t]) => (
            <button key={k} onClick={() => setModo(k)} className={`h-10 rounded-xl transition ${modo === k ? 'bg-white text-teal-800 shadow-sm ring-1 ring-teal-700/30' : 'text-slate-500'}`}>{t}</button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <Calendario desde={ev.desde} hasta={ev.hasta} onTocar={tocar} celda={f => {
          if (!posibles.has(f) || f < hoy) return { activa: false }
          const no = noPuedo(f)
          const otraHora = !no && (porFecha[f] || []).length > 0
          return {
            activa: true,
            titulo: no ? 'No puedo' : otraHora ? `Tenés algo a otra hora: ${(porFecha[f] || []).map(textoBloqueo).join(', ')}` : 'Disponible',
            clase: `${no ? 'bg-rose-500 text-white line-through decoration-2' : 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200'} ${ocupado.has(f) ? 'opacity-50' : ''}`,
            marca: otraHora ? <span className="block h-1.5 w-1.5 rounded-full bg-amber-500" /> : null,
          }
        }} />
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] font-semibold text-slate-600">
        <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded bg-rose-500" />No puedo</span>
        <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded bg-emerald-50 ring-1 ring-emerald-200" />Disponible</span>
        <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />Ocupado a otra hora (no afecta)</span>
      </div>

      <p className="mt-5 flex gap-2 rounded-2xl bg-teal-50 p-3 text-[13px] text-teal-900">
        <Lock size={16} className="mt-0.5 shrink-0" />
        <span>Solo vos ves tu calendario. El organizador solo ve cuántas personas pueden cada día, nunca quién ni por qué. Lo que marcás también se aplica a tus otros eventos.</span>
      </p>

      {ev.respondio ? (
        <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-emerald-900">
          <p className="flex items-center gap-2 font-bold"><Check size={18} />¡Listo! Tu disponibilidad quedó registrada.</p>
          <p className="mt-1 text-sm">Podés seguir cambiando tus días mientras se recogen las fechas. Te avisaremos cuando toque votar.</p>
        </div>
      ) : (
        <>
          <button onClick={listo} disabled={enviando} className={`${ui.btn} mt-5 h-14 w-full text-base`}>
            {enviando ? <Loader2 className="animate-spin" size={19} /> : <Check size={19} />}
            {marcadas ? `Listo, no puedo ${marcadas} ${marcadas === 1 ? 'día' : 'días'}` : 'Puedo todos estos días'}
          </button>
          <p className="mt-2 text-center text-[12px] text-slate-500">Hasta que confirmés, contás como «sin respuesta» (no como disponible). {futuras} días posibles.</p>
        </>
      )}
    </div>
  )
}

// ── Paso 2: votar ────────────────────────────────────────────────────────────
function Votacion({ ev, token, bloqueos, recargar }) {
  const [enviando, setEnviando] = useState(null)
  const abierta = ev.estado === 'votacion'

  async function elegir(fecha) {
    if (!abierta || enviando) return
    setEnviando(fecha)
    try { await votar(token, ev.id, fecha); await recargar(); toast.success('¡Voto guardado!') }
    catch (e) { toast.error(mensajeError(e)) }
    finally { setEnviando(null) }
  }

  return (
    <div className={ui.tarjeta}>
      <h3 className="flex items-center gap-2 text-lg font-bold"><Vote size={20} className="text-sky-700" />
        {ev.ronda > 1 ? 'Desempate: ¿qué fecha preferís?' : '¿Qué fecha preferís?'}</h3>
      <p className="mt-1 text-[15px] text-slate-600">
        {abierta ? 'Son las fechas en que más personas pueden. Elegí una; podés cambiarla mientras la votación siga abierta.'
                 : 'La votación cerró. El organizador va a confirmar la fecha y te avisaremos.'}
      </p>
      <div className="mt-4 space-y-2.5">
        {ev.opciones.map(f => {
          const mio = ev.mi_voto === f
          const noPuedo = bloqueos.some(b => b.fecha === f && choca(b, ev))
          return (
            <button key={f} onClick={() => elegir(f)} disabled={!abierta}
              className={`flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left transition ${mio ? 'border-teal-700 bg-teal-50' : 'border-slate-200 bg-white'} ${abierta ? 'hover:border-teal-700/60' : 'cursor-default'}`}>
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${mio ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300'}`}>
                {enviando === f ? <Loader2 size={13} className="animate-spin" /> : mio && <Check size={14} strokeWidth={3} />}
              </span>
              <span className="flex-1">
                <span className="block font-bold">{fechaLarga(f)}</span>
                <span className="block text-[13px] text-slate-500">{horario(ev)}</span>
                {noPuedo && <span className="mt-1 block text-[12px] font-semibold text-rose-600">Marcaste que no podés este día</span>}
              </span>
            </button>
          )
        })}
      </div>
      {ev.mi_voto && <p className="mt-4 text-center text-sm font-semibold text-teal-800">Tu voto: {fechaLarga(ev.mi_voto)}</p>}
    </div>
  )
}

// ── Paso 3: fecha confirmada ─────────────────────────────────────────────────
function Confirmado({ ev }) {
  return (
    <div className="rounded-3xl bg-teal-700 p-6 text-white">
      <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-white/80"><PartyPopper size={18} />¡Fecha confirmada!</p>
      <p className="mt-3 text-[26px] font-bold leading-tight">{fechaLarga(ev.fecha_elegida)}</p>
      <p className="mt-1 text-white/85">{horario(ev)}{ev.lugar ? ` · ${ev.lugar}` : ''}</p>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <a href={enlaceGoogle(ev, ev.fecha_elegida)} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white font-semibold text-teal-800"><CalendarPlus size={18} />Google Calendar</a>
        <button onClick={() => descargarIcs(ev, ev.fecha_elegida)} className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/40 font-semibold"><Download size={18} />iPhone / Outlook</button>
      </div>
    </div>
  )
}
