import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import { supabase } from '../../../lib/supabase.js'
import EncabezadoAdmin from '../EncabezadoAdmin.jsx'

const PERIODOS = [[7, '7 días'], [30, '30 días'], [90, '90 días']]
const NOMBRES_PAGINA = {
  '/': 'Inicio', '/obras': 'Obras', '/obra': 'Página de una obra', '/por-pedido': 'Por pedido', '/vendidas': 'Por pedido',
  '/marketplace': 'Marketplace', '/vender': 'Vende tus cuadros', '/nosotros': 'Nuestra historia', '/artistas': 'Artistas',
  '/blog': 'Blog', '/asesoria': 'Asesoría', '/carrito': 'Carrito', '/colecciones': 'Colecciones',
}
const nombrePagina = p => NOMBRES_PAGINA[p] || (p?.startsWith('/obra/') ? 'Página de una obra' : p?.startsWith('/artistas/') ? 'Página de un artista' : p?.startsWith('/blog/') ? 'Artículo del blog' : p || '—')
const dia = d => d.toISOString().slice(0, 10)
const esConsulta = e => e.startsWith('consulta_') || e === 'asesoria' || e === 'contacto'
// "visita_sitio" es como la página anterior guardaba las visitas
const esVisita = e => e.evento === 'visita' || e.evento === 'visita_sitio'

// Lee todos los eventos desde una fecha (de 1000 en 1000, máximo 30 000)
async function leerEventos(desde) {
  const todos = []
  for (let i = 0; i < 30; i++) {
    const { data, error } = await supabase.from('analytics').select('*').gte('created_at', desde.toISOString())
      .order('created_at', { ascending: true }).range(i * 1000, i * 1000 + 999)
    if (error) throw error
    todos.push(...(data || []))
    if (!data || data.length < 1000) break
  }
  return todos
}

function resumir(eventos) {
  const visitas = eventos.filter(esVisita)
  const ids = new Set(eventos.map(e => e.visitante).filter(Boolean))
  const conId = eventos.some(e => e.visitante)
  const unicos = (evento) => new Set(eventos.filter(e => e.evento === evento && e.visitante).map(e => e.visitante)).size
  return {
    visitas: visitas.length,
    visitantes: conId ? ids.size : null,
    obrasVistas: eventos.filter(e => e.evento === 'ver_obra').length,
    carrito: eventos.filter(e => e.evento === 'agregar_carrito').length,
    pedidos: eventos.filter(e => e.evento === 'pedido_whatsapp').length,
    consultas: eventos.filter(e => esConsulta(e.evento)).length,
    embudo: conId ? [ids.size, unicos('ver_obra'), unicos('agregar_carrito'), unicos('pedido_whatsapp')] : null,
  }
}

function ranking(lista, clave, limite = 8) {
  const c = new Map()
  lista.forEach(e => { const k = clave(e); if (k) c.set(k, (c.get(k) || 0) + 1) })
  return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, limite)
}

