import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import CargandoModulo from './components/CargandoModulo.jsx'
import { AuthProvider } from './modules/auth/AuthContext.jsx'
import { ConfigProvider } from './context/ConfigContext.jsx'
import { CarritoProvider } from './context/CarritoContext.jsx'
import RutaAdmin from './modules/auth/RutaAdmin.jsx'
import LayoutPublico from './components/publico/LayoutPublico.jsx'
import Inicio from './modules/inicio/Inicio.jsx'

// ── Carga diferida: cada módulo se descarga solo cuando se visita ──
// Tienda
const Colecciones    = lazy(() => import('./modules/colecciones/Colecciones.jsx'))
const Catalogo       = lazy(() => import('./modules/catalogo/Catalogo.jsx'))
const ObraDetalle    = lazy(() => import('./modules/catalogo/ObraDetalle.jsx'))
const Vendidas       = lazy(() => import('./modules/vendidas/Vendidas.jsx'))
const Nosotros       = lazy(() => import('./modules/nosotros/Nosotros.jsx'))
const Artistas       = lazy(() => import('./modules/artistas/Artistas.jsx'))
const ArtistaDetalle = lazy(() => import('./modules/artistas/ArtistaDetalle.jsx'))
const Blog           = lazy(() => import('./modules/blog/Blog.jsx'))
const Articulo       = lazy(() => import('./modules/blog/Articulo.jsx'))
const Asesoria       = lazy(() => import('./modules/asesoria/Asesoria.jsx'))
const Carrito        = lazy(() => import('./modules/carrito/Carrito.jsx'))
// Administración
const Login              = lazy(() => import('./modules/auth/Login.jsx'))
const LayoutAdmin        = lazy(() => import('./modules/admin/LayoutAdmin.jsx'))
const Resumen            = lazy(() => import('./modules/admin/Resumen.jsx'))
const AdminObras         = lazy(() => import('./modules/admin/obras/AdminObras.jsx'))
const SubirObraIA        = lazy(() => import('./modules/admin/publicar/SubirObraIA.jsx'))
const SubirLote          = lazy(() => import('./modules/admin/publicar/SubirLote.jsx'))
const AdminPortadas      = lazy(() => import('./modules/admin/portadas/AdminPortadas.jsx'))
const AdminDestacadas    = lazy(() => import('./modules/admin/destacadas/AdminDestacadas.jsx'))
const AdminConsultas     = lazy(() => import('./modules/admin/consultas/AdminConsultas.jsx'))
const AdminMarketplace = lazy(() => import('./modules/admin/marketplace/AdminMarketplace.jsx'))
const Estadisticas = lazy(() => import('./modules/admin/estadisticas/Estadisticas.jsx'))
const Marketplace    = lazy(() => import('./modules/marketplace/Marketplace.jsx'))
const Vender         = lazy(() => import('./modules/marketplace/Vender.jsx'))
const CondicionesArtistas = lazy(() => import('./modules/marketplace/CondicionesArtistas.jsx'))
const AdminArtistas      = lazy(() => import('./modules/admin/artistas/AdminArtistas.jsx'))
const AdminColecciones   = lazy(() => import('./modules/admin/colecciones/AdminColecciones.jsx'))
const AdminBlog          = lazy(() => import('./modules/admin/blog/AdminBlog.jsx'))
const AdminConfiguracion = lazy(() => import('./modules/admin/configuracion/AdminConfiguracion.jsx'))

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <AuthProvider>
        <ConfigProvider>
        <CarritoProvider>
          <ErrorBoundary>
            <Suspense fallback={<CargandoModulo />}>
              <Routes>
                <Route element={<LayoutPublico />}>
                  <Route index element={<Inicio />} />
                  <Route path="colecciones" element={<Colecciones />} />
                  <Route path="obras" element={<Catalogo />} />
                  <Route path="obra/:id" element={<ObraDetalle />} />
                  <Route path="vendidas" element={<Vendidas />} />
                  <Route path="por-pedido" element={<Vendidas />} />
                  <Route path="nosotros" element={<Nosotros />} />
                  <Route path="marketplace" element={<Marketplace />} />
                  <Route path="vender" element={<Vender />} />
                  <Route path="condiciones-artistas" element={<CondicionesArtistas />} />
                  <Route path="artistas" element={<Artistas />} />
                  <Route path="artistas/:slug" element={<ArtistaDetalle />} />
                  <Route path="blog" element={<Blog />} />
                  <Route path="blog/:id" element={<Articulo />} />
                  <Route path="asesoria" element={<Asesoria />} />
                  <Route path="carrito" element={<Carrito />} />
                </Route>

                <Route path="login" element={<Login />} />
                <Route path="admin" element={<RutaAdmin><LayoutAdmin /></RutaAdmin>}>
                  <Route index element={<Resumen />} />
                  <Route path="obras" element={<AdminObras />} />
                  <Route path="subir" element={<SubirObraIA />} />
                  <Route path="lote" element={<SubirLote />} />
                  <Route path="portadas" element={<AdminPortadas />} />
                  <Route path="destacadas" element={<AdminDestacadas />} />
                  <Route path="consultas" element={<AdminConsultas />} />
                  <Route path="marketplace" element={<AdminMarketplace />} />
                  <Route path="estadisticas" element={<Estadisticas />} />
                  <Route path="artistas" element={<AdminArtistas />} />
                  <Route path="colecciones" element={<AdminColecciones />} />
                  <Route path="blog" element={<AdminBlog />} />
                  <Route path="configuracion" element={<AdminConfiguracion />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
          <Toaster position="top-center" toastOptions={{ style: { borderRadius: '999px', fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 600 } }} />
        </CarritoProvider>
        </ConfigProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
