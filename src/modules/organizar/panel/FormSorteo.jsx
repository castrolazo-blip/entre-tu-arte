import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, Loader2, Search, Check } from 'lucide-react'
import { ui } from '../marca.jsx'
import { supabase } from '../../../lib/supabase.js'
import { listarPersonas, guardarSorteo, invitadosDe, listarEventosSimples, mensajeError } from '../servicio.js'

export default function FormSorteo() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [f, setF] = useState({ titulo: 'Amigo secreto', monto: '', fecha_intercambio: '', mensaje: '', evento_id: '' })
  const [personas, setPersonas] = useState([])
  const [eventos, setEventos] = useState([])
  const [elegidos, setElegidos] = useState([])
  const [sorteado, setSorteado] = useState(false)
  const [buscar, setBuscar] = useState('')
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        const [ps, evs] = await Promise.all([listarPersonas(), listarEventosSimples()])
        setPersonas(ps); setEventos(evs)
        if (id) {
          const { data, error } = await supabase.from('sno_sorteos').select('*, sno_sorteo_participantes(persona_id)').eq('id', id).single()
          if (error) throw error
          setF({ titulo: data.titulo, monto: data.monto || '', fecha_intercambio: data.fecha_intercambio || '', mensaje: data.mensaje || '', evento_id: data.evento_id || '' })
          setElegidos(data.sno_sorteo_participantes.map(x => x.persona_id))
          setSorteado(data.estado === 'sorteado')
        }
      } catch (e) { toast.error(mensajeError(e)) }
      finally { setCargando(false) }
    })()
  }, [id])

  const cambiar = (k, v) => setF(x => ({ ...x, [k]: v }))
  async function copiarDeEvento(eventoId) {
    cambiar('evento_id', eventoId)
    if (!eventoId) return
    try {
      const ids = await invitadosDe(eventoId)
      setElegidos(ids)
      const ev = eventos.find(e => e.id === eventoId)
      if (ev && (!f.titulo || f.titulo === 'Amigo secreto')) cambiar('titulo', `Amigo secreto · ${ev.titulo}`)
      toast.success(`${ids.length} participantes copiados del evento`)
    } catch (e) { toast.error(mensajeError(e)) }
  }

  const visibles = personas.filter(p => p.activo || elegidos.includes(p.id))
    .filter(p => !buscar || p.nombre.toLowerCase().includes(buscar.toLowerCase()))
  const todos = visibles.length > 0 && visibles.every(p => elegidos.includes(p.id))
  const alternar = pid => setElegidos(l => (l.includes(pid) ? l.filter(x => x !== pid) : [...l, pid]))

  async function onSubmit(e) {
    e.preventDefault()
    if (f.titulo.trim().length < 2) { toast.error('Ponele nombre al sorteo'); return }
    if (elegidos.length < 3) { toast.error('Elegí al menos 3 participantes'); return }
    if (sorteado && !window.confirm('El sorteo ya se hizo. Si cambiás participantes se anula y hay que volver a sortear. ¿Guardar?')) return
    setGuardando(true)
    try {
      const s = await guardarSorteo({
        titulo: f.titulo.trim(), monto: f.monto.trim() || null, fecha_intercambio: f.fecha_intercambio || null,
        mensaje: f.mensaje.trim() || null, evento_id: f.evento_id || null,
      }, elegidos, id)
      toast.success(id ? 'Sorteo actualizado' : 'Sorteo creado')
      navigate(`/organizar/panel/amigo-secreto/${s.id}`, { replace: true })
    } catch (err) { toast.error(mensajeError(err, 'No se pudo guardar')) }
    finally { setGuardando(false) }
  }

  if (cargando) return <div className="mt-10 flex justify-center"><Loader2 className="animate-spin text-teal-700" /></div>

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-4">
      <Link to={id ? `/organizar/panel/amigo-secreto/${id}` : '/organizar/panel/amigo-secreto'} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500"><ArrowLeft size={16} />Volver</Link>
      <h1 className="text-[28px] font-bold">{id ? 'Editar sorteo' : 'Nuevo amigo secreto'}</h1>

      <section className={ui.tarjeta}>
        <label className={ui.etiqueta}>Nombre
          <input value={f.titulo} onChange={e => cambiar('titulo', e.target.value)} maxLength={120} className={`${ui.campo} mt-1.5`} />
        </label>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className={ui.etiqueta}>Monto sugerido <span className="font-normal text-slate-400">(opcional)</span>
            <input value={f.monto} onChange={e => cambiar('monto', e.target.value)} maxLength={60} placeholder="$15 a $20" className={`${ui.campo} mt-1.5`} />
          </label>
          <label className={ui.etiqueta}>Fecha del intercambio <span className="font-normal text-slate-400">(opcional)</span>
            <input type="date" value={f.fecha_intercambio} onChange={e => cambiar('fecha_intercambio', e.target.value)} className={`${ui.campo} mt-1.5`} />
          </label>
        </div>
        <label className={`${ui.etiqueta} mt-4`}>Mensaje para los participantes <span className="font-normal text-slate-400">(opcional)</span>
          <textarea rows={3} value={f.mensaje} onChange={e => cambiar('mensaje', e.target.value)} maxLength={1000} placeholder="El regalo se entrega en la fiesta. ¡Que sea sorpresa!" className={`${ui.campo} mt-1.5 h-auto py-3`} />
        </label>
      </section>

      <section className={ui.tarjeta}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-bold">Participantes <span className="text-slate-400">({elegidos.length})</span></h2>
          <button type="button" onClick={() => setElegidos(l => (todos ? l.filter(x => !visibles.some(p => p.id === x)) : [...new Set([...l, ...visibles.map(p => p.id)])]))} className={ui.btnMini}>{todos ? 'Quitar todos' : 'Seleccionar todos'}</button>
        </div>
        {eventos.length > 0 && (
          <label className={`${ui.etiqueta} mt-3`}>Copiar los invitados de un evento
            <select value={f.evento_id} onChange={e => copiarDeEvento(e.target.value)} className={`${ui.campo} mt-1.5`}>
              <option value="">— Ninguno —</option>
              {eventos.map(ev => <option key={ev.id} value={ev.id}>{ev.titulo}</option>)}
            </select>
          </label>
        )}
        {personas.length > 6 && (
          <label className="relative mt-3 block">
            <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Buscar" className={`${ui.campo} pl-11`} />
          </label>
        )}
        <div className="mt-3 max-h-96 space-y-1 overflow-y-auto">
          {visibles.map(p => {
            const on = elegidos.includes(p.id)
            return (
              <button type="button" key={p.id} onClick={() => alternar(p.id)} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${on ? 'bg-teal-50' : 'hover:bg-slate-50'}`}>
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 ${on ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300'}`}>{on && <Check size={14} strokeWidth={3} />}</span>
                <span className="flex-1 font-semibold">{p.nombre}</span>
                <span className="text-[13px] text-slate-400">{p.telefono}</span>
              </button>
            )
          })}
          {!personas.length && <p className="py-2 text-sm text-slate-500">Primero agregá participantes en la pestaña Participantes.</p>}
        </div>
      </section>

      <button disabled={guardando} className={`${ui.btn} h-14 w-full text-base`}>{guardando && <Loader2 size={18} className="animate-spin" />}{id ? 'Guardar cambios' : 'Crear sorteo'}</button>
    </form>
  )
}
