import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ImagePlus, Plus, Trash2, Check, Loader2, Palette, Frame } from 'lucide-react'
import toast from 'react-hot-toast'
import BotonArchivo from '../../components/admin/BotonArchivo.jsx'
import { enviarSolicitudes } from './marketplaceService.js'

const numeroPrecio = v => Number(String(v).replace(/[^0-9.]/g, '')) || 0

const cuadroVacio = () => ({ id: Math.random().toString(36).slice(2), archivos: [], vistas: [], titulo: '', autor: '', anonimo: false, tecnica: '', alto: '', ancho: '', precio: '', descripcion: '', notas: '' })

// Formulario para artistas y personas que quieren vender sus cuadros a través de Entre tu Arte.
// Los datos del vendedor nunca se publican; el comprador solo trata con la página.
export default function Vender() {
  const [vendedor, setVendedor] = useState({ tipo: 'artista', nombre: '', telefono: '', email: '' })
  const [cuadros, setCuadros] = useState([cuadroVacio()])
  const [acepto, setAcepto] = useState(false)
  const [enviando, setEnviando] = useState(0)   // 0 = no; n = cuadro que se está enviando
  const [listo, setListo] = useState(false)

  const v = k => e => setVendedor(x => ({ ...x, [k]: e.target.value }))
  const cambiar = (id, k, valor) => setCuadros(l => l.map(c => c.id === id ? { ...c, [k]: valor } : c))
  function agregarFotos(id, archivos) {
    setCuadros(l => l.map(c => {
      if (c.id !== id) return c
      const nuevos = archivos.slice(0, 3 - c.archivos.length)
      return { ...c, archivos: [...c.archivos, ...nuevos], vistas: [...c.vistas, ...nuevos.map(a => URL.createObjectURL(a))] }
    }))
  }
  const quitarFoto = (id, i) => setCuadros(l => l.map(c => c.id === id ? { ...c, archivos: c.archivos.filter((_, j) => j !== i), vistas: c.vistas.filter((_, j) => j !== i) } : c))

  async function enviar(e) {
    e.preventDefault()
    if (!vendedor.nombre.trim()) { toast.error('Escribe tu nombre'); return }
    if (!vendedor.telefono.trim()) { toast.error('Déjanos tu WhatsApp para contactarte'); return }
    const sinFoto = cuadros.findIndex(c => !c.archivos.length)
    if (sinFoto >= 0) { toast.error(`Agrega al menos una foto del cuadro ${sinFoto + 1}`); return }
    const sinArtista = vendedor.tipo === 'coleccionista' ? cuadros.findIndex(c => !c.anonimo && !c.autor.trim()) : -1
    if (sinArtista >= 0) { toast.error(`Cuadro ${sinArtista + 1}: escribe el artista o marca "No sé quién es el artista"`); return }
    const sinPrecio = cuadros.findIndex(c => !numeroPrecio(c.precio))
    if (sinPrecio >= 0) { toast.error(`Cuadro ${sinPrecio + 1}: escribe el precio de venta que propones`); return }
    if (!acepto) { toast.error('Para enviar, acepta las Condiciones comerciales'); return }
    setEnviando(1)
    try {
      await enviarSolicitudes(vendedor, cuadros, n => setEnviando(Math.min(n + 1, cuadros.length)))
      setListo(true)
      window.scrollTo(0, 0)
    } catch (err) {
      toast.error(err.message || 'No se pudo enviar. Inténtalo otra vez.')
    } finally { setEnviando(0) }
  }

  if (listo) return (
    <div className="contenedor flex min-h-[70vh] items-center justify-center pb-28 pt-28">
      <div className="max-w-md rounded-[30px] bg-white p-8 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-mostaza"><Check size={32} /></span>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">¡Recibimos tus cuadros!</h1>
        <p className="mt-3 text-gris">Gracias, {vendedor.nombre.split(' ')[0]}. Vamos a revisarlos y te escribiremos por WhatsApp para confirmar el precio de publicación antes de publicarlos.</p>
        <button onClick={() => { setCuadros([cuadroVacio()]); setListo(false); setAcepto(false) }} className="btn-primario mt-6 w-full">Enviar más cuadros</button>
        <Link to="/marketplace" className="mt-4 inline-block text-sm font-semibold underline">Ver el Marketplace</Link>
      </div>
    </div>
  )

  return (
    <div className="contenedor pb-28 pt-28 md:pt-36">
      <p className="text-[13px] font-bold uppercase tracking-[0.16em] text-gris">Marketplace</p>
      <h1 className="mt-2 text-[42px] font-medium leading-none tracking-[-0.045em] md:text-[64px]">Vende tus <em className="font-bold text-mostaza">cuadros</em></h1>
      <span aria-hidden="true" className="acento mb-6 mt-4" />
      <ol className="mb-8 grid max-w-3xl gap-2 text-[15px] md:grid-cols-2">
        {['Nos envías fotos, medidas y el precio de venta que propones', 'Revisamos el cuadro y acordamos contigo el precio de publicación', 'Publicamos tu obra, atendemos a los compradores y te pagamos al concretarse la venta'].map((t, n) => (
          <li key={t} className="flex gap-3 rounded-[20px] bg-white p-4"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-tinta text-xs font-bold text-white">{n + 1}</span>{t}</li>
        ))}
        <li>
          <Link to="/condiciones-artistas" target="_blank" className="flex h-full gap-3 rounded-[20px] bg-mostaza-fondo p-4 ring-1 ring-mostaza">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-mostaza text-xs font-bold text-tinta">4</span>
            <span>Conoce las <strong className="underline decoration-tinta/40 underline-offset-4">condiciones comerciales</strong>: comisión, pagos, entrega y responsabilidades</span>
          </Link>
        </li>
      </ol>

      <form onSubmit={enviar} className="max-w-3xl space-y-5">
        <section className="space-y-4 rounded-[26px] bg-white p-5 md:p-6">
          <h2 className="text-lg font-bold">Tus datos</h2>
          <div role="radiogroup" aria-label="Quién vende" className="grid grid-cols-2 gap-2">
            {[['artista', 'Soy artista', Palette], ['coleccionista', 'Tengo cuadros para vender', Frame]].map(([val, t, Icono]) => (
              <button key={val} type="button" role="radio" aria-checked={vendedor.tipo === val} onClick={() => setVendedor(x => ({ ...x, tipo: val }))}
                className={`flex min-h-[56px] items-center justify-center gap-2 rounded-2xl px-3 text-center text-sm font-bold ring-1 ${vendedor.tipo === val ? 'bg-tinta text-white ring-tinta' : 'bg-crema-clara ring-crema-borde'}`}>
                <Icono size={18} />{t}
              </button>
            ))}
          </div>
          <label className="etiqueta">{vendedor.tipo === 'artista' ? 'Tu nombre de artista' : 'Tu nombre'}<input value={vendedor.nombre} onChange={v('nombre')} autoComplete="name" className="campo mt-1.5" /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="etiqueta">WhatsApp<input type="tel" value={vendedor.telefono} onChange={v('telefono')} autoComplete="tel" placeholder="7777-7777" className="campo mt-1.5" /></label>
            <label className="etiqueta">Correo (opcional)<input type="email" value={vendedor.email} onChange={v('email')} autoComplete="email" className="campo mt-1.5" /></label>
          </div>
          <p className="text-xs text-gris">Tus datos no se publican. Solo Entre tu Arte los usa para contactarte.</p>
        </section>

        {cuadros.map((c, n) => (
          <section key={c.id} className="space-y-4 rounded-[26px] bg-white p-5 md:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Cuadro {n + 1}</h2>
              {cuadros.length > 1 && <button type="button" onClick={() => setCuadros(l => l.filter(x => x.id !== c.id))} aria-label={`Quitar cuadro ${n + 1}`} className="flex h-10 w-10 items-center justify-center rounded-full text-red-700"><Trash2 size={18} /></button>}
            </div>
            <div>
              <p className="etiqueta mb-2">Fotos (1 a 3): de frente, con buena luz</p>
              <div className="grid grid-cols-3 gap-3">
                {c.vistas.map((src, i) => (
                  <div key={src} className="relative aspect-square overflow-hidden rounded-2xl">
                    <img src={src} alt="" className="h-full w-full object-cover" />
                    <button type="button" onClick={() => quitarFoto(c.id, i)} aria-label="Quitar foto" className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/95"><Trash2 size={14} /></button>
                  </div>
                ))}
                {c.archivos.length < 3 && (
                  <BotonArchivo multiple onArchivos={a => agregarFotos(c.id, a)} className="flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-crema-borde text-xs font-semibold text-gris">
                    <ImagePlus size={22} />Agregar fotos
                  </BotonArchivo>
                )}
              </div>
            </div>
            {vendedor.tipo === 'artista' ? (
              <p className="rounded-2xl bg-crema-clara px-4 py-3 text-sm">Artista: <strong>{vendedor.nombre.trim() || 'tu nombre'}</strong></p>
            ) : (
              <div className="space-y-2">
                <label className="etiqueta">Artista que lo pintó
                  <input value={c.anonimo ? '' : c.autor} disabled={c.anonimo} onChange={e => cambiar(c.id, 'autor', e.target.value)}
                    placeholder={c.anonimo ? 'Anónimo' : 'Nombre del artista'} className="campo mt-1.5 disabled:opacity-60" />
                </label>
                <label className="flex items-center gap-2.5 text-sm font-semibold">
                  <input type="checkbox" checked={c.anonimo} onChange={e => cambiar(c.id, 'anonimo', e.target.checked)} className="h-5 w-5 accent-[#17181b]" />
                  No sé quién es el artista (anónimo)
                </label>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="etiqueta">Nombre del cuadro (opcional)<input value={c.titulo} onChange={e => cambiar(c.id, 'titulo', e.target.value)} className="campo mt-1.5" /></label>
              <label className="etiqueta">Técnica (opcional)<input value={c.tecnica} onChange={e => cambiar(c.id, 'tecnica', e.target.value)} placeholder="Óleo, acrílico…" className="campo mt-1.5" /></label>
              <label className="etiqueta">Alto (cm)<input inputMode="decimal" value={c.alto} onChange={e => cambiar(c.id, 'alto', e.target.value)} className="campo mt-1.5" /></label>
              <label className="etiqueta">Ancho (cm)<input inputMode="decimal" value={c.ancho} onChange={e => cambiar(c.id, 'ancho', e.target.value)} className="campo mt-1.5" /></label>
              <label className="etiqueta sm:col-span-2">Precio de venta que propones (USD)<input inputMode="decimal" value={c.precio} onChange={e => cambiar(c.id, 'precio', e.target.value)} placeholder="Ej. 500" className="campo mt-1.5 text-lg font-bold" />
                <span className="mt-1.5 block text-sm font-normal text-gris">La comisión de Entre tu Arte se acuerda contigo antes de publicar la obra.</span>
              </label>
              <label className="etiqueta sm:col-span-2">Cuéntanos del cuadro (opcional)<textarea rows={3} value={c.descripcion} onChange={e => cambiar(c.id, 'descripcion', e.target.value)} placeholder="Año, estado, si tiene marco, firma…" className="campo mt-1.5" /></label>
            </div>
          </section>
        ))}

        <button type="button" onClick={() => setCuadros(l => [...l, cuadroVacio()])} className="btn-contorno h-14 w-full"><Plus size={18} />Agregar otro cuadro</button>

        <section className="rounded-[22px] bg-mostaza-fondo p-5 text-[15px] ring-1 ring-mostaza">
          <h2 className="font-bold">Condiciones comerciales, en resumen</h2>
          <ul className="mt-2 space-y-1.5">
            {['Inscripción y publicación gratuitas; Entre tu Arte selecciona las obras que publica.',
              'La comisión sobre el precio de venta se acuerda contigo antes de publicar cada obra.',
              'Te pagamos dentro de 7 días hábiles después del pago completo del comprador y la entrega.',
              'Sin exclusividad. La obra queda contigo hasta la venta; avísanos si deja de estar disponible.',
              'El transporte lo paga el comprador. Los compradores tratan solo con Entre tu Arte y tus datos no se publican.'].map(t => (
              <li key={t} className="flex gap-2"><span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-tinta" />{t}</li>
            ))}
          </ul>
          <Link to="/condiciones-artistas" target="_blank" className="mt-3 inline-block font-semibold underline decoration-tinta/40 underline-offset-4">Leer las condiciones completas</Link>
        </section>
        <label className="flex cursor-pointer gap-3 rounded-[22px] bg-white p-4 text-sm leading-relaxed">
          <input type="checkbox" checked={acepto} onChange={e => setAcepto(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[#17181b]" />
          <span>He leído y acepto las <Link to="/condiciones-artistas" target="_blank" className="font-semibold underline">Condiciones comerciales para artistas</Link> y confirmo que la información y las fotos que envío son verdaderas y que puedo vender estas obras.</span>
        </label>
        <button disabled={!!enviando} className="btn-primario h-16 w-full text-[17px]">
          {enviando ? <><Loader2 size={20} className="animate-spin" />Enviando cuadro {enviando} de {cuadros.length}…</> : `Enviar ${cuadros.length === 1 ? 'mi cuadro' : `mis ${cuadros.length} cuadros`}`}
        </button>
      </form>
    </div>
  )
}
