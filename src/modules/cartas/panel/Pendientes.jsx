import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Phone } from 'lucide-react'
import { useCartas } from '../CartasContext.jsx'
import { fecha, nombrePareja } from '../constantes.js'
import { Titulo, Vacio } from '../ui.jsx'
import { AccionesRecordatorio } from './remitentes.jsx'

const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

// «Avisar a las familias»: un contacto por línea con llamar y enviar el mensaje por WhatsApp.
// Tres pestañas simples según en qué va cada contacto.
const PESTANAS = [
  ['sin', 'Sin avisar', r => (r.estado === 'pendiente' || r.estado === 'revision') && !r.ultimo_recordatorio],
  ['avisados', 'Ya avisados', r => (r.estado === 'pendiente' || r.estado === 'revision') && !!r.ultimo_recordatorio],
  ['entregaron', 'Ya entregaron', r => r.estado === 'recibido'],
]

export default function Pendientes() {
  const { parejas, remitentes, esAdmin } = useCartas()
  const [vista, setVista] = useState('sin')
  const [q, setQ] = useState('')
  const porId = useMemo(() => Object.fromEntries(parejas.map(p => [p.id, p])), [parejas])
  const contactos = remitentes.filter(r => r.coordinador && porId[r.pareja_id]?.estado === 'activa')
  const cuantos = Object.fromEntries(PESTANAS.map(([k, , f]) => [k, contactos.filter(f).length]))

  const filtro = PESTANAS.find(([k]) => k === vista)[2]
  const lista = contactos.filter(filtro)
    .filter(r => !q || norm(`${r.nombre} ${r.relacion} ${porId[r.pareja_id].codigo} ${nombrePareja(porId[r.pareja_id])}`).includes(norm(q)))
    .sort((a, b) => porId[a.pareja_id].codigo.localeCompare(porId[b.pareja_id].codigo, 'es', { numeric: true }))

  return (
    <div>
      <Titulo titulo="Avisar a las familias" subtitulo="Toca «Enviar» para mandar el mensaje por WhatsApp a cada contacto, o 📞 para llamarle." />

      <div className="mb-3 grid grid-cols-3 gap-1.5 rounded-full bg-white p-1.5" role="tablist">
        {PESTANAS.map(([k, t]) => (
          <button key={k} role="tab" aria-selected={vista === k} onClick={() => setVista(k)}
            className={`flex h-11 flex-col items-center justify-center rounded-full text-[13px] font-semibold leading-tight transition ${vista === k ? 'bg-vino text-white' : 'text-tinta'}`}>
            <span>{t}</span><span className={`text-[11px] ${vista === k ? 'text-white/80' : 'text-gris'}`}>{cuantos[k]}</span>
          </button>
        ))}
      </div>

      <label className="relative mb-4 block">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gris" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar persona o pareja" className="campo pl-10" />
      </label>

      {!lista.length ? (
        <Vacio titulo={vista === 'sin' ? (contactos.length ? '¡Ya avisaste a todos!' : 'Aún no hay contactos de familia') : 'Nadie en esta lista todavía'}>
          {!contactos.length && 'Se cargan al importar el Excel de inscripción.'}
        </Vacio>
      ) : (
        <ul className="divide-y divide-crema-borde overflow-hidden rounded-[22px] bg-white">
          {lista.map(r => {
            const p = porId[r.pareja_id]
            return (
              <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{r.nombre} <span className="font-normal text-gris">· {r.relacion}</span></span>
                  {esAdmin
                    ? <Link to={`/cartas/panel/parejas/${p.id}`} className="block truncate text-xs font-semibold text-vino">{p.codigo} · {nombrePareja(p)}</Link>
                    : <span className="block truncate text-xs font-semibold text-vino">{p.codigo} · {nombrePareja(p)}</span>}
                  <span className="block text-[11.5px] text-gris">{r.estado === 'recibido' ? '✓ Ya entregó cartas' : r.ultimo_recordatorio ? `Avisado el ${fecha(r.ultimo_recordatorio)}` : 'Aún sin avisar'}</span>
                </span>
                {r.telefono && (
                  <a href={`tel:${String(r.telefono).replace(/[^\d+]/g, '')}`} aria-label={`Llamar a ${r.nombre}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-crema-borde bg-white text-vino hover:border-vino"><Phone size={16} /></a>
                )}
                {r.estado !== 'recibido' && r.estado !== 'exento' && <AccionesRecordatorio remitente={r} pareja={p} compacto simple />}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
