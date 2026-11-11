import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Check, Loader2, Gift } from 'lucide-react'
import { ui } from '../marca.jsx'
import { guardarDeseo, mensajeError } from '../servicio.js'

// Lista de deseos GENERAL de la persona: se escribe una vez y sirve para todos sus sorteos
export default function ListaDeseos({ token, deseo, recargar }) {
  const [texto, setTexto] = useState(deseo || '')
  const [guardando, setGuardando] = useState(false)
  useEffect(() => { setTexto(deseo || '') }, [deseo])

  async function guardar() {
    setGuardando(true)
    try { await guardarDeseo(token, texto); await recargar(); toast.success('Lista de deseos guardada') }
    catch (e) { toast.error(mensajeError(e)) }
    finally { setGuardando(false) }
  }

  return (
    <div className={ui.tarjeta}>
      <h3 className="flex items-center gap-2 text-lg font-bold"><Gift size={19} className="text-rose-600" />Mi lista de deseos</h3>
      <p className="mt-1 text-[14px] text-slate-600">Escribila una vez: sirve para todos tus amigos secretos. Solo la ve quien te regale.</p>
      <textarea id="deseo" rows={4} maxLength={500} value={texto} onChange={e => setTexto(e.target.value)}
        placeholder="Ej.: termo para el gym, audífonos, algo de café… Talla M, calzado 38." className={`${ui.campo} mt-3 h-auto py-3`} />
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-[12px] text-slate-400">{texto.length}/500</span>
        <button onClick={guardar} disabled={guardando || texto === (deseo || '')} className={ui.btn}>
          {guardando ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}Guardar
        </button>
      </div>
    </div>
  )
}
