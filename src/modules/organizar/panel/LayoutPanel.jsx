import { useEffect, useState } from 'react'
import { Navigate, NavLink, Outlet } from 'react-router-dom'
import { CalendarRange, Users, LogOut, Loader2, Gift } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext.jsx'
import { esAdmin } from '../servicio.js'
import { Marca, ui, useTituloApp } from '../marca.jsx'

export default function LayoutPanel() {
  const { usuario, cargando, salir } = useAuth()
  const [admin, setAdmin] = useState(undefined)
  useTituloApp('Panel')
  const uid = usuario?.id

  useEffect(() => {
    if (!uid) return
    let vivo = true
    setAdmin(undefined)
    esAdmin(uid).then(a => { if (vivo) setAdmin(a) }).catch(() => { if (vivo) setAdmin(false) })
    return () => { vivo = false }
  }, [uid])

  if (cargando || (usuario && admin === undefined)) {
    return <div className={`${ui.fondo} grid place-items-center`}><Loader2 className="animate-spin text-teal-700" size={30} /></div>
  }
  if (!usuario) return <Navigate to="/organizar/entrar" replace />
  if (!admin) {
    return (
      <div className={`${ui.fondo} grid place-items-center p-5`}>
        <div className={`${ui.tarjeta} max-w-sm p-8 text-center`}>
          <div className="flex justify-center"><Marca /></div>
          <h1 className="mt-6 text-xl font-bold">Sin acceso</h1>
          <p className="mt-2 text-slate-600">La cuenta {usuario.email} no es administradora de Si nos organizamos!</p>
          <button onClick={salir} className={`${ui.btnSuave} mt-6 w-full`}>Cerrar sesión</button>
        </div>
      </div>
    )
  }

  const enlace = ({ isActive }) => `flex h-10 items-center gap-2 rounded-full px-4 text-sm font-bold transition ${isActive ? 'bg-white text-teal-800' : 'text-white/85 hover:bg-white/10'}`
  return (
    <div className={ui.fondo}>
      <header className="sticky top-0 z-20 bg-teal-700 text-white shadow">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
          <NavLink to="/organizar/panel" end><Marca claro chica /></NavLink>
          <nav className="ml-auto flex items-center gap-1">
            <NavLink to="/organizar/panel" end className={enlace}><CalendarRange size={17} /><span className="hidden sm:inline">Eventos</span></NavLink>
            <NavLink to="/organizar/panel/amigo-secreto" className={enlace}><Gift size={17} /><span className="hidden sm:inline">Amigo secreto</span></NavLink>
            <NavLink to="/organizar/panel/participantes" className={enlace}><Users size={17} /><span className="hidden sm:inline">Participantes</span></NavLink>
            <button onClick={salir} className="grid h-10 w-10 place-items-center rounded-full text-white/85 hover:bg-white/10" aria-label="Cerrar sesión" title="Cerrar sesión"><LogOut size={18} /></button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 pb-20">
        <Outlet />
      </main>
    </div>
  )
}
