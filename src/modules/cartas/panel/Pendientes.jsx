import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Search, Phone, ChevronDown, StickyNote, UserPlus, Pencil } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext.jsx'
import { useCartas } from '../CartasContext.jsx'
import { listarRecordatorios, registrarGestion } from '../cartasService.js'
import { fecha, nombrePareja, nombreEquipo, mensajeError } from '../constantes.js'
import { Titulo, Vacio } from '../ui.jsx'
import { AccionesRecordatorio, FormRemitente } from './remitentes.jsx'
import { useVentana } from '../borrador.js'
import { InvitacionPareja } from './Retiros.jsx'

const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

// «Gestión de cartas» (avisar a las familias): una sola lista; cada contacto muestra su estado y sus gestiones: filtrado por matrimonio del equipo, agrupado por pareja del retiro,
// y con el historial de gestiones (mensajes, llamadas, notas) de cada contacto.
const PESTANAS = [
  ['sin', 'Sin avisar', r => (r.estado === 'pendiente' || r.estado === 'revision') && !r.ultimo_recordatorio],
  ['avisados', 'Ya avisados', r => (r.estado === 'pendiente' || r.estado === 'revision') && !!r.ultimo_recordatorio],
  ['entregaron', 'Ya entregaron', r => r.estado === 'recibido'],
]

const TIPOS = { whatsapp: 'Mensaje por WhatsApp', correo: 'Correo', copiado: 'Mensaje copiado', llamada: 'Llamada', nota: 'Nota', otro: 'Gestión' }

// Tipo y texto visibles de una gestión (las guardadas como «otro» traen el tipo al inicio del texto)
function describir(g) {
  if (g.canal === 'otro' && /^(Llamada|Nota)\b/.test(g.mensaje || '')) {
    const [, tipo, resto] = g.mensaje.match(/^(Llamada|Nota):?\s*([\s\S]*)$/)
    return { tipo, texto: resto || '' }
  }
  if (g.canal === 'whatsapp') return { tipo: g.mensaje === 'Seguimiento' ? 'Seguimiento por WhatsApp' : 'Bienvenida por WhatsApp', texto: '' }
  return { tipo: TIPOS[g.canal] || 'Gestión', texto: g.canal === 'llamada' || g.canal === 'nota' || g.canal === 'otro' ? g.mensaje || '' : '' }
}

