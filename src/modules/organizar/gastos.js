// Reparto de gastos. Todo en centavos para no perder ni un centavo al dividir.
export const aCentavos = x => Math.round(Number(x || 0) * 100)
export const dinero = c => `$${(Math.abs(c) / 100).toFixed(2)}`

// personas: [{ id, nombre, paga, pagado (en dólares) }]
// → { total, cuota, pagan, saldos: { id: centavos (+ le deben / − debe) }, transferencias: [{ de, a, monto }] }
export function calcularReparto(personas) {
  const lista = personas.map(p => ({ ...p, c: aCentavos(p.pagado) }))
  const total = lista.reduce((s, p) => s + p.c, 0)
  const pagan = lista.filter(p => p.paga).sort((a, b) => a.nombre.localeCompare(b.nombre))
  const saldos = Object.fromEntries(lista.map(p => [p.id, p.c]))
  if (!pagan.length || !total) return { total, cuota: 0, pagan: pagan.length, saldos, transferencias: [] }
  const base = Math.floor(total / pagan.length)
  let resto = total - base * pagan.length          // los centavos que sobran los absorben los primeros
  for (const p of pagan) { saldos[p.id] -= base + (resto > 0 ? 1 : 0); resto-- }

  // Menos pagos posibles: el que más debe le paga al que más le deben
  const deben = lista.filter(p => saldos[p.id] < 0).map(p => ({ p, v: -saldos[p.id] })).sort((a, b) => b.v - a.v)
  const cobran = lista.filter(p => saldos[p.id] > 0).map(p => ({ p, v: saldos[p.id] })).sort((a, b) => b.v - a.v)
  const transferencias = []
  let i = 0, j = 0
  while (i < deben.length && j < cobran.length) {
    const monto = Math.min(deben[i].v, cobran[j].v)
    if (monto > 0) transferencias.push({ de: deben[i].p, a: cobran[j].p, monto })
    deben[i].v -= monto; cobran[j].v -= monto
    if (!deben[i].v) i++
    if (!cobran[j].v) j++
  }
  return { total, cuota: Math.round(total / pagan.length), pagan: pagan.length, saldos, transferencias }
}
