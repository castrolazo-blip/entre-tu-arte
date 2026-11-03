import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Images, Sparkles, Check, Loader2, AlertCircle, X, Minus, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../../lib/supabase.js'
import { numero, medidasTexto } from '../../../lib/formato.js'
import { subirArchivo, reducirImagen, cargarImagen } from '../adminService.js'
import { iniciarTrabajoIA, esperarTrabajoIA, leerClaveIA, guardarClaveIA } from './iaService.js'
import { encuadresDesdeIA } from './fichaCanvas.js'
import { recortarObra, mejorarImagen, aBlob } from './imagenObra.js'
import { AMBIENTES, dibujarAmbiente } from './ambientes.js'
import { dibujarPublicacion, cargarFuentes } from './publicaciones.js'
import BotonArchivo from '../../../components/admin/BotonArchivo.jsx'
import SelectorTipoObra, { notaTipoParaIA, faltanColumnasTipo, sinCamposTipo } from '../../../components/admin/SelectorTipoObra.jsx'
import EncabezadoAdmin from '../EncabezadoAdmin.jsx'
import { medidaConjunto, insigniaJuego } from '../../../lib/piezas.js'

const MAX_OBRAS = 20
const MAX_FOTOS = 3   // por obra
const leerFotosPorObra = () => { try { return Number(localStorage.getItem('eta_fotos_por_obra')) || 1 } catch { return 1 } }
const SIMULTANEAS = 2

const ESTADOS = {
  cola: 'En espera',
  subiendo: 'Subiendo fotos…',
  ia: 'La IA está escribiendo…',
  procesando: 'Mejorando foto y armando ficha…',
  guardando: 'Guardando…',
  listo: 'Lista como borrador',
  publicada: 'Publicada',
  error: 'Error',
}

let siguienteId = 1

