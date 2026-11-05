import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUp, ArrowDown, ChevronsUp, Save, RotateCcw, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../../lib/supabase.js'
import { useConfig } from '../../../context/ConfigContext.jsx'
import { guardarConfig } from '../adminService.js'
import { leerOrden, ordenarObras } from '../../../lib/ordenObras.js'
import { normalizarObra, etiquetaExistencias } from '../../catalogo/obrasService.js'
import EncabezadoAdmin from '../EncabezadoAdmin.jsx'

// Ordenar a mano las obras de Entre tu Arte. La tienda las muestra en este orden
// ("Recomendado") en el catálogo, el inicio y Por pedido.
export default function OrdenarObras() {
  const { cfg, recargar } = useConfig()
  const [obras, setObras] = useState(null)
  const [cambios, setCambios] = useState(false)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    supabase.from('fichas').select('*').neq('estado', 'borrador').order('created_at', { ascending: false }).then(({ data, error }) => {
      if (error) { toast.error('No se pudieron cargar las obras'); setObras([]); return }
      const propias = (data || []).map(normalizarObra).filter(o => o.origen !== 'marketplace')
      setObras(ordenarObras(propias, leerOrden(cfg)))
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function mover(desde, hasta) {
    if (hasta < 0 || hasta >= obras.length || desde === hasta) return
    setObras(l => { const c = [...l]; const [o] = c.splice(desde, 1); c.splice(hasta, 0, o); return c })
    setCambios(true)
  }

  async function guardar() {
    setGuardando(true)
    try {
      await guardarConfig('orden_obras', JSON.stringify(obras.map(o => String(o.id))))
      await recargar()
      setCambios(false)
      toast.success('Orden guardado: la tienda ya muestra las obras así')
    } catch (e) { toast.error('No se pudo guardar: ' + (e.message || e)) }
    finally { setGuardando(false) }
  }

  function restablecer() {
    if (!window.confirm('¿Volver al orden por fecha (las más recientes primero)?')) return
    setObras(l => [...l].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
    setCambios(true)
  }

  return (
    <>
      <EncabezadoAdmin ruta="Catálogo" titulo="Ordenar obras">
        <Link to="/admin/obras" className="btn-contorno btn-chico">Volver a Obras</Link>
      </EncabezadoAdmin>
      <p className="mb-4 max-w-2xl text-sm text-gris">Acomoda las obras como quieres que aparezcan en la tienda (catálogo, inicio y Por pedido). Usa las flechas, “al inicio” o escribe la posición. Las obras nuevas aparecen al final hasta que las acomodes.</p>

      <div className="sticky top-2 z-10 mb-4 flex flex-wrap gap-2 rounded-full bg-white/95 p-1.5 shadow-sm backdrop-blur md:top-4">
        <button onClick={guardar} disabled={!cambios || guardando} className="btn-primario h-11 flex-1 px-5">
          {guardando ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}{cambios ? 'Guardar orden' : 'Orden guardado'}
        </button>
        <button onClick={restablecer} className="flex h-11 items-center gap-1.5 rounded-full px-4 text-sm font-semibold"><RotateCcw size={16} />Por fecha</button>
      </div>

      {!obras ? <p className="p-6 text-gris">Cargando…</p> : (
        <ol className="space-y-2">
          {obras.map((o, i) => (
            <li key={o.id} className="flex items-center gap-3 rounded-[20px] bg-white p-2.5 pr-3">
              <input aria-label={`Posición de ${o.titulo}`} inputMode="numeric" defaultValue={i + 1} key={`${o.id}-${i}`}
                onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
                onBlur={e => { const n = parseInt(e.target.value, 10); if (n >= 1) mover(i, Math.min(obras.length, n) - 1); else e.target.value = i + 1 }}
                className="h-10 w-12 shrink-0 rounded-xl bg-crema-clara text-center text-sm font-bold ring-1 ring-crema-borde" />
              {o.fotoMini ? <img src={o.fotoMini} alt="" className="h-14 w-14 shrink-0 rounded-xl bg-crema object-cover" /> : <span className="h-14 w-14 shrink-0 rounded-xl bg-crema" />}
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{o.titulo}</p>
                <p className="truncate text-xs text-gris">{etiquetaExistencias(o)}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button onClick={() => mover(i, 0)} disabled={i === 0} aria-label="Al inicio" title="Al inicio" className="flex h-10 w-10 items-center justify-center rounded-full bg-crema disabled:opacity-30"><ChevronsUp size={17} /></button>
                <button onClick={() => mover(i, i - 1)} disabled={i === 0} aria-label="Subir" className="flex h-10 w-10 items-center justify-center rounded-full bg-crema disabled:opacity-30"><ArrowUp size={17} /></button>
                <button onClick={() => mover(i, i + 1)} disabled={i === obras.length - 1} aria-label="Bajar" className="flex h-10 w-10 items-center justify-center rounded-full bg-crema disabled:opacity-30"><ArrowDown size={17} /></button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </>
  )
}
