import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Search, Download, Users, UserX, Target } from 'lucide-react'
import { useCartas } from '../CartasContext.jsx'
import { actualizarRemitente } from '../cartasService.js'
import { aCSV, descargar, nombreArchivo } from '../archivos.js'
import { fecha, nombreDestinatario, nombrePareja, mensajeError, ESTADOS_REMITENTE, enlacePortal } from '../constantes.js'
import { Etiqueta, Titulo, Vacio, btn } from '../ui.jsx'
import { AccionesRecordatorio } from './remitentes.jsx'
import { Avance } from './Parejas.jsx'

const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

// Seguimiento: contactos de la familia (reciben el mensaje y entregan el paquete),
// remitentes esperados que faltan, y parejas que aún no llegan a la meta de cartas.
export default function Pendientes() {
  const { retiro, parejas, remitentes, indicadores, actualizarLocal } = useCartas()
  const meta = retiro.meta_por_persona || 0
  const [vista, setVista] = useState('contactos')
  const [q, setQ] = useState('')
  const [estado, setEstado] = useState('pendientes')
  const [recordado, setRecordado] = useState('')
  const [responsable, setResponsable] = useState('')
  const porId = useMemo(() => Object.fromEntries(parejas.map(p => [p.id, p])), [parejas])
  const responsables = [...new Set(parejas.map(p => p.responsable).filter(Boolean))].sort()
  const deResponsable = p => !responsable || p.responsable === responsable

  const lista = useMemo(() => remitentes.filter(r => {
    const p = porId[r.pareja_id]
    if (!p || p.estado !== 'activa' || !deResponsable(p)) return false
    if (vista === 'contactos' ? !r.coordinador : r.coordinador) return false
    if (estado === 'pendientes' ? !['pendiente', 'revision'].includes(r.estado) : estado && r.estado !== estado) return false
    if (recordado === 'nunca' && r.ultimo_recordatorio) return false
    if (recordado === 'si' && !r.ultimo_recordatorio) return false
    if (q && !norm(`${r.nombre} ${r.relacion} ${p.codigo} ${nombrePareja(p)}`).includes(norm(q))) return false
    return true
  }).sort((a, b) => porId[a.pareja_id].codigo.localeCompare(porId[b.pareja_id].codigo, 'es', { numeric: true })),
  [remitentes, porId, vista, estado, recordado, q, responsable]) // eslint-disable-line react-hooks/exhaustive-deps

  const bajoMeta = parejas.filter(p => p.estado === 'activa' && deResponsable(p) &&
    (meta ? !indicadores.porPareja[p.id].metaCumplida : indicadores.porPareja[p.id].recibidas === 0))
    .sort((a, b) => indicadores.porPareja[b.id].faltan - indicadores.porPareja[a.id].faltan)

  async function exento(r) {
    const motivo = window.prompt(`¿Por qué ${r.nombre} no enviará cartas?`)
    if (!motivo) return
    try { actualizarLocal('remitentes', await actualizarRemitente(r.id, { estado: 'exento', motivo })); toast.success('Marcado como «no enviará»') }
    catch (err) { toast.error(mensajeError(err)) }
  }

  function exportar() {
    const x = id => indicadores.porPareja[id]
    const csv = aCSV(lista, [
      { titulo: 'Código pareja', valor: r => porId[r.pareja_id].codigo },
      { titulo: 'Pareja', valor: r => nombrePareja(porId[r.pareja_id]) },
      { titulo: 'Responsable', valor: r => porId[r.pareja_id].responsable },
      { titulo: vista === 'contactos' ? 'Contacto' : 'Remitente', valor: 'nombre' }, { titulo: 'Relación', valor: 'relacion' },
      { titulo: 'Teléfono', valor: 'telefono' }, { titulo: 'Correo', valor: 'correo' },
      { titulo: 'Estado', valor: r => ESTADOS_REMITENTE[r.estado].etiqueta },
      { titulo: 'Último mensaje', valor: r => fecha(r.ultimo_recordatorio, true) },
      ...(meta ? [{ titulo: 'Cartas esposo', valor: r => x(r.pareja_id).paraA }, { titulo: 'Cartas esposa', valor: r => x(r.pareja_id).paraB }] : []),
      { titulo: 'Enlace', valor: r => enlacePortal(retiro, { remitente: r }) },
    ])
    descargar(csv, `${vista}-${nombreArchivo(retiro.nombre)}.csv`)
  }

  const total = k => remitentes.filter(r => (k === 'contactos') === !!r.coordinador && ['pendiente', 'revision'].includes(r.estado) && porId[r.pareja_id]?.estado === 'activa').length
  return (
    <div>
      <Titulo titulo="Seguimiento" subtitulo="El mensaje se abre en WhatsApp o en tu correo para que lo revises y lo envíes tú.">
        {vista !== 'meta' && <button onClick={exportar} className={btn.contorno}><Download size={16} />Exportar CSV</button>}
      </Titulo>

      <div className="mb-4 flex flex-wrap gap-2">
        <button onClick={() => setVista('contactos')} className={`chip ${vista === 'contactos' ? 'chip-on' : 'chip-off'}`}><Users size={15} className="mr-1.5" />Contactos sin entregar ({total('contactos')})</button>
        <button onClick={() => setVista('meta')} className={`chip ${vista === 'meta' ? 'chip-on' : 'chip-off'}`}><Target size={15} className="mr-1.5" />{meta ? `Parejas bajo la meta (${bajoMeta.length})` : `Parejas sin cartas (${bajoMeta.length})`}</button>
        <button onClick={() => setVista('remitentes')} className={`chip ${vista === 'remitentes' ? 'chip-on' : 'chip-off'}`}><UserX size={15} className="mr-1.5" />Remitentes esperados ({total('remitentes')})</button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {vista !== 'meta' && (
          <label className="relative min-w-[200px] flex-[2]">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gris" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar persona o pareja" className="campo pl-10" />
          </label>
        )}
        {responsables.length > 0 && (
          <select value={responsable} onChange={e => setResponsable(e.target.value)} className="campo flex-1" aria-label="Responsable">
            <option value="">Todos los responsables</option>{responsables.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        )}
        {vista !== 'meta' && (
          <>
            <select value={estado} onChange={e => setEstado(e.target.value)} className="campo flex-1" aria-label="Estado">
              <option value="pendientes">Pendientes y por revisar</option>
              {Object.entries(ESTADOS_REMITENTE).map(([k, v]) => <option key={k} value={k}>{v.etiqueta}</option>)}
              <option value="">Todos</option>
            </select>
            <select value={recordado} onChange={e => setRecordado(e.target.value)} className="campo flex-1" aria-label="Mensaje">
              <option value="">Con o sin mensaje</option><option value="nunca">Aún sin mensaje</option><option value="si">Ya se les escribió</option>
            </select>
          </>
        )}
      </div>

      {vista === 'meta' ? (
        !bajoMeta.length ? <Vacio titulo={meta ? '¡Todas las parejas llegaron a la meta!' : 'Todas las parejas tienen al menos una carta'} /> : (
          <ul className="divide-y divide-crema-borde overflow-hidden rounded-[22px] bg-white">
            {bajoMeta.map(p => {
              const x = indicadores.porPareja[p.id]
              return (
                <li key={p.id}><Link to={`/cartas/panel/parejas/${p.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3.5 hover:bg-crema-clara">
                  <span className="w-10 text-xs font-bold text-gris">{p.codigo}</span>
                  <span className="min-w-[180px] flex-1"><span className="block font-semibold">{nombrePareja(p)}</span>
                    <span className="text-xs text-gris">{[p.responsable, meta ? `faltan ${x.faltan}` : 'sin cartas', `${x.contactos - x.contactosPendientes}/${x.contactos} contactos entregaron`].filter(Boolean).join(' · ')}</span></span>
                  {meta > 0 && <span className="flex w-full gap-4 sm:w-64"><Avance nombre={p.apodo_a || p.nombre_a} n={x.paraA} meta={meta} /><Avance nombre={p.apodo_b || p.nombre_b} n={x.paraB} meta={meta} /></span>}
                </Link></li>
              )
            })}
          </ul>
        )
      ) : !lista.length ? <Vacio titulo="Nadie con ese filtro">{vista === 'contactos' && !remitentes.some(r => r.coordinador) && 'Importa el Excel de inscripción para cargar los contactos de cada familia.'}</Vacio> : (
        <ul className="space-y-2.5">
          {lista.map(r => {
            const p = porId[r.pareja_id], x = indicadores.porPareja[p.id]
            return (
              <li key={r.id} className="rounded-[20px] bg-white p-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-semibold">{r.nombre}</span>
                  <Etiqueta tipo="remitente" estado={r.estado} />
                  <span className="text-sm text-gris">{r.relacion}{!r.coordinador && ` · para ${nombreDestinatario(p, r.destinatario)}`}</span>
                  <Link to={`/cartas/panel/parejas/${p.id}`} className="ml-auto text-xs font-bold text-vino hover:underline">{p.codigo} · {nombrePareja(p)}</Link>
                </div>
                <p className="mt-1 text-xs text-gris">
                  {[r.telefono, r.correo].filter(Boolean).join(' · ') || 'Sin celular válido'}
                  {' · '}{r.ultimo_recordatorio ? `último mensaje ${fecha(r.ultimo_recordatorio, true)}` : 'aún sin mensaje'}
                  {r.coordinador && meta > 0 && ` · cartas: ${p.apodo_a || p.nombre_a} ${x.paraA}/${meta}, ${p.apodo_b || p.nombre_b} ${x.paraB}/${meta}`}
                </p>
                {['pendiente', 'revision'].includes(r.estado) && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <AccionesRecordatorio remitente={r} pareja={p} compacto />
                    <button onClick={() => exento(r)} className={btn.mini}>No enviará</button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
