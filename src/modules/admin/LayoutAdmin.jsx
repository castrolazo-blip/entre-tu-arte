import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, Link } from 'react-router-dom'
import { LayoutDashboard, Images, Sparkles, Layers, MonitorPlay, Star, Inbox, Palette, Tags, BookOpen, Settings, LogOut, Menu, X, ExternalLink, Store } from 'lucide-react'
import Logo from '../../components/Logo.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { supabase } from '../../lib/supabase.js'
import { VERSION } from '../../lib/actualizacion.js'

export const MENU_ADMIN = [
  { to: '/admin', etiqueta: 'Resumen', Icono: LayoutDashboard, fin: true },
  { to: '/admin/obras', etiqueta: 'Obras', Icono: Images },
  { to: '/admin/subir', etiqueta: 'Subir obra con IA', Icono: Sparkles },
  { to: '/admin/lote', etiqueta: 'Subir varias obras', Icono: Layers },
  { to: '/admin/portadas', etiqueta: 'Portada dinámica', Icono: MonitorPlay },
  { to: '/admin/destacadas', etiqueta: 'Banner destacadas', Icono: Star },
  { to: '/admin/consultas', etiqueta: 'Consultas', Icono: Inbox, contador: 'consultas' },
  { to: '/admin/marketplace', etiqueta: 'Marketplace', Icono: Store, contador: 'marketplace' },
  { to: '/admin/artistas', etiqueta: 'Artistas', Icono: Palette },
  { to: '/admin/colecciones', etiqueta: 'Colecciones', Icono: Tags },
  { to: '/admin/blog', etiqueta: 'Blog', Icono: BookOpen },
  { to: '/admin/configuracion', etiqueta: 'Configuración', Icono: Settings },
]

export default function LayoutAdmin() {
  const { usuario, salir } = useAuth()
  const [abierto, setAbierto] = useState(false)
  const [contadores, setContadores] = useState({ consultas: 0, marketplace: 0 })
  const { pathname } = useLocation()

  const [versionNueva, setVersionNueva] = useState(false)
  useEffect(() => { setAbierto(false) }, [pathname])
  useEffect(() => {
    const f = () => setVersionNueva(true)
    window.addEventListener('eta-version-nueva', f)
    return () => window.removeEventListener('eta-version-nueva', f)
  }, [])
  useEffect(() => {
    supabase.from('consultas').select('id', { count: 'exact', head: true }).eq('estado', 'nueva')
      .then(({ count }) => setContadores(c => ({ ...c, consultas: count || 0 })))
    supabase.from('marketplace_solicitudes').select('id', { count: 'exact', head: true }).eq('estado', 'pendiente')
      .then(({ count }) => setContadores(c => ({ ...c, marketplace: count || 0 })))
  }, [pathname])

  const menu = (
    <nav aria-label="Administración" className="flex flex-col gap-1">
      {MENU_ADMIN.map(({ to, etiqueta, Icono, fin, contador }) => (
        <NavLink key={to} to={to} end={fin}
          className={({ isActive }) => `flex h-12 items-center gap-3 rounded-full px-4 text-sm font-semibold transition ${isActive ? 'bg-mostaza text-tinta' : 'text-white hover:bg-white/10'}`}>
          <Icono size={18} /><span className="flex-1">{etiqueta}</span>
          {contador && contadores[contador] > 0 && <span className="rounded-full bg-white px-2 py-0.5 text-xs text-tinta">{contadores[contador]}</span>}
        </NavLink>
      ))}
    </nav>
  )

  return (
    <div className="min-h-screen bg-[#f1eee8] lg:flex lg:gap-5 lg:p-5">
      <aside className="hidden w-64 shrink-0 flex-col rounded-[28px] bg-tinta p-4 text-white lg:sticky lg:top-5 lg:flex lg:h-[calc(100vh-40px)]">
        <div className="mb-1 px-2 pt-2"><Logo claro tamano="sm" to="/admin" /></div>
        <p className="mb-5 ml-2 mt-2 text-xs font-bold uppercase tracking-[0.12em] text-mostaza">Administración</p>
        <div className="flex-1 overflow-y-auto">{menu}</div>
        <div className="mt-4 border-t border-white/10 pt-4">
          <Link to="/" target="_blank" className="flex h-11 items-center gap-3 rounded-full px-4 text-sm text-white/75 hover:bg-white/10"><ExternalLink size={17} />Ver sitio</Link>
          <button onClick={salir} className="flex h-11 w-full items-center gap-3 rounded-full px-4 text-sm text-white/75 hover:bg-white/10"><LogOut size={17} />Salir</button>
          <p className="truncate px-4 pt-2 text-xs text-white/50">{usuario?.email}</p>
          <p className="px-4 pt-1 text-[11px] text-white/40">Versión {VERSION}</p>
        </div>
      </aside>

      {/* Celular: barra superior y menú desplegable */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-tinta px-4 py-3 text-white lg:hidden">
        <Logo claro tamano="sm" to="/admin" />
        <button onClick={() => setAbierto(!abierto)} aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={abierto} className="flex h-11 w-11 items-center justify-center">{abierto ? <X /> : <Menu />}</button>
      </header>
      {abierto && (
        <div className="fixed inset-0 top-[68px] z-20 overflow-y-auto bg-tinta p-4 lg:hidden">
          {menu}
          <button onClick={salir} className="mt-4 flex h-12 w-full items-center gap-3 rounded-full px-4 text-sm text-white/75"><LogOut size={17} />Salir</button>
          <p className="px-4 pt-2 text-xs text-white/40">Versión {VERSION}</p>
        </div>
      )}

      <main className="min-w-0 flex-1 p-4 pb-16 lg:p-0">
        {versionNueva && (
          <div role="status" className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-mostaza-fondo p-3 text-sm ring-1 ring-mostaza lg:m-6 lg:mb-0">
            <span><strong>Hay una versión nueva del panel.</strong> Actualiza cuando termines lo que estás haciendo.</span>
            <button onClick={() => window.location.reload()} className="btn-oscuro btn-chico shrink-0 px-4">Actualizar</button>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  )
}
