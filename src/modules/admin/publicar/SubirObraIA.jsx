import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, ImagePlus, X, ChevronLeft, Check, Sparkles, Download, Copy, Loader2, Share2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../../lib/supabase.js'
import { numero, medidasTexto } from '../../../lib/formato.js'
import { subirArchivo, reducirImagen, cargarImagen } from '../adminService.js'
import { iniciarTrabajoIA, esperarTrabajoIA, leerClaveIA, guardarClaveIA } from './iaService.js'
import { leerBorrador, guardarBorrador, borrarBorrador } from './borrador.js'
import { encuadresDesdeIA } from './fichaCanvas.js'
import { recortarObra, mejorarImagen, aBlob } from './imagenObra.js'
import { AMBIENTES, dibujarAmbiente } from './ambientes.js'
import { FORMATOS, dibujarPublicacion, cargarFuentes } from './publicaciones.js'
import BotonArchivo from '../../../components/admin/BotonArchivo.jsx'
import SelectorTipoObra, { notaTipoParaIA, mensajeColumnasFaltantes, faltanColumnasTipo, sinCamposTipo } from '../../../components/admin/SelectorTipoObra.jsx'
import { ORIENTACIONES, orientacionPorProporcion } from '../../../lib/orientacion.js'
import SelectorOpciones, { SelectorAnio } from '../../../components/admin/SelectorOpciones.jsx'

const RANURAS = [
  { id: 'principal', etiqueta: 'La obra de frente' },
  { id: 'ambiente', etiqueta: 'En su ambiente' },
  { id: 'detalle', etiqueta: 'Detalle de textura' },
]

const CAMPOS_INICIALES = {
  notas: '', nombre: '', descripcion: '', estilo: '', publicacion: '', espacios: [],
  artista_id: '', tecnica: '', soporte: '', anio: String(new Date().getFullYear()),
  precio: '', alto: '', ancho: '', diametro: '', tipoExistencias: 'unica', edicion_total: '', existencias: '1',
  categorias: [], destacada: false, usarPortada: false, mejorar: true, ambienteId: 'sala',
  tipo_obra: 'original', inspirada_en: '', certificado: true,
}

const aURL = canvas => canvas ? canvas.toDataURL('image/jpeg', 0.82) : ''

