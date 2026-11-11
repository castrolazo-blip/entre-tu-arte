import { useState } from 'react'
import toast from 'react-hot-toast'
import { UtensilsCrossed, Check, Loader2 } from 'lucide-react'
import { ui } from '../marca.jsx'
import { votarEncuesta, mensajeError } from '../servicio.js'
import { esMandarHacer } from '../whatsapp.js'

// «¿Qué comemos?» para el invitado: vota y ve los conteos (nunca quién votó qué)
export default function ComidaParticipante({ ev, token, recargar }) {
  const c = ev.comida
  if (!c?.modo) return null
  const verbo = /pedimos/i.test(c.modo.resultado || '') ? 'pedimos' : 'cocinamos'
  return (
    <div className={ui.tarjeta}>
      <h3 className="flex items-center gap-2 text-lg font-bold"><UtensilsCrossed size={20} className="text-amber-600" />¿Qué comemos?</h3>
      <Pregunta titulo="¿Cocinamos, pedimos o mandamos hacer?" q={c.modo} token={token} recargar={recargar} />
      {c.modo.estado === 'cerrada' && esMandarHacer(c.modo.resultado) && <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">El menú lo acordamos en el evento. 👩‍🍳</p>}
      {c.menu && <div className="mt-4 border-t border-slate-100 pt-4"><Pregunta titulo={`¿Qué ${verbo}?`} q={c.menu} token={token} recargar={recargar} /></div>}
    </div>
  )
}

function Pregunta({ titulo, q, token, recargar }) {
  const [enviando, setEnviando] = useState(null)
  const total = Object.values(q.conteo || {}).reduce((a, b) => a + b, 0)
  if (q.estado === 'cerrada') {
    return <p className="mt-3 text-sm"><span className="text-slate-500">{titulo}</span><br /><span className="text-lg font-bold">✅ {q.resultado}</span></p>
  }
  async function votar(o) {
    if (enviando) return
    setEnviando(o)
    try { await votarEncuesta(token, q.id, o); await recargar(); toast.success('¡Voto guardado!') }
    catch (e) { toast.error(mensajeError(e)); recargar() }
    finally { setEnviando(null) }
  }
  return (
    <div className="mt-3">
      <p className="font-semibold">{titulo}</p>
      <p className="text-[13px] text-slate-500">{q.mi_voto ? 'Podés cambiar tu voto mientras siga abierta.' : 'Elegí una opción.'}</p>
      <div className="mt-2 space-y-2">
        {q.opciones.map(o => {
          const mio = q.mi_voto === o
          const v = q.conteo?.[o] || 0
          return (
            <button key={o} onClick={() => votar(o)} className={`relative w-full overflow-hidden rounded-2xl border-2 p-3 text-left transition ${mio ? 'border-amber-500' : 'border-slate-200 hover:border-amber-400'}`}>
              {q.mi_voto && <span className="absolute inset-y-0 left-0 bg-amber-100" style={{ width: `${total ? (v / total) * 100 : 0}%` }} />}
              <span className="relative flex items-center gap-2">
                <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${mio ? 'border-amber-500 bg-amber-500 text-white' : 'border-slate-300'}`}>
                  {enviando === o ? <Loader2 size={11} className="animate-spin" /> : mio && <Check size={12} strokeWidth={3} />}
                </span>
                <span className="flex-1 font-semibold">{o}</span>
                {q.mi_voto && <span className="text-sm font-bold text-slate-600">{v}</span>}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
