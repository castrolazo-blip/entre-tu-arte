// Borrador local (IndexedDB): fotos, campos y trabajo de IA en curso. Permite salir de la página
// mientras la IA trabaja y encontrarlo todo al volver, como en el sitio anterior.
function abrir() {
  return new Promise((ok, falla) => {
    const req = indexedDB.open('eta-admin-v2', 1)
    req.onupgradeneeded = () => req.result.createObjectStore('borrador')
    req.onsuccess = () => ok(req.result)
    req.onerror = () => falla(req.error)
  })
}

async function operar(modo, fn) {
  try {
    const db = await abrir()
    return await new Promise((ok, falla) => {
      const st = db.transaction('borrador', modo).objectStore('borrador')
      const req = fn(st)
      req.onsuccess = () => ok(req.result)
      req.onerror = () => falla(req.error)
    })
  } catch { return null }
}

export const leerBorrador = () => operar('readonly', st => st.get('actual'))
export const guardarBorrador = valor => operar('readwrite', st => st.put(valor, 'actual'))
export const borrarBorrador = () => operar('readwrite', st => st.delete('actual'))
