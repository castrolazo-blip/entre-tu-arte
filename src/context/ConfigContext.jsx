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
  pedido_tiempo: '3 a 4 semanas',
  orden_obras: '[]',
  pedido_anticipo: '25',
  // Nuestra historia (mismas claves que la página anterior)
  nos_titulo: 'Nuestra historia',
  nos_lema: 'Arte que transforma espacios, conecta emociones.',
  nos_p1: 'Bienvenido a la galería virtual de Entre tu Arte, un espacio donde cada obra está pensada para transformar ambientes y conectar emocionalmente con quienes los habitan.',
  nos_p2: 'Aquí encontrarás una selección de piezas disponibles listas para darle identidad a tus espacios: salas que inspiran, habitaciones que transmiten calma y rincones que cuentan una historia.',
  nos_p3: 'Además, creamos obras personalizadas que se adaptan a tu estilo, tus medidas y la esencia de tu hogar, logrando que cada cuadro encaje de manera natural y armónica en tu ambiente.',
  nos_p4: 'Somos una galería conformada por artistas exclusivos de nuestro staff, lo que nos permite cuidar cada detalle en el diseño, la técnica y la calidad de cada pieza.',
  nos_resumen: 'Pintamos a mano cuadros decorativos y los adaptamos a tu estilo, tus medidas y la esencia de tu hogar, para que cada pieza encaje de manera natural y armónica en tu ambiente.',
  nos_cierre: 'Si no encuentras la pieza ideal, la creamos para vos.',
  // Tarjeta "Nuestros artistas" del inicio
  art_titulo: 'Detrás de cada obra hay un artista',
  nos_texto: 'Arte decorativo pintado a mano por artistas de nuestro equipo, en el tamaño y el estilo que tu espacio necesita.',
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