export default function Estadisticas() {
  const [dias, setDias] = useState(30)
  const [eventos, setEventos] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setEventos(null); setError('')
    const desde = new Date(Date.now() - 2 * dias * 864e5)   // periodo actual + anterior (para comparar)
    leerEventos(desde).then(setEventos).catch(e => { setError(e.message); setEventos([]) })
  }, [dias])

  const datos = useMemo(() => {
    if (!eventos) return null
    const corte = Date.now() - dias * 864e5
    const actual = eventos.filter(e => new Date(e.created_at).getTime() >= corte)
    const anterior = eventos.filter(e => new Date(e.created_at).getTime() < corte)
    const visitas = actual.filter(esVisita)
    // Visitas por día (incluye los días sin visitas)
    const porDia = new Map()
    for (let i = dias - 1; i >= 0; i--) porDia.set(dia(new Date(Date.now() - i * 864e5)), 0)
    visitas.forEach(e => { const k = dia(new Date(e.created_at)); if (porDia.has(k)) porDia.set(k, porDia.get(k) + 1) })
    return {
      ahora: resumir(actual), antes: resumir(anterior),
      porDia: [...porDia.entries()],
      paginas: ranking(visitas, e => nombrePagina(e.pagina)),
      obras: (() => {
        // Agrupado por obra (aunque cambie de nombre) con su nombre más reciente
        const vistas = actual.filter(e => e.evento === 'ver_obra' && e.referencia_id)
        const nombre = new Map(vistas.map(e => [e.referencia_id, e.referencia_nombre || 'Obra']))
        return ranking(vistas, e => e.referencia_id).map(([id, n]) => [`${id}|${nombre.get(id)}`, n])
      })(),
      origenes: ranking(visitas, e => e.origen),
      dispositivos: ranking(visitas, e => e.dispositivo),
      hayOrigen: visitas.some(e => e.origen),
    }
  }, [eventos, dias])

  return (
    <>
      <EncabezadoAdmin ruta="Panel" titulo="Estadísticas" />
      <div role="tablist" aria-label="Periodo" className="mb-5 inline-grid grid-cols-3 rounded-full bg-white p-1">
        {PERIODOS.map(([n, t]) => (
          <button key={n} role="tab" aria-selected={dias === n} onClick={() => setDias(n)}
            className={`h-10 rounded-full px-5 text-sm font-bold ${dias === n ? 'bg-tinta text-white' : ''}`}>{t}</button>
        ))}
      </div>
      {error && <p role="alert" className="mb-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-800">No se pudieron leer las estadísticas: {error}</p>}

      {!datos ? <p className="p-6 text-gris">Cargando…</p> : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
            <Kpi titulo="Visitantes únicos" valor={datos.ahora.visitantes} antes={datos.antes.visitantes} nota={datos.ahora.visitantes == null ? 'Se activa con el SQL' : null} destacado />
            <Kpi titulo="Páginas vistas" valor={datos.ahora.visitas} antes={datos.antes.visitas} />
            <Kpi titulo="Obras vistas" valor={datos.ahora.obrasVistas} antes={datos.antes.obrasVistas} />
            <Kpi titulo="Agregadas al carrito" valor={datos.ahora.carrito} antes={datos.antes.carrito} />
            <Kpi titulo="Pedidos por WhatsApp" valor={datos.ahora.pedidos} antes={datos.antes.pedidos} />
            <Kpi titulo="Consultas" valor={datos.ahora.consultas} antes={datos.antes.consultas} />
          </div>

          <SemanaPorDia />

          <section className="rounded-[28px] bg-white p-5 md:p-6">
            <h2 className="text-lg font-bold">Páginas vistas por día</h2>
            <p className="text-sm text-gris">Últimos {dias} días · toca una barra para ver el día</p>
            <BarrasPorDia datos={datos.porDia} />
          </section>

          {datos.ahora.embudo && (
            <section className="rounded-[28px] bg-white p-5 md:p-6">
              <h2 className="text-lg font-bold">Del interés a la compra</h2>
              <p className="text-sm text-gris">Visitantes únicos que llegaron a cada paso</p>
              <Lista filas={[['Entraron a la página', datos.ahora.embudo[0]], ['Vieron una obra', datos.ahora.embudo[1]], ['Agregaron al carrito', datos.ahora.embudo[2]], ['Enviaron pedido por WhatsApp', datos.ahora.embudo[3]]]}
                total={datos.ahora.embudo[0]} porcentaje />
            </section>
          )}

          <div className="grid gap-5 xl:grid-cols-2">
            <section className="rounded-[28px] bg-white p-5 md:p-6">
              <h2 className="text-lg font-bold">Obras más vistas</h2>
              <Lista filas={datos.obras.map(([k, n]) => { const [id, nombre] = k.split('|'); return [<Link key={id} to={`/obra/${id}`} target="_blank" className="underline decoration-crema-borde underline-offset-4">{nombre}</Link>, n] })} vacio="Todavía nadie ha abierto una obra en este periodo." />
            </section>
            <section className="rounded-[28px] bg-white p-5 md:p-6">
              <h2 className="text-lg font-bold">Páginas más visitadas</h2>
              <Lista filas={datos.paginas} vacio="Sin visitas en este periodo." />
            </section>
            <section className="rounded-[28px] bg-white p-5 md:p-6">
              <h2 className="text-lg font-bold">De dónde llegan</h2>
              {datos.hayOrigen ? <Lista filas={datos.origenes} total={datos.ahora.visitas} porcentaje /> : <PendienteSQL />}
            </section>
            <section className="rounded-[28px] bg-white p-5 md:p-6">
              <h2 className="text-lg font-bold">Dispositivo</h2>
              {datos.dispositivos.length ? <Lista filas={datos.dispositivos} total={datos.ahora.visitas} porcentaje /> : <PendienteSQL />}
            </section>
          </div>
          <p className="px-1 text-xs text-gris">Datos anónimos de la propia página. No se cuentan las visitas de quien tiene sesión abierta en el panel.</p>
        </div>
      )}
    </>
  )
}

