import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { UserPlus, Search, MessageCircle, Copy, Check, RefreshCw, Pencil, Trash2, Loader2, X, EyeOff, Eye } from 'lucide-react'
import { ui } from '../marca.jsx'
import { listarPersonas, guardarPersona, borrarPersona, nuevoEnlace, mensajeError } from '../servicio.js'
import { enlacePersonal, urlWhatsApp, msgEnlaceGeneral } from '../whatsapp.js'

// Agenda general de participantes: nombre y teléfono, una sola vez. Cada uno con su enlace privado.
export default function Personas() {
  const [personas, setPersonas] = useState(null)
  const [nueva, setNueva] = useState({ nombre: '', telefono: '' })
  const [buscar, setBuscar] = useState('')
  const [editando, setEditando] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [copiado, setCopiado] = useState(null)

  useEffect(() => { listarPersonas().then(setPersonas).catch(e => toast.error(mensajeError(e))) }, [])

  const actualizar = p => setPersonas(l => l.map(x => (x.id === p.id ? p : x)))

  async function agregar(e) {
    e.preventDefault()
    if (nueva.nombre.trim().length < 2) { toast.error('Escribí el nombre'); return }
    setGuardando(true)
    try {
      const p = await guardarPersona({ nombre: nueva.nombre.trim(), telefono: nueva.telefono.trim() || null })
      setPersonas(l => [...l, p].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      setNueva({ nombre: '', telefono: '' })
      toast.success(`${p.nombre.split(' ')[0]} agregado`)
    } catch (err) { toast.error(mensajeError(err)) }
    finally { setGuardando(false) }
  }

  async function guardarEdicion() {
    try {
      actualizar(await guardarPersona({ nombre: editando.nombre.trim(), telefono: editando.telefono?.trim() || null }, editando.id))
      setEditando(null)
    } catch (err) { toast.error(mensajeError(err)) }
  }

  async function revocar(p) {
    if (!window.confirm(`¿Generar un enlace nuevo para ${p.nombre}? El enlace anterior deja de funcionar de inmediato (sus fechas y votos se conservan).`)) return
    try { const token = await nuevoEnlace(p.id); actualizar({ ...p, token }); toast.success('Enlace nuevo listo. Envíaselo por WhatsApp.') }
    catch (err) { toast.error(mensajeError(err)) }
  }

  async function borrar(p) {
    if (!window.confirm(`¿Eliminar a ${p.nombre}? Se borra de todos los eventos, con sus fechas y votos.`)) return
    try { await borrarPersona(p.id); setPersonas(l => l.filter(x => x.id !== p.id)) }
    catch (err) { toast.error(mensajeError(err)) }
  }

  async function copiar(texto, clave) {
    try { await navigator.clipboard.writeText(texto); setCopiado(clave); setTimeout(() => setCopiado(null), 1500) }
    catch { toast.error('No se pudo copiar') }
  }

  const lista = (personas || []).filter(p => !buscar || p.nombre.toLowerCase().includes(buscar.toLowerCase()) || (p.telefono || '').includes(buscar))

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-[28px] font-bold">Participantes</h1>
      <p className="text-slate-500">Se registran una sola vez. Nadie necesita cuenta: cada persona entra con su enlace privado.</p>

      <form onSubmit={agregar} className={`${ui.tarjeta} mt-5 flex flex-col gap-2 sm:flex-row`}>
        <input value={nueva.nombre} onChange={e => setNueva(n => ({ ...n, nombre: e.target.value }))} placeholder="Nombre" maxLength={80} className={ui.campo} />
        <input value={nueva.telefono} onChange={e => setNueva(n => ({ ...n, telefono: e.target.value }))} placeholder="Teléfono (WhatsApp)" inputMode="tel" maxLength={30} className={ui.campo} />
        <button disabled={guardando} className={`${ui.btn} shrink-0`}>{guardando ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}Agregar</button>
      </form>

      {personas && personas.length > 6 && (
        <label className="relative mt-4 block">
          <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Buscar por nombre o teléfono" className={`${ui.campo} bg-white pl-11`} />
        </label>
      )}

      {!personas && <div className="mt-10 flex justify-center"><Loader2 className="animate-spin text-teal-700" /></div>}
      {personas && !personas.length && <p className={`${ui.tarjeta} mt-4 text-center text-slate-500`}>Agregá a tu primer participante arriba.</p>}

      <ul className="mt-4 space-y-2">
        {lista.map(p => {
          const url = enlacePersonal(p.token)
          const enEdicion = editando?.id === p.id
          return (
            <li key={p.id} className={`${ui.tarjeta} p-4 ${p.activo ? '' : 'opacity-60'}`}>
              {enEdicion ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input value={editando.nombre} onChange={e => setEditando(x => ({ ...x, nombre: e.target.value }))} className={ui.campo} />
                  <input value={editando.telefono || ''} onChange={e => setEditando(x => ({ ...x, telefono: e.target.value }))} inputMode="tel" className={ui.campo} />
                  <div className="flex gap-2">
                    <button onClick={guardarEdicion} className={ui.btn}><Check size={18} /></button>
                    <button onClick={() => setEditando(null)} className={ui.btnSuave}><X size={18} /></button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="min-w-0 flex-1 basis-48">
                    <p className="font-bold">{p.nombre}{!p.activo && <span className="ml-2 text-[12px] font-semibold text-slate-400">desactivado</span>}</p>
                    <p className="text-[13px] text-slate-500">{p.telefono || 'Sin teléfono'}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {p.telefono
                      ? <a href={urlWhatsApp(p.telefono, msgEnlaceGeneral(p.nombre, url))} target="_blank" rel="noreferrer" className={ui.btnMini}><MessageCircle size={14} className="text-[#25D366]" />Enviar enlace</a>
                      : null}
                    <button onClick={() => copiar(url, p.id)} className={ui.btnMini} title="Copiar enlace">{copiado === p.id ? <Check size={14} /> : <Copy size={14} />}Enlace</button>
                    <button onClick={() => setEditando({ ...p })} className={ui.btnMini} title="Editar"><Pencil size={14} /></button>
                    <button onClick={() => revocar(p)} className={ui.btnMini} title="Generar enlace nuevo (revoca el anterior)"><RefreshCw size={14} /></button>
                    <button onClick={async () => { try { actualizar(await guardarPersona({ activo: !p.activo }, p.id)) } catch (e) { toast.error(mensajeError(e)) } }} className={ui.btnMini} title={p.activo ? 'Desactivar (su enlace deja de funcionar)' : 'Activar'}>
                      {p.activo ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button onClick={() => borrar(p)} className={`${ui.btnMini} text-rose-700`} title="Eliminar"><Trash2 size={14} /></button>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
