import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, ImagePlus, X, ChevronLeft, Download, Copy, RotateCcw, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../../lib/supabase.js'
import { numero, medidasTexto } from '../../../lib/formato.js'
import { subirArchivo, reducirImagen, cargarImagen } from '../adminService.js'
import { dibujarFicha, HUECOS, ANCHO, ALTO, huecoEn, encuadresDesdeIA } from './fichaCanvas.js'
import { iniciarTrabajoIA, esperarTrabajoIA, leerClaveIA, guardarClaveIA } from './iaService.js'
import { leerBorrador, guardarBorrador, borrarBorrador } from './borrador.js'
import EncabezadoAdmin from '../EncabezadoAdmin.jsx'
import SelectorOpciones, { SelectorAnio } from '../../../components/admin/SelectorOpciones.jsx'

const ROLES = ['principal', 'ambiente', 'detalle']
const ROL_ETIQUETA = { principal: 'Principal', ambiente: 'En ambiente', detalle: 'Detalle' }

const CAMPOS_INICIALES = {
  artista_id: '', tecnica: '', soporte: '', alto: '', ancho: '', diametro: '', precio: '',
  anio: String(new Date().getFullYear()), tipoExistencias: 'unica', edicion_total: '', existencias: '1',
  categorias: [], notas: '', nombre: '', estilo: '', descripcion: '', publicacion: '', espacios: [],
  destacada: false, usarPortada: false,
}

