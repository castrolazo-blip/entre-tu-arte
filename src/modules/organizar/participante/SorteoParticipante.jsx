import { useState } from 'react'
import toast from 'react-hot-toast'
import { ArrowLeft, Gift, Loader2, Lock, Eye, EyeOff, Check } from 'lucide-react'
import { ui } from '../marca.jsx'
import { verAmigo, guardarDeseo, mensajeError } from '../servicio.js'
import { fechaLarga } from '../fechas.js'

export default function SorteoParticipante({ s, token, recargar, volver }) {
  const [amigo, setAmigo] = useState(null)
  const [mostrar, setMostrar] = useState(true)
  const [cargando, setCargando] = useState(false)
  const [deseo, setDeseo] = useState(s.mi_deseo || '')
  const [guardando, setGuardando] = useState(false)
  const sorteado = s.estado === 'sorteado'

  async function descubrir() {
    setCargando(true)
    try { setAmigo(await verAmigo(token, s.id)); setMostrar(true); if (!s.visto) recargar() }
    catch (e) { toast.error(mensajeError(e)) }
    finally { setCargando(false) }
  }
  async function guardar() {
    setGuardando(true)
    try { await guardarDeseo(token, s.id, deseo); await recargar(); toast.success('Lista de deseos guardada') }
    catch (e) { toast.error(mensajeError(e)) }
    finally { setGuardando(false) }
  }

  return (
    <div className="space-y-4">
      <div className={ui.tarjeta}>
        <button onClick={volver} className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500"><ArrowLeft size={16} />Mis eventos</button>
        <span className={`${ui.chip} bg-rose-100 text-rose-800`}>Amigo secreto</span>
        <h2 className="mt-2 text-[22px] font-bold leading-tight">🎁 {s.titulo}</h2>
        <div className="mt-3 flex flex-wrap gap-2 text-[13px] font-semibold text-slate-600">
          <span className="rounded-full bg-slate-100 px-3 py-1.5">{s.participantes} participantes</span>
          {s.monto && <span className="rounded-full bg-slate-100 px-3 py-1.5">💵 {s.monto}</span>}
          {s.fecha_intercambio && <span className="rounded-full bg-slate-100 px-3 py-1.5">📅 {fechaLarga(s.fecha_intercambio)}</span>}
        </div>
        {s.mensaje && <p className="mt-3 whitespace-pre-line text-[15px] text-slate-700">{s.mensaje}</p>}
      </div>

      {/* Revelar */}
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-rose-600 to-teal-700 p-6 text-white">
        {!sorteado ? (
          <>
            <Gift size={34} />
            <p className="mt-3 text-xl font-bold">Todavía no se ha hecho el sorteo</p>
            <p className="mt-1 text-white/85">Cuando el organizador sortee, aquí vas a descubrir a quién te tocó. Mientras tanto, escribí tu lista de deseos.</p>
          </>
        ) : amigo ? (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold uppercase tracking-wide text-white/80">Te tocó regalarle a</p>
              <button onClick={() => setMostrar(m => !m)} className="grid h-9 w-9 place-items-center rounded-full bg-white/15" aria-label={mostrar ? 'Ocultar' : 'Mostrar'}>{mostrar ? <EyeOff size={17} /> : <Eye size={17} />}</button>
            </div>
            <p className={`mt-2 text-[34px] font-bold leading-tight transition ${mostrar ? '' : 'select-none blur-md'}`}>{amigo.nombre}</p>
            <div className={`mt-4 rounded-2xl bg-white/15 p-4 transition ${mostrar ? '' : 'blur-md'}`}>
              <p className="text-sm font-bold">Su lista de deseos</p>
              <p className="mt-1 whitespace-pre-line text-white/90">{amigo.deseo || 'Todavía no escribió nada. ¡Sorprendelo!'}</p>
            </div>
            <p className="mt-4 flex items-center gap-1.5 text-[13px] text-white/80"><Lock size={13} />Es secreto: nadie más lo ve, ni el organizador. 🤫</p>
          </>
        ) : (
          <>
            <Gift size={34} />
            <p className="mt-3 text-xl font-bold">¡Ya se hizo el sorteo!</p>
            <p className="mt-1 text-white/85">Asegurate de que nadie esté viendo tu pantalla.</p>
            <button onClick={descubrir} disabled={cargando} className="mt-5 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-white text-lg font-bold text-rose-700">
              {cargando ? <Loader2 className="animate-spin" size={20} /> : <Gift size={20} />}Descubrir a quién me tocó
            </button>
          </>
        )}
      </div>

      {/* Lista de deseos */}
      <div className={ui.tarjeta}>
        <h3 className="text-lg font-bold">Mi lista de deseos</h3>
        <p className="mt-1 text-[14px] text-slate-600">Ideas de lo que te gustaría recibir. Solo la verá quien te regale.</p>
        <textarea id="deseo" rows={4} maxLength={500} value={deseo} onChange={e => setDeseo(e.target.value)}
          placeholder="Ej.: termo para el gym, audífonos, algo de café… Talla M." className={`${ui.campo} mt-3 h-auto py-3`} />
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-[12px] text-slate-400">{deseo.length}/500</span>
          <button onClick={guardar} disabled={guardando || deseo === (s.mi_deseo || '')} className={ui.btn}>
            {guardando ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}Guardar
          </button>
        </div>
      </div>
    </div>
  )
}
