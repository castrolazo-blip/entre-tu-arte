import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Mail } from 'lucide-react'
import { supabase } from '../../../lib/supabase.js'
import { useAuth } from '../../auth/AuthContext.jsx'
import { Marca, ui, useTituloApp } from '../marca.jsx'

// Acceso del administrador general (los participantes NO entran aquí: usan su enlace)
export default function Entrar() {
  const { usuario, entrar } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [enviando, setEnviando] = useState(false)
  const navigate = useNavigate()
  useTituloApp('Administración')

  if (usuario) return <Navigate to="/organizar/panel" replace />

  async function onSubmit(e) {
    e.preventDefault()
    setEnviando(true)
    const { error } = await entrar(email.trim(), password)
    setEnviando(false)
    if (error) { toast.error('Correo o contraseña incorrectos'); return }
    navigate('/organizar/panel', { replace: true })
  }

  async function recuperar() {
    if (!email.trim()) { toast.error('Escribí tu correo primero'); return }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin + import.meta.env.BASE_URL + 'login',
    })
    if (error) toast.error('No se pudo enviar el correo')
    else toast.success('Te enviamos un enlace para cambiar la contraseña')
  }

  return (
    <div className={`${ui.fondo} flex items-center justify-center bg-teal-700 p-5`}>
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-[28px] bg-white p-8">
        <Marca />
        <h1 className="mt-7 text-2xl font-bold">Administración</h1>
        <p className="mt-1.5 text-sm text-slate-500">Los participantes no necesitan entrar aquí: usan su enlace privado.</p>
        <label className={`${ui.etiqueta} mt-5`}>Correo
          <input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className={`${ui.campo} mt-1.5`} />
        </label>
        <label className={`${ui.etiqueta} mt-4`}>Contraseña
          <input type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className={`${ui.campo} mt-1.5`} />
        </label>
        <button disabled={enviando} className={`${ui.btn} mt-6 w-full`}>{enviando ? 'Entrando…' : 'Entrar'}</button>
        <button type="button" onClick={recuperar} className="mt-4 flex w-full items-center justify-center gap-2 text-sm font-semibold text-slate-500 underline"><Mail size={15} />Olvidé mi contraseña</button>
      </form>
    </div>
  )
}
