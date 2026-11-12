import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { ClipboardList, Plus, X, Copy, Check, MessageCircle, Trash2, Loader2, Wallet } from 'lucide-react'
import { ui } from '../marca.jsx'
import { encargosDe, crearEncargos, actualizarEncargo, borrarEncargo, asignarEncargo, quitarResponsable, anotarGasto, pagadores, cambiarPaga, mensajeError } from '../servicio.js'
import { calcularReparto, dinero } from '../gastos.js'
import { SUGERIDOS, SUGERIDOS_VARIOS, textoEncargos, encargoCubierto, textoGastos } from '../whatsapp.js'

// Selector de cuántas personas pueden llevar cada cosa ('' = sin límite)
const OPCIONES_CUPOS = [[1, '1 persona'], ...[2, 3, 4, 5, 6, 8, 10].map(n => [n, `Varias: hasta ${n}`]), ['', 'Varias: sin límite']]
function SelectorCupos({ id, valor, minimo = 0, onChange, disabled }) {
  return (
    <select id={id} value={valor == null ? '' : valor} disabled={disabled}
      onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))}
      className="h-9 rounded-full border border-slate-200 bg-slate-50 px-3 text-[13px] font-semibold text-slate-700">
      {OPCIONES_CUPOS.filter(([v]) => v === '' || v >= Math.max(1, minimo)).map(([v, t]) => <option key={t} value={v}>{t}</option>)}
    </select>
  )
}

const sinEmoji = t => t.replace(/^[^\p{L}\p{N}]+/u, '').trim().toLowerCase()

