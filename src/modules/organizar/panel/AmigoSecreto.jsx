import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Pencil, Loader2, MessageCircle, Copy, Check, Shuffle, Trash2, Lock, ExternalLink, Gift } from 'lucide-react'
import { ui } from '../marca.jsx'
import { amigoDeEvento, activarAmigo, actualizarSorteo, sortear, borrarSorteo, mensajeError } from '../servicio.js'
import { fechaLarga, hace } from '../fechas.js'
import { enlacePersonal, urlWhatsApp, msgSorteoInvitacion, msgSorteoListo, textoStatusSorteo } from '../whatsapp.js'

// Amigo secreto DENTRO del evento: participan sus invitados (se ajusta solo si cambian)
export default function AmigoSecreto({ ev, numInvitados }) {
  const [s, setS] = useState(undefined)   // undefined = cargando · null = no activado
  const [error, setError] = useState('')
  const [trabajando, setTrabajando] = useState(false)
  const [copiado, setCopiado] = useState(null)
  const [confirmar, setConfirmar] = useState(false)
  const [editando, setEditando] = useState(false)
  const [f, setF] = useState({ monto: '', fecha: '', mensaje: '' })

  const recargar = useCallback(async () => {
    try { setS(await amigoDeEvento(ev.id)); setError('') } catch (e) { setError(mensajeError(e)) }
  }, [ev.id, numInvitados])
  useEffect(() => { recargar() }, [recargar])
  useEffect(() => {
    const alVolver = () => { if (document.visibilityState === 'visible') recargar() }
    document.addEventListener('visibilitychange', alVolver)
    return () => document.removeEventListener('visibilitychange', alVolver)
  }, [recargar])

  if (error) return <p className="rounded-2xl bg-rose-50 p-4 text-rose-800">{error}</p>
  if (s === undefined) return null

  const campos = (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className={ui.etiqueta}>Monto sugerido <span className="font-normal text-slate-400">(opcional)</span>
        <input id="amigo-monto" value={f.monto} onChange={e => setF(x => ({ ...x, monto: e.target.value }))} maxLength={60} placeholder="$15 a $20" className={`${ui.campo} mt-1.5`} />
      </label>
      <label className={ui.etiqueta}>Fecha del intercambio <span className="font-normal text-slate-400">(opcional)</span>
        <input id="amigo-fecha" type="date" value={f.fecha} onChange={e => setF(x => ({ ...x, fecha: e.target.value }))} className={`${ui.campo} mt-1.5`} />
      </label>
      <label className={`${ui.etiqueta} sm:col-span-2`}>Mensaje <span className="font-normal text-slate-400">(opcional)</span>
        <textarea id="amigo-mensaje" rows={2} value={f.mensaje} onChange={e => setF(x => ({ ...x, mensaje: e.target.value }))} maxLength={1000} placeholder="El regalo se entrega en la fiesta. ¡Que sea sorpresa!" className={`${ui.campo} mt-1.5 h-auto py-3`} />
      </label>
    </div>
  )

  if (s === null) {
    async function activar() {
      setTrabajando(true)
      try { await activarAmigo(ev.id, { monto: f.monto, fecha: f.fecha || ev.fecha_elegida, mensaje: f.mensaje }); await recargar(); toast.success('Amigo secreto activado. Pediles su lista de deseos.') }
      catch (e) { toast.error(mensajeError(e)) }
      finally { setTrabajando(false) }
    }
    return (
      <section className={ui.tarjeta}>
        {!editando ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-rose-100 text-rose-700"><Gift size={22} /></span>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold">Amigo secreto</h2>
              <p className="text-sm text-slate-500">Sorteá entre los {numInvitados} invitados de este evento. Cada quien ve a quién le tocó en su enlace.</p>
            </div>
            <button onClick={() => { setF({ monto: '', fecha: ev.fecha_elegida || '', mensaje: '' }); setEditando(true) }} className={ui.btnSuave}><Gift size={18} />Agregar amigo secreto</button>
          </div>
        ) : (
          <>
            <h2 className="flex items-center gap-2 text-lg font-bold"><Gift size={20} className="text-rose-600" />Agregar amigo secreto</h2>
            <p className="mb-4 mt-1 text-sm text-slate-500">Participan los {numInvitados} invitados del evento. Si invitás o quitás a alguien, se ajusta solo.</p>
            {campos}
            <div className="mt-4 flex flex-wrap gap-2">
              <button disabled={trabajando || numInvitados < 3} onClick={activar} className={ui.btn}>{trabajando ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}Activar</button>
              <button onClick={() => setEditando(false)} className={ui.btnSuave}>Cancelar</button>
            </div>
            {numInvitados < 3 && <p className="mt-2 text-sm font-semibold text-amber-700">Se necesitan al menos 3 invitados.</p>}
          </>
        )}
      </section>
    )
  }

  const sorteado = s.estado === 'sorteado'
  const n = s.participantes.length
  const vistos = s.participantes.filter(p => p.visto_en)

  async function hacerSorteo() {
    setTrabajando(true); setConfirmar(false)
    try { await sortear(s.id); await recargar(); toast.success('¡Sorteo hecho! Avisale a cada quien por WhatsApp.') }
    catch (e) { toast.error(mensajeError(e)) }
    finally { setTrabajando(false) }
  }
  async function guardarDatos() {
    setTrabajando(true)
    try { await actualizarSorteo(s.id, { monto: f.monto.trim() || null, fecha_intercambio: f.fecha || null, mensaje: f.mensaje.trim() || null }); await recargar(); setEditando(false) }
    catch (e) { toast.error(mensajeError(e)) }
    finally { setTrabajando(false) }
  }
  async function quitar() {
    if (!window.confirm('¿Quitar el amigo secreto de este evento? Se borra el sorteo (las listas de deseos de cada persona se conservan).')) return
    try { await borrarSorteo(s.id); setS(null); toast.success('Amigo secreto quitado') } catch (e) { toast.error(mensajeError(e)) }
  }
  async function copiar(texto, clave) {
    try { await navigator.clipboard.writeText(texto); setCopiado(clave); setTimeout(() => setCopiado(null), 1500) }
    catch { toast.error('No se pudo copiar') }
  }
  const status = textoStatusSorteo(s, s.participantes)

  return (
    <section className={ui.tarjeta}>
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="flex flex-wrap items-center gap-2 text-lg font-bold"><Gift size={20} className="text-rose-600" />Amigo secreto
              <span className={`${ui.chip} ${sorteado ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{sorteado ? `Sorteado ${hace(s.sorteado_en)}` : 'Sin sortear'}</span></h2>
            <p className="mt-1 text-slate-500">{n} participantes (los invitados){s.monto ? ` · ${s.monto}` : ''}{s.fecha_intercambio ? ` · Intercambio: ${fechaLarga(s.fecha_intercambio, { mayus: false })}` : ''}</p>
            {s.mensaje && !editando && <p className="mt-2 whitespace-pre-line text-[15px] text-slate-700">{s.mensaje}</p>}
          </div>
          {!editando && <button onClick={() => { setF({ monto: s.monto || '', fecha: s.fecha_intercambio || '', mensaje: s.mensaje || '' }); setEditando(true) }} className={ui.btnMini}><Pencil size={14} />Editar</button>}
        </div>
        {editando && (
          <div className="mt-4">
            {campos}
            <div className="mt-3 flex flex-wrap gap-2">
              <button disabled={trabajando} onClick={guardarDatos} className={ui.btn}><Check size={18} />Guardar</button>
              <button onClick={() => setEditando(false)} className={ui.btnSuave}>Cancelar</button>
            </div>
          </div>
        )}

        <div className="mt-5 rounded-2xl bg-teal-50 p-4">
          {confirmar ? (
            <>
              <p className="font-bold text-teal-900">{sorteado ? '¿Volver a sortear?' : '¿Hacer el sorteo ahora?'}</p>
              <p className="mt-1 text-sm text-teal-900/80">{sorteado ? 'Se reparten de nuevo y lo que cada quien ya vio deja de valer. Tendrás que avisarles otra vez.' : `Se reparten los ${n} participantes al azar. Nadie se saca a sí mismo.`}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button disabled={trabajando} onClick={hacerSorteo} className={ui.btn}>{trabajando ? <Loader2 size={18} className="animate-spin" /> : <Shuffle size={18} />}Sí, sortear</button>
                <button onClick={() => setConfirmar(false)} className={ui.btnSuave}>Cancelar</button>
              </div>
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <p className="flex-1 text-sm text-teal-900"><Lock size={14} className="mr-1 inline" />{sorteado ? 'Las parejas son secretas: ni este panel las muestra. Cada quien ve solo la suya.' : 'Cuando todos estén en la lista, sorteá. Antes pueden ir escribiendo su lista de deseos.'}</p>
              <button disabled={trabajando || n < 3} onClick={() => setConfirmar(true)} className={sorteado ? ui.btnSuave : ui.btn}><Shuffle size={18} />{sorteado ? 'Volver a sortear' : 'Sortear'}</button>
            </div>
          )}
          {n < 3 && <p className="mt-2 text-sm font-semibold text-amber-700">Se necesitan al menos 3 participantes.</p>}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <h3 className="flex-1 font-bold">{sorteado ? `${vistos.length} de ${n} ya vieron a quién les tocó` : `Participantes (${n})`}</h3>
          <button onClick={() => copiar(status, 'status')} className={ui.btnMini}>{copiado === 'status' ? <Check size={14} /> : <Copy size={14} />}Copiar status</button>
          <a href={`https://wa.me/?text=${encodeURIComponent(status)}`} target="_blank" rel="noreferrer" className={ui.btnMini}><MessageCircle size={14} className="text-[#25D366]" />Enviar al grupo</a>
        </div>
        {sorteado && <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-600" style={{ width: `${n ? (vistos.length / n) * 100 : 0}%` }} /></div>}
        <ul className="mt-3 divide-y divide-slate-100">
          {s.participantes.map(p => {
            const url = enlacePersonal(p.token, ev.id)
            const texto = sorteado ? msgSorteoListo(p.nombre, s, url) : msgSorteoInvitacion(p.nombre, s, url)
            const etiqueta = sorteado ? (p.visto_en ? 'Reenviar' : 'Avisar sorteo') : 'Pedir deseos'
            return (
              <li key={p.persona_id} className="flex flex-wrap items-center gap-2 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{p.nombre}</p>
                  <div className="mt-0.5 flex flex-wrap gap-1.5 text-[11px] font-bold">
                    {sorteado && (p.visto_en
                      ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800"><Check size={11} strokeWidth={3} />Ya vio · {hace(p.visto_en)}</span>
                      : <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">No ha visto</span>)}
                    {p.tiene_deseo && <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-violet-800"><Gift size={11} />Escribió deseos</span>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {p.telefono
                    ? <a href={urlWhatsApp(p.telefono, texto)} target="_blank" rel="noreferrer" className={ui.btnMini}><MessageCircle size={14} className="text-[#25D366]" />{etiqueta}</a>
                    : <button onClick={() => copiar(texto, p.persona_id + 'm')} className={ui.btnMini}>{copiado === p.persona_id + 'm' ? <Check size={14} /> : <Copy size={14} />}{etiqueta} (copiar)</button>}
                  <button onClick={() => copiar(url, p.persona_id)} className={ui.btnMini} title="Copiar enlace">{copiado === p.persona_id ? <Check size={14} /> : <Copy size={14} />}</button>
                  <a href={url} target="_blank" rel="noreferrer" className={ui.btnMini} title="Abrir como esta persona (si lo abrís, ves a quién le tocó)"><ExternalLink size={14} /></a>
                </div>
              </li>
            )
          })}
        </ul>
        <p className="mt-2 text-[12px] text-slate-500">Ojo: si abrís el enlace de otra persona y tocás «Descubrir», vas a ver a quién le tocó y contará como visto.</p>
        <button onClick={quitar} className={`${ui.btnMini} mt-3 text-rose-700`}><Trash2 size={14} />Quitar amigo secreto</button>
    </section>
  )
}
