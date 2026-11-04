import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, ArrowRight } from 'lucide-react'
import { supabase } from '../../lib/supabase.js'
import { fechaCorta } from '../../lib/formato.js'
import EncabezadoAdmin from './EncabezadoAdmin.jsx'

const contar = (q) => q.then(({ count }) => count || 0)

export default function Resumen() {
  const [d, setD] = useState(null)
  useEffect(() => {
    const hace30 = new Date(Date.now() - 30 * 864e5).toISOString()
    const base = () => supabase.from('fichas').select('*', { count: 'exact', head: true })
    Promise.all([
      contar(base().eq('estado', 'disponible')),
      contar(base().eq('estado', 'reservada')),
      contar(base().eq('estado', 'vendida')),
      contar(base().eq('estado', 'borrador')),
      contar(supabase.from('consultas').select('id', { count: 'exact', head: true }).eq('estado', 'nueva')),
      contar(supabase.from('analytics').select('*', { count: 'exact', head: true }).in('evento', ['visita', 'visita_sitio']).gte('created_at', hace30)),
      supabase.from('consultas').select('*').order('created_at', { ascending: false }).limit(5).then(r => r.data || []),
      supabase.from('analytics').select('referencia_nombre').eq('evento', 'ver_obra').gte('created_at', hace30).limit(2000).then(r => r.data || []),
    ]).then(([disponibles, reservadas, vendidas, borradores, nuevas, visitas, consultas, vistas]) => {
      const conteo = {}
      vistas.forEach(v => { if (v.referencia_nombre) conteo[v.referencia_nombre] = (conteo[v.referencia_nombre] || 0) + 1 })
      const top = Object.entries(conteo).sort((a, b) => b[1] - a[1]).slice(0, 5)
      setD({ disponibles, reservadas, vendidas, borradores, nuevas, visitas, consultas, top })
    })
  }, [])

  const kpis = d ? [
    ['Obras disponibles', d.disponibles, 'bg-tinta text-white'],
    ['Consultas nuevas', d.nuevas, 'bg-mostaza text-tinta'],
    ['Visitas (30 días)', d.visitas, 'bg-white'],
    ['Vendidas', d.vendidas, 'bg-white'],
  ] : []

  return (
    <>
      <EncabezadoAdmin ruta="Panel" titulo="Resumen">
        <Link to="/admin/subir" className="btn-primario btn-chico"><Sparkles size={18} />Subir obra con IA</Link>
      </EncabezadoAdmin>
      {!d ? <p className="p-6 text-gris">Cargando…</p> : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {kpis.map(([t, v, c]) => (
              <div key={t} className={`rounded-[26px] p-6 ${c}`}><p className="text-sm font-semibold opacity-80">{t}</p><p className="mt-2 text-4xl font-bold tracking-tight">{v}</p></div>
            ))}
          </div>
          <p className="px-1 text-sm text-gris">{d.reservadas} reservadas · {d.borradores} en borrador</p>
          <div className="grid gap-5 xl:grid-cols-2">
            <section className="rounded-[28px] bg-white p-6">
              <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Últimas consultas</h2><Link to="/admin/consultas" className="text-sm font-semibold">Ver todas <ArrowRight size={15} className="inline" /></Link></div>
              {!d.consultas.length ? <p className="mt-4 text-gris">Aún no hay consultas.</p> : (
                <ul className="mt-3 divide-y divide-[#efebe4]">
                  {d.consultas.map(c => (
                    <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0"><p className="truncate font-semibold">{c.nombre} · <span className="font-normal text-gris">{c.tipo}</span></p><p className="truncate text-sm text-gris">{c.ficha_titulo || c.mensaje || '—'}</p></div>
                      <span className="shrink-0 text-xs text-gris">{fechaCorta(c.created_at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="rounded-[28px] bg-white p-6">
              <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Obras más vistas (30 días)</h2><Link to="/admin/estadisticas" className="text-sm font-semibold">Estadísticas <ArrowRight size={15} className="inline" /></Link></div>
              {!d.top.length ? <p className="mt-4 text-gris">Todavía no hay datos.</p> : (
                <ol className="mt-3 space-y-2.5">
                  {d.top.map(([nombre, n], i) => (
                    <li key={nombre} className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-mostaza-clara text-sm font-bold">{i + 1}</span><span className="flex-1 truncate font-semibold">{nombre}</span><span className="text-sm text-gris">{n} vistas</span></li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </div>
      )}
    </>
  )
}
