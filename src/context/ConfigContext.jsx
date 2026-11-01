import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

// Textos y datos de contacto editables desde el panel (tabla "configuracion", clave → valor).
const ConfigContext = createContext({ cfg: {}, recargar: () => {} })

export const CONFIG_POR_DEFECTO = {
  whatsapp: '',
  instagram: 'entretuarte',
  facebook: '',
  email: '',
  banner_etiqueta: 'Destacadas',
  banner_titulo: 'Obras de la semana',
  portada_segundos: '6',
  nos_titulo: 'Detrás de cada obra hay una historia',
  nos_texto: 'Trabajamos con artistas salvadoreños seleccionados. Cada ficha indica si la obra es original o una interpretación, y si incluye certificado de autenticidad.',
}

export function ConfigProvider({ children }) {
  const [cfg, setCfg] = useState(CONFIG_POR_DEFECTO)

  async function recargar() {
    const { data } = await supabase.from('configuracion').select('clave, valor')
    if (!data) return
    const valores = { ...CONFIG_POR_DEFECTO }
    data.forEach(({ clave, valor }) => { if (valor !== null && valor !== '') valores[clave] = valor })
    setCfg(valores)
  }

  useEffect(() => { recargar() }, [])

  return <ConfigContext.Provider value={{ cfg, recargar }}>{children}</ConfigContext.Provider>
}

export const useConfig = () => useContext(ConfigContext)

export function enlaceWhatsApp(numero, mensaje) {
  const n = String(numero || '').replace(/\D/g, '')
  if (!n) return null
  return `https://wa.me/${n}${mensaje ? '?text=' + encodeURIComponent(mensaje) : ''}`
}
