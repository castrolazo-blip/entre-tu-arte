import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Menu, X, Search, Home, Heart, MessageCircle, Images, ShoppingBag } from 'lucide-react'
import Logo from '../Logo.jsx'
import Footer from './Footer.jsx'
import { registrarEvento } from '../../lib/analytics.js'
import { useCarrito } from '../../context/CarritoContext.jsx'
import { useRestaurarScroll } from '../../lib/scroll.js'

export const MENU = [
  { to: '/', etiqueta: 'Inicio', fin: true },
  { to: '/obras', etiqueta: 'Obras' },
  { to: '/artistas', etiqueta: 'Artistas' },
  { to: '/vendidas', etiqueta: 'Vendidas' },
  { to: '/blog', etiqueta: 'Blog' },
  { to: '/asesoria', etiqueta: 'Asesoría' },
]

// Encabezado transparente sobre la portada del inicio; sólido en el resto de páginas.
export default function LayoutPublico() {
  const [abierto, setAbierto] = useState(false)
  const [scroll, setScroll] = useState(false)
  const { pathname } = useLocation()
  const { cantidad } = useCarrito()
  const sobrePortada = pathname === '/' && !scroll

  useRestaurarScroll()
  useEffect(() => { setAbierto(false); registrarEvento('visita', pathname) }, [pathname])
  useEffect(() => {
    const f = () => setScroll(window.scrollY > 40)
    f(); window.addEventListener('scroll', f, { passive: true })
    return () => window.removeEventListener('scroll', f)
  }, [])
  useEffect(() => { document.body.style.overflow = abierto ? 'hidden' : ''; return () => { document.body.style.overflow = '' } }, [abierto])

  const claro = sobrePortada || abierto
  return (
    <div className="min-h-screen bg-crema">
      <header className={`fixed inset-x-0 top-0 z-40 transition-colors ${abierto ? 'bg-[#171614]' : claro ? 'bg-transparent' : 'bg-white/95 shadow-[0_1px_0_#ebe6dd] backdrop-blur'}`}>
        <div className="contenedor flex items-center justify-between gap-6 py-3.5 md:py-4">
          <Logo claro={claro} />
          <nav aria-label="Principal" className="hidden items-center gap-8 lg:flex">
            {MENU.map(m => (
              <NavLink key={m.to} to={m.to} end={m.fin}
                className={({ isActive }) => `border-b-[3px] py-2.5 text-[15px] font-medium transition ${isActive ? 'border-mostaza' : 'border-transparent'} ${claro ? 'text-white/90 hover:text-white' : 'text-tinta hover:text-black'}`}>
                {m.etiqueta}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/obras?buscar=1" aria-label="Buscar obras" className={`hidden h-11 w-11 items-center justify-center rounded-full sm:flex ${claro ? 'bg-white/10 text-white' : 'bg-crema text-tinta'}`}><Search size={19} /></Link>
            <Link to="/carrito" aria-label={`Carrito, ${cantidad} ${cantidad === 1 ? 'obra' : 'obras'}`} className={`relative flex h-11 w-11 items-center justify-center rounded-full ${claro ? 'bg-white/10 text-white' : 'bg-crema text-tinta'}`}>
              <ShoppingBag size={19} />
              {cantidad > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-mostaza px-1 text-[11px] font-bold text-tinta">{cantidad}</span>}
            </Link>
            <Link to="/asesoria" className={`hidden h-11 items-center rounded-full px-5 text-sm font-semibold md:inline-flex ${claro ? 'border-2 border-mostaza text-mostaza' : 'bg-tinta text-white'}`}>Asesoría gratis</Link>
            <button onClick={() => setAbierto(!abierto)} aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={abierto}
              className={`flex h-12 w-12 items-center justify-center lg:hidden ${claro ? 'text-white' : 'text-tinta'}`}>
              {abierto ? <X size={28} /> : <Menu size={30} />}
            </button>
          </div>
        </div>
      </header>

      {abierto && (
        <nav aria-label="Menú principal" className="fixed inset-0 z-[35] flex flex-col overflow-y-auto overscroll-contain bg-[#171614] px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-28 text-white lg:hidden">
          <Link to="/obras?buscar=1" className="flex h-14 shrink-0 items-center gap-3 rounded-full bg-white/10 px-5 text-white/80"><Search size={20} />Busca obra, color o artista</Link>
          <div className="mt-5 flex flex-col">
            {MENU.map(m => (
              <NavLink key={m.to} to={m.to} end={m.fin}
                className={({ isActive }) => `flex h-14 shrink-0 items-center border-b border-white/10 text-[26px] font-medium tracking-tight ${isActive ? 'text-mostaza' : ''}`}>
                {m.etiqueta}
              </NavLink>
            ))}
          </div>
          <Link to="/asesoria" className="btn-primario mt-8 shrink-0">Asesoría para mi espacio</Link>
        </nav>
      )}

      <main><Outlet /></main>
      <Footer />

      {/* Barra inferior flotante en celular */}
      <nav aria-label="Accesos rápidos" className={`fixed inset-x-4 bottom-4 z-30 ${abierto ? 'hidden' : 'grid'} h-[68px] grid-cols-4 rounded-full bg-tinta px-2 shadow-[0_16px_30px_-12px_rgba(23,22,20,0.6)] md:hidden`}>
        {[
          { to: '/', etiqueta: 'Inicio', Icono: Home, fin: true },
          { to: '/obras', etiqueta: 'Obras', Icono: Images },
          { to: '/vendidas', etiqueta: 'Vendidas', Icono: Heart },
          { to: '/asesoria', etiqueta: 'Asesoría', Icono: MessageCircle },
        ].map(({ to, etiqueta, Icono, fin }) => (
          <NavLink key={to} to={to} end={fin} aria-label={etiqueta} className="flex items-center justify-center">
            {({ isActive }) => (
              <span className={`flex h-12 min-w-12 items-center justify-center gap-2 rounded-full px-3.5 text-[13px] font-bold ${isActive ? 'bg-mostaza text-tinta' : 'text-white'}`}>
                <Icono size={20} />{isActive && etiqueta}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
