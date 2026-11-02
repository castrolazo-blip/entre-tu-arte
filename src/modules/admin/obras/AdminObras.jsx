import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, Search, Star, Pencil, Trash2, ExternalLink } from 'lucide-react'
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

  return (
    <>
      <EncabezadoAdmin ruta="Catálogo" titulo="Obras">
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
            <li key={o.id} className="rounded-[22px] bg-white p-3">
              <div className="flex gap-3">
                {o.foto ? <img src={o.foto} alt="" className="h-20 w-20 shrink-0 rounded-2xl bg-crema object-cover" /> : <span className="h-20 w-20 shrink-0 rounded-2xl bg-crema" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{o.titulo}</p>
                  <p className="truncate text-xs text-gris">{[o.artista, o.medidasTexto].filter(Boolean).join(' · ') || 'Sin datos'}</p>
                  <p className={`truncate text-xs font-semibold ${o.tipo_obra ? 'text-tinta' : 'text-red-700'}`}>{o.tipo_obra === 'interpretacion' ? 'Interpretación' : o.tipo_obra === 'original' ? `Original${o.certificado ? ' · con certificado' : ''}` : 'Tipo sin indicar'}</p>
                  <p className="mt-1 text-sm"><span className="font-bold">{precio(o.precio) || 'Sin precio'}</span><span className="text-gris"> · {etiquetaExistencias(o)}</span></p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
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
              </div>
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
                  <tr key={o.id} className="border-t border-[#efebe4]">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3.5">
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
      {editando && <EditarObra obra={editando} onCerrar={() => setEditando(null)} onGuardado={() => { setEditando(null); cargar() }} />}
    </>
  )
}
