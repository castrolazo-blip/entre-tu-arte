import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Images, Sparkles, Check, Loader2, AlertCircle, X } from 'lucide-react'
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

const MAX_OBRAS = 20
const SIMULTANEAS = 2

const ESTADOS = {
  cola: 'En espera',
  subiendo: 'Subiendo foto…',
  ia: 'La IA está escribiendo…',
  procesando: 'Mejorando foto y armando ficha…',
  guardando: 'Guardando…',
  listo: 'Lista como borrador',
  publicada: 'Publicada',
  error: 'Error',
}

let siguienteId = 1

// Sube varias obras de una vez: una foto por obra. Cada una pasa por la IA y queda como borrador;
// después se completa precio y medidas y se publica desde esta misma pantalla.
export default function SubirLote() {
  const [items, setItems] = useState([])
  const [comun, setComun] = useState({ artista_id: '', categoria: '', tipo_obra: 'original', inspirada_en: '', certificado: true, mejorar: true })
  const [artistas, setArtistas] = useState([])
  const [categorias, setCategorias] = useState([])
  const [trabajando, setTrabajando] = useState(false)
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

  function agregar(archivos) {
    const libres = MAX_OBRAS - items.length
    if (archivos.length > libres) toast(`Se agregaron ${libres}: máximo ${MAX_OBRAS} obras por vez`)
    const nuevos = archivos.slice(0, libres).map(archivo => ({
      id: siguienteId++, archivo, vista: URL.createObjectURL(archivo), estado: 'cola',
      precio: '', alto: '', ancho: '',
    }))
    setItems(l => [...l, ...nuevos])
  }

  async function procesar(item, clave) {
    try {
      actualizar(item.id, { estado: 'subiendo', error: '' })
      const reducido = await reducirImagen(item.archivo, 2400, 0.9)
      const url = await subirArchivo('obras', reducido)
      const img = await cargarImagen(URL.createObjectURL(reducido))

      actualizar(item.id, { estado: 'ia' })
      const notas = [artista && `artista: ${artista.nombre}`, notaTipoParaIA(comun.tipo_obra, comun.inspirada_en)].filter(Boolean).join('\n')
      const trabajo = await iniciarTrabajoIA({ urls: [url], notas, clave })
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
      const [urlObra, urlAmbiente, urlFicha] = await Promise.all([subirLienzo(obra, 'obras'), subirLienzo(ambiente, 'obras'), subirLienzo(ficha, 'fichas')])
      const tags = (r.hashtags || []).map(t => t.startsWith('#') ? t : '#' + t).join(' ')
      const cats = new Set(comun.categoria ? [comun.categoria] : [])
      categorias.forEach(c => { if ((r.espacios || []).some(e => e.toLowerCase() === c.nombre.toLowerCase())) cats.add(c.nombre) })
      const registro = {
        titulo: r.nombre || null, descripcion: r.descripcion || null, estilo: r.estilo || null, tecnica: r.tecnica || null,
        publicacion: (r.publicacion || '') + (tags ? '\n\n' + tags : ''), espacios: r.espacios || [], categorias: [...cats],
        artista_id: comun.artista_id || null, artista_nombre: artista?.nombre || null,
        fotos: [{ url: urlObra, rol: 'principal' }, { url: urlAmbiente, rol: 'ambiente' }],
        imagen_url: urlObra, ficha_url: urlFicha, estado: 'borrador', existencias: 1, anio: new Date().getFullYear(),
        tipo_obra: comun.tipo_obra, inspirada_en: comun.tipo_obra === 'interpretacion' ? (comun.inspirada_en.trim() || null) : null, certificado: !!comun.certificado,
      }
      let { data, error } = await supabase.from('fichas').insert(registro).select('id').single()
      if (error && faltanColumnasTipo(error)) ({ data, error } = await supabase.from('fichas').insert(sinCamposTipo(registro)).select('id').single())
      if (error) throw error
      actualizar(item.id, { estado: 'listo', obraId: data.id, nombre: r.nombre, tecnica: r.tecnica, miniatura: obra.toDataURL('image/jpeg', 0.7) })
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
      const medidas = medidasTexto({ alto_cm: alto, ancho_cm: ancho })
      const cambios = { precio, alto_cm: alto, ancho_cm: ancho, medidas: medidas || null, estado: 'disponible' }
      // Rehacer la ficha y el ambiente con las medidas y el precio
      const l = lienzos.current[item.id]
      if (l) {
        const ambiente = dibujarAmbiente(l.obra, AMBIENTES[0], { alto, ancho })
        const etiqueta = comun.tipo_obra === 'interpretacion' ? 'Interpretación' : comun.certificado ? 'Original certificada' : 'Pieza única'
        const ficha = dibujarPublicacion('catalogo', { datos: { nombre: item.nombre, artista: artista?.nombre, tecnica: item.tecnica, medidas, precio: item.precio, existencias: etiqueta }, imagenes: { obra: l.obra, ambiente } })
        cambios.ficha_url = await subirArchivo('fichas', new File([await aBlob(ficha, 0.9)], 'ficha.jpg', { type: 'image/jpeg' }))
      }
      const { error } = await supabase.from('fichas').update(cambios).eq('id', item.obraId)
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
          <p className="mt-1 text-sm text-gris">Una foto por obra, de frente y con buena luz. Hasta {MAX_OBRAS} por vez.</p>
          <BotonArchivo multiple disabled={trabajando || items.length >= MAX_OBRAS} onArchivos={agregar} className="btn-primario mt-4 h-14 w-full">
            <Images size={20} />{items.length ? 'Agregar más fotos' : 'Elegir fotos de la galería'}
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
                    <img src={x.miniatura || x.vista} alt="" className="h-16 w-16 shrink-0 rounded-xl bg-white object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{x.nombre || x.archivo.name}</p>
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
                  {x.estado === 'listo' && (
                    <div className="mt-3 grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
                      <label className="text-xs font-semibold">Precio $<input inputMode="decimal" value={x.precio} onChange={e => actualizar(x.id, { precio: e.target.value })} className="campo mt-1 h-11 px-3" /></label>
                      <label className="text-xs font-semibold">Alto cm<input inputMode="decimal" value={x.alto} onChange={e => actualizar(x.id, { alto: e.target.value })} className="campo mt-1 h-11 px-3" /></label>
                      <label className="text-xs font-semibold">Ancho cm<input inputMode="decimal" value={x.ancho} onChange={e => actualizar(x.id, { ancho: e.target.value })} className="campo mt-1 h-11 px-3" /></label>
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
