import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Plus, Upload, Search, ChevronRight, Download, FileSpreadsheet } from 'lucide-react'
import { useCartas } from '../CartasContext.jsx'
import { guardarPareja, insertarParejas, insertarRemitentes, insertarInscripcion } from '../cartasService.js'
import { leerCSV, leerXLSX, interpretarInscripcion, descargar, PLANTILLA_PAREJAS, PLANTILLA_REMITENTES } from '../archivos.js'
import { mensajeError, semaforo, nombrePareja, nombreCompleto, responsableDe } from '../constantes.js'
import { Modal, Semaforo, Titulo, Vacio, btn } from '../ui.jsx'

const norm = s => String(s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const textoBusqueda = p => norm(`${p.codigo} ${p.nombre_a} ${p.nombre_b} ${p.apodo_a} ${p.apodo_b} ${p.apellidos} ${p.apellidos_a} ${p.apellidos_b} ${p.responsable}`)

// Barra de avance de una persona contra la meta
export function Avance({ nombre, n, meta }) {
  const pct = meta ? Math.min(100, Math.round((n / meta) * 100)) : 0
  const color = n >= meta ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : 'bg-rose-400'
  return (
    <span className="block min-w-[110px]">
      <span className="flex justify-between gap-2 text-[11.5px]"><span className="truncate font-semibold">{nombre}</span><b className="tabular-nums">{n}/{meta}</b></span>
      <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-crema"><span className={`block h-full rounded-full ${color}`} style={{ width: `${pct}%` }} /></span>
    </span>
  )
}

export default function Parejas() {
  const { parejas, indicadores, retiro, recargar, equipo } = useCartas()
  const [q, setQ] = useState('')
  const [responsable, setResponsable] = useState('')
  const [verRetiradas, setVerRetiradas] = useState(false)
  const [nueva, setNueva] = useState(false)
  const [importar, setImportar] = useState(false)
  const meta = retiro.meta_por_persona || 0
  const responsables = [...new Set(parejas.map(p => responsableDe(p, equipo)).filter(Boolean))].sort()

  const lista = useMemo(() => parejas
    .filter(p => verRetiradas || p.estado === 'activa')
    .filter(p => !responsable || (responsable === '-' ? !responsableDe(p, equipo) : responsableDe(p, equipo) === responsable))
    .filter(p => !q || textoBusqueda(p).includes(norm(q))), [parejas, q, verRetiradas, responsable])

  return (
    <div>
      <Titulo titulo="Parejas" subtitulo={`${parejas.filter(p => p.estado === 'activa').length} parejas activas${meta ? ` · meta: ${meta} cartas por persona (${meta * 2} por pareja)` : ''}`}>
        <button onClick={() => setImportar(true)} className={btn.contorno}><Upload size={16} />Importar</button>
        <button onClick={() => setNueva(true)} className={btn.vino}><Plus size={17} />Nueva pareja</button>
      </Titulo>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="relative min-w-[220px] flex-[2]">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gris" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por código, nombre o apellido" className="campo pl-10" />
        </label>
        {responsables.length > 0 && (
          <select value={responsable} onChange={e => setResponsable(e.target.value)} className="campo flex-1" aria-label="Responsable">
            <option value="">Todos los responsables</option>
            {responsables.map(r => <option key={r} value={r}>{r}</option>)}
            <option value="-">Sin responsable</option>
          </select>
        )}
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={verRetiradas} onChange={e => setVerRetiradas(e.target.checked)} className="h-4 w-4 accent-[#7a2621]" />Ver retiradas</label>
      </div>

      {!lista.length ? <Vacio titulo={parejas.length ? 'Sin resultados' : 'Aún no hay parejas'}>{!parejas.length && 'Importa el Excel de inscripción o agrégalas una por una.'}</Vacio> : (
        <div className="overflow-hidden rounded-[24px] bg-white">
          <ul className="divide-y divide-crema-borde">
            {lista.map(p => {
              const x = indicadores.porPareja[p.id]
              const color = semaforo({ retiro, cartasValidas: x.recibidas, pendientes: x.pendientes, x })
              return (
                <li key={p.id}>
                  <Link to={`/cartas/panel/parejas/${p.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-crema-clara sm:px-5">
                    {p.estado === 'activa' ? <Semaforo color={color} /> : <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />}
                    <span className="w-10 shrink-0 text-xs font-bold text-gris">{p.codigo}</span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate font-semibold ${p.estado !== 'activa' ? 'text-gris line-through' : ''}`}>{nombrePareja(p)}</span>
                      <span className="block truncate text-xs text-gris">{[responsableDe(p, equipo) && `Responsable: ${responsableDe(p, equipo)}`, `${x.recibidas} cartas`, x.contactos && `${x.contactos} contactos`].filter(Boolean).join(' · ')}</span>
                    </span>
                    {meta > 0 ? (
                      <span className="hidden w-64 gap-4 sm:flex">
                        <Avance nombre={p.apodo_a || p.nombre_a} n={x.paraA} meta={meta} />
                        <Avance nombre={p.apodo_b || p.nombre_b} n={x.paraB} meta={meta} />
                      </span>
                    ) : <span className="hidden text-sm text-gris sm:block">{x.recibidas} cartas</span>}
                    <ChevronRight size={18} className="text-gris" />
                  </Link>
                  {meta > 0 && (
                    <div className="flex gap-4 px-4 pb-3 sm:hidden">
                      <Avance nombre={p.apodo_a || p.nombre_a} n={x.paraA} meta={meta} />
                      <Avance nombre={p.apodo_b || p.nombre_b} n={x.paraB} meta={meta} />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
      {meta > 0 && <p className="mt-3 text-xs text-gris">Una carta «para ambos» cuenta para los dos, porque cada uno la recibe.</p>}
      {nueva && <FormPareja retiroId={retiro.id} parejas={parejas} onCerrar={() => setNueva(false)} onGuardado={async () => { setNueva(false); await recargar() }} />}
      {importar && <Importar onCerrar={() => setImportar(false)} onListo={async () => { setImportar(false); await recargar() }} />}
    </div>
  )
}

export function FormPareja({ retiroId, parejas, inicial, onCerrar, onGuardado }) {
  const siguiente = 'P' + String(parejas.length + 1).padStart(2, '0')
  const [f, setF] = useState(inicial || { codigo: siguiente, nombre_a: '', nombre_b: '', estado: 'activa' })
  const [guardando, setGuardando] = useState(false)
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))

  async function guardar(e) {
    e.preventDefault()
    const repetida = parejas.find(p => p.id !== f.id && (norm(p.codigo) === norm(f.codigo) ||
      (norm(nombreCompleto(p, 'A')) === norm(nombreCompleto(f, 'A')) && norm(nombreCompleto(p, 'B')) === norm(nombreCompleto(f, 'B')))))
    if (repetida) { toast.error(`Ya existe: ${repetida.codigo} · ${nombrePareja(repetida)}`); return }
    setGuardando(true)
    try { await guardarPareja({ ...f, retiro_id: retiroId }); toast.success('Pareja guardada'); await onGuardado() }
    catch (err) { toast.error(mensajeError(err, 'No se pudo guardar')) }
    finally { setGuardando(false) }
  }

  const campo = (k, etiqueta, props = {}) => (
    <label className="etiqueta">{etiqueta}<input value={f[k] || ''} onChange={e => set(k, e.target.value)} className="campo mt-1.5" {...props} /></label>
  )
  return (
    <Modal titulo={f.id ? 'Editar pareja' : 'Nueva pareja'} onCerrar={onCerrar} ancho="max-w-2xl"
      pie={<div className="flex justify-end gap-2"><button onClick={onCerrar} className={btn.contorno}>Cancelar</button><button form="form-pareja" disabled={guardando} className={btn.vino}>{guardando ? 'Guardando…' : 'Guardar'}</button></div>}>
      <form id="form-pareja" onSubmit={guardar} className="grid gap-4 sm:grid-cols-2">
        {campo('codigo', 'Código / número *', { required: true })}
        {campo('apellidos', 'Apellidos del matrimonio', { placeholder: 'Carballo Arévalo' })}
        <p className="-mb-2 text-xs font-bold uppercase tracking-[0.12em] text-gris sm:col-span-2">Esposo (A)</p>
        {campo('nombre_a', 'Nombres *', { required: true })}
        {campo('apellidos_a', 'Apellidos')}
        {campo('apodo_a', 'Le gusta que le digan')}
        {campo('contacto_a', 'Celular')}
        <p className="-mb-2 text-xs font-bold uppercase tracking-[0.12em] text-gris sm:col-span-2">Esposa (B)</p>
        {campo('nombre_b', 'Nombres *', { required: true })}
        {campo('apellidos_b', 'Apellidos')}
        {campo('apodo_b', 'Le gusta que le digan')}
        {campo('contacto_b', 'Celular')}
        {campo('responsable', 'Responsable del equipo')}
        {campo('invitados_por', 'Invitados por')}
        {f.id && (
          <label className="etiqueta">Estado
            <select value={f.estado} onChange={e => set('estado', e.target.value)} className="campo mt-1.5">
              <option value="activa">Activa</option><option value="retirada">Se retiró del evento</option>
            </select>
          </label>
        )}
        <label className="etiqueta sm:col-span-2">Notas internas<textarea rows={2} value={f.notas || ''} onChange={e => set('notas', e.target.value)} className="campo mt-1.5" /></label>
        {f.estado === 'retirada' && <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900 sm:col-span-2">Se conserva todo su historial, pero sale de los indicadores y del formulario público.</p>}
      </form>
    </Modal>
  )
}

// Importación: el Excel de inscripción (parejas + contactos de familia) o CSV simples
function Importar({ onCerrar, onListo }) {
  const { retiro, parejas, remitentes } = useCartas()
  const [tipo, setTipo] = useState('inscripcion')
  const [vista, setVista] = useState(null)
  const [guardando, setGuardando] = useState(false)

  async function leer(file) {
    try {
      if (tipo === 'inscripcion') {
        if (!/\.xlsx$/i.test(file.name)) { toast.error('Elige el archivo de Excel (.xlsx)'); return }
        const items = interpretarInscripcion(await leerXLSX(file))
        if (!items) { toast.error('No reconozco las columnas. Debe tener NOMBRES, NOMBRES2 y APELLIDOS MATRIMONIO.'); return }
        const codigos = new Set(parejas.map(p => norm(p.codigo)))
        setVista(items.map((it, i) => {
          let error = ''
          if (codigos.has(norm(it.pareja.codigo))) error = 'Ya existe ese número'
          codigos.add(norm(it.pareja.codigo))
          const avisos = it.contactos.filter(c => !c.telefono).map(c => `${c.nombre}: sin celular válido`)
          return { n: i + 2, fila: it, error, aviso: avisos.join(' · '),
            texto: `${it.pareja.codigo} · ${it.pareja.apodo_a || it.pareja.nombre_a} y ${it.pareja.apodo_b || it.pareja.nombre_b} ${it.pareja.apellidos || ''} · ${it.contactos.length} contactos` }
        }))
        return
      }
      const filas = leerCSV(await file.text())
      if (!filas.length) { toast.error('El archivo está vacío'); return }
      if (tipo === 'parejas') {
        const vistos = new Set(parejas.map(p => norm(p.codigo)))
        setVista(filas.map((f, i) => {
          const fila = { codigo: f.codigo || '', nombre_a: f.nombre_a || '', nombre_b: f.nombre_b || '', apellidos: f.apellidos || null,
            contacto_a: f.contacto_a || null, contacto_b: f.contacto_b || null, notas: f.notas || null }
          let error = ''
          if (!fila.codigo || !fila.nombre_a || !fila.nombre_b) error = 'Faltan código o nombres'
          else if (vistos.has(norm(fila.codigo))) error = 'Código repetido'
          if (!error) vistos.add(norm(fila.codigo))
          return { n: i + 2, fila, error, texto: `${fila.codigo} · ${fila.nombre_a} y ${fila.nombre_b}` }
        }))
      } else {
        const porCodigo = Object.fromEntries(parejas.map(p => [norm(p.codigo), p]))
        const ya = new Set(remitentes.map(r => r.pareja_id + '|' + norm(r.nombre)))
        setVista(filas.map((f, i) => {
          const pareja = porCodigo[norm(f.codigo_pareja || f.pareja || f.codigo)]
          const dest = norm(f.destinatario)
          const destinatario = ['a', 'b'].includes(dest) ? dest.toUpperCase() : 'ambos'
          const fila = pareja && { retiro_id: retiro.id, pareja_id: pareja.id, nombre: f.nombre || '', telefono: f.telefono || null,
            correo: f.correo || f.email || null, relacion: f.relacion || null, destinatario }
          let error = ''
          if (!pareja) error = 'No existe la pareja con ese código'
          else if (!fila.nombre) error = 'Falta el nombre'
          else if (ya.has(pareja.id + '|' + norm(fila.nombre))) error = 'Ya registrado en esa pareja'
          if (!error) ya.add(pareja.id + '|' + norm(fila.nombre))
          return { n: i + 2, fila, error, texto: `${f.codigo_pareja || '?'} · ${f.nombre || '?'} → ${destinatario}` }
        }))
      }
    } catch (err) { toast.error(mensajeError(err, 'No se pudo leer el archivo')) }
  }

  async function confirmar() {
    const validas = vista.filter(v => !v.error).map(v => v.fila)
    if (!validas.length) return
    setGuardando(true)
    try {
      if (tipo === 'inscripcion') {
        const r = await insertarInscripcion(retiro.id, validas)
        toast.success(`${r.parejas} parejas y ${r.contactos} contactos importados`)
      } else if (tipo === 'parejas') { await insertarParejas(validas.map(v => ({ ...v, retiro_id: retiro.id }))); toast.success(`${validas.length} parejas importadas`) }
      else { await insertarRemitentes(validas); toast.success(`${validas.length} remitentes importados`) }
      await onListo()
    } catch (err) { toast.error(mensajeError(err, 'No se pudo importar')) }
    finally { setGuardando(false) }
  }

  const validas = vista?.filter(v => !v.error).length || 0
  return (
    <Modal titulo="Importar" onCerrar={onCerrar} ancho="max-w-2xl"
      pie={vista && <div className="flex items-center justify-between gap-2"><span className="text-sm text-gris">{validas} de {vista.length} filas listas</span><button onClick={confirmar} disabled={!validas || guardando} className={btn.vino}>{guardando ? 'Importando…' : `Importar ${validas}`}</button></div>}>
      <div className="flex flex-wrap gap-2">
        {[['inscripcion', 'Excel de inscripción'], ['parejas', 'CSV de parejas']].map(([k, t]) => (
          <button key={k} onClick={() => { setTipo(k); setVista(null) }} className={`chip ${tipo === k ? 'chip-on' : 'chip-off'}`}>{t}</button>
        ))}
      </div>
      <p className="mt-4 text-sm text-gris">
        {tipo === 'inscripcion'
          ? <>El archivo del retiro tal cual (p. ej. <b>Cartas_Renova_02.xlsx</b>): una fila por matrimonio con nombres, apellidos, «le gusta que le digan», celulares, responsable y los dos contactos de la familia. Los contactos quedan como <b>coordinadores</b>: a ellos se les envía el mensaje y entregan el paquete de cartas.</>
          : <>En Excel: <b>Archivo › Guardar como › CSV UTF-8</b>. La primera fila debe tener los encabezados de la plantilla.{tipo === 'remitentes' && ' Cada remitente se enlaza por el código de su pareja. Destinatario: A, B o ambos.'}</>}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {tipo !== 'inscripcion' && <button onClick={() => descargar(tipo === 'parejas' ? PLANTILLA_PAREJAS : PLANTILLA_REMITENTES, `plantilla-${tipo}.csv`)} className={btn.mini}><Download size={14} />Descargar plantilla</button>}
        <label className={`${btn.mini} cursor-pointer`}>{tipo === 'inscripcion' ? <FileSpreadsheet size={14} /> : <Upload size={14} />}Elegir archivo
          <input type="file" accept={tipo === 'inscripcion' ? '.xlsx' : '.csv,text/csv'} className="hidden" onChange={e => { e.target.files[0] && leer(e.target.files[0]); e.target.value = '' }} />
        </label>
      </div>
      {vista && (
        <ul className="mt-4 max-h-80 divide-y divide-crema-borde overflow-y-auto rounded-2xl border border-crema-borde text-sm">
          {vista.map(v => (
            <li key={v.n} className="px-3 py-2">
              <div className="flex items-center gap-3">
                <span className="w-8 text-xs text-gris">#{v.n}</span>
                <span className="min-w-0 flex-1 truncate">{v.texto}</span>
                {v.error ? <span className="text-xs font-semibold text-rose-600">{v.error}</span> : <span className="text-xs font-semibold text-emerald-700">OK</span>}
              </div>
              {v.aviso && !v.error && <p className="ml-11 text-[11.5px] text-amber-700">{v.aviso}</p>}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
