import { Link } from 'react-router-dom'
import { LayoutGrid, Paintbrush, Image, Sofa } from 'lucide-react'

// Fila de accesos rápidos debajo de la portada (como en el diseño de referencia)
const ACCESOS = [
  { to: '/colecciones', etiqueta: 'Colecciones', Icono: LayoutGrid },
  { to: '/por-pedido', etiqueta: 'Por encargo', Icono: Paintbrush },
  { to: '/asesoria', etiqueta: 'Ver en mi espacio', Icono: Image },
  { to: '/blog', etiqueta: 'Inspiración', Icono: Sofa },
]

export default function AccesosRapidos() {
  return (
    <nav aria-label="Accesos rápidos" className="bg-crema-clara">
      <div className="contenedor grid grid-cols-4 gap-2 py-6 md:max-w-3xl md:gap-6 md:py-10">
        {ACCESOS.map(({ to, etiqueta, Icono }) => (
          <Link key={to} to={to} className="group flex flex-col items-center gap-2 text-center">
            <span className="flex h-[68px] w-[68px] items-center justify-center rounded-[20px] bg-[#efe9e0] text-tinta transition group-hover:bg-mostaza md:h-20 md:w-20">
              <Icono size={30} strokeWidth={1.6} />
            </span>
            <span className="text-[13px] font-semibold leading-tight md:text-[15px]">{etiqueta}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
