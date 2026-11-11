import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, Loader2, Search, UserPlus, Check } from 'lucide-react'
import { ui } from '../marca.jsx'
import { listarPersonas, guardarPersona, guardarEvento, invitadosDe, mensajeError } from '../servicio.js'
import { supabase } from '../../../lib/supabase.js'
import { hoyTexto, sumarDias, fechasEvento, hhmm } from '../fechas.js'

const SEMANA = [[1, 'L'], [2, 'M'], [3, 'M'], [4, 'J'], [5, 'V'], [6, 'S'], [0, 'D']]
const NOMBRES = { 0: 'domingo', 1: 'lunes', 2: 'martes', 3: 'miércoles', 4: 'jueves', 5: 'viernes', 6: 'sábado' }

export default function FormEvento() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [f, setF] = useState(() => ({
    titulo: '', descripcion: '', lugar: '', desde: sumarDias(hoyTexto(), 7), hasta: sumarDias(hoyTexto(), 28),
    dias: [1, 2, 3, 4, 5], hora_inicio: '19:00', hora_fin: '', fecha_limite: '',
  }))
  const [personas, setPersonas] = useState([])
  const [invitados, setInvitados] = useState([])
  const [estado, setEstado] = useState('disponibilidad')
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [buscar, setBuscar] = useState('')
  const [nueva, setNueva] = useState({ nombre: '', telefono: '' })

  useEffect(() => {
    (async () => {
      try {
        setPersonas(await listarPersonas())
        if (id) {
          const { data, error } = await supabase.from('sno_eventos').select('*').eq('id', id).single()
          if (error) throw error
          setF({ titulo: data.titulo, descripcion: data.descripcion || '', lugar: data.lugar || '', desde: data.desde, hasta: data.hasta,
            dias: data.dias, hora_inicio: hhmm(data.hora_inicio), hora_fin: hhmm(data.hora_fin) || '', fecha_limite: data.fecha_limite || '' })
          setEstado(data.estado)
          setInvitados(await invitadosDe(id))
        }
      } catch (e) { toast.error(mensajeError(e)) }
      finally { setCargando(false) }
    })()
  }, [id])

  const cambiar = (k, v) => setF(x => ({ ...x, [k]: v }))
  const posibles = useMemo(() => fechasEvento(f), [f])
  const visibles = personas.filter(p => p.activo || invitados.includes(p.id))
    .filter(p => !buscar || p.nombre.toLowerCase().includes(buscar.toLowerCase()) || (p.telefono || '').includes(buscar))
  const alternar = pid => setInvitados(l => (l.includes(pid) ? l.filter(x => x !== pid) : [...l, pid]))
  const todosVisibles = visibles.length > 0 && visibles.every(p => invitados.includes(p.id))

  async function agregarPersona() {
    if (nueva.nombre.trim().length < 2) { toast.error('Escribí el nombre'); return }
    try {
      const p = await guardarPersona({ nombre: nueva.nombre.trim(), telefono: nueva.telefono.trim() || null })
      setPersonas(l => [...l, p].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      setInvitados(l => [...l, p.id])
      setNueva({ nombre: '', telefono: '' })
    } catch (e) { toast.error(mensajeError(e)) }
  }

  async function onSubmit(e) {
    e.preventDefault()
    if (f.titulo.trim().length < 2) { toast.error('Ponele nombre al evento'); return }
    if (f.hasta < f.desde) { toast.error('La fecha final debe ser después de la inicial'); return }
    if (!f.dias.length) { toast.error('Elegí al menos un día de la semana'); return }
    if (f.hora_fin && f.hora_fin <= f.hora_inicio) { toast.error('La hora final debe ser después de la inicial'); return }
    if (!posibles.length) { toast.error('No hay ninguna fecha posible con ese período y esos días'); return }
    if (!invitados.length) { toast.error('Elegí al menos un invitado'); return }
    if (id && estado !== 'disponibilidad' && !window.confirm('El evento ya pasó a votación. Si cambiás el período o los días, revisá las opciones. ¿Guardar?')) return
    setGuardando(true)
    try {
      const datos = {
        titulo: f.titulo.trim(), descripcion: f.descripcion.trim() || null, lugar: f.lugar.trim() || null,
        desde: f.desde, hasta: f.hasta, dias: [...f.dias].sort(), hora_inicio: f.hora_inicio, hora_fin: f.hora_fin || null,
        fecha_limite: f.fecha_limite || null,
      }
      const ev = await guardarEvento(datos, invitados, id)
      toast.success(id ? 'Evento actualizado' : 'Evento creado. Ahora enviá los enlaces por WhatsApp.')
      navigate(`/organizar/panel/evento/${ev.id}`, { replace: true })
    } catch (err) { toast.error(mensajeError(err, 'No se pudo guardar el evento')) }
    finally { setGuardando(false) }
  }

  if (cargando) return <div className="mt-10 flex justify-center"><Loader2 className="animate-spin text-teal-700" /></div>

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-4">
      <Link to={id ? `/organizar/panel/evento/${id}` : '/organizar/panel'} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500"><ArrowLeft size={16} />Volver</Link>
      <h1 className="text-[28px] font-bold">{id ? 'Editar evento' : 'Nuevo evento'}</h1>

      <section className={ui.tarjeta}>
        <label className={ui.etiqueta}>Nombre del evento
          <input value={f.titulo} onChange={e => cambiar('titulo', e.target.value)} maxLength={120} placeholder="Fiesta navideña del gym" className={`${ui.campo} mt-1.5`} />
        </label>
        <label className={`${ui.etiqueta} mt-4`}>Lugar <span className="font-normal text-slate-400">(opcional)</span>
          <input value={f.lugar} onChange={e => cambiar('lugar', e.target.value)} maxLength={200} placeholder="Por definir" className={`${ui.campo} mt-1.5`} />
        </label>
        <label className={`${ui.etiqueta} mt-4`}>Detalles <span className="font-normal text-slate-400">(opcional)</span>
          <textarea rows={3} value={f.descripcion} onChange={e => cambiar('descripcion', e.target.value)} maxLength={1000} className={`${ui.campo} mt-1.5 h-auto py-3`} />
        </label>
      </section>

      <section className={ui.tarjeta}>
        <h2 className="font-bold">¿Cuándo podría ser?</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className={ui.etiqueta}>Desde<input type="date" value={f.desde} onChange={e => cambiar('desde', e.target.value)} className={`${ui.campo} mt-1.5`} /></label>
          <label className={ui.etiqueta}>Hasta<input type="date" min={f.desde} value={f.hasta} onChange={e => cambiar('hasta', e.target.value)} className={`${ui.campo} mt-1.5`} /></label>
        </div>
        <p className={`${ui.etiqueta} mt-4`}>Días permitidos</p>
        <div className="mt-1.5 flex gap-1.5">
          {SEMANA.map(([d, t]) => {
            const on = f.dias.includes(d)
            return <button type="button" key={d} title={NOMBRES[d]} onClick={() => cambiar('dias', on ? f.dias.filter(x => x !== d) : [...f.dias, d])}
              className={`h-11 flex-1 rounded-xl text-sm font-bold transition ${on ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-500'}`}>{t}</button>
          })}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className={ui.etiqueta}>Hora de inicio<input type="time" required value={f.hora_inicio} onChange={e => cambiar('hora_inicio', e.target.value)} className={`${ui.campo} mt-1.5`} /></label>
          <label className={ui.etiqueta}>Hora final <span className="font-normal text-slate-400">(vacío = en adelante)</span><input type="time" value={f.hora_fin} onChange={e => cambiar('hora_fin', e.target.value)} className={`${ui.campo} mt-1.5`} /></label>
        </div>
        <label className={`${ui.etiqueta} mt-4`}>Fecha límite para responder <span className="font-normal text-slate-400">(opcional)</span>
          <input type="date" value={f.fecha_limite} max={f.hasta} onChange={e => cambiar('fecha_limite', e.target.value)} className={`${ui.campo} mt-1.5`} />
        </label>
        <p className="mt-3 rounded-2xl bg-teal-50 p-3 text-sm font-semibold text-teal-900">{posibles.length} {posibles.length === 1 ? 'fecha posible' : 'fechas posibles'} para elegir.</p>
      </section>

      <section className={ui.tarjeta}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-bold">Invitados <span className="text-slate-400">({invitados.length})</span></h2>
          <button type="button" onClick={() => setInvitados(l => (todosVisibles ? l.filter(x => !visibles.some(p => p.id === x)) : [...new Set([...l, ...visibles.map(p => p.id)])]))} className={ui.btnMini}>
            {todosVisibles ? 'Quitar todos' : 'Seleccionar todos'}
          </button>
        </div>
        {personas.length > 6 && (
          <label className="relative mt-3 block">
            <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Buscar" className={`${ui.campo} pl-11`} />
          </label>
        )}
        <div className="mt-3 max-h-80 space-y-1 overflow-y-auto">
          {visibles.map(p => {
            const on = invitados.includes(p.id)
            return (
              <button type="button" key={p.id} onClick={() => alternar(p.id)} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${on ? 'bg-teal-50' : 'hover:bg-slate-50'}`}>
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 ${on ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300'}`}>{on && <Check size={14} strokeWidth={3} />}</span>
                <span className="flex-1 font-semibold">{p.nombre}</span>
                <span className="text-[13px] text-slate-400">{p.telefono}</span>
              </button>
            )
          })}
          {!personas.length && <p className="py-2 text-sm text-slate-500">Todavía no hay participantes. Agregalos aquí abajo.</p>}
        </div>
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-3">
          <p className="mb-2 flex items-center gap-1.5 text-[13px] font-bold text-slate-600"><UserPlus size={15} />Agregar participante nuevo</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input value={nueva.nombre} onChange={e => setNueva(n => ({ ...n, nombre: e.target.value }))} placeholder="Nombre" className={ui.campo} />
            <input value={nueva.telefono} onChange={e => setNueva(n => ({ ...n, telefono: e.target.value }))} placeholder="Teléfono" inputMode="tel" className={ui.campo} />
            <button type="button" onClick={agregarPersona} className={`${ui.btnSuave} shrink-0`}>Agregar</button>
          </div>
        </div>
      </section>

      <button disabled={guardando} className={`${ui.btn} h-14 w-full text-base`}>{guardando && <Loader2 size={18} className="animate-spin" />}{id ? 'Guardar cambios' : 'Crear evento'}</button>
    </form>
  )
}