export default function SubirObraIA() {
  const navigate = useNavigate()
  const [fotos, setFotos] = useState([])            // [{url, img, encuadre}]
  const [campos, setCampos] = useState(CAMPOS_INICIALES)
  const [ajustes, setAjustes] = useState({})
  const [trabajo, setTrabajo] = useState(null)       // {id, estado}
  const [estado, setEstado] = useState({ texto: '', tipo: '' })
  const [subiendo, setSubiendo] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [hueco, setHueco] = useState(null)
  const [artistas, setArtistas] = useState([])
  const [categorias, setCategorias] = useState([])
  const [logo, setLogo] = useState(null)
  const [restaurado, setRestaurado] = useState(false)
  const canvasRef = useRef(null)
  const esperando = useRef(false)
  const montado = useRef(true)

  const aviso = (texto, tipo = '') => setEstado({ texto, tipo })
  const cambiar = (c, v) => setCampos(f => ({ ...f, [c]: v }))
  const artista = artistas.find(a => a.id === campos.artista_id)
  const circular = /circular|redond/i.test(campos.soporte)
  const medidas = medidasTexto({ alto_cm: circular ? null : numero(campos.alto), ancho_cm: circular ? null : numero(campos.ancho), diametro_cm: circular ? numero(campos.diametro) : null })
  const datosFicha = useMemo(() => ({
    nombre: campos.nombre, artista: artista?.nombre, tecnica: campos.tecnica, soporte: campos.soporte,
    anio: campos.anio, medidas, estilo: campos.estilo, descripcion: campos.descripcion, precio: campos.precio,
  }), [campos, artista, medidas])

  // ── Carga inicial: artistas, colecciones, logo y borrador ──
  useEffect(() => {
    montado.current = true
    supabase.from('artistas').select('id, nombre').order('nombre').then(({ data }) => setArtistas(data || []))
    supabase.from('categorias').select('*').order('nombre').then(({ data }) => setCategorias(data || []))
    cargarImagen(`${import.meta.env.BASE_URL}logo-entre-tu-arte.jpg`).then(setLogo).catch(() => {})
    leerBorrador().then(async b => {
      if (b?.fotos?.length) {
        const recuperadas = await Promise.all(b.fotos.map(async f => ({ ...f, img: await cargarImagen(f.url).catch(() => null) })))
        setFotos(recuperadas.filter(f => f.img))
        setCampos({ ...CAMPOS_INICIALES, ...(b.campos || {}) })
        setAjustes(b.ajustes || {})
        setTrabajo(b.trabajo || null)
        aviso('Retomamos la obra que estabas preparando.')
      } else {
        try { setCampos(f => ({ ...f, artista_id: localStorage.getItem('eta_ultimo_artista') || '', soporte: localStorage.getItem('eta_ultimo_soporte') || '' })) } catch { /* modo privado */ }
      }
      setRestaurado(true)
    })
    return () => { montado.current = false }
  }, [])

  // Guardar borrador al cambiar algo
  useEffect(() => {
    if (!restaurado) return
    const t = setTimeout(() => {
      if (!fotos.length) return
      guardarBorrador({ fotos: fotos.map(f => ({ url: f.url, encuadre: f.encuadre })), campos, ajustes, trabajo })
    }, 600)
    return () => clearTimeout(t)
  }, [fotos, campos, ajustes, trabajo, restaurado])

  // Redibujar la ficha
  const dibujar = useCallback(() => {
    if (canvasRef.current && fotos.length) dibujarFicha(canvasRef.current, { fotos, ajustes, datos: datosFicha, logo })
  }, [fotos, ajustes, datosFicha, logo])
  useEffect(() => { dibujar() }, [dibujar])
  useEffect(() => { document.fonts?.ready.then(dibujar) }, [dibujar])

  // ── IA ──
  const aplicarResultado = useCallback((r) => {
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
    if (Object.keys(cajas).length) {
      setAjustes({})
      setFotos(fs => fs.map((f, i) => cajas[i] ? { ...f, encuadre: cajas[i] } : f))
    }
  }, [categorias])

  const esperar = useCallback(async (t) => {
    if (esperando.current) return
    esperando.current = true
    aviso('La IA está trabajando en segundo plano. Puedes salir de esta página y volver: aquí estará tu ficha.')
    try {
      const r = await esperarTrabajoIA(t.id, leerClaveIA(), { onAviso: aviso, cancelado: () => !montado.current })
      if (!r || !montado.current) return
      aplicarResultado(r)
      setTrabajo({ id: t.id, estado: 'listo' })
      aviso('¡Listo! Revisa y ajusta los textos antes de publicar.', 'ok')
      try { if (document.hidden && Notification.permission === 'granted') new Notification('Entre tu Arte', { body: 'Tu ficha está lista.' }) } catch { /* sin notificaciones */ }
    } catch (err) {
      setTrabajo(null)
      aviso('Error: ' + err.message, 'error')
    } finally { esperando.current = false }
  }, [aplicarResultado])

  useEffect(() => { if (restaurado && trabajo?.estado === 'pendiente') esperar(trabajo) }, [restaurado]) // eslint-disable-line react-hooks/exhaustive-deps

  async function generar() {
    if (!fotos.length) { aviso('Primero sube al menos una foto de la obra.', 'error'); return }
    let clave = leerClaveIA()
    if (!clave) {
      clave = (window.prompt('Escribe la clave de acceso de la IA (solo se pide una vez en este dispositivo):') || '').trim()
      if (!clave) return
      guardarClaveIA(clave)
    }
    try { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission() } catch { /* sin notificaciones */ }
    aviso('Enviando a la IA…')
    try {
      const datos = [['artista', artista?.nombre], ['tecnica', campos.tecnica], ['soporte', campos.soporte], ['medidas', medidas]]
        .filter(d => d[1]).map(([k, v]) => `${k}: ${v}`)
      const notas = [campos.notas, ...datos].filter(Boolean).join('\n')
      const id = await iniciarTrabajoIA({ urls: fotos.map(f => f.url), notas, clave })
      const t = { id, estado: 'pendiente' }
      setTrabajo(t)
      esperar(t)
    } catch (err) { aviso('Error: ' + err.message, 'error') }
  }

  // ── Fotos ──
  async function agregarFotos(e) {
    const archivos = Array.from(e.target.files || [])
    e.target.value = ''
    if (!archivos.length) return
    const libres = 3 - fotos.length
    if (libres <= 0) { aviso('Ya hay 3 fotos. Quita una para agregar otra.', 'error'); return }
    setSubiendo(true)
    try {
      const nuevas = []
      for (const [n, a] of archivos.slice(0, libres).entries()) {
        aviso(`Subiendo foto ${n + 1} de ${Math.min(archivos.length, libres)}…`)
        const reducido = await reducirImagen(a, 2000)
        const url = await subirArchivo('obras', reducido)
        const img = await cargarImagen(URL.createObjectURL(reducido))
        nuevas.push({ url, img, encuadre: null })
      }
      setFotos(fs => [...fs, ...nuevas])
      aviso(archivos.length > libres ? `Solo se usaron ${libres} foto(s): máximo 3.` : '')
    } catch (err) {
      aviso('No se pudo subir la foto: ' + (err.message || err), 'error')
    } finally { setSubiendo(false) }
  }

  function quitarFoto(i) { setFotos(fs => fs.filter((_, n) => n !== i)); setAjustes({}) }
  function moverAntes(i) { setFotos(fs => { const c = [...fs]; [c[i - 1], c[i]] = [c[i], c[i - 1]]; return c }); setAjustes({}) }

  // ── Gestos sobre la ficha: tocar una foto para moverla (arrastrar) o acercarla (pellizcar) ──
  const punteros = useRef(new Map())
  const distancia = useRef(null)
  const puntoLienzo = ev => {
    const r = canvasRef.current.getBoundingClientRect()
    return { x: (ev.clientX - r.left) * ANCHO / r.width, y: (ev.clientY - r.top) * ALTO / r.height }
  }
  function onPointerDown(ev) {
    if (!fotos.length) return
    const pt = puntoLienzo(ev)
    const h = huecoEn(pt)
    if (!hueco || (punteros.current.size === 0 && h !== hueco)) { setHueco(h); return }
    canvasRef.current.setPointerCapture(ev.pointerId)
    punteros.current.set(ev.pointerId, pt)
    distancia.current = null
    ev.preventDefault()
  }
  function onPointerMove(ev) {
    if (!hueco || !punteros.current.has(ev.pointerId)) return
    const pt = puntoLienzo(ev)
    const previo = punteros.current.get(ev.pointerId)
    punteros.current.set(ev.pointerId, pt)
    const r = HUECOS[hueco]
    setAjustes(a => {
      const aj = { dx: 0, dy: 0, z: 1, ...a[hueco] }
      if (punteros.current.size === 1) {
        aj.dx += (pt.x - previo.x) / (r.w * aj.z)
        aj.dy += (pt.y - previo.y) / (r.h * aj.z)
      } else if (punteros.current.size === 2) {
        const [p1, p2] = [...punteros.current.values()]
        const d = Math.hypot(p1.x - p2.x, p1.y - p2.y)
        if (distancia.current) aj.z = Math.min(3, Math.max(0.5, aj.z * d / distancia.current))
        distancia.current = d
      }
      return { ...a, [hueco]: aj }
    })
    ev.preventDefault()
  }
  const onPointerUp = ev => { punteros.current.delete(ev.pointerId); distancia.current = null }

  // ── Descargar ficha y copiar texto ──
  function descargarFicha() {
    setHueco(null)
    dibujar()
    canvasRef.current.toBlob(blob => {
      const nombre = 'entre-tu-arte-' + (campos.nombre || 'obra').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-') + '.jpg'
      const archivo = new File([blob], nombre, { type: 'image/jpeg' })
      const movil = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      if (movil && navigator.canShare?.({ files: [archivo] })) { navigator.share({ files: [archivo] }).catch(() => {}); return }
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = nombre; a.click()
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    }, 'image/jpeg', 0.92)
  }
  async function copiarTexto() {
    try { await navigator.clipboard.writeText(campos.publicacion); toast.success('Texto copiado. Pégalo en Instagram o Facebook.') }
    catch { toast.error('No se pudo copiar automáticamente') }
  }

  // ── Guardar ──
  async function guardar(estadoObra) {
    if (!fotos.length) { aviso('Sube al menos una foto.', 'error'); return }
    if (estadoObra === 'disponible' && !campos.nombre.trim()) { aviso('La obra necesita un nombre antes de publicarse.', 'error'); return }
    setGuardando(true)
    try {
      setHueco(null); dibujar()
      const blob = await new Promise(ok => canvasRef.current.toBlob(ok, 'image/jpeg', 0.92))
      const fichaUrl = await subirArchivo('fichas', new File([blob], 'ficha.jpg', { type: 'image/jpeg' }))
      const edicion = campos.tipoExistencias === 'edicion'
      const registro = {
        titulo: campos.nombre.trim() || null,
        descripcion: campos.descripcion.trim() || null,
        estilo: campos.estilo.trim() || null,
        tecnica: campos.tecnica.trim() || null,
        soporte: campos.soporte.trim() || null,
        alto_cm: circular ? null : numero(campos.alto),
        ancho_cm: circular ? null : numero(campos.ancho),
        diametro_cm: circular ? numero(campos.diametro) : null,
        medidas: medidas || null,
        precio: numero(campos.precio),
        anio: parseInt(campos.anio, 10) || null,
        existencias: edicion ? Math.max(0, parseInt(campos.existencias, 10) || 0) : 1,
        edicion_total: edicion ? (parseInt(campos.edicion_total, 10) || null) : null,
        artista_id: campos.artista_id || null,
        artista_nombre: artista?.nombre || null,
        fotos: fotos.map((f, i) => ({ url: f.url, rol: ROLES[i] })),
        imagen_url: fotos[0].url,
        ficha_url: fichaUrl,
        publicacion: campos.publicacion || null,
        espacios: campos.espacios || [],
        categorias: campos.categorias,
        estado: estadoObra,
        destacada: estadoObra === 'disponible' && campos.destacada,
      }
      const { data, error } = await supabase.from('fichas').insert(registro).select('id').single()
      if (error) throw error
      if (campos.usarPortada && estadoObra === 'disponible') {
        await supabase.from('portadas').insert({
          imagen_url: (fotos[1] || fotos[0]).url, imagen_movil_url: fotos[0].url,
          titular: campos.nombre.trim(), subtitulo: [artista?.nombre, medidas].filter(Boolean).join(' · ') || null,
          boton_texto: 'Ver la obra', boton_enlace: `/obra/${data.id}`, ficha_id: String(data.id), orden: 0, activa: true,
        })
      }
      try { localStorage.setItem('eta_ultimo_artista', campos.artista_id); localStorage.setItem('eta_ultimo_soporte', campos.soporte) } catch { /* modo privado */ }
      await borrarBorrador()
      toast.success(estadoObra === 'disponible' ? '¡Obra publicada!' : 'Guardada como borrador')
      navigate('/admin/obras')
    } catch (err) {
      aviso('Error al guardar: ' + (err.message || err), 'error')
    } finally { setGuardando(false) }
  }

  async function empezarOtra() {
    if (fotos.length && !window.confirm('¿Descartar esta obra y empezar otra?')) return
    await borrarBorrador()
    setFotos([]); setAjustes({}); setTrabajo(null); setHueco(null)
    setCampos(f => ({ ...CAMPOS_INICIALES, artista_id: f.artista_id, soporte: f.soporte }))
    aviso('')
  }

  const generado = trabajo?.estado === 'listo' || !!campos.descripcion
  const pendiente = trabajo?.estado === 'pendiente'
  const pasoCss = on => on ? 'bg-tinta text-white' : 'bg-white text-gris'

  return (
    <>
      <EncabezadoAdmin ruta="Obras › Nueva obra" titulo="Subir obra con IA">
        <ol aria-label="Pasos" className="flex flex-wrap gap-2 text-[13px] font-bold">
          <li className={`rounded-full px-4 py-2.5 ${pasoCss(fotos.length > 0)}`}>1 · Fotos</li>
          <li className={`rounded-full px-4 py-2.5 ${pasoCss(!!campos.precio || !!campos.tecnica)}`}>2 · Datos</li>
          <li className={`rounded-full px-4 py-2.5 ${pasoCss(generado)}`}>3 · Textos con IA</li>
          <li className={`rounded-full px-4 py-2.5 ${pasoCss(false)}`}>4 · Publicar</li>
        </ol>
      </EncabezadoAdmin>

      {estado.texto && (
        <p role="status" className={`mb-4 rounded-2xl px-5 py-3.5 text-sm font-semibold ${estado.tipo === 'error' ? 'bg-red-50 text-red-800' : estado.tipo === 'ok' ? 'bg-green-50 text-green-800' : 'bg-mostaza-fondo text-tinta'}`}>{estado.texto}</p>
      )}

      <div className="flex flex-wrap items-start gap-5">
        <div className="flex min-w-0 flex-[1.25_1_520px] flex-col gap-5">
          {/* 1. Fotos */}
          <section className="rounded-[28px] bg-white p-5 md:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-bold">1. Fotos de la obra</h2>
              <span className="text-[13px] text-gris">Hasta 3: la obra sola, en un ambiente y un detalle</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[0, 1, 2].map(i => {
                const f = fotos[i]
                return f ? (
                  <div key={i} className="flex flex-col gap-2">
                    <div className="relative aspect-square overflow-hidden rounded-[20px] bg-crema">
                      <img src={f.img.src} alt={ROL_ETIQUETA[ROLES[i]]} className="absolute inset-0 h-full w-full object-cover" />
                      <button onClick={() => quitarFoto(i)} aria-label="Quitar foto" className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/95"><X size={16} /></button>
                      {i > 0 && <button onClick={() => moverAntes(i)} aria-label="Mover antes" className="absolute left-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/95"><ChevronLeft size={18} /></button>}
                      {i === 0 && <span className="absolute bottom-2 left-2 rounded-full bg-mostaza px-2.5 py-1 text-[11px] font-bold">Principal</span>}
                    </div>
                    <span className="text-[13px] font-semibold">{ROL_ETIQUETA[ROLES[i]]}</span>
                  </div>
                ) : (
                  <label key={i} className={`flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-[20px] border-2 border-dashed border-crema-borde bg-crema-clara text-center text-[13px] font-semibold text-gris ${i > fotos.length ? 'opacity-40' : ''}`}>
                    <ImagePlus size={24} />{subiendo && i === fotos.length ? 'Subiendo…' : ROL_ETIQUETA[ROLES[i]]}
                    <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={subiendo || i > fotos.length} onChange={agregarFotos} className="sr-only" />
                  </label>
                )
              })}
            </div>
          </section>

          {/* 2. Datos */}
          <section className="rounded-[28px] bg-white p-5 md:p-6">
            <h2 className="text-lg font-bold">2. Datos de la obra</h2>
            <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
              <label className="etiqueta">Artista
                <select value={campos.artista_id} onChange={e => cambiar('artista_id', e.target.value)} className="campo mt-1.5">
                  <option value="">Elegir artista…</option>
                  {artistas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                </select>
                {!artistas.length && <span className="mt-1 block text-xs font-normal text-gris">Agrega artistas en Admin › Artistas.</span>}
              </label>
              <SelectorAnio valor={campos.anio} onChange={v => cambiar('anio', v)} />
              <div className="sm:col-span-2"><SelectorOpciones etiqueta="Técnica" tipo="tecnicas" valor={campos.tecnica} onChange={v => cambiar('tecnica', v)} /></div>
              <div className="sm:col-span-2"><SelectorOpciones etiqueta="Soporte" tipo="soportes" valor={campos.soporte} onChange={v => cambiar('soporte', v)} /></div>
              {circular ? (
                <label className="etiqueta">Diámetro (cm)<input inputMode="decimal" value={campos.diametro} onChange={e => cambiar('diametro', e.target.value)} className="campo mt-1.5" /></label>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <label className="etiqueta">Alto (cm)<input inputMode="decimal" value={campos.alto} onChange={e => cambiar('alto', e.target.value)} className="campo mt-1.5" /></label>
                  <label className="etiqueta">Ancho (cm)<input inputMode="decimal" value={campos.ancho} onChange={e => cambiar('ancho', e.target.value)} className="campo mt-1.5" /></label>
                </div>
              )}
              <label className="etiqueta">Precio (USD)<input inputMode="decimal" value={campos.precio} onChange={e => cambiar('precio', e.target.value)} placeholder="185.00" className="campo mt-1.5" /></label>
              <label className="etiqueta">Existencias
                <select value={campos.tipoExistencias} onChange={e => cambiar('tipoExistencias', e.target.value)} className="campo mt-1.5">
                  <option value="unica">Pieza única (1)</option>
                  <option value="edicion">Edición limitada</option>
                </select>
              </label>
              {campos.tipoExistencias === 'edicion' && (
                <div className="grid grid-cols-2 gap-2">
                  <label className="etiqueta">Total de la edición<input inputMode="numeric" value={campos.edicion_total} onChange={e => cambiar('edicion_total', e.target.value)} className="campo mt-1.5" /></label>
                  <label className="etiqueta">Disponibles<input inputMode="numeric" value={campos.existencias} onChange={e => cambiar('existencias', e.target.value)} className="campo mt-1.5" /></label>
                </div>
              )}
            </div>
            {categorias.length > 0 && (
              <fieldset className="mt-4">
                <legend className="etiqueta mb-2">Colecciones</legend>
                <div className="flex flex-wrap gap-2">
                  {categorias.map(c => {
                    const on = campos.categorias.includes(c.nombre)
                    return <button type="button" key={c.id} aria-pressed={on} onClick={() => cambiar('categorias', on ? campos.categorias.filter(x => x !== c.nombre) : [...campos.categorias, c.nombre])} className={`chip ${on ? 'chip-on' : 'chip-off'}`}>{c.nombre}</button>
                  })}
                </div>
              </fieldset>
            )}
            <label className="etiqueta mt-4">Notas para la IA (opcional)
              <textarea rows={2} value={campos.notas} onChange={e => cambiar('notas', e.target.value)} placeholder="Ej: inspirada en el atardecer de El Tunco, tonos tierra" className="campo mt-1.5" />
            </label>
            <button onClick={generar} disabled={pendiente || subiendo || !fotos.length} className="btn-oscuro mt-5 h-[60px] w-full">
              <Sparkles size={20} className="text-mostaza" />{pendiente ? 'La IA está trabajando…' : generado ? 'Volver a generar con IA' : 'Generar nombre, estilo y descripción con IA'}
            </button>
          </section>

          {/* 3. Textos */}
          {(generado || pendiente) && (
            <section className="rounded-[28px] border-2 border-mostaza bg-white p-5 md:p-6">
              <h2 className="flex items-center gap-2.5 text-lg font-bold"><Sparkles size={20} className="text-mostaza" />3. Textos generados con IA</h2>
              <p className="mt-1 text-[13px] text-gris">Puedes editar todo antes de publicar.</p>
              <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
                <label className="etiqueta">Nombre de la obra<input value={campos.nombre} onChange={e => cambiar('nombre', e.target.value)} className="campo mt-1.5 font-semibold" /></label>
                <div className="sm:col-span-2"><SelectorOpciones etiqueta="Estilo" tipo="estilos" valor={campos.estilo} onChange={v => cambiar('estilo', v)} /></div>
              </div>
              <label className="etiqueta mt-3.5">Descripción<textarea rows={3} value={campos.descripcion} onChange={e => cambiar('descripcion', e.target.value)} className="campo mt-1.5" /></label>
              {campos.espacios.length > 0 && (
                <p className="mt-3.5 flex flex-wrap items-center gap-2 text-[13px] font-semibold">Luce mejor en: {campos.espacios.map(e => <span key={e} className="rounded-full bg-mostaza-clara px-3 py-1.5">{e}</span>)}</p>
              )}
              <label className="etiqueta mt-3.5">Texto para Instagram y Facebook<textarea rows={6} value={campos.publicacion} onChange={e => cambiar('publicacion', e.target.value)} className="campo mt-1.5 text-sm" /></label>
              <button onClick={copiarTexto} disabled={!campos.publicacion} className="btn-contorno btn-chico mt-3"><Copy size={16} />Copiar texto</button>
            </section>
          )}
        </div>

        <div className="flex min-w-0 flex-[1_1_340px] flex-col gap-5">
          <section className="rounded-[28px] bg-white p-5">
            <div className="flex items-center justify-between"><h2 className="text-[17px] font-bold">Ficha para redes</h2><span className="text-xs text-gris">1080 × 1350</span></div>
            {fotos.length ? (
              <>
                <div className="relative mt-3.5 overflow-hidden rounded-2xl border border-[#efebe4]">
                  <canvas ref={canvasRef} width={ANCHO} height={ALTO} className="block w-full" style={{ touchAction: hueco ? 'none' : 'auto' }}
                    onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} />
                  {hueco && <span aria-hidden="true" className="pointer-events-none absolute border-2 border-mostaza shadow-[0_0_0_9999px_rgba(23,22,20,0.25)]"
                    style={{ left: `${HUECOS[hueco].x / ANCHO * 100}%`, top: `${HUECOS[hueco].y / ALTO * 100}%`, width: `${HUECOS[hueco].w / ANCHO * 100}%`, height: `${HUECOS[hueco].h / ALTO * 100}%` }} />}
                </div>
                <p className="mt-3 text-center text-xs text-gris">{hueco ? 'Arrastra para mover · pellizca o usa la barra para acercar.' : 'Toca una foto de la ficha para moverla o acercarla.'}</p>
                {hueco && (
                  <div className="mt-2 flex items-center gap-3">
                    <label className="flex-1 text-xs font-semibold">Zoom
                      <input type="range" min="0.5" max="3" step="0.01" value={ajustes[hueco]?.z || 1} onChange={e => setAjustes(a => ({ ...a, [hueco]: { dx: 0, dy: 0, ...a[hueco], z: parseFloat(e.target.value) } }))} className="w-full accent-[#17181b]" />
                    </label>
                    <button onClick={() => setAjustes(a => { const c = { ...a }; delete c[hueco]; return c })} className="btn-contorno btn-chico"><RotateCcw size={15} />Restablecer</button>
                    <button onClick={() => setHueco(null)} aria-label="Listo" className="btn-oscuro btn-chico"><Check size={16} /></button>
                  </div>
                )}
                <button onClick={descargarFicha} className="btn-contorno mt-3 h-12 w-full text-sm"><Download size={17} />Descargar ficha</button>
              </>
            ) : <p className="mt-4 rounded-2xl bg-crema-clara p-8 text-center text-sm text-gris">Sube las fotos para ver la ficha.</p>}
          </section>

          <section className="rounded-[28px] bg-white p-5">
            <h2 className="mb-2 text-[17px] font-bold">4. Dónde se muestra</h2>
            {[
              ['destacada', 'Destacar en el banner', 'Aparece en "Obras de la semana" del inicio'],
              ['usarPortada', 'Usar como portada', 'Entra en la rotación de la portada del sitio'],
            ].map(([c, t, d]) => (
              <button key={c} type="button" role="switch" aria-checked={campos[c]} onClick={() => cambiar(c, !campos[c])}
                className="flex min-h-[60px] w-full items-center justify-between gap-3 border-t border-[#efebe4] py-2 text-left">
                <span><span className="block text-sm font-bold">{t}</span><span className="block text-xs text-gris">{d}</span></span>
                <span aria-hidden="true" className={`flex h-[30px] w-[50px] shrink-0 rounded-full p-[3px] transition ${campos[c] ? 'justify-end bg-tinta' : 'justify-start bg-[#d9d4cb]'}`}><span className="h-6 w-6 rounded-full bg-white shadow" /></span>
              </button>
            ))}
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <button onClick={() => guardar('borrador')} disabled={guardando || !fotos.length} className="btn-contorno h-[52px] px-3 text-sm">Guardar borrador</button>
              <button onClick={() => guardar('disponible')} disabled={guardando || !fotos.length || pendiente} className="btn-primario h-[52px] px-3 text-sm">{guardando ? 'Guardando…' : 'Publicar obra'}</button>
            </div>
            <button onClick={empezarOtra} className="mt-3 w-full text-sm font-semibold text-gris underline">Empezar otra obra</button>
          </section>
        </div>
      </div>
    </>
  )
}
