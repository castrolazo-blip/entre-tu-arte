import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Mail, Loader2, AlertTriangle } from 'lucide-react'
import { equipoInfo, entrarEquipo } from '../cartasService.js'
import { mensajeError } from '../constantes.js'
import { supabase } from '../../../lib/supabase.js'
import { useAuth } from '../../auth/AuthContext.jsx'
import { useNoIndexar } from '../../auth/RutaAdmin.jsx'
import { useTituloCartas } from '../publico/marca.jsx'
import { Marca } from '../publico/marca.jsx'

// Acceso de organizadores (cuentas de Supabase Auth registradas en cca_usuarios)
export default function Entrar() {
  const [params] = useSearchParams()
  // Enlace de un matrimonio del equipo: entra sin contraseña
  if (params.get('equipo')) return <EntradaEquipo token={params.get('equipo')} />
  return <EntrarConCuenta />
}

function EntrarConCuenta() {
  const { usuario, entrar } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nueva, setNueva] = useState('')
  const [recuperando, setRecuperando] = useState(() => /type=recovery/.test(window.location.hash))
  const [enviando, setEnviando] = useState(false)
  const [registro, setRegistro] = useState(false)
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

  // Cuenta propia para miembros del equipo: al entrar, su correo registrado les da acceso a sus parejas
  async function onRegistro(e) {
    e.preventDefault()
    if (password.length < 8) { toast.error('Usa al menos 8 caracteres'); return }
    setEnviando(true)
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password,
      options: { emailRedirectTo: window.location.origin + import.meta.env.BASE_URL + 'cartas/entrar' } })
    setEnviando(false)
    if (error) { toast.error(/registered|already/i.test(error.message) ? 'Ese correo ya tiene cuenta: entra con tu contraseña' : 'No se pudo crear la cuenta'); return }
    if (data.session) { navigate('/cartas/panel', { replace: true }); return }
    toast.success('Te enviamos un correo para confirmar tu cuenta. Ábrelo y luego entra aquí.', { duration: 8000 })
    setRegistro(false)
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
        ) : registro ? (
          <form onSubmit={onRegistro}>
            <h1 className="mt-7 text-2xl font-semibold">Crear mi cuenta</h1>
            <p className="mt-1.5 text-sm text-gris">Para el equipo de cartas: usa el <b>mismo correo</b> que registraron para ti en el equipo. Así verás tus parejas asignadas.</p>
            <label className="etiqueta mt-5">Correo
              <input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="campo mt-1.5" />
            </label>
            <label className="etiqueta mt-4">Contraseña nueva
              <input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} className="campo mt-1.5" />
            </label>
            <button disabled={enviando} className="mt-6 h-12 w-full rounded-full bg-vino font-semibold text-white disabled:opacity-60">{enviando ? 'Creando…' : 'Crear cuenta'}</button>
            <button type="button" onClick={() => setRegistro(false)} className="mt-4 w-full text-sm font-semibold text-gris underline">Ya tengo cuenta</button>
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
            <p className="mt-5 border-t border-crema-borde pt-4 text-center text-sm text-gris">¿Eres del equipo de cartas y es tu primera vez? <button type="button" onClick={() => setRegistro(true)} className="font-semibold text-vino underline">Crear mi cuenta</button></p>
          </form>
        )}
      </div>
    </div>
  )
}

// «Matrimonio Castro Lazo · ¿Quién eres?» → sesión sin contraseña → Mis parejas
function EntradaEquipo({ token }) {
  const navigate = useNavigate()
  const [info, setInfo] = useState(null)
  const [entrando, setEntrando] = useState(null)
  const [error, setError] = useState('')
  useNoIndexar()
  useTituloCartas('Entrada del equipo')

  useEffect(() => { equipoInfo(token).then(setInfo).catch(e => setError(mensajeError(e))) }, [token])

  async function entrar(quien) {
    setEntrando(quien); setError('')
    try {
      await entrarEquipo(token, quien)
      // Recarga completa para que el panel tome la sesión y el perfil nuevos
      window.location.replace(`${import.meta.env.BASE_URL}cartas/panel`)
    } catch (e) { setError(mensajeError(e, 'No se pudo entrar. Revisa tu conexión e inténtalo de nuevo.')); setEntrando(null) }
  }

  const personas = info?.estado === 'ok' ? [['esposo', info.esposo_nombre], ['esposa', info.esposa_nombre]].filter(([, n]) => n) : []
  return (
    <div className="flex min-h-screen items-center justify-center bg-vino p-5">
      <div className="w-full max-w-sm rounded-[28px] bg-white p-8">
        <Marca />
        {!info && !error && <div className="mt-8 flex justify-center"><Loader2 className="animate-spin text-vino" /></div>}
        {info && info.estado !== 'ok' && (
          <div className="mt-7 text-center">
            <AlertTriangle className="mx-auto text-vino" size={30} />
            <h1 className="mt-3 text-xl font-semibold">Este enlace ya no funciona</h1>
            <p className="mt-2 text-sm text-gris">Puede que lo hayan cambiado. Pide el enlace actualizado al equipo coordinador.</p>
          </div>
        )}
        {info?.estado === 'ok' && (
          <>
            <p className="mt-7 text-xs font-bold uppercase tracking-[0.14em] text-oro">{info.retiro}</p>
            <h1 className="mt-1 text-2xl font-semibold">Matrimonio {info.apellidos}</h1>
            <p className="mt-2 text-sm text-gris">Bienvenidos al equipo de cartas. ¿Quién eres?</p>
            <div className="mt-5 grid gap-2.5">
              {personas.map(([quien, nombre]) => (
                <button key={quien} onClick={() => entrar(quien)} disabled={!!entrando}
                  className="flex h-14 items-center justify-center gap-2 rounded-full bg-vino text-[16px] font-semibold text-white disabled:opacity-60">
                  {entrando === quien && <Loader2 size={18} className="animate-spin" />}Soy {nombre.split(' ')[0]}
                </button>
              ))}
              {!personas.length && <button onClick={() => entrar('esposo')} disabled={!!entrando} className="h-14 rounded-full bg-vino font-semibold text-white">Entrar</button>}
            </div>
            <p className="mt-4 text-center text-xs text-gris">Sin contraseña: este teléfono queda conectado. No compartan el enlace.</p>
          </>
        )}
        {error && <p role="alert" className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}
      </div>
    </div>
  )
}
