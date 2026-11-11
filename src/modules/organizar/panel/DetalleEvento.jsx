import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, Pencil, Loader2, MessageCircle, Copy, Check, Vote, Trophy, CalendarPlus, RotateCcw, Ban, Trash2, List, CalendarDays, Lock, ExternalLink } from 'lucide-react'
import { ui, ChipEstado } from '../marca.jsx'
import Calendario from '../Calendario.jsx'
import { cargarEvento, actualizarEvento, abrirVotacion, borrarEvento, mensajeError } from '../servicio.js'
import { periodo, diasTexto, horario, fechaLarga, fechaCorta, diaSemana, DIAS, enlaceGoogle } from '../fechas.js'
import { enlacePersonal, urlWhatsApp, mensajesPara } from '../whatsapp.js'

const MAX_OPCIONES = 6

export default function DetalleEvento() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [d, setD] = useState(null)
  const [error, setError] = useState('')
  const [trabajando, setTrabajando] = useState(false)
  const [seleccion, setSeleccion] = useState(null)   // fechas elegidas para votar
  const [vista, setVista] = useState('lista')

  const recargar = useCallback(async () => {
    try { setD(await cargarEvento(id)); setError('') } catch (e) { setError(mensajeError(e)) }
  }, [id])
  useEffect(() => { recargar() }, [recargar])
  useEffect(() => {
    const alVolver = () => { if (document.visibilityState === 'visible') recargar() }
    document.addEventListener('visibilitychange', alVolver)
    return () => document.removeEventListener('visibilitychange', alVolver)
  }, [recargar])

  const calculo = useMemo(() => {
    if (!d) return null
    const n = d.invitados.length
    const respondieron = d.invitados.filter(i => i.respondio_en).length
    const futuras = d.fechas.filter(f => f.fecha >= d.hoy)
    const ranking = [...futuras].sort((a, b) => b.pueden - a.pueden || a.no_pueden - b.no_pueden || a.fecha.localeCompare(b.fecha))
    const todos = ranking.filter(f => n > 0 && f.pueden === n)
    // Resumen por día de la semana: en cuántas de sus fechas nadie tiene conflicto
    const semana = {}
    for (const f of futuras) {
      const s = (semana[diaSemana(f.fecha)] ||= { total: 0, libres: 0, pueden: 0 })
      s.total++; if (f.no_pueden === 0) s.libres++; s.pueden += f.pueden
    }
    return { n, respondieron, ranking, todos, semana, porFecha: Object.fromEntries(d.fechas.map(f => [f.fecha, f])) }
  }, [d])

  // Selección inicial para la votación: las fechas en que todos pueden (o las mejores)
  useEffect(() => {
    if (!calculo || seleccion) return
    const base = calculo.todos.length >= 2 ? calculo.todos : calculo.ranking
    setSeleccion(base.slice(0, Math.min(3, MAX_OPCIONES)).map(f => f.fecha))
  }, [calculo, seleccion])

  if (error) return <p className="rounded-2xl bg-rose-50 p-4 text-rose-800">{error}</p>
  if (!d || !calculo) return <div className="mt-10 flex justify-center"><Loader2 className="animate-spin text-teal-700" /></div>

  const ev = d.evento
  const { n, respondieron, ranking, todos, semana, porFecha } = calculo
  const sel = seleccion || []
  const alternarSel = f => setSeleccion(l => (l.includes(f) ? l.filter(x => x !== f) : l.length >= MAX_OPCIONES ? (toast.error(`Máximo ${MAX_OPCIONES} opciones`), l) : [...l, f]))

  async function ejecutar(fn, ok) {
    setTrabajando(true)
    try { await fn(); await recargar(); if (ok) toast.success(ok) }
    catch (e) { toast.error(mensajeError(e)) }
    finally { setTrabajando(false) }
  }
  const confirmarFecha = f => {
    if (!window.confirm(`¿Confirmar «${ev.titulo}» para el ${fechaLarga(f, { mayus: false })}?`)) return
    ejecutar(() => actualizarEvento(ev.id, { estado: 'confirmado', fecha_elegida: f }), '¡Fecha confirmada! Avisale a cada invitado por WhatsApp.')
  }
  const votar = opciones => {
    if (opciones.length < 2) { toast.error('Elegí al menos 2 fechas (o confirmá una directamente)'); return }
    ejecutar(() => abrirVotacion(ev.id, [...opciones].sort()), 'Votación abierta. Enviá el aviso a cada invitado.')
  }
  const cambiarEstado = (estado, texto, extra = {}) => {
    if (texto && !window.confirm(texto)) return
    ejecutar(() => actualizarEvento(ev.id, { estado, ...extra }))
  }

  return (
    <div className="space-y-4">
      <Link to="/organizar/panel" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500"><ArrowLeft size={16} />Eventos</Link>

      {/* Encabezado */}
      <section className={ui.tarjeta}>
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <ChipEstado estado={ev.estado} />
            <h1 className="mt-2 text-[26px] font-bold leading-tight">{ev.titulo}</h1>
            <p className="mt-1 text-slate-500">{periodo(ev.desde, ev.hasta)} · {diasTexto(ev.dias)} · {horario(ev)}{ev.lugar ? ` · ${ev.lugar}` : ''}</p>
            {ev.fecha_limite && <p className="mt-1 text-sm font-semibold text-amber-700">Plazo para responder: {fechaLarga(ev.fecha_limite, { mayus: false })}</p>}
          </div>
          <Link to={`/organizar/panel/evento/${ev.id}/editar`} className={ui.btnMini}><Pencil size={14} />Editar</Link>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Dato valor={`${respondieron}/${n}`} texto="respondieron" />
          <Dato valor={todos.length} texto={todos.length === 1 ? 'fecha en que todos pueden' : 'fechas en que todos pueden'} />
          <Dato valor={ev.estado === 'votacion' || ev.estado === 'cerrada' ? `${d.invitados.filter(i => i.voto).length}/${n}` : '—'} texto="votaron" />
        </div>
      </section>

      {/* Confirmado */}
      {ev.estado === 'confirmado' && (
        <section className="rounded-3xl bg-teal-700 p-6 text-white">
          <p className="text-sm font-bold uppercase tracking-wide text-white/80">Fecha confirmada</p>
          <p className="mt-2 text-[26px] font-bold">{fechaLarga(ev.fecha_elegida)}</p>
          <p className="text-white/85">{horario(ev)}{ev.lugar ? ` · ${ev.lugar}` : ''}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href={enlaceGoogle(ev, ev.fecha_elegida)} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-teal-800"><CalendarPlus size={17} />Agregar a mi calendario</a>
            <button disabled={trabajando} onClick={() => cambiarEstado('cerrada', '¿Quitar la confirmación? El evento vuelve a «votación cerrada».', { fecha_elegida: null })} className="inline-flex h-11 items-center gap-2 rounded-full border border-white/40 px-5 text-sm font-semibold"><RotateCcw size={16} />Deshacer</button>
          </div>
          <p className="mt-4 text-sm text-white/80">Avisale a cada invitado con el botón «Avisar fecha» de la lista.</p>
        </section>
      )}

      {/* Votación */}
      {(ev.estado === 'votacion' || ev.estado === 'cerrada') && (
        <Votacion ev={ev} d={d} n={n} trabajando={trabajando} confirmarFecha={confirmarFecha} votar={votar}
          cerrar={() => cambiarEstado('cerrada', '¿Cerrar la votación? Ya nadie podrá votar ni cambiar su voto.')}
          reabrir={() => cambiarEstado('votacion')}
          volverADisponibilidad={() => cambiarEstado('disponibilidad', '¿Volver a recoger disponibilidad? Los votos de esta ronda se conservan, pero la votación se cierra.')} />
      )}

      {/* Resultados */}
      {ev.estado !== 'cancelado' && (
        <section className={ui.tarjeta}>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="flex-1 text-lg font-bold">Resultados</h2>
            <div className="flex rounded-full bg-slate-100 p-1">
              {[['lista', List], ['calendario', CalendarDays]].map(([k, Icono]) => (
                <button key={k} onClick={() => setVista(k)} className={`grid h-8 w-10 place-items-center rounded-full ${vista === k ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-500'}`} aria-label={k}><Icono size={16} /></button>
              ))}
            </div>
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-[13px] text-slate-500"><Lock size={13} />Solo conteos: nadie, ni el administrador, ve quién bloqueó qué día.</p>
          {respondieron < n && <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900"><b>{n - respondieron} sin responder.</b> No cuentan como disponibles: los resultados pueden cambiar cuando respondan.</p>}

          {vista === 'calendario' ? (
            <div className="mt-4 max-w-md">
              <Calendario desde={ev.desde} hasta={ev.hasta} onTocar={ev.estado === 'disponibilidad' ? alternarSel : undefined} celda={f => {
                const x = porFecha[f]
                if (!x || f < d.hoy) return { activa: false }
                const tono = n && x.pueden === n ? 'bg-emerald-600 text-white' : x.no_pueden === 0 ? 'bg-emerald-100 text-emerald-900' : x.pueden / (n || 1) >= 0.75 ? 'bg-lime-100 text-lime-900' : x.pueden / (n || 1) >= 0.5 ? 'bg-amber-100 text-amber-900' : 'bg-rose-100 text-rose-900'
                return { activa: true, clase: `${tono} ${sel.includes(f) && ev.estado === 'disponibilidad' ? 'ring-2 ring-sky-600 ring-offset-1' : ''}`, titulo: `${x.pueden}/${n} pueden · ${x.no_pueden} no · ${x.sin_respuesta} sin respuesta`,
                  marca: <span className="text-[9px] font-bold leading-none opacity-80">{x.pueden}/{n}</span> }
              }} />
              <p className="mt-3 text-[12px] text-slate-500">Verde fuerte = todos pueden · verde claro = nadie dijo que no (faltan respuestas) · rojo = varios no pueden.</p>
            </div>
          ) : (
            <ul className="mt-4 space-y-2">
              {ranking.slice(0, 12).map(f => (
                <FilaFecha key={f.fecha} f={f} n={n} elegible={ev.estado === 'disponibilidad'} elegida={sel.includes(f.fecha)} onElegir={() => alternarSel(f.fecha)} />
              ))}
              {!ranking.length && <p className="text-sm text-slate-500">No quedan fechas futuras en el período.</p>}
              {ranking.length > 12 && <p className="pt-1 text-center text-[13px] text-slate-400">Y {ranking.length - 12} fechas más con menos disponibilidad.</p>}
            </ul>
          )}

          {Object.keys(semana).length > 1 && (
            <div className="mt-5">
              <p className="text-sm font-bold">Por día de la semana</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6, 0].filter(k => semana[k]).map(k => {
                  const s = semana[k]
                  return <span key={k} className={`rounded-2xl px-3 py-2 text-[13px] ${s.libres ? 'bg-emerald-50 text-emerald-900' : 'bg-slate-100 text-slate-600'}`}>
                    <b className="capitalize">{DIAS[k]}</b> · {s.libres}/{s.total} sin conflictos
                  </span>
                })}
              </div>
            </div>
          )}

          {ev.estado === 'disponibilidad' && (
            <div className="mt-5 rounded-2xl bg-sky-50 p-4">
              <p className="font-bold text-sky-900">Siguiente paso: votación</p>
              <p className="mt-1 text-sm text-sky-900/80">Marcá con ✓ las fechas que querés someter a votación ({sel.length} elegidas) o confirmá una directamente.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button disabled={trabajando || sel.length < 2} onClick={() => votar(sel)} className={ui.btn}><Vote size={18} />Abrir votación ({sel.length})</button>
                {sel.length === 1 && <button disabled={trabajando} onClick={() => confirmarFecha(sel[0])} className={ui.btnSuave}><Check size={18} />Confirmar {fechaCorta(sel[0])}</button>}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Invitados */}
      <Invitados ev={ev} invitados={d.invitados} />

      {/* Más acciones */}
      <section className="flex flex-wrap gap-2">
        {ev.estado !== 'cancelado'
          ? <button disabled={trabajando} onClick={() => cambiarEstado('cancelado', '¿Cancelar el evento? Los invitados dejarán de verlo.', { fecha_elegida: null })} className={ui.btnMini}><Ban size={14} />Cancelar evento</button>
          : <button disabled={trabajando} onClick={() => cambiarEstado('disponibilidad')} className={ui.btnMini}><RotateCcw size={14} />Reactivar</button>}
        <button disabled={trabajando} onClick={async () => {
          if (!window.confirm('¿Eliminar el evento para siempre? Se borran sus invitados y votos (los calendarios de cada persona se conservan).')) return
          try { await borrarEvento(ev.id); toast.success('Evento eliminado'); navigate('/organizar/panel', { replace: true }) } catch (e) { toast.error(mensajeError(e)) }
        }} className={`${ui.btnMini} text-rose-700`}><Trash2 size={14} />Eliminar</button>
      </section>
    </div>
  )
}

function Dato({ valor, texto }) {
  return <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xl font-bold">{valor}</p><p className="text-[12px] leading-tight text-slate-500">{texto}</p></div>
}

function FilaFecha({ f, n, elegible, elegida, onElegir }) {
  const pct = n ? Math.round((f.pueden / n) * 100) : 0
  const todos = n > 0 && f.pueden === n
  return (
    <li className={`flex items-center gap-3 rounded-2xl border p-3 ${todos ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-100'}`}>
      {elegible && (
        <button onClick={onElegir} className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg border-2 ${elegida ? 'border-sky-600 bg-sky-600 text-white' : 'border-slate-300 bg-white'}`} aria-label="Elegir para votación">
          {elegida && <Check size={15} strokeWidth={3} />}
        </button>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-bold">{fechaLarga(f.fecha)}</p>
          <p className={`shrink-0 text-lg font-bold ${todos ? 'text-emerald-700' : 'text-slate-700'}`}>{f.pueden}/{n}</p>
        </div>
        <div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="bg-emerald-500" style={{ width: `${pct}%` }} />
          <div className="bg-slate-300" style={{ width: `${n ? (f.sin_respuesta / n) * 100 : 0}%` }} />
          <div className="bg-rose-400" style={{ width: `${n ? (f.no_pueden / n) * 100 : 0}%` }} />
        </div>
        <p className="mt-1 text-[12px] text-slate-500">{pct}% pueden{f.no_pueden ? ` · ${f.no_pueden} no` : ''}{f.sin_respuesta ? ` · ${f.sin_respuesta} sin responder` : ''}</p>
      </div>
    </li>
  )
}

function Votacion({ ev, d, n, trabajando, confirmarFecha, votar, cerrar, reabrir, volverADisponibilidad }) {
  const votos = Object.fromEntries(d.votos.map(v => [String(v.fecha).slice(0, 10), v.votos]))
  const total = d.votos.reduce((s, v) => s + v.votos, 0)
  const opciones = ev.opciones.map(o => String(o).slice(0, 10)).sort((a, b) => (votos[b] || 0) - (votos[a] || 0) || a.localeCompare(b))
  const max = Math.max(0, ...opciones.map(o => votos[o] || 0))
  const ganadoras = max > 0 ? opciones.filter(o => (votos[o] || 0) === max) : []
  const faltan = d.invitados.filter(i => !i.voto)
  const disp = Object.fromEntries(d.fechas.map(f => [f.fecha, f]))

  return (
    <section className={ui.tarjeta}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="flex flex-1 items-center gap-2 text-lg font-bold"><Vote size={20} className="text-sky-700" />{ev.ronda > 1 ? `Votación · ronda ${ev.ronda}` : 'Votación'}</h2>
        <span className="text-sm font-semibold text-slate-500">{total}/{n} votos</span>
      </div>
      <ul className="mt-4 space-y-2">
        {opciones.map(o => {
          const v = votos[o] || 0
          const gana = ganadoras.includes(o)
          return (
            <li key={o} className={`rounded-2xl border p-3 ${gana ? 'border-sky-300 bg-sky-50' : 'border-slate-100'}`}>
              <div className="flex items-center gap-2">
                {gana && <Trophy size={17} className="shrink-0 text-amber-500" />}
                <p className="flex-1 font-bold">{fechaLarga(o)}</p>
                <p className="text-lg font-bold">{v}</p>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-sky-500" style={{ width: `${total ? (v / total) * 100 : 0}%` }} /></div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-[12px] text-slate-500">{disp[o] ? `${disp[o].pueden}/${n} pueden` : ''}</p>
                <button disabled={trabajando} onClick={() => confirmarFecha(o)} className={ui.btnMini}><Check size={14} />Confirmar esta</button>
              </div>
            </li>
          )
        })}
      </ul>
      {faltan.length > 0 && <p className="mt-3 text-sm text-slate-600"><b>Faltan por votar:</b> {faltan.map(i => i.nombre.split(' ')[0]).join(', ')}</p>}
      {ganadoras.length > 1 && (
        <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-amber-900">
          <p className="font-bold">Hay empate entre {ganadoras.length} fechas</p>
          <p className="mt-1 text-sm">Decidí vos con «Confirmar esta» o abrí una segunda votación solo entre las empatadas.</p>
          <button disabled={trabajando} onClick={() => { if (window.confirm('Se abre una ronda nueva solo con las fechas empatadas; los votos actuales se reinician.')) votar(ganadoras) }} className={`${ui.btnSuave} mt-3`}><RotateCcw size={16} />Desempatar con nueva votación</button>
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {ev.estado === 'votacion'
          ? <button disabled={trabajando} onClick={cerrar} className={ui.btnMini}><Lock size={14} />Cerrar votación</button>
          : <button disabled={trabajando} onClick={reabrir} className={ui.btnMini}><RotateCcw size={14} />Reabrir votación</button>}
        <button disabled={trabajando} onClick={volverADisponibilidad} className={ui.btnMini}>Volver a recoger fechas</button>
      </div>
    </section>
  )
}

function Invitados({ ev, invitados }) {
  const [copiado, setCopiado] = useState(null)
  const pendientes = invitados.filter(i => !i.respondio_en).length

  async function copiar(texto, clave) {
    try { await navigator.clipboard.writeText(texto); setCopiado(clave); setTimeout(() => setCopiado(null), 1500) }
    catch { toast.error('No se pudo copiar') }
  }

  return (
    <section className={ui.tarjeta}>
      <h2 className="text-lg font-bold">Invitados <span className="text-slate-400">({invitados.length})</span></h2>
      <p className="mt-1 text-[13px] text-slate-500">Cada quien tiene su enlace privado. {ev.estado === 'disponibilidad' && pendientes ? `${pendientes} todavía no responden.` : ''}</p>
      <ul className="mt-3 divide-y divide-slate-100">
        {invitados.map(i => {
          const url = enlacePersonal(i.token, ev.id)
          const msgs = mensajesPara(i, ev, url)
          return (
            <li key={i.persona_id} className="flex flex-wrap items-center gap-2 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{i.nombre}{!i.activo && <span className="ml-2 text-[12px] text-slate-400">(inactivo)</span>}</p>
                <div className="mt-0.5 flex flex-wrap gap-1.5">
                  {i.respondio_en
                    ? <span className={`${'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold'} bg-emerald-100 text-emerald-800`}><Check size={11} strokeWidth={3} />Respondió</span>
                    : <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">Sin respuesta</span>}
                  {(ev.estado === 'votacion' || ev.estado === 'cerrada') && (i.voto
                    ? <span className="inline-flex items-center rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-sky-800">Votó</span>
                    : <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">Falta voto</span>)}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {msgs.map(m => i.telefono
                  ? <a key={m.etiqueta} href={urlWhatsApp(i.telefono, m.texto)} target="_blank" rel="noreferrer" className={`${ui.btnMini} border-[#25D366]/40`}><MessageCircle size={14} className="text-[#25D366]" />{m.etiqueta}</a>
                  : <button key={m.etiqueta} onClick={() => copiar(m.texto, i.persona_id + m.etiqueta)} className={ui.btnMini}>{copiado === i.persona_id + m.etiqueta ? <Check size={14} /> : <Copy size={14} />}{m.etiqueta} (copiar)</button>)}
                <button onClick={() => copiar(url, i.persona_id)} className={ui.btnMini} title="Copiar enlace">{copiado === i.persona_id ? <Check size={14} /> : <Copy size={14} />}</button>
                <a href={url} target="_blank" rel="noreferrer" className={ui.btnMini} title="Abrir como esta persona"><ExternalLink size={14} /></a>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
