import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Pencil, Plus, Copy, Trash2, Inbox, PackagePlus, Users } from 'lucide-react'
import { useCartas } from '../CartasContext.jsx'
import { borrarRemitente } from '../cartasService.js'
import { responsableDe, esValida, enlacePortal, nombreDestinatario, nombrePareja, nombreCompleto, fecha, folioTexto, mensajeError, semaforo, ORIGENES } from '../constantes.js'
import { Etiqueta, Kpi, Semaforo, Vacio, btn } from '../ui.jsx'
import { FormPareja, Avance } from './Parejas.jsx'
import { FormRemitente, AccionesRecordatorio } from './remitentes.jsx'
import { copiar } from './Retiros.jsx'
import CartaFisica from './CartaFisica.jsx'

export default function FichaPareja() {
  const { id } = useParams()
  const { parejas, remitentes, cartas, indicadores, retiro, recargar, equipo } = useCartas()
  const [editar, setEditar] = useState(false)
  const [remitente, setRemitente] = useState(null)
  const [paquete, setPaquete] = useState(false)
  const pareja = parejas.find(p => p.id === id)
  if (!pareja) return <Vacio titulo="Pareja no encontrada"><Link to="/cartas/panel/parejas" className={btn.texto}>Volver a parejas</Link></Vacio>

  const x = indicadores.porPareja[id]
  const meta = retiro.meta_por_persona || 0
  const contactos = remitentes.filter(r => r.pareja_id === id && r.coordinador)
  const suyas = cartas.filter(c => c.pareja_id === id)
  // Desglose por quién envía: «Hermana 2 · Papá 1…»
  const porRelacion = Object.entries(suyas.filter(esValida).reduce((m, c) => { const k = c.relacion || 'Sin clasificar'; m[k] = (m[k] || 0) + 1; return m }, {}))
    .sort((a, b) => b[1] - a[1])
  const color = semaforo({ retiro, cartasValidas: x.recibidas, pendientes: x.pendientes, x })

  async function quitar(r) {
    if (!window.confirm(`¿Quitar a ${r.nombre}? Sus cartas se conservan.`)) return
    try { await borrarRemitente(r.id); await recargar(); toast.success('Quitado') }
    catch (err) { toast.error(mensajeError(err)) }
  }

  const Persona = ({ r }) => (
    <li className="rounded-[20px] bg-white p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-semibold">{r.nombre}</span>
        <Etiqueta tipo="remitente" estado={r.estado} />
        <span className="text-sm text-gris">{[r.relacion, !r.coordinador && `para ${nombreDestinatario(pareja, r.destinatario)}`].filter(Boolean).join(' · ')}</span>
        <span className="ml-auto flex gap-1">
          <button onClick={() => setRemitente(r)} aria-label={`Editar ${r.nombre}`} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-crema"><Pencil size={15} /></button>
          <button onClick={() => quitar(r)} aria-label={`Quitar ${r.nombre}`} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-crema"><Trash2 size={15} /></button>
        </span>
      </div>
      <p className="mt-1 text-xs text-gris">
        {[r.telefono, r.correo].filter(Boolean).join(' · ') || 'Sin contacto'}
        {r.ultimo_recordatorio ? ` · último mensaje ${fecha(r.ultimo_recordatorio, true)}` : ' · aún sin mensaje'}
        {r.motivo && ` · ${r.motivo}`}{r.notas && ` · ${r.notas}`}
      </p>
      {r.estado !== 'exento' && <div className="mt-3"><AccionesRecordatorio remitente={r} pareja={pareja} compacto /></div>}
    </li>
  )

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-gris">{pareja.codigo}{responsableDe(pareja, equipo) && ` · responsable: ${responsableDe(pareja, equipo)}`}{pareja.estado === 'retirada' && ' · se retiró del evento'}</p>
          <h1 className="mt-1 text-2xl font-semibold md:text-3xl">{nombrePareja(pareja)}</h1>
          <p className="mt-1 text-sm text-gris">{nombreCompleto(pareja, 'A')} · {nombreCompleto(pareja, 'B')}</p>
          <div className="mt-2">{pareja.estado === 'activa' && <Semaforo color={color} conTexto />}</div>
          {(pareja.invitados_por || pareja.notas) && <p className="mt-2 max-w-xl text-sm text-gris">{[pareja.invitados_por && `Invitados por: ${pareja.invitados_por}`, pareja.notas].filter(Boolean).join(' · ')}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setPaquete(true)} className={btn.vino}><PackagePlus size={16} />Registrar cartas recibidas</button>
          <button onClick={() => copiar(enlacePortal(retiro, { pareja }), 'Enlace de la pareja copiado')} className={btn.contorno}><Copy size={15} />Enlace de la pareja</button>
          <button onClick={() => setEditar(true)} className={btn.contorno}><Pencil size={15} />Editar</button>
        </div>
      </div>

      {meta > 0 && (
        <div className="mb-3 grid gap-3 rounded-[22px] bg-white p-4 sm:grid-cols-2">
          <Avance nombre={nombreCompleto(pareja, 'A')} n={x.paraA} meta={meta} />
          <Avance nombre={nombreCompleto(pareja, 'B')} n={x.paraB} meta={meta} />
          <p className="text-xs text-gris sm:col-span-2">{x.metaCumplida ? '¡Meta cumplida!' : `Faltan ${x.faltan} cartas para llegar a ${meta} por persona.`} Las cartas «para ambos» cuentan para los dos.</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi valor={x.recibidas} etiqueta="Cartas recibidas" />
        <Kpi valor={x.enPapel} etiqueta="En papel" detalle="van directo al sobre" />
        <Kpi valor={x.aImprimir} etiqueta="Formulario o correo" detalle="se imprimen" />
        <Kpi valor={`${x.contactos - x.contactosPendientes}/${x.contactos}`} etiqueta="Contactos que ya entregaron" />
      </div>

      <section className="mt-7">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Users size={18} />Contactos de la familia</h2>
          <button onClick={() => setRemitente({ coordinador: true })} className={btn.contorno}><Plus size={16} />Agregar contacto</button>
        </div>
        <p className="mb-3 text-sm text-gris">Reciben el mensaje para las familias, reúnen las cartas y entregan el paquete. Su enlace sirve para subir cartas escritas por otras personas.</p>
        {!contactos.length ? <Vacio titulo="Sin contactos de familia" /> : <ul className="space-y-2.5">{contactos.map(r => <Persona key={r.id} r={r} />)}</ul>}
      </section>


      <section className="mt-7">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Cartas ({suyas.length})</h2>
          <Link to={`/cartas/panel/cartas?pareja=${id}`} className={btn.contorno}><Inbox size={15} />Abrir en la bandeja</Link>
        </div>
        {porRelacion.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {porRelacion.map(([r, n]) => <span key={r} className={`rounded-full px-3 py-1 text-[13px] font-semibold ${r === 'Sin clasificar' ? 'bg-amber-50 text-amber-800' : 'bg-white'}`}>{r} · {n}</span>)}
          </div>
        )}
        {!suyas.length ? <Vacio titulo="Todavía no hay cartas para esta pareja" /> : (
          <ul className="divide-y divide-crema-borde overflow-hidden rounded-[20px] bg-white">
            {suyas.map(c => (
              <li key={c.id}>
                <Link to={`/cartas/panel/cartas?pareja=${id}&carta=${c.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 hover:bg-crema-clara">
                  <span className="text-xs font-bold text-gris">{folioTexto(c.folio)}</span>
                  <span className="font-semibold">{c.relacion && c.relacion !== c.remitente_nombre ? `${c.relacion} · ` : ''}{c.remitente_nombre}</span>
                  <span className="text-sm text-gris">→ {nombreDestinatario(pareja, c.destinatario)} · {ORIGENES[c.origen]}{c.recibida_de && ` · entregó ${c.recibida_de}`}</span>
                  <span className="ml-auto"><Etiqueta estado={c.estado} /></span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {editar && <FormPareja retiroId={retiro.id} parejas={parejas} inicial={pareja} onCerrar={() => setEditar(false)} onGuardado={async () => { setEditar(false); await recargar() }} />}
      {remitente && <FormRemitente pareja={pareja} inicial={remitente.id ? remitente : null} coordinador={!!remitente.coordinador} onCerrar={() => setRemitente(null)} />}
      {paquete && <CartaFisica parejaInicial={id} onCerrar={() => setPaquete(false)} />}
    </div>
  )
}
