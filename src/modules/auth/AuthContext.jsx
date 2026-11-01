import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'

// Sesión con Supabase Auth. Ser "admin" significa estar registrado en la tabla public.admins;
// las reglas de la base de datos verifican lo mismo, así que esto solo decide qué se muestra.
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [sesion, setSesion] = useState(null)
  const [esAdmin, setEsAdmin] = useState(false)
  const [cargando, setCargando] = useState(true)

  async function revisarAdmin(s) {
    if (!s?.user) { setEsAdmin(false); return }
    const { data } = await supabase.from('admins').select('user_id').eq('user_id', s.user.id).maybeSingle()
    setEsAdmin(!!data)
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSesion(data.session)
      await revisarAdmin(data.session)
      setCargando(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, s) => {
      setSesion(s)
      revisarAdmin(s)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const valor = {
    sesion,
    usuario: sesion?.user || null,
    esAdmin,
    cargando,
    entrar: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    salir: () => supabase.auth.signOut(),
    recuperar: (email) => supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/login' }),
  }
  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
