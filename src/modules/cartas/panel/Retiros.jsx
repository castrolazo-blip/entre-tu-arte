import { useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, Pencil, Copy, ExternalLink, CalendarHeart, MessageCircle } from 'lucide-react'
import { useCartas } from '../CartasContext.jsx'
import { useBorrador, useVentana } from '../borrador.js'
import { guardarRetiro } from '../cartasService.js'
import { ESTADOS_RETIRO, PLANTILLA_FAMILIAS, mensajeInvitacion, enlacePortal, fecha, rangoFechas, mensajeError } from '../constantes.js'
import { Etiqueta, Modal, Titulo, Vacio, btn } from '../ui.jsx'

const VACIO = { nombre: '', inicio: '', fin: '', lugar: '', fecha_limite: '', estado: 'preparacion', aceptar_tardias: false,
  max_mb: 10, max_archivos: 5, retencion_dias: 90, semaforo_dias: 5, meta_por_persona: 10, plantilla_mensaje: '', mensaje_portal: '', responsable_datos: '', contacto_privacidad: '' }

// datetime-local ↔ ISO en hora local
const aLocal = iso => { if (!iso) return ''; const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16) }
const aIso = local => (local ? new Date(local).toISOString() : null)

export async function copiar(texto, aviso = 'Copiado') {
  try { await navigator.clipboard.writeText(texto); toast.success(aviso) }
  catch { window.prompt('Copia este texto:', texto) }
}

export default function Retiros() {
  const { retiros, esAdmin, retiroId, setRetiroId, recargarRetiros } = useCartas()
  const [editandoId, abrirRetiro, cerrarRetiro] = useVentana('retiro')
  const r0 = editandoId && editandoId !== 'nuevo' && retiros.find(r => r.id === editandoId)
  const editando = editandoId ? (r0 ? { ...VACIO, ...r0, fecha_limite: aLocal(r0.fecha_limite) } : { ...VACIO }) : null

  return (
    <div>
      <Titulo titulo="Retiros" subtitulo="Cada retiro tiene sus propias parejas, cartas, enlaces y reportes.">
        {esAdmin && <button onClick={() => abrirRetiro('nuevo')} className={btn.vino}><Plus size={17} />Nuevo retiro</button>}
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
              {esAdmin && <button onClick={() => abrirRetiro(r.id)} className={btn.mini}><Pencil size={14} />Editar</button>}
            </div>
          </article>
        ))}
      </div>
      {editando && <FormRetiro inicial={editando} onCerrar={cerrarRetiro} onGuardado={async r => { await recargarRetiros(); setRetiroId(r.id); cerrarRetiro() }} />}
    </div>
  )
}