function Kpi({ titulo, valor, antes, nota, destacado }) {
  const cambio = valor != null && antes ? Math.round((valor - antes) / antes * 100) : null
  const Icono = cambio > 0 ? ArrowUpRight : cambio < 0 ? ArrowDownRight : Minus
  return (
    <div className={`rounded-[24px] p-5 ${destacado ? 'bg-tinta text-white' : 'bg-white'}`}>
      <p className="text-[13px] font-semibold opacity-75">{titulo}</p>
      <p className="mt-1.5 text-[34px] font-bold leading-none tracking-tight">{valor == null ? '—' : valor.toLocaleString('es-SV')}</p>
      {nota ? <p className="mt-2 text-xs opacity-70">{nota}</p>
        : cambio != null ? <p className="mt-2 flex items-center gap-1 text-xs font-semibold opacity-80"><Icono size={14} />{cambio > 0 ? '+' : ''}{cambio}% vs. periodo anterior</p>
        : <p className="mt-2 text-xs opacity-60">Sin datos para comparar</p>}
    </div>
  )
}

// Una sola serie: barras finas con la punta redondeada, separadas por un hueco; al tocar o pasar
// el mouse se muestra el día y el valor.
function BarrasPorDia({ datos }) {
  const [activo, setActivo] = useState(null)
  const max = Math.max(1, ...datos.map(d => d[1]))
  const total = datos.reduce((t, d) => t + d[1], 0)
  const fmt = k => new Date(k + 'T12:00:00').toLocaleDateString('es-SV', { day: 'numeric', month: 'short' })
  const sel = activo != null ? datos[activo] : null
  return (
    <div className="mt-4">
      <p className="h-6 text-sm font-semibold">{sel ? `${fmt(sel[0])}: ${sel[1]} ${sel[1] === 1 ? 'página vista' : 'páginas vistas'}` : `${total.toLocaleString('es-SV')} en total`}</p>
      <div className="relative mt-2 flex h-48 items-end gap-[2px] border-b border-crema-borde" onMouseLeave={() => setActivo(null)}>
        {datos.map(([k, n], i) => (
          <button key={k} type="button" aria-label={`${fmt(k)}: ${n}`} onMouseEnter={() => setActivo(i)} onClick={() => setActivo(i)} onFocus={() => setActivo(i)}
            className="group flex h-full min-w-0 flex-1 items-end">
            <span className={`block w-full rounded-t-[4px] transition-colors ${activo === i ? 'bg-mostaza' : 'bg-tinta/80 group-hover:bg-tinta'}`}
              style={{ height: n ? `${Math.max(2, n / max * 100)}%` : '2px', opacity: n ? 1 : 0.2 }} />
          </button>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-gris"><span>{fmt(datos[0][0])}</span><span>{fmt(datos[datos.length - 1][0])}</span></div>
    </div>
  )
}

function Lista({ filas, total, porcentaje, vacio = 'Sin datos todavía.' }) {
  if (!filas.length) return <p className="mt-4 text-gris">{vacio}</p>
  const max = Math.max(1, ...filas.map(f => f[1]))
  return (
    <ul className="mt-4 space-y-3">
      {filas.map(([nombre, n], i) => (
        <li key={i}>
          <div className="flex items-baseline justify-between gap-3 text-[15px]">
            <span className="min-w-0 truncate font-semibold">{nombre}</span>
            <span className="shrink-0 text-gris">{n.toLocaleString('es-SV')}{porcentaje && total ? ` · ${Math.round(n / total * 100)}%` : ''}</span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-crema"><div className="h-2 rounded-full bg-tinta/80" style={{ width: `${Math.max(2, n / max * 100)}%` }} /></div>
        </li>
      ))}
    </ul>
  )
}

const PendienteSQL = () => <p className="mt-4 text-sm text-gris">Se empieza a medir cuando ejecutes <strong>docs/ACTUALIZAR_BASE.sql</strong> en Supabase.</p>

// Semana de lunes a domingo, día por día, con flechas para ver semanas anteriores
const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
function lunesDe(fecha) {
  const d = new Date(fecha); d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
}
function SemanaPorDia() {
  const [atras, setAtras] = useState(0)          // 0 = esta semana, 1 = la anterior…
  const [datos, setDatos] = useState(null)
  const lunes = useMemo(() => { const d = lunesDe(new Date()); d.setDate(d.getDate() - 7 * atras); return d }, [atras])

  useEffect(() => {
    setDatos(null)
    const desde = new Date(lunes); desde.setDate(desde.getDate() - 7)    // incluye la semana anterior para comparar
    const hasta = new Date(lunes); hasta.setDate(hasta.getDate() + 7)
    leerEventos(desde).then(ev => {
      const visitas = ev.filter(e => esVisita(e) && new Date(e.created_at) < hasta)
      const dias = Array(7).fill(0), unicos = Array.from({ length: 7 }, () => new Set())
      // Semana en curso: se compara contra los mismos días de la semana anterior (lunes a hoy)
      const ultimoDia = Math.min(6, Math.floor((Date.now() - lunes) / 864e5))
      let anterior = 0
      visitas.forEach(e => {
        const t = new Date(e.created_at)
        const i = Math.floor((t - lunes) / 864e5)
        if (i >= 0 && i < 7) { dias[i]++; if (e.visitante) unicos[i].add(e.visitante) }
        else if (i < 0 && i + 7 <= ultimoDia) anterior++
      })
      setDatos({ dias, unicos: unicos.map(u => u.size), anterior, parcial: ultimoDia < 6, hayUnicos: visitas.some(e => e.visitante) })
    }).catch(() => setDatos({ dias: Array(7).fill(0), unicos: Array(7).fill(0), anterior: 0, error: true }))
  }, [lunes])

  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const domingo = new Date(lunes); domingo.setDate(domingo.getDate() + 6)
  const fmt = d => d.toLocaleDateString('es-SV', { day: 'numeric', month: 'short' })
  const total = datos ? datos.dias.reduce((a, b) => a + b, 0) : 0
  const max = datos ? Math.max(1, ...datos.dias) : 1
  const cambio = datos && datos.anterior ? Math.round((total - datos.anterior) / datos.anterior * 100) : null

  return (
    <section className="rounded-[28px] bg-white p-5 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">{atras === 0 ? 'Esta semana' : atras === 1 ? 'Semana pasada' : `Hace ${atras} semanas`}</h2>
          <p className="text-sm text-gris">Lunes {fmt(lunes)} a domingo {fmt(domingo)} · páginas vistas por día</p>
        </div>
        <div className="flex gap-1.5">
          <button type="button" onClick={() => setAtras(a => a + 1)} aria-label="Semana anterior" className="flex h-10 w-10 items-center justify-center rounded-full bg-crema text-lg font-bold">‹</button>
          <button type="button" onClick={() => setAtras(a => Math.max(0, a - 1))} disabled={atras === 0} aria-label="Semana siguiente" className="flex h-10 w-10 items-center justify-center rounded-full bg-crema text-lg font-bold disabled:opacity-30">›</button>
        </div>
      </div>
      {!datos ? <p className="py-10 text-center text-gris">Cargando…</p> : (
        <>
          <p className="mt-3 text-sm"><strong className="text-2xl tracking-tight">{total.toLocaleString('es-SV')}</strong> en la semana
            {cambio != null && <span className="ml-2 text-gris">({cambio > 0 ? '+' : ''}{cambio}% vs. {datos.parcial ? 'los mismos días de la semana anterior' : 'semana anterior'})</span>}</p>
          <div className="mt-4 grid h-44 grid-cols-7 items-end gap-2 border-b border-crema-borde">
            {datos.dias.map((n, i) => {
              const dia = new Date(lunes); dia.setDate(dia.getDate() + i)
              const futuro = dia > hoy, esHoy = dia.getTime() === hoy.getTime()
              return (
                <div key={i} className="flex h-full flex-col items-center justify-end gap-1" title={datos.hayUnicos ? `${datos.unicos[i]} visitantes únicos` : undefined}>
                  <span className={`text-xs font-bold ${futuro ? 'text-transparent' : ''}`}>{n}</span>
                  <span className={`block w-full max-w-[44px] rounded-t-[4px] ${esHoy ? 'bg-mostaza' : 'bg-tinta/80'}`}
                    style={{ height: futuro ? 0 : n ? `${Math.max(3, n / max * 85)}%` : '2px', opacity: n || futuro ? 1 : 0.25 }} />
                </div>
              )
            })}
          </div>
          <div className="mt-1.5 grid grid-cols-7 gap-2 text-center text-[11px]">
            {DIAS_SEMANA.map((d, i) => {
              const dia = new Date(lunes); dia.setDate(dia.getDate() + i)
              return <span key={d} className={dia.getTime() === hoy.getTime() ? 'font-bold' : 'text-gris'}>{d}<span className="block">{dia.getDate()}</span></span>
            })}
          </div>
          {datos.hayUnicos && <p className="mt-3 text-xs text-gris">Visitantes únicos por día: {datos.unicos.map((u, i) => `${DIAS_SEMANA[i]} ${u}`).join(' · ')}</p>}
        </>
      )}
    </section>
  )
}
