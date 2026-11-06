import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, Pencil, Plus, Copy, Trash2, Inbox, ExternalLink } from 'lucide-react'
import { useCartas } from '../CartasContext.jsx'
import { borrarRemitente } from '../cartasService.js'
import { enlacePortal, nombreDestinatario, fecha, folioTexto, mensajeError, semaforo } from '../constantes.js'
import { Etiqueta, Kpi, Semaforo, Vacio, btn } from '../ui.jsx'
import { FormPareja } from './Parejas.jsx'
import { FormRemitente, AccionesRecordatorio } from './remitentes.jsx'
import { copiar } from './Retiros.jsx'

export default function FichaPareja() {
  const { id } = useParams()
  const { parejas, remitentes, cartas, indicadores, retiro, recargar } = useCartas()
  const [editar, setEditar] = useState(false)
  const [remitente, setRemitente] = useState(null)
  const pareja = parejas.find(p => p.id === id)
  if (!pareja) return <Vacio titulo="Pareja no encontrada"><Link to="/cartas/panel/parejas" className={btn.texto}>Volver a parejas</Link></Vacio>

  const x = indicadores.porPareja[id]
  const suyos = remitentes.filter(r => r.pareja_id === id)
  const suyas = cartas.filter(c => c.pareja_id === id)
  const color = semaforo({ retiro, cartasValidas: x.recibidas, pendientes: x.pendientes })

  async function quitar(r) {
    if (!window.confirm(`¿Quitar a ${r.nombre} de los remitentes esperados? Sus cartas se conservan como adicionales.`)) return
    try { await borrarRemitente(r.id); await recargar(); toast.success('Quitado') }
    catch (err) { toast.error(mensajeError(err)) }
  }

  return (
    <div>
      <Link to="/cartas/panel/parejas" className={`${btn.texto} mb-3`}><ArrowLeft size={16} />Parejas</Link>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-gris">{pareja.codigo}{pareja.estado === 'retirada' && ' · se retiró del evento'}</p>
          <h1 className="mt-1 text-2xl font-semibold md:text-3xl">{pareja.nombre_a} y {pareja.nombre_b}</h1>
          <div className="mt-2">{pareja.estado === 'activa' && <Semaforo color={color} conTexto />}</div>
          {pareja.notas && <p className="mt-2 max-w-xl text-sm text-gris">{pareja.notas}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => copiar(enlacePortal(retiro, { pareja }), 'Enlace de la pareja copiado')} className={btn.contorno}><Copy size={15} />Enlace de esta pareja</button>
          <button onClick={() => setEditar(true)} className={btn.contorno}><Pencil size={15} />Editar</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi valor={x.recibidas} etiqueta="Cartas recibidas" />
        <Kpi valor={x.aprobadas} etiqueta="Aprobadas" tono="ok" />
        <Kpi valor={x.listas} etiqueta="Listas para imprimir" />
        <Kpi valor={x.pendientes} etiqueta="Remitentes pendientes" tono={x.pendientes ? 'alerta' : 'normal'} detalle={`de ${x.esperados} esperados`} />
        <Kpi valor={x.adicionales} etiqueta="Cartas adicionales" detalle="sin remitente esperado" />
      </div>

      <section className="mt-7">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Remitentes esperados</h2>
          <button onClick={() => setRemitente({})} className={btn.vino}><Plus size={16} />Agregar</button>
        </div>
        {!suyos.length ? <Vacio titulo="Sin remitentes esperados">Agrega a los familiares y amigos de quienes esperan carta para darles seguimiento.</Vacio> : (
          <ul className="space-y-2.5">
            {suyos.map(r => (
              <li key={r.id} className="rounded-[20px] bg-white p-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-semibold">{r.nombre}</span>
                  <Etiqueta tipo="remitente" estado={r.estado} />
                  <span className="text-sm text-gris">{[r.relacion, `para ${nombreDestinatario(pareja, r.destinatario)}`].filter(Boolean).join(' · ')}</span>
                  <span className="ml-auto flex gap-1">
                    <button onClick={() => setRemitente(r)} aria-label={`Editar ${r.nombre}`} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-crema"><Pencil size={15} /></button>
                    <button onClick={() => quitar(r)} aria-label={`Quitar ${r.nombre}`} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-crema"><Trash2 size={15} /></button>
                  </span>
                </div>
                <p className="mt-1 text-xs text-gris">
                  {[r.telefono, r.correo].filter(Boolean).join(' · ') || 'Sin contacto'}
                  {r.ultimo_recordatorio && ` · último recordatorio ${fecha(r.ultimo_recordatorio, true)}`}
                  {r.motivo && ` · ${r.motivo}`}
                </p>
                {(r.estado === 'pendiente' || r.estado === 'revision') && <div className="mt-3"><AccionesRecordatorio remitente={r} pareja={pareja} compacto /></div>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-7">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Cartas ({suyas.length})</h2>
          <Link to={`/cartas/panel/cartas?pareja=${id}`} className={btn.contorno}><Inbox size={15} />Abrir en la bandeja</Link>
        </div>
        {!suyas.length ? <Vacio titulo="Todavía no hay cartas para esta pareja" /> : (
          <ul className="divide-y divide-crema-borde overflow-hidden rounded-[20px] bg-white">
            {suyas.map(c => (
              <li key={c.id}>
                <Link to={`/cartas/panel/cartas?pareja=${id}&carta=${c.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 hover:bg-crema-clara">
                  <span className="text-xs font-bold text-gris">{folioTexto(c.folio)}</span>
                  <span className="font-semibold">{c.remitente_nombre}</span>
                  <span className="text-sm text-gris">→ {nombreDestinatario(pareja, c.destinatario)}</span>
                  {!c.remitente_id && <span className="rounded-full bg-oro-claro px-2 py-0.5 text-[11px] font-bold text-oro">Adicional</span>}
                  <span className="ml-auto"><Etiqueta estado={c.estado} /></span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-6 text-xs text-gris"><ExternalLink size={12} className="mr-1 inline" />El enlace de la pareja abre el formulario con esta pareja ya elegida. Cada remitente tiene además su enlace personal (en «Copiar mensaje»), que vincula su carta automáticamente.</p>

      {editar && <FormPareja retiroId={retiro.id} parejas={parejas} inicial={pareja} onCerrar={() => setEditar(false)} onGuardado={async () => { setEditar(false); await recargar() }} />}
      {remitente && <FormRemitente pareja={pareja} inicial={remitente.id ? remitente : null} onCerrar={() => setRemitente(null)} />}
    </div>
  )
}
