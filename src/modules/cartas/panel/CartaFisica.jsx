import { useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Camera, Trash2, Paperclip, Plus, Mail, Package } from 'lucide-react'
import { useCartas } from '../CartasContext.jsx'
import { registrarCartaFisica, tipoDeArchivo, firmaValida } from '../cartasService.js'
import { ACEPTA, mensajeError, nombrePareja, apodo } from '../constantes.js'
import { Modal, SelectRelacion, btn } from '../ui.jsx'

const linea = () => ({ relacion: '', de: '', para: 'ambos', archivos: [] })

// Registro de cartas que llegan en papel (paquete de la familia) o por correo (cartasrenova@gmail.com).
// En papel no hace falta foto: la carta ya viene impresa y va directo al sobre. Por correo se adjunta el archivo para imprimirlo.
export default function CartaFisica({ parejaInicial, onCerrar }) {
  const { retiro, parejas, remitentes, puedeLeer, recargar } = useCartas()
  const [origen, setOrigen] = useState('fisica')
  const [parejaId, setParejaId] = useState(parejaInicial || '')
  const [coordinadorId, setCoordinadorId] = useState('')
  const [entrego, setEntrego] = useState('')
  const [lineas, setLineas] = useState([linea()])
  const [texto, setTexto] = useState('')
  const [guardando, setGuardando] = useState(null)
  const pareja = parejas.find(p => p.id === parejaId)
  const contactos = remitentes.filter(r => r.pareja_id === parejaId && r.coordinador)
  const set = (i, k, v) => setLineas(ls => ls.map((l, j) => (j === i ? { ...l, [k]: v } : l)))

  async function adjuntar(i, lista) {
    const buenos = []
    for (const file of lista) {
      const tipo = tipoDeArchivo(file)
      if (!tipo || !(await firmaValida(file, tipo))) { toast.error(`«${file.name}» no es PDF, DOCX, JPG o PNG válido`); continue }
      if (!tipo.startsWith('image/') && file.size > retiro.max_mb * 1024 * 1024) { toast.error(`«${file.name}» supera ${retiro.max_mb} MB`); continue }
      buenos.push(file)
    }
    setLineas(ls => ls.map((l, j) => (j === i ? { ...l, archivos: [...l.archivos, ...buenos] } : l)))
  }

  // Varias cartas iguales sin detalle (p. ej. «5 para Carlos»)
  function agregarVarias(para) {
    const n = Number(window.prompt(`¿Cuántas cartas para ${para === 'ambos' ? 'ambos' : apodo(pareja, para)}?`, '1'))
    if (!(n > 0 && n <= 50)) return
    setLineas(ls => [...ls.filter(l => l.de.trim() || l.archivos.length), ...Array.from({ length: n }, () => ({ ...linea(), para }))])
  }

  async function guardar(e) {
    e.preventDefault()
    if (!pareja) return toast.error('Elige la pareja')
    // Cada línea es una carta; se clasifica por quién la envía (papá, hermana…). Sin dato: «Sin identificar»
    const finales = lineas.map(l => ({ ...l, de: l.de.trim() || l.relacion.trim() || 'Sin identificar' }))
    const sinClasificar = lineas.filter(l => !l.relacion.trim()).length
    if (sinClasificar && !window.confirm(`${sinClasificar} ${sinClasificar === 1 ? 'carta no tiene' : 'cartas no tienen'} indicado quién la envía. ¿Registrar de todos modos?`)) return
    if (origen === 'correo' && finales.some(l => !l.archivos.length) && !window.confirm('Hay cartas por correo sin archivo adjunto. Sin el archivo no se podrán imprimir. ¿Registrar de todos modos?')) return
    const coord = contactos.find(c => c.id === coordinadorId)
    setGuardando(`0 de ${finales.length}`)
    let hechas = 0
    try {
      for (const l of finales) {
        await registrarCartaFisica({
          carta: { retiro_id: retiro.id, pareja_id: pareja.id, destinatario: l.para, remitente_nombre: l.de, origen,
            relacion: l.relacion.trim() || null, coordinador_id: coord?.id || null, recibida_de: coord?.nombre || entrego.trim() || null },
          texto: finales.length === 1 ? texto : '', archivos: l.archivos, puedeLeer,
        })
        hechas++; setGuardando(`${hechas} de ${finales.length}`)
      }
      toast.success(`${hechas} ${hechas === 1 ? 'carta registrada' : 'cartas registradas'}`)
      await recargar()
      setLineas([linea()]); setTexto('')
    } catch (err) {
      toast.error(`${hechas} registradas; falló la siguiente: ${mensajeError(err)}`)
      setLineas(finales.slice(hechas)); await recargar()
    } finally { setGuardando(null) }
  }

  const nombreA = pareja ? apodo(pareja, 'A') : 'A', nombreB = pareja ? apodo(pareja, 'B') : 'B'
  return (
    <Modal titulo="Registrar cartas recibidas" onCerrar={onCerrar} ancho="max-w-2xl"
      pie={<div className="flex items-center justify-between gap-2">
        <span className="text-sm text-gris">{lineas.length} {lineas.length === 1 ? 'carta' : 'cartas'}</span>
        <div className="flex gap-2"><button onClick={onCerrar} className={btn.contorno}>Cerrar</button><button form="form-fisica" disabled={!!guardando} className={btn.vino}>{guardando ? `Guardando ${guardando}…` : `Registrar ${lineas.length}`}</button></div>
      </div>}>
      <form id="form-fisica" onSubmit={guardar} className="grid gap-4">
        <div className="flex gap-2">
          <button type="button" onClick={() => setOrigen('fisica')} className={`chip ${origen === 'fisica' ? 'chip-on' : 'chip-off'}`}><Package size={15} className="mr-1.5" />En papel (paquete)</button>
          <button type="button" onClick={() => setOrigen('correo')} className={`chip ${origen === 'correo' ? 'chip-on' : 'chip-off'}`}><Mail size={15} className="mr-1.5" />Por correo</button>
        </div>
        <label className="etiqueta">Pareja *
          <select required value={parejaId} onChange={e => { setParejaId(e.target.value); setCoordinadorId('') }} className="campo mt-1.5">
            <option value="">Elegir…</option>
            {parejas.filter(p => p.estado === 'activa').map(p => <option key={p.id} value={p.id}>{p.codigo} · {nombrePareja(p)}</option>)}
          </select>
        </label>
        {pareja && origen === 'fisica' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="etiqueta">Entregó el paquete
              <select value={coordinadorId} onChange={e => setCoordinadorId(e.target.value)} className="campo mt-1.5">
                <option value="">— Otra persona —</option>
                {contactos.map(c => <option key={c.id} value={c.id}>{c.nombre}{c.relacion ? ` · ${c.relacion}` : ''}</option>)}
              </select>
            </label>
            {!coordinadorId && <label className="etiqueta">Nombre de quien entregó<input value={entrego} onChange={e => setEntrego(e.target.value)} className="campo mt-1.5" /></label>}
          </div>
        )}

        {pareja && (
          <div>
            <p className="etiqueta mb-2">Cartas: una línea por carta, con quién la envía y para quién</p>
            <ul className="space-y-2">
              {lineas.map((l, i) => (
                <LineaCarta key={i} l={l} i={i} nombreA={nombreA} nombreB={nombreB} conArchivo={origen === 'correo'}
                  onCambio={(k, v) => set(i, k, v)} onAdjuntar={files => adjuntar(i, files)}
                  onQuitar={lineas.length > 1 ? () => setLineas(ls => ls.filter((_, j) => j !== i)) : null}
                  onEnter={() => setLineas(ls => [...ls, { ...linea(), para: l.para }])} />
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => setLineas(ls => [...ls, linea()])} className={btn.mini}><Plus size={14} />Otra carta</button>
              <button type="button" onClick={() => agregarVarias('A')} className={btn.mini}>Varias para {nombreA}</button>
              <button type="button" onClick={() => agregarVarias('B')} className={btn.mini}>Varias para {nombreB}</button>
              <button type="button" onClick={() => agregarVarias('ambos')} className={btn.mini}>Varias para ambos</button>
            </div>
            <p className="mt-2 text-xs text-gris">{origen === 'fisica'
              ? 'Las cartas en papel no se abren ni se fotografían: se clasifican con lo que dice el sobre («De: hermano») y van a su sobre.'
              : 'Adjunta el archivo del correo (PDF, Word o foto del escaneo) para poder imprimirlo. Toma quién la envía del asunto.'}</p>
          </div>
        )}
        {pareja && puedeLeer && lineas.length === 1 && origen === 'correo' && (
          <label className="etiqueta">Texto del correo (si la carta vino escrita en el cuerpo)
            <textarea rows={4} value={texto} onChange={e => setTexto(e.target.value)} className="campo mt-1.5" />
          </label>
        )}
      </form>
    </Modal>
  )
}

function LineaCarta({ l, i, nombreA, nombreB, conArchivo, onCambio, onAdjuntar, onQuitar, onEnter }) {
  const camara = useRef(null), selector = useRef(null)
  return (
    <li className="rounded-2xl bg-crema-clara p-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-6 text-center text-xs font-bold text-gris">{i + 1}</span>
        <SelectRelacion valor={l.relacion} onCambio={v => onCambio('relacion', v)} className="min-w-[170px] flex-1" />
        <input value={l.de} onChange={e => onCambio('de', e.target.value)} placeholder="Nombre (opcional)" aria-label={`Nombre, carta ${i + 1}`}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onEnter() } }} className="campo h-10 min-w-[120px] flex-1 bg-white" />
        <span className="flex overflow-hidden rounded-full border border-crema-borde bg-white text-[13px] font-semibold">
          {[['A', nombreA], ['B', nombreB], ['ambos', 'Ambos']].map(([v, t]) => (
            <button type="button" key={v} onClick={() => onCambio('para', v)} aria-pressed={l.para === v}
              className={`h-10 max-w-[110px] truncate px-3 ${l.para === v ? 'bg-vino text-white' : ''}`}>{t}</button>
          ))}
        </span>
        {conArchivo && (
          <>
            <input ref={camara} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { onAdjuntar([...e.target.files]); e.target.value = '' }} />
            <input ref={selector} type="file" accept={ACEPTA} multiple className="hidden" onChange={e => { onAdjuntar([...e.target.files]); e.target.value = '' }} />
            <button type="button" onClick={() => selector.current?.click()} aria-label="Adjuntar archivo" className="flex h-10 w-10 items-center justify-center rounded-full bg-white"><Paperclip size={16} /></button>
            <button type="button" onClick={() => camara.current?.click()} aria-label="Tomar foto" className="flex h-10 w-10 items-center justify-center rounded-full bg-white"><Camera size={16} /></button>
          </>
        )}
        {onQuitar && <button type="button" onClick={onQuitar} aria-label="Quitar línea" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white"><Trash2 size={15} /></button>}
      </div>
      {l.archivos.length > 0 && <p className="ml-8 mt-1.5 truncate text-xs text-gris"><Paperclip size={11} className="mr-1 inline" />{l.archivos.map(a => a.name).join(', ')}</p>}
    </li>
  )
}
