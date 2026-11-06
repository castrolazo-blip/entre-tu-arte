import { useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Camera, Trash2, Paperclip } from 'lucide-react'
import { useCartas } from '../CartasContext.jsx'
import { registrarCartaFisica, tipoDeArchivo, firmaValida } from '../cartasService.js'
import { ACEPTA, mensajeError, tamanoTexto } from '../constantes.js'
import { Modal, btn } from '../ui.jsx'

// Registro de una carta en papel: se fotografía o escanea y queda marcada con origen «física»
export default function CartaFisica({ parejaInicial, onCerrar }) {
  const { retiro, parejas, remitentes, puedeLeer, recargar } = useCartas()
  const [f, setF] = useState({ pareja_id: parejaInicial || '', destinatario: 'ambos', remitente_id: '', remitente_nombre: '', relacion: '', remitente_contacto: '' })
  const [texto, setTexto] = useState('')
  const [archivos, setArchivos] = useState([])
  const [guardando, setGuardando] = useState(false)
  const camara = useRef(null), selector = useRef(null)
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))
  const pareja = parejas.find(p => p.id === f.pareja_id)
  const esperados = remitentes.filter(r => r.pareja_id === f.pareja_id)

  async function agregar(lista) {
    for (const file of lista) {
      const tipo = tipoDeArchivo(file)
      if (!tipo || !(await firmaValida(file, tipo))) { toast.error(`«${file.name}» no es PDF, DOCX, JPG o PNG válido`); continue }
      if (!tipo.startsWith('image/') && file.size > retiro.max_mb * 1024 * 1024) { toast.error(`«${file.name}» supera ${retiro.max_mb} MB`); continue }
      setArchivos(a => [...a, file])
    }
  }

  function elegirRemitente(id) {
    const r = esperados.find(x => x.id === id)
    setF(x => ({ ...x, remitente_id: id, remitente_nombre: r ? r.nombre : x.remitente_nombre, relacion: r?.relacion || x.relacion, destinatario: r?.destinatario || x.destinatario }))
  }

  async function guardar(e) {
    e.preventDefault()
    if (!pareja) return toast.error('Elige la pareja')
    if (!f.remitente_nombre.trim()) return toast.error('Escribe quién envía la carta')
    if (!archivos.length && !texto.trim()) return toast.error('Agrega la foto o escaneo de la carta')
    setGuardando(true)
    try {
      await registrarCartaFisica({ carta: { ...f, retiro_id: retiro.id }, texto, archivos, puedeLeer })
      toast.success('Carta física registrada')
      await recargar()
      onCerrar()
    } catch (err) { toast.error(mensajeError(err, 'No se pudo registrar la carta')) }
    finally { setGuardando(false) }
  }

  return (
    <Modal titulo="Registrar carta física" onCerrar={onCerrar}
      pie={<div className="flex justify-end gap-2"><button onClick={onCerrar} className={btn.contorno}>Cancelar</button><button form="form-fisica" disabled={guardando} className={btn.vino}>{guardando ? 'Subiendo…' : 'Registrar'}</button></div>}>
      <form id="form-fisica" onSubmit={guardar} className="grid gap-4">
        <label className="etiqueta">Pareja *
          <select required value={f.pareja_id} onChange={e => setF(x => ({ ...x, pareja_id: e.target.value, remitente_id: '' }))} className="campo mt-1.5">
            <option value="">Elegir…</option>
            {parejas.filter(p => p.estado === 'activa').map(p => <option key={p.id} value={p.id}>{p.codigo} · {p.nombre_a} y {p.nombre_b}</option>)}
          </select>
        </label>
        {pareja && (
          <>
            <label className="etiqueta">Remitente esperado
              <select value={f.remitente_id} onChange={e => elegirRemitente(e.target.value)} className="campo mt-1.5">
                <option value="">— No está en la lista (adicional) —</option>
                {esperados.map(r => <option key={r.id} value={r.id}>{r.nombre}{r.relacion ? ` · ${r.relacion}` : ''}</option>)}
              </select>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="etiqueta">Nombre de quien envía *<input required value={f.remitente_nombre} onChange={e => set('remitente_nombre', e.target.value)} className="campo mt-1.5" /></label>
              <label className="etiqueta">Relación<input value={f.relacion} onChange={e => set('relacion', e.target.value)} className="campo mt-1.5" /></label>
            </div>
            <label className="etiqueta">Para
              <select value={f.destinatario} onChange={e => set('destinatario', e.target.value)} className="campo mt-1.5">
                <option value="A">{pareja.nombre_a}</option><option value="B">{pareja.nombre_b}</option><option value="ambos">Ambos</option>
              </select>
            </label>
          </>
        )}
        <div>
          <p className="etiqueta mb-2">Fotos o escaneo de la carta</p>
          <div className="flex flex-wrap gap-2">
            <input ref={camara} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { agregar([...e.target.files]); e.target.value = '' }} />
            <input ref={selector} type="file" accept={ACEPTA} multiple className="hidden" onChange={e => { agregar([...e.target.files]); e.target.value = '' }} />
            <button type="button" onClick={() => camara.current?.click()} className={btn.contorno}><Camera size={16} />Tomar foto</button>
            <button type="button" onClick={() => selector.current?.click()} className={btn.contorno}><Paperclip size={16} />Elegir archivo</button>
          </div>
          {archivos.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {archivos.map((a, i) => (
                <li key={i} className="flex items-center gap-2 rounded-xl bg-crema-clara px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1 truncate">{a.name}</span><span className="text-xs text-gris">{tamanoTexto(a.size)}</span>
                  <button type="button" onClick={() => setArchivos(x => x.filter((_, j) => j !== i))} aria-label="Quitar" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white"><Trash2 size={14} /></button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-gris">Las fotos se conservan como archivo original. Toma una foto por página, con buena luz.</p>
        </div>
        {puedeLeer && (
          <label className="etiqueta">Transcripción (opcional)
            <textarea rows={4} value={texto} onChange={e => setTexto(e.target.value)} placeholder="Si la letra es difícil de leer, puedes transcribirla aquí" className="campo mt-1.5" />
          </label>
        )}
      </form>
    </Modal>
  )
}
