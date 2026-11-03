import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, MessageCircle, Mail, Check, X, Copy, Pencil, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../../lib/supabase.js'
import { precio, medidasTexto, fechaCorta } from '../../../lib/formato.js'
import { useConfig } from '../../../context/ConfigContext.jsx'
import { faltanColumnasTipo, sinCamposTipo } from '../../../components/admin/SelectorTipoObra.jsx'
import EncabezadoAdmin from '../EncabezadoAdmin.jsx'

const PESTANAS = [['pendiente', 'Por revisar'], ['publicada', 'Publicadas'], ['rechazada', 'Rechazadas'], ['', 'Todas']]
const enPestana = (s, p) => !p || (p === 'publicada' ? ['aprobada', 'pagada'].includes(s.estado) : s.estado === p)
const waVendedor = tel => { const n = String(tel || '').replace(/\D/g, ''); return n ? `https://wa.me/${n.length === 8 ? '503' + n : n}` : null }
const redondear = v => Math.ceil(v / 5) * 5

// Cuadros que mandan artistas y coleccionistas desde /vender. Se revisan, se les pone precio de
// venta (precio deseado + comisión) y se publican en el Marketplace. Los datos del vendedor y lo
// que recibe nunca se publican.
export default function AdminMarketplace() {
  const { cfg } = useConfig()
  const [solicitudes, setSolicitudes] = useState(null)
  const [fichas, setFichas] = useState({})
  const [pestana, setPestana] = useState('pendiente')
  const [error, setError] = useState('')

  async function cargar() {
    const { data, error: e } = await supabase.from('marketplace_solicitudes').select('*').order('created_at', { ascending: false })
    if (e) {
      setError(/marketplace_solicitudes|schema cache|does not exist/i.test(e.message) ? 'Falta activar el Marketplace en la base de datos: ejecuta docs/ACTUALIZAR_BASE.sql en Supabase › SQL Editor.' : e.message)
      setSolicitudes([]); return
    }
    setSolicitudes(data || [])
    const ids = (data || []).map(s => s.ficha_id).filter(Boolean)
    if (ids.length) {
      const { data: fs } = await supabase.from('fichas').select('id, estado, precio, titulo').in('id', ids)
      setFichas(Object.fromEntries((fs || []).map(f => [String(f.id), f])))
    }
  }
  useEffect(() => { cargar() }, [])

  const lista = useMemo(() => (solicitudes || []).filter(s => enPestana(s, pestana)), [solicitudes, pestana])
  const porPagar = (solicitudes || []).filter(s => s.estado === 'aprobada' && fichas[s.ficha_id]?.estado === 'vendida')

  async function actualizar(s, cambios, mensaje) {
    const { error: e } = await supabase.from('marketplace_solicitudes').update({ ...cambios, actualizado: new Date().toISOString() }).eq('id', s.id)
    if (e) { toast.error('No se pudo guardar: ' + e.message); return false }
    if (mensaje) toast.success(mensaje)
    cargar()
    return true
  }

  function copiarEnlace() {
    const url = `${window.location.origin}${import.meta.env.BASE_URL}vender`
    navigator.clipboard?.writeText(url).then(() => toast.success('Enlace copiado: compártelo con artistas y vendedores')).catch(() => toast(url))
  }

  return (
    <>
      <EncabezadoAdmin ruta="Catálogo" titulo="Marketplace">
        <button onClick={copiarEnlace} className="btn-contorno btn-chico"><Copy size={16} />Enlace para vendedores</button>
        <Link to="/marketplace" target="_blank" className="btn-contorno btn-chico"><ExternalLink size={16} />Ver Marketplace</Link>
      </EncabezadoAdmin>

      {error && <p role="alert" className="mb-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</p>}
      {porPagar.length > 0 && (
        <p className="mb-4 rounded-2xl bg-mostaza-fondo p-4 text-sm ring-1 ring-mostaza">
          <strong>{porPagar.length} {porPagar.length === 1 ? 'cuadro vendido' : 'cuadros vendidos'} por pagar al vendedor</strong> ({precio(porPagar.reduce((t, s) => t + (Number(s.precio_deseado) || 0), 0))}). Están en "Publicadas".
        </p>
      )}

      <div className="sin-scroll mb-4 flex gap-2 overflow-x-auto">
        {PESTANAS.map(([v, t]) => (
          <button key={v} onClick={() => setPestana(v)} className={`chip ${pestana === v ? 'chip-on' : 'chip-off'}`}>
            {t}{solicitudes && <span className="ml-1.5 opacity-60">{(solicitudes || []).filter(s => enPestana(s, v)).length}</span>}
          </button>
        ))}
      </div>

      {!solicitudes ? <p className="p-6 text-gris">Cargando…</p> : !lista.length ? (
        <div className="rounded-[28px] bg-white p-10 text-center text-gris">
          <p>{pestana === 'pendiente' ? 'No hay cuadros por revisar.' : 'No hay cuadros aquí.'}</p>
          <button onClick={copiarEnlace} className="btn-primario mt-5"><Copy size={18} />Copiar enlace para vendedores</button>
        </div>
      ) : (
        <ul className="space-y-4">
          {lista.map(s => <Solicitud key={s.id} s={s} ficha={fichas[s.ficha_id]} comision={Number(cfg.marketplace_comision) || 0} actualizar={actualizar} recargar={cargar} />)}
        </ul>
      )}
    </>
  )
}

function Solicitud({ s, ficha, comision, actualizar, recargar }) {
  const sugerido = s.precio_deseado ? redondear(Number(s.precio_deseado) * (1 + comision / 100)) : ''
  const [f, setF] = useState({
    titulo: s.titulo || '', precio: sugerido, credito: s.tipo_vendedor === 'artista' ? s.nombre : 'Colección privada',
  })
  const [publicando, setPublicando] = useState(false)
  const medidas = medidasTexto({ alto_cm: s.alto_cm, ancho_cm: s.ancho_cm, piezas: s.piezas })
  const ganancia = Number(f.precio) && s.precio_deseado ? Number(f.precio) - Number(s.precio_deseado) : null
  const wa = waVendedor(s.telefono)
  const vendida = ficha?.estado === 'vendida'

  async function publicar() {
    const precioVenta = Number(String(f.precio).replace(/[^0-9.]/g, ''))
    if (!precioVenta) { toast.error('Pon el precio de venta'); return }
    setPublicando(true)
    const registro = {
      titulo: f.titulo.trim() || null, descripcion: s.descripcion || null, tecnica: s.tecnica || null,
      alto_cm: s.alto_cm, ancho_cm: s.ancho_cm, piezas: s.piezas || 1, medidas: medidas || null,
      precio: precioVenta, fotos: s.fotos || [], imagen_url: s.fotos?.[0]?.url || null,
      artista_nombre: f.credito.trim() || null, origen: 'marketplace', estado: 'disponible', existencias: 1, categorias: [],
    }
    let { data, error } = await supabase.from('fichas').insert(registro).select('id').single()
    if (error && faltanColumnasTipo(error)) ({ data, error } = await supabase.from('fichas').insert(sinCamposTipo(registro)).select('id').single())
    if (error) {
      setPublicando(false)
      toast.error(/origen/.test(error.message) ? 'Falta activar el Marketplace: ejecuta docs/ACTUALIZAR_BASE.sql en Supabase.' : 'No se pudo publicar: ' + error.message, { duration: 8000 })
      return
    }
    const pct = s.precio_deseado ? Math.round((precioVenta / Number(s.precio_deseado) - 1) * 1000) / 10 : null
    await actualizar(s, { estado: 'aprobada', ficha_id: String(data.id), precio_publicado: precioVenta, comision_pct: pct }, 'Publicado en el Marketplace. Puedes completarlo con IA en Obras › Editar.')
    setPublicando(false)
  }

  async function eliminar() {
    if (!window.confirm('¿Eliminar esta solicitud? No se puede deshacer.')) return
    const { error } = await supabase.from('marketplace_solicitudes').delete().eq('id', s.id)
    if (error) toast.error('No se pudo eliminar'); else { toast.success('Solicitud eliminada'); recargar() }
  }

  return (
    <li className="rounded-[24px] bg-white p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-gris">{fechaCorta(s.created_at)} · {s.tipo_vendedor === 'artista' ? 'Artista' : 'Coleccionista / particular'}</p>
        <EstadoSolicitud s={s} ficha={ficha} />
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto">
        {(s.fotos || []).map(x => (
          <a key={x.url} href={x.url} target="_blank" rel="noreferrer" className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-crema">
            <img src={x.url} alt="" className="h-full w-full object-cover" />
          </a>
        ))}
      </div>
      <h3 className="mt-3 text-lg font-bold">{s.titulo || 'Sin nombre'}</h3>
      <p className="text-sm text-gris">{[s.tecnica, medidas].filter(Boolean).join(' · ') || 'Sin medidas'}</p>
      {s.descripcion && <p className="mt-2 whitespace-pre-line text-sm">{s.descripcion}</p>}

      <div className="mt-3 grid gap-2 rounded-2xl bg-crema-clara p-3 text-sm sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold text-gris">Vendedor (privado)</p>
          <p className="font-bold">{s.nombre}</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {wa && <a href={wa} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-full bg-[#25D366] px-3 py-1 text-xs font-bold text-white"><MessageCircle size={13} />{s.telefono}</a>}
            {s.email && <a href={`mailto:${s.email}`} className="flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-bold"><Mail size={13} />{s.email}</a>}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-gris">Quiere recibir</p>
          <p className="text-xl font-bold">{precio(s.precio_deseado) || 'No indicó'}</p>
          {s.precio_publicado && <p className="text-xs text-gris">Publicado a {precio(s.precio_publicado)}{s.comision_pct != null ? ` · comisión ${s.comision_pct}%` : ''}</p>}
        </div>
      </div>

      {s.estado === 'pendiente' && (
        <div className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="etiqueta">Nombre público<input value={f.titulo} onChange={e => setF(x => ({ ...x, titulo: e.target.value }))} placeholder="Puedes completarlo con IA después" className="campo mt-1.5" /></label>
            <label className="etiqueta">Crédito público<input value={f.credito} onChange={e => setF(x => ({ ...x, credito: e.target.value }))} className="campo mt-1.5" /></label>
            <label className="etiqueta">Precio de venta (USD)<input inputMode="decimal" value={f.precio} onChange={e => setF(x => ({ ...x, precio: e.target.value }))} className="campo mt-1.5 font-bold" /></label>
          </div>
          {ganancia != null && <p className="text-sm">Tu ganancia: <strong>{precio(ganancia)}</strong>{s.precio_deseado ? ` (${Math.round(ganancia / Number(s.precio_deseado) * 100)}% sobre lo que pide)` : ''}. El público solo ve el precio de venta.</p>}
          <div className="flex flex-wrap gap-2">
            <button onClick={publicar} disabled={publicando} className="btn-primario h-12 flex-1">{publicando ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}Aprobar y publicar</button>
            <button onClick={() => actualizar(s, { estado: 'rechazada' }, 'Solicitud rechazada')} className="h-12 rounded-full px-5 text-sm font-bold text-red-700 ring-1 ring-red-200"><X size={16} className="mr-1 inline" />Rechazar</button>
          </div>
        </div>
      )}

      {s.estado === 'aprobada' && (
        <div className="mt-4 flex flex-wrap gap-2">
          {vendida && <button onClick={() => actualizar(s, { estado: 'pagada' }, 'Marcado como pagado al vendedor')} className="btn-oscuro h-11 px-4 text-sm"><Check size={16} />Ya le pagué {precio(s.precio_deseado)}</button>}
          {s.ficha_id && <Link to={`/obra/${s.ficha_id}`} target="_blank" className="btn-contorno btn-chico"><ExternalLink size={15} />Ver en la tienda</Link>}
          <Link to="/admin/obras" className="btn-contorno btn-chico"><Pencil size={15} />Editar en Obras</Link>
        </div>
      )}
      {s.estado === 'rechazada' && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => actualizar(s, { estado: 'pendiente' }, 'Vuelve a "Por revisar"')} className="btn-contorno btn-chico">Volver a revisar</button>
          <button onClick={eliminar} className="h-10 rounded-full px-4 text-sm font-bold text-red-700">Eliminar</button>
        </div>
      )}
    </li>
  )
}

function EstadoSolicitud({ s, ficha }) {
  const [texto, clase] = s.estado === 'pendiente' ? ['Por revisar', 'bg-mostaza text-tinta']
    : s.estado === 'rechazada' ? ['Rechazada', 'bg-crema text-gris']
    : s.estado === 'pagada' ? ['Vendida y pagada', 'bg-green-100 text-green-800']
    : ficha?.estado === 'vendida' ? ['Vendida · falta pagar al vendedor', 'bg-red-100 text-red-800']
    : ficha?.estado === 'reservada' ? ['Reservada', 'bg-mostaza-fondo text-tinta']
    : ['Publicada', 'bg-tinta text-white']
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${clase}`}>{texto}</span>
}
