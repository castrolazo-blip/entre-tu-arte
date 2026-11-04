// Anticipo y saldo de un pedido (el % se define en Configuración: pedido_anticipo)
export function anticipoYSaldo(total, porcentaje) {
  const t = Number(total) || 0
  const pct = Math.min(100, Math.max(0, Number(porcentaje) || 0))
  const anticipo = Math.round(t * pct) / 100
  return { pct, anticipo, saldo: Math.round((t - anticipo) * 100) / 100, total: t }
}
