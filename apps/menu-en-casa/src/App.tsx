import { useState } from 'react';
import type { MealKey } from './types';
import { today } from './dates';
import { useStore } from './store';
import Home from './screens/Home';
import MealScreen from './screens/Meal';
import Shopping from './screens/Shopping';
import Admin from './screens/Admin';
import Editor from './screens/Editor';
import RoleSwitch from './components/RoleSwitch';
import Account from './components/Account';
import Login from './components/Login';
import { cloud } from './cloud';

export type Nav =
  | { screen: 'home' }
  | { screen: 'meal'; meal: MealKey; person: string }
  | { screen: 'shop' }
  | { screen: 'admin' }
  | { screen: 'editor'; planId: string | null };

export default function App() {
  const { s, sync, email, error, reload } = useStore();
  const [nav, setNav] = useState<Nav>({ screen: 'home' });
  const [date, setDate] = useState(today());
  const [roleOpen, setRoleOpen] = useState(false);
  const go = (n: Nav) => { setNav(n); window.scrollTo(0, 0); };
  const roleLabel = { admin: 'Administrador', cocina: 'Cocina', integrante: 'Integrante' }[s.role];

  return (
    <div className="app">
      <header className="topbar">
        <button className="brand" onClick={() => go({ screen: 'home' })}>
          <img src="./icon.svg" alt="" width={28} height={28} /> Menú en Casa
        </button>
        {(sync === 'listo' || sync === 'local') && <button className="role" onClick={() => setRoleOpen(true)}>{roleLabel}</button>}
      </header>
      {error && <p className="banner page-banner">{error} <button className="link" onClick={reload}>Reintentar</button></p>}
      <main>
        {sync === 'cargando' && <div className="empty">Cargando…</div>}
        {sync === 'sin-sesion' && <Login />}
        {sync === 'sin-acceso' && (
          <div className="page"><div className="empty">La cuenta {email} todavía no tiene acceso al menú familiar. Pídele al administrador que te agregue.</div>
            <button className="btn block" onClick={() => cloud?.auth.signOut()}>Cerrar sesión</button></div>
        )}
        {(sync === 'listo' || sync === 'local') && <>
        {nav.screen === 'home' && <Home date={date} setDate={setDate} go={go} />}
        {nav.screen === 'meal' && <MealScreen date={date} meal={nav.meal} person={nav.person} go={go} />}
        {nav.screen === 'shop' && <Shopping date={date} go={go} />}
        {nav.screen === 'admin' && <Admin go={go} />}
        {nav.screen === 'editor' && <Editor planId={nav.planId} go={go} />}
        </>}
      </main>
      {roleOpen && (cloud ? <Account onClose={() => setRoleOpen(false)} /> : <RoleSwitch onClose={() => setRoleOpen(false)} />)}
    </div>
  );
}
