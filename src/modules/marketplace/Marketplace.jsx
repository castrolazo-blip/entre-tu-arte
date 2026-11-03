import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ShieldCheck, Truck, MessageCircle } from 'lucide-react'
import { listarObras } from '../catalogo/obrasService.js'
import TarjetaObra from '../../components/obras/TarjetaObra.jsx'
import CargandoModulo from '../../components/CargandoModulo.jsx'

// Cuadros de artistas salvadoreños y coleccionistas que se venden a través de Entre tu Arte.
// Aparte de las obras de la marca. El comprador solo trata con la página.
export default function Marketplace() {
  const [obras, setObras] = useState(null)
  useEffect(() => {
    document.title = 'Marketplace · Entre tu Arte'
    listarObras({ estado: 'en_venta', origen: 'marketplace' }).then(setObras).catch(() => setObras([]))
  }, [])
  const fondo = obras?.find(o => o.foto)?.fotoMini

  return (
    <>
      <section className="relative overflow-hidden bg-tinta-suave text-white">
        {fondo && <img src={fondo} alt="" aria-hidden="true" className="absolute -inset-10 h-[calc(100%+80px)] w-[calc(100%+80px)] max-w-none object-cover opacity-70" style={{ filter: 'blur(8px)' }} />}
        <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[#141210]/95 via-[#141210]/80 to-[#141210]/55" />
        <div className="contenedor relative pb-14 pt-32 md:pb-20 md:pt-44">
          <p className="text-[13px] font-bold uppercase tracking-[0.16em] text-mostaza">Marketplace</p>
          <h1 className="mt-3 text-[50px] font-medium leading-[0.96] tracking-[-0.045em] md:text-[88px]">Cuadros de <em className="font-bold text-mostaza">El Salvador</em></h1>
          <span aria-hidden="true" className="mt-7 block h-[5px] w-20 rounded-full bg-mostaza" />
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/85">Obras de artistas salvadoreños y de coleccionistas, a la venta a través de Entre tu Arte. Tú tratas solo con nosotros: verificamos cada cuadro, coordinamos el pago y la entrega.</p>
        </div>
      </section>

      <section className="contenedor py-12 md:py-16">
        <div className="mb-10 grid gap-3 md:grid-cols-3">
          {[[ShieldCheck, 'Compra segura', 'Pagas a Entre tu Arte y te acompañamos en toda la compra.'],
            [Truck, 'Entrega coordinada', 'Nosotros coordinamos la entrega y, si quieres, la instalación.'],
            [MessageCircle, 'Un solo contacto', 'Cualquier duda la resolvemos nosotros, sin intermediarios.']].map(([Icono, t, d]) => (
            <div key={t} className="flex gap-4 rounded-[22px] bg-white p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-mostaza text-tinta"><Icono size={20} /></span>
              <span><span className="block font-semibold">{t}</span><span className="block text-sm text-gris">{d}</span></span>
            </div>
          ))}
        </div>
        {!obras ? <CargandoModulo /> : obras.length
          ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{obras.map(o => <TarjetaObra key={o.id} obra={o} />)}</div>
          : <p className="rounded-[28px] bg-white p-12 text-center text-gris">Muy pronto tendremos cuadros de artistas y coleccionistas aquí.</p>}
      </section>

      <section className="contenedor pb-24">
        <div className="flex flex-wrap items-center justify-between gap-8 rounded-[34px] bg-mostaza p-8 md:p-12">
          <div className="max-w-xl">
            <h2 className="text-[34px] font-semibold leading-[1.02] tracking-[-0.04em] md:text-[44px]">¿Tienes cuadros para vender?</h2>
            <p className="mt-4 text-[17px] leading-relaxed">Si eres artista o tienes cuadros que ya no usas, súbelos aquí. Nosotros los publicamos, atendemos a los compradores y te pagamos cuando se venden.</p>
          </div>
          <Link to="/vender" className="btn-oscuro h-16">Vender mis cuadros <ArrowRight size={20} /></Link>
        </div>
      </section>
    </>
  )
}
