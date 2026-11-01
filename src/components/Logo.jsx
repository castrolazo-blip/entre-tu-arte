import { Link } from 'react-router-dom'

// Logotipo de texto con el corchete amarillo. "claro" = para fondos oscuros.
export default function Logo({ claro = false, tamano = 'md', to = '/' }) {
  const t = tamano === 'lg' ? 'text-[27px] pl-4 py-3' : tamano === 'sm' ? 'text-lg pl-3 py-2' : 'text-[22px] pl-3.5 py-2.5'
  return (
    <Link to={to} aria-label="Entre tu Arte, inicio" className={`relative inline-block font-semibold leading-none tracking-tight ${t} ${claro ? 'text-white' : 'text-tinta'}`}>
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-6 border-[3px] border-r-0 border-mostaza" />
      <span className="block">Entre tu</span>
      <span className="block">Arte</span>
    </Link>
  )
}
