import { useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, CalendarHeart, Users, Inbox, BellRing, Printer, Settings, LogOut, RefreshCw, ArrowLeft, HeartHandshake, Home } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext.jsx'
import { useNoIndexar } from '../../auth/RutaAdmin.jsx'
import CargandoModulo from '../../../components/CargandoModulo.jsx'
import { useCartas } from '../CartasContext.jsx'
import { Marca, useTituloCartas } from '../publico/marca.jsx'
import { Etiqueta } from '../ui.jsx'

const MENU = [
  { to: '/cartas/panel', etiqueta: 'Inicio', Icono: Home, fin: true, simple: true },
  { to: '/cartas/panel/pendientes', etiqueta: 'Gestión de cartas', Icono: BellRing, contador: 'contactosPendientes', simple: true },
  { to: '/cartas/panel/tablero', etiqueta: 'Avance', Icono: LayoutDashboard },
  { to: '/cartas/panel/cartas', etiqueta: 'Cartas', Icono: Inbox, contador: 'posiblesDuplicados', simple: true },
  { to: '/cartas/panel/parejas', etiqueta: 'Parejas', Icono: Users },
  { to: '/cartas/panel/impresion', etiqueta: 'Impresión y sobres', Icono: Printer },
  { to: '/cartas/panel/retiros', etiqueta: 'Retiros', Icono: CalendarHeart },
  { to: '/cartas/panel/configuracion', etiqueta: 'Configuración', Icono: Settings, soloAdmin: true },
]

