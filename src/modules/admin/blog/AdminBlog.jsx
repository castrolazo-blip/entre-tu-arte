import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, ImagePlus } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../../lib/supabase.js'
import { fechaCorta } from '../../../lib/formato.js'
import { subirArchivo, reducirImagen } from '../adminService.js'
import EncabezadoAdmin from '../EncabezadoAdmin.jsx'

const VACIO = { titulo: '', subtitulo: '', imagen_portada_url: '', bloque1: '', imagen1_url: '', bloque2: '', imagen2_url: '', bloque3: '', imagen3_url: '', publicado: true }

// Mismos campos que el blog del sitio anterior (tabla "blogs").
export default function AdminBlog() {
  const [lista, setLista] = useState(null)
  const [form, setForm] = useState(null)
  const [subiendo, setSubiendo] = useState('')

  async function cargar() { const { data } = await supabase.from('blogs').select('*').order('created_at', { ascending: false }); setLista(data || []) }
  useEffect(() => { cargar() }, [])
  const c = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function subir(campo, e) {
    const a = e.target.files?.[0]; e.target.value = ''
    if (!a) return
    setSubiendo(campo)
    try { const url = await subirArchivo('blog', await reducirImagen(a, 1800)); setForm(f => ({ ...f, [campo]: url })) }
    catch (err) { toast.error('No se pudo subir: ' + err.message) } finally { setSubiendo('') }
  }

  async function guardar(e) {
    e.preventDefault()
    const { id, created_at, ...datos } = form // eslint-disable-line no-unused-vars
    Object.keys(datos).forEach(k => { if (datos[k] === '') datos[k] = null })
    const r = id ? await supabase.from('blogs').update(datos).eq('id', id) : await supabase.from('blogs').insert(datos)
    if (r.error) { toast.error('No se pudo guardar: ' + r.error.message); return }
    toast.success('Artículo guardado'); setForm(null); cargar()
  }
  async function eliminar(b) {
    if (!window.confirm(`¿Eliminar "${b.titulo}"?`)) return
    await supabase.from('blogs').delete().eq('id', b.id); cargar()
  }

  const Imagen = ({ campo, etiqueta }) => (
    <div className="flex items-center gap-3">
      {form[campo] ? <img src={form[campo]} alt="" className="h-14 w-20 rounded-xl object-cover" /> : <span className="h-14 w-20 rounded-xl bg-crema" />}
      <label className="relative btn-contorno btn-chico cursor-pointer"><ImagePlus size={15} />{subiendo === campo ? 'Subiendo…' : etiqueta}<input type="file" accept="image/*" onChange={e => subir(campo, e)} className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0" /></label>
      {form[campo] && <button type="button" onClick={() => setForm(f => ({ ...f, [campo]: '' }))} className="text-sm text-gris underline">Quitar</button>}
    </div>
  )

  return (
    <>
      <EncabezadoAdmin ruta="Contenido" titulo="Blog"><button onClick={() => setForm(VACIO)} className="btn-oscuro btn-chico"><Plus size={18} />Nuevo artículo</button></EncabezadoAdmin>
      {!lista ? <p className="p-6 text-gris">Cargando…</p> : !lista.length ? <p className="rounded-[28px] bg-white p-10 text-center text-gris">Aún no hay artículos.</p> : (
        <div className="space-y-3">
          {lista.map(b => (
            <div key={b.id} className="flex items-center gap-4 rounded-[24px] bg-white p-4">
              {(b.imagen_portada_url || b.imagen1_url) ? <img src={b.imagen_portada_url || b.imagen1_url} alt="" className="h-14 w-20 rounded-xl object-cover" /> : <span className="h-14 w-20 rounded-xl bg-crema" />}
              <div className="min-w-0 flex-1"><p className="truncate font-bold">{b.titulo}</p><p className="text-sm text-gris">{fechaCorta(b.created_at)} · {b.publicado ? 'Publicado' : 'Borrador'}</p></div>
              <button onClick={() => setForm({ ...VACIO, ...b })} aria-label="Editar" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-crema"><Pencil size={17} /></button>
              <button onClick={() => eliminar(b)} aria-label="Eliminar" className="flex h-10 w-10 items-center justify-center rounded-full text-red-700 hover:bg-red-50"><Trash2 size={17} /></button>
            </div>
          ))}
        </div>
      )}
      {form && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/45" onClick={() => setForm(null)}>
          <form onSubmit={guardar} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Artículo" className="h-full w-full max-w-2xl space-y-4 overflow-y-auto bg-[#f6f4f0] p-6">
            <div className="flex items-center justify-between"><h2 className="text-2xl font-semibold">{form.id ? 'Editar artículo' : 'Nuevo artículo'}</h2><button type="button" onClick={() => setForm(null)} aria-label="Cerrar" className="flex h-11 w-11 items-center justify-center rounded-full bg-white"><X size={20} /></button></div>
            <div className="space-y-3.5 rounded-[24px] bg-white p-5">
              <label className="etiqueta">Título<input required value={form.titulo || ''} onChange={c('titulo')} className="campo mt-1.5" /></label>
              <label className="etiqueta">Subtítulo<input value={form.subtitulo || ''} onChange={c('subtitulo')} className="campo mt-1.5" /></label>
              <Imagen campo="imagen_portada_url" etiqueta="Imagen de portada" />
            </div>
            {[1, 2, 3].map(n => (
              <div key={n} className="space-y-3 rounded-[24px] bg-white p-5">
                <label className="etiqueta">Párrafo {n}<textarea rows={5} value={form[`bloque${n}`] || ''} onChange={c(`bloque${n}`)} className="campo mt-1.5" /></label>
                <Imagen campo={`imagen${n}_url`} etiqueta={`Imagen ${n}`} />
              </div>
            ))}
            <label className="etiqueta flex items-center gap-2"><input type="checkbox" checked={!!form.publicado} onChange={e => setForm(f => ({ ...f, publicado: e.target.checked }))} className="h-5 w-5 accent-[#17181b]" />Publicado</label>
            <button className="btn-primario h-12 w-full">Guardar artículo</button>
          </form>
        </div>
      )}
    </>
  )
}
