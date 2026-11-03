import { Link } from 'react-router-dom'
import { Instagram, Facebook, Mail, MessageCircle } from 'lucide-react'
import Logo from '../Logo.jsx'
import { useConfig, enlaceWhatsApp } from '../../context/ConfigContext.jsx'

export default function Footer() {
  const { cfg } = useConfig()
  const wa = enlaceWhatsApp(cfg.whatsapp, 'Hola, quiero información sobre una obra de Entre tu Arte')
  const ig = cfg.instagram ? (cfg.instagram.startsWith('http') ? cfg.instagram : `https://instagram.com/${cfg.instagram.replace('@', '')}`) : null
  return (
    <footer className="bg-tinta pb-28 text-white md:pb-0">
      <div className="contenedor flex flex-wrap justify-between gap-12 py-16">
        <div className="max-w-sm">
          <Logo claro />
          <p className="mt-5 text-[15px] leading-relaxed text-white/70">Arte decorativo pintado a mano, en el tamaño y el estilo que tu espacio necesita. San Salvador, El Salvador.</p>
          <div className="mt-6 flex gap-2">
            {ig && <a href={ig} target="_blank" rel="noreferrer" aria-label="Instagram" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10"><Instagram size={19} /></a>}
            {cfg.facebook && <a href={cfg.facebook} target="_blank" rel="noreferrer" aria-label="Facebook" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10"><Facebook size={19} /></a>}
            {wa && <a href={wa} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10"><MessageCircle size={19} /></a>}
            {cfg.email && <a href={`mailto:${cfg.email}`} aria-label="Correo" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10"><Mail size={19} /></a>}
          </div>
        </div>
        <div className="flex flex-wrap gap-16 text-[15px] leading-[2.1] text-white/75">
          <div><p className="mb-1.5 font-bold text-white">Comprar</p><Link to="/obras?disp=existencia" className="block">En existencia</Link><Link to="/por-pedido" className="block">Por pedido</Link><Link to="/marketplace" className="block">Marketplace</Link><Link to="/vender" className="block">Vende tus cuadros</Link></div>
          <div><p className="mb-1.5 font-bold text-white">Conócenos</p><Link to="/nosotros" className="block">Nuestra historia</Link><Link to="/artistas" className="block">Artistas</Link><Link to="/blog" className="block">Blog</Link><Link to="/asesoria" className="block">Encargos a medida</Link></div>
          <div><p className="mb-1.5 font-bold text-white">Ayuda</p><Link to="/asesoria" className="block">Asesoría para tu espacio</Link><Link to="/asesoria?tipo=contacto" className="block">Contacto</Link></div>
        </div>
      </div>
      <div className="contenedor flex flex-wrap justify-between gap-3 border-t border-white/10 py-6 text-[13px] text-white/60">
        <span>© {new Date().getFullYear()} Entre tu Arte · San Salvador, El Salvador</span>
        <Link to="/login" className="text-white/60">Acceso para artistas y equipo</Link>
      </div>
    </footer>
  )
}
