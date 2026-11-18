import { cloud } from '../cloud';
import { useStore } from '../store';

export default function Account({ onClose }: { onClose: () => void }) {
  const { s, email } = useStore();
  const rol = { admin: 'Administrador', cocina: 'Cocina', integrante: 'Integrante' }[s.role];
  return (
    <div className="modal" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>Tu cuenta</h2>
        <p><b>{email}</b><br /><span className="muted">Permiso: {rol}</span></p>
        <p className="muted small">El administrador asigna los permisos en Planes y perfiles → Miembros.</p>
        <button className="btn block" onClick={async () => { await cloud?.auth.signOut(); onClose(); }}>Cerrar sesión</button>
      </div>
    </div>
  );
}
