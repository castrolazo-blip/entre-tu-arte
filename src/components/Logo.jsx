import { Link } from 'react-router-dom'

// Logotipo de Entre tu Arte. "claro" = versión con letras blancas para fondos oscuros;
// sin "claro" se usa la versión con letras oscuras para fondos claros.
const ALTOS = { sm: 'h-12', md: 'h-16 md:h-[72px]', lg: 'h-28' }

export default function Logo({ claro = false, tamano = 'md', to = '/' }) {
  const src = `${import.meta.env.BASE_URL}${claro ? 'logo-claro.png' : 'logo-oscuro.png'}`
  return (
    <Link to={to} aria-label="Entre tu Arte, inicio" className="inline-block shrink-0">
      <img src={src} alt="Entre tu Arte" width="290" height="360" className={`${ALTOS[tamano] || ALTOS.md} w-auto`} />
    </Link>
  )
}
