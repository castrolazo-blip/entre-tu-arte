import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { UtensilsCrossed, Check, Copy, MessageCircle, RotateCcw, Trophy, Plus, X, Loader2, Vote } from 'lucide-react'
import { ui } from '../marca.jsx'
import { resultadosComida, crearEncuesta, cerrarEncuesta, reabrirEncuesta, borrarEncuestas, mensajeError } from '../servicio.js'
import { MODOS, MENU_SUGERIDO, esMandarHacer, textoComida } from '../whatsapp.js'

// «¿Qué comemos?» dentro del evento: 1) cocinamos, pedimos o mandamos hacer · 2) si se cocina o se pide, qué comer
export default function QueComemos({ ev, numInvitados }) {
  const [r, setR] = useState(null)
  const [ocupado, setOcupado] = useState(false)
  const [copiado, setCopiado] = useState(false)

  const recargar = useCallback(async () => {
    try { setR(await resultadosComida(ev.id)) } catch (e) { toast.error(mensajeError(e)) }
  }, [ev.id])
  useEffect(() => { recargar() }, [recargar])
  useEffect(() => {
    const alVolver = () => { if (document.visibilityState === 'visible') recargar() }
    document.addEventListener('visibilitychange', alVolver)
    return () => document.removeEventListener('visibilitychange', alVolver)
  }, [recargar])

  async function hacer(fn, ok) {
    setOcupado(true)
    try { await fn(); await recargar(); if (ok) toast.success(ok) } catch (e) { toast.error(mensajeError(e)) } finally { setOcupado(false) }
  }
  if (!r) return null
  const texto = textoComida(ev, r)
  async function copiar() {
    try { await navigator.clipboard.writeText(texto); setCopiado(true); setTimeout(() => setCopiado(false), 1500) } catch { toast.error('No se pudo copiar') }
  }

  return (
    <section className={ui.tarjeta}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="flex flex-1 items-center gap-2 text-lg font-bold"><UtensilsCrossed size={20} className="text-amber-600" />¿Qué comemos?</h2>
        {r.modo && <>
          <button onClick={copiar} className={ui.btnMini}>{copiado ? <Check size={14} /> : <Copy size={14} />}Copiar</button>
          <a href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noreferrer" className={ui.btnMini}><MessageCircle size={14} className="text-[#25D366]" />Enviar al grupo</a>
        </>}
      </div>

      {/* Paso 1: cómo resolvemos la comida */}
      {!r.modo ? (
        <div className="mt-3">
          <p className="text-sm text-slate-600">Primero: ¿cocinamos, pedimos o mandamos hacer? Que voten los invitados o decidilo vos.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button disabled={ocupado} onClick={() => hacer(() => crearEncuesta(ev.id, 'modo', MODOS), 'Votación abierta: los invitados la ven en su enlace')} className={ui.btn}><Vote size={18} />Que voten</button>
          </div>
          <p className="mt-4 text-[13px] font-semibold text-slate-500">O ya lo decidí:</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {MODOS.map(m => <button key={m} disabled={ocupado} onClick={() => hacer(() => crearEncuesta(ev.id, 'modo', MODOS, m))} className={ui.btnMini}>{m}</button>)}
          </div>
        </div>
      ) : (
        <Paso titulo="1. ¿Cocinamos, pedimos o mandamos hacer?" q={r.modo} n={numInvitados} ocupado={ocupado}
          elegir={o => hacer(() => cerrarEncuesta(r.modo.id, o))}
          reabrir={() => hacer(() => reabrirEncuesta(r.modo.id))}
          reiniciar={() => { if (window.confirm('¿Empezar de nuevo? Se borran las votaciones de comida de este evento.')) hacer(() => borrarEncuestas(ev.id, ['modo', 'menu'])) }} />
      )}

      {/* Paso 2: qué comemos (solo si se cocina o se pide) */}
      {r.modo?.estado === 'cerrada' && (esMandarHacer(r.modo.resultado) ? (
        <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">👩‍🍳 Se manda a hacer: el menú lo acuerdan en el evento, sin votación.</p>
      ) : !r.menu ? (
        <ArmarMenu modo={r.modo.resultado} ocupado={ocupado}
          abrir={ops => hacer(() => crearEncuesta(ev.id, 'menu', ops), 'Votación del menú abierta')}
          decidir={o => hacer(() => crearEncuesta(ev.id, 'menu', [o], o))} />
      ) : (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <Paso titulo={`2. ¿Qué ${/pedimos/i.test(r.modo.resultado) ? 'pedimos' : 'cocinamos'}?`} q={r.menu} n={numInvitados} ocupado={ocupado}
            elegir={o => hacer(() => cerrarEncuesta(r.menu.id, o), `¡Decidido: ${o}!`)}
            reabrir={() => hacer(() => reabrirEncuesta(r.menu.id))}
            reiniciar={() => { if (window.confirm('¿Cambiar las opciones del menú? Se borran los votos del menú.')) hacer(() => borrarEncuestas(ev.id, ['menu'])) }} />
        </div>
      ))}
    </section>
  )
}

function Paso({ titulo, q, n, ocupado, elegir, reabrir, reiniciar }) {
  const total = Object.values(q.conteo || {}).reduce((a, b) => a + b, 0)
  const max = Math.max(0, ...q.opciones.map(o => q.conteo?.[o] || 0))
  const empate = max > 0 && q.opciones.filter(o => (q.conteo?.[o] || 0) === max).length > 1
  if (q.estado === 'cerrada') {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <p className="flex-1 text-sm"><span className="font-semibold text-slate-500">{titulo}</span><br /><span className="text-lg font-bold">{q.resultado}</span>{total > 0 && <span className="text-[13px] text-slate-500"> · {q.conteo?.[q.resultado] || 0} de {total} votos</span>}</p>
        {total > 0 && <button disabled={ocupado} onClick={reabrir} className={ui.btnMini}><Vote size={14} />Reabrir votación</button>}
        <button disabled={ocupado} onClick={reiniciar} className={ui.btnMini}><RotateCcw size={14} />Cambiar</button>
      </div>
    )
  }
  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between gap-2"><p className="font-bold">{titulo}</p><p className="text-sm font-semibold text-slate-500">{q.votaron}/{n} votaron</p></div>
      <ul className="mt-2 space-y-2">
        {q.opciones.map(o => {
          const v = q.conteo?.[o] || 0
          const gana = v > 0 && v === max
          return (
            <li key={o} className={`rounded-2xl border p-3 ${gana ? 'border-amber-300 bg-amber-50' : 'border-slate-100'}`}>
              <div className="flex items-center gap-2">
                {gana && <Trophy size={16} className="text-amber-500" />}
                <p className="flex-1 font-semibold">{o}</p>
                <p className="font-bold">{v}</p>
                <button disabled={ocupado} onClick={() => elegir(o)} className={ui.btnMini}><Check size={14} />Elegir</button>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-amber-500" style={{ width: `${total ? (v / total) * 100 : 0}%` }} /></div>
            </li>
          )
        })}
      </ul>
      {q.faltan?.length > 0 && <p className="mt-2 text-sm text-slate-600"><b>Faltan por votar:</b> {q.faltan.map(x => x.split(' ')[0]).join(', ')}</p>}
      {empate && <p className="mt-2 text-sm font-semibold text-amber-700">Hay empate: elegí vos la que prefieras.</p>}
      <button disabled={ocupado} onClick={reiniciar} className={`${ui.btnMini} mt-3`}><RotateCcw size={14} />Empezar de nuevo</button>
    </div>
  )
}

