import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronRight, CalendarDays, ListChecks, Lock, Loader2 } from 'lucide-react'
import { Marca, ui, useTituloApp, ChipEstado } from '../marca.jsx'
import { agenda, mensajeError } from '../servicio.js'
import { periodo, diasTexto, horario, fechaLarga } from '../fechas.js'
import EventoParticipante from './EventoParticipante.jsx'
import MiCalendario from './MiCalendario.jsx'
import ListaDeseos from './ListaDeseos.jsx'

const CLAVE = 'sno_enlace'

// Vista del participante: entra con su enlace privado (?c=…), sin cuenta ni contraseña.
export default function Participante() {
  const [params, setParams] = useSearchParams()
  const token = params.get('c') || leerGuardado()
  const eventoId = params.get('e')
  const pestana = params.get('v') === 'calendario' ? 'calendario' : 'eventos'
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState('')
  useTituloApp(datos?.nombre ? `Hola, ${datos.nombre.split(' ')[0]}` : 'Mi calendario')

  const recargar = useCallback(async () => {
    if (!token) return
    try {
      const d = await agenda(token)
      setDatos(d); setError('')
      if (d.estado === 'ok') { try { localStorage.setItem(CLAVE, token) } catch { /* sin almacenamiento */ } }
      else { try { if (localStorage.getItem(CLAVE) === token) localStorage.removeItem(CLAVE) } catch { /* */ } }
    } catch (e) { setError(mensajeError(e)) }
  }, [token])

  // También al abrir un evento o volver a la lista, para ver siempre el estado actual
  useEffect(() => { recargar() }, [recargar, eventoId])
  // Al volver a la pestaña se actualiza (por si el organizador abrió la votación o confirmó)
  useEffect(() => {
    const alVolver = () => { if (document.visibilityState === 'visible') recargar() }
    document.addEventListener('visibilitychange', alVolver)
    return () => document.removeEventListener('visibilitychange', alVolver)
  }, [recargar])

  const ir = (cambios) => {
    const p = new URLSearchParams(params)
    if (!p.get('c') && token) p.set('c', token)
    for (const [k, v] of Object.entries(cambios)) { if (v == null) p.delete(k); else p.set(k, v) }
    setParams(p)
    window.scrollTo({ top: 0 })
  }
  const cambiarBloqueos = useCallback(fn => setDatos(d => ({ ...d, bloqueos: fn(d.bloqueos) })), [])

  if (!token) return <Aviso titulo="Necesitás tu enlace privado" texto="Abrí el enlace que te envió el organizador por WhatsApp. Si no lo tenés, pedíselo." />
  if (error && !datos) return <Aviso titulo="No pudimos cargar tu calendario" texto={error} reintentar={recargar} />
  if (!datos) return <div className={`${ui.fondo} grid place-items-center`}><Loader2 className="animate-spin text-teal-700" size={30} /></div>
  if (datos.estado !== 'ok') return <Aviso titulo="Este enlace ya no es válido" texto="Puede que el organizador lo haya cambiado. Pedile tu enlace nuevo por WhatsApp." />

  const evento = eventoId && datos.eventos.find(e => e.id === eventoId)
  const hayAmigo = datos.eventos.some(e => e.amigo)

  return (
    <div className={ui.fondo}>
      <header className="bg-teal-700 pb-16 pt-5 text-white">
        <div className="mx-auto flex max-w-xl items-center justify-between px-4">
          <button onClick={() => ir({ e: null, v: null })} aria-label="Inicio"><Marca claro chica /></button>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[12px] font-semibold"><Lock size={13} />Privado</span>
        </div>
        <div className="mx-auto max-w-xl px-4 pt-6">
          <h1 className="text-[26px] font-bold leading-tight">Hola, {datos.nombre.split(' ')[0]} 👋</h1>
          {!evento && <p className="mt-1 text-white/80">Marcá solo cuándo <b>no</b> podés. Nosotros hacemos el resto.</p>}
        </div>
      </header>

      <main className="mx-auto -mt-10 max-w-xl px-4 pb-16">
        {eventoId && !evento ? (
          <div className={ui.tarjeta}>
            <p className="font-semibold">Este evento ya no está disponible.</p>
            <button onClick={() => ir({ e: null })} className={`${ui.btnSuave} mt-4`}>Ver mis eventos</button>
          </div>
        ) : evento ? (
          <EventoParticipante ev={evento} token={token} bloqueos={datos.bloqueos} hoy={datos.hoy} deseo={datos.deseo}
            onBloqueos={cambiarBloqueos} recargar={recargar} volver={() => ir({ e: null })} />
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-1 rounded-full bg-white p-1 shadow-sm">
              {[['eventos', 'Mis eventos', ListChecks], ['calendario', 'Mi calendario', CalendarDays]].map(([k, t, Icono]) => (
                <button key={k} onClick={() => ir({ v: k === 'eventos' ? null : k })}
                  className={`flex h-11 items-center justify-center gap-2 rounded-full text-sm font-bold transition ${pestana === k ? 'bg-teal-700 text-white' : 'text-slate-600'}`}>
                  <Icono size={17} />{t}
                </button>
              ))}
            </div>
            {pestana === 'calendario'
              ? <MiCalendario token={token} bloqueos={datos.bloqueos} eventos={datos.eventos} hoy={datos.hoy} onBloqueos={cambiarBloqueos} />
              : <>
                  <ListaEventos eventos={datos.eventos} abrir={id => ir({ e: id })} />
                  {hayAmigo && <div className="mt-3"><ListaDeseos token={token} deseo={datos.deseo} recargar={recargar} /></div>}
                </>}
          </>
        )}
      </main>
    </div>
  )
}

