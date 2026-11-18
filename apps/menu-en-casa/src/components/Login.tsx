import { useState } from 'react';
import { cloud } from '../cloud';

/** Inicio de sesión con la misma cuenta de Supabase del sitio. */
export default function Login() {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cloud) return;
    setBusy(true); setMsg('');
    const { error } = await cloud.auth.signInWithPassword({ email: email.trim(), password: pass });
    setBusy(false);
    if (error) setMsg(error.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.' : error.message);
  };
  const recuperar = async () => {
    if (!cloud || !email.trim()) { setMsg('Escribe tu correo primero.'); return; }
    const { error } = await cloud.auth.resetPasswordForEmail(email.trim(), { redirectTo: location.origin + '/login' });
    setMsg(error ? error.message : 'Te enviamos un correo para crear una contraseña nueva.');
  };
  return (
    <form className="page login" onSubmit={entrar}>
      <img src="./icon.svg" alt="" width={64} height={64} />
      <h1>Menú en Casa</h1>
      <p className="muted">Los planes de la familia son privados. Entra con tu cuenta.</p>
      <label>Correo<input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <label>Contraseña<input type="password" autoComplete="current-password" required value={pass} onChange={(e) => setPass(e.target.value)} /></label>
      {msg && <p className="banner">{msg}</p>}
      <button className="btn primary block" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
      <button type="button" className="link" onClick={recuperar}>Olvidé mi contraseña</button>
    </form>
  );
}
