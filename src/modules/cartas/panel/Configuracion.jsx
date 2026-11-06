import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { UserPlus, Archive, Trash2, Loader2, ShieldCheck } from 'lucide-react'
import { supabase } from '../../../lib/supabase.js'
import { useCartas } from '../CartasContext.jsx'
import { listarUsuarios, agregarUsuario, actualizarUsuario, listarOrganizadores, asignarOrganizador,
  textosCartas, bytesArchivo, eliminarContenidoRetiro, listarRecordatorios } from '../cartasService.js'
import { crearZip, descargar, nombreArchivo } from '../archivos.js'
import { fecha, mensajeError, folioTexto } from '../constantes.js'
import { Titulo, btn } from '../ui.jsx'
import { EquipoAdmin, Reparticion } from './Equipo.jsx'
import Actividad from './Actividad.jsx'

const PESTANAS = [['equipo', 'Equipo'], ['reparticion', 'Repartición'], ['usuarios', 'Usuarios'], ['actividad', 'Actividad'], ['datos', 'Respaldo y datos']]

export default function Configuracion() {
  const { esAdmin, retiro } = useCartas()
  const [params, setParams] = useSearchParams()
  const pestana = params.get('p') || 'equipo'
  if (!esAdmin) return <p className="text-gris">Solo los administradores pueden entrar a Configuración.</p>
  return (
    <div>
      <Titulo titulo="Configuración" subtitulo="Equipo de cartas, repartición de parejas, usuarios y datos. Plazos y meta se ajustan en Retiros › Editar." />
      <div className="mb-4 flex flex-wrap gap-2" role="tablist">
        {PESTANAS.map(([k, t]) => (
          <button key={k} role="tab" aria-selected={pestana === k} onClick={() => setParams({ p: k }, { replace: true })}
            className={`chip ${pestana === k ? 'chip-on' : 'chip-off'}`}>{t}</button>
        ))}
      </div>
      <div className="space-y-6">
        {pestana === 'equipo' && (retiro ? <EquipoAdmin /> : <p className="text-gris">Crea primero un retiro.</p>)}
        {pestana === 'reparticion' && (retiro ? <Reparticion /> : <p className="text-gris">Crea primero un retiro.</p>)}
        {pestana === 'usuarios' && <Usuarios />}
        {pestana === 'actividad' && retiro && <Actividad />}
        {pestana === 'datos' && retiro && <><Respaldo /><Retencion /></>}
      </div>
    </div>
  )
}

