import { useRef } from 'react'

// Botón que abre la cámara o la galería. En iPhone lo más confiable es un <button> normal que
// llama a input.click() dentro del mismo toque; el campo de archivo queda fuera de la vista
// (sin display:none, que Safari a veces ignora).
export default function BotonArchivo({ onArchivos, multiple = false, camara = false, disabled = false, className = '', children, etiqueta }) {
  const ref = useRef(null)
  return (
    <>
      <button type="button" disabled={disabled} aria-label={etiqueta} className={className}
        onClick={() => { if (ref.current) { ref.current.value = ''; ref.current.click() } }}>
        {children}
      </button>
      <input ref={ref} type="file" accept="image/*" multiple={multiple} {...(camara ? { capture: 'environment' } : {})}
        tabIndex={-1} aria-hidden="true"
        style={{ position: 'fixed', left: '-1000px', top: 0, width: '1px', height: '1px', opacity: 0 }}
        onChange={e => { const f = Array.from(e.target.files || []); if (f.length) onArchivos(f) }} />
    </>
  )
}
