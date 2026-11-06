import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Search, Download, UserX, HeartCrack } from 'lucide-react'
import { useCartas } from '../CartasContext.jsx'
import { actualizarRemitente } from '../cartasService.js'
import { aCSV, descargar, nombreArchivo } from '../archivos.js'
import { fecha, nombreDestinatario, nombrePareja, mensajeError, ESTADOS_REMITENTE, enlacePortal } from '../constantes.js'
import { Etiqueta, Titulo, Vacio, btn } from '../ui.jsx'
import { AccionesRecordatorio } from './remitentes.jsx'

const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

// Dos listas distintas: remitentes esperados que faltan, y parejas que aún no tienen ninguna carta
export default function Pendientes() {
  const { retiro, parejas, remitentes, indicadores, actualizarLocal } = useCartas()
  const [vista, setVista] = useState('remitentes')
  const [q, setQ] = useState('')
  const [estado, setEstado] = useState('pendientes')
  const [recordado, setRecordado] = useState('')
  const porId = useMemo(() => Object.fromEntries(parejas.map(p => [p.id, p])), [parejas])

  const lista = useMemo(() => remitentes.filter(r => {
    const p = porId[r.pareja_id]
    if (!p || p.estado !== 'activa') return false
    if (estado === 'pendientes' ? !['pendiente', 'revision'].includes(r.estado) : estado && r.estado !== estado) return false
    if (recordado === 'nunca' && r.ultimo_recordatorio) return false
    if (recordado === 'si' && !r.ultimo_recordatorio) return false
    if (q && !norm(`${r.nombre} ${r.relacion} ${p.codigo} ${p.nombre_a} ${p.nombre_b}`).includes(norm(q))) return false
    return true
  }).sort((a, b) => (porId[a.pareja_id].codigo).localeCompare(porId[b.pareja_id].codigo)), [remitentes, porId, estado, recordado, q])

  const sinCartas = parejas.filter(p => p.estado === 'activa' && indicadores.porPareja[p.id].recibidas === 0)

  async function exento(r) {
    const motivo = window.prompt(`¿Por qué ${r.nombre} no enviará carta?`)
    if (!motivo) return
    try { actualizarLocal('remitentes', await actualizarRemitente(r.id, { estado: 'exento', motivo })); toast.success('Marcado como «no enviará»') }
    catch (err) { toast.error(mensajeError(err)) }
  }

  function exportar() {
    const csv = aCSV(lista, [
      { titulo: 'Código pareja', valor: r => porId[r.pareja_id].codigo },
      { titulo: 'Pareja', valor: r => nombrePareja(porId[r.pareja_id]) },
      { titulo: 'Remitente', valor: 'nombre' }, { titulo: 'Relación', valor: 'relacion' },
      { titulo: 'Para', valor: r => nombreDestinatario(porId[r.pareja_id], r.destinatario) },
      { titulo: 'Teléfono', valor: 'telefono' }, { titulo: 'Correo', valor: 'correo' },
      { titulo: 'Estado', valor: r => ESTADOS_REMITENTE[r.estado].etiqueta },
      { titulo: 'Último recordatorio', valor: r => fecha(r.ultimo_recordatorio, true) },
      { titulo: 'Enlace personal', valor: r => enlacePortal(retiro, { remitente: r }) },
    ])
    descargar(csv, `pendientes-${nombreArchivo(retiro.nombre)}.csv`)
  }

  return (
    <div>
      <Titulo titulo="Pendientes y recordatorios" subtitulo="El mensaje se abre en WhatsApp o en tu correo para que lo revises y lo envíes tú.">
        <button onClick={exportar} className={btn.contorno}><Download size={16} />Exportar CSV</button>
      </Titulo>

      <div className="mb-4 flex flex-wrap gap-2">
        <button onClick={() => setVista('remitentes')} className={`chip ${vista === 'remitentes' ? 'chip-on' : 'chip-off'}`}><UserX size={15} className="mr-1.5" />Remitentes pendientes ({indicadores.totales.pendientes})</button>
        <button onClick={() => setVista('parejas')} className={`chip ${vista === 'parejas' ? 'chip-on' : 'chip-off'}`}><HeartCrack size={15} className="mr-1.5" />Parejas sin cartas ({sinCartas.length})</button>
      </div>

      {vista === 'parejas' ? (
        !sinCartas.length ? <Vacio titulo="Todas las parejas tienen al menos una carta" /> : (
          <ul className="divide-y divide-crema-borde overflow-hidden rounded-[22px] bg-white">
            {sinCartas.map(p => (
              <li key={p.id}><Link to={`/cartas/panel/parejas/${p.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-crema-clara">
                <span className="w-12 text-xs font-bold text-gris">{p.codigo}</span>
                <span className="flex-1 font-semibold">{p.nombre_a} y {p.nombre_b}</span>
                <span className="text-sm text-gris">{indicadores.porPareja[p.id].esperados} remitentes esperados</span>
              </Link></li>
            ))}
          </ul>
        )
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            <label className="relative min-w-[220px] flex-[2]">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gris" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar remitente o pareja" className="campo pl-10" />
            </label>
            <select value={estado} onChange={e => setEstado(e.target.value)} className="campo flex-1" aria-label="Estado">
              <option value="pendientes">Pendientes y por revisar</option>
              {Object.entries(ESTADOS_REMITENTE).map(([k, v]) => <option key={k} value={k}>{v.etiqueta}</option>)}
              <option value="">Todos</option>
            </select>
            <select value={recordado} onChange={e => setRecordado(e.target.value)} className="campo flex-1" aria-label="Recordatorio">
              <option value="">Con o sin recordatorio</option><option value="nunca">Nunca recordados</option><option value="si">Ya recordados</option>
            </select>
          </div>
          {!lista.length ? <Vacio titulo={remitentes.length ? 'No hay remitentes con ese filtro' : 'Aún no hay remitentes esperados'}>{!remitentes.length && 'Agrégalos desde la ficha de cada pareja o con «Importar CSV».'}</Vacio> : (
            <ul className="space-y-2.5">
              {lista.map(r => {
                const p = porId[r.pareja_id]
                return (
                  <li key={r.id} className="rounded-[20px] bg-white p-4">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-semibold">{r.nombre}</span>
                      <Etiqueta tipo="remitente" estado={r.estado} />
                      <span className="text-sm text-gris">{r.relacion && `${r.relacion} · `}para {nombreDestinatario(p, r.destinatario)}</span>
                      <Link to={`/cartas/panel/parejas/${p.id}`} className="ml-auto text-xs font-bold text-vino hover:underline">{p.codigo} · {nombrePareja(p)}</Link>
                    </div>
                    <p className="mt-1 text-xs text-gris">
                      {[r.telefono, r.correo].filter(Boolean).join(' · ') || 'Sin contacto registrado'}
                      {' · '}{r.ultimo_recordatorio ? `último recordatorio ${fecha(r.ultimo_recordatorio, true)}` : 'nunca recordado'}
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
        </>
      )}
    </div>
  )
}