function Usuarios() {
  const { retiros, perfil, retiro } = useCartas()
  const [usuarios, setUsuarios] = useState([])
  const [asignados, setAsignados] = useState([])
  const [f, setF] = useState({ correo: '', nombre: '', rol: 'organizador', puede_leer: false })
  const [guardando, setGuardando] = useState(false)

  const cargar = () => Promise.all([listarUsuarios(), listarOrganizadores()]).then(([u, o]) => { setUsuarios(u); setAsignados(o) })
  useEffect(() => { cargar().catch(e => toast.error(mensajeError(e))) }, [])

  async function agregar(e) {
    e.preventDefault()
    setGuardando(true)
    try {
      const id = await agregarUsuario(f)
      if (f.rol === 'organizador' && retiro && id) await asignarOrganizador(retiro.id, id, true)
      toast.success(f.rol === 'organizador' && retiro ? `Usuario agregado y asignado a ${retiro.nombre}` : 'Usuario agregado'); setF({ correo: '', nombre: '', rol: 'organizador', puede_leer: false }); await cargar() }
    catch (err) { toast.error(mensajeError(err, 'No se pudo agregar')) }
    finally { setGuardando(false) }
  }
  async function cambiar(u, cambios) {
    if (u.user_id === perfil.user_id && (cambios.activo === false || cambios.rol === 'organizador')) {
      if (!window.confirm('Vas a quitarte permisos a ti mismo. ¿Continuar?')) return
    }
    try { await actualizarUsuario(u.user_id, cambios); await cargar() } catch (err) { toast.error(mensajeError(err)) }
  }
  async function asignar(retiroId, userId, si) {
    try { await asignarOrganizador(retiroId, userId, si); await cargar() } catch (err) { toast.error(mensajeError(err)) }
  }
  const tiene = (r, u) => asignados.some(a => a.retiro_id === r && a.user_id === u)

  return (
    <section className="rounded-[24px] bg-white p-5">
      <h2 className="text-lg font-semibold">Usuarios y permisos</h2>
      <p className="mt-1 text-sm text-gris">
        1) Crea la cuenta en Supabase › Authentication › Users › <b>Add user</b> (correo y contraseña, «Auto confirm»). 2) Agrégala aquí con su rol.
        Los organizadores solo ven los retiros asignados. Como se promete a las familias que nadie leerá las cartas, «Puede leer» viene apagado: actívalo solo para quien imprime las cartas digitales y por correo (abrir una carta queda registrado).
      </p>
      <form onSubmit={agregar} className="mt-4 grid gap-2 sm:grid-cols-[1.3fr_1fr_150px_auto_auto]">
        <input required type="email" placeholder="correo@ejemplo.com" value={f.correo} onChange={e => setF({ ...f, correo: e.target.value })} className="campo h-11" aria-label="Correo" />
        <input required placeholder="Nombre" value={f.nombre} onChange={e => setF({ ...f, nombre: e.target.value })} className="campo h-11" aria-label="Nombre" />
        <select value={f.rol} onChange={e => setF({ ...f, rol: e.target.value })} className="campo h-11" aria-label="Rol"><option value="organizador">Organizador</option><option value="administrador">Administrador</option></select>
        <label className="flex items-center gap-2 px-2 text-sm font-semibold"><input type="checkbox" checked={f.puede_leer} onChange={e => setF({ ...f, puede_leer: e.target.checked })} className="h-4 w-4 accent-[#7a2621]" />Puede leer</label>
        <button disabled={guardando} className={btn.vino}><UserPlus size={16} />Agregar</button>
      </form>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead><tr className="text-left text-xs text-gris">
            <th className="py-2 font-semibold">Usuario</th><th className="font-semibold">Rol</th><th className="font-semibold">Lee cartas</th><th className="font-semibold">Activo</th>
            <th className="font-semibold">Retiros asignados</th>
          </tr></thead>
          <tbody className="divide-y divide-crema-borde">
            {usuarios.map(u => (
              <tr key={u.user_id} className={!u.activo ? 'opacity-50' : ''}>
                <td className="py-2.5 pr-2"><b>{u.nombre}</b><span className="block text-xs text-gris">{u.correo}</span></td>
                <td><select value={u.rol} onChange={e => cambiar(u, { rol: e.target.value })} className="h-9 rounded-full border border-crema-borde bg-white px-3 text-[13px]"><option value="organizador">Organizador</option><option value="administrador">Administrador</option></select></td>
                <td><input type="checkbox" checked={u.rol === 'administrador' || u.puede_leer} disabled={u.rol === 'administrador'} onChange={e => cambiar(u, { puede_leer: e.target.checked })} className="h-4 w-4 accent-[#7a2621]" aria-label="Puede leer" /></td>
                <td><input type="checkbox" checked={u.activo} onChange={e => cambiar(u, { activo: e.target.checked })} className="h-4 w-4 accent-[#7a2621]" aria-label="Activo" /></td>
                <td className="py-2">
                  {u.rol === 'administrador' ? <span className="text-xs text-gris">Todos</span> : (
                    <div className="flex flex-wrap gap-1.5">
                      {retiros.map(r => (
                        <button key={r.id} onClick={() => asignar(r.id, u.user_id, !tiene(r.id, u.user_id))}
                          className={`h-8 rounded-full border px-3 text-xs font-semibold ${tiene(r.id, u.user_id) ? 'border-vino bg-vino text-white' : 'border-crema-borde'}`}>{r.nombre}</button>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// Respaldo completo del retiro: datos en JSON + archivos originales, en un ZIP
function Respaldo() {
  const { retiro, parejas, remitentes, cartas } = useCartas()
  const [progreso, setProgreso] = useState(null)

  async function respaldar() {
    setProgreso('Leyendo datos…')
    try {
      const [textos, recordatorios, auditoria] = await Promise.all([
        textosCartas(cartas.map(c => c.id)), listarRecordatorios(retiro.id),
        supabase.from('cca_auditoria').select('*').eq('retiro_id', retiro.id).then(r => r.data || []),
      ])
      const entradas = {
        'datos/retiro.json': JSON.stringify(retiro, null, 2),
        'datos/parejas.json': JSON.stringify(parejas, null, 2),
        'datos/remitentes.json': JSON.stringify(remitentes, null, 2),
        'datos/cartas.json': JSON.stringify(cartas.map(c => ({ ...c, texto: textos[c.id] ?? null })), null, 2),
        'datos/recordatorios.json': JSON.stringify(recordatorios, null, 2),
        'datos/auditoria.json': JSON.stringify(auditoria, null, 2),
        'LEEME.txt': `Respaldo de Cartas con Amor · ${retiro.nombre}\nGenerado: ${fecha(new Date().toISOString(), true)}\n\n` +
          `datos/: tablas del retiro en JSON (las cartas incluyen su texto).\narchivos/: originales, en carpetas por folio.\n` +
          `La ruta de cada archivo coincide con el campo "ruta" de cca_archivos dentro de cartas.json.\nVer docs/cartas/MANUAL.md › Respaldo y restauración.\n`,
      }
      const conArchivos = cartas.filter(c => c.cca_archivos.length)
      for (const [i, c] of conArchivos.entries()) {
        setProgreso(`Archivos ${i + 1} de ${conArchivos.length}…`)
        for (const a of c.cca_archivos) entradas[`archivos/${folioTexto(c.folio)}/${a.ruta.split('/').pop()}`] = await bytesArchivo(a.ruta)
      }
      setProgreso('Comprimiendo…')
      descargar(await crearZip(entradas), `respaldo-${nombreArchivo(retiro.nombre)}-${new Date().toISOString().slice(0, 10)}.zip`)
      toast.success('Respaldo descargado')
    } catch (err) { toast.error(mensajeError(err, 'No se pudo generar el respaldo')) }
    finally { setProgreso(null) }
  }

  return (
    <section className="rounded-[24px] bg-white p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold"><Archive size={18} />Respaldo del retiro</h2>
      <p className="mt-1 text-sm text-gris">Descarga todo «{retiro.nombre}» (datos, textos y archivos originales) en un ZIP. Guárdalo en un lugar privado; contiene información sensible.</p>
      <button onClick={respaldar} disabled={!!progreso} className={`${btn.contorno} mt-3`}>{progreso ? <><Loader2 size={16} className="animate-spin" />{progreso}</> : <><Archive size={16} />Descargar respaldo completo</>}</button>
    </section>
  )
}

function Retencion() {
  const { retiro, cartas, recargarRetiros, recargar } = useCartas()
  const [confirmacion, setConfirmacion] = useState('')
  const [borrando, setBorrando] = useState(false)
  const limite = retiro.fin ? new Date(new Date(retiro.fin + 'T12:00:00').getTime() + retiro.retencion_dias * 86400000) : null

  async function eliminar() {
    setBorrando(true)
    try {
      await eliminarContenidoRetiro(retiro.id)
      toast.success('Contenido eliminado y retiro archivado')
      setConfirmacion(''); await recargarRetiros(); await recargar()
    } catch (err) { toast.error(mensajeError(err, 'No se pudo eliminar')) }
    finally { setBorrando(false) }
  }

  return (
    <section className="rounded-[24px] border border-rose-200 bg-white p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold"><ShieldCheck size={18} />Conservación de datos</h2>
      <p className="mt-1 text-sm text-gris">
        Política del retiro: conservar {retiro.retencion_dias} días después del evento
        {limite && <> (hasta el <b className="text-tinta">{fecha(limite.toISOString())}</b>{limite < new Date() && <b className="text-rose-600"> · ya venció</b>})</>}.
        Descarga un respaldo antes si lo necesitan.
      </p>
      <p className="mt-3 text-sm">Esto borra para siempre las <b>{cartas.length} cartas</b> del retiro, su texto y sus archivos, y deja el retiro como «Archivado» (se conservan parejas y remitentes). Escribe el nombre del retiro para confirmar:</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <input value={confirmacion} onChange={e => setConfirmacion(e.target.value)} placeholder={retiro.nombre} className="campo h-11 max-w-sm" aria-label="Nombre del retiro" />
        <button onClick={eliminar} disabled={borrando || confirmacion.trim() !== retiro.nombre.trim()} className="inline-flex h-11 items-center gap-2 rounded-full bg-rose-600 px-5 text-sm font-semibold text-white disabled:opacity-40">
          {borrando ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}Eliminar contenido
        </button>
      </div>
    </section>
  )
}
