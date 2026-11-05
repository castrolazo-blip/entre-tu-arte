// Orden manual de las obras ("Recomendado"). Se guarda en Configuración (clave orden_obras) como
// una lista de ids. Las obras que no están en la lista van después, en su orden original
// (las más recientes primero), así las obras nuevas aparecen al final hasta que se acomoden.

export function leerOrden(cfg) {
  try {
    const ids = JSON.parse(cfg?.orden_obras || '[]')
    return Array.isArray(ids) ? ids.map(String) : []
  } catch { return [] }
}

export function ordenarObras(lista, ids) {
  if (!ids?.length) return lista
  const posicion = new Map(ids.map((id, i) => [String(id), i]))
  return lista
    .map((o, i) => ({ o, i }))
    .sort((a, b) => {
      const pa = posicion.get(String(a.o.id)), pb = posicion.get(String(b.o.id))
      if (pa != null && pb != null) return pa - pb
      if (pa != null) return -1
      if (pb != null) return 1
      return a.i - b.i
    })
    .map(x => x.o)
}
