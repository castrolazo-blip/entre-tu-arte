import { useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, Pencil, Copy, ExternalLink, CalendarHeart } from 'lucide-react'
import { useCartas } from '../CartasContext.jsx'
import { guardarRetiro } from '../cartasService.js'
import { ESTADOS_RETIRO, enlacePortal, fecha, rangoFechas, mensajeError } from '../constantes.js'
import { Etiqueta, Modal, Titulo, Vacio, btn } from '../ui.jsx'

const VACIO = { nombre: '', inicio: '', fin: '', lugar: '', fecha_limite: '', estado: 'preparacion', aceptar_tardias: false,
  max_mb: 10, max_archivos: 5, retencion_dias: 90, semaforo_dias: 5, mensaje_portal: '', responsable_datos: '', contacto_privacidad: '' }

// datetime-local ↔ ISO en hora local
const aLocal = iso => { if (!iso) return ''; const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16) }
const aIso = local => (local ? new Date(local).toISOString() : null)

export async function copiar(texto, aviso = 'Copiado') {
  try { await navigator.clipboard.writeText(texto); toast.success(aviso) }
  catch { window.prompt('Copia este texto:', texto) }
}

export default function Retiros() {
  const { retiros, esAdmin, retiroId, setRetiroId, recargarRetiros } = useCartas()
  const [editando, setEditando] = useState(null)

  return (
    <div>
      <Titulo titulo="Retiros" subtitulo="Cada retiro tiene sus propias parejas, cartas, enlaces y reportes.">
        {esAdmin && <button onClick={() => setEditando({ ...VACIO })} className={btn.vino}><Plus size={17} />Nuevo retiro</button>}
      </Titulo>
      {!retiros.length && <Vacio titulo="Todavía no hay retiros">{esAdmin ? 'Crea el primero con «Nuevo retiro».' : 'Un administrador debe asignarte a un retiro.'}</Vacio>}
      <div className="grid gap-4 md:grid-cols-2">
        {retiros.map(r => (
          <article key={r.id} className={`rounded-[24px] bg-white p-5 ${r.id === retiroId ? 'ring-2 ring-vino' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{r.nombre}</h2>
                <p className="mt-0.5 text-sm text-gris">{[rangoFechas(r.inicio, r.fin), r.lugar].filter(Boolean).join(' · ') || 'Sin fechas'}</p>
              </div>
              <Etiqueta tipo="retiro" estado={r.estado} />
            </div>
            <p className="mt-3 text-sm"><b>Fecha límite:</b> {r.fecha_limite ? fecha(r.fecha_limite, true) : 'sin fecha'}{r.fecha_limite && (r.aceptar_tardias ? ' · acepta tardías con aviso' : ' · luego se bloquea')}</p>
            {r.estado !== 'activo' && <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">El formulario público solo recibe cartas cuando el retiro está «Activo».</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              {r.id !== retiroId && <button onClick={() => setRetiroId(r.id)} className={btn.mini}><CalendarHeart size={14} />Trabajar en este</button>}
              <button onClick={() => copiar(enlacePortal(r), 'Enlace general copiado')} className={btn.mini}><Copy size={14} />Copiar enlace general</button>
              <a href={enlacePortal(r)} target="_blank" rel="noreferrer" className={btn.mini}><ExternalLink size={14} />Ver formulario</a>
              {esAdmin && <button onClick={() => setEditando({ ...VACIO, ...r, fecha_limite: aLocal(r.fecha_limite) })} className={btn.mini}><Pencil size={14} />Editar</button>}
            </div>
          </article>
        ))}
      </div>
      {editando && <FormRetiro inicial={editando} onCerrar={() => setEditando(null)} onGuardado={async r => { await recargarRetiros(); setRetiroId(r.id); setEditando(null) }} />}
    </div>
  )
}

function FormRetiro({ inicial, onCerrar, onGuardado }) {
  const [f, setF] = useState(inicial)
  const [guardando, setGuardando] = useState(false)
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))

  async function guardar(e) {
    e.preventDefault()
    if (f.inicio && f.fin && f.fin < f.inicio) { toast.error('La fecha de fin es anterior al inicio'); return }
    setGuardando(true)
    try {
      const r = await guardarRetiro({ ...f, fecha_limite: aIso(f.fecha_limite), max_mb: Number(f.max_mb), max_archivos: Number(f.max_archivos),
        retencion_dias: Number(f.retencion_dias), semaforo_dias: Number(f.semaforo_dias) })
      toast.success('Retiro guardado')
      await onGuardado(r)
    } catch (err) { toast.error(mensajeError(err, 'No se pudo guardar el retiro')) }
    finally { setGuardando(false) }
  }

  return (
    <Modal titulo={f.id ? 'Editar retiro' : 'Nuevo retiro'} onCerrar={onCerrar} ancho="max-w-2xl"
      pie={<div className="flex justify-end gap-2"><button onClick={onCerrar} className={btn.contorno}>Cancelar</button><button form="form-retiro" disabled={guardando} className={btn.vino}>{guardando ? 'Guardando…' : 'Guardar'}</button></div>}>
      <form id="form-retiro" onSubmit={guardar} className="grid gap-4 sm:grid-cols-2">
        <label className="etiqueta sm:col-span-2">Nombre *
          <input required value={f.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Renova R02 · El Salvador" className="campo mt-1.5" />
        </label>
        <label className="etiqueta">Inicio<input type="date" value={f.inicio || ''} onChange={e => set('inicio', e.target.value)} className="campo mt-1.5" /></label>
        <label className="etiqueta">Fin<input type="date" value={f.fin || ''} onChange={e => set('fin', e.target.value)} className="campo mt-1.5" /></label>
        <label className="etiqueta sm:col-span-2">Lugar (opcional)<input value={f.lugar || ''} onChange={e => set('lugar', e.target.value)} className="campo mt-1.5" /></label>
        <label className="etiqueta">Fecha límite de recepción<input type="datetime-local" value={f.fecha_limite || ''} onChange={e => set('fecha_limite', e.target.value)} className="campo mt-1.5" /></label>
        <label className="etiqueta">Estado
          <select value={f.estado} onChange={e => set('estado', e.target.value)} className="campo mt-1.5">
            {Object.entries(ESTADOS_RETIRO).map(([k, v]) => <option key={k} value={k}>{v.etiqueta}</option>)}
          </select>
        </label>
        <label className="flex items-start gap-3 text-sm sm:col-span-2">
          <input type="checkbox" checked={!!f.aceptar_tardias} onChange={e => set('aceptar_tardias', e.target.checked)} className="mt-0.5 h-5 w-5 accent-[#7a2621]" />
          <span><b>Aceptar cartas después de la fecha límite</b> (llegan marcadas como tardías y el formulario muestra un aviso). Si no, el formulario se bloquea.</span>
        </label>
        <label className="etiqueta">Tamaño máximo por archivo (MB)<input type="number" min="1" max="25" value={f.max_mb} onChange={e => set('max_mb', e.target.value)} className="campo mt-1.5" /></label>
        <label className="etiqueta">Archivos por carta<input type="number" min="1" max="10" value={f.max_archivos} onChange={e => set('max_archivos', e.target.value)} className="campo mt-1.5" /></label>
        <label className="etiqueta">Semáforo: días de alerta antes del plazo<input type="number" min="0" max="60" value={f.semaforo_dias} onChange={e => set('semaforo_dias', e.target.value)} className="campo mt-1.5" /></label>
        <label className="etiqueta">Conservación tras el retiro (días)<input type="number" min="1" max="3650" value={f.retencion_dias} onChange={e => set('retencion_dias', e.target.value)} className="campo mt-1.5" /></label>
        <label className="etiqueta sm:col-span-2">Mensaje de bienvenida en el formulario (opcional)
          <textarea rows={3} value={f.mensaje_portal || ''} onChange={e => set('mensaje_portal', e.target.value)} placeholder="Ej.: Tu carta será un regalo para su matrimonio. Escribe desde el corazón…" className="campo mt-1.5" />
        </label>
        <label className="etiqueta">Responsable de los datos<input value={f.responsable_datos || ''} onChange={e => set('responsable_datos', e.target.value)} placeholder="Equipo Renova · Regnum Christi" className="campo mt-1.5" /></label>
        <label className="etiqueta">Contacto para pedir eliminación<input value={f.contacto_privacidad || ''} onChange={e => set('contacto_privacidad', e.target.value)} placeholder="WhatsApp 7729-0194" className="campo mt-1.5" /></label>
      </form>
    </Modal>
  )
}
