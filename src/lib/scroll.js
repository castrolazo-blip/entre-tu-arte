import { useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

// Recuerda dónde iba cada página y, al regresar (botón atrás o gesto), vuelve
// al mismo punto. Al abrir una página nueva empieza arriba.
const clave = k => `eta_scroll_${k}`

export function useRestaurarScroll() {
  const location = useLocation()
  const tipo = useNavigationType()
  const rutaAnterior = useRef(null)

  useEffect(() => {
    try { if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual' } catch { /* nada */ }
  }, [])

  // Guardar la posición mientras se desplaza. useLayoutEffect: el escucha se
  // quita antes de que la página nueva (más corta) mueva el scroll.
  useLayoutEffect(() => {
    let cuadro = 0
    const guardar = () => {
      if (cuadro) return
      cuadro = requestAnimationFrame(() => {
        cuadro = 0
        try { sessionStorage.setItem(clave(location.key), String(Math.round(window.scrollY))) } catch { /* nada */ }
      })
    }
    window.addEventListener('scroll', guardar, { passive: true })
    return () => { cancelAnimationFrame(cuadro); window.removeEventListener('scroll', guardar) }
  }, [location.key])

  // Ir arriba o volver a la posición guardada
  useLayoutEffect(() => {
    const cambioDeRuta = rutaAnterior.current !== location.pathname
    rutaAnterior.current = location.pathname
    if (tipo !== 'POP') {
      if (tipo === 'PUSH' || cambioDeRuta) window.scrollTo(0, 0)
      return
    }
    let y = 0
    try { y = Number(sessionStorage.getItem(clave(location.key))) || 0 } catch { /* nada */ }
    if (!y) { window.scrollTo(0, 0); return }

    // La página puede tardar en cargar sus obras: se reintenta hasta que alcance
    let cancelado = false, intentos = 0, t = 0
    const probar = () => {
      if (cancelado) return
      const max = document.documentElement.scrollHeight - window.innerHeight
      if (max >= y - 2 || intentos++ > 60) { window.scrollTo(0, Math.min(y, Math.max(max, 0))); return }
      t = setTimeout(probar, 80)
    }
    probar()
    // Si la persona empieza a desplazarse, se deja de insistir
    const parar = () => { cancelado = true }
    window.addEventListener('touchstart', parar, { passive: true })
    window.addEventListener('wheel', parar, { passive: true })
    return () => {
      cancelado = true; clearTimeout(t)
      window.removeEventListener('touchstart', parar)
      window.removeEventListener('wheel', parar)
    }
  }, [location.key]) // eslint-disable-line react-hooks/exhaustive-deps
}