function leerGuardado() { try { return localStorage.getItem(CLAVE) } catch { return null } }

function pendiente(e) {
  if (e.estado === 'disponibilidad') return e.respondio ? { t: 'Ya marcaste tus fechas ✓', c: 'text-emerald-700' } : { t: 'Marcá los días que no podés', c: 'text-amber-700' }
  if (e.estado === 'votacion') return e.mi_voto ? { t: `Votaste: ${fechaLarga(e.mi_voto)}`, c: 'text-emerald-700' } : { t: '¡Falta tu voto!', c: 'text-sky-700' }
  if (e.estado === 'cerrada') return { t: 'Esperando la confirmación', c: 'text-violet-700' }
  if (e.estado === 'confirmado') return { t: `📅 ${fechaLarga(e.fecha_elegida)}`, c: 'text-emerald-700' }
  return { t: '', c: '' }
}

function ListaEventos({ eventos, abrir }) {
  if (!eventos.length) {
    return (
      <div className={`${ui.tarjeta} text-center`}>
        <p className="text-lg font-bold">Todavía no tenés eventos</p>
        <p className="mt-1 text-sm text-slate-500">Cuando el organizador te invite, aparecerán aquí. Mientras tanto podés ir marcando en «Mi calendario» los días que ya sabés que no podés.</p>
      </div>
    )
  }
  return (
    <div className="space-y-3">
      {eventos.map(e => {
        const p = pendiente(e)
        return (
          <button key={e.id} onClick={() => abrir(e.id)} className={`${ui.tarjeta} flex w-full items-center gap-3 text-left transition hover:ring-2 hover:ring-teal-700/20`}>
            <div className="min-w-0 flex-1">
              <ChipEstado estado={e.estado} />
              <p className="mt-2 text-[17px] font-bold leading-snug">{e.titulo}</p>
              <p className="mt-0.5 text-[13px] text-slate-500">{periodo(e.desde, e.hasta)} · {diasTexto(e.dias)} · {horario(e)}</p>
              <p className={`mt-2 text-sm font-bold ${p.c}`}>{p.t}</p>
              {Object.values(e.comida || {}).some(q => q.estado === 'abierta' && !q.mi_voto) && <p className="mt-1 text-sm font-bold text-amber-700">🍽️ Votá qué comemos</p>}
              {(e.encargos || []).some(i => i.responsables.some(r => r.yo)) && <p className="mt-1 text-sm font-bold text-teal-700">🧾 Llevás: {e.encargos.filter(i => i.responsables.some(r => r.yo)).map(i => i.nombre).join(', ')}</p>}
              {e.amigo && <p className="mt-1 text-sm font-bold text-rose-600">🎁 {e.amigo.estado !== 'sorteado' ? 'Amigo secreto: escribí tu lista de deseos' : e.amigo.visto ? 'Amigo secreto: ver a quién te tocó' : '¡Descubrí tu amigo secreto!'}</p>}
            </div>
            <ChevronRight className="shrink-0 text-slate-400" />
          </button>
        )
      })}
    </div>
  )
}

function Aviso({ titulo, texto, reintentar }) {
  useTituloApp('Mi calendario')
  return (
    <div className={`${ui.fondo} grid place-items-center p-5`}>
      <div className={`${ui.tarjeta} w-full max-w-sm p-8 text-center`}>
        <div className="flex justify-center"><Marca /></div>
        <h1 className="mt-6 text-xl font-bold">{titulo}</h1>
        <p className="mt-2 text-slate-600">{texto}</p>
        {reintentar && <button onClick={reintentar} className={`${ui.btn} mt-6 w-full`}>Intentar de nuevo</button>}
      </div>
    </div>
  )
}

