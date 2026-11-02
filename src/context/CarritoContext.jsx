import { createContext, useContext, useEffect, useMemo, useState } from 'react'

// Carrito guardado en este dispositivo. Cada obra única entra una sola vez; las ediciones
// limitadas permiten elegir cantidad (hasta las existencias).
const CarritoContext = createContext(null)
const CLAVE = 'eta_carrito'

function leer() {
  try { const v = JSON.parse(localStorage.getItem(CLAVE) || '[]'); return Array.isArray(v) ? v : [] } catch { return [] }
}

export function CarritoProvider({ children }) {
  const [items, setItems] = useState(leer)
  useEffect(() => { try { localStorage.setItem(CLAVE, JSON.stringify(items)) } catch { /* modo privado */ } }, [items])
  // Mantener sincronizado entre pestañas
  useEffect(() => {
    const f = e => { if (e.key === CLAVE) setItems(leer()) }
    window.addEventListener('storage', f)
    return () => window.removeEventListener('storage', f)
  }, [])

  const valor = useMemo(() => ({
    items,
    cantidad: items.reduce((s, x) => s + (x.cantidad || 1), 0),
    total: items.reduce((s, x) => s + (Number(x.precio) || 0) * (x.cantidad || 1), 0),
    tiene: id => items.some(x => String(x.id) === String(id)),
    agregar: obra => setItems(l => l.some(x => String(x.id) === String(obra.id)) ? l : [...l, {
      id: obra.id, titulo: obra.titulo, precio: obra.precio, foto: obra.foto, medidas: obra.medidasTexto || '',
      artista: obra.artista || '', maximo: obra.edicion_total ? Math.max(1, obra.existencias || 1) : 1, cantidad: 1,
    }]),
    cambiarCantidad: (id, n) => setItems(l => l.map(x => String(x.id) === String(id) ? { ...x, cantidad: Math.min(x.maximo || 1, Math.max(1, n)) } : x)),
    quitar: id => setItems(l => l.filter(x => String(x.id) !== String(id))),
    vaciar: () => setItems([]),
    reemplazar: setItems,
  }), [items])

  return <CarritoContext.Provider value={valor}>{children}</CarritoContext.Provider>
}

export const useCarrito = () => useContext(CarritoContext)
