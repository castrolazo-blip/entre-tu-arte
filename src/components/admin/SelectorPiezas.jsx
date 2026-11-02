import { Minus, Plus } from 'lucide-react'
import { numero } from '../../lib/formato.js'
import { nombreJuego } from '../../lib/piezas.js'

// Estado del selector a partir de una obra guardada
export function piezasIniciales(obra = {}) {
  const n = Math.max(1, Number(obra.piezas) || 1)
  const lista = Array.isArray(obra.medidas_piezas) ? obra.medidas_piezas.map(m => ({ alto: m.alto ?? '', ancho: m.ancho ?? '' })) : []
  return { piezas: n, iguales: !lista.length, lista }
}

// Campos para guardar en la ficha. alto/ancho son los del formulario (medida de cada pieza).
export function camposPiezas(p, alto, ancho) {
  const n = Math.max(1, Number(p?.piezas) || 1)
  if (n === 1 || p.iguales) return { piezas: n, medidas_piezas: null, alto_cm: numero(alto), ancho_cm: numero(ancho) }
  const lista = Array.from({ length: n }, (_, i) => ({ alto: numero(p.lista[i]?.alto), ancho: numero(p.lista[i]?.ancho) }))
  const completas = lista.every(m => m.alto && m.ancho)
  return {
    piezas: n,
    medidas_piezas: completas ? lista : null,
    alto_cm: lista[0].alto ?? numero(alto), ancho_cm: lista[0].ancho ?? numero(ancho),
  }
}

// Nota para la IA cuando ya se sabe que es un juego
export function notaPiezasParaIA(n) {
  return n > 1 ? `Es un juego de ${n} piezas (${nombreJuego(n).toLowerCase()}) que se vende como un solo conjunto; piezas: ${n}.` : ''
}

// Número de piezas del juego (1, díptico, tríptico, n) y, si miden distinto, la medida de cada una.
export default function SelectorPiezas({ valor, onChange }) {
  const p = valor || { piezas: 1, iguales: true, lista: [] }
  const n = p.piezas
  const poner = cambios => onChange({ ...p, ...cambios })
  const cambiarN = k => poner({ piezas: Math.min(Math.max(k, 1), 20) })
  const medida = (i, campo, v) => {
    const lista = Array.from({ length: n }, (_, j) => p.lista[j] || { alto: '', ancho: '' })
    lista[i] = { ...lista[i], [campo]: v }
    poner({ lista })
  }

  return (
    <div className="space-y-2.5">
      <p className="etiqueta">Piezas{n > 1 && <span className="ml-1.5 font-normal text-gris">· {nombreJuego(n)}</span>}</p>
      <div className="flex flex-wrap items-center gap-2">
        {[1, 2, 3, 4].map(k => (
          <button key={k} type="button" aria-pressed={n === k} onClick={() => cambiarN(k)}
            className={`h-10 min-w-[44px] rounded-full px-3.5 text-sm font-bold ring-1 ${n === k ? 'bg-tinta text-white ring-tinta' : 'bg-crema-clara ring-crema-borde'}`}>
            {k === 1 ? 'Una sola' : k}
          </button>
        ))}
        <span className="flex items-center gap-1 rounded-full bg-crema-clara px-1 ring-1 ring-crema-borde">
          <button type="button" onClick={() => cambiarN(n - 1)} aria-label="Una pieza menos" className="flex h-10 w-9 items-center justify-center"><Minus size={15} /></button>
          <span className="w-6 text-center text-sm font-bold">{n}</span>
          <button type="button" onClick={() => cambiarN(n + 1)} aria-label="Una pieza más" className="flex h-10 w-9 items-center justify-center"><Plus size={15} /></button>
        </span>
      </div>
      {n > 1 && (
        <>
          <div role="radiogroup" aria-label="Tamaño de las piezas" className="grid grid-cols-2 rounded-full bg-crema-clara p-1 ring-1 ring-crema-borde">
            {[[true, 'Todas miden igual'], [false, 'Miden distinto']].map(([v, t]) => (
              <button key={t} type="button" role="radio" aria-checked={p.iguales === v} onClick={() => poner({ iguales: v })}
                className={`h-10 rounded-full text-[13px] font-bold ${p.iguales === v ? 'bg-tinta text-white' : ''}`}>{t}</button>
            ))}
          </div>
          {p.iguales
            ? <p className="text-xs text-gris">Escribe abajo el alto y ancho de <strong>cada pieza</strong>. El precio es por el juego completo.</p>
            : (
              <div className="space-y-2">
                {Array.from({ length: n }, (_, i) => (
                  <div key={i} className="grid grid-cols-[70px_1fr_1fr] items-center gap-2">
                    <span className="text-sm font-semibold">Pieza {i + 1}</span>
                    <input inputMode="decimal" aria-label={`Alto pieza ${i + 1}`} placeholder="Alto cm" value={p.lista[i]?.alto ?? ''} onChange={e => medida(i, 'alto', e.target.value)} className="campo" />
                    <input inputMode="decimal" aria-label={`Ancho pieza ${i + 1}`} placeholder="Ancho cm" value={p.lista[i]?.ancho ?? ''} onChange={e => medida(i, 'ancho', e.target.value)} className="campo" />
                  </div>
                ))}
                <p className="text-xs text-gris">El precio es por el juego completo.</p>
              </div>
            )}
        </>
      )}
    </div>
  )
}
