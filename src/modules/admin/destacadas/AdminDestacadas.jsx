import { useEffect, useMemo, useState } from 'react'
import { ArrowUp, ArrowDown, Check, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../../lib/supabase.js'
import { precio } from '../../../lib/formato.js'
import { normalizarObra, insignia } from '../../catalogo/obrasService.js'
import { guardarConfig } from '../adminService.js'
import { useConfig } from '../../../context/ConfigContext.jsx'
import EncabezadoAdmin from '../EncabezadoAdmin.jsx'

export default function AdminDestacadas() {
  const { cfg, recargar } = useConfig()
  const [obras, setObras] = useState(null)
  const [textos, setTextos] = useState({ banner_etiqueta: '', banner_titulo: '' })

  async function cargar() {
    const { data } = await supabase.from('fichas').select('*').in('estado', ['disponible', 'reservada']).order('created_at', { ascending: false })
    setObras((data || []).map(normalizarObra))
  }
  useEffect(() => { cargar() }, [])
  useEffect(() => { setTextos({ banner_etiqueta: cfg.banner_etiqueta, banner_titulo: cfg.banner_titulo }) }, [cfg.banner_etiqueta, cfg.banner_titulo])

  const elegidas = useMemo(() => (obras || []).filter(o => o.destacada).sort((a, b) => (a.orden_destacada ?? 999) - (b.orden_destacada ?? 999)), [obras])

  async function alternar(o) {
    const { error } = await supabase.from('fichas').update({ destacada: !o.destacada, orden_destacada: o.destacada ? null : elegidas.length }).eq('id', o.id)
    if (error) toast.error('No se pudo guardar'); else cargar()
  }
  async function mover(i, d) {
    const l = [...elegidas]; const j = i + d
    if (j < 0 || j >= l.length) return
    ;[l[i], l[j]] = [l[j], l[i]]
    await Promise.all(l.map((o, n) => supabase.from('fichas').update({ orden_destacada: n }).eq('id', o.id)))
    cargar()
  }
  async function guardarTextos() {
    try {
      await guardarConfig('banner_etiqueta', textos.banner_etiqueta)
      await guardarConfig('banner_titulo', textos.banner_titulo)
      recargar(); toast.success('Banner actualizado')
    } catch { toast.error('No se pudo guardar') }
  }

  return (
    <>
      <EncabezadoAdmin ruta="Sitio" titulo="Banner de obras destacadas" />
      <section className="mb-5 rounded-[28px] bg-white p-5">
        <h2 className="text-lg font-bold">Así lo ven tus clientes</h2>
        <p className="mb-4 text-[13px] text-gris">Aparece debajo de la portada. Las obras vendidas salen solas del banner.</p>
        <div className="rounded-[24px] bg-tinta p-5 text-white">
          <div className="mb-4 flex items-center gap-3"><span className="rounded-full bg-mostaza px-3 py-1.5 text-xs font-bold text-tinta">{textos.banner_etiqueta}</span><span className="text-xl font-semibold">{textos.banner_titulo}</span></div>
          {!elegidas.length ? <p className="text-sm text-white/70">Elige obras abajo para mostrarlas aquí.</p> : (
            <div className="sin-scroll flex gap-3 overflow-x-auto">
              {elegidas.map((o, i) => (
                <div key={o.id} className="w-48 shrink-0 overflow-hidden rounded-[18px] bg-white/[0.07]">
                  <div className="relative h-28">{o.foto && <img src={o.foto} alt="" className="absolute inset-0 h-full w-full object-cover" />}</div>
                  <div className="p-3">
                    <p className="truncate text-sm font-bold">{o.titulo}</p>
                    <p className="text-sm font-bold text-mostaza">{precio(o.precio)}</p>
                    <div className="mt-2 flex gap-1">
                      <button onClick={() => mover(i, -1)} disabled={!i} aria-label="Mover a la izquierda" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 disabled:opacity-30"><ArrowUp size={14} className="-rotate-90" /></button>
                      <button onClick={() => mover(i, 1)} disabled={i === elegidas.length - 1} aria-label="Mover a la derecha" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 disabled:opacity-30"><ArrowDown size={14} className="-rotate-90" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="flex flex-wrap items-start gap-5">
        <section className="min-w-0 flex-[1.4_1_520px] rounded-[28px] bg-white p-5">
          <h2 className="text-lg font-bold">Elige las obras destacadas <span className="text-sm font-normal text-gris">· {elegidas.length} seleccionadas</span></h2>
          {!obras ? <p className="mt-3 text-gris">Cargando…</p> : (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {obras.map(o => (
                <button key={o.id} aria-pressed={!!o.destacada} onClick={() => alternar(o)}
                  className={`relative overflow-hidden rounded-[18px] border-[3px] bg-crema-clara text-left ${o.destacada ? 'border-mostaza' : 'border-transparent'}`}>
                  <span className="relative block h-24">{o.foto && <img src={o.foto} alt="" className={`absolute inset-0 h-full w-full object-cover ${o.destacada ? '' : 'opacity-70'}`} />}</span>
                  <span className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full ${o.destacada ? 'bg-mostaza' : 'bg-white/90'}`}>{o.destacada ? <Check size={15} /> : <Plus size={15} />}</span>
                  <span className="block truncate px-2.5 pt-2 text-[13px] font-bold">{o.titulo}</span>
                  <span className="block px-2.5 pb-2.5 text-xs text-gris">{insignia(o).texto}</span>
                </button>
              ))}
            </div>
          )}
        </section>
        <section className="min-w-0 flex-[1_1_300px] space-y-3 rounded-[28px] bg-white p-5">
          <h2 className="text-lg font-bold">Textos del banner</h2>
          <label className="etiqueta">Etiqueta<input value={textos.banner_etiqueta} onChange={e => setTextos(t => ({ ...t, banner_etiqueta: e.target.value }))} className="campo mt-1.5" /></label>
          <label className="etiqueta">Título<input value={textos.banner_titulo} onChange={e => setTextos(t => ({ ...t, banner_titulo: e.target.value }))} className="campo mt-1.5" /></label>
          <button onClick={guardarTextos} className="btn-primario h-12 w-full">Guardar textos</button>
        </section>
      </div>
    </>
  )
}
