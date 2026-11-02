import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import TarjetaObra from '../../components/obras/TarjetaObra.jsx'
import TituloSeccion from '../../components/TituloSeccion.jsx'
import CargandoModulo from '../../components/CargandoModulo.jsx'
import { listarObras, listarCategorias } from './obrasService.js'
import { ORIENTACIONES, orientacionPorMedidas } from '../../lib/orientacion.js'

const ORDENES = [
  ['recientes', 'Más recientes'],
  ['precio_asc', 'Precio: menor a mayor'],
  ['precio_desc', 'Precio: mayor a menor'],
]

// Última lista cargada por filtro: al volver de una obra se muestra al instante
const memoria = new Map()

export default function Catalogo() {
  const [params, setParams] = useSearchParams()
  const coleccion = params.get('coleccion') || ''
  const orden = params.get('orden') || 'recientes'
  const q = params.get('q') || ''
  const formato = params.get('formato') || ''
  const tipo = params.get('tipo') || ''
  const piezas = params.get('piezas') || ''
  const [texto, setTexto] = useState(q)
  const claveLista = JSON.stringify([coleccion, orden, q])
  const [obras, setObras] = useState(() => memoria.get(claveLista) || null)
  const [categorias, setCategorias] = useState([])
  const buscador = useRef(null)

  useEffect(() => { listarCategorias().then(setCategorias).catch(() => {}) }, [])
  useEffect(() => { if (params.get('buscar')) buscador.current?.focus() }, [params])
  useEffect(() => {
    setObras(memoria.get(claveLista) || null)
    listarObras({ estado: 'en_venta', categoria: coleccion || undefined, orden, busqueda: q || undefined })
      .then(l => { memoria.set(claveLista, l); setObras(l) }).catch(() => { if (!memoria.has(claveLista)) setObras([]) })
  }, [coleccion, orden, q])

  const lista = (obras || []).filter(o => (!formato || orientacionPorMedidas(o) === formato) && (!tipo || o.tipo_obra === tipo) && (!piezas || (piezas === 'juego' ? o.piezas > 1 : o.piezas === 1)))

  function cambiar(clave, valor) {
    const p = new URLSearchParams(params)
    p.delete('buscar')
    if (valor) p.set(clave, valor); else p.delete(clave)
    setParams(p, { replace: true })
  }

  return (
    <div className="contenedor pb-24 pt-28 md:pt-36">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <TituloSeccion titulo={coleccion || 'Obras disponibles'}>
          <p className="mt-4 text-gris">{obras ? `${lista.length} ${lista.length === 1 ? 'obra' : 'obras'}` : ' '}</p>
        </TituloSeccion>
        <form onSubmit={e => { e.preventDefault(); cambiar('q', texto.trim()) }} className="flex w-full max-w-md items-center gap-2 rounded-full bg-white px-5 shadow-sm">
          <Search size={19} className="text-gris" />
          <label className="sr-only" htmlFor="buscar-obras">Buscar obras</label>
          <input id="buscar-obras" ref={buscador} value={texto} onChange={e => setTexto(e.target.value)} placeholder="Busca por nombre, estilo, técnica o artista" className="h-14 flex-1 bg-transparent outline-none" />
        </form>
      </div>
      <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <div className="sin-scroll -mx-5 flex gap-2 overflow-x-auto px-5 md:mx-0 md:flex-wrap md:px-0">
          <button onClick={() => cambiar('coleccion', '')} className={`chip ${!coleccion ? 'chip-on' : 'chip-off'}`}>Todas</button>
          {categorias.map(c => (
            <button key={c.id} onClick={() => cambiar('coleccion', c.nombre)} className={`chip ${coleccion === c.nombre ? 'chip-on' : 'chip-off'}`}>{c.nombre}</button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-3 text-sm font-semibold">Tipo
          <select value={tipo} onChange={e => cambiar('tipo', e.target.value)} className="h-11 rounded-full border border-crema-borde bg-white px-4">
            <option value="">Todas</option><option value="original">Originales</option><option value="interpretacion">Interpretaciones</option>
          </select>
        </label>
        <label className="flex items-center gap-3 text-sm font-semibold">Piezas
          <select value={piezas} onChange={e => cambiar('piezas', e.target.value)} className="h-11 rounded-full border border-crema-borde bg-white px-4">
            <option value="">Todas</option><option value="una">Una pieza</option><option value="juego">Juegos (dípticos, trípticos…)</option>
          </select>
        </label>
        <label className="flex items-center gap-3 text-sm font-semibold">Formato
          <select value={formato} onChange={e => cambiar('formato', e.target.value)} className="h-11 rounded-full border border-crema-borde bg-white px-4">
            <option value="">Todos</option>
            {Object.entries(ORIENTACIONES).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-3 text-sm font-semibold">Ordenar
          <select value={orden} onChange={e => cambiar('orden', e.target.value === 'recientes' ? '' : e.target.value)} className="h-11 rounded-full border border-crema-borde bg-white px-4">
            {ORDENES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
        </label>
        </div>
      </div>
      {!obras ? <CargandoModulo /> : lista.length
        ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{lista.map(o => <TarjetaObra key={o.id} obra={o} />)}</div>
        : <p className="rounded-[28px] bg-white p-12 text-center text-gris">No encontramos obras con esos filtros. Prueba con otra colección o escríbenos y te ayudamos.</p>}
    </div>
  )
}
