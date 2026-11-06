import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckCircle2, Camera, Paperclip, Search, Trash2, ShieldCheck, Clock, Heart, AlertTriangle, Loader2 } from 'lucide-react'
import { useNoIndexar } from '../../auth/RutaAdmin.jsx'
import { portal, enviarCarta, subirArchivo, tipoDeArchivo, firmaValida } from '../cartasService.js'
import { ACEPTA, mensajeError, folioTexto, fecha, rangoFechas, tamanoTexto } from '../constantes.js'
import { Marca, serif, useTituloCartas } from './marca.jsx'
import { ChipsRelacion } from '../ui.jsx'

const claveBorrador = c => `cca_borrador_${c}`
const leerBorrador = c => { try { return JSON.parse(localStorage.getItem(claveBorrador(c)) || 'null') } catch { return null } }
const guardarBorrador = (c, v) => { try { v ? localStorage.setItem(claveBorrador(c), JSON.stringify(v)) : localStorage.removeItem(claveBorrador(c)) } catch { /* sin almacenamiento */ } }

export default function EnviarCarta() {
  const [params] = useSearchParams()
  const codigo = params.get('c') || ''
  const tokenPareja = params.get('p') || ''
  const tokenRemitente = params.get('r') || ''
  useNoIndexar()
  useTituloCartas('Envía tu carta')

  const [info, setInfo] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)
  const [enviado, setEnviado] = useState(null)

  useEffect(() => {
    if (!codigo) { setInfo({ estado: 'no_disponible' }); return }
    portal(codigo, tokenPareja, tokenRemitente).then(setInfo).catch(e => setErrorCarga(mensajeError(e)))
  }, [codigo, tokenPareja, tokenRemitente])

  return (
    <div className="min-h-screen bg-[#f7f1ec]">
      <header className="bg-vino px-5 pb-16 pt-6 text-white">
        <div className="mx-auto max-w-xl">
          <Marca claro />
          {info?.nombre && (
            <div className="mt-7">
              <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-white/70">{info.nombre}</p>
              <h1 style={serif} className="mt-1 text-[34px] font-semibold leading-tight">Envía una carta que llegue al corazón</h1>
              {(info.inicio || info.lugar) && <p className="mt-2 text-sm text-white/80">{[rangoFechas(info.inicio, info.fin), info.lugar].filter(Boolean).join(' · ')}</p>}
              {info.estado === 'abierto' && info.fecha_limite && !info.tardio && <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-[13px]"><Clock size={14} className="shrink-0" /><span>Recibimos cartas hasta el <b>{fecha(info.fecha_limite, true)}</b></span></p>}
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto -mt-10 max-w-xl px-4 pb-16">
        {errorCarga && <Aviso icono={AlertTriangle} titulo="No pudimos abrir el formulario">{errorCarga} <button onClick={() => window.location.reload()} className="font-semibold underline">Reintentar</button></Aviso>}
        {!info && !errorCarga && <div className="flex justify-center rounded-[28px] bg-white p-10"><Loader2 className="animate-spin text-vino" /></div>}
        {info?.estado === 'no_disponible' && <Aviso icono={AlertTriangle} titulo="Este enlace no está disponible">Puede que el retiro aún no abra la recepción de cartas o que el enlace esté incompleto. Consulta con la persona que te lo compartió.</Aviso>}
        {info?.estado === 'cerrado' && <Aviso icono={Clock} titulo="La recepción de cartas ya cerró">La fecha límite era el {fecha(info.fecha_limite, true)}. Si aún deseas enviar tu carta, comunícate con el equipo organizador.</Aviso>}
        {info?.estado === 'abierto' && !enviado && <Formulario info={info} codigo={codigo} tokenRemitente={tokenRemitente} onEnviado={setEnviado} />}
        {enviado && <Confirmacion resultado={enviado} info={info} contacto={!!info.remitente?.coordinador} onOtra={() => { setEnviado(null); window.scrollTo(0, 0) }} />}

        <p className="mt-8 text-center text-xs text-gris">Tu carta es privada: solo el equipo organizador la resguarda hasta entregarla durante el retiro.</p>
      </main>
    </div>
  )
}

function Aviso({ icono: Icono, titulo, children }) {
  return (
    <div className="rounded-[28px] bg-white p-7 text-center shadow-sm">
      <Icono className="mx-auto text-vino" size={34} strokeWidth={1.6} />
      <h2 className="mt-3 text-xl font-semibold">{titulo}</h2>
      <p className="mt-2 text-[15px] leading-relaxed text-gris">{children}</p>
    </div>
  )
}

function Formulario({ info, codigo, tokenRemitente, onEnviado }) {
  const rem = info.remitente
  // Un contacto de la familia sube cartas escritas por otras personas: no se prellena su nombre
  const esContacto = !!rem?.coordinador
  const borrador = useMemo(() => leerBorrador(codigo), [codigo])
  const unica = info.parejas.length === 1 ? info.parejas[0] : null
  const [parejaId, setParejaId] = useState(rem?.pareja_id || unica?.id || borrador?.parejaId || '')
  const [destinatario, setDestinatario] = useState((!esContacto && rem?.destinatario) || borrador?.destinatario || '')
  const [nombre, setNombre] = useState((!esContacto && rem?.nombre) || borrador?.nombre || '')
  const [relacion, setRelacion] = useState((!esContacto && rem?.relacion) || borrador?.relacion || '')
  const [contacto, setContacto] = useState(borrador?.contacto || '')
  const [archivos, setArchivos] = useState([])
  const [acepto, setAcepto] = useState(false)
  const [trampa, setTrampa] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState(null)        // texto de progreso
  const [error, setError] = useState('')
  const inputArchivo = useRef(null)
  const inputCamara = useRef(null)

  const pareja = info.parejas.find(p => p.id === parejaId)
  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    if (!q) return info.parejas
    return info.parejas.filter(p => `${p.a} ${p.b} ${p.na} ${p.nb} ${p.apellidos || ''}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(q))
  }, [busqueda, info.parejas])

  // Borrador local: si se cae la conexión o se cierra la pestaña, no se pierde lo escrito
  useEffect(() => {
    const t = setTimeout(() => guardarBorrador(codigo, { parejaId, destinatario, nombre, relacion, contacto }), 600)
    return () => clearTimeout(t)
  }, [codigo, parejaId, destinatario, nombre, relacion, contacto])

  async function agregarArchivos(lista) {
    setError('')
    const nuevos = []
    for (const file of lista) {
      const tipo = tipoDeArchivo(file)
      if (!tipo) { setError(`«${file.name}» no es un formato aceptado. Usa PDF, Word (DOCX), JPG o PNG.`); continue }
      if (!(await firmaValida(file, tipo))) { setError(`«${file.name}» parece dañado o no es realmente ${tipo.split('/')[1].toUpperCase()}.`); continue }
      // Las fotos grandes se reducen al subir; los demás archivos deben respetar el límite
      if (!tipo.startsWith('image/') && file.size > info.max_mb * 1024 * 1024) { setError(`«${file.name}» pesa ${tamanoTexto(file.size)}; el máximo es ${info.max_mb} MB.`); continue }
      if (tipo.startsWith('image/') && file.size > 40 * 1024 * 1024) { setError(`La foto «${file.name}» es demasiado grande.`); continue }
      nuevos.push(file)
    }
    setArchivos(a => {
      const todos = [...a, ...nuevos]
      if (todos.length > info.max_archivos) setError(`Puedes adjuntar hasta ${info.max_archivos} archivos.`)
      return todos.slice(0, info.max_archivos)
    })
    if (inputArchivo.current) inputArchivo.current.value = ''
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    if (!pareja) return setError('Elige a quién va dirigida tu carta.')
    if (!destinatario) return setError('Indica si la carta es para uno de ellos o para ambos.')
    if (!relacion.trim()) return setError('Elige quién envía la carta (papá, mamá, hermano…).')
    if (!esContacto && nombre.trim().length < 2) return setError('Escribe tu nombre.')
    if (!archivos.length) return setError('Adjunta la foto o el archivo de tu carta.')
    if (!acepto) return setError('Debes aceptar el aviso de privacidad.')
    try {
      const subidos = []
      for (let i = 0; i < archivos.length; i++) {
        setEstado(`Subiendo archivo ${i + 1} de ${archivos.length}…`)
        const s = await subirArchivo(archivos[i])
        if (s.tamano > info.max_mb * 1024 * 1024) throw new Error('cca:archivo_grande')
        subidos.push({ ruta: s.ruta, nombre: s.nombre, hash: s.hash })
      }
      setEstado('Enviando tu carta…')
      const r = await enviarCarta({
        p_codigo: codigo, p_pareja: pareja.id, p_destinatario: destinatario, p_nombre: nombre.trim() || relacion.trim(),
        p_relacion: relacion.trim() || null, p_contacto: contacto.trim() || null, p_texto: null,
        p_archivos: subidos, p_remitente_token: tokenRemitente || null, p_consentimiento: acepto, p_trampa: trampa || null,
      })
      guardarBorrador(codigo, null)
      onEnviado({ ...r, para: destinatario === 'ambos' ? `${pareja.a} y ${pareja.b} ${pareja.apellidos || ''}`.trim() : destinatario === 'A' ? pareja.na : pareja.nb })
      window.scrollTo(0, 0)
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setEstado(null)
    }
  }

  const enviando = !!estado
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {info.tardio && <div className="flex gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900"><Clock size={18} className="mt-0.5 shrink-0" />La fecha límite ya pasó, pero aún recibimos tu carta. Haremos lo posible por incluirla.</div>}
      {info.mensaje && <div className="whitespace-pre-line rounded-[24px] bg-white p-5 text-[15px] leading-relaxed text-gris shadow-sm">{info.mensaje}</div>}

      <Paso n="1" titulo="¿Para quién es tu carta?">
        {!rem && !unica && (
          <>
            {info.parejas.length > 6 && (
              <label className="relative mb-3 block">
                <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-gris" />
                <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Busca por nombre" className="campo pl-11" aria-label="Buscar pareja" />
              </label>
            )}
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1" role="radiogroup" aria-label="Pareja">
              {filtradas.map(p => (
                <button type="button" key={p.id} role="radio" aria-checked={parejaId === p.id} onClick={() => { setParejaId(p.id); setDestinatario('') }}
                  className={`flex min-h-[52px] w-full items-center gap-3 rounded-2xl border px-4 py-2.5 text-left text-[15px] transition ${parejaId === p.id ? 'border-vino bg-vino-claro font-semibold text-vino' : 'border-crema-borde bg-white hover:border-vino/50'}`}>
                  <Heart size={16} className={`shrink-0 ${parejaId === p.id ? 'fill-vino' : 'text-gris'}`} />
                  <span>{p.a} y {p.b} {p.apellidos}<span className="block text-xs font-normal text-gris">{p.na} · {p.nb}</span></span>
                </button>
              ))}
              {!filtradas.length && <p className="px-1 py-3 text-sm text-gris">No encontramos ese nombre. Revisa cómo lo escribiste o pide a quien te compartió el enlace el enlace directo.</p>}
            </div>
          </>
        )}
        {pareja && (
          <div className={!rem && !unica ? 'mt-4' : ''}>
            {(rem || unica) && <p className="mb-3 text-[15px]">Para el encuentro de <b>{pareja.a} y {pareja.b} {pareja.apellidos}</b></p>}
            <p className="etiqueta mb-2">La carta es para</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {[['A', pareja.a, pareja.na], ['B', pareja.b, pareja.nb], ['ambos', 'Ambos', 'Para los dos']].map(([v, t, sub]) => (
                <button type="button" key={v} onClick={() => setDestinatario(v)} aria-pressed={destinatario === v}
                  className={`min-h-[52px] rounded-[20px] border px-4 py-1.5 text-[15px] font-semibold leading-tight transition ${destinatario === v ? 'border-vino bg-vino text-white' : 'border-crema-borde bg-white hover:border-vino/60'}`}>
                  {t}<span className={`block truncate text-[11px] font-normal ${destinatario === v ? 'text-white/80' : 'text-gris'}`}>{sub}</span></button>
              ))}
            </div>
          </div>
        )}
      </Paso>

      <Paso n="2" titulo="¿Quién envía la carta?">
        {esContacto && <p className="mb-3 rounded-2xl bg-vino-claro p-3 text-sm text-vino">Hola {rem.nombre.split(' ')[0]}, gracias por reunir las cartas. Sube <b>una carta a la vez</b> y elige quién la envía.</p>}
        <p className="etiqueta mb-2">{esContacto ? 'Quien escribe esta carta es su… *' : 'Soy su… *'}</p>
        <ChipsRelacion valor={relacion} onCambio={setRelacion} />
        <label className="etiqueta mt-4">{esContacto ? 'Nombre de quien la escribe' : 'Tu nombre *'} {esContacto && <span className="font-normal text-gris">(opcional)</span>}
          <input value={nombre} onChange={e => setNombre(e.target.value)} maxLength={120} autoComplete={esContacto ? 'off' : 'name'} className="campo mt-1.5" />
        </label>
        {!esContacto && <label className="etiqueta mt-3">Teléfono o correo <span className="font-normal text-gris">(opcional, por si necesitamos contactarte)</span>
          <input value={contacto} onChange={e => setContacto(e.target.value)} maxLength={120} autoComplete="tel" className="campo mt-1.5" />
        </label>}
        {/* Campo trampa para robots: las personas no lo ven */}
        <input value={trampa} onChange={e => setTrampa(e.target.value)} name="sitio_web" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />
      </Paso>

      <Paso n="3" titulo="Adjunta tu carta">
        <p className="mb-3 text-sm text-gris">Escríbela a mano o en tu computadora y adjúntala aquí: una <b>foto</b> de la carta, un <b>escaneo</b> o el <b>archivo</b> (PDF o Word). Si tiene varias páginas, adjunta una foto por página.</p>
        <input ref={inputArchivo} type="file" accept={ACEPTA} multiple className="hidden" onChange={e => agregarArchivos([...e.target.files])} />
        <input ref={inputCamara} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { agregarArchivos([...e.target.files]); e.target.value = '' }} />
        <div className="grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={() => inputCamara.current?.click()} disabled={archivos.length >= info.max_archivos}
            className="flex h-14 items-center justify-center gap-2 rounded-full bg-vino font-semibold text-white transition hover:bg-vino-oscuro disabled:opacity-50">
            <Camera size={19} />Tomar foto de la carta
          </button>
          <button type="button" onClick={() => inputArchivo.current?.click()} disabled={archivos.length >= info.max_archivos}
            className="flex h-14 items-center justify-center gap-2 rounded-full border border-vino/50 font-semibold text-vino transition hover:bg-vino-claro disabled:opacity-50">
            <Paperclip size={18} />Elegir archivo
          </button>
        </div>
        <p className="mt-2 text-center text-xs text-gris">PDF, Word (DOCX), JPG o PNG · hasta {info.max_mb} MB · máximo {info.max_archivos}</p>
        {archivos.length > 0 && (
          <ul className="mt-3 space-y-2">
            {archivos.map((f, i) => (
              <li key={i} className="flex items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-2.5 text-sm">
                <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                <span className="min-w-0 flex-1 truncate">{f.name}</span>
                <span className="text-xs text-gris">{tamanoTexto(f.size)}</span>
                <button type="button" onClick={() => setArchivos(a => a.filter((_, j) => j !== i))} aria-label={`Quitar ${f.name}`} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white"><Trash2 size={16} /></button>
              </li>
            ))}
          </ul>
        )}
      </Paso>

      <div className="rounded-[24px] bg-white p-5 shadow-sm">
        <details className="text-sm text-gris">
          <summary className="flex cursor-pointer items-center gap-2 font-semibold text-tinta"><ShieldCheck size={17} className="text-vino" />Aviso de privacidad</summary>
          <div className="mt-3 space-y-2 leading-relaxed">
            <p><b>Finalidad:</b> recibir y resguardar tu carta para entregarla a sus destinatarios durante {info.nombre}. No se publica ni se comparte con nadie más.</p>
            <p><b>Responsable:</b> {info.responsable || 'el equipo organizador del retiro'}. Solo las personas autorizadas del equipo pueden ver las cartas.</p>
            <p><b>Datos:</b> tu nombre, relación, contacto (si lo das) y el archivo de tu carta. Se usan únicamente para este fin.</p>
            <p><b>Conservación:</b> se eliminan o archivan de forma segura {info.retencion_dias} días después del retiro.</p>
            <p><b>Eliminación:</b> puedes pedir que se borre tu carta escribiendo a {info.contacto_privacidad || 'el equipo organizador'} e indicando tu número de recepción.</p>
          </div>
        </details>
        <label className="mt-4 flex cursor-pointer items-start gap-3 text-[15px]">
          <input type="checkbox" checked={acepto} onChange={e => setAcepto(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-[#7a2621]" />
          <span>Acepto el aviso de privacidad y autorizo que mi carta se resguarde para entregarla en el retiro.</span>
        </label>
      </div>

      {error && <p role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}
      <button disabled={enviando} className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-vino text-[16px] font-semibold text-white shadow-lg shadow-vino/20 transition hover:bg-vino-oscuro disabled:opacity-70">
        {enviando ? <><Loader2 size={19} className="animate-spin" />{estado}</> : <><Heart size={18} />Enviar mi carta</>}
      </button>
    </form>
  )
}

function Paso({ n, titulo, children }) {
  return (
    <section className="rounded-[24px] bg-white p-5 shadow-sm">
      <h2 className="mb-4 flex items-center gap-3 text-[17px] font-semibold">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-vino-claro text-sm font-bold text-vino">{n}</span>{titulo}
      </h2>
      {children}
    </section>
  )
}

function Confirmacion({ resultado, info, contacto, onOtra }) {
  return (
    <div className="rounded-[28px] bg-white p-7 text-center shadow-sm">
      <CheckCircle2 className="mx-auto text-emerald-600" size={46} strokeWidth={1.6} />
      <h2 style={serif} className="mt-3 text-[30px] font-semibold leading-tight">¡Gracias! Tu carta fue recibida</h2>
      <p className="mt-2 text-[15px] text-gris">La resguardaremos para entregarla a <b className="text-tinta">{resultado.para}</b> durante {info.nombre}.</p>
      {resultado.folio > 0 && (
        <div className="mx-auto mt-5 w-fit rounded-2xl bg-vino-claro px-6 py-3">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-vino">Número de recepción</p>
          <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-wide text-vino">{folioTexto(resultado.folio)}</p>
        </div>
      )}
      {resultado.tardia && <p className="mt-4 text-sm text-amber-800">Llegó después de la fecha límite; el equipo la revisará.</p>}
      <p className="mt-5 text-sm text-gris">Guarda este número por si necesitas consultar algo. Y recuerda: es una sorpresa, no les comentes nada.</p>
      <button onClick={onOtra} className={`mt-6 h-12 rounded-full px-6 font-semibold ${contacto ? 'bg-vino text-white' : 'border border-crema-borde hover:border-tinta'}`}>{contacto ? 'Subir la siguiente carta' : 'Escribir otra carta'}</button>
    </div>
  )
}
