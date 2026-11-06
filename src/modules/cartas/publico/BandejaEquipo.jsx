import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { PackagePlus, Phone, MessageCircle, Copy, Plus, Trash2, Loader2, AlertTriangle, Link2 } from 'lucide-react'
import { useNoIndexar } from '../../auth/RutaAdmin.jsx'
import { equipoBandeja, equipoRegistrar, equipoRecordatorio } from '../cartasService.js'
import { enlacePortal, mensajeFamilias, contactoEquipo, telefonoWhatsApp, nombrePareja, nombreDestinatario, apodo,
  fecha, folioTexto, ORIGENES, ESTADOS_REMITENTE, mensajeError } from '../constantes.js'
import { Kpi, Modal, SelectRelacion, btn } from '../ui.jsx'
import { Marca, useTituloCartas } from './marca.jsx'
import { Avance } from '../panel/Parejas.jsx'

// Bandeja de un matrimonio del equipo por enlace privado: sin cuenta ni contraseña.
// Solo ve sus parejas asignadas (nunca el contenido de las cartas) y registra paquetes en papel.
export default function BandejaEquipo() {
  const [params] = useSearchParams()
  const token = params.get('t') || ''
  useNoIndexar()
  useTituloCartas('Mis parejas')
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState(null)
  const [registrar, setRegistrar] = useState(null)

  const cargar = useCallback(async () => {
    try { setDatos(await equipoBandeja(token)); setError(null) }
    catch (e) { setError(mensajeError(e)) }
  }, [token])

  // Se actualiza solo: cada 20 s y al volver a la pantalla
  useEffect(() => {
    cargar()
    const reloj = setInterval(() => { if (document.visibilityState === 'visible') cargar() }, 20000)
    const alVolver = () => { if (document.visibilityState === 'visible') cargar() }
    document.addEventListener('visibilitychange', alVolver)
    return () => { clearInterval(reloj); document.removeEventListener('visibilitychange', alVolver) }
  }, [cargar])

  if (error && !datos) return <Pantalla><Aviso titulo="No pudimos abrir tu bandeja">{error} <button onClick={cargar} className="font-semibold underline">Reintentar</button></Aviso></Pantalla>
  if (!datos) return <Pantalla><div className="flex justify-center rounded-[28px] bg-white p-10"><Loader2 className="animate-spin text-vino" /></div></Pantalla>
  if (datos.estado !== 'ok') return <Pantalla><Aviso titulo="Este enlace no está disponible">Puede que haya cambiado. Pide el enlace actualizado al equipo coordinador.</Aviso></Pantalla>

  const { equipo, retiro, parejas } = datos
  const meta = retiro.meta_por_persona || 0
  const suma = k => parejas.reduce((n, p) => n + p[k], 0)
  const faltan = parejas.reduce((n, p) => n + Math.max(0, meta - p.paraA) + Math.max(0, meta - p.paraB), 0)
  const contactos = parejas.flatMap(p => p.contactos)
  const pareja = parejas.find(p => p.id === registrar)

  return (
    <Pantalla titulo={`Matrimonio ${equipo.apellidos}`} subtitulo={retiro.nombre}>
      <div className="grid grid-cols-2 gap-3">
        <Kpi valor={parejas.length} etiqueta="Parejas asignadas" />
        <Kpi valor={suma('recibidas')} etiqueta="Cartas recibidas" tono="vino" detalle={meta ? `meta: ${parejas.length * meta * 2}` : undefined} />
        {meta > 0 && <Kpi valor={faltan} etiqueta="Faltan para la meta" tono={faltan ? 'alerta' : 'ok'} />}
        <Kpi valor={`${contactos.filter(c => c.estado === 'recibido').length}/${contactos.length}`} etiqueta="Contactos que entregaron" />
      </div>
      {retiro.fecha_limite && <p className="mt-3 px-1 text-sm text-gris">Fecha límite: <b className="text-tinta">{fecha(retiro.fecha_limite, true)}</b></p>}

      {!parejas.length ? <Aviso titulo="Aún no tienen parejas asignadas">El equipo coordinador se las asignará pronto.</Aviso> : (
        <ul className="mt-5 space-y-3">
          {parejas.map(p => (
            <li key={p.id} className="rounded-[22px] bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-xs font-bold text-gris">{p.codigo}</span>
                <span className="font-semibold">{nombrePareja(p)}</span>
                <span className="ml-auto text-sm text-gris">{p.recibidas} cartas</span>
              </div>
              {meta > 0 && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Avance nombre={apodo(p, 'A')} n={p.paraA} meta={meta} />
                  <Avance nombre={apodo(p, 'B')} n={p.paraB} meta={meta} />
                </div>
              )}
              {p.contactos.length > 0 && (
                <ul className="mt-4 space-y-3 border-t border-crema-borde pt-3">
                  {p.contactos.map(c => <Contacto key={c.id} c={c} p={p} retiro={retiro} equipo={equipo} token={token} onCambio={cargar} />)}
                </ul>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => setRegistrar(p.id)} className={btn.vino}><PackagePlus size={16} />Registrar cartas recibidas</button>
                <button onClick={() => copiar(enlacePortal(retiro, { pareja: p }), 'Enlace para escribir cartas copiado')} className={btn.contorno}><Link2 size={15} />Enlace para cartas</button>
              </div>
              {p.ultimas.length > 0 && (
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer font-semibold text-gris">Últimas cartas</summary>
                  <ul className="mt-2 space-y-1 text-[13px] text-gris">
                    {p.ultimas.map(u => (
                      <li key={u.folio}>{folioTexto(u.folio)} · <b className="text-tinta">{u.relacion || u.remitente_nombre}</b> → {nombreDestinatario(p, u.destinatario)} · {ORIGENES[u.origen]} · {fecha(u.created_at, true)}</li>
                    ))}
                  </ul>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}
      {pareja && <RegistrarPaquete pareja={pareja} token={token} onCerrar={() => setRegistrar(null)} onListo={cargar} />}
    </Pantalla>
  )
}

async function copiar(texto, aviso) {
  try { await navigator.clipboard.writeText(texto); toast.success(aviso) } catch { window.prompt('Copia este texto:', texto) }
}

function Pantalla({ titulo, subtitulo, children }) {
  return (
    <div className="min-h-screen bg-[#f4efea]">
      <header className="bg-vino px-5 pb-14 pt-6 text-white">
        <div className="mx-auto max-w-2xl">
          <Marca claro compacta />
          {titulo && <h1 className="mt-6 text-2xl font-semibold">{titulo}</h1>}
          {subtitulo && <p className="text-sm text-white/80">{subtitulo}</p>}
          {titulo && <p className="mt-3 text-[13px] text-white/75">Aquí ven solo las parejas que les asignaron. Se actualiza sola. Las cartas son confidenciales: nadie las lee.</p>}
        </div>
      </header>
      <main className="mx-auto -mt-8 max-w-2xl overflow-x-clip px-4 pb-16">{children}</main>
    </div>
  )
}

function Aviso({ titulo, children }) {
  return (
    <div className="mt-4 rounded-[28px] bg-white p-7 text-center shadow-sm">
      <AlertTriangle className="mx-auto text-vino" size={32} strokeWidth={1.6} />
      <h2 className="mt-3 text-lg font-semibold">{titulo}</h2>
      <p className="mt-2 text-sm text-gris">{children}</p>
    </div>
  )
}

function Contacto({ c, p, retiro, equipo, token, onCambio }) {
  const enlace = enlacePortal(retiro, { remitente: c })
  const mensaje = mensajeFamilias({ retiro, pareja: p, remitente: c, enlace, responsable: contactoEquipo(equipo) })
  const tel = telefonoWhatsApp(c.telefono)
  const registrar = canal => equipoRecordatorio({ token, remitente: c.id, canal, mensaje }).then(onCambio).catch(() => {})
  const estado = ESTADOS_REMITENTE[c.estado] || ESTADOS_REMITENTE.pendiente
  return (
    <li>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <span className="font-semibold">{c.nombre}</span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${estado.clase}`}>{c.estado === 'recibido' ? 'Entregó' : estado.etiqueta}</span>
        <span className="text-gris">{c.relacion}</span>
        {c.telefono && <a href={`tel:${c.telefono}`} className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-vino"><Phone size={12} />{c.telefono}</a>}
      </div>
      <p className="mt-0.5 text-xs text-gris">{c.ultimo_recordatorio ? `Último mensaje ${fecha(c.ultimo_recordatorio, true)}` : 'Aún sin mensaje'}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <a href={`https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`} target="_blank" rel="noreferrer" onClick={() => registrar('whatsapp')} className={btn.mini}><MessageCircle size={14} />WhatsApp</a>
        <button onClick={async () => { await copiar(mensaje, 'Mensaje copiado'); registrar('copiado') }} className={btn.mini}><Copy size={14} />Copiar mensaje</button>
      </div>
    </li>
  )
}

const linea = () => ({ relacion: '', nombre: '', para: 'ambos', cantidad: 1 })

function RegistrarPaquete({ pareja, token, onCerrar, onListo }) {
  const [coord, setCoord] = useState('')
  const [entrego, setEntrego] = useState('')
  const [lineas, setLineas] = useState([linea()])
  const [guardando, setGuardando] = useState(false)
  const set = (i, k, v) => setLineas(ls => ls.map((l, j) => (j === i ? { ...l, [k]: v } : l)))
  const total = lineas.reduce((n, l) => n + l.cantidad, 0)

  async function guardar() {
    const sin = lineas.filter(l => !l.relacion).length
    if (sin && !window.confirm(`${sin} ${sin === 1 ? 'línea no indica' : 'líneas no indican'} quién envía la carta. ¿Registrar de todos modos?`)) return
    setGuardando(true)
    try {
      const n = await equipoRegistrar({ token, pareja: pareja.id, lineas, coordinador: coord, entrego })
      toast.success(`${n} ${n === 1 ? 'carta registrada' : 'cartas registradas'}`)
      setLineas([linea()]); await onListo()
    } catch (err) { toast.error(mensajeError(err, 'No se pudo registrar')) }
    finally { setGuardando(false) }
  }

  return (
    <Modal titulo="Registrar cartas recibidas" onCerrar={onCerrar}
      pie={<div className="flex items-center justify-between gap-2"><span className="text-sm text-gris">{total} {total === 1 ? 'carta' : 'cartas'}</span>
        <div className="flex gap-2"><button onClick={onCerrar} className={btn.contorno}>Cerrar</button><button onClick={guardar} disabled={guardando} className={btn.vino}>{guardando ? 'Guardando…' : `Registrar ${total}`}</button></div></div>}>
      <p className="font-semibold">{pareja.codigo} · {nombrePareja(pareja)}</p>
      <p className="mt-1 text-sm text-gris">Cartas en papel: no se abren. Se clasifican con lo que dice el sobre y van a su sobre.</p>
      <label className="etiqueta mt-4 block">Entregó el paquete
        <select value={coord} onChange={e => setCoord(e.target.value)} className="campo mt-1.5">
          <option value="">— Otra persona —</option>
          {pareja.contactos.map(c => <option key={c.id} value={c.id}>{c.nombre}{c.relacion ? ` · ${c.relacion}` : ''}</option>)}
        </select>
      </label>
      {!coord && <label className="etiqueta mt-3 block">Nombre de quien entregó<input value={entrego} onChange={e => setEntrego(e.target.value)} className="campo mt-1.5" /></label>}
      <p className="etiqueta mb-2 mt-4">Cartas: quién la envía, para quién y cuántas</p>
      <ul className="space-y-2">
        {lineas.map((l, i) => (
          <li key={i} className="rounded-2xl bg-crema-clara p-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <SelectRelacion valor={l.relacion} onCambio={v => set(i, 'relacion', v)} className="min-w-[170px] flex-1" />
              <input value={l.nombre} onChange={e => set(i, 'nombre', e.target.value)} placeholder="Nombre (opcional)" aria-label={`Nombre, carta ${i + 1}`} className="campo h-10 min-w-[120px] flex-1 bg-white" />
              <span className="flex overflow-hidden rounded-full border border-crema-borde bg-white text-[13px] font-semibold">
                {[['A', apodo(pareja, 'A')], ['B', apodo(pareja, 'B')], ['ambos', 'Ambos']].map(([v, t]) => (
                  <button type="button" key={v} onClick={() => set(i, 'para', v)} aria-pressed={l.para === v} className={`h-10 max-w-[110px] truncate px-3 ${l.para === v ? 'bg-vino text-white' : ''}`}>{t}</button>
                ))}
              </span>
              <span className="flex items-center rounded-full border border-crema-borde bg-white">
                <button type="button" onClick={() => set(i, 'cantidad', Math.max(1, l.cantidad - 1))} aria-label="Una menos" className="flex h-10 w-9 items-center justify-center text-lg font-semibold">−</button>
                <span className="w-7 text-center text-sm font-bold tabular-nums">{l.cantidad}</span>
                <button type="button" onClick={() => set(i, 'cantidad', Math.min(50, l.cantidad + 1))} aria-label="Una más" className="flex h-10 w-9 items-center justify-center text-lg font-semibold">+</button>
              </span>
              {lineas.length > 1 && <button type="button" onClick={() => setLineas(ls => ls.filter((_, j) => j !== i))} aria-label="Quitar línea" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white"><Trash2 size={15} /></button>}
            </div>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => setLineas(ls => [...ls, linea()])} className={`${btn.contorno} mt-3`}><Plus size={16} />Agregar otra carta</button>
    </Modal>
  )
}
