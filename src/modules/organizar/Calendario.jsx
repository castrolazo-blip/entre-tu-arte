import { aFecha, aTexto, MESES } from './fechas.js'

const CABECERA = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

// Calendario mensual (semana de lunes a domingo) para el período desde–hasta.
// celda(fecha) → { activa, clase, marca, titulo } decide cómo se ve y si se puede tocar.
export default function Calendario({ desde, hasta, celda, onTocar }) {
  if (!desde || !hasta) return null
  const meses = []
  const fin = aFecha(hasta)
  for (let m = new Date(aFecha(desde).getFullYear(), aFecha(desde).getMonth(), 1); m <= fin && meses.length < 14; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) {
    meses.push(new Date(m))
  }
  return (
    <div className="space-y-6">
      {meses.map(mes => {
        const vacios = (mes.getDay() + 6) % 7
        const total = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate()
        return (
          <div key={mes.toISOString()}>
            {meses.length > 1 && <p className="mb-2 text-sm font-bold capitalize text-slate-600">{MESES[mes.getMonth()]} {mes.getFullYear()}</p>}
            <div className="grid grid-cols-7 gap-1.5 text-center">
              {CABECERA.map((d, i) => <span key={i} className="pb-1 text-[12px] font-bold text-slate-400">{d}</span>)}
              {Array.from({ length: vacios }, (_, i) => <span key={`v${i}`} />)}
              {Array.from({ length: total }, (_, i) => {
                const fecha = aTexto(new Date(mes.getFullYear(), mes.getMonth(), i + 1))
                const enRango = fecha >= desde && fecha <= hasta
                const c = enRango ? celda(fecha) : { activa: false }
                if (!c.activa) {
                  return <span key={fecha} className={`grid aspect-square place-items-center rounded-xl text-[14px] ${enRango ? 'bg-slate-100 text-slate-300' : 'text-slate-200'} ${c.clase || ''}`}>{i + 1}</span>
                }
                return (
                  <button key={fecha} type="button" title={c.titulo} onClick={() => onTocar?.(fecha)}
                    className={`relative grid aspect-square place-items-center rounded-xl text-[15px] font-bold transition active:scale-95 ${c.clase || ''}`}>
                    {i + 1}
                    {c.marca && <span className="absolute bottom-1 left-1/2 -translate-x-1/2">{c.marca}</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
