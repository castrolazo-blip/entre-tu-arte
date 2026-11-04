import { useState } from 'react'
import { MessageCircle, ShieldCheck, X } from 'lucide-react'

export function enlaceWhatsAppCliente(telefono, texto) {
  const n = String(telefono || '').replace(/\D/g, '').replace(/^(\d{8})$/, '503$1')
  return n ? `https://wa.me/${n}${texto ? `?text=${encodeURIComponent(texto)}` : ''}` : null
}

// Botón de WhatsApp con mensajes listos: se elige uno y se abre el chat con el texto escrito.
// opciones: [{ id, titulo, texto, nota? , destacado? }]
export default function MenuWhatsApp({ telefono, nombre, opciones, etiqueta = 'WhatsApp', chico = false }) {
  const [abierto, setAbierto] = useState(false)
  if (!enlaceWhatsAppCliente(telefono)) return null
  const abrir = texto => { window.open(enlaceWhatsAppCliente(telefono, texto), '_blank'); setAbierto(false) }
  return (
    <>
      <button type="button" onClick={() => setAbierto(true)}
        className={`flex items-center gap-1.5 rounded-full bg-[#25D366] font-bold text-white ${chico ? 'h-8 px-3 text-xs' : 'h-10 px-4 text-sm'}`}>
        <MessageCircle size={chico ? 13 : 16} />{etiqueta}
      </button>
      {abierto && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 md:items-center" onClick={() => setAbierto(false)}>
          <div role="dialog" aria-modal="true" aria-label="Mensaje de WhatsApp" onClick={e => e.stopPropagation()}
            className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-white p-5 md:rounded-[28px]">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Escribir a {String(nombre || '').trim().split(/\s+/)[0] || 'el cliente'}</h3>
              <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar" className="flex h-10 w-10 items-center justify-center rounded-full bg-crema"><X size={18} /></button>
            </div>
            <p className="mt-1 text-sm text-gris">Elige un mensaje. Se abre WhatsApp con el texto listo; puedes editarlo antes de enviar.</p>
            <ul className="mt-4 space-y-2.5">
              {opciones.map(o => (
                <li key={o.id}>
                  <button type="button" onClick={() => abrir(o.texto)} className="w-full rounded-2xl bg-crema-clara p-4 text-left ring-1 ring-crema-borde hover:ring-tinta">
                    <span className="flex items-center gap-2 font-bold">{o.destacado && <ShieldCheck size={16} />}{o.titulo}</span>
                    <span className="mt-1.5 line-clamp-4 block whitespace-pre-line text-[13px] leading-relaxed text-gris">{o.texto}</span>
                    {o.nota && <span className="mt-2 inline-block rounded-full bg-mostaza px-2.5 py-0.5 text-[11px] font-bold">{o.nota}</span>}
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => abrir('')} className="mt-3 w-full text-sm font-semibold underline">Abrir el chat sin mensaje</button>
          </div>
        </div>
      )}
    </>
  )
}
