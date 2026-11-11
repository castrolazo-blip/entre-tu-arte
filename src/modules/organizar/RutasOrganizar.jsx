import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import CargandoModulo from '../../components/CargandoModulo.jsx'

// Si nos organizamos! · aplicación independiente. Todo vive bajo /organizar y en esta carpeta.
//   /organizar/mi?c=ENLACE[&e=EVENTO|&s=SORTEO]   participante (sin cuenta)
//   /organizar/entrar · /organizar/panel administrador general
const Participante  = lazy(() => import('./participante/Participante.jsx'))
const Entrar        = lazy(() => import('./panel/Entrar.jsx'))
const LayoutPanel   = lazy(() => import('./panel/LayoutPanel.jsx'))
const Eventos       = lazy(() => import('./panel/Eventos.jsx'))
const FormEvento    = lazy(() => import('./panel/FormEvento.jsx'))
const DetalleEvento = lazy(() => import('./panel/DetalleEvento.jsx'))
const Personas      = lazy(() => import('./panel/Personas.jsx'))
const Sorteos       = lazy(() => import('./panel/Sorteos.jsx'))
const FormSorteo    = lazy(() => import('./panel/FormSorteo.jsx'))
const DetalleSorteo = lazy(() => import('./panel/DetalleSorteo.jsx'))

export default function RutasOrganizar() {
  return (
    <Suspense fallback={<CargandoModulo />}>
      <Routes>
        <Route path="mi" element={<Participante />} />
        <Route path="entrar" element={<Entrar />} />
        <Route path="panel" element={<LayoutPanel />}>
          <Route index element={<Eventos />} />
          <Route path="evento/nuevo" element={<FormEvento />} />
          <Route path="evento/:id" element={<DetalleEvento />} />
          <Route path="evento/:id/editar" element={<FormEvento />} />
          <Route path="participantes" element={<Personas />} />
          <Route path="amigo-secreto" element={<Sorteos />} />
          <Route path="amigo-secreto/nuevo" element={<FormSorteo />} />
          <Route path="amigo-secreto/:id" element={<DetalleSorteo />} />
          <Route path="amigo-secreto/:id/editar" element={<FormSorteo />} />
        </Route>
        <Route path="*" element={<Navigate to="/organizar/mi" replace />} />
      </Routes>
    </Suspense>
  )
}
