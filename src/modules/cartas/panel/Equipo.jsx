import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, Phone, Mail, Copy, ArrowRight, Search } from 'lucide-react'
import { useCartas } from '../CartasContext.jsx'
import { guardarEquipo, borrarEquipo, asignarParejas } from '../cartasService.js'
import { mensajeError, nombrePareja, nombreEquipo } from '../constantes.js'
import { Modal, Vacio, btn } from '../ui.jsx'
import { copiar } from './Retiros.jsx'

const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

// ── Equipo: matrimonios servidores que recolectan las cartas ──
export function EquipoAdmin() {
  const { retiro, equipo, parejas, recargar } = useCartas()
  const [editando, setEditando] = useState(null)
  const asignadas = id => parejas.filter(p => p.equipo_id === id && p.estado === 'activa').length

  async function quitar(e) {
    const n = asignadas(e.id)
    if (!window.confirm(`¿Quitar al ${nombreEquipo(e)} del equipo?${n ? ` Sus ${n} parejas quedarán sin asignar.` : ''}`)) return
    try { await borrarEquipo(e.id); toast.success('Quitado del equipo'); await recargar() }
    catch (err) { toast.error(mensajeError(err)) }
  }

  return (
    <section className="rounded-[24px] bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Equipo de cartas</h2>
          <p className="mt-1 text-sm text-gris">Matrimonios servidores que recolectan las cartas. Si un cónyuge crea su cuenta en <b>/cartas/entrar</b> con el correo registrado aquí, entra solo y ve sus parejas (sin poder leer cartas).</p>
        </div>
        <button onClick={() => setEditando({})} className={btn.vino}><Plus size={16} />Nuevo matrimonio</button>
      </div>
      {!equipo.length ? <div className="mt-4"><Vacio titulo="Aún no hay matrimonios en el equipo" /></div> : (
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {equipo.map(e => (
            <li key={e.id} className="rounded-[20px] border border-crema-borde p-4">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{nombreEquipo(e)}</p>
                  <p className="text-xs text-gris">{asignadas(e.id)} parejas asignadas</p>
                </div>
                <button onClick={() => setEditando(e)} aria-label={`Editar ${nombreEquipo(e)}`} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-crema"><Pencil size={15} /></button>
                <button onClick={() => quitar(e)} aria-label={`Quitar ${nombreEquipo(e)}`} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-crema"><Trash2 size={15} /></button>
              </div>
              {[['Él', e.esposo_nombre, e.esposo_telefono, e.esposo_correo], ['Ella', e.esposa_nombre, e.esposa_telefono, e.esposa_correo]].map(([rol, n, t, c]) => n && (
                <div key={rol} className="mt-2 text-sm">
                  <span className="font-semibold">{n}</span>
                  <span className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-gris">
                    {t && <a href={`tel:${t}`} className="inline-flex items-center gap-1 hover:text-vino"><Phone size={12} />{t}</a>}
                    {c && <span className="inline-flex items-center gap-1"><Mail size={12} />{c}</span>}
                  </span>
                </div>
              ))}
            </li>
          ))}
        </ul>
      )}
      <button onClick={() => copiar(window.location.origin + import.meta.env.BASE_URL + 'cartas/entrar', 'Enlace de acceso copiado')} className={`${btn.texto} mt-4`}><Copy size={14} />Copiar enlace de acceso para el equipo</button>
      {editando && <FormEquipo inicial={editando} retiroId={retiro.id} equipo={equipo} onCerrar={() => setEditando(null)} onGuardado={async () => { setEditando(null); await recargar() }} />}
    </section>
  )
}

