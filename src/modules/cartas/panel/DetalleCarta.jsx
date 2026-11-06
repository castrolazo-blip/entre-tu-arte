import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { ExternalLink, Download, EyeOff, Eye, AlertTriangle, History, Lock, Loader2 } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext.jsx'
import { useCartas } from '../CartasContext.jsx'
import { actualizarCarta, textoCarta, historial, enlaceArchivo, marcarArchivo, registrarAccion } from '../cartasService.js'
import { ESTADOS_CARTA, ORIGENES, esValida, folioTexto, fecha, nombreDestinatario, nombreCompleto, nombrePareja, tamanoTexto, mensajeError } from '../constantes.js'
import { Etiqueta, Modal, SelectRelacion, btn } from '../ui.jsx'
import { serif } from '../publico/marca.jsx'

const NOMBRES_CAMPO = { estado: 'Estado', relacion: 'Quién la envía', pareja_id: 'Pareja', destinatario: 'Destinatario',
  motivo: 'Motivo', incidencia: 'Incidencia', posible_duplicado: 'Posible duplicado', orden: 'Orden' }

export default function DetalleCarta({ cartaId, onCerrar }) {
  const { cartas, parejas, remitentes, puedeLeer, actualizarLocal, recargar } = useCartas()
  const carta = cartas.find(c => c.id === cartaId)
  const [texto, setTexto] = useState(undefined)
  const [eventos, setEventos] = useState([])
  const [motivo, setMotivo] = useState('')
  const [incidencia, setIncidencia] = useState('')
  const [guardando, setGuardando] = useState(false)
  // Las cartas son confidenciales: el contenido no se muestra hasta pedirlo, y queda registrado
  const [abierta, setAbierta] = useState(false)
  const [relacionEditada, setRelacionEditada] = useState('')
  const { usuario } = useAuth()

  useEffect(() => {
    if (!carta) return
    setMotivo(carta.motivo || ''); setIncidencia(carta.incidencia || '')
    setAbierta(false); setTexto(undefined); setRelacionEditada(carta.relacion || '')
    historial(cartaId).then(setEventos).catch(() => setEventos([]))
  }, [cartaId, carta?.updated_at]) // eslint-disable-line react-hooks/exhaustive-deps

  async function verContenido() {
    setAbierta(true)
    textoCarta(cartaId).then(setTexto).catch(() => setTexto(null))
    registrarAccion({ retiro_id: carta.retiro_id, usuario_id: usuario.id, entidad: 'cartas', entidad_id: carta.id, accion: 'lectura' })
  }

  if (!carta) return <Modal titulo="Carta" onCerrar={onCerrar}><p className="text-gris">No se encontró la carta (puede que no pertenezca a este retiro).</p></Modal>
  const pareja = parejas.find(p => p.id === carta.pareja_id)

  async function cambiar(cambios, aviso = 'Guardado') {
    setGuardando(true)
    try {
      const fila = await actualizarCarta(carta.id, cambios)
      actualizarLocal('cartas', fila)
      toast.success(aviso)
      if ('remitente_id' in cambios || 'estado' in cambios || 'pareja_id' in cambios) recargar()   // los pendientes cambian en la base
    } catch (err) { toast.error(mensajeError(err, 'No se pudo guardar')) }
    finally { setGuardando(false) }
  }

  function estado(nuevo) {
    if (nuevo !== 'recibida' && !motivo.trim()) { toast.error('Escribe el motivo primero'); return }
    cambiar({ estado: nuevo, motivo: nuevo === 'recibida' ? null : motivo.trim(), posible_duplicado: false },
      nuevo === 'recibida' ? 'Carta restaurada' : `Carta ${ESTADOS_CARTA[nuevo].etiqueta.toLowerCase()}: ya no se cuenta`)
  }

  return (
    <Modal titulo={`${folioTexto(carta.folio)} · ${carta.remitente_nombre}`} onCerrar={onCerrar} ancho="max-w-3xl">
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Etiqueta estado={carta.estado} />
            <span className="text-sm text-gris">{ORIGENES[carta.origen]} · {fecha(carta.created_at, true)}</span>
            {carta.tardia && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">Tardía</span>}
          </div>
          <dl className="mt-3 grid grid-cols-[110px_1fr] gap-y-1.5 text-sm">
            <dt className="text-gris">Para</dt><dd className="font-semibold">{carta.destinatario === 'ambos' ? nombrePareja(pareja) : nombreCompleto(pareja, carta.destinatario)} <span className="font-normal text-gris">({pareja?.codigo})</span></dd>
            {carta.recibida_de && <><dt className="text-gris">Entregó</dt><dd>{carta.recibida_de}</dd></>}
            <dt className="text-gris">De</dt><dd>{carta.remitente_nombre}{carta.relacion && ` · ${carta.relacion}`}</dd>
            {carta.remitente_contacto && <><dt className="text-gris">Contacto</dt><dd>{carta.remitente_contacto}</dd></>}
            {carta.motivo && <><dt className="text-gris">Motivo</dt><dd>{carta.motivo}</dd></>}
          </dl>

          {carta.posible_duplicado && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">
              <AlertTriangle size={17} />Posible duplicado: la misma persona ya había enviado una carta a esta pareja.
              <button disabled={guardando} onClick={() => cambiar({ posible_duplicado: false }, 'Marcada como no duplicada')} className="font-semibold underline">No es duplicado</button>
            </div>
          )}

          <div className="mt-5">
            {!puedeLeer ? (
              <p className="flex items-center gap-2 rounded-2xl bg-crema p-4 text-sm text-gris"><Lock size={16} />Las cartas son confidenciales: tu usuario no puede abrir su contenido.</p>
            ) : !abierta ? (
              <button onClick={verContenido} className={btn.contorno}><Eye size={16} />Ver contenido{carta.cca_archivos?.length ? ' y archivos' : ''}</button>
            ) : texto === undefined ? <Loader2 className="animate-spin text-gris" /> : texto ? (
              <div style={serif} className="max-h-[50vh] overflow-y-auto whitespace-pre-wrap rounded-2xl bg-[#fbf8f4] p-5 text-[18px] leading-relaxed">{texto}</div>
            ) : <p className="text-sm text-gris">Sin texto escrito{carta.cca_archivos?.length ? ': ver archivos adjuntos.' : '.'}</p>}
          </div>

          {!abierta && puedeLeer && <p className="mt-2 text-xs text-gris">Confidencial: abrirla queda registrado en el historial.</p>}
          {carta.cca_archivos?.length > 0 && (
            <ul className="mt-4 space-y-3">
              {carta.cca_archivos.map(a => <Archivo key={a.id} archivo={a} puedeLeer={puedeLeer && abierta} onCambio={recargar} />)}
            </ul>
          )}

          <section className="mt-6">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><History size={15} />Historial</h3>
            <ul className="space-y-1.5 text-[13px]">
              {eventos.map(ev => (
                <li key={ev.id} className="text-gris">
                  <span className="font-semibold text-tinta">{fecha(ev.created_at, true)}</span> · {ev.usuario_id ? 'organizador' : 'formulario público'} · {ev.accion === 'lectura' ? 'abrió el contenido' : ev.accion === 'insert' ? 'recibida' : ev.accion === 'update'
                    ? Object.entries(ev.datos || {}).map(([k, v]) => `${NOMBRES_CAMPO[k] || k}: ${k === 'estado' ? `${ESTADOS_CARTA[v.antes]?.etiqueta} → ${ESTADOS_CARTA[v.despues]?.etiqueta}` : k.endsWith('_id') ? 'cambiado' : String(v.despues ?? '—')}`).join(', ')
                    : ev.accion}
                </li>
              ))}
              {!eventos.length && <li className="text-gris">Sin movimientos</li>}
            </ul>
          </section>
        </div>

        <aside className="space-y-5">
          <div>
            {esValida(carta) ? (
              <>
                <p className="etiqueta mb-1">¿Hay un error con esta carta?</p>
                <p className="mb-2 text-[11.5px] text-gris">Anúlala solo si es spam, está equivocada o vino repetida. Deja de contarse.</p>
                <input value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Motivo" className="campo h-11 text-sm" />
                <div className="mt-2 flex gap-1.5">
                  <button disabled={guardando} onClick={() => estado('rechazada')} className={`${btn.mini} flex-1`}>Anular</button>
                  <button disabled={guardando} onClick={() => estado('duplicada')} className={`${btn.mini} flex-1`}>Es duplicada</button>
                </div>
              </>
            ) : (
              <>
                <p className="etiqueta mb-2">Esta carta no se cuenta</p>
                <button disabled={guardando} onClick={() => estado('recibida')} className={`${btn.mini} w-full`}>Restaurar como recibida</button>
              </>
            )}
          </div>

          <div>
            <p className="etiqueta mb-1.5">Quién la envía</p>
            <SelectRelacion valor={relacionEditada} onCambio={setRelacionEditada} />
            {relacionEditada !== (carta.relacion || '') && <button disabled={guardando} onClick={() => cambiar({ relacion: relacionEditada.trim() || null }, 'Clasificación guardada')} className={`${btn.mini} mt-2 w-full`}>Guardar clasificación</button>}
          </div>

          <label className="etiqueta block">Pareja
            <select disabled={guardando} value={carta.pareja_id} onChange={e => cambiar({ pareja_id: e.target.value, remitente_id: null, coordinador_id: null }, 'Pareja corregida')} className="campo mt-1.5 h-11 text-sm">
              {parejas.map(p => <option key={p.id} value={p.id}>{p.codigo} · {nombrePareja(p)}</option>)}
            </select>
          </label>
          <label className="etiqueta block">Destinatario
            <select disabled={guardando} value={carta.destinatario} onChange={e => cambiar({ destinatario: e.target.value }, 'Destinatario corregido')} className="campo mt-1.5 h-11 text-sm">
              <option value="A">{nombreCompleto(pareja, 'A')}</option><option value="B">{nombreCompleto(pareja, 'B')}</option><option value="ambos">Ambos</option>
            </select>
          </label>

          <div>
            <label className="etiqueta block">Incidencia
              <textarea rows={2} value={incidencia} onChange={e => setIncidencia(e.target.value)} placeholder="Ej.: archivo ilegible, pedir reemplazo" className="campo mt-1.5 text-sm" />
            </label>
            <button disabled={guardando || incidencia === (carta.incidencia || '')} onClick={() => cambiar({ incidencia: incidencia.trim() || null }, 'Incidencia guardada')} className={`${btn.mini} mt-2 w-full`}>Guardar incidencia</button>
          </div>

        </aside>
      </div>
    </Modal>
  )
}

