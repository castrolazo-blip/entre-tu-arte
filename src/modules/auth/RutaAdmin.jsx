import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'
import CargandoModulo from '../../components/CargandoModulo.jsx'

export default function RutaAdmin({ children }) {
  const { usuario, esAdmin, cargando, salir } = useAuth()
  const location = useLocation()
  useNoIndexar()
  if (cargando) return <CargandoModulo />
  if (!usuario) return <Navigate to="/login" replace state={{ desde: location.pathname }} />
  if (!esAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-crema p-6">
        <div className="max-w-md rounded-4xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold">Sin acceso al panel</h1>
          <p className="mt-3 text-gris">Tu cuenta ({usuario.email}) no está registrada como administradora de Entre tu Arte.</p>
          <p className="mt-3 text-sm text-gris">Si acabas de registrarla en Supabase, toca "Volver a intentar".</p>
          <div className="mt-6 flex flex-col gap-2.5">
            <button onClick={() => window.location.reload()} className="btn-oscuro w-full">Volver a intentar</button>
            <button onClick={salir} className="btn-contorno w-full">Cerrar sesión</button>
          </div>
        </div>
      </div>
    )
  }
  return children
}

// El panel no debe aparecer en Google: robots.txt no aplica en GitHub Pages (el sitio vive en una
// subcarpeta), así que se marca cada página privada con <meta name="robots" content="noindex">.
export function useNoIndexar() {
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])
}
