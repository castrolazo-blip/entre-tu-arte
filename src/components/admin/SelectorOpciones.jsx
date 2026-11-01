import { useEffect, useState } from 'react'
import { Plus, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { cargarLista, agregarALista, separar, unir } from '../../lib/listasObra.js'

// Opciones para tocar (selección múltiple). "valor" es el texto guardado en la obra.
export default function SelectorOpciones({ etiqueta, tipo, valor, onChange, multiple = true }) {
  const [opciones, setOpciones] = useState([])
  const [nueva, setNueva] = useState(null)
  const elegidas = separar(valor)

  useEffect(() => { cargarLista(tipo).then(l => setOpciones(l.todas)).catch(() => {}) }, [tipo])

  // Valores que ya tenía la obra aunque no estén en la lista (obras antiguas)
  const todas = [...opciones, ...elegidas.filter(e => !opciones.some(o => o.toLowerCase() === e.toLowerCase()))]

  function alternar(o) {
    const esta = elegidas.includes(o)
    if (!multiple) { onChange(esta ? '' : o); return }
    onChange(unir(esta ? elegidas.filter(x => x !== o) : [...elegidas, o]))
  }

  async function agregar(e) {
    e?.preventDefault()
    const v = (nueva || '').trim()
    if (!v) { setNueva(null); return }
    try {
      await agregarALista(tipo, v)
      setOpciones(l => l.includes(v) ? l : [...l, v])
    } catch { toast.error('No se pudo guardar la opción nueva; se usará solo en esta obra') }
    onChange(multiple ? unir([...elegidas.filter(x => x !== v), v]) : v)
    setNueva(null)
  }

  return (
    <fieldset className="min-w-0">
      <legend className="etiqueta mb-2">{etiqueta}{multiple && <span className="ml-1.5 font-normal text-gris">· puedes elegir varias</span>}</legend>
      <div className="flex flex-wrap gap-2">
        {todas.map(o => {
          const on = elegidas.includes(o)
          return (
            <button type="button" key={o} aria-pressed={on} onClick={() => alternar(o)}
              className={`inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition ${on ? 'border-tinta bg-tinta text-white' : 'border-crema-borde bg-white text-tinta'}`}>
              {on && <Check size={15} />}{o}
            </button>
          )
        })}
        {nueva === null ? (
          <button type="button" onClick={() => setNueva('')} className="inline-flex h-10 items-center gap-1.5 rounded-full border border-dashed border-gris/50 px-4 text-sm font-semibold text-gris">
            <Plus size={15} />Otra
          </button>
        ) : (
          <span className="flex w-full gap-2">
            <label className="sr-only" htmlFor={`nueva-${tipo}`}>Nueva opción de {etiqueta}</label>
            <input id={`nueva-${tipo}`} autoFocus value={nueva} onChange={e => setNueva(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') agregar(e); if (e.key === 'Escape') setNueva(null) }}
              placeholder={`Escribe la nueva ${etiqueta.toLowerCase()}`} className="campo h-11" />
            <button type="button" onClick={agregar} className="btn-oscuro h-11 shrink-0 px-5 text-sm">Agregar</button>
          </span>
        )}
      </div>
    </fieldset>
  )
}

export function SelectorAnio({ valor, onChange, className = '' }) {
  const actual = new Date().getFullYear()
  const anios = Array.from({ length: actual - 1979 }, (_, i) => actual - i)
  return (
    <label className={`etiqueta ${className}`}>Año
      <select value={valor || ''} onChange={e => onChange(e.target.value)} className="campo mt-1.5">
        <option value="">Sin año</option>
        {anios.map(a => <option key={a} value={a}>{a}</option>)}
      </select>
    </label>
  )
}