function Archivo({ archivo, puedeLeer, onCambio }) {
  const [vista, setVista] = useState(null)
  const esImagen = archivo.tipo.startsWith('image/')
  useEffect(() => {
    if (puedeLeer && esImagen) enlaceArchivo(archivo.ruta).then(setVista).catch(() => setVista(false))
  }, [archivo.ruta, puedeLeer, esImagen])

  async function abrir(descargar) {
    // La pestaña se abre antes de pedir el enlace para que el navegador no la bloquee
    const ventana = descargar ? null : window.open('', '_blank')
    try {
      const url = await enlaceArchivo(archivo.ruta, descargar)
      if (ventana) ventana.location = url; else window.location.href = url
    } catch (err) { ventana?.close(); toast.error(mensajeError(err, 'No se pudo abrir el archivo')) }
  }
  async function ilegible() {
    try { await marcarArchivo(archivo.id, !archivo.ilegible); toast.success(archivo.ilegible ? 'Marcado como legible' : 'Marcado como ilegible'); onCambio() }
    catch (err) { toast.error(mensajeError(err)) }
  }

  return (
    <li className="rounded-2xl border border-crema-borde p-3">
      {esImagen && vista && <img src={vista} alt={archivo.nombre_original} className="mb-3 max-h-[420px] w-full rounded-xl bg-crema object-contain" />}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="min-w-0 flex-1 truncate font-semibold">{archivo.nombre_original}</span>
        <span className="text-xs text-gris">{tamanoTexto(archivo.tamano)}</span>
        {archivo.ilegible && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700">Ilegible</span>}
      </div>
      {puedeLeer && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button onClick={() => abrir(false)} className={btn.mini}><ExternalLink size={13} />Abrir</button>
          <button onClick={() => abrir(true)} className={btn.mini}><Download size={13} />Descargar</button>
          <button onClick={ilegible} className={btn.mini}><EyeOff size={13} />{archivo.ilegible ? 'Es legible' : 'Marcar ilegible'}</button>
        </div>
      )}
    </li>
  )
}
