import { useState } from 'react'
import toast from 'react-hot-toast'
import { MessageCircle, Mail, Copy, Link2 } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext.jsx'
import { useCartas } from '../CartasContext.jsx'
import { useBorrador, useVentana } from '../borrador.js'
import { guardarRemitente, registrarRecordatorio } from '../cartasService.js'
import { enlacePortal, mensajeRecordatorio, contactoEquipo, telefonoWhatsApp, mensajeError, nombreDestinatario, ESTADOS_REMITENTE, RELACIONES } from '../constantes.js'
import { Modal, btn } from '../ui.jsx'
import { copiar } from './Retiros.jsx'

// Formulario de remitente esperado (familiar o amigo)
export function FormRemitente({ pareja, inicial, coordinador = false, onCerrar }) {
  const { retiro, actualizarLocal } = useCartas()
  const [f, setF, limpiar] = useBorrador(`contacto-${pareja.id}-${inicial?.id || 'nuevo'}`, inicial || { nombre: '', telefono: '', correo: '', relacion: '', destinatario: 'ambos', estado: 'pendiente', motivo: '', notas: '', coordinador: true })
  const cancelar = () => { limpiar(); onCerrar() }
  const [guardando, setGuardando] = useState(false)
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))

  async function guardar(e) {
    e.preventDefault()
    setGuardando(true)
    try {
      const fila = await guardarRemitente({ ...f, retiro_id: retiro.id, pareja_id: pareja.id })
      actualizarLocal('remitentes', fila)
      limpiar()
      toast.success('Guardado')
      onCerrar()
    } catch (err) { toast.error(mensajeError(err, 'No se pudo guardar')) }
    finally { setGuardando(false) }
  }

  return (
    <Modal titulo={f.coordinador ? (f.id ? 'Editar contacto de la familia' : 'Agregar contacto de la familia') : (f.id ? 'Editar remitente' : 'Agregar remitente esperado')} onCerrar={cancelar}
      pie={<div className="flex justify-end gap-2"><button onClick={cancelar} className={btn.contorno}>Cancelar</button><button form="form-rem" disabled={guardando} className={btn.vino}>{guardando ? 'Guardando…' : 'Guardar'}</button></div>}>
      <form id="form-rem" onSubmit={guardar} className="grid gap-4 sm:grid-cols-2">
        <label className="etiqueta sm:col-span-2">Nombre *<input required value={f.nombre} onChange={e => set('nombre', e.target.value)} className="campo mt-1.5" /></label>
        <label className="etiqueta">Teléfono (WhatsApp)<input value={f.telefono || ''} onChange={e => set('telefono', e.target.value)} inputMode="tel" className="campo mt-1.5" /></label>
        <label className="etiqueta">Correo<input type="email" value={f.correo || ''} onChange={e => set('correo', e.target.value)} className="campo mt-1.5" /></label>
        <label className="etiqueta">Relación / vínculo<input value={f.relacion || ''} onChange={e => set('relacion', e.target.value)} placeholder="Mamá, hermana, amigo…" list="relaciones-contacto" className="campo mt-1.5" />
          <datalist id="relaciones-contacto">{RELACIONES.map(x => <option key={x} value={x} />)}</datalist></label>
        {!f.coordinador && <label className="etiqueta">Carta prevista para
          <select value={f.destinatario} onChange={e => set('destinatario', e.target.value)} className="campo mt-1.5">
            <option value="A">{pareja.apodo_a || pareja.nombre_a}</option><option value="B">{pareja.apodo_b || pareja.nombre_b}</option>
          </select>
        </label>}
        {f.id && (
          <label className="etiqueta">Estado
            <select value={f.estado} onChange={e => set('estado', e.target.value)} className="campo mt-1.5">
              {Object.entries(ESTADOS_REMITENTE).map(([k, v]) => <option key={k} value={k}>{v.etiqueta}</option>)}
            </select>
          </label>
        )}
        {(f.estado === 'exento' || f.estado === 'revision') && (
          <label className="etiqueta">Motivo {f.estado === 'exento' && '*'}<input required={f.estado === 'exento'} value={f.motivo || ''} onChange={e => set('motivo', e.target.value)} className="campo mt-1.5" /></label>
        )}
        <label className="etiqueta sm:col-span-2">Notas<input value={f.notas || ''} onChange={e => set('notas', e.target.value)} className="campo mt-1.5" /></label>
        {f.id && f.estado === 'recibido' && <p className="text-xs text-gris sm:col-span-2">«Recibido» se marca solo cuando llega una carta válida de esta persona (o, si es contacto, de su paquete).</p>}
      </form>
    </Modal>
  )
}

