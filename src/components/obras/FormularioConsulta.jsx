import { useEffect, useState } from 'react'
import { X, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { enviarConsulta } from '../../modules/catalogo/obrasService.js'
import { registrarEvento } from '../../lib/analytics.js'

const TITULOS = {
  compra:   ['Quiero comprar esta obra', 'Te contactamos hoy para coordinar el pago y la entrega.'],
  reserva:  ['Reservar por 48 horas', 'Apartamos la obra mientras coordinamos contigo el pago.'],
  encargo:  ['Pedir una obra similar', 'El artista prepara una propuesta a tu medida.'],
  contacto: ['Pregunta sobre esta obra', 'Te respondemos por correo o teléfono.'],
}

// Toda la conversación pasa por la galería: el cliente nunca recibe datos del artista.
export default function FormularioConsulta({ tipo, obra, onCerrar }) {
  const [form, setForm] = useState({ nombre: '', email: '', telefono: '', mensaje: '' })
  const [enviando, setEnviando] = useState(false)
  const [listo, setListo] = useState(false)
  const [titulo, subtitulo] = TITULOS[tipo] || TITULOS.contacto

  useEffect(() => {
    const esc = e => e.key === 'Escape' && onCerrar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onCerrar])

  const cambiar = c => e => setForm(f => ({ ...f, [c]: e.target.value }))

  async function enviar(e) {
    e.preventDefault()
    if (!form.email.trim() && !form.telefono.trim()) { toast.error('Déjanos un correo o un teléfono para responderte'); return }
    setEnviando(true)
    try {
      await enviarConsulta({
        tipo, ficha_id: obra ? String(obra.id) : null, ficha_titulo: obra?.titulo || null,
        nombre: form.nombre.trim(), email: form.email.trim() || null, telefono: form.telefono.trim() || null,
        mensaje: form.mensaje.trim() || null,
      })
      registrarEvento('consulta_' + tipo, '/obra', obra?.id, obra?.titulo)
      setListo(true)
    } catch {
      toast.error('No se pudo enviar. Revisa tu conexión e inténtalo otra vez.')
    } finally { setEnviando(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 md:items-center md:p-6" onClick={onCerrar}>
      <div role="dialog" aria-modal="true" aria-labelledby="consulta-titulo" onClick={e => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[30px] bg-white p-6 md:rounded-[30px] md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="consulta-titulo" className="text-2xl font-semibold tracking-tight">{listo ? '¡Recibimos tu solicitud!' : titulo}</h2>
            {obra && <p className="mt-1 text-sm text-gris">{obra.titulo}</p>}
          </div>
          <button onClick={onCerrar} aria-label="Cerrar" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-crema"><X size={20} /></button>
        </div>
        {listo ? (
          <div className="mt-6">
            <p className="text-[17px] leading-relaxed">Gracias, {form.nombre.split(' ')[0]}. Nuestro equipo te escribirá muy pronto.</p>
            <button onClick={onCerrar} className="btn-oscuro mt-8 w-full">Seguir viendo obras</button>
          </div>
        ) : (
          <form onSubmit={enviar} className="mt-6 space-y-4">
            <p className="text-[15px] text-gris">{subtitulo}</p>
            <label className="etiqueta">Tu nombre<input required value={form.nombre} onChange={cambiar('nombre')} autoComplete="name" className="campo mt-1.5" /></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="etiqueta">Correo<input type="email" value={form.email} onChange={cambiar('email')} autoComplete="email" className="campo mt-1.5" /></label>
              <label className="etiqueta">Teléfono<input type="tel" value={form.telefono} onChange={cambiar('telefono')} autoComplete="tel" className="campo mt-1.5" /></label>
            </div>
            <label className="etiqueta">Mensaje (opcional)
              <textarea rows={3} value={form.mensaje} onChange={cambiar('mensaje')} className="campo mt-1.5"
                placeholder={tipo === 'encargo' ? 'Medidas, colores o el espacio donde irá' : '¿Algo que debamos saber?'} />
            </label>
            <p className="flex gap-2.5 text-[13px] leading-relaxed text-gris"><Lock size={16} className="mt-0.5 shrink-0" />La compra, el pago y la entrega se gestionan con Entre tu Arte. Tus datos solo se usan para responderte.</p>
            <button disabled={enviando} className="btn-primario w-full">{enviando ? 'Enviando…' : 'Enviar solicitud'}</button>
          </form>
        )}
      </div>
    </div>
  )
}
