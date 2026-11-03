/* global __VERSION__ */
// Busca una versión nueva publicada y recarga la página para usarla.
export const VERSION = typeof __VERSION__ === 'string' ? __VERSION__ : 'dev'

async function revisar() {
  if (VERSION.startsWith('local') || VERSION === 'dev') return
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return
    const { version } = await res.json()
    if (!version || version === VERSION) return
    // En el panel no se recarga solo (se perdería una subida o un formulario a medias):
    // se avisa y la persona actualiza cuando termine.
    if (window.location.pathname.includes('/admin')) {
      window.dispatchEvent(new CustomEvent('eta-version-nueva', { detail: version }))
      return
    }
    const clave = 'eta_recargado_' + version
    if (sessionStorage.getItem(clave)) return   // evita recargas en bucle
    sessionStorage.setItem(clave, '1')
    window.location.reload()
  } catch { /* sin conexión: se intenta más tarde */ }
}

export function vigilarActualizaciones() {
  revisar()
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') revisar() })
  setInterval(revisar, 5 * 60 * 1000)
}
