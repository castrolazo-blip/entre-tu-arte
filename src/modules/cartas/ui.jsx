import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { ESTADOS_CARTA, ESTADOS_REMITENTE, ESTADOS_RETIRO, COLOR_SEMAFORO, TEXTO_SEMAFORO, RELACIONES, RELACIONES_GRUPO } from './constantes.js'

// Piezas visuales pequeñas del módulo Cartas con Amor

export function Etiqueta({ tipo = 'carta', estado }) {
  const mapa = tipo === 'remitente' ? ESTADOS_REMITENTE : tipo === 'retiro' ? ESTADOS_RETIRO : ESTADOS_CARTA
  const e = mapa[estado] || { etiqueta: estado, clase: 'bg-neutral-100' }
  return <span className={`inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-[11.5px] font-bold ${e.clase}`}>{e.etiqueta}</span>
}

export function Semaforo({ color, conTexto = false }) {
  return (
    <span className="inline-flex items-center gap-1.5" title={TEXTO_SEMAFORO[color]}>
      <span className={`h-2.5 w-2.5 rounded-full ${COLOR_SEMAFORO[color]}`} aria-hidden="true" />
      {conTexto ? <span className="text-xs font-semibold">{TEXTO_SEMAFORO[color]}</span> : <span className="sr-only">{TEXTO_SEMAFORO[color]}</span>}
    </span>
  )
}

export function Modal({ titulo, onCerrar, children, ancho = 'max-w-xl', pie }) {
  useEffect(() => {
    const f = e => { if (e.key === 'Escape') onCerrar() }
    window.addEventListener('keydown', f)
    const previo = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', f); document.body.style.overflow = previo }
  }, [onCerrar])
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={titulo}
      onMouseDown={e => { if (e.target === e.currentTarget) onCerrar() }}>
      <div className={`flex max-h-[94vh] w-full ${ancho} flex-col rounded-t-[28px] bg-white sm:rounded-[28px]`}>
        <div className="flex items-center justify-between gap-3 border-b border-crema-borde px-5 py-4">
          <h2 className="text-lg font-semibold">{titulo}</h2>
          <button onClick={onCerrar} aria-label="Cerrar" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-crema"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {pie && <div className="border-t border-crema-borde px-5 py-4">{pie}</div>}
      </div>
    </div>
  )
}

export function Vacio({ titulo, children }) {
  return (
    <div className="rounded-[24px] border border-dashed border-crema-borde bg-white/60 p-8 text-center">
      <p className="font-semibold">{titulo}</p>
      {children && <div className="mt-2 text-sm text-gris">{children}</div>}
    </div>
  )
}

export function Titulo({ titulo, subtitulo, children }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{titulo}</h1>
        {subtitulo && <p className="mt-1 text-sm text-gris">{subtitulo}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  )
}

export function Kpi({ valor, etiqueta, tono = 'normal', detalle }) {
  const tonos = { normal: 'text-tinta', vino: 'text-vino', alerta: 'text-rose-600', ok: 'text-emerald-700' }
  return (
    <div className="rounded-[22px] bg-white p-4 shadow-[0_14px_30px_-26px_rgba(23,22,20,0.6)]">
      <p className={`text-3xl font-semibold tabular-nums ${tonos[tono]}`}>{valor}</p>
      <p className="mt-1 text-[13px] font-semibold text-gris">{etiqueta}</p>
      {detalle && <p className="mt-0.5 text-xs text-gris/80">{detalle}</p>}
    </div>
  )
}

export const btn = {
  vino: 'inline-flex h-11 items-center justify-center gap-2 rounded-full bg-vino px-5 text-sm font-semibold text-white transition hover:bg-vino-oscuro disabled:opacity-50',
  contorno: 'inline-flex h-11 items-center justify-center gap-2 rounded-full border border-crema-borde bg-white px-5 text-sm font-semibold transition hover:border-tinta disabled:opacity-50',
  mini: 'inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-crema-borde bg-white px-3.5 text-[13px] font-semibold transition hover:border-tinta disabled:opacity-50',
  texto: 'inline-flex items-center gap-1.5 text-sm font-semibold text-vino hover:underline disabled:opacity-50',
}

// ── Clasificación de quién envía la carta ──
const TODAS_RELACIONES = [...RELACIONES, ...RELACIONES_GRUPO]
const useStateOtro = inicial => useState(!!inicial)

// Botones (formulario público): rápido de tocar en el celular; «Otro» abre un campo de texto
export function ChipsRelacion({ valor, onCambio }) {
  const esOtro = valor !== '' && valor !== null && !TODAS_RELACIONES.includes(valor)
  const [otro, setOtro] = useStateOtro(esOtro)
  const chip = (r) => (
    <button type="button" key={r} onClick={() => { setOtro(false); onCambio(r) }} aria-pressed={valor === r}
      className={`h-10 rounded-full border px-3.5 text-[14px] font-semibold transition ${valor === r ? 'border-vino bg-vino text-white' : 'border-crema-borde bg-white hover:border-vino/60'}`}>{r}</button>
  )
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">{RELACIONES.map(chip)}</div>
      <p className="mb-1.5 mt-3 text-xs font-semibold text-gris">Si la firman varios</p>
      <div className="flex flex-wrap gap-1.5">
        {RELACIONES_GRUPO.map(chip)}
        <button type="button" onClick={() => { setOtro(true); onCambio('') }} aria-pressed={otro}
          className={`h-10 rounded-full border px-3.5 text-[14px] font-semibold ${otro ? 'border-vino bg-vino text-white' : 'border-dashed border-crema-borde bg-white'}`}>Otro…</button>
      </div>
      {otro && <input autoFocus value={esOtro ? valor : ''} onChange={e => onCambio(e.target.value.slice(0, 60))} placeholder="Ej.: catequista, vecina, jefe…" aria-label="Otra relación" className="campo mt-2" />}
    </div>
  )
}

// Lista desplegable (registro de paquetes y panel): ocupa poco espacio
export function SelectRelacion({ valor, onCambio, className = '', vacio = '¿Quién la envía?' }) {
  const esOtro = valor && !TODAS_RELACIONES.includes(valor)
  const [otro, setOtro] = useStateOtro(esOtro)
  return (
    <span className={`flex min-w-0 gap-1.5 ${className}`}>
      <select value={otro ? '__otro' : valor || ''} aria-label="Quién envía la carta"
        onChange={e => { if (e.target.value === '__otro') { setOtro(true); onCambio('') } else { setOtro(false); onCambio(e.target.value) } }}
        className={`campo h-10 min-w-0 flex-1 bg-white ${!valor && !otro ? 'text-gris' : ''}`}>
        <option value="">{vacio}</option>
        <optgroup label="Persona">{RELACIONES.map(r => <option key={r}>{r}</option>)}</optgroup>
        <optgroup label="Varios">{RELACIONES_GRUPO.map(r => <option key={r}>{r}</option>)}</optgroup>
        <option value="__otro">Otro…</option>
      </select>
      {otro && <input autoFocus value={valor || ''} onChange={e => onCambio(e.target.value.slice(0, 60))} placeholder="¿Cuál?" aria-label="Otra relación" className="campo h-10 w-28 min-w-0 bg-white" />}
    </span>
  )
}