// Sube varias obras de una vez: 1 a 3 fotos por obra (se agrupan en el orden elegido). Cada una pasa por la IA y queda como borrador;
// después se completa precio y medidas y se publica desde esta misma pantalla.
export default function SubirLote() {
  const [items, setItems] = useState([])
  const [comun, setComun] = useState({ artista_id: '', categoria: '', tipo_obra: 'original', inspirada_en: '', certificado: true, mejorar: true })
  const [artistas, setArtistas] = useState([])
  const [categorias, setCategorias] = useState([])
  const [trabajando, setTrabajando] = useState(false)
  const [fotosPorObra, setFotosPorObra] = useState(leerFotosPorObra)
  const elegirFotosPorObra = n => { setFotosPorObra(n); try { localStorage.setItem('eta_fotos_por_obra', String(n)) } catch { /* nada */ } }
  const lienzos = useRef({})   // id → { obra, ambiente } para rehacer la ficha al publicar

  useEffect(() => {
    supabase.from('artistas').select('id, nombre').order('nombre').then(({ data }) => setArtistas(data || []))
    supabase.from('categorias').select('*').order('nombre').then(({ data }) => setCategorias(data || []))
    cargarFuentes()
  }, [])

  // Avisar si intentan salir mientras se procesan obras
  useEffect(() => {
    if (!trabajando) return
    const aviso = e => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', aviso)
    return () => window.removeEventListener('beforeunload', aviso)
  }, [trabajando])

  const actualizar = (id, cambios) => setItems(lista => lista.map(x => x.id === id ? { ...x, ...cambios } : x))
  const artista = artistas.find(a => a.id === comun.artista_id)

  // Agrupa las fotos en el orden elegido: cada N fotos forman una obra
  function agregar(archivos) {
    const grupos = []
    for (let i = 0; i < archivos.length; i += fotosPorObra) grupos.push(archivos.slice(i, i + fotosPorObra))
    const libres = MAX_OBRAS - items.length
    if (grupos.length > libres) toast(`Se agregaron ${libres} obras: máximo ${MAX_OBRAS} por vez`)
    const nuevos = grupos.slice(0, libres).map(g => ({
      id: siguienteId++, archivos: g, vistas: g.map(a => URL.createObjectURL(a)), estado: 'cola',
      precio: '', alto: '', ancho: '', piezas: 1,
    }))
    setItems(l => [...l, ...nuevos])
  }

  // Ajustes de grupos antes de procesar
  const editable = x => (x.estado === 'cola' || x.estado === 'error') && !trabajando
  function hacerPrincipal(id, i) {
    setItems(l => l.map(x => {
      if (x.id !== id || i === 0) return x
      const orden = [i, ...x.archivos.map((_, j) => j).filter(j => j !== i)]
      return { ...x, archivos: orden.map(j => x.archivos[j]), vistas: orden.map(j => x.vistas[j]) }
    }))
  }
  function unirConAnterior(id) {
    setItems(l => {
      const k = l.findIndex(x => x.id === id)
      if (k < 1) return l
      const a = l[k - 1], b = l[k]
      const unido = { ...a, archivos: [...a.archivos, ...b.archivos].slice(0, MAX_FOTOS), vistas: [...a.vistas, ...b.vistas].slice(0, MAX_FOTOS), estado: 'cola', error: '' }
      return [...l.slice(0, k - 1), unido, ...l.slice(k + 1)]
    })
  }
  function separar(id) {
    setItems(l => l.flatMap(x => x.id !== id ? [x] : x.archivos.map((archivo, j) => ({
      ...x, id: j === 0 ? x.id : siguienteId++, archivos: [archivo], vistas: [x.vistas[j]], estado: 'cola', error: '',
    }))))
  }

  async function procesar(item, clave) {
    try {
      actualizar(item.id, { estado: 'subiendo', error: '' })
      // Todas las fotos de la obra a la vez; la primera es la principal
      const reducidos = await Promise.all(item.archivos.map(a => reducirImagen(a, 2000, 0.85)))
      const urls = await Promise.all(reducidos.map(r => subirArchivo('obras', r)))
      const img = await cargarImagen(URL.createObjectURL(reducidos[0]))

      actualizar(item.id, { estado: 'ia' })
      const notas = [artista && `artista: ${artista.nombre}`, notaTipoParaIA(comun.tipo_obra, comun.inspirada_en)].filter(Boolean).join('\n')
      const trabajo = await iniciarTrabajoIA({ urls, notas, clave })
      const r = await esperarTrabajoIA(trabajo, clave)
      if (!r) throw new Error('La IA no respondió')

      actualizar(item.id, { estado: 'procesando' })
      const recorte = recortarObra(img, encuadresDesdeIA(r.encuadres)[0])
      const obra = comun.mejorar ? mejorarImagen(recorte) : recorte
      const ambiente = dibujarAmbiente(obra, AMBIENTES[0], {})
      lienzos.current[item.id] = { obra, ambiente }
      const etiqueta = comun.tipo_obra === 'interpretacion' ? 'Interpretación' : comun.certificado ? 'Original certificada' : 'Pieza única'
      const ficha = dibujarPublicacion('catalogo', { datos: { nombre: r.nombre, artista: artista?.nombre, tecnica: r.tecnica, existencias: etiqueta }, imagenes: { obra, ambiente } })

      actualizar(item.id, { estado: 'guardando' })
      const subirLienzo = async (c, carpeta) => subirArchivo(carpeta, new File([await aBlob(c, 0.9)], 'foto.jpg', { type: 'image/jpeg' }))
      // Fotos de la obra: la principal mejorada + las otras fotos reales; si solo hay una, el ambiente dibujado
      const extras = urls.slice(1)
      const [urlObra, urlFicha, urlAmbiente] = await Promise.all([subirLienzo(obra, 'obras'), subirLienzo(ficha, 'fichas'), extras.length ? null : subirLienzo(ambiente, 'obras')])
      const roles = ['ambiente', 'detalle']
      const fotosObra = [{ url: urlObra, rol: 'principal' }, ...(extras.length ? extras.map((u, j) => ({ url: u, rol: roles[j] || 'detalle' })) : [{ url: urlAmbiente, rol: 'ambiente' }])]
      const tags = (r.hashtags || []).map(t => t.startsWith('#') ? t : '#' + t).join(' ')
      const cats = new Set(comun.categoria ? [comun.categoria] : [])
      categorias.forEach(c => { if ((r.espacios || []).some(e => e.toLowerCase() === c.nombre.toLowerCase())) cats.add(c.nombre) })
      const piezas = Math.min(Math.max(Math.round(Number(r.piezas) || 1), 1), 20)
      const registro = {
        piezas,
        titulo: r.nombre || null, descripcion: r.descripcion || null, estilo: r.estilo || null, tecnica: r.tecnica || null,
        publicacion: (r.publicacion || '') + (tags ? '\n\n' + tags : ''), espacios: r.espacios || [], categorias: [...cats],
        artista_id: comun.artista_id || null, artista_nombre: artista?.nombre || null,
        fotos: fotosObra,
        imagen_url: urlObra, ficha_url: urlFicha, estado: 'borrador', existencias: 1, anio: new Date().getFullYear(),
        tipo_obra: comun.tipo_obra, inspirada_en: comun.tipo_obra === 'interpretacion' ? (comun.inspirada_en.trim() || null) : null, certificado: !!comun.certificado,
      }
      let { data, error } = await supabase.from('fichas').insert(registro).select('id').single()
      if (error && faltanColumnasTipo(error)) ({ data, error } = await supabase.from('fichas').insert(sinCamposTipo(registro)).select('id').single())
      if (error) throw error
      actualizar(item.id, { estado: 'listo', piezas, obraId: data.id, nombre: r.nombre, tecnica: r.tecnica, miniatura: obra.toDataURL('image/jpeg', 0.7) })
    } catch (err) {
      actualizar(item.id, { estado: 'error', error: err.message || String(err) })
    }
  }

  async function empezar() {
    let clave = leerClaveIA()
    if (!clave) {
      clave = (window.prompt('Escribe la clave de acceso de la IA (solo se pide una vez en este dispositivo):') || '').trim()
      if (!clave) return
      guardarClaveIA(clave)
    }
    const pendientes = items.filter(x => x.estado === 'cola' || x.estado === 'error')
    if (!pendientes.length) return
    setTrabajando(true)
    const cola = [...pendientes]
    await Promise.all(Array.from({ length: Math.min(SIMULTANEAS, cola.length) }, async () => {
      while (cola.length) await procesar(cola.shift(), clave)
    }))
    setTrabajando(false)
    toast.success('¡Listo! Completa precio y medidas para publicar cada obra.')
  }

  async function publicar(item) {
    const alto = numero(item.alto), ancho = numero(item.ancho), precio = numero(item.precio)
    if (precio === null) { toast.error('Pon el precio antes de publicar'); return }
    actualizar(item.id, { publicando: true })
    try {
      const piezas = item.piezas || 1
      const medidas = medidasTexto({ alto_cm: alto, ancho_cm: ancho, piezas })
      const cambios = { precio, alto_cm: alto, ancho_cm: ancho, piezas, medidas_piezas: null, medidas: medidas || null, estado: 'disponible' }
      const conjunto = piezas > 1 ? medidaConjunto({ alto_cm: alto, ancho_cm: ancho, piezas }) : null
      // Rehacer la ficha y el ambiente con las medidas y el precio
      const l = lienzos.current[item.id]
      if (l) {
        const ambiente = dibujarAmbiente(l.obra, AMBIENTES[0], conjunto || { alto, ancho })
        const etiqueta = comun.tipo_obra === 'interpretacion' ? 'Interpretación' : comun.certificado ? 'Original certificada' : 'Pieza única'
        const ficha = dibujarPublicacion('catalogo', { datos: { nombre: item.nombre, artista: artista?.nombre, tecnica: item.tecnica, medidas, precio: item.precio, existencias: etiqueta }, imagenes: { obra: l.obra, ambiente } })
        cambios.ficha_url = await subirArchivo('fichas', new File([await aBlob(ficha, 0.9)], 'ficha.jpg', { type: 'image/jpeg' }))
      }
      let { error } = await supabase.from('fichas').update(cambios).eq('id', item.obraId)
      if (error && faltanColumnasTipo(error)) ({ error } = await supabase.from('fichas').update(sinCamposTipo(cambios)).eq('id', item.obraId))
      if (error) throw error
      actualizar(item.id, { estado: 'publicada', publicando: false })
    } catch (err) {
      actualizar(item.id, { publicando: false })
      toast.error('No se pudo publicar: ' + (err.message || err))
    }
  }

  const quitar = id => setItems(l => l.filter(x => x.id !== id))
  const listas = items.filter(x => x.estado === 'listo' || x.estado === 'publicada').length
  const pendientes = items.filter(x => x.estado === 'cola' || x.estado === 'error').length

  return (
    <>
      <EncabezadoAdmin ruta="Obras" titulo="Subir varias obras">
        <Link to="/admin/subir" className="btn-contorno btn-chico">Subir una sola</Link>
      </EncabezadoAdmin>

      <div className="mx-auto max-w-3xl space-y-5">
        <section className="rounded-[26px] bg-white p-5">
          <h2 className="text-lg font-bold">1. Elige las fotos</h2>
          <p className="mt-1 text-sm text-gris">Elige las fotos <strong>en orden, obra por obra</strong> (primero la foto de frente). Hasta {MAX_OBRAS} obras por vez.</p>
          <p className="etiqueta mt-4 mb-2">¿Cuántas fotos tiene cada obra?</p>
          <div role="radiogroup" aria-label="Fotos por obra" className="grid grid-cols-3 rounded-full bg-crema-clara p-1 ring-1 ring-crema-borde">
            {[1, 2, 3].map(n => (
              <button key={n} type="button" role="radio" aria-checked={fotosPorObra === n} onClick={() => elegirFotosPorObra(n)} disabled={trabajando}
                className={`h-10 rounded-full text-[13px] font-bold ${fotosPorObra === n ? 'bg-tinta text-white' : ''}`}>{n === 1 ? '1 foto' : `${n} fotos`}</button>
            ))}
          </div>
          {fotosPorObra > 1 && <p className="mt-2 text-xs text-gris">Ej.: si eliges 9 fotos se arman 3 obras (fotos 1-3, 4-6 y 7-9). Abajo puedes revisar y corregir cada grupo.</p>}
          <BotonArchivo multiple disabled={trabajando || items.length >= MAX_OBRAS} onArchivos={agregar} className="btn-primario mt-4 h-14 w-full">
            <Images size={20} />{items.length ? 'Agregar más obras' : 'Elegir fotos de la galería'}
          </BotonArchivo>
        </section>

        <section className="rounded-[26px] bg-white p-5">
          <h2 className="text-lg font-bold">2. Datos que comparten</h2>
          <p className="mt-1 text-sm text-gris">Se aplican a todas las obras de este grupo. Después puedes cambiar cada una.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="etiqueta">Artista
              <select value={comun.artista_id} onChange={e => setComun(c => ({ ...c, artista_id: e.target.value }))} disabled={trabajando} className="campo mt-1.5">
                <option value="">Sin artista</option>{artistas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </label>
            <label className="etiqueta">Colección
              <select value={comun.categoria} onChange={e => setComun(c => ({ ...c, categoria: e.target.value }))} disabled={trabajando} className="campo mt-1.5">
                <option value="">La que sugiera la IA</option>{categorias.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
              </select>
            </label>
          </div>
          <div className="mt-4">
            <SelectorTipoObra tipo={comun.tipo_obra} inspiradaEn={comun.inspirada_en} certificado={comun.certificado} onChange={c => setComun(v => ({ ...v, ...c }))} />
          </div>
          <button type="button" role="switch" aria-checked={comun.mejorar} onClick={() => setComun(c => ({ ...c, mejorar: !c.mejorar }))}
            className="mt-3 flex min-h-[50px] w-full items-center justify-between gap-3 rounded-2xl bg-crema-clara px-4 text-left text-sm font-semibold ring-1 ring-crema-borde">
            Mejorar luz y color automáticamente
            <span aria-hidden="true" className={`flex h-7 w-12 shrink-0 rounded-full p-[3px] ${comun.mejorar ? 'justify-end bg-tinta' : 'justify-start bg-[#d9d4cb]'}`}><span className="h-[22px] w-[22px] rounded-full bg-white" /></span>
          </button>
        </section>

        {items.length > 0 && (
          <section className="rounded-[26px] bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold">3. Obras ({items.length})</h2>
              <span className="text-sm text-gris">{listas} de {items.length} listas</span>
            </div>
            {trabajando && <p className="mt-2 rounded-2xl bg-mostaza-fondo p-3 text-sm font-semibold">No cierres esta pantalla hasta que terminen. Cada obra tarda uno o dos minutos.</p>}
            <ul className="mt-4 space-y-3">
              {items.map(x => (
                <li key={x.id} className="rounded-[20px] bg-crema-clara p-3 ring-1 ring-crema-borde">
                  <div className="flex items-center gap-3">
                    <img src={x.miniatura || x.vistas[0]} alt="" className="h-16 w-16 shrink-0 rounded-xl bg-white object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{x.nombre || `Obra ${items.indexOf(x) + 1}`}<span className="ml-1.5 text-xs font-semibold text-gris">· {x.archivos.length} {x.archivos.length === 1 ? 'foto' : 'fotos'}</span></p>
                      <p className={`flex items-center gap-1.5 text-sm ${x.estado === 'error' ? 'text-red-700' : x.estado === 'publicada' ? 'font-semibold text-green-800' : 'text-gris'}`}>
                        {['subiendo', 'ia', 'procesando', 'guardando'].includes(x.estado) && <Loader2 size={14} className="animate-spin" />}
                        {x.estado === 'listo' && <Check size={14} />}{x.estado === 'error' && <AlertCircle size={14} />}
                        {ESTADOS[x.estado]}{x.error ? `: ${x.error}` : ''}
                      </p>
                    </div>
                    {(x.estado === 'cola' || x.estado === 'error') && !trabajando && (
                      <button onClick={() => quitar(x.id)} aria-label="Quitar de la lista" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"><X size={18} /></button>
                    )}
                  </div>
                  {editable(x) && (
                    <div className="mt-3">
                      <div className="flex gap-2">
                        {x.vistas.map((v, j) => (
                          <button key={v} type="button" onClick={() => hacerPrincipal(x.id, j)} aria-label={j === 0 ? 'Foto principal' : 'Usar como foto principal'}
                            className={`relative h-16 w-16 overflow-hidden rounded-xl ring-2 ${j === 0 ? 'ring-tinta' : 'ring-transparent'}`}>
                            <img src={v} alt="" className="h-full w-full object-cover" />
                            {j === 0 && <span className="absolute inset-x-0 bottom-0 bg-tinta py-0.5 text-center text-[10px] font-bold text-white">Principal</span>}
                          </button>
                        ))}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {items.indexOf(x) > 0 && editable(items[items.indexOf(x) - 1]) && items[items.indexOf(x) - 1].archivos.length + x.archivos.length <= MAX_FOTOS && (
                          <button type="button" onClick={() => unirConAnterior(x.id)} className="h-9 rounded-full bg-white px-3.5 text-xs font-bold ring-1 ring-crema-borde">Es la misma obra de arriba: unir</button>
                        )}
                        {x.archivos.length > 1 && <button type="button" onClick={() => separar(x.id)} className="h-9 rounded-full bg-white px-3.5 text-xs font-bold ring-1 ring-crema-borde">Son obras distintas: separar</button>}
                        {x.archivos.length > 1 && <span className="self-center text-xs text-gris">Toca una foto para hacerla principal</span>}
                      </div>
                    </div>
                  )}
                  {x.estado === 'listo' && (
                    <div className="mt-3 flex items-center justify-between gap-2 rounded-2xl bg-crema-clara px-3 py-1.5 text-sm">
                      <span className="font-semibold">{x.piezas > 1 ? insigniaJuego(x.piezas) : 'Una sola pieza'}</span>
                      <span className="flex items-center gap-1">
                        <button onClick={() => actualizar(x.id, { piezas: Math.max(1, (x.piezas || 1) - 1) })} aria-label="Una pieza menos" className="flex h-9 w-9 items-center justify-center rounded-full bg-white"><Minus size={15} /></button>
                        <span className="w-6 text-center font-bold">{x.piezas || 1}</span>
                        <button onClick={() => actualizar(x.id, { piezas: Math.min(20, (x.piezas || 1) + 1) })} aria-label="Una pieza más" className="flex h-9 w-9 items-center justify-center rounded-full bg-white"><Plus size={15} /></button>
                      </span>
                    </div>
                  )}
                  {x.estado === 'listo' && (
                    <div className="mt-3 grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
                      <label className="text-xs font-semibold">Precio $<input inputMode="decimal" value={x.precio} onChange={e => actualizar(x.id, { precio: e.target.value })} className="campo mt-1 h-11 px-3" /></label>
                      <label className="text-xs font-semibold">{x.piezas > 1 ? 'Alto c/u' : 'Alto cm'}<input inputMode="decimal" value={x.alto} onChange={e => actualizar(x.id, { alto: e.target.value })} className="campo mt-1 h-11 px-3" /></label>
                      <label className="text-xs font-semibold">{x.piezas > 1 ? 'Ancho c/u' : 'Ancho cm'}<input inputMode="decimal" value={x.ancho} onChange={e => actualizar(x.id, { ancho: e.target.value })} className="campo mt-1 h-11 px-3" /></label>
                      <button onClick={() => publicar(x)} disabled={x.publicando} className="btn-primario h-11 px-4 text-sm">{x.publicando ? '…' : 'Publicar'}</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
            {pendientes > 0 && (
              <button onClick={empezar} disabled={trabajando} className="btn-oscuro mt-5 h-[58px] w-full text-base">
                {trabajando ? <><Loader2 size={20} className="animate-spin" />Procesando…</> : <><Sparkles size={20} className="text-mostaza" />Preparar {pendientes} {pendientes === 1 ? 'obra' : 'obras'} con IA</>}
              </button>
            )}
            {listas > 0 && !trabajando && (
              <p className="mt-4 text-center text-sm text-gris">Las que no publiques aquí quedan como <Link to="/admin/obras" className="font-semibold underline">borradores en Obras</Link>, para completarlas después.</p>
            )}
          </section>
        )}
      </div>
    </>
  )
}
