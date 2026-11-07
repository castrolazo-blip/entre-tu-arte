import { Link } from 'react-router-dom'
import { PackagePlus, HeartHandshake, LayoutDashboard, Inbox, Users, BellRing, Printer, Link2, CalendarHeart, Settings, LogOut } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext.jsx'
import { useCartas } from '../CartasContext.jsx'
import { useVentana } from '../borrador.js'
import { enlacePortal, nombreEquipo, ESTADOS_RETIRO } from '../constantes.js'
import { copiar } from './Retiros.jsx'
import CartaFisica from './CartaFisica.jsx'

// Pantalla de inicio: un botón grande por cada acción de la aplicación (sin menú de hamburguesa)
export default function Inicio() {
  const { perfil, esAdmin, retiros, retiro, setRetiroId, indicadores, miEquipo, equipo, parejas } = useCartas()
  const { salir } = useAuth()
  const [registrar, abrirRegistrar, cerrarRegistrar] = useVentana('registrar')
  const t = indicadores.totales
  const misParejas = miEquipo ? parejas.filter(p => p.equipo_id === miEquipo.id && p.estado === 'activa').length : 0
  const aImprimir = t.aImprimir

  // Modo simple: coordinadoras y equipo solo ven lo que usan (menos menús, menos confusión)
  const botonesSimples = [
    { accion: () => abrirRegistrar(), Icono: PackagePlus, titulo: 'Registrar cartas recibidas', detalle: 'Las que entregan en papel o llegan por correo', principal: true },
    { to: '/cartas/panel/mis-parejas', Icono: HeartHandshake, titulo: 'Mis parejas',
      detalle: miEquipo ? `${misParejas} ${misParejas === 1 ? 'pareja' : 'parejas'} · invitar por WhatsApp` : `${t.parejas} parejas · invitar por WhatsApp` },
    { to: '/cartas/panel/cartas', Icono: Inbox, titulo: 'Cartas que han llegado', detalle: `${t.recibidas} ${t.recibidas === 1 ? 'carta' : 'cartas'}` },
  ]
  const botonesAdmin = [
    { accion: () => abrirRegistrar(), Icono: PackagePlus, titulo: 'Registrar cartas recibidas', detalle: 'En papel, por correo o por enlace', principal: true },
    (miEquipo || (esAdmin && equipo.length > 0)) && {
      to: '/cartas/panel/mis-parejas', Icono: HeartHandshake, titulo: miEquipo ? 'Mis parejas' : 'Bandejas del equipo',
      detalle: miEquipo ? `${misParejas} ${misParejas === 1 ? 'pareja asignada' : 'parejas asignadas'}` : `${equipo.length} matrimonios del equipo` },
    { to: '/cartas/panel/tablero', Icono: LayoutDashboard, titulo: 'Avance',
      detalle: t.meta ? `${t.recibidas} cartas · faltan ${t.faltanMeta}` : `${t.recibidas} cartas recibidas` },
    { to: '/cartas/panel/cartas', Icono: Inbox, titulo: 'Cartas', detalle: `${t.recibidas} recibidas${t.posiblesDuplicados ? ` · ${t.posiblesDuplicados} por revisar` : ''}` },
    { to: '/cartas/panel/parejas', Icono: Users, titulo: 'Parejas', detalle: t.meta ? `${t.metaCumplida} de ${t.parejas} con la meta` : `${t.parejas} parejas` },
    { to: '/cartas/panel/pendientes', Icono: BellRing, titulo: 'Avisar a familias', detalle: t.contactos ? (t.contactosPendientes ? `${t.contactosPendientes} ${t.contactosPendientes === 1 ? 'contacto' : 'contactos'} sin entregar` : 'Todos los contactos entregaron') : 'Mensajes a las familias', alerta: t.contactosPendientes > 0 },
    { to: '/cartas/panel/impresion', Icono: Printer, titulo: 'Impresión y sobres', detalle: `${aImprimir} ${aImprimir === 1 ? 'carta por imprimir' : 'cartas por imprimir'}` },
    { to: '/cartas/panel/parejas', Icono: Link2, titulo: 'Enlaces por pareja', detalle: 'Cada pareja tiene su propio enlace' },
    { to: '/cartas/panel/retiros', Icono: CalendarHeart, titulo: 'Retiros', detalle: ESTADOS_RETIRO[retiro.estado]?.etiqueta },
    esAdmin && { to: '/cartas/panel/configuracion', Icono: Settings, titulo: 'Configuración', detalle: 'Equipo, repartición, usuarios y actividad' },
  ].filter(Boolean)
  const botones = esAdmin ? botonesAdmin : botonesSimples

  return (
    <div>
      <div className="mb-5">
        <p className="text-sm text-gris">Hola, {perfil.nombre.split(' ')[0]}</p>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{miEquipo ? nombreEquipo(miEquipo) : 'Cartas con Amor'}</h1>
        {retiros.length > 1 && (
          <select value={retiro.id} onChange={e => setRetiroId(e.target.value)} className="campo mt-3 max-w-sm" aria-label="Retiro">
            {retiros.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
          </select>
        )}
      </div>

      <nav aria-label="Acciones" className={esAdmin ? 'grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4' : 'grid gap-3 md:grid-cols-3'}>
        {botones.map(({ to, accion, Icono, titulo, detalle, principal, alerta }) => {
          const clase = `flex min-h-[132px] flex-col justify-between rounded-[24px] p-4 text-left shadow-[0_14px_30px_-26px_rgba(23,22,20,0.6)] transition active:scale-[0.98] sm:p-5 ${
            principal ? `${esAdmin ? 'col-span-2' : ''} bg-vino text-white hover:bg-vino-oscuro md:col-span-1` : 'bg-white hover:ring-2 hover:ring-vino/30'}`
          const contenido = (
            <>
              <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${principal ? 'bg-white/15' : 'bg-vino-claro text-vino'}`}><Icono size={24} strokeWidth={1.8} /></span>
              <span className="mt-3 block">
                <span className="block text-[16px] font-semibold leading-tight">{titulo}</span>
                {detalle && <span className={`mt-1 block text-[12.5px] leading-snug ${principal ? 'text-white/80' : alerta ? 'font-semibold text-amber-700' : 'text-gris'}`}>{detalle}</span>}
              </span>
            </>
          )
          return to
            ? <Link key={titulo} to={to} className={clase}>{contenido}</Link>
            : <button key={titulo} type="button" onClick={accion} className={clase}>{contenido}</button>
        })}
      </nav>

      <button onClick={() => { if (!perfil.correo && !window.confirm('Para volver a entrar necesitarás el enlace de tu matrimonio. ¿Salir?')) return; salir() }}
        className="mt-6 inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-gris hover:bg-white lg:hidden">
        <LogOut size={16} />Salir
      </button>
      {registrar && <CartaFisica parejaInicial={misParejas === 1 ? parejas.find(p => p.equipo_id === miEquipo?.id && p.estado === 'activa')?.id : ''} onCerrar={cerrarRegistrar} clave="inicio" />}
    </div>
  )
}
