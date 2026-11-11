import { useState } from 'react'
import toast from 'react-hot-toast'
import { ClipboardList, Loader2, Check } from 'lucide-react'
import { ui } from '../marca.jsx'
import { tomarEncargo, soltarEncargo, mensajeError } from '../servicio.js'

// «Quién lleva qué»: la ven todos los invitados del evento y cada quien se apunta
export default function EncargosParticipante({ ev, token, recargar }) {
  const [ocupado, setOcupado] = useState(null)
  const items = ev.encargos || []
  if (!items.length) return null
  const mios = items.filter(i => i.responsables.some(r => r.yo))
  const cubiertos = items.filter(i => i.responsables.length >= i.cupos).length

  async function cambiar(i, tomar) {
    setOcupado(i.id)
    try { await (tomar ? tomarEncargo(token, i.id) : soltarEncargo(token, i.id)); await recargar(); if (tomar) toast.success(`¡Gracias! Llevás: ${i.nombre}`) }
    catch (e) { toast.error(mensajeError(e)); recargar() }
    finally { setOcupado(null) }
  }

  return (
    <div className={ui.tarjeta}>
      <h3 className="flex items-center gap-2 text-lg font-bold"><ClipboardList size={20} className="text-teal-700" />Quién lleva qué</h3>
      <p className="mt-1 text-[14px] text-slate-600">{cubiertos} de {items.length} cubiertos. Apuntate en lo que podés llevar o hacer.</p>
      {mios.length > 0 && <p className="mt-3 rounded-2xl bg-teal-50 p-3 text-sm font-bold text-teal-900">Te toca: {mios.map(i => i.nombre).join(', ')}</p>}
      <ul className="mt-3 divide-y divide-slate-100">
        {items.map(i => {
          const yo = i.responsables.some(r => r.yo)
          const lleno = i.responsables.length >= i.cupos
          const falta = i.cupos - i.responsables.length
          return (
            <li key={i.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-bold">{i.nombre}{i.detalle && <span className="font-normal text-slate-500"> · {i.detalle}</span>}</p>
                <p className="text-[13px]">
                  {i.responsables.length > 0 && <span className="font-semibold text-slate-700">{i.responsables.map(r => (r.yo ? 'Vos' : r.nombre)).join(', ')}</span>}
                  {falta > 0 && <span className="font-semibold text-amber-700">{i.responsables.length ? ' · ' : ''}{falta === 1 ? (i.responsables.length ? 'falta 1 más' : 'Nadie todavía') : `faltan ${falta}`}</span>}
                </p>
              </div>
              {yo ? (
                <button disabled={ocupado === i.id} onClick={() => cambiar(i, false)} className={ui.btnMini}>{ocupado === i.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} className="text-teal-700" />}Lo llevo · quitar</button>
              ) : !lleno ? (
                <button disabled={ocupado === i.id} onClick={() => cambiar(i, true)} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-teal-700 px-3.5 text-[13px] font-semibold text-white disabled:opacity-50">{ocupado === i.id && <Loader2 size={14} className="animate-spin" />}Yo lo llevo</button>
              ) : <span className="shrink-0 text-[12px] font-bold text-emerald-700">✅ Cubierto</span>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
