import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, Pencil, Loader2, MessageCircle, Copy, Check, Shuffle, Trash2, Lock, ExternalLink, Gift } from 'lucide-react'
import { ui } from '../marca.jsx'
import { cargarSorteo, sortear, borrarSorteo, mensajeError } from '../servicio.js'
import { fechaLarga, hace } from '../fechas.js'
import { enlaceSorteo, urlWhatsApp, msgSorteoInvitacion, msgSorteoListo, textoStatusSorteo } from '../whatsapp.js'

export default function DetalleSorteo() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [s, setS] = useState(null)
  const [error, setError] = useState('')
  const [trabajando, setTrabajando] = useState(false)
  const [copiado, setCopiado] = useState(null)
  const [confirmar, setConfirmar] = useState(false)

  const recargar = useCallback(async () => {
    try { setS(await cargarSorteo(id)); setError('') } catch (e) { setError(mensajeError(e)) }
  }, [id])
  useEffect(() => { recargar() }, [recargar])
  useEffect(() => {
    const alVolver = () => { if (document.visibilityState === 'visible') recargar() }
    document.addEventListener('visibilitychange', alVolver)
    return () => document.removeEventListener('visibilitychange', alVolver)
  }, [recargar])

  if (error) return <p className="rounded-2xl bg-rose-50 p-4 text-rose-800">{error}</p>
  if (!s) return <div className="mt-10 flex justify-center"><Loader2 className="animate-spin text-teal-700" /></div>

  const sorteado = s.estado === 'sorteado'
  const n = s.participantes.length
  const vistos = s.participantes.filter(p => p.visto_en)

  async function hacerSorteo() {
    setTrabajando(true); setConfirmar(false)
    try { await sortear(s.id); await recargar(); toast.success('¡Sorteo hecho! Avisale a cada quien por WhatsApp.') }
    catch (e) { toast.error(mensajeError(e)) }
    finally { setTrabajando(false) }
  }
  async function copiar(texto, clave) {
    try { await navigator.clipboard.writeText(texto); setCopiado(clave); setTimeout(() => setCopiado(null), 1500) }
    catch { toast.error('No se pudo copiar') }
  }
  const status = textoStatusSorteo(s, s.participantes)

  return (
    <div className="space-y-4">
      <Link to="/organizar/panel/amigo-secreto" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500"><ArrowLeft size={16} />Amigo secreto</Link>

      <section className={ui.tarjeta}>
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <span className={`${ui.chip} ${sorteado ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{sorteado ? `Sorteado ${hace(s.sorteado_en)}` : 'Sin sortear'}</span>
            <h1 className="mt-2 text-[26px] font-bold leading-tight">🎁 {s.titulo}</h1>
            <p className="mt-1 text-slate-500">{n} participantes{s.monto ? ` · ${s.monto}` : ''}{s.fecha_intercambio ? ` · Intercambio: ${fechaLarga(s.fecha_intercambio, { mayus: false })}` : ''}</p>
            {s.mensaje && <p className="mt-2 whitespace-pre-line text-[15px] text-slate-700">{s.mensaje}</p>}
          </div>
          <Link to={`/organizar/panel/amigo-secreto/${s.id}/editar`} className={ui.btnMini}><Pencil size={14} />Editar</Link>
        </div>

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
      </section>

      <section className={ui.tarjeta}>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="flex-1 text-lg font-bold">{sorteado ? `Status · ${vistos.length} de ${n} ya vieron a quién les tocó` : `Participantes (${n})`}</h2>
          <button onClick={() => copiar(status, 'status')} className={ui.btnMini}>{copiado === 'status' ? <Check size={14} /> : <Copy size={14} />}Copiar status</button>
          <a href={`https://wa.me/?text=${encodeURIComponent(status)}`} target="_blank" rel="noreferrer" className={ui.btnMini}><MessageCircle size={14} className="text-[#25D366]" />Enviar al grupo</a>
        </div>
        {sorteado && <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-600" style={{ width: `${n ? (vistos.length / n) * 100 : 0}%` }} /></div>}
        <ul className="mt-3 divide-y divide-slate-100">
          {s.participantes.map(p => {
            const url = enlaceSorteo(p.token, s.id)
            const texto = sorteado ? msgSorteoListo(p.nombre, s, url) : msgSorteoInvitacion(p.nombre, s, url)
            const etiqueta = sorteado ? (p.visto_en ? 'Reenviar' : 'Avisar') : 'Invitar'
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
      </section>

      <button disabled={trabajando} onClick={async () => {
        if (!window.confirm('¿Eliminar este sorteo? Se borran los participantes y las asignaciones.')) return
        try { await borrarSorteo(s.id); toast.success('Sorteo eliminado'); navigate('/organizar/panel/amigo-secreto', { replace: true }) } catch (e) { toast.error(mensajeError(e)) }
      }} className={`${ui.btnMini} text-rose-700`}><Trash2 size={14} />Eliminar sorteo</button>
    </div>
  )
}
