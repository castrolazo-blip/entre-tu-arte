import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Phone, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../../lib/supabase.js'
import { fechaCorta } from '../../../lib/formato.js'
import EncabezadoAdmin from '../EncabezadoAdmin.jsx'

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
                      {wa && <a href={wa} target="_blank" rel="noreferrer" className="btn-contorno btn-chico">WhatsApp</a>}
                      {c.ficha_id && <Link to={`/obra/${c.ficha_id}`} target="_blank" className="btn-contorno btn-chico"><ExternalLink size={16} />Ver obra</Link>}
                    </div>
                    {c.mensaje && <p className="mt-4 whitespace-pre-line rounded-2xl bg-crema-clara p-4 text-[15px]">{c.mensaje}</p>}
                    {c.datos && Object.keys(c.datos).some(k => c.datos[k]) && (
                      <div className="mt-4 flex flex-wrap items-start gap-4">
                        {c.datos.foto_url && <a href={c.datos.foto_url} target="_blank" rel="noreferrer"><img src={c.datos.foto_url} alt="Foto del espacio del cliente" className="h-40 rounded-2xl object-cover" /></a>}
                        <dl className="text-sm">
                          {c.datos.pared_ancho_cm && <p><span className="text-gris">Ancho de pared:</span> {c.datos.pared_ancho_cm} cm</p>}
                          {c.datos.pared_alto_cm && <p><span className="text-gris">Alto de pared:</span> {c.datos.pared_alto_cm} cm</p>}
                          {c.datos.estilo && <p><span className="text-gris">Estilo:</span> {c.datos.estilo}</p>}
                        </dl>
                      </div>
                    )}
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
