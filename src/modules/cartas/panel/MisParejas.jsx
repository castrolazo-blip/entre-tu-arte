import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PackagePlus, ChevronRight, Phone, Link2 } from 'lucide-react'
import { InvitacionPareja } from './Retiros.jsx'
import { useCartas } from '../CartasContext.jsx'
import { useVentana } from '../borrador.js'
import { enlacePortal, nombrePareja, nombreEquipo, nombreDestinatario, folioTexto, fecha, ORIGENES, esValida, semaforo } from '../constantes.js'
import { Etiqueta, Kpi, Semaforo, Titulo, Vacio, btn } from '../ui.jsx'
import { Avance } from './Parejas.jsx'
import { AccionesRecordatorio } from './remitentes.jsx'
import CartaFisica from './CartaFisica.jsx'

// Bandeja de un matrimonio del equipo: solo sus parejas asignadas, con avance, contactos y cartas.
// Cada miembro ve la suya (por su correo); el administrador puede ver la de cualquiera.
export default function MisParejas() {
  const { retiro, equipo, parejas, remitentes, cartas, indicadores, miEquipo, esAdmin } = useCartas()
  const [params, setParams] = useSearchParams()
  const [registrar, abrirRegistrar, cerrarRegistrar] = useVentana('registrar')
  const elegido = params.get('equipo')
  const actual = equipo.find(e => e.id === elegido) || miEquipo || (esAdmin ? equipo[0] : null)
  useEffect(() => { if (esAdmin && actual && !elegido) setParams({ equipo: actual.id }, { replace: true }) }, [esAdmin, actual, elegido, setParams])

  const meta = retiro.meta_por_persona || 0
  // Coordinadora sin matrimonio asignado (modo simple): ve todas las parejas
  const todas = !esAdmin && !miEquipo
  const suyas = useMemo(() => parejas.filter(p => (todas || (actual && p.equipo_id === actual.id)) && p.estado === 'activa')
    .sort((a, b) => a.codigo.localeCompare(b.codigo, 'es', { numeric: true })), [parejas, actual, todas])
  const ids = new Set(suyas.map(p => p.id))
  const recientes = cartas.filter(c => ids.has(c.pareja_id) && esValida(c)).slice(0, 10)
  const suma = k => suyas.reduce((n, p) => n + indicadores.porPareja[p.id][k], 0)

  if (!actual && !todas) {
    return <Vacio titulo={equipo.length ? 'No tienes parejas asignadas' : 'Aún no hay equipo registrado'}>
      {esAdmin ? 'Agrega el equipo en Configuración › Equipo.' : 'Pide al administrador que registre tu correo en el equipo y te asigne parejas.'}
    </Vacio>
  }

  return (
    <div>
      <Titulo titulo={todas ? 'Parejas' : actual === miEquipo && !elegido ? 'Mis parejas' : nombreEquipo(actual)}
        subtitulo={todas ? `${suyas.length} parejas · toca «Invitar a otros por WhatsApp» para pedir cartas` : `${actual === miEquipo && !elegido ? nombreEquipo(actual) + ' · r' : 'R'}esponsable de ${suyas.length} ${suyas.length === 1 ? 'pareja' : 'parejas'}`}>
        {esAdmin && equipo.length > 1 && (
          <select value={actual.id} onChange={e => setParams({ equipo: e.target.value }, { replace: true })} className="campo h-11 min-w-[220px]" aria-label="Matrimonio del equipo">
            {equipo.map(e => <option key={e.id} value={e.id}>{nombreEquipo(e)} · {parejas.filter(p => p.equipo_id === e.id && p.estado === 'activa').length}</option>)}
          </select>
        )}
      </Titulo>

      {esAdmin && <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi valor={suyas.length} etiqueta="Parejas asignadas" />
        <Kpi valor={suma('recibidas')} etiqueta="Cartas recibidas" tono="vino" detalle={meta ? `meta: ${suyas.length * meta * 2}` : undefined} />
        {meta > 0 && <Kpi valor={suma('faltan')} etiqueta="Faltan para la meta" tono={suma('faltan') ? 'alerta' : 'ok'} />}
        <Kpi valor={`${suma('contactos') - suma('contactosPendientes')}/${suma('contactos')}`} etiqueta="Contactos que entregaron" />
      </div>}

      {!suyas.length ? <div className="mt-5"><Vacio titulo="Sin parejas asignadas todavía">El administrador las asigna en Configuración › Repartición.</Vacio></div> : (
        <ul className="mt-5 space-y-3">
          {suyas.map(p => {
            const x = indicadores.porPareja[p.id]
            const contactos = remitentes.filter(r => r.pareja_id === p.id && r.coordinador)
            return (
              <li key={p.id} className="rounded-[22px] bg-white p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Semaforo color={semaforo({ retiro, cartasValidas: x.recibidas, pendientes: x.pendientes, x })} />
                  <span className="text-xs font-bold text-gris">{p.codigo}</span>
                  {esAdmin ? <Link to={`/cartas/panel/parejas/${p.id}`} className="font-semibold hover:text-vino">{nombrePareja(p)}</Link> : <span className="font-semibold">{nombrePareja(p)}</span>}
                  <span className="ml-auto text-sm text-gris">{x.recibidas} cartas</span>
                </div>
                {meta > 0 && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Avance nombre={p.apodo_a || p.nombre_a} n={x.paraA} meta={meta} />
                    <Avance nombre={p.apodo_b || p.nombre_b} n={x.paraB} meta={meta} />
                  </div>
                )}
                {contactos.length > 0 && (
                  <ul className="mt-4 space-y-3 border-t border-crema-borde pt-3">
                    {contactos.map(r => (
                      <li key={r.id}>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                          <span className="font-semibold">{r.nombre}</span>
                          <Etiqueta tipo="remitente" estado={r.estado} />
                          <span className="text-gris">{r.relacion}</span>
                          {r.telefono && <a href={`tel:${r.telefono}`} className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-vino"><Phone size={12} />{r.telefono}</a>}
                        </div>
                        <p className="mt-0.5 text-xs text-gris">{r.ultimo_recordatorio ? `Último mensaje ${fecha(r.ultimo_recordatorio, true)}` : 'Aún sin mensaje'}</p>
                        {r.estado !== 'exento' && <div className="mt-2"><AccionesRecordatorio remitente={r} pareja={p} compacto simple={!esAdmin} /></div>}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={() => abrirRegistrar(p.id)} className={btn.vino}><PackagePlus size={16} />Registrar cartas recibidas</button>
                  <InvitacionPareja retiro={retiro} pareja={p} compacto={false} simple={!esAdmin} />
                  {esAdmin && <Link to={`/cartas/panel/parejas/${p.id}`} className={btn.contorno}>Ver ficha<ChevronRight size={16} /></Link>}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {esAdmin && recientes.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-lg font-semibold">Últimas cartas de mis parejas</h2>
          <ul className="divide-y divide-crema-borde overflow-hidden rounded-[20px] bg-white">
            {recientes.map(c => {
              const p = suyas.find(x => x.id === c.pareja_id)
              return (
                <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-4 py-3 text-sm">
                  <span className="text-xs font-bold text-gris">{folioTexto(c.folio)}</span>
                  <span className="font-semibold">{c.remitente_nombre}</span>
                  <span className="text-gris">→ {nombreDestinatario(p, c.destinatario)} ({p.codigo}) · {ORIGENES[c.origen]}</span>
                  <span className="ml-auto text-xs text-gris">{fecha(c.created_at, true)}</span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {registrar && <CartaFisica parejaInicial={registrar === true ? '' : registrar} onCerrar={cerrarRegistrar} />}
    </div>
  )
}