// Paso 1: apellidos del matrimonio (dos). Paso 2: datos de cada cónyuge.
function FormEquipo({ inicial, retiroId, equipo, onCerrar, onGuardado }) {
  const partes = (inicial.apellidos || '').split(' ')
  const [paso, setPaso] = useState(inicial.id ? 2 : 1)
  const [ap1, setAp1] = useState(partes[0] || '')
  const [ap2, setAp2] = useState(partes.slice(1).join(' '))
  const [f, setF] = useState(inicial)
  const [guardando, setGuardando] = useState(false)
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))
  const apellidos = `${ap1.trim()} ${ap2.trim()}`.replace(/\s+/g, ' ').trim()

  function seguir(e) {
    e.preventDefault()
    if (!ap1.trim() || !ap2.trim()) return toast.error('Escribe los dos apellidos')
    const igual = equipo.find(x => x.id !== inicial.id && norm(x.apellidos) === norm(apellidos))
    if (igual && !window.confirm(`Ya existe el ${nombreEquipo(igual)}. ¿Es otro matrimonio con los mismos apellidos?`)) return
    setPaso(2)
  }

  async function guardar(e) {
    e.preventDefault()
    if (!f.esposo_nombre?.trim() && !f.esposa_nombre?.trim()) return toast.error('Escribe al menos el nombre de uno de los cónyuges')
    for (const c of [f.esposo_correo, f.esposa_correo]) if (c && !/^\S+@\S+\.\S+$/.test(c.trim())) return toast.error(`Revisa el correo: ${c}`)
    setGuardando(true)
    try { await guardarEquipo({ ...f, apellidos, retiro_id: retiroId }); toast.success('Matrimonio guardado'); await onGuardado() }
    catch (err) { toast.error(mensajeError(err, 'No se pudo guardar')) }
    finally { setGuardando(false) }
  }

  const conyuge = (pre, titulo) => (
    <fieldset className="grid gap-3 rounded-2xl border border-crema-borde p-4">
      <legend className="px-1 text-xs font-bold uppercase tracking-[0.12em] text-gris">{titulo}</legend>
      <label className="etiqueta">Nombre<input value={f[`${pre}_nombre`] || ''} onChange={e => set(`${pre}_nombre`, e.target.value)} autoComplete="off" className="campo mt-1.5" /></label>
      <label className="etiqueta">Teléfono<input value={f[`${pre}_telefono`] || ''} onChange={e => set(`${pre}_telefono`, e.target.value)} inputMode="tel" placeholder="7000-0000" className="campo mt-1.5" /></label>
      <label className="etiqueta">Correo<input type="email" value={f[`${pre}_correo`] || ''} onChange={e => set(`${pre}_correo`, e.target.value)} autoComplete="off" className="campo mt-1.5" /></label>
    </fieldset>
  )

  return (
    <Modal titulo={paso === 1 ? 'Nuevo matrimonio del equipo' : `Matrimonio ${apellidos}`} onCerrar={onCerrar}
      pie={paso === 1
        ? <div className="flex justify-end gap-2"><button onClick={onCerrar} className={btn.contorno}>Cancelar</button><button form="form-equipo" className={btn.vino}>Siguiente<ArrowRight size={16} /></button></div>
        : <div className="flex justify-between gap-2"><button onClick={() => setPaso(1)} className={btn.contorno}>Cambiar apellidos</button><button form="form-equipo" disabled={guardando} className={btn.vino}>{guardando ? 'Guardando…' : 'Guardar'}</button></div>}>
      {paso === 1 ? (
        <form id="form-equipo" onSubmit={seguir} className="grid gap-4 sm:grid-cols-2">
          <p className="text-sm text-gris sm:col-span-2">Escribe los dos apellidos del matrimonio (como se les conoce). Así se distinguen matrimonios con el mismo apellido.</p>
          <label className="etiqueta">Primer apellido *<input autoFocus value={ap1} onChange={e => setAp1(e.target.value)} placeholder="Castro" className="campo mt-1.5" /></label>
          <label className="etiqueta">Segundo apellido *<input value={ap2} onChange={e => setAp2(e.target.value)} placeholder="Lazo" className="campo mt-1.5" /></label>
          {apellidos.includes(' ') && <p className="text-sm sm:col-span-2">Se registrará como <b>Matrimonio {apellidos}</b></p>}
        </form>
      ) : (
        <form id="form-equipo" onSubmit={guardar} className="grid gap-4 sm:grid-cols-2">
          {conyuge('esposo', 'Él')}
          {conyuge('esposa', 'Ella')}
          <p className="text-xs text-gris sm:col-span-2">El correo sirve para que entren al panel con su propia cuenta y vean solo sus parejas.</p>
        </form>
      )}
    </Modal>
  )
}

