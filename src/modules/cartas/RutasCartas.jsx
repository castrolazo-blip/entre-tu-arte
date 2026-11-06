import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useSearchParams } from 'react-router-dom'
import CargandoModulo from '../../components/CargandoModulo.jsx'
import { CartasProvider } from './CartasContext.jsx'

// Cartas con Amor · módulo TEMPORAL. Todo vive bajo /cartas y en esta carpeta.
// Para quitarlo: ver docs/cartas/QUITAR_CARTAS.md
const EnviarCarta  = lazy(() => import('./publico/EnviarCarta.jsx'))
const Entrar       = lazy(() => import('./panel/Entrar.jsx'))
const LayoutCartas = lazy(() => import('./panel/LayoutCartas.jsx'))
const Tablero      = lazy(() => import('./panel/Tablero.jsx'))
const Retiros      = lazy(() => import('./panel/Retiros.jsx'))
const Parejas      = lazy(() => import('./panel/Parejas.jsx'))
const FichaPareja  = lazy(() => import('./panel/FichaPareja.jsx'))
const Bandeja      = lazy(() => import('./panel/Bandeja.jsx'))
const Pendientes   = lazy(() => import('./panel/Pendientes.jsx'))
const Impresion    = lazy(() => import('./panel/Impresion.jsx'))
const Configuracion = lazy(() => import('./panel/Configuracion.jsx'))
const MisParejas   = lazy(() => import('./panel/MisParejas.jsx'))

export default function RutasCartas() {
  return (
    <Suspense fallback={<CargandoModulo />}>
      <Routes>
        <Route path="enviar" element={<EnviarCarta />} />
        <Route path="equipo" element={<IrAEntrar />} />
        <Route path="entrar" element={<Entrar />} />
        <Route path="panel" element={<CartasProvider><LayoutCartas /></CartasProvider>}>
          <Route index element={<Tablero />} />
          <Route path="retiros" element={<Retiros />} />
          <Route path="parejas" element={<Parejas />} />
          <Route path="parejas/:id" element={<FichaPareja />} />
          <Route path="cartas" element={<Bandeja />} />
          <Route path="pendientes" element={<Pendientes />} />
          <Route path="impresion" element={<Impresion />} />
          <Route path="configuracion" element={<Configuracion />} />
          <Route path="mis-parejas" element={<MisParejas />} />
        </Route>
        <Route path="*" element={<Navigate to="/cartas/panel" replace />} />
      </Routes>
    </Suspense>
  )
}

// Enlaces antiguos /cartas/equipo?t=… → entrada del equipo
function IrAEntrar() {
  const [params] = useSearchParams()
  return <Navigate to={`/cartas/entrar?equipo=${encodeURIComponent(params.get('t') || '')}`} replace />
}
