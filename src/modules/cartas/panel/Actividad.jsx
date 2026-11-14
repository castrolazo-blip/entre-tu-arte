import { useEffect, useMemo, useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { useCartas } from '../CartasContext.jsx'
import { actividad, listarRecordatorios } from '../cartasService.js'
import { describirActividad, quien, gestionesComoActividad, esMensajeRepetido } from '../actividad.js'
import { fecha, mensajeError, nombrePareja, folioTexto } from '../constantes.js'
import { aCSV, descargar, nombreArchivo } from '../archivos.js'
import { btn } from '../ui.jsx'

// Bitácora del retiro: quién entró, qué registró, cambió o abrió, y cuándo (últimos 300 movimientos)
export default function Actividad() {
  const { retiro, usuarios, parejas, cartas, remitentes } = useCartas()
  const [filas, setFilas] = useState(null)
  const [error, setError] = useState('')
  const [persona, setPersona] = useState('')

  const [base, setBase] = useState(null)
  useEffect(() => {
    Promise.all([actividad(retiro.id), listarRecordatorios(retiro.id).catch(() => [])])
      .then(([a, g]) => setBase({ a, g })).catch(e => setError(mensajeError(e)))
  }, [retiro.id])
  // Movimientos + gestiones con su tipo de mensaje, del más reciente al más antiguo
  useEffect(() => {
    if (!base) return
    setFilas([...base.a.filter(x => !esMensajeRepetido(x)), ...gestionesComoActividad(base.g, remitentes)]
      .sort((x, y) => (y.created_at > x.created_at ? 1 : -1)))
  }, [base, remitentes])

  const porPareja = useMemo(() => Object.fromEntries(parejas.map(p => [p.id, p])), [parejas])
  const porCarta = useMemo(() => Object.fromEntries(cartas.map(c => [c.id, c])), [cartas])
  // A qué pareja se refiere el movimiento (si se puede saber)
  const contexto = a => {
    const c = a.entidad === 'cartas' && (porCarta[a.entidad_id] || a.datos)
    const p = (a.entidad === 'gestion' && porPareja[a.datos.pareja_id]) || porPareja[c?.pareja_id] || (a.entidad === 'parejas' && porPareja[a.entidad_id])
    return [c?.folio && folioTexto(c.folio), p && `${p.codigo} ${nombrePareja(p)}`].filter(Boolean).join(' · ')
  }

  const personas = useMemo(() => [...new Map((filas || []).map(a => [a.usuario_id || '__publico', quien(a, usuarios)])).entries()], [filas, usuarios])
  const lista = (filas || []).filter(a => !persona || (a.usuario_id || '__publico') === persona)

  function exportar() {
    descargar(aCSV(lista, [
      { titulo: 'Fecha', valor: a => fecha(a.created_at, true) }, { titulo: 'Quién', valor: a => quien(a, usuarios) },
      { titulo: 'Qué hizo', valor: a => describirActividad(a) }, { titulo: 'Sobre', valor: contexto },
    ]), `actividad-${nombreArchivo(retiro.nombre)}.csv`)
  }

  return (
    <section className="rounded-[24px] bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Actividad</h2>
          <p className="mt-1 text-sm text-gris">Quién entró, qué registró, cambió o abrió, y cuándo. Lo guarda la base de datos automáticamente y no se puede editar.</p>
        </div>
        {filas?.length > 0 && <button onClick={exportar} className={btn.contorno}><Download size={16} />Exportar CSV</button>}
      </div>
      {personas.length > 1 && (
        <select value={persona} onChange={e => setPersona(e.target.value)} className="campo mt-4 max-w-sm" aria-label="Persona">
          <option value="">Todas las personas</option>
          {personas.map(([id, n]) => <option key={id} value={id}>{n}</option>)}
        </select>
      )}
      {error && <p className="mt-4 text-sm text-rose-700">{error}</p>}
      {!filas && !error && <Loader2 className="mt-4 animate-spin text-gris" />}
      {filas && (
        <ul className="mt-4 divide-y divide-crema-borde rounded-2xl border border-crema-borde text-sm">
          {lista.map(a => (
            <li key={a.id} className="px-3 py-2.5">
              <span className="font-semibold">{quien(a, usuarios)}</span> <span className="text-gris">{describirActividad(a)}</span>
              <span className="block text-xs text-gris">{fecha(a.created_at, true)}{contexto(a) && ` · ${contexto(a)}`}</span>
            </li>
          ))}
          {!lista.length && <li className="px-3 py-4 text-gris">Sin movimientos.</li>}
        </ul>
      )}
    </section>
  )
}
