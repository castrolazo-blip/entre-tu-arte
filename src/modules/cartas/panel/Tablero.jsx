import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Copy, Download, FileText, Clock, ExternalLink } from 'lucide-react'
import { useCartas } from '../CartasContext.jsx'
import { actividadReciente } from '../cartasService.js'
import { aCSV, descargar, nombreArchivo } from '../archivos.js'
import { responsableDe, enlacePortal, fecha, folioTexto, nombrePareja, nombreDestinatario, semaforo, ESTADOS_CARTA, TEXTO_SEMAFORO } from '../constantes.js'
import { Kpi, Semaforo, Titulo, btn } from '../ui.jsx'
import { copiar } from './Retiros.jsx'
import { Avance } from './Parejas.jsx'
import { describirActividad, quien } from '../actividad.js'


export default function Tablero() {
  const { retiro, parejas, cartas, remitentes, indicadores, equipo, miEquipo, usuarios, esAdmin } = useCartas()
  const [actividad, setActividad] = useState([])
  const t = indicadores.totales

  useEffect(() => { actividadReciente(retiro.id).then(setActividad).catch(() => setActividad([])) }, [retiro.id, cartas.length])

  const filas = useMemo(() => parejas.filter(p => p.estado === 'activa').map(p => {
    const x = indicadores.porPareja[p.id]
    return { p, x, color: semaforo({ retiro, cartasValidas: x.recibidas, pendientes: x.pendientes, x }) }
  }).sort((a, b) => ['rojo', 'amarillo', 'verde'].indexOf(a.color) - ['rojo', 'amarillo', 'verde'].indexOf(b.color) || a.p.codigo.localeCompare(b.p.codigo)), [parejas, indicadores, retiro])

  const conteo = filas.reduce((c, f) => ({ ...c, [f.color]: (c[f.color] || 0) + 1 }), {})
  const dias = retiro.fecha_limite ? Math.ceil((new Date(retiro.fecha_limite) - Date.now()) / 86400000) : null

  const filasReporte = filas.map(({ p, x, color }) => ({ codigo: p.codigo, pareja: nombrePareja(p), responsable: responsableDe(p, equipo), paraA: x.paraA, paraB: x.paraB, faltan: x.faltan, recibidas: x.recibidas, enPapel: x.enPapel, aImprimir: x.aImprimir, esperados: x.esperados, pendientes: x.pendientes, adicionales: x.adicionales, estado: TEXTO_SEMAFORO[color] }))

  function csvAvance() {
    descargar(aCSV(filasReporte, [
      { titulo: 'Código', valor: 'codigo' }, { titulo: 'Pareja', valor: 'pareja' }, { titulo: 'Responsable', valor: 'responsable' },
      { titulo: 'Cartas esposo', valor: 'paraA' }, { titulo: 'Cartas esposa', valor: 'paraB' }, { titulo: 'Faltan para la meta', valor: 'faltan' },
      { titulo: 'Cartas recibidas', valor: 'recibidas' },
      { titulo: 'En papel', valor: 'enPapel' }, { titulo: 'A imprimir (formulario/correo)', valor: 'aImprimir' },
      { titulo: 'Semáforo', valor: 'estado' },
    ]), `avance-${nombreArchivo(retiro.nombre)}.csv`)
  }
  function csvCartas() {
    const pp = Object.fromEntries(parejas.map(p => [p.id, p]))
    descargar(aCSV(cartas, [
      { titulo: 'Folio', valor: c => folioTexto(c.folio) }, { titulo: 'Fecha', valor: c => fecha(c.created_at, true) },
      { titulo: 'Código pareja', valor: c => pp[c.pareja_id]?.codigo }, { titulo: 'Para', valor: c => nombreDestinatario(pp[c.pareja_id], c.destinatario) },
      { titulo: 'Quién la envía', valor: c => c.relacion || 'Sin clasificar' }, { titulo: 'Nombre', valor: 'remitente_nombre' }, { titulo: 'Origen', valor: 'origen' },
      { titulo: 'Estado', valor: c => ESTADOS_CARTA[c.estado].etiqueta }, { titulo: 'Motivo', valor: 'motivo' }, { titulo: 'Entregó', valor: 'recibida_de' },
      { titulo: 'Archivos', valor: c => c.cca_archivos.length }, { titulo: 'Tardía', valor: c => (c.tardia ? 'Sí' : '') },
    ]), `cartas-${nombreArchivo(retiro.nombre)}.csv`)
  }
  async function pdf() {
    const { pdfResumen } = await import('../pdfCartas.js')
    descargar(await pdfResumen({ retiro, filas: filasReporte, totales: {
      'Parejas activas': t.parejas, 'Meta por persona': t.meta, 'Faltan para la meta': t.faltanMeta,
      'Parejas con meta': t.metaCumplida, 'Contactos que entregaron': `${t.contactos - t.contactosPendientes}/${t.contactos}`, 'Cartas recibidas': t.recibidas,
      'En papel': t.enPapel, 'A imprimir': t.aImprimir, 'Parejas sin cartas': t.sinCartas,
      'Cartas adicionales': t.adicionales, 'Posibles duplicados': t.posiblesDuplicados,
    } }), `resumen-${nombreArchivo(retiro.nombre)}.pdf`)
  }

  return (
    <div>
      <Titulo titulo="Avance" subtitulo={retiro.fecha_limite ? `Fecha límite: ${fecha(retiro.fecha_limite, true)}` : 'Sin fecha límite configurada'}>
      </Titulo>

      {miEquipo && <Link to="/cartas/panel/mis-parejas" className="mb-4 flex items-center justify-between gap-3 rounded-[22px] bg-vino p-4 text-white"><span><b>Matrimonio {miEquipo.apellidos}</b><span className="block text-sm text-white/80">Ver tus parejas asignadas y su avance</span></span><span className="font-semibold">Mis parejas →</span></Link>}
      {retiro.estado !== 'activo' && <p className="mb-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">Este retiro está «{retiro.estado}»: el formulario público no recibe cartas. Cámbialo a «Activo» en Retiros cuando quieras abrir la recepción.</p>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi valor={t.parejas} etiqueta="Parejas" />
        <Kpi valor={t.recibidas} etiqueta="Cartas recibidas" tono="vino" detalle={t.meta ? `meta: ${t.parejas * t.meta * 2} (${t.meta * 2} por pareja)` : `${t.adicionales} adicionales`} />
        {t.meta > 0
          ? <Kpi valor={t.faltanMeta} etiqueta="Faltan para la meta" tono={t.faltanMeta ? 'alerta' : 'ok'} detalle={`${t.meta} por persona`} />
          : <Kpi valor={t.aImprimir} etiqueta="Cartas a imprimir" detalle="formulario y correo" />}
        {t.meta > 0 && <Kpi valor={`${t.metaCumplida}/${t.parejas}`} etiqueta="Parejas con meta cumplida" tono="ok" />}
        <Kpi valor={`${t.contactos - t.contactosPendientes}/${t.contactos}`} etiqueta="Contactos que entregaron" detalle="paquetes o cartas recibidos" />
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
            <table className="w-full min-w-[600px] text-sm">
              <thead><tr className="text-left text-xs text-gris">
                <th className="py-2 pr-2 font-semibold" />
                <th className="py-2 pr-2 font-semibold">Pareja</th>
                {retiro.meta_por_persona > 0 && <th className="px-2 py-2 font-semibold">Esposo / Esposa</th>}
                <th className="px-2 py-2 text-center font-semibold">Recibidas</th>
                <th className="px-2 py-2 text-center font-semibold">Contactos</th>
              </tr></thead>
              <tbody className="divide-y divide-crema-borde">
                {filas.map(({ p, x, color }) => (
                  <tr key={p.id} className="hover:bg-crema-clara">
                    <td className="py-2.5 pr-2"><Semaforo color={color} /></td>
                    <td className="py-2.5 pr-2"><Link to={`/cartas/panel/parejas/${p.id}`} className="font-semibold hover:text-vino"><span className="mr-2 text-xs text-gris">{p.codigo}</span>{nombrePareja(p)}</Link></td>
                    {retiro.meta_por_persona > 0 && <td className="px-2"><span className="flex gap-3"><Avance nombre={p.apodo_a || p.nombre_a} n={x.paraA} meta={retiro.meta_por_persona} /><Avance nombre={p.apodo_b || p.nombre_b} n={x.paraB} meta={retiro.meta_por_persona} /></span></td>}
                    <td className="px-2 text-center tabular-nums">{x.recibidas}</td>
                    <td className={`px-2 text-center tabular-nums ${x.contactosPendientes ? 'font-semibold text-amber-700' : ''}`}>{x.contactos - x.contactosPendientes}/{x.contactos}</td>
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
            <h2 className="flex items-center justify-between text-lg font-semibold">Actividad reciente{esAdmin && <Link to="/cartas/panel/configuracion?p=actividad" className="text-sm font-semibold text-vino">Ver todo</Link>}</h2>
            <ul className="mt-3 space-y-2 text-[13px]">
              {actividad.map(a => (
                <li key={a.id} className="text-gris"><b className="text-tinta">{quien(a, usuarios)}</b> {describirActividad(a)} <span className="block text-[11.5px]">{fecha(a.created_at, true)}</span></li>
              ))}
              {!actividad.length && <li className="text-gris">Sin actividad todavía.</li>}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  )
}
