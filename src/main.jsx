import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { recargarPorVersionNueva } from './components/ErrorBoundary.jsx'

// Después de publicar una versión nueva, una pestaña abierta puede pedir archivos que ya no
// existen: se recarga una vez para tomar la versión nueva en vez de quedar en blanco.
window.addEventListener('vite:preloadError', (event) => {
  if (recargarPorVersionNueva()) event.preventDefault()
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
