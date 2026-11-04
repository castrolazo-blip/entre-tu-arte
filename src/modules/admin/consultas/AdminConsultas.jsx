import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Phone, ExternalLink, Sparkles, Copy, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../../lib/supabase.js'
import { fechaCorta } from '../../../lib/formato.js'
import EncabezadoAdmin from '../EncabezadoAdmin.jsx'
import { promptMontaje, FORMATOS, SEGUIMIENTO } from './promptMontaje.js'
import { mensajesWhatsApp } from './mensajesWhatsApp.js'
import MenuWhatsApp from '../../../components/admin/MenuWhatsApp.jsx'

const TIPOS = { compra: 'Compra', reserva: 'Reserva', encargo: 'Encargo', asesoria: 'Asesoría', contacto: 'Contacto' }
const ESTADOS = [['nueva', 'Nueva'], ['en_proceso', 'En proceso'], ['cerrada', 'Cerrada']]

// Bandeja de solicitudes de clientes. La galería responde directamente al cliente;
// los artistas nunca reciben los datos de contacto del cliente.
export default function AdminConsultas() {
  const [consultas, setConsultas] = useState(null)
  const [filtro, setFiltro] = useState('nueva')
  const [abierta, setAbierta] = useState(null)

  async function cargar() {
    const { data, error } = await supabase.from('consultas').select('*').order('created_at', { ascending: false }).limit(500)
    if (error) toast.error('No se pudieron cargar las consultas')
    setConsultas(data || [])
  }
  useEffect(() => { cargar() }, [])
  const lista = useMemo(() => (consultas || []).filter(c => !filtro || c.estado === filtro), [consultas, filtro])

  async function cambiarEstado(c, estado) {
    const { error } = await supabase.from('consultas').update({ estado }).eq('id', c.id)
    if (error) { toast.error('No se pudo actualizar'); return }
    setConsultas(cs => cs.map(x => x.id === c.id ? { ...x, estado } : x))
  }

  async function reservarObra(c) {
    if (!c.ficha_id) return
    const { error } = await supabase.from('fichas').update({ estado: 'reservada', reservada_hasta: new Date(Date.now() + 48 * 3600e3).toISOString() }).eq('id', c.ficha_id)
    if (error) toast.error('No se pudo reservar'); else { toast.success('Obra reservada por 48 horas'); cambiarEstado(c, 'en_proceso') }
  }

  return (
    <>
      <EncabezadoAdmin ruta="Clientes" titulo="Consultas" />
      <div className="mb-4 flex flex-wrap gap-2">
        {[['', 'Todas'], ...ESTADOS].map(([v, t]) => (
          <button key={v} onClick={() => setFiltro(v)} className={`chip ${filtro === v ? 'chip-on' : 'chip-off'}`}>{t}{consultas && <span className="ml-1.5 opacity-60">{v ? consultas.filter(c => c.estado === v).length : consultas.length}</span>}</button>
        ))}
      </div>
      {!consultas ? <p className="p-6 text-gris">Cargando…</p> : !lista.length ? <p className="rounded-[28px] bg-white p-10 text-center text-gris">No hay consultas aquí.</p> : (
        <div className="space-y-3">
          {lista.map(c => {
            const abierto = abierta === c.id
            const wa = c.telefono ? `https://wa.me/${c.telefono.replace(/\D/g, '').replace(/^(\d{8})$/, '503$1')}` : null
            return (
              <article key={c.id} className="rounded-[24px] bg-white">
                <button onClick={() => setAbierta(abierto ? null : c.id)} aria-expanded={abierto} className="flex w-full flex-wrap items-center gap-3 p-4 text-left md:p-5">
                  <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${c.tipo === 'compra' ? 'bg-mostaza' : c.tipo === 'reserva' ? 'bg-tinta text-white' : 'bg-crema'}`}>{TIPOS[c.tipo] || c.tipo}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate font-bold">{c.nombre}</span><span className="block truncate text-sm text-gris">{c.ficha_titulo || c.mensaje || '—'}</span></span>
                  <span className="text-xs text-gris">{fechaCorta(c.created_at)}</span>
                  {c.estado === 'nueva' && <span className="h-2.5 w-2.5 rounded-full bg-mostaza" aria-label="Nueva" />}
                </button>
                {abierto && (
                  <div className="border-t border-[#efebe4] p-4 md:p-5">
                    <div className="flex flex-wrap gap-2">
                      {c.email && <a href={`mailto:${c.email}?subject=${encodeURIComponent('Entre tu Arte · ' + (c.ficha_titulo || 'Tu consulta'))}`} className="btn-contorno btn-chico"><Mail size={16} />{c.email}</a>}
                      {c.telefono && <a href={`tel:${c.telefono}`} className="btn-contorno btn-chico"><Phone size={16} />{c.telefono}</a>}
                      {wa && <MenuWhatsApp telefono={c.telefono} nombre={c.nombre} opciones={mensajesWhatsApp(c).map(o => o.clausula ? { ...o, destacado: true, nota: 'Incluye cláusula de propiedad de la propuesta' } : o)} />}
                      {c.ficha_id && <Link to={`/obra/${c.ficha_id}`} target="_blank" className="btn-contorno btn-chico"><ExternalLink size={16} />Ver obra</Link>}
                    </div>
                    {c.mensaje && <p className="mt-4 whitespace-pre-line rounded-2xl bg-crema-clara p-4 text-[15px]">{c.mensaje}</p>}
                    {c.datos?.pedido && (
                      <div className="mt-4 rounded-2xl bg-mostaza-fondo p-4 text-sm">
                        <p className="font-bold">Pedido{c.datos.canal === 'whatsapp' ? ' · enviado por WhatsApp (el cliente te escribe ahí)' : ''}</p>
                        <ul className="mt-2 space-y-1">
                          {(c.datos.items || []).map(it => (
                            <li key={it.id} className="flex justify-between gap-3"><span><Link to={`/obra/${it.id}`} target="_blank" className="underline">{it.titulo}{it.cantidad > 1 ? ` (x${it.cantidad})` : ''}</Link>{it.porPedido && <span className="ml-1.5 rounded-full bg-mostaza px-2 py-0.5 text-[11px] font-bold">Por pedido</span>}</span><span>{it.precio ? `$${Number(it.precio * (it.cantidad || 1)).toLocaleString('en-US')}` : '—'}</span></li>
                          ))}
                        </ul>
                        <p className="mt-2 flex justify-between border-t border-black/10 pt-2 font-bold"><span>Total</span><span>${Number(c.datos.total || 0).toLocaleString('en-US')}</span></p>
                        <p className="mt-2">Entrega: <strong>{c.datos.entrega === 'envio' ? 'Envío a domicilio' : 'Retiro en San Salvador'}</strong>{c.datos.instalacion ? ' · con instalación' : ''}</p>
                        {c.datos.direccion && <p>Dirección: {c.datos.direccion}</p>}
                      </div>
                    )}
                    {c.datos && !c.datos.pedido && Object.keys(c.datos).some(k => c.datos[k]) && (
                      <div className="mt-4 flex flex-wrap items-start gap-4">
                        {c.datos.foto_url && <a href={c.datos.foto_url} target="_blank" rel="noreferrer"><img src={c.datos.foto_url} alt="Foto del espacio del cliente" className="h-40 rounded-2xl object-cover" /></a>}
                        {c.datos.referencia_url && <a href={c.datos.referencia_url} target="_blank" rel="noreferrer" className="relative block"><img src={c.datos.referencia_url} alt="Cuadro de referencia del cliente" className="h-40 rounded-2xl object-cover" /><span className="absolute left-2 top-2 rounded-full bg-mostaza px-2.5 py-0.5 text-[11px] font-bold">Referencia</span></a>}
                        <dl className="text-sm">
                          {c.datos.espacio && <p><span className="text-gris">Espacio:</span> {c.datos.espacio}</p>}
                          {c.datos.pared_ancho_cm && <p><span className="text-gris">Ancho de pared:</span> {c.datos.pared_ancho_cm} cm</p>}
                          {c.datos.pared_alto_cm && <p><span className="text-gris">Alto de pared:</span> {c.datos.pared_alto_cm} cm</p>}
                          {(c.datos.cuadro_ancho_cm || c.datos.cuadro_alto_cm) && <p><span className="text-gris">Cuadro que imagina:</span> {[c.datos.cuadro_ancho_cm && `${c.datos.cuadro_ancho_cm} cm de ancho`, c.datos.cuadro_alto_cm && `${c.datos.cuadro_alto_cm} cm de alto`].filter(Boolean).join(' × ')}</p>}
                          {c.datos.estilo && <p><span className="text-gris">Estilo:</span> {c.datos.estilo}</p>}
                          {c.datos.colores && <p><span className="text-gris">Colores:</span> {c.datos.colores}</p>}
                          {c.datos.formato && <p><span className="text-gris">Formato que prefiere:</span> {FORMATOS[c.datos.formato]}</p>}
                        </dl>
                      </div>
                    )}
                    {c.tipo === 'asesoria' && <PromptMontaje consulta={c} />}
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <label className="text-sm font-semibold">Estado
                        <select value={c.estado} onChange={e => cambiarEstado(c, e.target.value)} className="ml-2 h-10 rounded-full border border-crema-borde px-3">{ESTADOS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>
                      </label>
                      {c.tipo === 'reserva' && c.ficha_id && <button onClick={() => reservarObra(c)} className="btn-primario btn-chico">Reservar la obra 48 h</button>}
                    </div>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </>
  )
}

// Prompt listo para que una IA de imágenes haga el montaje del cuadro en la foto del cliente
function PromptMontaje({ consulta }) {
  // Formato: el que pidió el cliente; el administrador puede cambiarlo antes de copiar
  const [formato, setFormato] = useState(consulta.datos?.formato || '')
  const texto = promptMontaje(consulta, formato)
  const [abierto, setAbierto] = useState(false)
  async function copiar(t = texto, aviso = 'Prompt copiado') {
    try { await navigator.clipboard.writeText(t); toast.success(aviso) } catch { setAbierto(true); toast('Selecciona el texto y cópialo') }
  }
  return (
    <div className="mt-4 rounded-2xl bg-mostaza-fondo p-4 ring-1 ring-mostaza">
      <p className="flex items-center gap-2 font-bold"><Sparkles size={17} />Montaje con IA</p>
      <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-sm">
        <li>Copia el prompt{consulta.datos?.foto_url ? ' y descarga la foto del cliente' : ''}.</li>
        <li>Abre ChatGPT o Gemini, adjunta la foto{consulta.ficha_id ? ' y la foto de la obra' : consulta.datos?.referencia_url ? ' y después la imagen de referencia' : ''}, y pega el prompt.</li>
        <li>Envía la imagen al cliente por WhatsApp con tu propuesta.</li>
      </ol>
      <p className="mt-3 text-sm font-semibold">Formato del cuadro{consulta.datos?.formato ? ` (el cliente prefiere: ${FORMATOS[consulta.datos.formato]})` : ''}</p>
      <div role="radiogroup" aria-label="Formato del cuadro" className="mt-1.5 flex flex-wrap gap-1.5">
        {Object.entries(FORMATOS).map(([v, t]) => (
          <button key={v} type="button" role="radio" aria-checked={formato === v} onClick={() => setFormato(v)}
            className={`h-9 rounded-full px-3.5 text-xs font-bold ring-1 ${formato === v ? 'bg-tinta text-white ring-tinta' : 'bg-white ring-crema-borde'}`}>{t}</button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => copiar()} className="btn-oscuro btn-chico"><Copy size={15} />Copiar prompt</button>
        {consulta.datos?.foto_url && <a href={consulta.datos.foto_url} target="_blank" rel="noreferrer" download className="btn-contorno btn-chico"><Download size={15} />Foto del cliente</a>}
        {consulta.datos?.referencia_url && <a href={consulta.datos.referencia_url} target="_blank" rel="noreferrer" download className="btn-contorno btn-chico"><Download size={15} />Imagen de referencia</a>}
        {consulta.ficha_id && <Link to={`/obra/${consulta.ficha_id}`} target="_blank" className="btn-contorno btn-chico"><ExternalLink size={15} />Foto de la obra</Link>}
        <button type="button" onClick={() => setAbierto(a => !a)} className="text-sm font-semibold underline">{abierto ? 'Ocultar' : 'Ver'} prompt</button>
      </div>
      {abierto && <textarea readOnly value={texto} rows={14} className="campo mt-3 text-[13px] leading-relaxed" onFocus={e => e.target.select()} />}
      <p className="mt-4 text-sm font-semibold">Ajustes (pégalos en el mismo chat, debajo de la imagen)</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {SEGUIMIENTO.map(([t, p]) => (
          <button key={t} type="button" onClick={() => copiar(p, `Copiado: ${t}`)} title={p} className="flex h-9 items-center gap-1 rounded-full bg-white px-3.5 text-xs font-bold ring-1 ring-crema-borde"><Copy size={12} />{t}</button>
        ))}
      </div>
    </div>
  )
}