// Botones para enviar el recordatorio por WhatsApp o correo (se abre la app; nada se envía solo)
export function AccionesRecordatorio({ remitente, pareja, compacto = false, simple = false, onRegistrado }) {
  const { retiro, actualizarLocal, equipo } = useCartas()
  const { usuario } = useAuth()
  const enlace = enlacePortal(retiro, { remitente })
  const responsable = contactoEquipo(equipo.find(e => e.id === pareja.equipo_id))
  const mensaje = mensajeRecordatorio({ retiro, pareja, remitente, enlace, responsable })
  const tel = telefonoWhatsApp(remitente.telefono)

  const [opciones, setOpciones] = useState(false)
  async function registrar(canal, texto = mensaje) {
    try {
      const fila = await registrarRecordatorio({ retiro_id: retiro.id, remitente_id: remitente.id, canal, mensaje: texto, usuario_id: usuario.id })
      actualizarLocal('remitentes', fila)
      onRegistrado?.()
    } catch (err) { toast.error(mensajeError(err, 'No se pudo registrar el recordatorio')) }
  }

  const clase = compacto ? btn.mini : btn.contorno
  // Modo simple: «Enviar» pregunta si es el mensaje de bienvenida o un seguimiento (chat abierto, sin texto)
  if (simple) return (
    <>
      <button type="button" onClick={() => setOpciones(true)} className={clase}><MessageCircle size={15} />Enviar</button>
      {opciones && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center" onClick={() => setOpciones(false)}>
          <div role="dialog" aria-label={`WhatsApp a ${remitente.nombre}`} onClick={e => e.stopPropagation()} className="w-full max-w-sm rounded-[24px] bg-white p-4 shadow-xl">
            <p className="px-1 text-sm text-gris">WhatsApp a</p>
            <p className="mb-3 px-1 font-semibold">{remitente.nombre}</p>
            <a href={`https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`} target="_blank" rel="noreferrer"
              onClick={() => { registrar('whatsapp'); setOpciones(false) }}
              className="mb-2 flex items-center gap-3 rounded-2xl bg-[#25D366] px-4 py-3 text-white hover:brightness-95">
              <MessageCircle size={20} /><span><b className="block text-[15px]">Mensaje de bienvenida</b><span className="text-xs text-white/85">La invitación con su enlace para enviar las cartas</span></span>
            </a>
            {tel ? (
              <a href={`https://wa.me/${tel}`} target="_blank" rel="noreferrer"
                onClick={() => { registrar('whatsapp', 'Seguimiento'); setOpciones(false) }}
                className="flex items-center gap-3 rounded-2xl border border-crema-borde px-4 py-3 hover:border-vino">
                <MessageCircle size={20} className="text-vino" /><span><b className="block text-[15px]">Mensaje de seguimiento</b><span className="text-xs text-gris">Abre el chat vacío para escribirle tú</span></span>
              </a>
            ) : <p className="rounded-2xl bg-crema px-4 py-3 text-xs text-gris">Seguimiento no disponible: este contacto no tiene teléfono.</p>}
            <button type="button" onClick={() => setOpciones(false)} className="mt-3 h-11 w-full rounded-full text-sm font-semibold text-gris hover:bg-crema">Cancelar</button>
          </div>
        </div>
      )}
    </>
  )
  return (
    <div className="flex flex-wrap gap-2">
      <a href={`https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`} target="_blank" rel="noreferrer" onClick={() => registrar('whatsapp')}
        className={`${clase} ${!tel ? 'opacity-70' : ''}`} title={tel ? 'Abrir WhatsApp con el mensaje' : 'Sin teléfono: WhatsApp te pedirá elegir el contacto'}>
        <MessageCircle size={15} />WhatsApp
      </a>
      {remitente.correo && !simple && (
        <a href={`mailto:${remitente.correo}?subject=${encodeURIComponent(`Una carta para ${nombreDestinatario(pareja, remitente.destinatario)}`)}&body=${encodeURIComponent(mensaje)}`}
          onClick={() => registrar('correo')} className={clase}><Mail size={15} />Correo</a>
      )}
      {!simple && <button onClick={async () => { await copiar(mensaje, 'Mensaje copiado'); registrar('copiado') }} className={clase}><Copy size={15} />Copiar mensaje</button>}
      {!compacto && <button onClick={() => copiar(enlace, 'Enlace personal copiado')} className={clase}><Link2 size={15} />Solo el enlace</button>}
    </div>
  )
}
