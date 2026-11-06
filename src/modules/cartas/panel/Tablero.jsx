import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Copy, Download, FileText, Clock, ExternalLink } from 'lucide-react'
import { useCartas } from '../CartasContext.jsx'
import { actividadReciente } from '../cartasService.js'
import { aCSV, descargar, nombreArchivo } from '../archivos.js'
import { enlacePortal, fecha, folioTexto, nombrePareja, nombreDestinatario, semaforo, ESTADOS_CARTA, TEXTO_SEMAFORO } from '../constantes.js'
import { Kpi, Semaforo, Titulo, btn } from '../ui.jsx'
import { copiar } from './Retiros.jsx'

const ENTIDAD = { cartas: 'Carta', parejas: 'Pareja', remitentes: 'Remitente', retiros: 'Retiro', impresion: 'Impresión' }

export default function Tablero() {
  const { retiro, parejas, cartas, remitentes, indicadores } = useCartas()
  const [actividad, setActividad] = useState([])
  const t = indicadores.totales

  useEffect(() => { actividadReciente(retiro.id).then(setActividad).catch(() => setActividad([])) }, [retiro.id, cartas.length])

  const filas = useMemo(() => parejas.filter(p => p.estado === 'activa').map(p => {
    const x = indicadores.porPareja[p.id]
    return { p, x, color: semaforo({ retiro, cartasValidas: x.recibidas, pendientes: x.pendientes }) }
  }).sort((a, b) => ['rojo', 'amarillo', 'verde'].indexOf(a.color) - ['rojo', 'amarillo', 'verde'].indexOf(b.color) || a.p.codigo.localeCompare(b.p.codigo)), [parejas, indicadores, retiro])

  const conteo = filas.reduce((c, f) => ({ ...c, [f.color]: (c[f.color] || 0) + 1 }), {})
  const dias = retiro.fecha_limite ? Math.ceil((new Date(retiro.fecha_limite) - Date.now()) / 86400000) : null

  const filasReporte = filas.map(({ p, x, color }) => ({ codigo: p.codigo, pareja: nombrePareja(p), recibidas: x.recibidas, aprobadas: x.aprobadas,
    listas: x.listas, entregadas: x.entregadas, esperados: x.esperados, pendientes: x.pendientes, adicionales: x.adicionales, estado: TEXTO_SEMAFORO[color] }))

  function csvAvance() {
    descargar(aCSV(filasReporte, [
      { titulo: 'Código', valor: 'codigo' }, { titulo: 'Pareja', valor: 'pareja' }, { titulo: 'Cartas recibidas', valor: 'recibidas' },
      { titulo: 'Aprobadas', valor: 'aprobadas' }, { titulo: 'Listas para imprimir', valor: 'listas' }, { titulo: 'Entregadas', valor: 'entregadas' },
      { titulo: 'Remitentes esperados', valor: 'esperados' }, { titulo: 'Pendientes', valor: 'pendientes' }, { titulo: 'Adicionales', valor: 'adicionales' }, { titulo: 'Semáforo', valor: 'estado' },
    ]), `avance-${nombreArchivo(retiro.nombre)}.csv`)
  }
  function csvCartas() {
    const pp = Object.fromEntries(parejas.map(p => [p.id, p]))
    const rr = Object.fromEntries(remitentes.map(r => [r.id, r]))
    descargar(aCSV(cartas, [
      { titulo: 'Folio', valor: c => folioTexto(c.folio) }, { titulo: 'Fecha', valor: c => fecha(c.created_at, true) },
      { titulo: 'Código pareja', valor: c => pp[c.pareja_id]?.codigo }, { titulo: 'Para', valor: c => nombreDestinatario(pp[c.pareja_id], c.destinatario) },
      { titulo: 'Remitente', valor: 'remitente_nombre' }, { titulo: 'Relación', valor: 'relacion' }, { titulo: 'Origen', valor: 'origen' },
      { titulo: 'Estado', valor: c => ESTADOS_CARTA[c.estado].etiqueta }, { titulo: 'Motivo', valor: 'motivo' },
      { titulo: 'Remitente esperado', valor: c => (c.remitente_id ? rr[c.remitente_id]?.nombre : 'Adicional') },
      { titulo: 'Archivos', valor: c => c.cca_archivos.length }, { titulo: 'Tardía', valor: c => (c.tardia ? 'Sí' : '') },
      { titulo: 'Impresa', valor: c => fecha(c.impresa_en, true) }, { titulo: 'Entregada', valor: c => fecha(c.entregada_en, true) },
    ]), `cartas-${nombreArchivo(retiro.nombre)}.csv`)
  }
  async function pdf() {
    const { pdfResumen } = await import('../pdfCartas.js')
    descargar(await pdfResumen({ retiro, filas: filasReporte, totales: {
      'Parejas activas': t.parejas, 'Remitentes esperados': t.esperados, 'Cartas recibidas': t.recibidas,
      'Cartas aprobadas': t.aprobadas, 'Remitentes pendientes': t.pendientes, 'Parejas sin cartas': t.sinCartas,
      'Cartas adicionales': t.adicionales, 'Por revisar': t.porRevisar, 'Entregadas': t.entregadas,
    } }), `resumen-${nombreArchivo(retiro.nombre)}.pdf`)
  }

  return (
    <div>
      <Titulo titulo="Tablero" subtitulo={retiro.fecha_limite ? `Fecha límite: ${fecha(retiro.fecha_limite, true)}` : 'Sin fecha límite configurada'}>
        <button onClick={() => copiar(enlacePortal(retiro), 'Enlace general copiado')} className={btn.vino}><Copy size={16} />Copiar enlace del formulario</button>
        <a href={enlacePortal(retiro)} target="_blank" rel="noreferrer" className={btn.contorno}><ExternalLink size={16} />Ver formulario</a>
      </Titulo>

      {retiro.estado !== 'activo' && <p className="mb-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">Este retiro está «{retiro.estado}»: el formulario público no recibe cartas. Cámbialo a «Activo» en Retiros cuando quieras abrir la recepción.</p>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi valor={t.parejas} etiqueta="Parejas" />
        <Kpi valor={t.esperados} etiqueta="Remitentes esperados" />
        <Kpi valor={t.recibidas} etiqueta="Cartas recibidas" tono="vino" detalle={`${t.adicionales} adicionales`} />
        <Kpi valor={t.aprobadas} etiqueta="Cartas aprobadas" tono="ok" detalle={`${t.porRevisar} por revisar`} />
        <Kpi valor={t.pendientes} etiqueta="Remitentes pendientes" tono={t.pendientes ? 'alerta' : 'normal'} />
        <Kpi valor={t.sinCartas} etiqueta="Parejas sin cartas" tono={t.sinCartas ? 'alerta' : 'normal'} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_340px]">
        <section className="min-w-0 rounded-[24px] bg-white p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold">Avance por pareja</h2>
            <span className="flex gap-3 text-xs text-gris">
              {['rojo', 'amarillo', 'verde'].map(c => <span key={c} className="flex items-center gap-1.5"><Semaforo color={c} />{conteo[c] || 0} {TEXTO_SEMAFORO[c].toLowerCase()}</span>)}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead><tr className="text-left text-xs text-gris">
                <th className="py-2 pr-2 font-semibold" />
                <th className="py-2 pr-2 font-semibold">Pareja</th>
                <th className="px-2 py-2 text-center font-semibold">Recibidas</th>
                <th className="px-2 py-2 text-center font-semibold">Aprobadas</th>
                <th className="px-2 py-2 text-center font-semibold">Listas</th>
                <th className="px-2 py-2 text-center font-semibold">Pendientes</th>
              </tr></thead>
              <tbody className="divide-y divide-crema-borde">
                {filas.map(({ p, x, color }) => (
                  <tr key={p.id} className="hover:bg-crema-clara">
                    <td className="py-2.5 pr-2"><Semaforo color={color} /></td>
                    <td className="py-2.5 pr-2"><Link to={`/cartas/panel/parejas/${p.id}`} className="font-semibold hover:text-vino"><span className="mr-2 text-xs text-gris">{p.codigo}</span>{nombrePareja(p)}</Link></td>
                    <td className="px-2 text-center tabular-nums">{x.recibidas}</td>
                    <td className="px-2 text-center tabular-nums">{x.aprobadas}</td>
                    <td className="px-2 text-center tabular-nums">{x.listas}</td>
                    <td className={`px-2 text-center tabular-nums ${x.pendientes ? 'font-semibold text-amber-700' : ''}`}>{x.pendientes}/{x.esperados}</td>
                  </tr>
                ))}
                {!filas.length && <tr><td colSpan={6} className="py-6 text-center text-gris">Agrega parejas para ver el avance.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-[24px] bg-white p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><Clock size={18} />Plazo</h2>
            {dias === null ? <p className="mt-2 text-sm text-gris">Sin fecha límite.</p> : (
              <p className="mt-2 text-sm">{dias > 1 ? <>Faltan <b className="text-2xl text-vino">{dias}</b> días</> : dias >= 0 ? <b className="text-vino">Vence hoy o mañana</b> : <b className="text-rose-600">Venció hace {-dias} días</b>}
                <span className="block text-xs text-gris">{retiro.aceptar_tardias ? 'Después del plazo se aceptan con aviso' : 'Después del plazo el formulario se bloquea'}</span></p>
            )}
          </section>
          <section className="rounded-[24px] bg-white p-5">
            <h2 className="text-lg font-semibold">Reportes</h2>
            <div className="mt-3 flex flex-col gap-2">
              <button onClick={pdf} className={btn.contorno}><FileText size={16} />Resumen en PDF</button>
              <button onClick={csvAvance} className={btn.contorno}><Download size={16} />Avance por pareja (CSV)</button>
              <button onClick={csvCartas} className={btn.contorno}><Download size={16} />Listado de cartas (CSV)</button>
              <Link to="/cartas/panel/pendientes" className={btn.contorno}><Download size={16} />Personas pendientes</Link>
            </div>
          </section>
          <section className="rounded-[24px] bg-white p-5">
            <h2 className="text-lg font-semibold">Actividad reciente</h2>
            <ul className="mt-3 space-y-2 text-[13px]">
              {actividad.map(a => (
                <li key={a.id} className="text-gris"><b className="text-tinta">{ENTIDAD[a.entidad] || a.entidad}</b> · {descripcion(a)} <span className="block text-[11.5px]">{fecha(a.created_at, true)}</span></li>
              ))}
              {!actividad.length && <li className="text-gris">Sin actividad todavía.</li>}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  )
}

function descripcion(a) {
  if (a.entidad === 'cartas' && a.accion === 'insert') return `nueva de ${a.datos?.remitente_nombre || '—'} (${folioTexto(a.datos?.folio)})`
  if (a.entidad === 'cartas' && a.datos?.estado) return `${ESTADOS_CARTA[a.datos.estado.antes]?.etiqueta} → ${ESTADOS_CARTA[a.datos.estado.despues]?.etiqueta}`
  if (a.entidad === 'remitentes' && a.datos?.estado) return `${a.datos.estado.antes} → ${a.datos.estado.despues}`
  if (a.entidad === 'impresion') return a.accion === 'pdf' ? 'PDF generado' : a.accion === 'zip' ? 'ZIP de originales' : a.accion
  return { insert: 'creado', update: 'actualizado', delete: 'eliminado' }[a.accion] || a.accion
}
