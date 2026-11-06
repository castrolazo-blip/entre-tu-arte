import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Mail } from 'lucide-react'
import { supabase } from '../../../lib/supabase.js'
import { useAuth } from '../../auth/AuthContext.jsx'
import { useNoIndexar } from '../../auth/RutaAdmin.jsx'
import { useTituloCartas } from '../publico/marca.jsx'
import { Marca } from '../publico/marca.jsx'

// Acceso de organizadores (cuentas de Supabase Auth registradas en cca_usuarios)
export default function Entrar() {
  const { usuario, entrar } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nueva, setNueva] = useState('')
  const [recuperando, setRecuperando] = useState(() => /type=recovery/.test(window.location.hash))
  const [enviando, setEnviando] = useState(false)
  const navigate = useNavigate()
  useNoIndexar()
  useTituloCartas('Acceso de organizadores')

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(evento => { if (evento === 'PASSWORD_RECOVERY') setRecuperando(true) })
    return () => data.subscription.unsubscribe()
  }, [])

  if (usuario && !recuperando) return <Navigate to="/cartas/panel" replace />

  async function onSubmit(e) {
    e.preventDefault()
    setEnviando(true)
    const { error } = await entrar(email.trim(), password)
    setEnviando(false)
    if (error) { toast.error('Correo o contraseña incorrectos'); return }
    navigate('/cartas/panel', { replace: true })
  }

  async function onRecuperar() {
    if (!email.trim()) { toast.error('Escribe tu correo primero'); return }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin + import.meta.env.BASE_URL + 'cartas/entrar',
    })
    if (error) toast.error('No se pudo enviar el correo')
    else toast.success('Te enviamos un enlace para cambiar la contraseña')
  }

  async function onNueva(e) {
    e.preventDefault()
    if (nueva.length < 8) { toast.error('Usa al menos 8 caracteres'); return }
    setEnviando(true)
    const { error } = await supabase.auth.updateUser({ password: nueva })
    setEnviando(false)
    if (error) { toast.error('No se pudo cambiar la contraseña'); return }
    toast.success('Contraseña actualizada')
    setRecuperando(false)
    navigate('/cartas/panel', { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-vino p-5">
      <div className="w-full max-w-sm rounded-[28px] bg-white p-8">
        <Marca />
        {recuperando ? (
          <form onSubmit={onNueva}>
            <h1 className="mt-7 text-2xl font-semibold">Nueva contraseña</h1>
            <label className="etiqueta mt-5">Contraseña nueva
              <input type="password" required minLength={8} autoComplete="new-password" value={nueva} onChange={e => setNueva(e.target.value)} className="campo mt-1.5" />
            </label>
            <button disabled={enviando} className="mt-6 h-12 w-full rounded-full bg-vino font-semibold text-white disabled:opacity-60">{enviando ? 'Guardando…' : 'Guardar'}</button>
          </form>
        ) : (
          <form onSubmit={onSubmit}>
            <h1 className="mt-7 text-2xl font-semibold">Acceso de organizadores</h1>
            <p className="mt-1.5 text-sm text-gris">Solo para el equipo que organiza el retiro.</p>
            <label className="etiqueta mt-5">Correo
              <input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="campo mt-1.5" />
            </label>
            <label className="etiqueta mt-4">Contraseña
              <input type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className="campo mt-1.5" />
            </label>
            <button disabled={enviando} className="mt-6 h-12 w-full rounded-full bg-vino font-semibold text-white disabled:opacity-60">{enviando ? 'Entrando…' : 'Entrar'}</button>
            <button type="button" onClick={onRecuperar} className="mt-4 flex w-full items-center justify-center gap-2 text-sm font-semibold text-gris underline"><Mail size={15} />Olvidé mi contraseña</button>
          </form>
        )}
      </div>
    </div>
  )
}
