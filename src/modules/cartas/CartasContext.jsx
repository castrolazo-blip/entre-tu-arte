import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext.jsx'
import { miPerfil, listarRetiros, cargarRetiro, reclamarAcceso } from './cartasService.js'
import { NO_VALIDAS } from './constantes.js'

// Estado del panel: perfil del usuario, retiros a los que tiene acceso, retiro elegido y sus datos.
const Ctx = createContext(null)
const CLAVE = 'cca_retiro'

export function CartasProvider({ children }) {
  const { usuario, cargando: cargandoSesion } = useAuth()
  const [perfil, setPerfil] = useState(undefined)       // undefined = cargando · null = sin acceso
  const [retiros, setRetiros] = useState([])
  const [retiroId, setRetiroIdState] = useState(() => { try { return localStorage.getItem(CLAVE) } catch { return null } })
  const [datos, setDatos] = useState({ parejas: [], remitentes: [], cartas: [], equipo: [] })
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
      // Miembro del equipo que entra por primera vez con su correo registrado
      if (!p && await reclamarAcceso()) p = await miPerfil(usuario.id)
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
  const indicadores = useMemo(() => calcularIndicadores(datos, retiro?.meta_por_persona || 0), [datos, retiro?.meta_por_persona])

  // Matrimonio del equipo al que pertenece quien entró (por su correo)
  const correo = (usuario?.email || '').toLowerCase()
  const miEquipo = datos.equipo.find(e => correo && (e.esposo_correo === correo || e.esposa_correo === correo)) || null

  const valor = {
    miEquipo,
    perfil, esAdmin: perfil?.rol === 'administrador', puedeLeer: perfil?.rol === 'administrador' || !!perfil?.puede_leer,
    retiros, retiro, retiroId, setRetiroId, recargarRetiros,
    ...datos, indicadores, cargandoDatos, error, recargar, actualizarLocal,
  }
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

export const useCartas = () => useContext(Ctx)

// Indicadores por pareja y totales del retiro (solo parejas activas)
// Meta por persona: una carta «para ambos» cuenta para los dos (cada uno la recibe).
export function calcularIndicadores({ parejas, remitentes, cartas }, meta = 0) {
  const porPareja = {}
  for (const p of parejas) {
    porPareja[p.id] = { recibidas: 0, enPapel: 0, aImprimir: 0, duplicados: 0, adicionales: 0,
      esperados: 0, pendientes: 0, recibidos: 0, exentos: 0, paraA: 0, paraB: 0, contactos: 0, contactosPendientes: 0 }
  }
  for (const c of cartas) {
    const x = porPareja[c.pareja_id]; if (!x || NO_VALIDAS.includes(c.estado)) continue
    x.recibidas++
    if (c.origen === 'fisica' && !c.cca_archivos?.length) x.enPapel++; else x.aImprimir++
    if (c.posible_duplicado) x.duplicados++
    if (!c.remitente_id) x.adicionales++
    if (c.destinatario !== 'B') x.paraA++
    if (c.destinatario !== 'A') x.paraB++
  }
  for (const r of remitentes) {
    const x = porPareja[r.pareja_id]; if (!x) continue
    if (r.coordinador) { x.contactos++; if (r.estado === 'pendiente' || r.estado === 'revision') x.contactosPendientes++; continue }
    x.esperados++
    if (r.estado === 'pendiente' || r.estado === 'revision') x.pendientes++
    if (r.estado === 'recibido') x.recibidos++
    if (r.estado === 'exento') x.exentos++
  }
  for (const x of Object.values(porPareja)) {
    x.faltanA = Math.max(0, meta - x.paraA); x.faltanB = Math.max(0, meta - x.paraB)
    x.faltan = x.faltanA + x.faltanB
    x.metaCumplida = meta > 0 && x.faltan === 0
  }
  const activas = parejas.filter(p => p.estado === 'activa')
  const suma = k => activas.reduce((s, p) => s + porPareja[p.id][k], 0)
  return {
    porPareja,
    totales: {
      parejas: activas.length,
      esperados: suma('esperados'),
      recibidas: suma('recibidas'),
      enPapel: suma('enPapel'), aImprimir: suma('aImprimir'), posiblesDuplicados: suma('duplicados'),
      pendientes: suma('pendientes'),
      adicionales: suma('adicionales'),
      sinCartas: activas.filter(p => porPareja[p.id].recibidas === 0).length,
      meta, faltanMeta: suma('faltan'), metaCumplida: activas.filter(p => porPareja[p.id].metaCumplida).length,
      contactosPendientes: suma('contactosPendientes'), contactos: suma('contactos'),
    },
  }
}