// ── Repartición: a cada matrimonio del equipo se le asignan parejas ──
export function Reparticion() {
  const { equipo, parejas, actualizarLocal } = useCartas()
  const [filtro, setFiltro] = useState('sin')
  const [q, setQ] = useState('')
  const [masivo, setMasivo] = useState('')
  const activas = parejas.filter(p => p.estado === 'activa')
  const sinAsignar = activas.filter(p => !p.equipo_id).length

  const lista = useMemo(() => activas
    .filter(p => filtro === 'todas' || (filtro === 'sin' ? !p.equipo_id : p.equipo_id === filtro))
    .filter(p => !q || norm(`${p.codigo} ${nombrePareja(p)}`).includes(norm(q))), [activas, filtro, q])

  async function asignar(ids, equipoId) {
    try {
      const filas = await asignarParejas(ids, equipoId)
      filas.forEach(f => actualizarLocal('parejas', f))
      toast.success(ids.length > 1 ? `${ids.length} parejas asignadas` : equipoId ? 'Asignada' : 'Sin asignar')
    } catch (err) { toast.error(mensajeError(err)) }
  }

  if (!equipo.length) return <section className="rounded-[24px] bg-white p-5"><h2 className="text-lg font-semibold">Repartición de parejas</h2><p className="mt-2 text-sm text-gris">Primero agrega los matrimonios del equipo.</p></section>

  return (
    <section className="rounded-[24px] bg-white p-5">
      <h2 className="text-lg font-semibold">Repartición de parejas</h2>
      <p className="mt-1 text-sm text-gris">Asigna a cada matrimonio del equipo las parejas de cuya recolección de cartas es responsable. {sinAsignar ? <b className="text-amber-700">{sinAsignar} sin asignar.</b> : <b className="text-emerald-700">Todas asignadas.</b>}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {equipo.map(e => {
          const n = activas.filter(p => p.equipo_id === e.id).length
          return <button key={e.id} onClick={() => setFiltro(e.id)} className={`chip ${filtro === e.id ? 'chip-on' : 'chip-off'}`}>{e.apellidos} · {n}</button>
        })}
        <button onClick={() => setFiltro('sin')} className={`chip ${filtro === 'sin' ? 'chip-on' : 'chip-off'}`}>Sin asignar · {sinAsignar}</button>
        <button onClick={() => setFiltro('todas')} className={`chip ${filtro === 'todas' ? 'chip-on' : 'chip-off'}`}>Todas</button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <label className="relative min-w-[200px] flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gris" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar pareja" className="campo pl-10" />
        </label>
        {lista.length > 1 && (
          <span className="flex flex-1 gap-2">
            <select value={masivo} onChange={e => setMasivo(e.target.value)} className="campo flex-1" aria-label="Asignar todas las de la lista a">
              <option value="">Asignar las {lista.length} de la lista a…</option>
              {equipo.map(e => <option key={e.id} value={e.id}>{nombreEquipo(e)}</option>)}
            </select>
            <button disabled={!masivo} onClick={() => { asignar(lista.map(p => p.id), masivo); setMasivo('') }} className={btn.contorno}>Asignar</button>
          </span>
        )}
      </div>

      {!lista.length ? <p className="mt-4 text-sm text-gris">{filtro === 'sin' ? '¡Todas las parejas tienen responsable!' : 'Ninguna pareja en esta vista.'}</p> : (
        <ul className="mt-3 divide-y divide-crema-borde rounded-2xl border border-crema-borde">
          {lista.map(p => (
            <li key={p.id} className="flex flex-wrap items-center gap-2 px-3 py-2.5">
              <span className="w-10 text-xs font-bold text-gris">{p.codigo}</span>
              <span className="min-w-[160px] flex-1 text-sm font-semibold">{nombrePareja(p)}</span>
              <select value={p.equipo_id || ''} onChange={e => asignar([p.id], e.target.value)} aria-label={`Responsable de ${nombrePareja(p)}`}
                className={`h-10 w-full rounded-full border px-3 text-sm sm:w-56 ${p.equipo_id ? 'border-crema-borde bg-white' : 'border-amber-300 bg-amber-50'}`}>
                <option value="">— Sin asignar —</option>
                {equipo.map(e => <option key={e.id} value={e.id}>{nombreEquipo(e)}</option>)}
              </select>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
