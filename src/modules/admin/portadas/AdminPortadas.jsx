import { useEffect, useState } from 'react'
import { Plus, ArrowUp, ArrowDown, Trash2, ImagePlus, Images } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../../lib/supabase.js'
import { subirArchivo, reducirImagen, guardarConfig } from '../adminService.js'
import { normalizarObra } from '../../catalogo/obrasService.js'
import { useConfig } from '../../../context/ConfigContext.jsx'
import EncabezadoAdmin from '../EncabezadoAdmin.jsx'

const VACIA = { imagen_url: '', imagen_movil_url: '', titular: 'Arte que transforma espacios', subtitulo: '', boton_texto: 'Explorar Colecciones', boton_enlace: '/colecciones', activa: true, desde: '', hasta: '' }

export default function AdminPortadas() {
  const { cfg, recargar } = useConfig()
  const [portadas, setPortadas] = useState(null)
  const [sel, setSel] = useState(null)
  const [form, setForm] = useState(VACIA)
  const [obras, setObras] = useState([])
  const [eligiendo, setEligiendo] = useState(null)
  const [subiendo, setSubiendo] = useState(false)

  async function cargar(seleccionar) {
    const { data } = await supabase.from('portadas').select('*').order('orden').order('created_at')
    setPortadas(data || [])
    const p = (data || []).find(x => x.id === seleccionar) || (data || [])[0]
    if (p) { setSel(p.id); setForm({ ...VACIA, ...p, desde: p.desde || '', hasta: p.hasta || '' }) } else { setSel(null); setForm(VACIA) }
  }
  useEffect(() => {
    cargar()
    supabase.from('fichas').select('*').neq('estado', 'borrador').order('created_at', { ascending: false }).limit(60)
      .then(({ data }) => setObras((data || []).map(normalizarObra)))
  }, [])

  const c = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  function elegir(p) { setSel(p.id); setForm({ ...VACIA, ...p, desde: p.desde || '', hasta: p.hasta || '' }) }
  function nueva() { setSel('nueva'); setForm(VACIA) }

  async function subir(campo, e) {
    const a = e.target.files?.[0]; e.target.value = ''
    if (!a) return
    setSubiendo(true)
    try { const url = await subirArchivo('portadas', await reducirImagen(a, 2400)); setForm(f => ({ ...f, [campo]: url })) }
    catch (err) { toast.error('No se pudo subir: ' + err.message) } finally { setSubiendo(false) }
  }

  function usarObra(o) {
    const ambiente = o.fotos.find(f => f.rol === 'ambiente')?.url
    setForm(f => ({ ...f, imagen_url: ambiente || o.foto, imagen_movil_url: o.foto, titular: o.titulo, boton_texto: 'Ver la obra', boton_enlace: `/obra/${o.id}`, ficha_id: String(o.id) }))
    setEligiendo(null)
  }

  async function guardar() {
    if (!form.imagen_url) { toast.error('Elige una imagen para la portada'); return }
    const datos = {
      imagen_url: form.imagen_url, imagen_movil_url: form.imagen_movil_url || null, titular: form.titular || null, subtitulo: form.subtitulo || null,
      boton_texto: form.boton_texto || null, boton_enlace: form.boton_enlace || null, ficha_id: form.ficha_id || null,
      activa: form.activa, desde: form.desde || null, hasta: form.hasta || null,
    }
    const r = (!sel || sel === 'nueva')
      ? await supabase.from('portadas').insert({ ...datos, orden: (portadas?.length || 0) }).select('id').single()
      : await supabase.from('portadas').update(datos).eq('id', sel).select('id').single()
    if (r.error) { toast.error('No se pudo guardar: ' + r.error.message); return }
    toast.success('Portada guardada')
    cargar(r.data.id)
  }

  async function alternar(p) { await supabase.from('portadas').update({ activa: !p.activa }).eq('id', p.id); cargar(sel) }
  async function eliminar() {
    if (sel === 'nueva' || !window.confirm('¿Eliminar esta portada?')) return
    await supabase.from('portadas').delete().eq('id', sel); toast.success('Portada eliminada'); cargar()
  }
  async function mover(i, d) {
    const l = [...portadas]; const j = i + d
    if (j < 0 || j >= l.length) return
    ;[l[i], l[j]] = [l[j], l[i]]
    await Promise.all(l.map((p, n) => supabase.from('portadas').update({ orden: n }).eq('id', p.id)))
    cargar(sel)
  }
  async function cambiarSegundos(v) { await guardarConfig('portada_segundos', v); recargar(); toast.success('Velocidad guardada') }

  const hoy = new Date().toISOString().slice(0, 10)
  const vigente = p => p.activa && (!p.desde || p.desde <= hoy) && (!p.hasta || p.hasta >= hoy)

  return (
    <>
      <EncabezadoAdmin ruta="Sitio" titulo="Portada dinámica">
        <label className="flex h-11 items-center gap-2 rounded-full bg-white pl-4 pr-2 text-sm font-semibold">Cambiar cada
          <select value={cfg.portada_segundos} onChange={e => cambiarSegundos(e.target.value)} className="h-8 rounded-full border border-crema-borde bg-crema-clara px-2">
            {['5', '6', '8', '10', '12'].map(s => <option key={s} value={s}>{s} segundos</option>)}
          </select>
        </label>
        <button onClick={nueva} className="btn-oscuro btn-chico"><Plus size={18} />Agregar portada</button>
      </EncabezadoAdmin>

      <div className="flex flex-wrap items-start gap-5">
        <section className="min-w-0 flex-[1.2_1_480px] rounded-[28px] bg-white p-5">
          <h2 className="text-lg font-bold">Portadas en rotación</h2>
          <p className="mb-4 text-[13px] text-gris">Si no hay ninguna activa, el sitio usa las fotos de las obras destacadas.</p>
          {!portadas ? <p className="text-gris">Cargando…</p> : !portadas.length ? <p className="rounded-2xl bg-crema-clara p-6 text-center text-gris">Aún no hay portadas. Agrega la primera.</p> : (
            <ul className="space-y-3">
              {portadas.map((p, i) => (
                <li key={p.id} className={`flex items-center gap-3 rounded-[22px] border-2 p-2.5 ${sel === p.id ? 'border-mostaza bg-mostaza-fondo' : 'border-transparent bg-crema-clara'}`}>
                  <div className="flex flex-col">
                    <button onClick={() => mover(i, -1)} aria-label="Subir" disabled={!i} className="flex h-7 w-7 items-center justify-center disabled:opacity-20"><ArrowUp size={15} /></button>
                    <button onClick={() => mover(i, 1)} aria-label="Bajar" disabled={i === portadas.length - 1} className="flex h-7 w-7 items-center justify-center disabled:opacity-20"><ArrowDown size={15} /></button>
                  </div>
                  <button onClick={() => elegir(p)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <img src={p.imagen_url} alt="" className="h-20 w-32 shrink-0 rounded-xl object-cover" />
                    <span className="min-w-0">
                      <span className="block truncate font-bold">{p.titular || 'Sin titular'}</span>
                      <span className="block truncate text-xs text-gris">{p.boton_enlace}</span>
                      <span className={`mt-1 block text-xs font-semibold ${vigente(p) ? 'text-green-800' : 'text-gris'}`}>{vigente(p) ? 'Activa · en rotación' : p.activa ? 'Programada / vencida' : 'Pausada'}</span>
                    </span>
                  </button>
                  <button role="switch" aria-checked={p.activa} aria-label="Activar portada" onClick={() => alternar(p)}
                    className={`flex h-[30px] w-[50px] shrink-0 rounded-full p-[3px] ${p.activa ? 'justify-end bg-tinta' : 'justify-start bg-[#d9d4cb]'}`}><span className="h-6 w-6 rounded-full bg-white shadow" /></button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="min-w-0 flex-[1_1_380px] rounded-[28px] bg-white p-5">
          <h2 className="mb-3 text-lg font-bold">{sel === 'nueva' ? 'Nueva portada' : sel ? 'Editar portada' : 'Portada'}</h2>
          <div className="relative aspect-[16/10] overflow-hidden rounded-[20px] bg-tinta text-white">
            {form.imagen_url && <img src={form.imagen_url} alt="" className="absolute inset-0 h-full w-full object-cover" />}
            <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[#141210]/80 to-[#141210]/10" />
            <span className="absolute bottom-5 left-5 right-[35%]">
              <span className="block text-2xl font-semibold leading-none tracking-tight">{form.titular}</span>
              {form.boton_texto && <span className="mt-3 inline-block rounded-full bg-mostaza px-3.5 py-1.5 text-[11px] font-bold text-tinta">{form.boton_texto}</span>}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setEligiendo(true)} className="btn-contorno btn-chico"><Images size={16} />De una obra</button>
            <label className="btn-contorno btn-chico cursor-pointer"><ImagePlus size={16} />{subiendo ? 'Subiendo…' : 'Subir imagen'}<input type="file" accept="image/*" onChange={e => subir('imagen_url', e)} className="sr-only" /></label>
          </div>
          <div className="mt-4 space-y-3">
            <label className="etiqueta">Titular (la última palabra sale en amarillo)<input value={form.titular} onChange={c('titular')} className="campo mt-1.5" /></label>
            <label className="etiqueta">Subtítulo<input value={form.subtitulo || ''} onChange={c('subtitulo')} className="campo mt-1.5" /></label>
            <div className="grid grid-cols-2 gap-2.5">
              <label className="etiqueta">Texto del botón<input value={form.boton_texto || ''} onChange={c('boton_texto')} className="campo mt-1.5" /></label>
              <label className="etiqueta">Lleva a<input value={form.boton_enlace || ''} onChange={c('boton_enlace')} placeholder="/colecciones" className="campo mt-1.5" /></label>
              <label className="etiqueta">Mostrar desde<input type="date" value={form.desde} onChange={c('desde')} className="campo mt-1.5" /></label>
              <label className="etiqueta">Hasta<input type="date" value={form.hasta} onChange={c('hasta')} className="campo mt-1.5" /></label>
            </div>
            <label className="etiqueta flex items-center justify-between rounded-2xl bg-crema-clara p-3">Imagen para celular (opcional)
              <span className="flex items-center gap-2">
                {form.imagen_movil_url && <img src={form.imagen_movil_url} alt="" className="h-12 w-9 rounded-lg object-cover" />}
                <span className="btn-contorno btn-chico relative cursor-pointer">Elegir<input type="file" accept="image/*" onChange={e => subir('imagen_movil_url', e)} className="absolute inset-0 cursor-pointer opacity-0" /></span>
              </span>
            </label>
          </div>
          <div className="mt-5 flex gap-2.5">
            {sel && sel !== 'nueva' && <button onClick={eliminar} aria-label="Eliminar portada" className="btn-contorno h-12 w-12 border-red-700 px-0 text-red-700"><Trash2 size={18} /></button>}
            <button onClick={guardar} disabled={subiendo} className="btn-primario h-12 flex-1">Guardar portada</button>
          </div>
        </section>
      </div>

      {eligiendo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEligiendo(null)}>
          <div role="dialog" aria-modal="true" aria-label="Elegir obra" onClick={e => e.stopPropagation()} className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-[28px] bg-white p-5">
            <h2 className="mb-4 text-xl font-bold">Elige la obra para la portada</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {obras.filter(o => o.foto).map(o => (
                <button key={o.id} onClick={() => usarObra(o)} className="overflow-hidden rounded-2xl bg-crema-clara text-left">
                  <img src={o.foto} alt="" className="h-28 w-full object-cover" />
                  <span className="block truncate p-2.5 text-sm font-semibold">{o.titulo}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
