import { useEffect, useState } from 'react';
import { cloud } from '../cloud';
import type { Role } from '../types';

interface Miembro { email: string; nombre: string | null; rol: Role }

/** Quién puede entrar al menú y con qué permiso (solo administrador). */
export default function Members() {
  const [list, setList] = useState<Miembro[]>([]);
  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState<Role>('cocina');
  const [msg, setMsg] = useState('');
  const load = async () => {
    const { data, error } = await cloud!.rpc('menu_miembros_lista');
    if (error) setMsg(error.message); else setList(data ?? []);
  };
  useEffect(() => { load(); }, []);
  const add = async () => {
    const { error } = await cloud!.rpc('menu_agregar_miembro', { p_email: email.trim(), p_rol: rol, p_nombre: nombre.trim() || null });
    if (error) setMsg(error.message.includes('menu:sin_usuario') ? 'Ese correo aún no tiene cuenta. Créala en Supabase › Authentication › Add user y vuelve a intentar.' : error.message);
    else { setEmail(''); setNombre(''); setMsg('Miembro guardado.'); load(); }
  };
  const del = async (m: Miembro) => {
    if (!confirm(`¿Quitar el acceso de ${m.email}?`)) return;
    const { error } = await cloud!.rpc('menu_quitar_miembro', { p_email: m.email });
    if (error) setMsg(error.message); else load();
  };
  return (
    <>
      <h2 className="sec">Miembros con acceso</h2>
      {list.map((m) => <MemberRow key={m.email} m={m} onSaved={(t) => { setMsg(t); load(); }} onDelete={() => del(m)} />)}
      <h3 className="sec small">Agregar miembro</h3>
      <div className="grid2">
        <label>Correo<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Nombre<input value={nombre} onChange={(e) => setNombre(e.target.value)} /></label>
        <label>Permiso<select value={rol} onChange={(e) => setRol(e.target.value as Role)}>
          <option value="cocina">Cocina (ve y marca, no edita dietas)</option>
          <option value="integrante">Integrante (consulta)</option>
          <option value="admin">Administrador</option>
        </select></label>
        <button className="btn primary" disabled={!email.includes('@')} onClick={add}>Dar acceso</button>
      </div>
      {msg && <p className="banner">{msg}</p>}
    </>
  );
}

const ROLES: { v: Role; l: string }[] = [
  { v: 'cocina', l: 'Cocina' }, { v: 'integrante', l: 'Integrante' }, { v: 'admin', l: 'Administrador' },
];

/** Un miembro: se puede cambiar nombre y permiso, o quitar el acceso. */
function MemberRow({ m, onSaved, onDelete }: { m: Miembro; onSaved: (msg: string) => void; onDelete: () => void }) {
  const [edit, setEdit] = useState(false);
  const [nombre, setNombre] = useState(m.nombre ?? '');
  const [rol, setRol] = useState<Role>(m.rol);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    const { error } = await cloud!.rpc('menu_agregar_miembro', { p_email: m.email, p_rol: rol, p_nombre: nombre.trim() || null });
    setBusy(false);
    if (error) onSaved(error.message); else { setEdit(false); onSaved(`${nombre || m.email}: cambios guardados.`); }
  };
  return (
    <div className="plan">
      <div className="plan-head">
        <span><b>{m.nombre || m.email}</b><br /><span className="small muted">{m.email}</span></span>
        <span className={`badge ${m.rol === 'admin' ? 'activo' : 'archivado'}`}>{ROLES.find((r) => r.v === m.rol)?.l ?? m.rol}</span>
      </div>
      {edit ? (
        <>
          <div className="grid2">
            <label>Nombre<input value={nombre} onChange={(e) => setNombre(e.target.value)} /></label>
            <label>Permiso<select value={rol} onChange={(e) => setRol(e.target.value as Role)}>{ROLES.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}</select></label>
          </div>
          <div className="actions">
            <button className="btn primary" disabled={busy} onClick={save}>{busy ? 'Guardando…' : 'Guardar'}</button>
            <button className="btn" onClick={() => { setEdit(false); setNombre(m.nombre ?? ''); setRol(m.rol); }}>Cancelar</button>
            <button className="btn danger" onClick={onDelete}>Quitar acceso</button>
          </div>
        </>
      ) : (
        <div className="actions"><button className="btn" onClick={() => setEdit(true)}>Editar</button></div>
      )}
    </div>
  );
}
