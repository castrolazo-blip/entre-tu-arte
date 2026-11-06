import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'

// Cartas con Amor · que nada se pierda si se sale de la aplicación (WhatsApp, llamada, recarga del celular)

// Borrador de un formulario guardado en el teléfono mientras se escribe.
// limpiar() se llama al guardar o al cancelar a propósito.
export function useBorrador(clave, inicial, limpiarValor = v => v) {
  const k = 'cca_form_' + clave
  const [valor, setValor] = useState(() => {
    try { const g = JSON.parse(localStorage.getItem(k) || 'null'); return g ? limpiarValor({ ...inicial, ...g }) : inicial }
    catch { return inicial }
  })
  useEffect(() => {
    const t = setTimeout(() => { try { localStorage.setItem(k, JSON.stringify(valor)) } catch { /* sin almacenamiento */ } }, 300)
    return () => clearTimeout(t)
  }, [k, valor])
  const limpiar = useCallback(() => { try { localStorage.removeItem(k) } catch { /* sin almacenamiento */ } }, [k])
  return [valor, setValor, limpiar]
}
export const hayBorrador = clave => { try { return !!localStorage.getItem('cca_form_' + clave) } catch { return false } }

// Ventana abierta guardada en la dirección (?abrir=…): si la página se recarga, se vuelve a abrir.
// Además, el botón «atrás» del celular cierra la ventana en lugar de salir de la pantalla.
export function useVentana(nombre) {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const actual = params.get('abrir') || ''
  const abierta = actual === nombre || actual.startsWith(nombre + ':')
  const valor = abierta ? (actual.split(':')[1] || true) : null
  const abrir = useCallback((v) => {
    const n = new URLSearchParams(params)
    n.set('abrir', v && v !== true ? `${nombre}:${v}` : nombre)
    setParams(n, { state: { ventana: true } })
  }, [params, setParams, nombre])
  const cerrar = useCallback(() => {
    if (location.state?.ventana) { navigate(-1); return }
    const n = new URLSearchParams(params); n.delete('abrir'); setParams(n, { replace: true })
  }, [params, setParams, navigate, location.state])
  return [valor, abrir, cerrar]
}
