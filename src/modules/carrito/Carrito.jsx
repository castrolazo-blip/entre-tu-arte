import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Trash2, ShoppingBag, Lock, Minus, Plus, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useCarrito } from '../../context/CarritoContext.jsx'
import { useConfig, enlaceWhatsApp } from '../../context/ConfigContext.jsx'
import { supabase } from '../../lib/supabase.js'
import { precio } from '../../lib/formato.js'
import { enviarConsulta, estadoEfectivo } from '../catalogo/obrasService.js'
import { registrarEvento } from '../../lib/analytics.js'

const ENTREGAS = [
  { id: 'retiro', t: 'Retiro en San Salvador', d: 'Coordinamos día y hora contigo' },
  { id: 'envio', t: 'Envío a domicilio', d: 'El costo del envío se confirma según tu zona' },
]

export default function Carrito() {
  const { items, total, cantidad, quitar, cambiarCantidad, vaciar, reemplazar } = useCarrito()
  const { cfg } = useConfig()
  const [form, setForm] = useState({ nombre: '', entrega: 'retiro', direccion: '', instalacion: false, notas: '' })
  const [pedido, setPedido] = useState(null)
  const [noDisponibles, setNoDisponibles] = useState([])
  const c = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  // Revisar que las obras del carrito sigan disponibles
  useEffect(() => {
    if (!items.length) return
    supabase.from('fichas').select('id, estado, reservada_hasta, precio, existencias').in('id', items.map(x => x.id)).then(({ data }) => {
      if (!data) return
      const fuera = items.filter(x => { const f = data.find(d => String(d.id) === String(x.id)); return !f || estadoEfectivo(f) === 'vendida' || f.estado === 'borrador' })
      setNoDisponibles(fuera.map(x => x.id))
      // Actualizar precios por si cambiaron
      reemplazar(l => l.map(x => { const f = data.find(d => String(d.id) === String(x.id)); return f && f.precio != null ? { ...x, precio: f.precio } : x }))
    })
  }, [items.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const enlaceObra = id => `${window.location.origin}${import.meta.env.BASE_URL}obra/${id}`

  function mensajePedido(validos, totalValidos) {
    const lineas = validos.map((x, i) => {
      const pr = precio((Number(x.precio) || 0) * (x.cantidad || 1)) || 'precio a consultar'
      return `${i + 1}. ${x.titulo}${x.cantidad > 1 ? ` (x${x.cantidad})` : ''}${x.medidas ? ` · ${x.medidas}` : ''} · ${pr}\n   ${enlaceObra(x.id)}`
    })
    const entrega = form.entrega === 'envio'
      ? `Envío a domicilio${form.direccion.trim() ? `: ${form.direccion.trim()}` : ''}`
      : 'Retiro en San Salvador'
    return [
      `Hola${form.nombre.trim() ? `, soy ${form.nombre.trim()}` : ''}. Quiero comprar estas obras de Entre tu Arte:`,
      '',
      ...lineas,
      '',
      `Total: ${precio(totalValidos) || 'a consultar'}`,
      `Entrega: ${entrega}`,
      form.instalacion ? 'Quiero instalación.' : null,
      form.notas.trim() ? `Notas: ${form.notas.trim()}` : null,
      '',
      '¿Me confirman disponibilidad y forma de pago?',
    ].filter(l => l !== null).join('\n')
  }

  function confirmar(e) {
    e.preventDefault()
    const validos = items.filter(x => !noDisponibles.includes(x.id))
    if (!validos.length) { toast.error('Las obras de tu carrito ya no están disponibles'); return }
    const resumen = validos.map(x => `${x.titulo}${x.cantidad > 1 ? ` (x${x.cantidad})` : ''}`).join(', ')
    const totalValidos = validos.reduce((s, x) => s + (Number(x.precio) || 0) * (x.cantidad || 1), 0)
    const wa = enlaceWhatsApp(cfg.whatsapp, mensajePedido(validos, totalValidos))

    // Abrir WhatsApp en el mismo toque (si no, el iPhone lo bloquea)
    if (wa) {
      const ventana = window.open(wa, '_blank')
      if (!ventana) window.location.href = wa
    }

    // Dejar registro del pedido en Admin › Consultas (sin detener al cliente)
    enviarConsulta({
      tipo: 'compra',
      ficha_id: validos.length === 1 ? String(validos[0].id) : null,
      ficha_titulo: validos.length === 1 ? validos[0].titulo : `Pedido de ${validos.length} obras`,
      nombre: form.nombre.trim() || 'Cliente por WhatsApp', email: null, telefono: null,
      mensaje: form.notas.trim() || null,
      datos: {
        pedido: true, canal: 'whatsapp',
        items: validos.map(x => ({ id: x.id, titulo: x.titulo, precio: Number(x.precio) || null, cantidad: x.cantidad || 1, medidas: x.medidas })),
        total: totalValidos, entrega: form.entrega, direccion: form.entrega === 'envio' ? form.direccion.trim() || null : null,
        instalacion: form.instalacion,
      },
    }).catch(() => {})
    registrarEvento('pedido_whatsapp', '/carrito', null, resumen)
    setPedido({ resumen, total: totalValidos, wa })
    vaciar()
  }

  if (pedido) {
    return (
      <div className="contenedor flex min-h-[70vh] items-center justify-center pb-28 pt-28">
        <div className="max-w-md rounded-[30px] bg-white p-8 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#25D366] text-white"><MessageCircle size={30} /></span>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight">{pedido.wa ? 'Termina de enviar tu pedido en WhatsApp' : '¡Recibimos tu pedido!'}</h1>
          <p className="mt-3 text-gris">{pedido.wa ? 'Ya está escrito con tus obras y el total; solo toca enviar. Te respondemos para confirmar disponibilidad, pago y entrega.' : 'Te contactaremos muy pronto para confirmar disponibilidad, pago y entrega.'}</p>
          <p className="mt-5 rounded-2xl bg-crema-clara p-4 text-left text-sm"><span className="font-bold">{pedido.resumen}</span><span className="mt-1 block">Total: <strong>{precio(pedido.total) || 'a consultar'}</strong></span></p>
          {pedido.wa && <a href={pedido.wa} target="_blank" rel="noreferrer" className="mt-6 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#25D366] font-semibold text-white"><MessageCircle size={19} />Abrir WhatsApp otra vez</a>}
          <Link to="/obras" className="mt-4 inline-block text-sm font-semibold underline">Seguir viendo obras</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="contenedor pb-28 pt-28 md:pt-36">
      <h1 className="text-[42px] font-medium leading-none tracking-[-0.045em] md:text-[60px]">Tu <em className="font-bold text-mostaza">carrito</em></h1>
      <span aria-hidden="true" className="acento mb-8 mt-4" />

      {!items.length ? (
        <div className="rounded-[28px] bg-white p-10 text-center">
          <ShoppingBag size={40} className="mx-auto text-gris" />
          <p className="mt-4 text-lg">Tu carrito está vacío.</p>
          <Link to="/obras" className="btn-primario mt-6">Ver obras disponibles</Link>
        </div>
      ) : (
        <div className="flex flex-wrap items-start gap-6">
          <section className="min-w-0 flex-[1.2_1_420px] space-y-3">
            {items.map(x => {
              const fuera = noDisponibles.includes(x.id)
              return (
                <article key={x.id} className={`flex gap-4 rounded-[24px] bg-white p-3 ${fuera ? 'opacity-60' : ''}`}>
                  <Link to={`/obra/${x.id}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-[#ece7df]">
                    {x.foto && <img src={x.foto} alt="" className="h-full w-full object-contain p-1.5" />}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link to={`/obra/${x.id}`} className="block truncate text-lg font-semibold">{x.titulo}</Link>
                    <p className="truncate text-sm text-gris">{[x.artista, x.medidas].filter(Boolean).join(' · ')}</p>
                    {fuera ? <p className="mt-1 text-sm font-semibold text-red-700">Ya no está disponible</p> : (
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-lg font-bold">{precio((Number(x.precio) || 0) * (x.cantidad || 1)) || 'Precio a consultar'}</span>
                        {x.maximo > 1 && (
                          <span className="flex items-center gap-1 rounded-full bg-crema px-1">
                            <button onClick={() => cambiarCantidad(x.id, x.cantidad - 1)} aria-label="Menos" className="flex h-9 w-9 items-center justify-center"><Minus size={15} /></button>
                            <span className="w-5 text-center text-sm font-bold">{x.cantidad}</span>
                            <button onClick={() => cambiarCantidad(x.id, x.cantidad + 1)} aria-label="Más" className="flex h-9 w-9 items-center justify-center"><Plus size={15} /></button>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <button onClick={() => quitar(x.id)} aria-label={`Quitar ${x.titulo}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gris hover:bg-crema"><Trash2 size={18} /></button>
                </article>
              )
            })}
            <Link to="/obras" className="inline-block pt-2 text-sm font-semibold underline">Agregar más obras</Link>
          </section>

          <form onSubmit={confirmar} className="min-w-0 flex-[1_1_340px] space-y-4 rounded-[28px] bg-white p-5 md:p-6">
            <div className="flex items-baseline justify-between">
              <span className="text-gris">{cantidad} {cantidad === 1 ? 'obra' : 'obras'}</span>
              <span className="text-3xl font-bold tracking-tight">{precio(total) || '—'}</span>
            </div>
            <fieldset className="space-y-2">
              <legend className="etiqueta mb-2">Entrega</legend>
              {ENTREGAS.map(op => (
                <label key={op.id} className={`flex cursor-pointer items-start gap-3 rounded-2xl p-3 ring-1 ${form.entrega === op.id ? 'bg-mostaza-fondo ring-mostaza' : 'ring-crema-borde'}`}>
                  <input type="radio" name="entrega" value={op.id} checked={form.entrega === op.id} onChange={c('entrega')} className="mt-1 accent-[#17181b]" />
                  <span><span className="block font-semibold">{op.t}</span><span className="block text-sm text-gris">{op.d}</span></span>
                </label>
              ))}
            </fieldset>
            {form.entrega === 'envio' && <label className="etiqueta">Dirección de entrega (opcional)<textarea rows={2} value={form.direccion} onChange={c('direccion')} className="campo mt-1.5" /></label>}
            <label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={form.instalacion} onChange={e => setForm(f => ({ ...f, instalacion: e.target.checked }))} className="h-5 w-5 accent-[#17181b]" />Quiero instalación (se cotiza aparte)</label>
            <label className="etiqueta">Tu nombre (opcional)<input value={form.nombre} onChange={c('nombre')} autoComplete="name" className="campo mt-1.5" /></label>
            <label className="etiqueta">Notas (opcional)<textarea rows={2} value={form.notas} onChange={c('notas')} className="campo mt-1.5" /></label>
            <button className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#25D366] text-base font-semibold text-white transition hover:brightness-95"><MessageCircle size={20} />Enviar pedido por WhatsApp</button>
            <p className="flex gap-2.5 text-[13px] leading-relaxed text-gris"><Lock size={16} className="mt-0.5 shrink-0" />Se abre WhatsApp con tu pedido ya escrito. Ahí confirmamos disponibilidad, forma de pago y entrega.</p>
          </form>
        </div>
      )}
    </div>
  )
}
