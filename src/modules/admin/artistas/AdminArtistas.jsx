import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../../lib/supabase.js'
import { slugify } from '../../../lib/formato.js'
import { subirArchivo, reducirImagen } from '../adminService.js'
import EncabezadoAdmin from '../EncabezadoAdmin.jsx'

const VACIO = { nombre: '', ciudad: '', bio: '', foto_url: '', activo: true, orden: 0 }

// Perfiles públicos de artistas. No se guardan teléfonos ni redes del artista: todo pasa por la galería.
export default function AdminArtistas() {
  const [artistas, setArtistas] = useState(null)
  const [form, setForm] = useState(null)
  const [conteo, setConteo] = useState({})

  async function cargar() {
    const { data } = await supabase.from('artistas').select('*').order('orden').order('nombre')
    setArtistas(data || [])
    const { data: obras } = await supabase.from('fichas').select('artista_id')
    const n = {}; (obras || []).forEach(o => { if (o.artista_id) n[o.artista_id] = (n[o.artista_id] || 0) + 1 })
    setConteo(n)
  }
  useEffect(() => { cargar() }, [])

  async function subirFoto(e) {
    const a = e.target.files?.[0]; e.target.value = ''
    if (!a) return
    try { const url = await subirArchivo('artistas', await reducirImagen(a, 900)); setForm(f => ({ ...f, foto_url: url })) }
    catch (err) { toast.error('No se pudo subir: ' + err.message) }
  }

  async function guardar(e) {
    e.preventDefault()
    const datos = { nombre: form.nombre.trim(), ciudad: form.ciudad || null, bio: form.bio || null, foto_url: form.foto_url || null, activo: form.activo, orden: Number(form.orden) || 0, slug: form.slug || slugify(form.nombre) }
    const r = form.id ? await supabase.from('artistas').update(datos).eq('id', form.id) : await supabase.from('artistas').insert(datos)
    if (r.error) { toast.error(r.error.code === '23505' ? 'Ya existe un artista con ese nombre' : 'No se pudo guardar'); return }
    if (form.id) await supabase.from('fichas').update({ artista_nombre: datos.nombre }).eq('artista_id', form.id)
    toast.success('Artista guardado'); setForm(null); cargar()
  }

  async function eliminar(a) {
    if (!window.confirm(`¿Eliminar a ${a.nombre}? Sus obras quedarán sin artista asignado.`)) return
    const { error } = await supabase.from('artistas').delete().eq('id', a.id)
    if (error) toast.error('No se pudo eliminar'); else { toast.success('Artista eliminado'); cargar() }
  }

  return (
    <>
      <EncabezadoAdmin ruta="Catálogo" titulo="Artistas">
        <button onClick={() => setForm(VACIO)} className="btn-oscuro btn-chico"><Plus size={18} />Nuevo artista</button>
      </EncabezadoAdmin>
      {!artistas ? <p className="p-6 text-gris">Cargando…</p> : !artistas.length ? <p className="rounded-[28px] bg-white p-10 text-center text-gris">Agrega a tus artistas para asignarles sus obras.</p> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {artistas.map(a => (
            <div key={a.id} className="flex items-center gap-4 rounded-[24px] bg-white p-4">
              {a.foto_url ? <img src={a.foto_url} alt="" className="h-16 w-16 rounded-full object-cover" /> : <span className="flex h-16 w-16 items-center justify-center rounded-full bg-mostaza text-xl font-bold">{a.nombre[0]}</span>}
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{a.nombre} {!a.activo && <span className="text-xs font-normal text-gris">(oculto)</span>}</p>
                <p className="text-sm text-gris">{conteo[a.id] || 0} obras{a.ciudad ? ` · ${a.ciudad}` : ''}</p>
              </div>
              <button onClick={() => setForm(a)} aria-label={`Editar ${a.nombre}`} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-crema"><Pencil size={17} /></button>
              <button onClick={() => eliminar(a)} aria-label={`Eliminar ${a.nombre}`} className="flex h-10 w-10 items-center justify-center rounded-full text-red-700 hover:bg-red-50"><Trash2 size={17} /></button>
            </div>
          ))}
        </div>
      )}
      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onClick={() => setForm(null)}>
          <form onSubmit={guardar} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Artista" className="max-h-[92vh] w-full max-w-lg space-y-3.5 overflow-y-auto rounded-[28px] bg-white p-6">
            <div className="flex items-center justify-between"><h2 className="text-xl font-bold">{form.id ? 'Editar artista' : 'Nuevo artista'}</h2><button type="button" onClick={() => setForm(null)} aria-label="Cerrar" className="flex h-10 w-10 items-center justify-center rounded-full bg-crema"><X size={18} /></button></div>
            <div className="flex items-center gap-4">
              {form.foto_url ? <img src={form.foto_url} alt="" className="h-20 w-20 rounded-full object-cover" /> : <span className="h-20 w-20 rounded-full bg-crema" />}
              <label className="btn-contorno btn-chico cursor-pointer">Foto de perfil<input type="file" accept="image/*" onChange={subirFoto} className="sr-only" /></label>
            </div>
            <label className="etiqueta">Nombre<input required value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} className="campo mt-1.5" /></label>
            <label className="etiqueta">Ciudad<input value={form.ciudad || ''} onChange={e => setForm(f => ({ ...f, ciudad: e.target.value }))} className="campo mt-1.5" /></label>
            <label className="etiqueta">Biografía<textarea rows={5} value={form.bio || ''} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} className="campo mt-1.5" placeholder="Técnica, inspiración y trayectoria. Sin teléfonos ni redes personales." /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="etiqueta">Orden<input type="number" value={form.orden} onChange={e => setForm(f => ({ ...f, orden: e.target.value }))} className="campo mt-1.5" /></label>
              <label className="etiqueta flex items-center gap-2 pt-6"><input type="checkbox" checked={form.activo} onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))} className="h-5 w-5 accent-[#17181b]" />Visible en el sitio</label>
            </div>
            <button className="btn-primario h-12 w-full">Guardar</button>
          </form>
        </div>
      )}
    </>
  )
}
