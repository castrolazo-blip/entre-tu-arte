import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { ArrowUp, ArrowDown, FileDown, Archive, ListChecks, Printer, PackageCheck, Lock, Loader2, Save } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext.jsx'
import { useCartas } from '../CartasContext.jsx'
import { actualizarCartas, textosCartas, bytesArchivo, registrarAccion } from '../cartasService.js'
import { crearZip, descargar, nombreArchivo, aCSV } from '../archivos.js'
import { ESTADOS_CARTA, NO_VALIDAS, APROBADAS, folioTexto, nombreDestinatario, nombrePareja, mensajeError, fecha } from '../constantes.js'
import { Etiqueta, Titulo, Vacio, btn } from '../ui.jsx'

const PESO = { A: 0, B: 1, ambos: 2 }

export default function Impresion() {
  const { retiro, parejas, cartas, puedeLeer, recargar } = useCartas()
  const { usuario } = useAuth()
  const activas = parejas.filter(p => p.estado === 'activa')
  const [parejaId, setParejaId] = useState(activas[0]?.id || '')
  const [orden, setOrden] = useState([])
  const [seleccion, setSeleccion] = useState(new Set())
  const [conPortada, setConPortada] = useState(true)
  const [conSeparadores, setConSeparadores] = useState(true)
  const [progreso, setProgreso] = useState(null)
  const pareja = parejas.find(p => p.id === parejaId)
  // Los datos pueden llegar después de abrir la pantalla (o al cambiar de retiro)
  useEffect(() => { if (!pareja && activas[0]) setParejaId(activas[0].id) }, [pareja, activas])

  const suyas = useMemo(() => cartas.filter(c => c.pareja_id === parejaId && !NO_VALIDAS.includes(c.estado)), [cartas, parejaId])

  // Orden inicial: el guardado; si no hay, por destinatario (A, B, ambos) y fecha
  useEffect(() => {
    const ordenadas = [...suyas].sort((a, b) =>
      (a.orden ?? 1e9) - (b.orden ?? 1e9) || PESO[a.destinatario] - PESO[b.destinatario] || a.created_at.localeCompare(b.created_at))
    setOrden(ordenadas.map(c => c.id))
    setSeleccion(new Set(ordenadas.filter(c => APROBADAS.includes(c.estado) && c.estado !== 'entregada').map(c => c.id)))
  }, [parejaId, suyas.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const porId = Object.fromEntries(suyas.map(c => [c.id, c]))
  const enOrden = orden.map(id => porId[id]).filter(Boolean)
  const elegidas = enOrden.filter(c => seleccion.has(c.id))

  const mover = (i, d) => setOrden(o => { const n = [...o]; const j = i + d; if (j < 0 || j >= n.length) return o; [n[i], n[j]] = [n[j], n[i]]; return n })
  const alternar = id => setSeleccion(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const auditar = (accion, datos) => registrarAccion({ retiro_id: retiro.id, usuario_id: usuario.id, entidad: 'impresion', entidad_id: parejaId, accion, datos })

  async function guardarOrden() {
    try {
      for (let i = 0; i < enOrden.length; i++) if (enOrden[i].orden !== i + 1) await actualizarCartas([enOrden[i].id], { orden: i + 1 })
      toast.success('Orden guardado'); recargar()
    } catch (err) { toast.error(mensajeError(err)) }
  }

  async function generarPdf() {
    if (!elegidas.length) return toast.error('Selecciona al menos una carta')
    const sinAprobar = elegidas.filter(c => !APROBADAS.includes(c.estado))
    if (sinAprobar.length && !window.confirm(`${sinAprobar.length} carta(s) aún no están aprobadas. ¿Incluirlas de todos modos?`)) return
    setProgreso('Preparando…')
    try {
      const textos = await textosCartas(elegidas.map(c => c.id))
      const { pdfDePareja } = await import('../pdfCartas.js')
      const { blob, problemas } = await pdfDePareja({
        retiro, pareja, conPortada, conSeparadores, leerArchivo: bytesArchivo,
        cartas: elegidas.map(c => ({ carta: c, texto: textos[c.id], archivos: c.cca_archivos.filter(a => !a.ilegible) })),
        alAvanzar: (i, n) => setProgreso(`Armando carta ${i} de ${n}…`),
      })
      descargar(blob, `cartas-${nombreArchivo(pareja.codigo + '-' + nombrePareja(pareja))}.pdf`)
      await auditar('pdf', { cartas: elegidas.map(c => c.folio), problemas })
      if (problemas.length) toast.error(`${problemas.length} archivo(s) no se pudieron incluir: el PDF trae un aviso en su lugar`, { duration: 7000 })
      else toast.success('PDF listo')
    } catch (err) { toast.error(mensajeError(err, 'No se pudo generar el PDF')) }
    finally { setProgreso(null) }
  }

  async function zipOriginales() {
    if (!elegidas.length) return toast.error('Selecciona al menos una carta')
    setProgreso('Descargando originales…')
    try {
      const textos = await textosCartas(elegidas.map(c => c.id))
      const entradas = {}
      for (const [i, c] of elegidas.entries()) {
        setProgreso(`Original ${i + 1} de ${elegidas.length}…`)
        const carpeta = `${String(i + 1).padStart(2, '0')}-${folioTexto(c.folio)}-${nombreArchivo(c.remitente_nombre)}`
        entradas[`${carpeta}/datos.txt`] = `Folio: ${folioTexto(c.folio)}\nPara: ${nombreDestinatario(pareja, c.destinatario)}\nDe: ${c.remitente_nombre}${c.relacion ? ` (${c.relacion})` : ''}\nOrigen: ${c.origen}\nRecibida: ${fecha(c.created_at, true)}\nEstado: ${ESTADOS_CARTA[c.estado].etiqueta}\n`
        if (textos[c.id]) entradas[`${carpeta}/carta.txt`] = textos[c.id]
        for (const a of c.cca_archivos) entradas[`${carpeta}/${nombreArchivo(a.nombre_original)}`] = await bytesArchivo(a.ruta)
      }
      descargar(await crearZip(entradas), `originales-${nombreArchivo(pareja.codigo)}.zip`)
      await auditar('zip', { cartas: elegidas.map(c => c.folio) })
    } catch (err) { toast.error(mensajeError(err, 'No se pudo crear el ZIP')) }
    finally { setProgreso(null) }
  }

  async function listaControl(todoElRetiro) {
    const base = todoElRetiro ? cartas.filter(c => APROBADAS.includes(c.estado)) : elegidas
    if (!base.length) return toast.error('No hay cartas para la lista')
    const pp = Object.fromEntries(parejas.map(p => [p.id, p]))
    const filas = [...base].sort((a, b) => pp[a.pareja_id].codigo.localeCompare(pp[b.pareja_id].codigo) || (a.orden ?? 1e9) - (b.orden ?? 1e9))
      .map(c => ({ folio: folioTexto(c.folio), pareja: `${pp[c.pareja_id].codigo} ${nombrePareja(pp[c.pareja_id])}`, para: nombreDestinatario(pp[c.pareja_id], c.destinatario), de: c.remitente_nombre, estado: ESTADOS_CARTA[c.estado].etiqueta }))
    const { pdfControl } = await import('../pdfCartas.js')
    descargar(await pdfControl({ retiro, filas }), `control-entrega-${nombreArchivo(todoElRetiro ? retiro.nombre : pareja.codigo)}.pdf`)
    descargar(aCSV(filas, [{ titulo: 'Folio', valor: 'folio' }, { titulo: 'Pareja', valor: 'pareja' }, { titulo: 'Para', valor: 'para' }, { titulo: 'De', valor: 'de' }, { titulo: 'Estado', valor: 'estado' }, { titulo: 'Entregada (firma)', valor: () => '' }]),
      `control-entrega-${nombreArchivo(todoElRetiro ? retiro.nombre : pareja.codigo)}.csv`)
  }

  async function marcar(estado) {
    if (!elegidas.length) return toast.error('Selecciona al menos una carta')
    if (estado === 'entregada' && !window.confirm(`¿Confirmas que ${elegidas.length} carta(s) ya se entregaron en mano a ${nombrePareja(pareja)}?`)) return
    try {
      await actualizarCartas(elegidas.map(c => c.id), { estado })
      toast.success(`${elegidas.length} marcadas como ${ESTADOS_CARTA[estado].etiqueta.toLowerCase()}`)
      recargar()
    } catch (err) { toast.error(mensajeError(err)) }
  }

  if (!activas.length) return <Vacio titulo="No hay parejas activas" />

  return (
    <div>
      <Titulo titulo="Impresión y entrega" subtitulo="Arma el PDF de cada pareja, descarga los originales y lleva el control de lo entregado." />

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-[22px] bg-white p-3">
        <select value={parejaId} onChange={e => setParejaId(e.target.value)} className="campo min-w-[240px] flex-1" aria-label="Pareja">
          {activas.map(p => <option key={p.id} value={p.id}>{p.codigo} · {p.nombre_a} y {p.nombre_b}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={conPortada} onChange={e => setConPortada(e.target.checked)} className="h-4 w-4 accent-[#7a2621]" />Portada</label>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={conSeparadores} onChange={e => setConSeparadores(e.target.checked)} className="h-4 w-4 accent-[#7a2621]" />Separador por carta</label>
      </div>

      {!puedeLeer && <p className="mb-4 flex items-center gap-2 rounded-2xl bg-crema p-4 text-sm text-gris"><Lock size={16} />Tu usuario no puede leer el contenido: puedes marcar estados, pero no generar el PDF ni descargar originales.</p>}

      {!enOrden.length ? <Vacio titulo="Esta pareja no tiene cartas válidas todavía" /> : (
        <>
          <ul className="divide-y divide-crema-borde overflow-hidden rounded-[22px] bg-white">
            {enOrden.map((c, i) => (
              <li key={c.id} className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
                <input type="checkbox" checked={seleccion.has(c.id)} onChange={() => alternar(c.id)} className="h-5 w-5 shrink-0 accent-[#7a2621]" aria-label={`Incluir ${folioTexto(c.folio)}`} />
                <span className="w-6 text-center text-xs font-bold text-gris">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{c.remitente_nombre} <span className="font-normal text-gris">→ {nombreDestinatario(pareja, c.destinatario)}</span></span>
                  <span className="text-xs text-gris">{folioTexto(c.folio)} · {c.origen === 'fisica' ? 'física' : 'digital'}{c.cca_archivos.length ? ` · ${c.cca_archivos.length} archivo(s)` : ''}{c.cca_archivos.some(a => a.ilegible) && ' · tiene archivo ilegible (se omite)'}</span>
                </span>
                <Etiqueta estado={c.estado} />
                <span className="flex">
                  <button onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Subir" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-crema disabled:opacity-30"><ArrowUp size={16} /></button>
                  <button onClick={() => mover(i, 1)} disabled={i === enOrden.length - 1} aria-label="Bajar" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-crema disabled:opacity-30"><ArrowDown size={16} /></button>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-gris">{elegidas.length} de {enOrden.length} seleccionadas. Por defecto se eligen las aprobadas que aún no se entregan.</p>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="rounded-[22px] bg-white p-4">
              <p className="mb-3 text-sm font-semibold">Archivos</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={generarPdf} disabled={!puedeLeer || !!progreso} className={btn.vino}><FileDown size={16} />PDF para imprimir</button>
                <button onClick={zipOriginales} disabled={!puedeLeer || !!progreso} className={btn.contorno}><Archive size={16} />ZIP de originales</button>
                <button onClick={() => listaControl(false)} disabled={!!progreso} className={btn.contorno}><ListChecks size={16} />Lista de control</button>
                <button onClick={guardarOrden} disabled={!!progreso} className={btn.contorno}><Save size={16} />Guardar orden</button>
              </div>
              {progreso && <p className="mt-3 flex items-center gap-2 text-sm text-gris"><Loader2 size={15} className="animate-spin" />{progreso}</p>}
            </div>
            <div className="rounded-[22px] bg-white p-4">
              <p className="mb-3 text-sm font-semibold">Control de entrega (selección)</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => marcar('lista')} className={btn.contorno}><ListChecks size={16} />Lista para imprimir</button>
                <button onClick={() => marcar('impresa')} className={btn.contorno}><Printer size={16} />Impresa</button>
                <button onClick={() => marcar('entregada')} className={btn.contorno}><PackageCheck size={16} />Entregada</button>
              </div>
              <p className="mt-2 text-xs text-gris">Cada cambio guarda quién y cuándo. Imprimir no marca nada como entregado.</p>
            </div>
          </div>
        </>
      )}
      <button onClick={() => listaControl(true)} className={`${btn.texto} mt-6`}><ListChecks size={15} />Lista de control de todo el retiro (cartas aprobadas)</button>
    </div>
  )
}