function FormRetiro({ inicial, onCerrar, onGuardado }) {
  const [f, setF, limpiar] = useBorrador(`retiro-${inicial.id || 'nuevo'}`, inicial)
  const cancelar = () => { limpiar(); onCerrar() }
  const [guardando, setGuardando] = useState(false)
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))

  async function guardar(e) {
    e.preventDefault()
    if (f.inicio && f.fin && f.fin < f.inicio) { toast.error('La fecha de fin es anterior al inicio'); return }
    setGuardando(true)
    try {
      const r = await guardarRetiro({ ...f, fecha_limite: aIso(f.fecha_limite), max_mb: Number(f.max_mb), max_archivos: Number(f.max_archivos),
        retencion_dias: Number(f.retencion_dias), semaforo_dias: Number(f.semaforo_dias), meta_por_persona: Number(f.meta_por_persona) || 0,
        plantilla_mensaje: !f.plantilla_mensaje?.trim() || f.plantilla_mensaje.trim() === PLANTILLA_FAMILIAS.trim() ? null : f.plantilla_mensaje })
      limpiar()
      toast.success('Retiro guardado')
      await onGuardado(r)
    } catch (err) { toast.error(mensajeError(err, 'No se pudo guardar el retiro')) }
    finally { setGuardando(false) }
  }

  return (
    <Modal titulo={f.id ? 'Editar retiro' : 'Nuevo retiro'} onCerrar={cancelar} ancho="max-w-2xl"
      pie={<div className="flex justify-end gap-2"><button onClick={cancelar} className={btn.contorno}>Cancelar</button><button form="form-retiro" disabled={guardando} className={btn.vino}>{guardando ? 'Guardando…' : 'Guardar'}</button></div>}>
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
        <label className="etiqueta">Meta de cartas por persona<input type="number" min="0" max="100" value={f.meta_por_persona} onChange={e => set('meta_por_persona', e.target.value)} className="campo mt-1.5" />
          <span className="mt-1 block text-xs font-normal text-gris">{Number(f.meta_por_persona) ? `${Number(f.meta_por_persona) * 2} por pareja. 0 = sin meta.` : 'Sin meta'}</span></label>
        <div className="hidden sm:block" />
        <label className="etiqueta">Tamaño máximo por archivo (MB)<input type="number" min="1" max="25" value={f.max_mb} onChange={e => set('max_mb', e.target.value)} className="campo mt-1.5" /></label>
        <label className="etiqueta">Archivos por carta<input type="number" min="1" max="10" value={f.max_archivos} onChange={e => set('max_archivos', e.target.value)} className="campo mt-1.5" /></label>
        <label className="etiqueta">Semáforo: días de alerta antes del plazo<input type="number" min="0" max="60" value={f.semaforo_dias} onChange={e => set('semaforo_dias', e.target.value)} className="campo mt-1.5" /></label>
        <label className="etiqueta">Conservación tras el retiro (días)<input type="number" min="1" max="3650" value={f.retencion_dias} onChange={e => set('retencion_dias', e.target.value)} className="campo mt-1.5" /></label>
        <label className="etiqueta sm:col-span-2">Mensaje de bienvenida en el formulario (opcional)
          <textarea rows={3} value={f.mensaje_portal || ''} onChange={e => set('mensaje_portal', e.target.value)} placeholder="Ej.: Tu carta será un regalo para su matrimonio. Escribe desde el corazón…" className="campo mt-1.5" />
        </label>
        <label className="etiqueta sm:col-span-2">Mensaje para las familias (WhatsApp / correo a los contactos)
          <textarea rows={10} value={f.plantilla_mensaje || PLANTILLA_FAMILIAS} onChange={e => set('plantilla_mensaje', e.target.value)} className="campo mt-1.5 font-mono text-[12.5px]" />
          <span className="mt-1 block text-xs font-normal text-gris">Se completan solos: {'{pareja}'} {'{responsable}'} {'{meta}'} {'{fecha_limite}'} {'{enlace}'} {'{nombre}'} {'{apodos}'} {'{lugar}'} {'{horario}'} (el lugar y horario de cada matrimonio responsable). *negrita* y _cursiva_ funcionan en WhatsApp. <button type="button" onClick={() => set('plantilla_mensaje', '')} className="font-semibold text-vino underline">Restaurar texto original</button></span>
        </label>
        <label className="etiqueta">Responsable de los datos<input value={f.responsable_datos || ''} onChange={e => set('responsable_datos', e.target.value)} placeholder="Equipo Renova · Regnum Christi" className="campo mt-1.5" /></label>
        <label className="etiqueta">Contacto para pedir eliminación<input value={f.contacto_privacidad || ''} onChange={e => set('contacto_privacidad', e.target.value)} placeholder="WhatsApp 7729-0194" className="campo mt-1.5" /></label>
      </form>
    </Modal>
  )
}

// Botones para compartir la invitación de una pareja (mensaje + su enlace, solo esa pareja)
export function InvitacionPareja({ retiro, pareja, compacto = true, simple = false, chico = false }) {
  const texto = mensajeInvitacion({ retiro, pareja, enlace: enlacePortal(retiro, { pareja }) })
  const clase = compacto ? btn.mini : btn.contorno
  if (chico) return (
    <a href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noreferrer"
      className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#25D366] px-3 text-xs font-semibold text-white hover:brightness-95">
      <MessageCircle size={14} />Invitar a otros</a>
  )
  if (simple) return (
    <a href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noreferrer"
      className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#25D366] px-3 text-sm font-semibold text-white hover:brightness-95">
      <MessageCircle size={17} />Invitar a otros</a>
  )
  return (
    <>
      <button type="button" onClick={() => copiar(texto, 'Invitación copiada: pégala en WhatsApp')} className={clase}><Copy size={compacto ? 13 : 15} />Copiar invitación</button>
      <a href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noreferrer" className={clase}><MessageCircle size={compacto ? 13 : 15} />Compartir por WhatsApp</a>
    </>
  )
}