export default function LayoutCartas() {
  const { usuario, cargando, salir } = useAuth()
  const { perfil, esAdmin, retiros, retiro, setRetiroId, indicadores, recargar, cargandoDatos, miEquipo, equipo } = useCartas()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  // Versión nueva publicada: el panel no se recarga solo (se perdería un registro a medias), avisa
  const [versionNueva, setVersionNueva] = useState(false)
  useEffect(() => {
    const f = () => setVersionNueva(true)
    window.addEventListener('eta-version-nueva', f)
    return () => window.removeEventListener('eta-version-nueva', f)
  }, [])
  const enInicio = pathname.replace(/\/$/, '') === '/cartas/panel'
  // Atrás: vuelve a la pantalla anterior; si se entró directo (sin historial), sube un nivel
  function regresar() {
    if ((window.history.state?.idx ?? 0) > 0) { navigate(-1); return }
    const ficha = /^\/cartas\/panel\/parejas\/[^/]+/.test(pathname)
    navigate(ficha ? '/cartas/panel/parejas' : '/cartas/panel')
  }
  useNoIndexar()
  useTituloCartas('Panel')

  if (cargando || (usuario && perfil === undefined)) return <CargandoModulo />
  if (!usuario) return <Navigate to="/cartas/entrar" replace />
  if (!perfil) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f1ec] p-6">
        <div className="max-w-md rounded-[28px] bg-white p-8 text-center">
          <h1 className="text-2xl font-semibold">Sin acceso</h1>
          <p className="mt-3 text-gris">Tu cuenta ({usuario.email}) no está registrada como organizadora de Cartas con Amor, o está desactivada.</p>
          <p className="mt-2 text-sm text-gris">Pide a un administrador que te agregue en Configuración › Usuarios.</p>
          <div className="mt-6 flex flex-col gap-2.5">
            <button onClick={() => window.location.reload()} className="h-12 rounded-full bg-vino font-semibold text-white">Volver a intentar</button>
            <button onClick={salir} className="h-12 rounded-full border border-crema-borde font-semibold">Cerrar sesión</button>
          </div>
        </div>
      </div>
    )
  }

  const t = indicadores.totales
  const menu = (
    <nav aria-label="Cartas con Amor" className="flex flex-col gap-1">
      {MENU.filter(m => esAdmin ? (!m.equipo || miEquipo || equipo.length) : m.simple)
        // Para un miembro del equipo, «Mis parejas» va primero
        .sort((a, b) => (miEquipo && !esAdmin ? (b.equipo ? 1 : 0) - (a.equipo ? 1 : 0) : 0))
        .map(({ to, etiqueta: et, Icono, fin, contador, equipo: deEquipo }) => { const etiqueta = deEquipo && !miEquipo && esAdmin ? 'Bandejas del equipo' : et; return (
        <NavLink key={to} to={to} end={fin}
          className={({ isActive }) => `flex h-11 items-center gap-3 rounded-full px-4 text-sm font-semibold transition ${isActive ? 'bg-white text-vino' : 'text-white hover:bg-white/10'}`}>
          <Icono size={18} /><span className="flex-1">{etiqueta}</span>
          {contador && t[contador] > 0 && <span className="rounded-full bg-oro px-2 py-0.5 text-xs text-white">{t[contador]}</span>}
        </NavLink>
      )})}
    </nav>
  )

  const selector = retiros.length > 0 && (
    <label className="block">
      <span className="sr-only">Retiro</span>
      <select value={retiro?.id || ''} onChange={e => setRetiroId(e.target.value)}
        className="h-11 w-full rounded-full border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white outline-none [&>option]:text-tinta">
        {retiros.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
      </select>
    </label>
  )

  const pie = (
    <div className="border-t border-white/10 pt-3">
      <p className="truncate px-4 text-xs text-white/60">{perfil.nombre} · {perfil.rol}{!esAdmin && !perfil.puede_leer ? ' (sin lectura)' : ''}</p>
      <button onClick={() => { if (!perfil.correo && !window.confirm('Para volver a entrar necesitarás el enlace de tu matrimonio. ¿Salir?')) return; salir() }} className="mt-1 flex h-10 w-full items-center gap-3 rounded-full px-4 text-sm text-white/80 hover:bg-white/10"><LogOut size={16} />Salir</button>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f4efea] lg:flex lg:gap-5 lg:p-5">
      <aside className="hidden w-64 shrink-0 flex-col gap-4 rounded-[28px] bg-vino p-4 text-white lg:sticky lg:top-5 lg:flex lg:h-[calc(100vh-40px)]">
        <Link to="/cartas/panel" aria-label="Ir al inicio del panel" className="block rounded-2xl px-2 pt-2"><Marca claro compacta /></Link>
        {selector}
        <div className="flex-1 overflow-y-auto">{menu}</div>
        {pie}
      </aside>

      <header className="sticky top-0 z-30 bg-vino px-4 py-3 text-white lg:hidden">
        <div className="flex items-center justify-between">
          <Link to="/cartas/panel" aria-label="Ir al inicio del panel"><Marca claro compacta /></Link>
          {!enInicio && <Link to="/cartas/panel" aria-label="Inicio" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10"><Home size={22} /></Link>}
        </div>
      </header>

      {/* overflow-x-clip: nada puede correr la pantalla hacia los lados en el celular */}
      <main className="min-w-0 flex-1 overflow-x-clip px-4 py-5 lg:px-2 lg:py-3">
        {versionNueva && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[20px] bg-oro-claro p-3 text-sm">
            <span><b>Hay una versión nueva del panel.</b> Actualiza para usarla.</span>
            <button onClick={() => window.location.reload()} className="h-10 rounded-full bg-vino px-5 font-semibold text-white">Actualizar ahora</button>
          </div>
        )}
        {retiro && (
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
            {!enInicio && (
              <button onClick={regresar} aria-label="Regresar a la pantalla anterior"
                className="-ml-1 inline-flex h-10 items-center gap-1.5 rounded-full bg-white pl-3 pr-4 text-[14px] font-semibold text-vino shadow-sm hover:bg-vino-claro">
                <ArrowLeft size={18} />Atrás
              </button>
            )}
            <span className="font-semibold">{retiro.nombre}</span>
            <Etiqueta tipo="retiro" estado={retiro.estado} />
            <button onClick={recargar} disabled={cargandoDatos} className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-gris hover:bg-white disabled:opacity-50">
              <RefreshCw size={14} className={cargandoDatos ? 'animate-spin' : ''} />Actualizar
            </button>
          </div>
        )}
        {!retiro && !enInicio && (
          <button onClick={regresar} className="mb-4 inline-flex h-10 items-center gap-1.5 rounded-full bg-white pl-3 pr-4 text-[14px] font-semibold text-vino shadow-sm"><ArrowLeft size={18} />Atrás</button>
        )}
        {!retiro && !pathname.endsWith('/retiros') && !pathname.endsWith('/configuracion') ? <SinRetiro esAdmin={esAdmin} onSalir={() => { if (!perfil.correo && !window.confirm('Para volver a entrar necesitarás el enlace de tu matrimonio. ¿Salir?')) return; salir() }} /> : <Outlet />}
      </main>
    </div>
  )
}

function SinRetiro({ esAdmin, onSalir }) {
  return (
    <div className="mx-auto mt-10 max-w-md rounded-[28px] bg-white p-8 text-center">
      <CalendarHeart className="mx-auto text-vino" size={36} strokeWidth={1.6} />
      <h1 className="mt-3 text-xl font-semibold">Aún no hay retiros</h1>
      <p className="mt-2 text-sm text-gris">{esAdmin ? 'Crea el primer retiro para empezar a recibir cartas.' : 'Pide a un administrador que te asigne a un retiro.'}</p>
      {esAdmin && <NavLink to="/cartas/panel/retiros" className="mt-5 inline-flex h-11 items-center rounded-full bg-vino px-6 text-sm font-semibold text-white">Crear retiro</NavLink>}
      <div className="mt-5 flex flex-col gap-2">
        {!esAdmin && <button onClick={() => window.location.reload()} className="h-11 rounded-full bg-vino px-6 text-sm font-semibold text-white">Volver a intentar</button>}
        <button onClick={onSalir} className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-crema-borde px-6 text-sm font-semibold"><LogOut size={16} />Cerrar sesión</button>
      </div>
    </div>
  )
}