function ArmarMenu({ modo, ocupado, abrir, decidir }) {
  const [ops, setOps] = useState([])
  const [otra, setOtra] = useState('')
  const alternar = o => setOps(l => (l.includes(o) ? l.filter(x => x !== o) : l.length >= 12 ? l : [...l, o]))
  const agregar = () => { const t = otra.trim(); if (t.length >= 2 && !ops.includes(t)) setOps(l => [...l, t]); setOtra('') }
  const verbo = /pedimos/i.test(modo) ? 'pedimos' : 'cocinamos'
  return (
    <div className="mt-5 border-t border-slate-100 pt-4">
      <p className="font-bold">2. ¿Qué {verbo}? <span className="font-normal text-slate-500">Elegí las opciones para votar</span></p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {[...MENU_SUGERIDO, ...ops.filter(o => !MENU_SUGERIDO.includes(o))].map(o => {
          const on = ops.includes(o)
          return <button key={o} onClick={() => alternar(o)} className={`inline-flex h-9 items-center gap-1 rounded-full border px-3 text-[13px] font-semibold transition ${on ? 'border-amber-500 bg-amber-500 text-white' : 'border-slate-200 bg-white text-slate-700'}`}>{on && <Check size={13} />}{o}</button>
        })}
      </div>
      <form onSubmit={e => { e.preventDefault(); agregar() }} className="mt-2 flex gap-2">
        <input id="menu-otra" value={otra} onChange={e => setOtra(e.target.value)} maxLength={40} placeholder="Otra opción: yuca frita, mariscos…" className={ui.campo} />
        <button disabled={otra.trim().length < 2} className={`${ui.btnSuave} shrink-0 px-4`} aria-label="Agregar opción"><Plus size={18} /></button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        <button disabled={ocupado || ops.length < 2} onClick={() => abrir(ops)} className={ui.btn}>{ocupado ? <Loader2 size={18} className="animate-spin" /> : <Vote size={18} />}Abrir votación ({ops.length})</button>
        {ops.length === 1 && <button disabled={ocupado} onClick={() => decidir(ops[0])} className={ui.btnSuave}><Check size={18} />Decidido: {ops[0]}</button>}
        {ops.length > 0 && <button onClick={() => setOps([])} className={ui.btnMini}><X size={14} />Limpiar</button>}
      </div>
    </div>
  )
}
