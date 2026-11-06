import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Plus, Upload, Search, ChevronRight, Download } from 'lucide-react'
import { useCartas } from '../CartasContext.jsx'
import { guardarPareja, insertarParejas, insertarRemitentes } from '../cartasService.js'
import { leerCSV, descargar, PLANTILLA_PAREJAS, PLANTILLA_REMITENTES } from '../archivos.js'
import { mensajeError, semaforo } from '../constantes.js'
import { Modal, Semaforo, Titulo, Vacio, btn } from '../ui.jsx'

const norm = s => String(s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export default function Parejas() {
  const { parejas, indicadores, retiro, recargar } = useCartas()
  const [q, setQ] = useState('')
  const [verRetiradas, setVerRetiradas] = useState(false)
  const [nueva, setNueva] = useState(false)
  const [importar, setImportar] = useState(false)

  const lista = useMemo(() => parejas
    .filter(p => verRetiradas || p.estado === 'activa')
    .filter(p => !q || norm(`${p.codigo} ${p.nombre_a} ${p.nombre_b}`).includes(norm(q))), [parejas, q, verRetiradas])

  return (
    <div>
      <Titulo titulo="Parejas" subtitulo={`${parejas.filter(p => p.estado === 'activa').length} parejas activas en este retiro`}>
        <button onClick={() => setImportar(true)} className={btn.contorno}><Upload size={16} />Importar CSV</button>
        <button onClick={() => setNueva(true)} className={btn.vino}><Plus size={17} />Nueva pareja</button>
      </Titulo>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="relative min-w-[220px] flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gris" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por código o nombre" className="campo pl-10" />
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={verRetiradas} onChange={e => setVerRetiradas(e.target.checked)} className="h-4 w-4 accent-[#7a2621]" />Ver retiradas</label>
      </div>

      {!lista.length ? <Vacio titulo={parejas.length ? 'Sin resultados' : 'Aún no hay parejas'}>{!parejas.length && 'Agrega una por una o importa la lista completa desde Excel (CSV).'}</Vacio> : (
        <div className="overflow-hidden rounded-[24px] bg-white">
          <ul className="divide-y divide-crema-borde">
            {lista.map(p => {
              const x = indicadores.porPareja[p.id]
              const color = semaforo({ retiro, cartasValidas: x.recibidas, pendientes: x.pendientes })
              return (
                <li key={p.id}>
                  <Link to={`/cartas/panel/parejas/${p.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-crema-clara sm:px-5">
                    {p.estado === 'activa' ? <Semaforo color={color} /> : <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />}
                    <span className="w-12 shrink-0 text-xs font-bold text-gris">{p.codigo}</span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate font-semibold ${p.estado !== 'activa' ? 'text-gris line-through' : ''}`}>{p.nombre_a} y {p.nombre_b}</span>
                      <span className="block text-xs text-gris sm:hidden">{x.recibidas} cartas · {x.pendientes} pendientes</span>
                    </span>
                    <span className="hidden gap-5 text-center text-xs text-gris sm:flex">
                      <Dato n={x.recibidas} t="recibidas" /><Dato n={x.aprobadas} t="aprobadas" /><Dato n={x.listas} t="listas" />
                      <Dato n={`${x.pendientes}/${x.esperados}`} t="pendientes" alerta={x.pendientes > 0} /><Dato n={x.adicionales} t="adicionales" />
                    </span>
                    <ChevronRight size={18} className="text-gris" />
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      )}
      {nueva && <FormPareja retiroId={retiro.id} parejas={parejas} onCerrar={() => setNueva(false)} onGuardado={async () => { setNueva(false); await recargar() }} />}
      {importar && <Importar onCerrar={() => setImportar(false)} onListo={async () => { setImportar(false); await recargar() }} />}
    </div>
  )
}

const Dato = ({ n, t, alerta }) => <span className="w-[68px]"><b className={`block text-sm tabular-nums ${alerta ? 'text-amber-700' : 'text-tinta'}`}>{n}</b>{t}</span>

export function FormPareja({ retiroId, parejas, inicial, onCerrar, onGuardado }) {
  const siguiente = 'P' + String(parejas.length + 1).padStart(2, '0')
  const [f, setF] = useState(inicial || { codigo: siguiente, nombre_a: '', nombre_b: '', contacto_a: '', contacto_b: '', notas: '', estado: 'activa' })
  const [guardando, setGuardando] = useState(false)
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))

  async function guardar(e) {
    e.preventDefault()
    const repetida = parejas.find(p => p.id !== f.id && (norm(p.codigo) === norm(f.codigo) ||
      (norm(p.nombre_a) === norm(f.nombre_a) && norm(p.nombre_b) === norm(f.nombre_b))))
    if (repetida) { toast.error(`Ya existe: ${repetida.codigo} · ${repetida.nombre_a} y ${repetida.nombre_b}`); return }
    setGuardando(true)
    try { await guardarPareja({ ...f, retiro_id: retiroId }); toast.success('Pareja guardada'); await onGuardado() }
    catch (err) { toast.error(mensajeError(err, 'No se pudo guardar')) }
    finally { setGuardando(false) }
  }

  return (
    <Modal titulo={f.id ? 'Editar pareja' : 'Nueva pareja'} onCerrar={onCerrar}
      pie={<div className="flex justify-end gap-2"><button onClick={onCerrar} className={btn.contorno}>Cancelar</button><button form="form-pareja" disabled={guardando} className={btn.vino}>{guardando ? 'Guardando…' : 'Guardar'}</button></div>}>
      <form id="form-pareja" onSubmit={guardar} className="grid gap-4 sm:grid-cols-2">
        <label className="etiqueta">Código interno *<input required value={f.codigo} onChange={e => set('codigo', e.target.value)} className="campo mt-1.5" /></label>
        {f.id && (
          <label className="etiqueta">Estado
            <select value={f.estado} onChange={e => set('estado', e.target.value)} className="campo mt-1.5">
              <option value="activa">Activa</option><option value="retirada">Se retiró del evento</option>
            </select>
          </label>
        )}
        <div className="hidden sm:block" />
        <label className="etiqueta">Integrante A *<input required value={f.nombre_a} onChange={e => set('nombre_a', e.target.value)} className="campo mt-1.5" /></label>
        <label className="etiqueta">Integrante B *<input required value={f.nombre_b} onChange={e => set('nombre_b', e.target.value)} className="campo mt-1.5" /></label>
        <label className="etiqueta">Contacto A (opcional)<input value={f.contacto_a || ''} onChange={e => set('contacto_a', e.target.value)} className="campo mt-1.5" /></label>
        <label className="etiqueta">Contacto B (opcional)<input value={f.contacto_b || ''} onChange={e => set('contacto_b', e.target.value)} className="campo mt-1.5" /></label>
        <label className="etiqueta sm:col-span-2">Notas internas<textarea rows={2} value={f.notas || ''} onChange={e => set('notas', e.target.value)} className="campo mt-1.5" /></label>
        {f.estado === 'retirada' && <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900 sm:col-span-2">Se conserva todo su historial, pero sale de los indicadores y del formulario público.</p>}
      </form>
    </Modal>
  )
}

// Importación masiva: primero parejas, después remitentes (enlazados por código de pareja)
function Importar({ onCerrar, onListo }) {
  const { retiro, parejas, remitentes } = useCartas()
  const [tipo, setTipo] = useState('parejas')
  const [vista, setVista] = useState(null)
  const [guardando, setGuardando] = useState(false)

  async function leer(file) {
    const filas = leerCSV(await file.text())
    if (!filas.length) { toast.error('El archivo está vacío'); return }
    if (tipo === 'parejas') {
      const vistos = new Set(parejas.map(p => norm(p.codigo)))
      const nombres = new Set(parejas.map(p => norm(p.nombre_a) + '|' + norm(p.nombre_b)))
      const res = filas.map((f, i) => {
        const fila = { codigo: f.codigo || '', nombre_a: f.nombre_a || f.integrante_a || '', nombre_b: f.nombre_b || f.integrante_b || '',
          contacto_a: f.contacto_a || null, contacto_b: f.contacto_b || null, notas: f.notas || null }
        let error = ''
        if (!fila.codigo || !fila.nombre_a || !fila.nombre_b) error = 'Faltan código o nombres'
        else if (vistos.has(norm(fila.codigo))) error = 'Código repetido'
        else if (nombres.has(norm(fila.nombre_a) + '|' + norm(fila.nombre_b))) error = 'Pareja ya registrada'
        if (!error) { vistos.add(norm(fila.codigo)); nombres.add(norm(fila.nombre_a) + '|' + norm(fila.nombre_b)) }
        return { n: i + 2, fila, error, texto: `${fila.codigo} · ${fila.nombre_a} y ${fila.nombre_b}` }
      })
      setVista(res)
    } else {
      const porCodigo = Object.fromEntries(parejas.map(p => [norm(p.codigo), p]))
      const ya = new Set(remitentes.map(r => r.pareja_id + '|' + norm(r.nombre)))
      const res = filas.map((f, i) => {
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
      })
      setVista(res)
    }
  }

  async function confirmar() {
    const validas = vista.filter(v => !v.error).map(v => v.fila)
    if (!validas.length) return
    setGuardando(true)
    try {
      if (tipo === 'parejas') await insertarParejas(validas.map(v => ({ ...v, retiro_id: retiro.id })))
      else await insertarRemitentes(validas)
      toast.success(`${validas.length} registros importados`)
      await onListo()
    } catch (err) { toast.error(mensajeError(err, 'No se pudo importar')) }
    finally { setGuardando(false) }
  }

  const validas = vista?.filter(v => !v.error).length || 0
  return (
    <Modal titulo="Importar desde Excel (CSV)" onCerrar={onCerrar} ancho="max-w-2xl"
      pie={vista && <div className="flex items-center justify-between gap-2"><span className="text-sm text-gris">{validas} de {vista.length} filas listas</span><button onClick={confirmar} disabled={!validas || guardando} className={btn.vino}>{guardando ? 'Importando…' : `Importar ${validas}`}</button></div>}>
      <div className="flex gap-2">
        {[['parejas', '1. Parejas'], ['remitentes', '2. Remitentes esperados']].map(([k, t]) => (
          <button key={k} onClick={() => { setTipo(k); setVista(null) }} className={`chip ${tipo === k ? 'chip-on' : 'chip-off'}`}>{t}</button>
        ))}
      </div>
      <p className="mt-4 text-sm text-gris">
        En Excel: <b>Archivo › Guardar como › CSV UTF-8</b>. La primera fila debe tener los encabezados de la plantilla.
        {tipo === 'remitentes' && ' Importa primero las parejas: cada remitente se enlaza por el código de su pareja. Destinatario: A, B o ambos.'}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={() => descargar(tipo === 'parejas' ? PLANTILLA_PAREJAS : PLANTILLA_REMITENTES, `plantilla-${tipo}.csv`)} className={btn.mini}><Download size={14} />Descargar plantilla</button>
        <label className={`${btn.mini} cursor-pointer`}><Upload size={14} />Elegir archivo CSV
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={e => e.target.files[0] && leer(e.target.files[0])} />
        </label>
      </div>
      {vista && (
        <ul className="mt-4 max-h-80 divide-y divide-crema-borde overflow-y-auto rounded-2xl border border-crema-borde text-sm">
          {vista.map(v => (
            <li key={v.n} className="flex items-center gap-3 px-3 py-2">
              <span className="w-8 text-xs text-gris">#{v.n}</span>
              <span className="min-w-0 flex-1 truncate">{v.texto}</span>
              {v.error ? <span className="text-xs font-semibold text-rose-600">{v.error}</span> : <span className="text-xs font-semibold text-emerald-700">OK</span>}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
