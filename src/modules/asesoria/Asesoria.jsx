import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Camera, Check, Lock, ImagePlus } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase, BUCKET, urlPublica } from '../../lib/supabase.js'
import { enviarConsulta, obtenerObra } from '../catalogo/obrasService.js'
import { registrarEvento } from '../../lib/analytics.js'
import { useConfig, enlaceWhatsApp } from '../../context/ConfigContext.jsx'

const ESTILOS = ['Moderno', 'Minimalista', 'Japandi', 'Clásico', 'Industrial', 'Bohemio', 'No estoy seguro']
export const ESPACIOS = ['Sala', 'Comedor', 'Habitación principal', 'Habitación', 'Oficina', 'Recibidor o entrada', 'Pasillo', 'Otro']

// Asesoría para elegir la obra: el cliente sube la foto de su pared y sus medidas, y el equipo
// le responde con recomendaciones. Se guarda como consulta de tipo "asesoria" o "contacto".
export default function Asesoria() {
  const { cfg } = useConfig()
  const [params] = useSearchParams()
  const soloContacto = params.get('tipo') === 'contacto'
  const [obra, setObra] = useState(null)
  const [foto, setFoto] = useState(null)
  const [vista, setVista] = useState('')
  const [referencia, setReferencia] = useState(null)      // imagen de un cuadro que le gusta al cliente
  const [vistaRef, setVistaRef] = useState('')
  const [form, setForm] = useState({ nombre: '', telefono: '', espacio: '', formato: '', ancho: '', alto: '', cuadroAncho: '', cuadroAlto: '', estilo: '', colores: '', mensaje: '' })
  const [enviando, setEnviando] = useState(false)
  const [listo, setListo] = useState(false)

  useEffect(() => { const id = params.get('obra'); if (id) obtenerObra(id).then(setObra).catch(() => {}) }, [params])
  useEffect(() => () => vista && URL.revokeObjectURL(vista), [vista])
  const cambiar = c => e => setForm(f => ({ ...f, [c]: e.target.value }))

  function elegirReferencia(e) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 12 * 1024 * 1024) { toast.error('La imagen es muy pesada (máximo 12 MB)'); return }
    setReferencia(f); setVistaRef(URL.createObjectURL(f))
  }

  function elegirFoto(e) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 12 * 1024 * 1024) { toast.error('La foto es muy pesada (máximo 12 MB)'); return }
    setFoto(f); setVista(URL.createObjectURL(f))
  }

  async function enviar(e) {
    e.preventDefault()
    if (!form.telefono.trim()) { toast.error('Déjanos tu WhatsApp o teléfono para responderte'); return }
    if (!form.mensaje.trim()) { toast.error(soloContacto ? 'Escribe tu mensaje' : 'Cuéntanos qué buscas para preparar tu propuesta'); return }
    setEnviando(true)
    try {
      const subir = async archivo => {
        if (!archivo) return null
        const ext = (archivo.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
        const ruta = `asesorias/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
        const { error } = await supabase.storage.from(BUCKET).upload(ruta, archivo, { contentType: archivo.type })
        if (error) throw error
        return urlPublica(ruta)
      }
      const [fotoUrl, referenciaUrl] = await Promise.all([subir(foto), subir(referencia)])
      await enviarConsulta({
        tipo: soloContacto ? 'contacto' : 'asesoria',
        ficha_id: obra ? String(obra.id) : null, ficha_titulo: obra?.titulo || null,
        nombre: form.nombre.trim(), email: null, telefono: form.telefono.trim() || null,
        mensaje: form.mensaje.trim() || null,
        datos: soloContacto ? {} : { foto_url: fotoUrl, referencia_url: referenciaUrl, espacio: form.espacio || null, pared_ancho_cm: form.ancho || null, pared_alto_cm: form.alto || null, cuadro_ancho_cm: form.cuadroAncho || null, cuadro_alto_cm: form.cuadroAlto || null, estilo: form.estilo || null, colores: form.colores.trim() || null, formato: form.formato || null },
      })
      registrarEvento(soloContacto ? 'contacto' : 'asesoria', '/asesoria', obra?.id, obra?.titulo)
      setListo(true)
    } catch {
      toast.error('No se pudo enviar. Revisa tu conexión e inténtalo otra vez.')
    } finally { setEnviando(false) }
  }

  const wa = enlaceWhatsApp(cfg.whatsapp, 'Hola, quiero asesoría para elegir una obra de Entre tu Arte')

  return (
    <div className="bg-crema pb-24 pt-28 md:pt-36">
      <div className="contenedor flex flex-wrap gap-10 md:gap-14">
        <div className="min-w-0 flex-[1_1_380px]">
          <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-gris">{soloContacto ? 'Contacto' : 'Asesoría gratis'}</p>
          <h1 className="mt-3 text-[46px] font-medium leading-[0.98] tracking-[-0.045em] md:text-[68px]">
            {soloContacto ? <>Hablemos de <em className="font-bold text-mostaza">arte</em></> : <>Encontramos la obra para <em className="font-bold text-mostaza">tu pared</em></>}
          </h1>
          <span aria-hidden="true" className="acento mt-6" />
          <p className="mt-6 max-w-md text-lg leading-relaxed text-gris">
            {soloContacto ? 'Escríbenos y te respondemos lo antes posible.' : 'Sube una foto de tu espacio y sus medidas. Te recomendamos obras, el tamaño ideal y la altura de montaje. Sin costo.'}
          </p>
          {!soloContacto && (
            <ol className="mt-8 space-y-4 text-[17px]">
              {['Sube la foto y las medidas de tu pared', 'Recibe obras recomendadas y el tamaño ideal', 'Compra y cotiza la instalación'].map((t, n) => (
                <li key={t} className="flex items-center gap-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tinta font-bold text-white">{n + 1}</span>{t}</li>
              ))}
            </ol>
          )}
          {obra && (
            <div className="mt-8 flex items-center gap-4 rounded-[22px] bg-white p-3">
              {obra.foto && <img src={obra.foto} alt="" className="h-16 w-20 rounded-2xl object-cover" />}
              <div><p className="text-xs font-bold text-gris">Obra que te interesa</p><p className="font-semibold">{obra.titulo}</p></div>
            </div>
          )}
          {wa && <a href={wa} target="_blank" rel="noreferrer" className="mt-8 inline-block font-semibold underline decoration-mostaza decoration-[3px] underline-offset-[6px]">¿Prefieres WhatsApp? Escríbenos aquí</a>}
        </div>

        <div className="min-w-0 flex-[1_1_480px]">
          {listo ? (
            <div className="rounded-[30px] bg-white p-8 md:p-10">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-mostaza"><Check size={28} /></span>
              <h2 className="mt-6 text-3xl font-semibold tracking-tight">¡Recibimos tu solicitud!</h2>
              <p className="mt-3 text-lg text-gris">Te escribiremos muy pronto con nuestras recomendaciones.</p>
              <Link to="/obras" className="btn-oscuro mt-8">Mientras tanto, ver obras</Link>
            </div>
          ) : (
            <form onSubmit={enviar} className="space-y-4 rounded-[30px] bg-white p-6 md:p-9">
              {!soloContacto && (
                <label className="relative flex cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-[24px] border-2 border-dashed border-crema-borde bg-crema-clara p-6 text-center">
                  {vista ? <img src={vista} alt="Foto de tu pared" className="max-h-60 rounded-2xl object-contain" /> : <Camera size={34} />}
                  <span className="font-semibold">{vista ? 'Cambiar foto' : 'Subir o tomar foto de mi pared'}</span>
                  <input type="file" accept="image/*" onChange={elegirFoto} className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0" />
                </label>
              )}
              {!soloContacto && (
                <label className="relative flex cursor-pointer items-center gap-4 overflow-hidden rounded-[24px] border-2 border-dashed border-crema-borde bg-crema-clara p-4">
                  {vistaRef
                    ? <img src={vistaRef} alt="Cuadro de referencia" className="h-20 w-20 shrink-0 rounded-xl object-cover" />
                    : <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-white"><ImagePlus size={28} /></span>}
                  <span>
                    <span className="block font-semibold">{vistaRef ? 'Cambiar imagen de referencia' : '¿Tienes la foto de un cuadro que te gusta?'}</span>
                    <span className="block text-sm text-gris">Opcional. Súbela y te cotizamos uno inspirado en ella, a tu medida.</span>
                  </span>
                  <input type="file" accept="image/*" onChange={elegirReferencia} className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0" />
                </label>
              )}
              {!soloContacto && (
                <div className="grid grid-cols-2 gap-4">
                  <label className="etiqueta col-span-2">¿En qué espacio irá el cuadro?
                    <select value={form.espacio} onChange={cambiar('espacio')} className="campo mt-1.5"><option value="">Elegir…</option>{ESPACIOS.map(s => <option key={s}>{s}</option>)}</select>
                  </label>
                  <label className="etiqueta">Ancho de la pared (cm, opcional)<input inputMode="decimal" value={form.ancho} onChange={cambiar('ancho')} className="campo mt-1.5" /></label>
                  <label className="etiqueta">Alto de la pared (cm, opcional)<input inputMode="decimal" value={form.alto} onChange={cambiar('alto')} className="campo mt-1.5" /></label>
                  <p className="col-span-2 -mt-1 text-xs text-gris">¿No sabes las medidas? Déjalo en blanco: con la foto calculamos el tamaño ideal.</p>
                  <p className="etiqueta col-span-2 -mb-2 mt-1">Tamaño del cuadro que te imaginas (opcional)</p>
                  <label className="etiqueta font-normal text-gris">Ancho (cm)<input inputMode="decimal" value={form.cuadroAncho} onChange={cambiar('cuadroAncho')} placeholder="Ej. 120" className="campo mt-1.5" /></label>
                  <label className="etiqueta font-normal text-gris">Alto (cm)<input inputMode="decimal" value={form.cuadroAlto} onChange={cambiar('cuadroAlto')} placeholder="Ej. 80" className="campo mt-1.5" /></label>
                  <label className="etiqueta col-span-2">Estilo del espacio
                    <select value={form.estilo} onChange={cambiar('estilo')} className="campo mt-1.5"><option value="">Elegir…</option>{ESTILOS.map(s => <option key={s}>{s}</option>)}</select>
                  </label>
                  <label className="etiqueta col-span-2">¿Qué formato te gustaría?
                    <select value={form.formato} onChange={cambiar('formato')} className="campo mt-1.5">
                      <option value="">Que me recomienden</option><option value="una">Una sola pieza</option><option value="diptico">Díptico (2 piezas)</option><option value="triptico">Tríptico (3 piezas)</option>
                    </select>
                  </label>
                  <label className="etiqueta col-span-2">Colores que te gustan (opcional)<input value={form.colores} onChange={cambiar('colores')} placeholder="Ej. tonos tierra, beige, verde oliva" className="campo mt-1.5" /></label>
                </div>
              )}
              <label className="etiqueta">Tu nombre<input required value={form.nombre} onChange={cambiar('nombre')} autoComplete="name" className="campo mt-1.5" /></label>
              <label className="etiqueta">WhatsApp o teléfono<input type="tel" required value={form.telefono} onChange={cambiar('telefono')} autoComplete="tel" placeholder="7777-7777" className="campo mt-1.5" /></label>
              <label className="etiqueta">{soloContacto ? 'Mensaje' : 'Cuéntanos qué buscas'}
                <textarea rows={soloContacto ? 3 : 5} required value={form.mensaje} onChange={cambiar('mensaje')} className="campo mt-1.5 placeholder:text-[#a8a29a]"
                  placeholder={soloContacto
                    ? 'Ej.: Hola, quisiera saber si hacen cuadros a la medida y cuánto tardan en entregarlos.'
                    : 'Ej.: Busco un cuadro abstracto para la sala, sobre un sofá gris de 2 metros. Me gustan los tonos tierra y dorados, y quiero que el espacio se sienta cálido y elegante.'} />
                {!soloContacto && <span className="mt-1.5 block text-xs font-normal text-gris">Mientras más nos cuentes (dónde va, sobre qué mueble, colores y lo que quieres transmitir), mejor será la propuesta.</span>}
              </label>
              <p className="flex gap-2.5 text-[13px] text-gris"><Lock size={16} className="mt-0.5 shrink-0" />Tus datos y tu foto solo se usan para responderte.</p>
              <button disabled={enviando} className="btn-primario w-full">{enviando ? 'Enviando…' : soloContacto ? 'Enviar mensaje' : 'Pedir mi asesoría'}</button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
