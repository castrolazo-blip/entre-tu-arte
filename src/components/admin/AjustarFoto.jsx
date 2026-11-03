import { useEffect, useMemo, useRef, useState } from 'react'
import { X, RotateCw, ZoomIn, ZoomOut, Maximize, Sparkles, Check } from 'lucide-react'
import { girarImagen, girarCaja } from '../../modules/admin/publicar/imagenObra.js'

const COMPLETA = { x: 0, y: 0, w: 1, h: 1 }
const MINIMO = 0.04
const limitar = (v, a, b) => Math.min(b, Math.max(a, v))

// Editor de foto a pantalla completa: recorte con esquinas, acercar/alejar (y desplazar con el
// dedo cuando está acercada) y girar 90°. Devuelve la caja {x, y, w, h} en fracciones de la
// imagen ya girada, y el giro (0, 90, 180, 270).
export default function AjustarFoto({ imagen, cajaInicial, cajaIA, giroInicial = 0, titulo = 'Ajustar foto', onListo, onCancelar }) {
  const [giro, setGiro] = useState(giroInicial)
  const [caja, setCaja] = useState(cajaInicial || COMPLETA)
  const [zoom, setZoom] = useState(1)
  const [marco, setMarco] = useState({ w: 320, h: 400 })
  const zona = useRef(null)
  const arrastre = useRef(null)

  const base = useMemo(() => girarImagen(imagen, giro), [imagen, giro])
  const src = useMemo(() => (base instanceof HTMLCanvasElement ? base.toDataURL('image/jpeg', 0.9) : base.src), [base])
  const bw = base.naturalWidth || base.width, bh = base.naturalHeight || base.height

  // Tamaño de la imagen en pantalla (ajustada al espacio disponible) por el zoom
  useEffect(() => {
    const medir = () => {
      const el = zona.current
      if (!el) return
      const disponibleW = el.clientWidth - 32, disponibleH = el.clientHeight - 32
      const escala = Math.min(disponibleW / bw, disponibleH / bh)
      setMarco({ w: bw * escala, h: bh * escala })
    }
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [bw, bh])
  const W = marco.w * zoom, H = marco.h * zoom

  // Al cambiar el zoom, mantener el centro del recorte a la vista
  useEffect(() => {
    const el = zona.current
    if (!el) return
    el.scrollLeft = (caja.x + caja.w / 2) * W + 16 - el.clientWidth / 2
    el.scrollTop = (caja.y + caja.h / 2) * H + 16 - el.clientHeight / 2
  }, [zoom]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  function empezar(modo, e) {
    e.preventDefault(); e.stopPropagation()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    arrastre.current = { modo, x0: e.clientX, y0: e.clientY, caja0: caja }
  }
  function mover(e) {
    const a = arrastre.current
    if (!a) return
    const dx = (e.clientX - a.x0) / W, dy = (e.clientY - a.y0) / H
    const c = { ...a.caja0 }
    if (a.modo === 'mover') {
      c.x = limitar(c.x + dx, 0, 1 - c.w); c.y = limitar(c.y + dy, 0, 1 - c.h)
    } else {
      const derecha = c.x + c.w, abajo = c.y + c.h
      if (a.modo.includes('o')) { c.x = limitar(c.x + dx, 0, derecha - MINIMO); c.w = derecha - c.x }
      if (a.modo.includes('e')) { c.w = limitar(c.w + dx, MINIMO, 1 - c.x) }
      if (a.modo.includes('n')) { c.y = limitar(c.y + dy, 0, abajo - MINIMO); c.h = abajo - c.y }
      if (a.modo.includes('s')) { c.h = limitar(c.h + dy, MINIMO, 1 - c.y) }
    }
    setCaja(c)
  }
  const soltar = () => { arrastre.current = null }

  function girar() {
    setGiro(g => (g + 90) % 360)
    setCaja(c => girarCaja(c))
  }

  const esquinas = [['no', 'left-0 top-0 -translate-x-1/2 -translate-y-1/2'], ['ne', 'right-0 top-0 translate-x-1/2 -translate-y-1/2'],
    ['so', 'left-0 bottom-0 -translate-x-1/2 translate-y-1/2'], ['se', 'right-0 bottom-0 translate-x-1/2 translate-y-1/2']]
  const bordes = [['n', 'left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 h-5 w-10'], ['s', 'left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 h-5 w-10'],
    ['o', 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-5'], ['e', 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2 h-10 w-5']]
  const pxW = Math.round(caja.w * bw), pxH = Math.round(caja.h * bh)

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-[#111214] text-white" role="dialog" aria-modal="true" aria-label={titulo}>
      <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-[max(12px,env(safe-area-inset-top))]">
        <button type="button" onClick={onCancelar} aria-label="Cancelar" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10"><X size={20} /></button>
        <p className="truncate text-[15px] font-bold">{titulo}</p>
        <button type="button" onClick={() => onListo({ caja, giro })} className="flex h-11 items-center gap-1.5 rounded-full bg-mostaza px-5 text-sm font-bold text-tinta"><Check size={18} />Listo</button>
      </div>

      <div ref={zona} className="relative flex min-h-0 flex-1 overflow-auto" onPointerMove={mover} onPointerUp={soltar} onPointerCancel={soltar}>
        <div className="m-auto shrink-0 p-4">
        <div className="relative" style={{ width: W, height: H }}>
          <img src={src} alt="" draggable={false} className="pointer-events-none block h-full w-full select-none" />
          <div className="absolute touch-none" style={{ left: caja.x * W, top: caja.y * H, width: caja.w * W, height: caja.h * H, boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)' }}
            onPointerDown={e => empezar('mover', e)}>
            <div className="pointer-events-none absolute inset-0 border-2 border-white" />
            <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
              {Array.from({ length: 9 }, (_, i) => <span key={i} className="border border-white/25" />)}
            </div>
            {bordes.map(([m, pos]) => (
              <span key={m} onPointerDown={e => empezar(m, e)} className={`absolute flex touch-none items-center justify-center ${pos}`}>
                <span className="block h-1.5 w-6 rounded-full bg-white shadow" style={m === 'o' || m === 'e' ? { width: 6, height: 24 } : undefined} />
              </span>
            ))}
            {esquinas.map(([m, pos]) => (
              <span key={m} onPointerDown={e => empezar(m, e)} aria-label="Ajustar esquina" className={`absolute flex h-11 w-11 touch-none items-center justify-center ${pos}`}>
                <span className="h-5 w-5 rounded-full border-2 border-tinta bg-white shadow-lg" />
              </span>
            ))}
          </div>
        </div>
        </div>
      </div>

      <div className="space-y-3 px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setZoom(z => Math.max(1, +(z - 0.5).toFixed(1)))} aria-label="Alejar" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10"><ZoomOut size={18} /></button>
          <input type="range" min="1" max="4" step="0.1" value={zoom} onChange={e => setZoom(Number(e.target.value))} aria-label="Acercar" className="h-2 flex-1 accent-[#E8B627]" />
          <button type="button" onClick={() => setZoom(z => Math.min(4, +(z + 0.5).toFixed(1)))} aria-label="Acercar" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10"><ZoomIn size={18} /></button>
        </div>
        <div className="flex flex-wrap justify-center gap-2 text-[13px] font-semibold">
          <button type="button" onClick={girar} className="flex h-10 items-center gap-1.5 rounded-full bg-white/10 px-4"><RotateCw size={16} />Girar</button>
          <button type="button" onClick={() => setCaja(COMPLETA)} className="flex h-10 items-center gap-1.5 rounded-full bg-white/10 px-4"><Maximize size={16} />Foto completa</button>
          {cajaIA && !giro && <button type="button" onClick={() => setCaja(cajaIA)} className="flex h-10 items-center gap-1.5 rounded-full bg-white/10 px-4"><Sparkles size={16} className="text-mostaza" />Recorte de la IA</button>}
        </div>
        <p className="text-center text-xs text-white/50">Arrastra las esquinas o el recuadro. Acerca para afinar y desliza con el dedo para moverte. · {pxW} × {pxH} px</p>
      </div>
    </div>
  )
}
