import { Component } from 'react'

// Tras publicar una versión nueva, una pestaña abierta puede pedir archivos que ya no existen.
// Se recarga una sola vez para tomar la versión nueva en lugar de quedar en blanco.
export function recargarPorVersionNueva() {
  try {
    const clave = 'eta_recarga_version'
    if (sessionStorage.getItem(clave)) return false
    sessionStorage.setItem(clave, '1')
    window.location.reload()
    return true
  } catch { return false }
}

export default class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error) {
    if (/dynamically imported module|Importing a module script failed/i.test(String(error?.message))) recargarPorVersionNueva()
  }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold">Algo salió mal</h1>
          <p className="mt-2 text-gris">Recarga la página para intentarlo de nuevo.</p>
          <button onClick={() => window.location.reload()} className="btn-oscuro mt-6">Recargar</button>
        </div>
      </div>
    )
  }
}
