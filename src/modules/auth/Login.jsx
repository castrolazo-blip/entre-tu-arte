import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from './AuthContext.jsx'
import { useNoIndexar } from './RutaAdmin.jsx'
import Logo from '../../components/Logo.jsx'

export default function Login() {
  const { usuario, esAdmin, entrar, recuperar } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [enviando, setEnviando] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  useNoIndexar()

  if (usuario && esAdmin) return <Navigate to={location.state?.desde || '/admin'} replace />

  async function onSubmit(e) {
    e.preventDefault()
    setEnviando(true)
    const { error } = await entrar(email.trim(), password)
    setEnviando(false)
    if (error) { toast.error('Correo o contraseña incorrectos'); return }
    navigate(location.state?.desde || '/admin', { replace: true })
  }

  async function onRecuperar() {
    if (!email.trim()) { toast.error('Escribe tu correo primero'); return }
    const { error } = await recuperar(email.trim())
    if (error) toast.error('No se pudo enviar el correo')
    else toast.success('Te enviamos un enlace para cambiar la contraseña')
  }

  return (
    <div className="min-h-screen bg-tinta flex items-center justify-center p-5">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-4xl bg-white p-8">
        <Logo />
        <h1 className="mt-8 text-3xl font-semibold tracking-tight">Panel de administración</h1>
        <p className="mt-2 text-sm text-gris">Acceso solo para el equipo de Entre tu Arte.</p>
        <label className="mt-6 block text-sm font-semibold">Correo
          <input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="campo mt-1.5" />
        </label>
        <label className="mt-4 block text-sm font-semibold">Contraseña
          <input type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className="campo mt-1.5" />
        </label>
        <button disabled={enviando} className="btn-primario mt-6 w-full">{enviando ? 'Entrando…' : 'Entrar'}</button>
        <button type="button" onClick={onRecuperar} className="mt-4 w-full text-sm font-semibold text-gris underline">Olvidé mi contraseña</button>
      </form>
    </div>
  )
}