export default function SubirObraIA() {
  const navigate = useNavigate()
  const [paso, setPaso] = useState(1)
  const [fotos, setFotos] = useState({})            // { principal: {url, img}, ambiente, detalle }
  const [subiendo, setSubiendo] = useState('')
  const [campos, setCampos] = useState(CAMPOS_INICIALES)
  const [caja, setCaja] = useState(null)             // encuadre de la obra en la foto principal
  const [trabajo, setTrabajo] = useState(null)       // { id, estado, orden }
  const [errorIA, setErrorIA] = useState('')
  const [errorFoto, setErrorFoto] = useState('')
  const [artistas, setArtistas] = useState([])
  const [categorias, setCategorias] = useState([])
  const [vistaMejorada, setVistaMejorada] = useState(true)
  const [previas, setPrevias] = useState({ ambientes: {}, posts: {} })
  const [guardando, setGuardando] = useState(false)
  const [listo, setListo] = useState(false)
  const esperando = useRef(false)
  const montado = useRef(true)
  const lienzos = useRef({ obra: null, ambientes: {}, posts: {} })

  const cambiar = (c, v) => setCampos(f => ({ ...f, [c]: v }))
  const artista = artistas.find(a => a.id === campos.artista_id)
  const circular = /circular|redond/i.test(campos.soporte)
  const cm = { alto: circular ? numero(campos.diametro) : numero(campos.alto), ancho: circular ? numero(campos.diametro) : numero(campos.ancho) }
  const medidas = medidasTexto({ alto_cm: circular ? null : cm.alto, ancho_cm: circular ? null : cm.ancho, diametro_cm: circular ? cm.ancho : null })
  const edicion = campos.tipoExistencias === 'edicion'
  const textoExistencias = campos.tipo_obra === 'interpretacion' ? 'Interpretación'
    : campos.certificado ? 'Original certificada' : edicion ? `Edición de ${campos.edicion_total || '—'}` : 'Pieza única'

  // ── IA ──
  const aplicarResultado = useCallback((r, orden) => {
    const tags = (r.hashtags || []).map(t => t.startsWith('#') ? t : '#' + t).join(' ')
    setCampos(f => ({
      ...f,
      nombre: r.nombre || f.nombre,
      descripcion: r.descripcion || f.descripcion,
      estilo: f.estilo || r.estilo || '',
      tecnica: f.tecnica || r.tecnica || '',
      publicacion: (r.publicacion || '') + (tags ? '\n\n' + tags : ''),
      espacios: r.espacios || [],
      categorias: f.categorias.length ? f.categorias
        : categorias.map(c => c.nombre).filter(n => (r.espacios || []).some(e => e.toLowerCase() === n.toLowerCase())),
    }))
    const cajas = encuadresDesdeIA(r.encuadres)
    const i = (orden || ['principal']).indexOf('principal')
    if (cajas[i]) setCaja(cajas[i])
  }, [categorias])

  const esperar = useCallback(async (t) => {
    if (esperando.current) return
    esperando.current = true
    setErrorIA('')
    try {
      const r = await esperarTrabajoIA(t.id, leerClaveIA(), { cancelado: () => !montado.current })
      if (!r || !montado.current) return
      aplicarResultado(r, t.orden)
      setTrabajo({ ...t, estado: 'listo' })
      setPaso(3)
      try { if (document.hidden && Notification.permission === 'granted') new Notification('Entre tu Arte', { body: 'Tu obra está lista para revisar.' }) } catch { /* sin notificaciones */ }
    } catch (err) {
      setTrabajo(null)
      setErrorIA(err.message || 'La IA no pudo terminar')
    } finally { esperando.current = false }
  }, [aplicarResultado])

  // ── Carga inicial y borrador ──
  useEffect(() => {
    montado.current = true
    supabase.from('artistas').select('id, nombre').order('nombre').then(({ data }) => setArtistas(data || []))
    supabase.from('categorias').select('*').order('nombre').then(({ data }) => setCategorias(data || []))
    cargarFuentes()
    leerBorrador().then(async b => {
      if (b?.fotos && Object.keys(b.fotos).length) {
        const restauradas = {}
        for (const [k, f] of Object.entries(b.fotos)) {
          const img = await cargarImagen(f.url).catch(() => null)
          if (img) restauradas[k] = { url: f.url, img }
        }
        setFotos(restauradas)
        setCampos({ ...CAMPOS_INICIALES, ...(b.campos || {}) })
        setCaja(b.caja || null)
        setTrabajo(b.trabajo || null)
        setPaso(b.paso || 1)
        toast('Retomamos la obra que estabas preparando')
        if (b.trabajo?.estado === 'pendiente') esperar(b.trabajo)
      } else {
        try { setCampos(f => ({ ...f, artista_id: localStorage.getItem('eta_ultimo_artista') || '' })) } catch { /* modo privado */ }
      }
    })
    return () => { montado.current = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (listo) return
    const t = setTimeout(() => {
      if (!fotos.principal) return
      const f = {}
      Object.entries(fotos).forEach(([k, v]) => { if (v) f[k] = { url: v.url } })
      guardarBorrador({ paso, fotos: f, campos, caja, trabajo })
    }, 600)
    return () => clearTimeout(t)
  }, [paso, fotos, campos, caja, trabajo, listo])

  // ── Imagen de la obra: recorte + mejora (se recalcula si cambia la foto o el encuadre) ──
  const obraCanvas = useMemo(() => {
    if (!fotos.principal?.img) return null
    const recorte = recortarObra(fotos.principal.img, caja)
    return { recorte, mejorada: mejorarImagen(recorte) }
  }, [fotos.principal, caja])
  const obraFinal = obraCanvas ? (campos.mejorar ? obraCanvas.mejorada : obraCanvas.recorte) : null
  const obraFinalURL = useMemo(() => aURL(obraFinal), [obraFinal])
  // Orientación detectada en la foto recortada y la que indican las medidas escritas
  const orientacionFoto = obraCanvas ? orientacionPorProporcion(obraCanvas.recorte.width, obraCanvas.recorte.height) : null
  const orientacionMedidas = circular ? 'redonda' : orientacionPorProporcion(cm.ancho, cm.alto)
  const medidasContradicen = orientacionFoto && orientacionMedidas && orientacionMedidas !== 'redonda' && orientacionFoto !== 'cuadrada' && orientacionMedidas !== 'cuadrada' && orientacionFoto !== orientacionMedidas
  const invertirMedidas = () => setCampos(f => ({ ...f, alto: f.ancho, ancho: f.alto }))

  // ── Ambientes y publicaciones (vista previa) ──
  useEffect(() => {
    if (!obraFinal || paso < 3) return
    const t = setTimeout(() => {
      const amb = {}
      AMBIENTES.forEach(a => { amb[a.id] = dibujarAmbiente(obraFinal, a, cm) })
      const ambienteElegido = campos.ambienteId === 'propia' && fotos.ambiente?.img ? fotos.ambiente.img : amb[campos.ambienteId] || amb.sala
      const datos = { nombre: campos.nombre, artista: artista?.nombre, tecnica: campos.tecnica, medidas, precio: campos.precio, existencias: textoExistencias }
      const posts = {}
      FORMATOS.forEach(f => { posts[f.id] = dibujarPublicacion(f.id, { datos, imagenes: { obra: obraFinal, ambiente: ambienteElegido } }) })
      lienzos.current = { obra: obraFinal, ambientes: amb, posts }
      const ambPrev = {}
      Object.entries(amb).forEach(([k, c]) => { ambPrev[k] = aURL(c) })
      const postPrev = {}
      Object.entries(posts).forEach(([k, c]) => { postPrev[k] = aURL(c) })
      setPrevias({ ambientes: ambPrev, posts: postPrev })
    }, 250)
    return () => clearTimeout(t)
  }, [obraFinal, paso, campos.nombre, campos.tecnica, campos.precio, campos.ambienteId, campos.alto, campos.ancho, campos.diametro, campos.soporte, campos.tipoExistencias, campos.edicion_total, artista?.nombre, fotos.ambiente]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fotos ──
  async function elegirFoto(ranura, archivo) {
    if (!archivo) return
    setSubiendo(ranura); setErrorFoto('')
    try {
      const reducido = await reducirImagen(archivo, 2400, 0.9)
      const url = await subirArchivo('obras', reducido)
      const img = await cargarImagen(URL.createObjectURL(reducido))
      setFotos(f => ({ ...f, [ranura]: { url, img } }))
      if (ranura === 'principal') { setCaja(null); setTrabajo(null) }
    } catch (err) {
      setErrorFoto(err.message || String(err)); toast.error('No se pudo subir la foto')
    } finally { setSubiendo('') }
  }

  // Varias fotos a la vez: la primera va al espacio elegido y las demás a los espacios libres
  async function elegirVarias(archivos, desde = 'principal') {
    const orden = RANURAS.map(r => r.id)
    const destinos = [desde, ...orden.filter(id => id !== desde && !fotos[id])]
    for (const [i, archivo] of archivos.slice(0, destinos.length).entries()) await elegirFoto(destinos[i], archivo)
    if (archivos.length > destinos.length) toast(`Se usaron ${destinos.length} foto(s): máximo 3 por obra`)
  }

  async function analizar() {
    if (!fotos.principal) { toast.error('Primero sube la foto de la obra'); return }
    let clave = leerClaveIA()
    if (!clave) {
      clave = (window.prompt('Escribe la clave de acceso de la IA (solo se pide una vez en este dispositivo):') || '').trim()
      if (!clave) return
      guardarClaveIA(clave)
    }
    try { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission() } catch { /* sin notificaciones */ }
    setPaso(2); setErrorIA('')
    try {
      const orden = RANURAS.map(r => r.id).filter(id => fotos[id])
      const notas = [campos.notas, artista && `artista: ${artista.nombre}`, notaTipoParaIA(campos.tipo_obra, campos.inspirada_en)].filter(Boolean).join('\n')
      const id = await iniciarTrabajoIA({ urls: orden.map(id => fotos[id].url), notas, clave })
      const t = { id, estado: 'pendiente', orden }
      setTrabajo(t)
      esperar(t)
    } catch (err) { setErrorIA(err.message || 'No se pudo iniciar la IA') }
  }

  // ── Compartir / descargar ──
  async function archivoDe(id) {
    const blob = await aBlob(lienzos.current.posts[id], 0.92)
    const base = (campos.nombre || 'obra').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-')
    return new File([blob], `entre-tu-arte-${base}-${id}.jpg`, { type: 'image/jpeg' })
  }
  async function compartir(ids) {
    const archivos = await Promise.all(ids.map(archivoDe))
    const movil = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    if (movil && navigator.canShare?.({ files: archivos })) {
      try { await navigator.share({ files: archivos }); return } catch (e) { if (e.name === 'AbortError') return }
    }
    archivos.forEach(f => {
      const url = URL.createObjectURL(f)
      const a = document.createElement('a'); a.href = url; a.download = f.name; a.click()
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    })
  }
  async function copiarTexto() {
    try { await navigator.clipboard.writeText(campos.publicacion); toast.success('Texto copiado') } catch { toast.error('No se pudo copiar') }
  }

  // ── Publicar ──
  async function guardar(estado) {
    if (!obraFinal) return
    if (estado === 'disponible' && !campos.nombre.trim()) { toast.error('Ponle nombre a la obra'); setPaso(3); return }
    if (!lienzos.current.posts.catalogo) { toast.error('Espera un momento: se están preparando las publicaciones'); return }
    setGuardando(true)
    try {
      const subir = async (canvas, carpeta) => subirArchivo(carpeta, new File([await aBlob(canvas, 0.9)], 'foto.jpg', { type: 'image/jpeg' }))
      const urlObra = await subir(obraFinal, 'obras')
      const urlAmbiente = campos.ambienteId === 'propia' && fotos.ambiente ? fotos.ambiente.url
        : await subir(lienzos.current.ambientes[campos.ambienteId] || lienzos.current.ambientes.sala, 'obras')
      const urlFicha = await subir(lienzos.current.posts.catalogo, 'fichas')
      const lista = [{ url: urlObra, rol: 'principal' }, { url: urlAmbiente, rol: 'ambiente' }]
      if (fotos.detalle) lista.push({ url: fotos.detalle.url, rol: 'detalle' })
      const registro = {
        titulo: campos.nombre.trim() || null,
        descripcion: campos.descripcion.trim() || null,
        estilo: campos.estilo || null, tecnica: campos.tecnica || null, soporte: campos.soporte || null,
        alto_cm: circular ? null : cm.alto, ancho_cm: circular ? null : cm.ancho, diametro_cm: circular ? cm.ancho : null,
        medidas: medidas || null, precio: numero(campos.precio), anio: parseInt(campos.anio, 10) || null,
        existencias: edicion ? Math.max(0, parseInt(campos.existencias, 10) || 0) : 1,
        edicion_total: edicion ? (parseInt(campos.edicion_total, 10) || null) : null,
        artista_id: campos.artista_id || null, artista_nombre: artista?.nombre || null,
        fotos: lista, imagen_url: urlObra, ficha_url: urlFicha,
        publicacion: campos.publicacion || null, espacios: campos.espacios || [], categorias: campos.categorias,
        estado, destacada: estado === 'disponible' && campos.destacada,
        tipo_obra: campos.tipo_obra || null, inspirada_en: campos.tipo_obra === 'interpretacion' ? (campos.inspirada_en.trim() || null) : null, certificado: !!campos.certificado,
      }
      let { data, error } = await supabase.from('fichas').insert(registro).select('id').single()
      if (error && faltanColumnasTipo(error)) {
        ({ data, error } = await supabase.from('fichas').insert(sinCamposTipo(registro)).select('id').single())
        if (!error) toast('Obra guardada. El tipo (original/interpretación) quedará pendiente hasta ejecutar el SQL de tipo de obra en Supabase.', { icon: '⚠️', duration: 9000 })
      }
      if (error) throw error
      if (campos.usarPortada && estado === 'disponible') {
        await supabase.from('portadas').insert({
          imagen_url: urlAmbiente, imagen_movil_url: urlAmbiente, titular: campos.nombre.trim(),
          subtitulo: [artista?.nombre, medidas].filter(Boolean).join(' · ') || null,
          boton_texto: 'Ver la obra', boton_enlace: `/obra/${data.id}`, ficha_id: String(data.id), orden: 0, activa: true,
        })
      }
      try { localStorage.setItem('eta_ultimo_artista', campos.artista_id) } catch { /* modo privado */ }
      await borrarBorrador()
      setListo(true)
      toast.success(estado === 'disponible' ? '¡Obra publicada!' : 'Guardada como borrador')
      navigate('/admin/obras')
    } catch (err) {
      toast.error('No se pudo guardar: ' + mensajeColumnasFaltantes(err), { duration: 8000 })
    } finally { setGuardando(false) }
  }

  async function descartar() {
    if (fotos.principal && !window.confirm('¿Descartar esta obra?')) return
    await borrarBorrador()
    setFotos({}); setCaja(null); setTrabajo(null); setPaso(1); setErrorIA('')
    setCampos(f => ({ ...CAMPOS_INICIALES, artista_id: f.artista_id }))
  }

  // ── Interfaz ──
  const titulos = { 1: <>Sube la foto de tu <em className="font-bold text-mostaza">obra</em></>, 2: 'La IA está trabajando…', 3: 'Así quedó tu obra', 4: 'Precio y publicación' }
  const puedeVolver = paso === 3 || paso === 4
  const barraFija = 'fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-[#f1eee8] via-[#f1eee8] to-transparent px-4 pb-5 pt-6 lg:static lg:mt-6 lg:bg-none lg:p-0'

  return (
    <div className="mx-auto max-w-2xl pb-28 lg:pb-10">
      <header className="flex items-center justify-between py-2">
        <button onClick={() => puedeVolver ? setPaso(paso - 1) : descartar()} aria-label={puedeVolver ? 'Volver' : 'Descartar obra'}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white">{puedeVolver ? <ChevronLeft size={20} /> : <X size={19} />}</button>
        <span className="text-[15px] font-bold">Nueva obra</span>
        <span className="w-11 text-right text-[13px] font-bold text-gris">{paso}/4</span>
      </header>
      <div aria-label={`Paso ${paso} de 4`} className="mb-6 mt-2 grid grid-cols-4 gap-1.5">
        {[1, 2, 3, 4].map(n => <span key={n} className={`h-[5px] rounded-full ${n <= paso ? 'bg-mostaza' : 'bg-crema-borde'}`} />)}
      </div>
      <h1 className="text-[32px] font-semibold leading-[1.02] tracking-[-0.035em] md:text-[40px]">{titulos[paso]}</h1>

      {/* ── Paso 1: fotos ── */}
      {paso === 1 && (
        <section className="mt-3">
          <p className="text-[15px] text-gris">La IA la recorta, mejora la luz y escribe la ficha por ti.</p>
          {fotos.principal ? (
            <div className="relative mt-5 overflow-hidden rounded-[28px] bg-white">
              <img src={fotos.principal.img.src} alt="Foto de la obra" className="max-h-[420px] w-full object-contain" />
              <BotonArchivo onArchivos={([f]) => elegirFoto('principal', f)} className="btn-contorno btn-chico absolute bottom-3 right-3 bg-white">Cambiar</BotonArchivo>
            </div>
          ) : (
            <div className="mt-5 flex flex-col items-center gap-3.5 rounded-[28px] border-2 border-dashed border-[#d9d2c5] bg-white p-6">
              <span aria-hidden="true" className="flex h-[76px] w-[76px] items-center justify-center rounded-full bg-mostaza-clara">
                {subiendo === 'principal' ? <Loader2 size={32} className="animate-spin" /> : <Camera size={34} />}
              </span>
              <BotonArchivo camara disabled={!!subiendo} onArchivos={([f]) => elegirFoto('principal', f)} className="btn-primario h-[58px] w-full text-[17px]">
                {subiendo === 'principal' ? 'Subiendo…' : 'Tomar foto'}
              </BotonArchivo>
              <BotonArchivo multiple disabled={!!subiendo} onArchivos={f => elegirVarias(f)} className="btn-contorno h-[52px] w-full text-[15px]">Elegir de la galería (1 a 3 fotos)</BotonArchivo>
            </div>
          )}
          {errorFoto && <p role="alert" className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-800">No se pudo subir la foto. {errorFoto}</p>}
          <ul aria-label="Consejos" className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-semibold">
            {['De frente', 'Luz natural', 'Sin reflejos'].map(t => <li key={t} className="rounded-[18px] bg-white px-2 py-3">{t}</li>)}
          </ul>
          <p className="mb-2 mt-5 text-[13px] font-bold">Opcional: más fotos</p>
          <div className="grid grid-cols-2 gap-2.5">
            {RANURAS.slice(1).map(r => (
              <BotonArchivo key={r.id} multiple disabled={!!subiendo} onArchivos={f => elegirVarias(f, r.id)} className="relative flex h-20 w-full items-center justify-center gap-2 overflow-hidden rounded-[18px] border-[1.5px] border-dashed border-[#d9d2c5] text-[13px] font-semibold text-gris">
                {fotos[r.id] ? <>
                  <img src={fotos[r.id].img.src} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  <span className="relative rounded-full bg-white/95 px-3 py-1 text-tinta">{r.etiqueta} ✓</span>
                </> : subiendo === r.id ? 'Subiendo…' : <><ImagePlus size={18} />{r.etiqueta}</>}
              </BotonArchivo>
            ))}
          </div>
          <div className="mt-5 rounded-[18px] bg-white p-4">
            <p className="mb-3 text-[13px] font-bold">¿Qué tipo de obra es?</p>
            <SelectorTipoObra tipo={campos.tipo_obra} inspiradaEn={campos.inspirada_en} certificado={campos.certificado}
              onChange={cambios => setCampos(f => ({ ...f, ...cambios }))} />
          </div>
          <details className="mt-4 rounded-[18px] bg-white px-4 py-3">
            <summary className="cursor-pointer text-[13px] font-bold">Notas para la IA (opcional)</summary>
            <textarea rows={2} value={campos.notas} onChange={e => cambiar('notas', e.target.value)} placeholder="Ej: inspirada en el atardecer de El Tunco" className="campo mt-2" />
          </details>
          <div className={barraFija}>
            <button onClick={analizar} disabled={!fotos.principal || !!subiendo} className="btn-oscuro mx-auto flex h-[58px] w-full max-w-2xl text-base">
              <Sparkles size={20} className="text-mostaza" />Analizar con IA
            </button>
          </div>
        </section>
      )}

      {/* ── Paso 2: IA trabajando ── */}
      {paso === 2 && (
        <section className="mt-5">
          {fotos.principal && (
            <div className="relative overflow-hidden rounded-[28px] bg-tinta-suave">
              <img src={fotos.principal.img.src} alt="Foto de la obra" className="max-h-[360px] w-full object-contain opacity-80" />
              {!errorIA && <span className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-mostaza px-3 py-1.5 text-xs font-bold"><Loader2 size={14} className="animate-spin" />Analizando</span>}
            </div>
          )}
          <ol className="mt-5 space-y-2.5">
            {['Fotos subidas', 'Encontrando y recortando la obra', 'Escribiendo nombre, descripción y texto para redes', 'Mejorando la luz y armando ambientes y publicaciones'].map((t, i) => (
              <li key={t} className={`flex items-center gap-3 rounded-[18px] bg-white px-4 py-3 text-[15px] font-semibold ${i > 1 ? 'text-[#a39e95]' : ''} ${i === 1 && !errorIA ? 'ring-2 ring-mostaza' : ''}`}>
                <span aria-hidden="true" className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm ${i === 0 ? 'bg-tinta text-white' : i === 1 ? 'bg-mostaza' : 'bg-[#efebe4]'}`}>
                  {i === 0 ? <Check size={15} /> : i === 1 && !errorIA ? <Loader2 size={15} className="animate-spin" /> : i + 1}
                </span>{t}
              </li>
            ))}
          </ol>
          {errorIA ? (
            <div className="mt-5 rounded-[22px] bg-red-50 p-5 text-red-900">
              <p className="font-semibold">{errorIA}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={analizar} className="btn-oscuro btn-chico">Intentar de nuevo</button>
                <button onClick={() => setPaso(3)} className="btn-contorno btn-chico">Seguir sin IA</button>
              </div>
            </div>
          ) : <p className="mt-4 text-center text-[13px] text-gris">Tarda uno o dos minutos. Puedes salir: tu obra queda guardada y te avisamos al terminar.</p>}
        </section>
      )}

      {/* ── Paso 3: revisar ── */}
      {paso === 3 && obraCanvas && (
        <section className="mt-4">
          <div role="tablist" aria-label="Comparar foto" className="grid grid-cols-2 rounded-full bg-white p-1">
            {[[false, 'Foto original'], [true, 'Mejorada con IA']].map(([v, t]) => (
              <button key={t} role="tab" aria-selected={vistaMejorada === v} onClick={() => setVistaMejorada(v)}
                className={`h-10 rounded-full text-sm font-bold ${vistaMejorada === v ? 'bg-tinta text-white' : ''}`}>{t}</button>
            ))}
          </div>
          <div className="mt-3 flex justify-center overflow-hidden rounded-[24px] bg-[#e9e4dc] p-3">
            <img src={vistaMejorada ? obraFinalURL : fotos.principal.img.src} alt={vistaMejorada ? 'Obra recortada y mejorada' : 'Foto original'} className="max-h-[380px] rounded-lg object-contain shadow-lg" />
          </div>
          {orientacionFoto && <p className="mt-3 text-center text-sm font-semibold">Obra <span className="rounded-full bg-mostaza px-3 py-1">{ORIENTACIONES[orientacionFoto].toLowerCase()}</span> · detectada en la foto</p>}
          <button type="button" role="switch" aria-checked={campos.mejorar} onClick={() => cambiar('mejorar', !campos.mejorar)}
            className="mt-3 flex w-full items-center justify-between rounded-[18px] bg-white px-4 py-3 text-left text-sm font-semibold">
            Mejorar luz y color automáticamente
            <span aria-hidden="true" className={`flex h-7 w-12 shrink-0 rounded-full p-[3px] ${campos.mejorar ? 'justify-end bg-tinta' : 'justify-start bg-[#d9d4cb]'}`}><span className="h-[22px] w-[22px] rounded-full bg-white" /></span>
          </button>

          <p className="mb-2 mt-5 text-[13px] font-bold">Elige el ambiente</p>
          <div className="sin-scroll -mx-4 flex gap-2.5 overflow-x-auto px-4">
            {[...(fotos.ambiente ? [{ id: 'propia', nombre: 'Tu foto', src: fotos.ambiente.img.src }] : []), ...AMBIENTES.map(a => ({ id: a.id, nombre: a.nombre, src: previas.ambientes[a.id] }))].map(a => (
              <button key={a.id} onClick={() => cambiar('ambienteId', a.id)} aria-pressed={campos.ambienteId === a.id} className="w-36 shrink-0 text-left">
                <span className={`flex h-28 items-center justify-center overflow-hidden rounded-2xl border-[3px] bg-crema-borde ${campos.ambienteId === a.id ? 'border-mostaza' : 'border-transparent'}`}>
                  {a.src ? <img src={a.src} alt="" className="h-full w-full object-cover" /> : <Loader2 size={18} className="animate-spin text-gris" />}
                </span>
                <span className="mt-1 block text-xs font-semibold">{a.nombre}</span>
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-3.5 rounded-[22px] border-2 border-mostaza bg-white p-4">
            <p className="flex items-center gap-1.5 text-xs font-bold text-gris"><Sparkles size={14} className="text-mostaza" />Escrito por la IA · puedes editarlo</p>
            <label className="etiqueta">Nombre<input value={campos.nombre} onChange={e => cambiar('nombre', e.target.value)} className="campo mt-1.5 text-lg font-bold" /></label>
            <label className="etiqueta">Descripción<textarea rows={3} value={campos.descripcion} onChange={e => cambiar('descripcion', e.target.value)} className="campo mt-1.5" /></label>
            <SelectorOpciones etiqueta="Estilo" tipo="estilos" valor={campos.estilo} onChange={v => cambiar('estilo', v)} />
            <label className="etiqueta">Texto para redes<textarea rows={5} value={campos.publicacion} onChange={e => cambiar('publicacion', e.target.value)} className="campo mt-1.5 text-sm" /></label>
          </div>
          <div className={barraFija}>
            <button onClick={() => setPaso(4)} className="btn-oscuro mx-auto flex h-[58px] w-full max-w-2xl text-base">Siguiente: precio y medidas</button>
          </div>
        </section>
      )}

      {/* ── Paso 4: precio, datos y publicar ── */}
      {paso === 4 && obraCanvas && (
        <section className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-2.5">
            <label className="etiqueta">Precio (USD)<input inputMode="decimal" value={campos.precio} onChange={e => cambiar('precio', e.target.value)} placeholder="650" className="campo mt-1.5 text-lg font-bold" /></label>
            <label className="etiqueta">Artista
              <select value={campos.artista_id} onChange={e => cambiar('artista_id', e.target.value)} className="campo mt-1.5">
                <option value="">Elegir…</option>{artistas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </label>
            {circular ? (
              <label className="etiqueta col-span-2">Diámetro (cm)<input inputMode="decimal" value={campos.diametro} onChange={e => cambiar('diametro', e.target.value)} className="campo mt-1.5" /></label>
            ) : <>
              <label className="etiqueta">Alto (cm)<input inputMode="decimal" value={campos.alto} onChange={e => cambiar('alto', e.target.value)} className="campo mt-1.5" /></label>
              <label className="etiqueta">Ancho (cm)<input inputMode="decimal" value={campos.ancho} onChange={e => cambiar('ancho', e.target.value)} className="campo mt-1.5" /></label>
            </>}
          </div>
          {medidasContradicen ? (
            <div role="alert" className="flex items-center justify-between gap-3 rounded-[18px] bg-mostaza-fondo p-3 text-sm">
              <span>La foto es <strong>{ORIENTACIONES[orientacionFoto].toLowerCase()}</strong>, pero las medidas indican {ORIENTACIONES[orientacionMedidas].toLowerCase()}. ¿Están al revés?</span>
              <button type="button" onClick={invertirMedidas} className="btn-oscuro btn-chico shrink-0 px-4">Invertir</button>
            </div>
          ) : (orientacionMedidas || orientacionFoto) && (
            <p className="text-sm font-semibold">Formato: <span className="rounded-full bg-white px-3 py-1">{ORIENTACIONES[orientacionMedidas || orientacionFoto]}</span></p>
          )}
          <div role="radiogroup" aria-label="Existencias" className="grid grid-cols-2 rounded-full bg-white p-1">
            {[['unica', 'Pieza única'], ['edicion', 'Edición limitada']].map(([v, t]) => (
              <button key={v} role="radio" aria-checked={campos.tipoExistencias === v} onClick={() => cambiar('tipoExistencias', v)}
                className={`h-10 rounded-full text-[13px] font-bold ${campos.tipoExistencias === v ? 'bg-tinta text-white' : ''}`}>{t}</button>
            ))}
          </div>
          {edicion && (
            <div className="grid grid-cols-2 gap-2.5">
              <label className="etiqueta">Total de la edición<input inputMode="numeric" value={campos.edicion_total} onChange={e => cambiar('edicion_total', e.target.value)} className="campo mt-1.5" /></label>
              <label className="etiqueta">Disponibles<input inputMode="numeric" value={campos.existencias} onChange={e => cambiar('existencias', e.target.value)} className="campo mt-1.5" /></label>
            </div>
          )}
          <div className="rounded-[22px] bg-white p-4">
            <p className="mb-3 text-[13px] font-bold">Tipo de obra</p>
            <SelectorTipoObra tipo={campos.tipo_obra} inspiradaEn={campos.inspirada_en} certificado={campos.certificado}
              onChange={cambios => setCampos(f => ({ ...f, ...cambios }))} />
          </div>
          <div className="space-y-4 rounded-[22px] bg-white p-4">
            <SelectorOpciones etiqueta="Técnica" tipo="tecnicas" valor={campos.tecnica} onChange={v => cambiar('tecnica', v)} />
            <SelectorOpciones etiqueta="Soporte" tipo="soportes" valor={campos.soporte} onChange={v => cambiar('soporte', v)} />
            <SelectorAnio valor={campos.anio} onChange={v => cambiar('anio', v)} />
            {categorias.length > 0 && (
              <fieldset>
                <legend className="etiqueta mb-2">Colecciones</legend>
                <div className="flex flex-wrap gap-2">
                  {categorias.map(c => {
                    const on = campos.categorias.includes(c.nombre)
                    return <button type="button" key={c.id} aria-pressed={on} onClick={() => cambiar('categorias', on ? campos.categorias.filter(x => x !== c.nombre) : [...campos.categorias, c.nombre])}
                      className={`inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold ${on ? 'border-tinta bg-tinta text-white' : 'border-crema-borde bg-white'}`}>{on && <Check size={15} />}{c.nombre}</button>
                  })}
                </div>
              </fieldset>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-bold">Publicaciones listas para redes</p>
              <button onClick={copiarTexto} disabled={!campos.publicacion} className="flex items-center gap-1.5 text-[13px] font-semibold underline"><Copy size={14} />Copiar texto</button>
            </div>
            <div className="flex items-end gap-3">
              {FORMATOS.map(f => (
                <button key={f.id} onClick={() => compartir([f.id])} aria-label={`Descargar ${f.nombre}`} className="min-w-0 text-left" style={{ flex: f.id === 'historia' ? '0.7 1 0' : '1 1 0' }}>
                  <span className="block overflow-hidden rounded-xl bg-crema-borde shadow-[0_8px_18px_-10px_rgba(0,0,0,0.45)]" style={{ aspectRatio: `${f.w}/${f.h}` }}>
                    {previas.posts[f.id] && <img src={previas.posts[f.id]} alt={f.nombre} className="h-full w-full object-cover" />}
                  </span>
                  <span className="mt-1.5 block truncate text-[11px] font-semibold">{f.nombre}</span>
                </button>
              ))}
            </div>
            <button onClick={() => compartir(FORMATOS.map(f => f.id))} disabled={!previas.posts.catalogo} className="btn-contorno btn-chico mt-3 w-full"><Share2 size={16} />Descargar o compartir las 3</button>
          </div>

          <div className="rounded-[20px] bg-white px-4">
            {[['destacada', 'Destacar en "Obras de la semana"'], ['usarPortada', 'Usar en la portada del sitio']].map(([c, t], i) => (
              <button key={c} type="button" role="switch" aria-checked={campos[c]} onClick={() => cambiar(c, !campos[c])}
                className={`flex min-h-[54px] w-full items-center justify-between gap-3 text-left text-sm font-semibold ${i ? 'border-t border-[#efebe4]' : ''}`}>
                {t}<span aria-hidden="true" className={`flex h-7 w-12 shrink-0 rounded-full p-[3px] ${campos[c] ? 'justify-end bg-tinta' : 'justify-start bg-[#d9d4cb]'}`}><span className="h-[22px] w-[22px] rounded-full bg-white" /></span>
              </button>
            ))}
          </div>
          <button onClick={() => guardar('borrador')} disabled={guardando} className="w-full text-sm font-semibold text-gris underline">Guardar como borrador</button>
          <div className={barraFija}>
            <div className="mx-auto flex max-w-2xl gap-2.5">
              <button onClick={() => compartir(['catalogo'])} aria-label="Descargar ficha" disabled={!previas.posts.catalogo} className="btn-contorno h-[58px] w-[58px] shrink-0 px-0"><Download size={20} /></button>
              <button onClick={() => guardar('disponible')} disabled={guardando} className="btn-primario h-[58px] flex-1 text-[17px]">{guardando ? 'Publicando…' : 'Publicar obra'}</button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
