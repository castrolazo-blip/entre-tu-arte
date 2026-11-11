import { useState } from 'react'
import toast from 'react-hot-toast'
import { Gift, Loader2, Lock, Eye, EyeOff } from 'lucide-react'
import { ui } from '../marca.jsx'
import { verAmigo, mensajeError } from '../servicio.js'
import ListaDeseos from './ListaDeseos.jsx'
import { fechaLarga } from '../fechas.js'

// Amigo secreto dentro del evento: descubrir a quién le tocó y la lista de deseos
export default function AmigoParticipante({ s, token, deseo, recargar }) {
  const [amigo, setAmigo] = useState(null)
  const [mostrar, setMostrar] = useState(true)
  const [cargando, setCargando] = useState(false)
  const sorteado = s.estado === 'sorteado'

  async function descubrir() {
    setCargando(true)
    try { setAmigo(await verAmigo(token, s.id)); setMostrar(true); if (!s.visto) recargar() }
    catch (e) { toast.error(mensajeError(e)) }
    finally { setCargando(false) }
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="flex items-center gap-2 text-lg font-bold"><Gift size={20} className="text-rose-600" />Amigo secreto</h3>
        {s.monto && <span className="rounded-full bg-white px-3 py-1 text-[13px] font-semibold text-slate-600 shadow-sm">💵 {s.monto}</span>}
        {s.fecha_intercambio && <span className="rounded-full bg-white px-3 py-1 text-[13px] font-semibold text-slate-600 shadow-sm">📅 {fechaLarga(s.fecha_intercambio)}</span>}
      </div>
      {s.mensaje && <p className="whitespace-pre-line text-[15px] text-slate-700">{s.mensaje}</p>}

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

      <ListaDeseos token={token} deseo={deseo} recargar={recargar} />
    </div>
  )
}