// «Quién lleva qué» dentro del evento: lista con cupos, asignación y status para el grupo
export default function Encargados({ ev, invitados }) {
  const [items, setItems] = useState(null)
  const [paga, setPaga] = useState({})
  const [nuevo, setNuevo] = useState('')
  const [cuposNuevo, setCuposNuevo] = useState(1)
  const [ocupado, setOcupado] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const nombres = Object.fromEntries(invitados.map(i => [i.persona_id, i.nombre]))

  const recargar = useCallback(async () => {
    try { const [l, p] = await Promise.all([encargosDe(ev.id), pagadores(ev.id)]); setItems(l); setPaga(p) } catch (e) { toast.error(mensajeError(e)) }
  }, [ev.id, invitados.length])
  useEffect(() => { recargar() }, [recargar])

  async function hacer(fn) {
    setOcupado(true)
    try { await fn(); await recargar() } catch (e) { toast.error(mensajeError(e)) } finally { setOcupado(false) }
  }
  const existentes = new Set((items || []).map(i => sinEmoji(i.nombre)))
  const sugeridos = SUGERIDOS.filter(x => !existentes.has(sinEmoji(x)))
  const agregar = (nombre, cupos) => hacer(() => crearEncargos(ev.id, [{ nombre, cupos, orden: (items || []).length }]))

  if (!items) return null
  const conNombres = items.map(i => ({ ...i, nombres: i.responsables.map(id => nombres[id] || '') }))
  const cubiertos = conNombres.filter(encargoCubierto).length
  const texto = textoEncargos(ev, conNombres)

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
      <p className="mt-1 text-[13px] text-slate-500">Los invitados ven esta lista en su enlace y se apuntan con «Yo lo llevo». En cada cosa elegís si la lleva 1 persona o varias. También podés asignar vos.</p>

      <ul className="mt-4 space-y-2">
        {items.map(i => {
          const lleno = i.cupos != null && i.responsables.length >= i.cupos
          const cubierto = i.cupos == null ? i.responsables.length > 0 : lleno
          const libres = invitados.filter(x => !i.responsables.includes(x.persona_id))
          return (
            <li key={i.id} className={`rounded-2xl border p-3 ${cubierto ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200'}`}>
              <div className="flex flex-wrap items-center gap-2">
                <p className="min-w-0 flex-1 basis-48 font-bold">{i.nombre}</p>
                <SelectorCupos id={`cupos-${i.id}`} valor={i.cupos} minimo={i.responsables.length} disabled={ocupado}
                  onChange={v => hacer(() => actualizarEncargo(i.id, { cupos: v }))} />
                <button disabled={ocupado} onClick={() => { if (window.confirm(`¿Quitar «${i.nombre}» de la lista?`)) hacer(() => borrarEncargo(i.id)) }} className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label={`Quitar ${i.nombre}`}><Trash2 size={15} /></button>
              </div>
              <input id={`detalle-${i.id}`} defaultValue={i.detalle || ''} maxLength={200} placeholder="Detalle (opcional): 2 bolsas, para 12 personas…"
                onBlur={e => { const v = e.target.value.trim() || null; if (v !== (i.detalle || null)) hacer(() => actualizarEncargo(i.id, { detalle: v })) }}
                className="mt-2 h-9 w-full rounded-xl border border-transparent bg-transparent px-2 text-[13px] text-slate-600 outline-none focus:border-slate-200 focus:bg-white" />
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {i.responsables.map(pid => (
                  <span key={pid} className="inline-flex items-center gap-1 rounded-full bg-teal-700 py-1 pl-3 pr-1.5 text-[13px] font-semibold text-white">
                    {nombres[pid] || '—'}
                    <button disabled={ocupado} onClick={() => {
                      const t = window.prompt(`¿Cuánto gastó ${nombres[pid] || ''} en ${i.nombre}? (vacío = borrar)`, i.gastos[pid] ?? '')
                      if (t === null) return
                      const v = t.trim() === '' ? null : Number(t.replace(/[$,\s]/g, ''))
                      if (v !== null && (!Number.isFinite(v) || v < 0)) { toast.error('Escribí un monto válido, por ejemplo 12.50'); return }
                      hacer(() => anotarGasto(i.id, pid, v))
                    }} className="rounded-full bg-white/20 px-2 text-[12px] hover:bg-white/30" title="Anotar cuánto gastó">{i.gastos[pid] != null ? dinero(Math.round(i.gastos[pid] * 100)) : '+ $'}</button>
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

      <form onSubmit={e => { e.preventDefault(); if (nuevo.trim().length >= 2) { agregar(nuevo.trim(), cuposNuevo); setNuevo(''); setCuposNuevo(1) } }} className="mt-4 flex flex-wrap gap-2">
        <input id="nuevo-encargo" value={nuevo} onChange={e => setNuevo(e.target.value)} maxLength={60} placeholder="Agregar: tortillas, decoración, parlante…" className={`${ui.campo} min-w-0 flex-1 basis-56`} />
        <SelectorCupos id="cupos-nuevo" valor={cuposNuevo} onChange={setCuposNuevo} />
        <button disabled={ocupado || nuevo.trim().length < 2} className={`${ui.btn} shrink-0 px-4`} aria-label="Agregar">{ocupado ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}</button>
      </form>
      <ResumenGastos ev={ev} items={items} invitados={invitados} paga={paga} ocupado={ocupado}
        alternarPaga={(pid, v) => { setPaga(x => ({ ...x, [pid]: v })); hacer(() => cambiarPaga(ev.id, pid, v)) }} />

      {sugeridos.length > 0 && (
        <div className="mt-3">
          <p className="text-[12px] font-semibold text-slate-500">Sugeridos (tocá para agregar):</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {sugeridos.map(x => <button key={x} disabled={ocupado} onClick={() => agregar(x, SUGERIDOS_VARIOS.includes(x) ? null : 1)} title={SUGERIDOS_VARIOS.includes(x) ? 'Pueden llevarlo varios' : 'Lo lleva 1 persona'} className="h-9 rounded-full border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-700 hover:border-teal-700">{x}</button>)}
          </div>
        </div>
      )}
    </section>
  )
}

function ResumenGastos({ ev, items, invitados, paga, ocupado, alternarPaga }) {
  const [copiado, setCopiado] = useState(false)
  const pagado = {}
  const detalle = []
  for (const i of items) for (const pid of i.responsables) {
    const g = i.gastos[pid]
    if (g != null) { pagado[pid] = (pagado[pid] || 0) + Number(g); detalle.push({ nombre: invitados.find(x => x.persona_id === pid)?.nombre || '', cosa: i.nombre, gasto: Number(g) }) }
  }
  if (!detalle.length) return null
  const personas = invitados.map(x => ({ id: x.persona_id, nombre: x.nombre, paga: paga[x.persona_id] !== false, pagado: pagado[x.persona_id] || 0 }))
  const r = calcularReparto(personas)
  const texto = textoGastos(ev, r, detalle)
  async function copiar() {
    try { await navigator.clipboard.writeText(texto); setCopiado(true); setTimeout(() => setCopiado(false), 1500) } catch { toast.error('No se pudo copiar') }
  }
  return (
    <div className="mt-5 rounded-2xl bg-slate-50 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="flex flex-1 items-center gap-2 font-bold"><Wallet size={18} className="text-teal-700" />Gastos: {dinero(r.total)} · {r.pagan} pagan · {dinero(r.cuota)} c/u</p>
        <button onClick={copiar} className={ui.btnMini}>{copiado ? <Check size={14} /> : <Copy size={14} />}Copiar</button>
        <a href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noreferrer" className={ui.btnMini}><MessageCircle size={14} className="text-[#25D366]" />Enviar al grupo</a>
      </div>
      <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {personas.map(p => {
          const sld = r.saldos[p.id] || 0
          return (
            <li key={p.id} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm">
              <input id={`paga-${p.id}`} type="checkbox" checked={p.paga} onChange={e => alternarPaga(p.id, e.target.checked)} className="h-4 w-4 accent-teal-700" title="Entra en el reparto" />
              <label htmlFor={`paga-${p.id}`} className={`flex-1 font-semibold ${p.paga ? '' : 'text-slate-400 line-through'}`}>{p.nombre}</label>
              <span className="text-[12px] text-slate-500">gastó {dinero(Math.round(p.pagado * 100))}</span>
              <span className={`w-20 text-right font-bold tabular-nums ${sld > 0 ? 'text-emerald-700' : sld < 0 ? 'text-rose-700' : 'text-slate-400'}`}>{sld > 0 ? '+' : sld < 0 ? '−' : ''}{dinero(sld)}</span>
            </li>
          )
        })}
      </ul>
      {r.transferencias.length > 0 && (
        <div className="mt-3">
          <p className="text-sm font-bold">Para quedar a mano:</p>
          <ul className="mt-1 space-y-1 text-sm">
            {r.transferencias.map((t, k) => <li key={k}>➡️ <b>{t.de.nombre.split(' ')[0]}</b> le paga <b>{dinero(t.monto)}</b> a <b>{t.a.nombre.split(' ')[0]}</b></li>)}
          </ul>
        </div>
      )}
      <p className="mt-2 text-[12px] text-slate-500">Destildá a quien no entra en el reparto (por ejemplo, un niño). Tocá el monto junto a cada nombre para anotarlo o corregirlo.</p>
    </div>
  )
}
