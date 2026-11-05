
import { Link } from 'react-router-dom'
import { Printer, ArrowRight } from 'lucide-react'
import { CONDICIONES, CONDICIONES_FECHA } from './condiciones.js'

// Condiciones comerciales para artistas: página pública, imprimible (o "guardar como PDF").
export default function CondicionesArtistas() {
  const fecha = new Date(CONDICIONES_FECHA + 'T12:00:00').toLocaleDateString('es-SV', { day: 'numeric', month: 'long', year: 'numeric' })
  return (
    <div className="contenedor pb-28 pt-28 md:pt-36">
      <article className="mx-auto max-w-3xl rounded-[30px] bg-white p-6 md:p-12 print:rounded-none print:p-0">
        <p className="text-[13px] font-bold uppercase tracking-[0.16em] text-gris">Entre tu Arte</p>
        <h1 className="mt-2 text-[36px] font-semibold leading-[1.05] tracking-[-0.035em] md:text-[48px]">Condiciones comerciales para artistas</h1>
        <p className="mt-2 text-lg text-gris">Programa de comercialización de obras de arte</p>
        <p className="mt-1 text-sm text-gris">Versión del {fecha}</p>

        <div className="mt-6 grid gap-2 rounded-[22px] bg-mostaza-fondo p-5 text-[15px] ring-1 ring-mostaza sm:grid-cols-2 print:hidden">
          {['Inscripción y publicación gratuitas', 'Comisión sobre el precio de venta, acordada contigo antes de publicar cada obra', 'Pago en 7 días hábiles tras el pago del comprador y la entrega', 'Sin exclusividad; la obra queda contigo hasta la venta'].map(t => (
            <p key={t} className="flex gap-2"><span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-tinta" />{t}</p>
          ))}
        </div>

        <ol className="mt-8 space-y-8">
          {CONDICIONES.map((s, n) => (
            <li key={s.titulo} className="break-inside-avoid">
              <h2 className="text-xl font-bold tracking-tight">{n + 1}. {s.titulo}</h2>
              <div className="mt-2.5 space-y-2.5 text-[16px] leading-relaxed text-[#3c3a36]">
                {s.bloques.map((b, i) => Array.isArray(b)
                  ? <ul key={i} className="list-disc space-y-1 pl-6">{b.map(x => <li key={x}>{x}</li>)}</ul>
                  : <p key={i}>{b}</p>)}
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-10 border-t border-crema-borde pt-6 text-center font-semibold italic">Entre tu Arte — Arte que conecta espacios y personas.</p>

        <div className="mt-8 flex flex-wrap gap-3 print:hidden">
          <Link to="/vender" className="btn-primario h-14">Enviar mis cuadros <ArrowRight size={20} /></Link>
          <button type="button" onClick={() => window.print()} className="btn-contorno h-14"><Printer size={18} />Imprimir o guardar PDF</button>
        </div>
      </article>
    </div>
  )
}
