import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'
import CargandoModulo from '../../components/CargandoModulo.jsx'

export default function RutaAdmin({ children }) {
  const { usuario, esAdmin, cargando } = useAuth()
  const location = useLocation()
  if (cargando) return <CargandoModulo />
  if (!usuario) return <Navigate to="/login" replace state={{ desde: location.pathname }} />
  if (!esAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-crema p-6">
        <div className="max-w-md rounded-4xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold">Sin acceso al panel</h1>
          <p className="mt-3 text-gris">Tu cuenta ({usuario.email}) no está registrada como administradora de Entre tu Arte.</p>
        </div>
      </div>
    )
  }
  return children
}
