import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext.jsx'
import { miPerfil, listarRetiros, cargarRetiro } from './cartasService.js'
import { NO_VALIDAS, APROBADAS } from './constantes.js'

// Estado del panel: perfil del usuario, retiros a los que tiene acceso, retiro elegido y sus datos.
const Ctx = createContext(null)
const CLAVE = 'cca_retiro'

export function CartasProvider({ children }) {
  const { usuario, cargando: cargandoSesion } = useAuth()
  const [perfil, setPerfil] = useState(undefined)       // undefined = cargando · null = sin acceso
  const [retiros, setRetiros] = useState([])
  const [retiroId, setRetiroIdState] = useState(() => { try { return localStorage.getItem(CLAVE) } catch { return null } })
  const [datos, setDatos] = useState({ parejas: [], remitentes: [], cartas: [] })
  const [cargandoDatos, setCargandoDatos] = useState(false)
  const [error, setError] = useState(null)

  const setRetiroId = useCallback((id) => {
    setRetiroIdState(id)
    try { id ? localStorage.setItem(CLAVE, id) : localStorage.removeItem(CLAVE) } catch { /* sin almacenamiento */ }
  }, [])

  const recargarRetiros = useCallback(async () => {
    const lista = await listarRetiros()
    setRetiros(lista)
    return lista
  }, [])

  useEffect(() => {
    if (cargandoSesion) return
    if (!usuario) { setPerfil(null); return }
    let vivo = true
    setPerfil(undefined)
    miPerfil(usuario.id).then(async p => {
      if (!vivo) return
      if (!p?.activo) { setPerfil(null); return }
      const lista = await listarRetiros()
      if (!vivo) return
      setRetiros(lista)
      setPerfil(p)
    }).catch(e => { if (vivo) { setError(e); setPerfil(null) } })
    return () => { vivo = false }
  }, [usuario, cargandoSesion])

  // Si el retiro guardado ya no está disponible, se elige el primero activo
  useEffect(() => {
    if (!retiros.length) return
    if (!retiros.some(r => r.id === retiroId)) {
      setRetiroId((retiros.find(r => r.estado === 'activo') || retiros[0]).id)
    }
  }, [retiros, retiroId, setRetiroId])

  const recargar = useCallback(async () => {
    if (!retiroId) return
    setCargandoDatos(true)
    try { setDatos(await cargarRetiro(retiroId)); setError(null) }
    catch (e) { setError(e) }
    finally { setCargandoDatos(false) }
  }, [retiroId])

  useEffect(() => { if (perfil && retiroId) recargar() }, [perfil, retiroId, recargar])

  // Reemplaza una fila sin recargar todo
  const actualizarLocal = useCallback((tabla, fila) => {
    setDatos(d => {
      const lista = d[tabla]
      const existe = lista.some(x => x.id === fila.id)
      return { ...d, [tabla]: existe ? lista.map(x => (x.id === fila.id ? { ...x, ...fila } : x)) : [fila, ...lista] }
    })
  }, [])

  const retiro = retiros.find(r => r.id === retiroId) || null
  const indicadores = useMemo(() => calcularIndicadores(datos), [datos])

  const valor = {
    perfil, esAdmin: perfil?.rol === 'administrador', puedeLeer: perfil?.rol === 'administrador' || !!perfil?.puede_leer,
    retiros, retiro, retiroId, setRetiroId, recargarRetiros,
    ...datos, indicadores, cargandoDatos, error, recargar, actualizarLocal,
  }
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

export const useCartas = () => useContext(Ctx)

// Indicadores por pareja y totales del retiro (solo parejas activas)
export function calcularIndicadores({ parejas, remitentes, cartas }) {
  const porPareja = {}
  for (const p of parejas) {
    porPareja[p.id] = { recibidas: 0, aprobadas: 0, listas: 0, entregadas: 0, revision: 0, adicionales: 0,
      esperados: 0, pendientes: 0, recibidos: 0, exentos: 0 }
  }
  for (const c of cartas) {
    const x = porPareja[c.pareja_id]; if (!x || NO_VALIDAS.includes(c.estado)) continue
    x.recibidas++
    if (APROBADAS.includes(c.estado)) x.aprobadas++
    if (c.estado === 'lista') x.listas++
    if (c.estado === 'entregada') x.entregadas++
    if (['recibida', 'en_revision'].includes(c.estado)) x.revision++
    if (!c.remitente_id) x.adicionales++
  }
  for (const r of remitentes) {
    const x = porPareja[r.pareja_id]; if (!x) continue
    x.esperados++
    if (r.estado === 'pendiente' || r.estado === 'revision') x.pendientes++
    if (r.estado === 'recibido') x.recibidos++
    if (r.estado === 'exento') x.exentos++
  }
  const activas = parejas.filter(p => p.estado === 'activa')
  const suma = k => activas.reduce((s, p) => s + porPareja[p.id][k], 0)
  return {
    porPareja,
    totales: {
      parejas: activas.length,
      esperados: suma('esperados'),
      recibidas: suma('recibidas'),
      aprobadas: suma('aprobadas'),
      porRevisar: suma('revision'),
      pendientes: suma('pendientes'),
      adicionales: suma('adicionales'),
      sinCartas: activas.filter(p => porPareja[p.id].recibidas === 0).length,
      entregadas: suma('entregadas'),
    },
  }
}
