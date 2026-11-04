import { useEffect, useState } from 'react'
import { X, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { enviarConsulta } from '../../modules/catalogo/obrasService.js'
import { registrarEvento } from '../../lib/analytics.js'

const TITULOS = {
  compra:   ['Quiero comprar esta obra', 'Te contactamos hoy para coordinar el pago y la entrega.'],
  reserva:  ['Reservar por 48 horas', 'Apartamos la obra mientras coordinamos contigo el pago.'],
  encargo:  ['Pedir una obra similar', 'El artista prepara una propuesta a tu medida.'],
  contacto: ['Pregunta sobre esta obra', 'Te respondemos por WhatsApp.'],
}

// Toda la conversación pasa por la galería: el cliente nunca recibe datos del artista.
export default function FormularioConsulta({ tipo, obra, onCerrar }) {
  const [form, setForm] = useState({ nombre: '', telefono: '', mensaje: '' })
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
    if (!form.telefono.trim()) { toast.error('Déjanos tu WhatsApp o teléfono para responderte'); return }
    if (tipo === 'encargo' && !form.mensaje.trim()) { toast.error('Cuéntanos cómo la quieres para preparar tu propuesta'); return }
    setEnviando(true)
    try {
      await enviarConsulta({
        tipo, ficha_id: obra ? String(obra.id) : null, ficha_titulo: obra?.titulo || null,
        nombre: form.nombre.trim(), email: null, telefono: form.telefono.trim() || null,
        mensaje: form.mensaje.trim() || null,
        // Obra de referencia: foto, medidas y precio para verla en el panel sin abrirla
        datos: obra ? { obra_foto: obra.fotoMini || obra.foto || null, obra_medidas: obra.medidasTexto || null, obra_precio: obra.precio ?? null } : {},
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
            {obra && !obra.foto && <p className="mt-1 text-sm text-gris">{obra.titulo}</p>}
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
            {obra?.foto && (
              <div className="flex items-center gap-3 rounded-2xl bg-crema-clara p-2.5 ring-1 ring-crema-borde">
                <img src={obra.fotoMini || obra.foto} alt="" className="h-16 w-16 shrink-0 rounded-xl bg-white object-contain" />
                <div className="min-w-0"><p className="text-xs font-semibold text-gris">Obra de referencia</p><p className="truncate font-bold">{obra.titulo}</p>{obra.medidasTexto && <p className="truncate text-sm text-gris">{obra.medidasTexto}</p>}</div>
              </div>
            )}
            <p className="text-[15px] text-gris">{subtitulo}</p>
            <label className="etiqueta">Tu nombre<input required value={form.nombre} onChange={cambiar('nombre')} autoComplete="name" className="campo mt-1.5" /></label>
            <label className="etiqueta">WhatsApp o teléfono<input type="tel" required value={form.telefono} onChange={cambiar('telefono')} autoComplete="tel" placeholder="7777-7777" className="campo mt-1.5" /></label>
            <label className="etiqueta">{tipo === 'encargo' ? '¿Cómo la quieres?' : 'Mensaje (opcional)'}
              <textarea rows={tipo === 'encargo' ? 4 : 3} required={tipo === 'encargo'} value={form.mensaje} onChange={cambiar('mensaje')} className="campo mt-1.5 placeholder:text-[#a8a29a]"
                placeholder={tipo === 'encargo' ? 'Ej.: La quiero igual pero más grande, de unos 150 × 100 cm, para la sala, y con un poco más de dorado.' : '¿Algo que debamos saber?'} />
            </label>
            <p className="flex gap-2.5 text-[13px] leading-relaxed text-gris"><Lock size={16} className="mt-0.5 shrink-0" />La compra, el pago y la entrega se gestionan con Entre tu Arte. Tus datos solo se usan para responderte.</p>
            <button disabled={enviando} className="btn-primario w-full">{enviando ? 'Enviando…' : 'Enviar solicitud'}</button>
          </form>
        )}
      </div>
    </div>
  )
}
