import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { ClipboardList, Plus, X, Copy, Check, MessageCircle, Trash2, Loader2 } from 'lucide-react'
import { ui } from '../marca.jsx'
import { encargosDe, crearEncargos, actualizarEncargo, borrarEncargo, asignarEncargo, quitarResponsable, mensajeError } from '../servicio.js'
import { SUGERIDOS, textoEncargos } from '../whatsapp.js'

const sinEmoji = t => t.replace(/^[^\p{L}\p{N}]+/u, '').trim().toLowerCase()

// «Quién lleva qué» dentro del evento: lista con cupos, asignación y status para el grupo
export default function Encargados({ ev, invitados }) {
  const [items, setItems] = useState(null)
  const [nuevo, setNuevo] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const nombres = Object.fromEntries(invitados.map(i => [i.persona_id, i.nombre]))

  const recargar = useCallback(async () => {
    try { setItems(await encargosDe(ev.id)) } catch (e) { toast.error(mensajeError(e)) }
  }, [ev.id, invitados.length])
  useEffect(() => { recargar() }, [recargar])

  async function hacer(fn) {
    setOcupado(true)
    try { await fn(); await recargar() } catch (e) { toast.error(mensajeError(e)) } finally { setOcupado(false) }
  }
  const existentes = new Set((items || []).map(i => sinEmoji(i.nombre)))
  const sugeridos = SUGERIDOS.filter(x => !existentes.has(sinEmoji(x)))
  const agregar = nombre => hacer(() => crearEncargos(ev.id, [{ nombre, orden: (items || []).length }]))

  if (!items) return null
  const cubiertos = items.filter(i => i.responsables.length >= i.cupos).length
  const texto = textoEncargos(ev, items.map(i => ({ ...i, nombres: i.responsables.map(id => nombres[id] || '') })))

  async function copiar() {
    try { await navigator.clipboard.writeText(texto); setCopiado(true); setTimeout(() => setCopiado(false), 1500) } catch { toast.error('No se pudo copiar') }
  }

  return (
    <section className={ui.tarjeta}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="flex flex-1 items-center gap-2 text-lg font-bold"><ClipboardList size={20} className="text-teal-700" />Quién lleva qué
          {items.length > 0 && <span className={`${ui.chip} ${cubiertos === items.length ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{cubiertos}/{items.length} cubiertos</span>}</h2>
        {items.length > 0 && <>
          <button onClick={copiar} className={ui.btnMini}>{copiado ? <Check size={14} /> : <Copy size={14} />}Copiar lista</button>
          <a href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noreferrer" className={ui.btnMini}><MessageCircle size={14} className="text-[#25D366]" />Enviar al grupo</a>
        </>}
      </div>
      <p className="mt-1 text-[13px] text-slate-500">Los invitados ven esta lista en su enlace y se apuntan con «Yo lo llevo». También podés asignar vos.</p>

      <ul className="mt-4 space-y-2">
        {items.map(i => {
          const lleno = i.responsables.length >= i.cupos
          const libres = invitados.filter(x => !i.responsables.includes(x.persona_id))
          return (
            <li key={i.id} className={`rounded-2xl border p-3 ${lleno ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200'}`}>
              <div className="flex flex-wrap items-center gap-2">
                <p className="min-w-0 flex-1 font-bold">{i.nombre}</p>
                <label className="flex items-center gap-1 text-[12px] font-semibold text-slate-500">Cupos
                  <input id={`cupos-${i.id}`} type="number" min={Math.max(1, i.responsables.length)} max={20} defaultValue={i.cupos}
                    onBlur={e => { const v = Math.max(1, Math.min(20, Number(e.target.value) || 1)); if (v !== i.cupos) hacer(() => actualizarEncargo(i.id, { cupos: v })) }}
                    className="h-8 w-14 rounded-lg border border-slate-200 bg-slate-50 px-2 text-center text-sm" />
                </label>
                <button disabled={ocupado} onClick={() => { if (window.confirm(`¿Quitar «${i.nombre}» de la lista?`)) hacer(() => borrarEncargo(i.id)) }} className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label={`Quitar ${i.nombre}`}><Trash2 size={15} /></button>
              </div>
              <input id={`detalle-${i.id}`} defaultValue={i.detalle || ''} maxLength={200} placeholder="Detalle (opcional): 2 bolsas, para 12 personas…"
                onBlur={e => { const v = e.target.value.trim() || null; if (v !== (i.detalle || null)) hacer(() => actualizarEncargo(i.id, { detalle: v })) }}
                className="mt-2 h-9 w-full rounded-xl border border-transparent bg-transparent px-2 text-[13px] text-slate-600 outline-none focus:border-slate-200 focus:bg-white" />
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {i.responsables.map(pid => (
                  <span key={pid} className="inline-flex items-center gap-1 rounded-full bg-teal-700 py-1 pl-3 pr-1.5 text-[13px] font-semibold text-white">
                    {nombres[pid] || '—'}
                    <button disabled={ocupado} onClick={() => hacer(() => quitarResponsable(i.id, pid))} className="grid h-5 w-5 place-items-center rounded-full hover:bg-white/20" aria-label={`Quitar a ${nombres[pid]}`}><X size={12} /></button>
                  </span>
                ))}
                {!lleno && (
                  <select id={`asignar-${i.id}`} value="" disabled={ocupado} onChange={e => e.target.value && hacer(() => asignarEncargo(i.id, e.target.value))}
                    className="h-8 rounded-full border border-dashed border-slate-300 bg-white px-3 text-[13px] font-semibold text-slate-500">
                    <option value="">{i.responsables.length ? '+ Otra persona' : '⏳ Sin encargado · asignar'}</option>
                    {libres.map(x => <option key={x.persona_id} value={x.persona_id}>{x.nombre}</option>)}
                  </select>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      <form onSubmit={e => { e.preventDefault(); if (nuevo.trim().length >= 2) { agregar(nuevo.trim()); setNuevo('') } }} className="mt-4 flex gap-2">
        <input id="nuevo-encargo" value={nuevo} onChange={e => setNuevo(e.target.value)} maxLength={60} placeholder="Agregar: tortillas, decoración, parlante…" className={ui.campo} />
        <button disabled={ocupado || nuevo.trim().length < 2} className={`${ui.btn} shrink-0 px-4`} aria-label="Agregar">{ocupado ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}</button>
      </form>
      {sugeridos.length > 0 && (
        <div className="mt-3">
          <p className="text-[12px] font-semibold text-slate-500">Sugeridos (tocá para agregar):</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {sugeridos.map(x => <button key={x} disabled={ocupado} onClick={() => agregar(x)} className="h-9 rounded-full border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-700 hover:border-teal-700">{x}</button>)}
          </div>
        </div>
      )}
    </section>
  )
}