export default function Pendientes() {
  const { retiro, parejas, remitentes, equipo, esAdmin, miEquipo, usuarios, actualizarLocal, indicadores } = useCartas()
  const meta = retiro.meta_por_persona || 0
  const { usuario } = useAuth()
  const [q, setQ] = useState('')
  const [matrimonio, setMatrimonio] = useState(miEquipo?.id || 'todos')
  const [gestiones, setGestiones] = useState([])
  const [abierto, setAbierto] = useState(null)
  // Contactos gestionados en esta visita: siguen visibles en la pestaña actual aunque ya cambien de estado
  const [nuevoContacto, abrirContacto, cerrarContacto] = useVentana('contacto')
  const [editarId, abrirEditar, cerrarEditar] = useVentana('editar-contacto')
  const editando = editarId && remitentes.find(r => r.id === editarId)

  const cargarGestiones = useCallback(() => {
    listarRecordatorios(retiro.id).then(setGestiones).catch(() => {})
  }, [retiro.id])
  useEffect(() => { cargarGestiones() }, [cargarGestiones])

  const porContacto = useMemo(() => {
    const m = {}
    for (const g of gestiones) (m[g.remitente_id] ||= []).push(g)
    return m
  }, [gestiones])

  const activas = parejas.filter(p => p.estado === 'activa')
  const delFiltro = activas.filter(p => matrimonio === 'todos' || (matrimonio === 'sin' ? !p.equipo_id : p.equipo_id === matrimonio))
  const idsFiltro = new Set(delFiltro.map(p => p.id))
  const contactos = remitentes.filter(r => r.coordinador && idsFiltro.has(r.pareja_id))
  const cuantos = Object.fromEntries(PESTANAS.map(([k, , f]) => [k, contactos.filter(f).length]))

  const grupos = delFiltro
    .sort((a, b) => a.codigo.localeCompare(b.codigo, 'es', { numeric: true }))
    .map(p => {
      const suyos = contactos.filter(r => r.pareja_id === p.id)
      const coincidePareja = !q || norm(`${p.codigo} ${nombrePareja(p)}`).includes(norm(q))
      const lista = suyos.filter(r => coincidePareja || norm(`${r.nombre} ${r.relacion}`).includes(norm(q)))
      return { p, lista, total: suyos.length, entregaron: suyos.filter(r => r.estado === 'recibido').length, coincidePareja }
    })
    // En «Sin avisar» también salen las parejas sin contactos, para poder agregarles uno
    .filter(g => g.lista.length || (!g.total && g.coincidePareja))

  async function gestionar(r, canal, mensaje = null) {
    try {
      const fila = await registrarGestion({ retiro_id: retiro.id, remitente_id: r.id, canal, mensaje, usuario_id: usuario.id })
      if (fila) actualizarLocal('remitentes', fila)
      cargarGestiones()
      if (canal === 'nota') toast.success('Nota guardada')
    } catch (err) { toast.error(mensajeError(err, 'No se pudo guardar')) }
  }

  function nota(r) {
    const texto = window.prompt(`Nota sobre ${r.nombre} (ej.: «Dijo que la entrega el viernes»):`)
    if (texto?.trim()) gestionar(r, 'nota', texto.trim())
  }

  return (
    <div>
      <Titulo titulo="Gestión de cartas" subtitulo="Por pareja del retiro. «Enviar» abre WhatsApp (bienvenida o seguimiento), 📞 llama y queda anotado quién hizo cada gestión." />

      {equipo.length > 0 && (
        <select value={matrimonio} onChange={e => setMatrimonio(e.target.value)} className="campo mb-3" aria-label="Matrimonio asignado">
          <option value="todos">Todos los matrimonios · {activas.length} parejas</option>
          {equipo.map(e => <option key={e.id} value={e.id}>{e.id === miEquipo?.id ? 'Mis parejas · ' : ''}{nombreEquipo(e)} · {activas.filter(p => p.equipo_id === e.id).length}</option>)}
          {activas.some(p => !p.equipo_id) && <option value="sin">Sin matrimonio asignado · {activas.filter(p => !p.equipo_id).length}</option>}
        </select>
      )}

      <p className="mb-3 flex flex-wrap gap-x-4 gap-y-1 rounded-2xl bg-white px-4 py-3 text-[13px]">
        <span><b>{cuantos.sin}</b> <span className="text-gris">sin avisar</span></span>
        <span><b>{cuantos.avisados}</b> <span className="text-gris">avisados</span></span>
        <span><b className="text-emerald-700">{cuantos.entregaron}</b> <span className="text-gris">entregaron</span></span>
      </p>

      <label className="relative mb-4 block">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gris" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar pareja o código" className="campo pl-10" />
      </label>

      {!grupos.length ? (
        <Vacio titulo={q ? 'Nada coincide con la búsqueda' : 'Aún no hay parejas'}>
          {!q && !contactos.length && (delFiltro.length ? 'Se cargan al importar el Excel de inscripción.' : 'Este matrimonio aún no tiene parejas asignadas.')}
        </Vacio>
      ) : (
        <ul className="space-y-3">
          {grupos.map(({ p, lista, total, entregaron }) => {
            const resp = equipo.find(e => e.id === p.equipo_id)
            return (
              <li key={p.id} className="overflow-hidden rounded-[22px] bg-white">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-b border-crema-borde bg-vino-claro/40 px-4 py-3">
                  <span className="text-xs font-bold text-gris">{p.codigo}</span>
                  {esAdmin
                    ? <Link to={`/cartas/panel/parejas/${p.id}`} className="font-semibold text-vino">{nombrePareja(p)}</Link>
                    : <span className="font-semibold text-vino">{nombrePareja(p)}</span>}
                  <span className="ml-auto text-xs font-semibold text-gris">{entregaron}/{total} entregaron</span>
                  <span className="w-full text-[11.5px] text-gris">{resp ? `A cargo de ${nombreEquipo(resp)}` : 'Sin matrimonio asignado'}</span>
                  <div className="mt-2 flex w-full flex-wrap items-center gap-2">
                    {(() => { const x = indicadores.porPareja[p.id]; return x && (
                      <span className="text-xs text-tinta">Cartas: <b>{p.apodo_a || p.nombre_a}</b> {x.paraA}{meta ? `/${meta}` : ''} · <b>{p.apodo_b || p.nombre_b}</b> {x.paraB}{meta ? `/${meta}` : ''}</span>
                    ) })()}
                    <span className="ml-auto"><InvitacionPareja retiro={retiro} pareja={p} compacto chico /></span>
                  </div>
                </div>
                <ul className="divide-y divide-crema-borde">
                  {!total && <li className="px-4 py-3 text-xs text-gris">Esta pareja aún no tiene contactos de familia.</li>}
                  {lista.map(r => {
                    const hist = porContacto[r.id] || []
                    const ultima = hist[0]
                    const abiertoAqui = abierto === r.id
                    return (
                      <li key={r.id} className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold">{r.nombre} <span className="font-normal text-gris">· {r.relacion}</span></span>
                            <span className={`block text-[11.5px] ${r.estado === 'recibido' ? 'font-semibold text-emerald-700' : 'text-gris'}`}>
                              {r.estado === 'recibido' ? '✓ Ya entregó cartas' : r.estado === 'exento' ? `No enviará${r.motivo ? ' · ' + r.motivo : ''}` : ultima
                                ? `Última: ${describir(ultima).tipo.toLowerCase()} · ${fecha(ultima.created_at, true)}`
                                : r.ultimo_recordatorio ? `Avisado · ${fecha(r.ultimo_recordatorio, true)}` : 'Aún sin avisar'}
                            </span>
                          </span>
                          {r.telefono && (
                            <a href={`tel:${String(r.telefono).replace(/[^\d+]/g, '')}`} onClick={() => gestionar(r, 'llamada')} aria-label={`Llamar a ${r.nombre}`} title={`Llamar · ${r.telefono}`}
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-crema-borde bg-white text-vino hover:border-vino"><Phone size={16} /></a>
                          )}
                          {r.estado !== 'recibido' && r.estado !== 'exento' && <AccionesRecordatorio remitente={r} pareja={p} compacto simple onRegistrado={cargarGestiones} />}
                        </div>
                        <button onClick={() => setAbierto(abiertoAqui ? null : r.id)} aria-expanded={abiertoAqui}
                          className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-vino">
                          Gestiones ({hist.length}) · Editar<ChevronDown size={14} className={`transition ${abiertoAqui ? 'rotate-180' : ''}`} />
                        </button>
                        {abiertoAqui && (
                          <div className="mt-2 rounded-2xl bg-crema/60 p-3">
                            {!hist.length ? <p className="text-xs text-gris">Todavía no hay gestiones con este contacto.</p> : (
                              <ol className="space-y-2">
                                {hist.map(g => {
                                  const { tipo, texto } = describir(g)
                                  return (
                                    <li key={g.id} className="text-xs">
                                      <span className="font-semibold">{tipo}</span>
                                      <span className="text-gris"> · {fecha(g.created_at, true)} · {usuarios[g.usuario_id]?.nombre || 'Equipo'}</span>
                                      {texto && <span className="mt-0.5 block whitespace-pre-line text-tinta">{texto}</span>}
                                    </li>
                                  )
                                })}
                              </ol>
                            )}
                            <button onClick={() => nota(r)} className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-full border border-crema-borde bg-white px-3 text-xs font-semibold text-vino hover:border-vino">
                              <StickyNote size={14} />Agregar nota
                            </button>
                            <button onClick={() => abrirEditar(r.id)} className="ml-2 mt-3 inline-flex h-9 items-center gap-1.5 rounded-full border border-crema-borde bg-white px-3 text-xs font-semibold text-vino hover:border-vino">
                              <Pencil size={14} />Editar contacto
                            </button>
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
                <button onClick={() => abrirContacto(p.id)} className="flex w-full items-center justify-center gap-1.5 border-t border-crema-borde px-4 py-3 text-sm font-semibold text-vino hover:bg-vino-claro/30">
                  <UserPlus size={16} />Agregar contacto
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {editando && <FormRemitente pareja={parejas.find(p => p.id === editando.pareja_id)} inicial={editando} onCerrar={cerrarEditar} />}
      {nuevoContacto && parejas.find(p => p.id === nuevoContacto) && (
        <FormRemitente pareja={parejas.find(p => p.id === nuevoContacto)} coordinador onCerrar={cerrarContacto} />
      )}
    </div>
  )
}
