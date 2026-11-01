import { useEffect, useState } from 'react'
import { X, ImagePlus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../../lib/supabase.js'
import { numero, medidasTexto } from '../../../lib/formato.js'
import { subirArchivo, reducirImagen } from '../adminService.js'
import SelectorOpciones, { SelectorAnio } from '../../../components/admin/SelectorOpciones.jsx'

const ROLES = ['principal', 'ambiente', 'detalle']

// Edición completa de una obra (también sirve para completar los datos de las obras viejas).
export default function EditarObra({ obra, onCerrar, onGuardado }) {
  const [f, setF] = useState({
    titulo: obra.titulo === 'Obra sin título' ? '' : obra.titulo, descripcion: obra.descripcion || '', estilo: obra.estilo || '',
    tecnica: obra.tecnica || '', soporte: obra.soporte || '', alto: obra.alto_cm ?? '', ancho: obra.ancho_cm ?? '', diametro: obra.diametro_cm ?? '',
    precio: obra.precio ?? '', anio: obra.anio ?? '', existencias: obra.existencias ?? 1, edicion_total: obra.edicion_total ?? '',
    artista_id: obra.artista_id || '', categorias: obra.categorias || [], publicacion: obra.publicacion || '',
  })
  const [fotos, setFotos] = useState(obra.fotos || [])
  const [artistas, setArtistas] = useState([])
  const [categorias, setCategorias] = useState([])
  const [guardando, setGuardando] = useState(false)
  const [subiendo, setSubiendo] = useState(false)

  useEffect(() => {
    supabase.from('artistas').select('id, nombre').order('nombre').then(({ data }) => setArtistas(data || []))
    supabase.from('categorias').select('*').order('nombre').then(({ data }) => setCategorias(data || []))
  }, [])
  const c = k => e => setF(v => ({ ...v, [k]: e.target.value }))

  async function agregarFoto(e) {
    const a = e.target.files?.[0]; e.target.value = ''
    if (!a) return
    setSubiendo(true)
    try {
      const url = await subirArchivo('obras', await reducirImagen(a, 2000))
      setFotos(fs => [...fs, { url, rol: ROLES[fs.length] || 'detalle' }].slice(0, 3))
    } catch (err) { toast.error('No se pudo subir: ' + err.message) } finally { setSubiendo(false) }
  }

  async function guardar(e) {
    e.preventDefault()
    setGuardando(true)
    const artista = artistas.find(a => a.id === f.artista_id)
    const cambios = {
      titulo: f.titulo.trim() || null, descripcion: f.descripcion.trim() || null, estilo: f.estilo.trim() || null,
      tecnica: f.tecnica.trim() || null, soporte: f.soporte.trim() || null,
      alto_cm: numero(f.alto), ancho_cm: numero(f.ancho), diametro_cm: numero(f.diametro),
      precio: numero(f.precio), anio: parseInt(f.anio, 10) || null,
      existencias: Math.max(0, parseInt(f.existencias, 10) || 0), edicion_total: parseInt(f.edicion_total, 10) || null,
      artista_id: f.artista_id || null, artista_nombre: artista?.nombre || null,
      categorias: f.categorias, publicacion: f.publicacion || null,
      fotos: fotos.map((x, i) => ({ url: x.url, rol: ROLES[i] || x.rol })),
    }
    cambios.medidas = medidasTexto({ alto_cm: cambios.alto_cm, ancho_cm: cambios.ancho_cm, diametro_cm: cambios.diametro_cm }) || null
    if (fotos[0]) cambios.imagen_url = fotos[0].url
    const { error } = await supabase.from('fichas').update(cambios).eq('id', obra.id)
    setGuardando(false)
    if (error) { toast.error('No se pudo guardar: ' + error.message); return }
    toast.success('Obra actualizada')
    onGuardado()
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/45" onClick={onCerrar}>
      <form onSubmit={guardar} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Editar ${obra.titulo}`}
        className="h-full w-full max-w-2xl overflow-y-auto bg-[#f6f4f0] p-5 md:p-7">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">Editar obra</h2>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="flex h-11 w-11 items-center justify-center rounded-full bg-white"><X size={20} /></button>
        </div>

        <section className="mt-5 rounded-[24px] bg-white p-5">
          <p className="etiqueta mb-3">Fotos (la primera es la principal)</p>
          <div className="grid grid-cols-3 gap-3">
            {fotos.map((x, i) => (
              <div key={x.url} className="relative aspect-square overflow-hidden rounded-2xl">
                <img src={x.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                <button type="button" onClick={() => setFotos(fs => fs.filter((_, n) => n !== i))} aria-label="Quitar foto" className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/95"><Trash2 size={15} /></button>
              </div>
            ))}
            {fotos.length < 3 && (
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-crema-borde text-xs font-semibold text-gris">
                <ImagePlus size={22} />{subiendo ? 'Subiendo…' : 'Agregar'}
                <input type="file" accept="image/*" onChange={agregarFoto} className="sr-only" />
              </label>
            )}
          </div>
          {obra.ficha_url && <a href={obra.ficha_url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold underline">Ver ficha para redes</a>}
        </section>

        <section className="mt-4 grid gap-3.5 rounded-[24px] bg-white p-5 sm:grid-cols-2">
          <label className="etiqueta sm:col-span-2">Nombre<input value={f.titulo} onChange={c('titulo')} className="campo mt-1.5" /></label>
          <label className="etiqueta">Artista
            <select value={f.artista_id} onChange={c('artista_id')} className="campo mt-1.5"><option value="">Sin artista</option>{artistas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}</select>
          </label>
          <SelectorAnio valor={f.anio} onChange={v => setF(x => ({ ...x, anio: v }))} />
          <div className="sm:col-span-2"><SelectorOpciones etiqueta="Técnica" tipo="tecnicas" valor={f.tecnica} onChange={v => setF(x => ({ ...x, tecnica: v }))} /></div>
          <div className="sm:col-span-2"><SelectorOpciones etiqueta="Soporte" tipo="soportes" valor={f.soporte} onChange={v => setF(x => ({ ...x, soporte: v }))} /></div>
          <div className="sm:col-span-2"><SelectorOpciones etiqueta="Estilo" tipo="estilos" valor={f.estilo} onChange={v => setF(x => ({ ...x, estilo: v }))} /></div>
          <label className="etiqueta">Precio (USD)<input inputMode="decimal" value={f.precio} onChange={c('precio')} className="campo mt-1.5" /></label>
          <div className="grid grid-cols-3 gap-2 sm:col-span-2">
            <label className="etiqueta">Alto (cm)<input inputMode="decimal" value={f.alto} onChange={c('alto')} className="campo mt-1.5" /></label>
            <label className="etiqueta">Ancho (cm)<input inputMode="decimal" value={f.ancho} onChange={c('ancho')} className="campo mt-1.5" /></label>
            <label className="etiqueta">Diámetro<input inputMode="decimal" value={f.diametro} onChange={c('diametro')} className="campo mt-1.5" /></label>
          </div>
          <label className="etiqueta">Existencias disponibles<input inputMode="numeric" value={f.existencias} onChange={c('existencias')} className="campo mt-1.5" /></label>
          <label className="etiqueta">Total de la edición<input inputMode="numeric" value={f.edicion_total} onChange={c('edicion_total')} placeholder="Vacío = pieza única" className="campo mt-1.5" /></label>
          <label className="etiqueta sm:col-span-2">Descripción<textarea rows={4} value={f.descripcion} onChange={c('descripcion')} className="campo mt-1.5" /></label>
          {categorias.length > 0 && (
            <fieldset className="sm:col-span-2">
              <legend className="etiqueta mb-2">Colecciones</legend>
              <div className="flex flex-wrap gap-2">
                {categorias.map(cat => {
                  const on = f.categorias.includes(cat.nombre)
                  return <button type="button" key={cat.id} aria-pressed={on} onClick={() => setF(v => ({ ...v, categorias: on ? v.categorias.filter(x => x !== cat.nombre) : [...v.categorias, cat.nombre] }))} className={`chip ${on ? 'chip-on' : 'chip-off'}`}>{cat.nombre}</button>
                })}
              </div>
            </fieldset>
          )}
          <label className="etiqueta sm:col-span-2">Texto para redes<textarea rows={4} value={f.publicacion} onChange={c('publicacion')} className="campo mt-1.5 text-sm" /></label>
        </section>

        <div className="sticky bottom-0 mt-4 flex gap-3 bg-[#f6f4f0] py-3">
          <button type="button" onClick={onCerrar} className="btn-contorno flex-1 whitespace-nowrap px-4">Cancelar</button>
          <button disabled={guardando} className="btn-primario flex-1 whitespace-nowrap px-4">{guardando ? 'Guardando…' : 'Guardar cambios'}</button>
        </div>
      </form>
    </div>
  )
}
