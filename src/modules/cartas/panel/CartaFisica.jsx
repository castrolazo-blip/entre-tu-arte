import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Camera, Trash2, Paperclip, Plus, Mail, Package, Link2, Copy } from 'lucide-react'
import { useCartas } from '../CartasContext.jsx'
import { useBorrador, useVentana } from '../borrador.js'
import { registrarCartaFisica, tipoDeArchivo, firmaValida } from '../cartasService.js'
import { ACEPTA, mensajeError, nombrePareja, apodo, enlacePortal, nombreDestinatario, fecha, folioTexto, esValida } from '../constantes.js'
import { InvitacionPareja } from './Retiros.jsx'
import { Modal, SelectRelacion, btn } from '../ui.jsx'

// Una línea = una o varias cartas del mismo tipo (p. ej. «Primo · para ambos · 3»: tres cartas, cada una de un primo)
const linea = () => ({ relacion: '', de: '', para: 'ambos', archivos: [], cantidad: 1 })

// Registro de cartas que llegan en papel (paquete de la familia) o por correo (cartasrenova@gmail.com).
// En papel no hace falta foto: la carta ya viene impresa y va directo al sobre. Por correo se adjunta el archivo para imprimirlo.
export default function CartaFisica({ parejaInicial, onCerrar, clave }) {
  const { retiro, parejas: todas, remitentes, cartas, puedeLeer, recargar, miEquipo, esAdmin } = useCartas()
  const parejas = miEquipo && !esAdmin ? todas.filter(p => p.equipo_id === miEquipo.id) : todas
  // Todo lo escrito se guarda en el teléfono: si la página se recarga, sigue donde iba
  // (los archivos adjuntos no se pueden guardar: hay que volver a elegirlos)
  const [b, setB, limpiar] = useBorrador(`registrar-${clave || parejaInicial || 'general'}`,
    { origen: 'fisica', parejaId: parejaInicial || '', coordinadorId: '', entrego: '', lineas: [linea()], texto: '' },
    v => ({ ...v, lineas: (v.lineas?.length ? v.lineas : [linea()]).map(l => ({ ...linea(), ...l, archivos: [] })) }))
  const { origen, parejaId, coordinadorId, entrego, lineas, texto } = b
  const campo = k => v => setB(x => ({ ...x, [k]: typeof v === 'function' ? v(x[k]) : v }))
  const setOrigen = campo('origen'), setParejaId = campo('parejaId'), setCoordinadorId = campo('coordinadorId')
  const setEntrego = campo('entrego'), setLineas = campo('lineas'), setTexto = campo('texto')
  const cerrar = () => { limpiar(); onCerrar() }
  // La pareja sugerida puede llegar después (cuando cargan los datos)
  useEffect(() => { if (!parejaId && parejaInicial) setB(x => (x.parejaId ? x : { ...x, parejaId: parejaInicial })) }, [parejaInicial]) // eslint-disable-line react-hooks/exhaustive-deps
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

  async function guardar(e) {
    e.preventDefault()
    if (!pareja) return toast.error('Elige la pareja')
    // Cada línea es una carta; se clasifica por quién la envía (papá, hermana…). Sin dato: «Sin identificar»
    // La cantidad solo aplica en papel (por correo cada carta trae su archivo)
    const finales = lineas.flatMap(l => Array.from({ length: origen === 'fisica' ? (l.cantidad || 1) : 1 },
      () => ({ ...l, cantidad: 1, de: l.de.trim() || l.relacion.trim() || 'Sin identificar' })))
    const sinClasificar = finales.filter(l => !l.relacion.trim()).length
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

  const total = lineas.reduce((n, l) => n + (origen === 'fisica' ? (l.cantidad || 1) : 1), 0)
  const nombreA = pareja ? apodo(pareja, 'A') : 'A', nombreB = pareja ? apodo(pareja, 'B') : 'B'
  return (
    <Modal titulo="Registrar cartas recibidas" onCerrar={cerrar} ancho="max-w-2xl"
      pie={origen === 'enlace' ? <div className="flex justify-end"><button onClick={cerrar} className={btn.contorno}>Cerrar</button></div> : <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-gris">{total} {total === 1 ? 'carta' : 'cartas'}</span>
        <div className="flex gap-2"><button onClick={cerrar} className={btn.contorno}>Cerrar</button><button form="form-fisica" disabled={!!guardando} className={btn.vino}>{guardando ? `Guardando ${guardando}…` : `Registrar ${total}`}</button></div>
      </div>}>
      <form id="form-fisica" onSubmit={guardar} className="grid gap-4">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setOrigen('fisica')} className={`chip ${origen === 'fisica' ? 'chip-on' : 'chip-off'}`}><Package size={15} className="mr-1.5" />En papel (paquete)</button>
          <button type="button" onClick={() => setOrigen('correo')} className={`chip ${origen === 'correo' ? 'chip-on' : 'chip-off'}`}><Mail size={15} className="mr-1.5" />Por correo</button>
          <button type="button" onClick={() => setOrigen('enlace')} className={`chip ${origen === 'enlace' ? 'chip-on' : 'chip-off'}`}><Link2 size={15} className="mr-1.5" />Por enlace</button>
        </div>
        <label className="etiqueta">Pareja *
          <select required value={parejaId} onChange={e => setB(x => ({ ...x, parejaId: e.target.value, coordinadorId: '' }))} className="campo mt-1.5">
            <option value="">Elegir…</option>
            {parejas.filter(p => p.estado === 'activa').map(p => <option key={p.id} value={p.id}>{p.codigo} · {nombrePareja(p)}</option>)}
          </select>
        </label>
        {pareja && origen === 'enlace' && <PorEnlace pareja={pareja} cartas={cartas.filter(c => c.pareja_id === pareja.id && c.origen === 'digital' && esValida(c))} retiro={retiro} />}
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

        {pareja && origen !== 'enlace' && (
          <div>
            <p className="etiqueta mb-2">Cartas: quién la envía, para quién{origen === 'fisica' ? ' y cuántas' : ''}</p>
            <ul className="space-y-2">
              {lineas.map((l, i) => (
                <LineaCarta key={i} l={l} i={i} nombreA={nombreA} nombreB={nombreB} conArchivo={origen === 'correo'} conCantidad={origen === 'fisica'}
                  onCambio={(k, v) => set(i, k, v)} onAdjuntar={files => adjuntar(i, files)}
                  onQuitar={lineas.length > 1 ? () => setLineas(ls => ls.filter((_, j) => j !== i)) : null}
                  onEnter={() => setLineas(ls => [...ls, { ...linea(), para: l.para }])} />
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => setLineas(ls => [...ls, linea()])} className={btn.contorno}><Plus size={16} />Agregar otra carta</button>
            </div>
            <p className="mt-2 text-xs text-gris">{origen === 'fisica'
              ? 'Ejemplo: «Primo · Ambos · 3» si llegaron tres cartas, cada una de un primo distinto, para los dos. Las cartas en papel no se abren: se clasifican con lo que dice el sobre y van a su sobre.'
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

function LineaCarta({ l, i, nombreA, nombreB, conArchivo, conCantidad, onCambio, onAdjuntar, onQuitar, onEnter }) {
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
        {conCantidad && (
          <span className="flex items-center rounded-full border border-crema-borde bg-white" aria-label={`Cantidad, carta ${i + 1}`}>
            <button type="button" onClick={() => onCambio('cantidad', Math.max(1, (l.cantidad || 1) - 1))} aria-label="Una menos" className="flex h-10 w-9 items-center justify-center text-lg font-semibold">−</button>
            <span className="w-7 text-center text-sm font-bold tabular-nums">{l.cantidad || 1}</span>
            <button type="button" onClick={() => onCambio('cantidad', Math.min(50, (l.cantidad || 1) + 1))} aria-label="Una más" className="flex h-10 w-9 items-center justify-center text-lg font-semibold">+</button>
          </span>
        )}
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

// Las cartas por enlace no se registran a mano: llegan solas y aparecen aquí en vivo (se revisa cada 20 s)
function PorEnlace({ pareja, cartas, retiro }) {
  return (
    <div className="rounded-2xl bg-crema-clara p-4">
      <p className="text-sm">Las cartas que familiares y amigos envían por el enlace <b>llegan solas</b>: no hay que registrarlas. Esta lista se actualiza sola.</p>
      <div className="mt-3 flex flex-wrap gap-2"><InvitacionPareja retiro={retiro} pareja={pareja} /></div>
      <p className="etiqueta mb-2 mt-4">Recibidas por enlace ({cartas.length})</p>
      {!cartas.length ? <p className="text-sm text-gris">Todavía no ha llegado ninguna.</p> : (
        <ul className="divide-y divide-crema-borde rounded-xl bg-white text-sm">
          {cartas.map(c => (
            <li key={c.id} className="flex flex-wrap items-center gap-x-2 px-3 py-2">
              <span className="text-xs font-bold text-gris">{folioTexto(c.folio)}</span>
              <span className="font-semibold">{c.relacion || c.remitente_nombre}</span>
              <span className="text-gris">→ {nombreDestinatario(pareja, c.destinatario)}</span>
              <span className="ml-auto text-xs text-gris">{fecha(c.created_at, true)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
