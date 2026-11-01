import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../../lib/supabase.js'
import EncabezadoAdmin from '../EncabezadoAdmin.jsx'

// Colecciones = tabla "categorias" (las mismas del sitio anterior).
export default function AdminColecciones() {
  const [lista, setLista] = useState(null)
  const [nueva, setNueva] = useState('')
  const [conteo, setConteo] = useState({})

  async function cargar() {
    const { data } = await supabase.from('categorias').select('*').order('nombre')
    setLista(data || [])
    const { data: obras } = await supabase.from('fichas').select('categorias')
    const n = {}; (obras || []).forEach(o => (o.categorias || []).forEach(c => { n[c] = (n[c] || 0) + 1 }))
    setConteo(n)
  }
  useEffect(() => { cargar() }, [])

  async function agregar(e) {
    e.preventDefault()
    const nombre = nueva.trim()
    if (!nombre) return
    const { error } = await supabase.from('categorias').insert({ nombre })
    if (error) { toast.error('No se pudo agregar'); return }
    setNueva(''); cargar()
  }
  async function eliminar(c) {
    if (!window.confirm(`¿Eliminar la colección "${c.nombre}"? Las obras no se borran.`)) return
    await supabase.from('categorias').delete().eq('id', c.id); cargar()
  }

  return (
    <>
      <EncabezadoAdmin ruta="Catálogo" titulo="Colecciones" />
      <form onSubmit={agregar} className="mb-5 flex max-w-xl gap-2.5 rounded-[24px] bg-white p-4">
        <label className="sr-only" htmlFor="nueva-coleccion">Nueva colección</label>
        <input id="nueva-coleccion" value={nueva} onChange={e => setNueva(e.target.value)} placeholder="Ej: Abstracto, Paisajes, Sala…" className="campo" />
        <button className="btn-oscuro h-12 shrink-0 px-5"><Plus size={18} />Agregar</button>
      </form>
      {!lista ? <p className="p-6 text-gris">Cargando…</p> : (
        <div className="flex flex-wrap gap-3">
          {lista.map(c => (
            <div key={c.id} className="flex items-center gap-3 rounded-full bg-white py-2 pl-5 pr-2">
              <span className="font-semibold">{c.nombre}</span><span className="text-sm text-gris">{conteo[c.nombre] || 0}</span>
              <button onClick={() => eliminar(c)} aria-label={`Eliminar ${c.nombre}`} className="flex h-9 w-9 items-center justify-center rounded-full text-red-700 hover:bg-red-50"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
