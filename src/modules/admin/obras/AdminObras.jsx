import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, Search, Star, Pencil, Trash2, ExternalLink, Combine } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../../lib/supabase.js'
import { precio } from '../../../lib/formato.js'
import { normalizarObra, ESTADOS, etiquetaExistencias } from '../../catalogo/obrasService.js'
import EncabezadoAdmin from '../EncabezadoAdmin.jsx'
import EditarObra from './EditarObra.jsx'

const FILTROS = [['', 'Todas'], ['disponible', 'Disponibles'], ['reservada', 'Reservadas'], ['vendida', 'Vendidas'], ['borrador', 'Borradores']]

export default function AdminObras() {
  const [obras, setObras] = useState(null)
  const [filtro, setFiltro] = useState('')
  const [texto, setTexto] = useState('')
  const [editando, setEditando] = useState(null)
  const [seleccion, setSeleccion] = useState(null)   // null = sin modo selección; [] = ids en el orden tocado
  const [uniendo, setUniendo] = useState(false)
  const marcar = id => setSeleccion(l => l.includes(id) ? l.filter(x => x !== id) : [...l, id])

  async function cargar() {
    const { data, error } = await supabase.from('fichas').select('*, artistas(id, nombre, slug)').order('created_at', { ascending: false })
    if (error) { toast.error('No se pudieron cargar las obras'); setObras([]); return }
    setObras((data || []).map(normalizarObra))
  }
  useEffect(() => { cargar() }, [])

  const lista = useMemo(() => (obras || []).filter(o =>
    (!filtro || o.estado === filtro) &&
    (!texto || `${o.titulo} ${o.artista} ${o.tecnica || ''}`.toLowerCase().includes(texto.toLowerCase()))
  ), [obras, filtro, texto])

  async function actualizar(o, cambios, mensaje) {
    const { error } = await supabase.from('fichas').update(cambios).eq('id', o.id)
    if (error) { toast.error('No se pudo guardar: ' + error.message); return }
    toast.success(mensaje || 'Guardado')
    cargar()
  }

  function cambiarEstado(o, estado) {
    const cambios = { estado }
    if (estado === 'reservada') cambios.reservada_hasta = new Date(Date.now() + 48 * 3600e3).toISOString()
    if (estado === 'disponible') cambios.reservada_hasta = null
    if (estado === 'vendida') {
      // En una edición limitada, vender una copia descuenta existencias; la obra queda vendida al llegar a 0
      if (o.edicion_total && (o.existencias || 0) > 1) {
        actualizar(o, { existencias: o.existencias - 1, estado: 'disponible' }, `Vendida una copia: quedan ${o.existencias - 1}`)
        return
      }
      cambios.existencias = 0
    }
    if (estado === 'disponible' && (o.existencias || 0) === 0) cambios.existencias = 1
    actualizar(o, cambios, `Obra marcada como ${ESTADOS[estado].etiqueta.toLowerCase()}`)
  }

  async function eliminar(o) {
    if (!window.confirm(`¿Eliminar "${o.titulo}" del catálogo? Esta acción no se puede deshacer.`)) return
    const { error } = await supabase.from('fichas').delete().eq('id', o.id)
    if (error) { toast.error('No se pudo eliminar'); return }
    toast.success('Obra eliminada')
    cargar()
  }

  // Une varias obras en una (p. ej. un lote que creó una obra por foto). Se conserva la primera
  // que se tocó con sus textos; se le agregan las fotos principales de las demás y se borran.
  async function unir() {
    const elegidas = seleccion.map(id => obras.find(o => o.id === id)).filter(Boolean)
    if (elegidas.length < 2) return
    const [base, ...otras] = elegidas
    if (!window.confirm(`Se unirán ${elegidas.length} obras en "${base.titulo}" (sus textos se conservan). Las otras ${otras.length} se eliminarán y sus fotos pasarán a esta obra. ¿Continuar?`)) return
    setUniendo(true)
    const urls = [base.fotos[0]?.url, ...otras.map(o => o.fotos[0]?.url), ...base.fotos.slice(1).map(f => f.url)].filter(Boolean)
    const unicas = [...new Set(urls)].slice(0, 3)
    const roles = ['principal', 'ambiente', 'detalle']
    const { error } = await supabase.from('fichas').update({ fotos: unicas.map((url, i) => ({ url, rol: roles[i] })), imagen_url: unicas[0] || null }).eq('id', base.id)
    if (error) { setUniendo(false); toast.error('No se pudo unir: ' + error.message); return }
    const { error: e2 } = await supabase.from('fichas').delete().in('id', otras.map(o => o.id))
    setUniendo(false)
    if (e2) toast.error('Se agregaron las fotos, pero no se pudieron borrar las otras obras: ' + e2.message)
    else toast.success(`Listo: ${elegidas.length} obras unidas en "${base.titulo}"`)
    setSeleccion(null)
    cargar()
  }

  async function eliminarSeleccion() {
    if (!window.confirm(`¿Eliminar ${seleccion.length} obras? Esta acción no se puede deshacer.`)) return
    const { error } = await supabase.from('fichas').delete().in('id', seleccion)
    if (error) { toast.error('No se pudieron eliminar'); return }
    toast.success(`${seleccion.length} obras eliminadas`)
    setSeleccion(null)
    cargar()
  }

  return (
    <>
      <EncabezadoAdmin ruta="Catálogo" titulo="Obras">
        <button onClick={() => setSeleccion(s => s ? null : [])} className={`btn-chico ${seleccion ? 'btn-oscuro' : 'btn-contorno'}`}><Combine size={17} />{seleccion ? 'Cancelar selección' : 'Seleccionar / unir'}</button>
        <Link to="/admin/lote" className="btn-contorno btn-chico">Subir varias</Link>
        <Link to="/admin/subir" className="btn-primario btn-chico"><Sparkles size={18} />Subir obra con IA</Link>
      </EncabezadoAdmin>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="sin-scroll flex gap-2 overflow-x-auto">
          {FILTROS.map(([v, t]) => (
            <button key={v} onClick={() => setFiltro(v)} className={`chip ${filtro === v ? 'chip-on' : 'chip-off'}`}>
              {t}{obras && <span className="ml-1.5 opacity-60">{v ? obras.filter(o => o.estado === v).length : obras.length}</span>}
            </button>
          ))}
        </div>
        <label className="flex h-11 items-center gap-2 rounded-full bg-white px-4">
          <Search size={17} className="text-gris" /><span className="sr-only">Buscar</span>
          <input value={texto} onChange={e => setTexto(e.target.value)} placeholder="Buscar obra o artista" className="w-48 bg-transparent text-sm outline-none" />
        </label>
      </div>

      {!obras ? <p className="p-6 text-gris">Cargando…</p> : !lista.length ? <p className="rounded-[28px] bg-white p-10 text-center text-gris">No hay obras con este filtro.</p> : (
        <>
        {/* Celular: tarjetas */}
        <ul className="space-y-3 md:hidden">
          {lista.map(o => (
            <li key={o.id} className={`rounded-[22px] bg-white p-3 ${seleccion?.includes(o.id) ? 'ring-2 ring-tinta' : ''}`}>
              <div className="flex gap-3" onClick={seleccion ? () => marcar(o.id) : undefined}>
                {seleccion && <CasillaSeleccion n={seleccion.indexOf(o.id)} />}
                {o.foto ? <img src={o.foto} alt="" className="h-20 w-20 shrink-0 rounded-2xl bg-crema object-cover" /> : <span className="h-20 w-20 shrink-0 rounded-2xl bg-crema" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{o.titulo}</p>
                  <p className="truncate text-xs text-gris">{[o.artista, o.medidasTexto].filter(Boolean).join(' · ') || 'Sin datos'}</p>
                  <p className={`truncate text-xs font-semibold ${o.tipo_obra ? 'text-tinta' : 'text-red-700'}`}>{o.tipo_obra === 'interpretacion' ? 'Interpretación' : o.tipo_obra === 'original' ? `Original${o.certificado ? ' · con certificado' : ''}` : 'Tipo sin indicar'}</p>
                  <p className="mt-1 text-sm"><span className="font-bold">{precio(o.precio) || 'Sin precio'}</span><span className="text-gris"> · {etiquetaExistencias(o)}</span></p>
                </div>
              </div>
              {!seleccion && <div className="mt-3 flex items-center gap-2">
                <select aria-label={`Estado de ${o.titulo}`} value={o.estado || 'disponible'} onChange={e => cambiarEstado(o, e.target.value)}
                  className={`h-10 flex-1 rounded-full border-0 px-3 text-sm font-bold ${ESTADOS[o.estado || 'disponible'].clase} ring-1 ring-crema-borde`}>
                  {Object.entries(ESTADOS).map(([v, e]) => <option key={v} value={v}>{e.etiqueta}</option>)}
                </select>
                <button onClick={() => actualizar(o, { destacada: !o.destacada }, o.destacada ? 'Quitada del banner' : 'Agregada al banner')} disabled={o.estado === 'vendida'}
                  aria-pressed={!!o.destacada} aria-label={o.destacada ? 'Quitar de destacadas' : 'Destacar'} className="flex h-10 w-10 items-center justify-center rounded-full bg-crema disabled:opacity-30">
                  <Star size={18} className={o.destacada ? 'fill-mostaza text-mostaza' : 'text-gris'} />
                </button>
                <button onClick={() => setEditando(o)} className="flex h-10 items-center gap-1.5 rounded-full bg-tinta px-4 text-sm font-bold text-white"><Pencil size={15} />Editar</button>
                <button onClick={() => eliminar(o)} aria-label="Eliminar" className="flex h-10 w-10 items-center justify-center rounded-full text-red-700"><Trash2 size={17} /></button>
              </div>}
            </li>
          ))}
        </ul>
        {/* Computadora: tabla */}
        <div className="hidden overflow-hidden rounded-[28px] bg-white md:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-[15px]">
              <thead><tr className="text-left text-[13px] text-gris">
                <th className="px-5 py-3.5 font-semibold">Obra</th><th className="px-3 font-semibold">Estado</th><th className="px-3 font-semibold">Existencias</th>
                <th className="px-3 text-right font-semibold">Precio</th><th className="px-3 text-center font-semibold">Destacada</th><th className="px-5 text-right font-semibold">Acciones</th>
              </tr></thead>
              <tbody>
                {lista.map(o => (
                  <tr key={o.id} className={`border-t border-[#efebe4] ${seleccion?.includes(o.id) ? 'bg-mostaza-fondo' : ''}`}>
                    <td className="px-5 py-3">
                      <div className={`flex items-center gap-3.5 ${seleccion ? 'cursor-pointer' : ''}`} onClick={seleccion ? () => marcar(o.id) : undefined}>
                        {seleccion && <CasillaSeleccion n={seleccion.indexOf(o.id)} />}
                        {o.foto ? <img src={o.foto} alt="" className="h-12 w-16 shrink-0 rounded-xl object-cover" /> : <span className="h-12 w-16 shrink-0 rounded-xl bg-crema" />}
                        <div className="min-w-0"><p className="truncate font-semibold">{o.titulo}</p><p className="truncate text-xs text-gris">{[o.artista, o.medidasTexto].filter(Boolean).join(' · ') || 'Sin datos (obra del sitio anterior)'}</p>
                          <p className={`truncate text-xs font-semibold ${o.tipo_obra ? 'text-tinta' : 'text-red-700'}`}>{o.tipo_obra === 'interpretacion' ? 'Interpretación' : o.tipo_obra === 'original' ? `Original${o.certificado ? ' · con certificado' : ''}` : 'Tipo sin indicar'}</p></div>
                      </div>
                    </td>
                    <td className="px-3">
                      <select aria-label={`Estado de ${o.titulo}`} value={o.estado || 'disponible'} onChange={e => cambiarEstado(o, e.target.value)}
                        className={`h-9 rounded-full border-0 px-3 text-xs font-bold ${ESTADOS[o.estado || 'disponible'].clase} ring-1 ring-crema-borde`}>
                        {Object.entries(ESTADOS).map(([v, e]) => <option key={v} value={v}>{e.etiqueta}</option>)}
                      </select>
                    </td>
                    <td className="px-3 text-sm text-gris">{etiquetaExistencias(o)}</td>
                    <td className="px-3 text-right font-semibold">{precio(o.precio) || '—'}</td>
                    <td className="px-3 text-center">
                      <button onClick={() => actualizar(o, { destacada: !o.destacada }, o.destacada ? 'Quitada del banner' : 'Agregada al banner')} disabled={o.estado === 'vendida'}
                        aria-pressed={!!o.destacada} aria-label={o.destacada ? 'Quitar de destacadas' : 'Destacar'} className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-crema disabled:opacity-30">
                        <Star size={19} className={o.destacada ? 'fill-mostaza text-mostaza' : 'text-gris'} />
                      </button>
                    </td>
                    <td className="px-5">
                      <div className="flex justify-end gap-1">
                        <Link to={`/obra/${o.id}`} target="_blank" aria-label="Ver en el sitio" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-crema"><ExternalLink size={17} /></Link>
                        <button onClick={() => setEditando(o)} aria-label="Editar" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-crema"><Pencil size={17} /></button>
                        <button onClick={() => eliminar(o)} aria-label="Eliminar" className="flex h-10 w-10 items-center justify-center rounded-full text-red-700 hover:bg-red-50"><Trash2 size={17} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}
      {seleccion && <div aria-hidden="true" className="h-32" />}
      {seleccion && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-crema-borde bg-white/95 p-3 backdrop-blur lg:left-64">
          <p className="mx-auto max-w-3xl text-center text-xs text-gris">{seleccion.length < 2 ? 'Toca primero la obra que quieres conservar y luego sus fotos repetidas.' : `Se conserva la obra 1 con sus textos; las demás le pasan su foto y se eliminan.`}</p>
          <div className="mx-auto mt-2 flex max-w-3xl gap-2">
            <button onClick={unir} disabled={seleccion.length < 2 || uniendo} className="btn-primario h-12 flex-1"><Combine size={18} />{uniendo ? 'Uniendo…' : `Unir ${seleccion.length || ''} en una obra`}</button>
            <button onClick={eliminarSeleccion} disabled={!seleccion.length} className="h-12 rounded-full px-4 text-sm font-bold text-red-700 ring-1 ring-red-200 disabled:opacity-40">Eliminar</button>
          </div>
        </div>
      )}
      {editando && <EditarObra obra={editando} onCerrar={() => setEditando(null)} onGuardado={() => { setEditando(null); cargar() }} />}
    </>
  )
}

// Casilla con el orden en que se tocó (la 1 es la obra que se conserva al unir)
function CasillaSeleccion({ n }) {
  return (
    <span aria-hidden="true" className={`flex h-8 w-8 shrink-0 items-center justify-center self-center rounded-full text-sm font-bold ${n >= 0 ? 'bg-tinta text-white' : 'bg-crema ring-1 ring-crema-borde'}`}>
      {n >= 0 ? n + 1 : ''}
    </span>
  )
}
