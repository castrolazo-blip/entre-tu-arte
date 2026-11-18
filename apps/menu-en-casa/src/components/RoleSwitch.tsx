import { useState } from 'react';
import { useStore } from '../store';
import type { Role } from '../types';

export default function RoleSwitch({ onClose }: { onClose: () => void }) {
  const { s, set } = useStore();
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const choose = (role: Role) => {
    if (role === 'admin' && s.role !== 'admin' && pin !== s.pin) { setErr('PIN incorrecto'); return; }
    set((st) => ({ ...st, role }));
    onClose();
  };
  return (
    <div className="modal" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>¿Quién usa la app?</h2>
        <button className="row-btn" onClick={() => choose('cocina')}><b>Cocina</b><span>Ver menús, cantidades y compras. No edita dietas.</span></button>
        <button className="row-btn" onClick={() => choose('integrante')}><b>Integrante</b><span>Consultar su plan y el menú familiar.</span></button>
        <div className="row-btn col">
          <b>Administrador</b><span>Cargar, revisar y activar dietas.</span>
          {s.role !== 'admin' && <input inputMode="numeric" type="password" placeholder="PIN" value={pin} onChange={(e) => { setPin(e.target.value); setErr(''); }} />}
          {err && <span className="err">{err}</span>}
          <button className="btn primary" onClick={() => choose('admin')}>Entrar como administrador</button>
        </div>
        <p className="muted small">PIN inicial: 1234. Cámbialo en Planes → Ajustes.</p>
      </div>
    </div>
  );
}
