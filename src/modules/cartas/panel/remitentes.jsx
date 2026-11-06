import { useState } from 'react'
import toast from 'react-hot-toast'
import { MessageCircle, Mail, Copy, Link2 } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext.jsx'
import { useCartas } from '../CartasContext.jsx'
import { guardarRemitente, registrarRecordatorio } from '../cartasService.js'
import { enlacePortal, mensajeRecordatorio, telefonoWhatsApp, mensajeError, nombreDestinatario, ESTADOS_REMITENTE } from '../constantes.js'
import { Modal, btn } from '../ui.jsx'
import { copiar } from './Retiros.jsx'

// Formulario de remitente esperado (familiar o amigo)
export function FormRemitente({ pareja, inicial, onCerrar }) {
  const { retiro, actualizarLocal } = useCartas()
  const [f, setF] = useState(inicial || { nombre: '', telefono: '', correo: '', relacion: '', destinatario: 'ambos', estado: 'pendiente', motivo: '', notas: '' })
  const [guardando, setGuardando] = useState(false)
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))

  async function guardar(e) {
    e.preventDefault()
    setGuardando(true)
    try {
      const fila = await guardarRemitente({ ...f, retiro_id: retiro.id, pareja_id: pareja.id })
      actualizarLocal('remitentes', fila)
      toast.success('Guardado')
      onCerrar()
    } catch (err) { toast.error(mensajeError(err, 'No se pudo guardar')) }
    finally { setGuardando(false) }
  }

  return (
    <Modal titulo={f.id ? 'Editar remitente' : 'Agregar remitente esperado'} onCerrar={onCerrar}
      pie={<div className="flex justify-end gap-2"><button onClick={onCerrar} className={btn.contorno}>Cancelar</button><button form="form-rem" disabled={guardando} className={btn.vino}>{guardando ? 'Guardando…' : 'Guardar'}</button></div>}>
      <form id="form-rem" onSubmit={guardar} className="grid gap-4 sm:grid-cols-2">
        <label className="etiqueta sm:col-span-2">Nombre *<input required value={f.nombre} onChange={e => set('nombre', e.target.value)} className="campo mt-1.5" /></label>
        <label className="etiqueta">Teléfono (WhatsApp)<input value={f.telefono || ''} onChange={e => set('telefono', e.target.value)} inputMode="tel" className="campo mt-1.5" /></label>
        <label className="etiqueta">Correo<input type="email" value={f.correo || ''} onChange={e => set('correo', e.target.value)} className="campo mt-1.5" /></label>
        <label className="etiqueta">Relación / vínculo<input value={f.relacion || ''} onChange={e => set('relacion', e.target.value)} placeholder="Hija, mamá de…, amigo" className="campo mt-1.5" /></label>
        <label className="etiqueta">Carta prevista para
          <select value={f.destinatario} onChange={e => set('destinatario', e.target.value)} className="campo mt-1.5">
            <option value="A">{pareja.nombre_a}</option><option value="B">{pareja.nombre_b}</option><option value="ambos">Ambos</option>
          </select>
        </label>
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
        {f.id && f.estado === 'recibido' && <p className="text-xs text-gris sm:col-span-2">«Recibido» se calcula solo cuando una carta válida queda vinculada a esta persona.</p>}
      </form>
    </Modal>
  )
}

// Botones para enviar el recordatorio por WhatsApp o correo (se abre la app; nada se envía solo)
export function AccionesRecordatorio({ remitente, pareja, compacto = false }) {
  const { retiro, actualizarLocal } = useCartas()
  const { usuario } = useAuth()
  const enlace = enlacePortal(retiro, { remitente })
  const mensaje = mensajeRecordatorio({ retiro, pareja, remitente, enlace })
  const tel = telefonoWhatsApp(remitente.telefono)

  async function registrar(canal) {
    try {
      const fila = await registrarRecordatorio({ retiro_id: retiro.id, remitente_id: remitente.id, canal, mensaje, usuario_id: usuario.id })
      actualizarLocal('remitentes', fila)
    } catch (err) { toast.error(mensajeError(err, 'No se pudo registrar el recordatorio')) }
  }

  const clase = compacto ? btn.mini : btn.contorno
  return (
    <div className="flex flex-wrap gap-2">
      <a href={`https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`} target="_blank" rel="noreferrer" onClick={() => registrar('whatsapp')}
        className={`${clase} ${!tel ? 'opacity-70' : ''}`} title={tel ? 'Abrir WhatsApp con el mensaje' : 'Sin teléfono: WhatsApp te pedirá elegir el contacto'}>
        <MessageCircle size={15} />WhatsApp
      </a>
      {remitente.correo && (
        <a href={`mailto:${remitente.correo}?subject=${encodeURIComponent(`Una carta para ${nombreDestinatario(pareja, remitente.destinatario)}`)}&body=${encodeURIComponent(mensaje)}`}
          onClick={() => registrar('correo')} className={clase}><Mail size={15} />Correo</a>
      )}
      <button onClick={async () => { await copiar(mensaje, 'Mensaje copiado'); registrar('copiado') }} className={clase}><Copy size={15} />Copiar mensaje</button>
      {!compacto && <button onClick={() => copiar(enlace, 'Enlace personal copiado')} className={clase}><Link2 size={15} />Solo el enlace</button>}
    </div>
  )
}
