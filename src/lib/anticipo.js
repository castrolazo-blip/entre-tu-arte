// Anticipo: solo para obras por pedido y encargos (el % se define en Configuración: pedido_anticipo).
// Las obras en existencia se pagan completas contra entrega.

function partes(base, total, porcentaje) {
  const pct = Math.min(100, Math.max(0, Number(porcentaje) || 0))
  const b = Number(base) || 0, t = Number(total) || 0
  const anticipo = Math.round(b * pct) / 100
  return { pct, base: b, anticipo, saldo: Math.round((t - anticipo) * 100) / 100, total: t, mixto: b > 0 && b < t }
}

// Pedido del carrito: el anticipo se calcula sobre las obras marcadas "por pedido"
export function anticipoPedido(datos, porcentaje) {
  const items = datos?.items || []
  const base = items.filter(it => it.porPedido).reduce((s, it) => s + (Number(it.precio) || 0) * (it.cantidad || 1), 0)
  return base > 0 ? partes(base, datos?.total, porcentaje) : null
}

// Encargo: estimado sobre el precio de la obra de referencia (se ajusta al precio acordado)
export function anticipoEncargo(consulta, porcentaje) {
  const p = Number(consulta?.datos?.obra_precio) || 0
  return consulta?.tipo === 'encargo' && p > 0 ? partes(p, p, porcentaje) : null
}
