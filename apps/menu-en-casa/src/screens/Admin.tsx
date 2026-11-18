import { useRef, useState } from 'react';
import type { Nav } from '../App';
import type { Plan } from '../types';
import { addDays } from '../dates';
import { getFile, useStore, type State } from '../store';
import { parsed } from '../logic';
import { cloud } from '../cloud';
import Members from '../components/Members';

export async function openOriginal(p: Plan) {
  if (!p.fileId) return;
  const f = await getFile(p.fileId);
  if (f) window.open(URL.createObjectURL(f), '_blank');
  else alert('El documento original no está guardado en este dispositivo.');
}

export default function Admin({ go }: { go: (n: Nav) => void }) {
  const { s, set } = useStore();
  const admin = s.role === 'admin';
  const [pin, setPin] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const log = (p: Plan, what: string): Plan => ({ ...p, history: [...p.history, { at: new Date().toISOString(), what }] });
  const upd = (id: string, f: (p: Plan) => Plan) => set((st) => ({ ...st, plans: st.plans.map((p) => (p.id === id ? f(p) : p)) }));

  const duplicate = (p: Plan) => {
    const days = Math.round((Date.parse(p.end) - Date.parse(p.start)) / 864e5) + 1;
    const start = addDays(p.end, 1);
    const np: Plan = { ...p, id: `${p.personId}-${Date.now()}`, title: `${p.title} (copia)`, start, end: addDays(start, days - 1), status: 'borrador', version: 1,
      createdAt: new Date().toISOString(), approvedAt: undefined, history: [{ at: new Date().toISOString(), what: `Duplicado desde «${p.title}» para revisión` }] };
    set((st) => ({ ...st, plans: [...st.plans, np] }));
    go({ screen: 'editor', planId: np.id });
  };
  const exportData = () => {
    const blob = new Blob([JSON.stringify({ ...s, role: undefined, pin: undefined }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `menu-en-casa-respaldo-${new Date().toISOString().slice(0, 10)}.json`; a.click();
  };
  const importData = async (f: File) => {
    try {
      const d = JSON.parse(await f.text()) as Partial<State>;
      if (!Array.isArray(d.plans) || !Array.isArray(d.people)) throw new Error();
      if (confirm(`¿Cargar el respaldo? Trae ${d.people.length} integrantes y ${d.plans.length} planes, y reemplaza lo actual.`)) {
        set((st) => ({ ...st, ...d, seed: st.seed, role: st.role, pin: st.pin }));
        alert('Respaldo cargado. Vuelve al inicio para ver los menús.');
      }
    } catch { alert('Archivo de respaldo no válido.'); }
  };

  return (
    <div className="page">
      <div className="sticky">
        <button className="back" onClick={() => go({ screen: 'home' })}>‹ Inicio</button>
        <div className="crumb"><b>Planes y perfiles</b></div>
      </div>
      {!admin && <p className="banner">Solo lectura. Para cargar, corregir o activar dietas entra como Administrador (botón arriba a la derecha).</p>}

      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) importData(f); }} />
      {admin && s.plans.length === 0 && (
        <div className="start">
          <p><b>Para empezar:</b> importa el archivo de respaldo (<i>menu-en-casa-respaldo.json</i>). Trae los integrantes y sus planes.</p>
          <button className="btn primary block" onClick={() => fileRef.current?.click()}>Importar respaldo</button>
        </div>
      )}
      <h2 className="sec">Planes nutricionales</h2>
      {admin && <button className="btn primary block" onClick={() => go({ screen: 'editor', planId: null })}>+ Subir nuevo plan</button>}
      {s.people.map((person) => {
        const plans = s.plans.filter((p) => p.personId === person.id).sort((a, b) => b.start.localeCompare(a.start));
        return (
          <div key={person.id} className="pblock" style={{ ['--pc' as string]: person.color }}>
            <h3 className="who">{person.name} <small className="muted">{person.alias}</small></h3>
            {plans.length === 0 && <p className="muted small">Sin planes cargados.</p>}
            {plans.map((p) => {
              const r = parsed(p);
              const errs = r.issues.filter((i) => i.level === 'error').length;
              return (
                <div key={p.id} className="plan">
                  <div className="plan-head"><b>{p.title}</b><span className={`badge ${p.status}`}>{p.status}</span></div>
                  <p className="small muted">Vigencia {p.start} → {p.end} · v{p.version} · {r.itemCount} alimentos{errs ? ` · ${errs} errores` : ''}</p>
                  {p.fileName && <p className="small muted">Original: {p.fileName}</p>}
                  <div className="actions">
                    <button className="btn" onClick={() => go({ screen: 'editor', planId: p.id })}>{admin ? 'Revisar / editar' : 'Ver'}</button>
                    {p.fileId && <button className="btn" onClick={() => openOriginal(p)}>Ver original</button>}
                    {admin && <button className="btn" onClick={() => duplicate(p)}>Duplicar a semana siguiente</button>}
                    {admin && p.status === 'activo' && <button className="btn" onClick={() => upd(p.id, (x) => log({ ...x, status: 'archivado' }, 'Archivado'))}>Archivar</button>}
                    {admin && p.status === 'borrador' && <button className="btn danger" onClick={() => confirm('¿Eliminar este borrador?') && set((st) => ({ ...st, plans: st.plans.filter((x) => x.id !== p.id) }))}>Eliminar</button>}
                  </div>
                  <details className="small"><summary>Historial</summary><ul>{p.history.map((h, i) => <li key={i}>{h.at.slice(0, 16).replace('T', ' ')} — {h.what}</li>)}</ul></details>
                </div>
              );
            })}
          </div>
        );
      })}

      <h2 className="sec">Perfiles</h2>
      {admin && <button className="btn block" onClick={() => set((st) => ({ ...st, people: [...st.people, { id: `p${Date.now()}`, name: 'Nuevo', alias: '', color: ['#C0657A', '#4F6D8A', '#6F8B5E', '#C08A2E', '#8A6FB0'][st.people.length % 5], active: true, restrictions: '' }] }))}>+ Agregar integrante</button>}
      {s.people.map((p) => (
        <div key={p.id} className="profile">
          <span className="dot" style={{ background: p.color }} />
          {admin ? (
            <div className="grid2">
              <label>Nombre<input value={p.name} onChange={(e) => set((st) => ({ ...st, people: st.people.map((x) => (x.id === p.id ? { ...x, name: e.target.value } : x)) }))} /></label>
              <label>Nombre completo<input value={p.alias} onChange={(e) => set((st) => ({ ...st, people: st.people.map((x) => (x.id === p.id ? { ...x, alias: e.target.value } : x)) }))} /></label>
              <label className="span2">Restricciones registradas<input value={p.restrictions} placeholder="Solo las indicadas por la nutricionista" onChange={(e) => set((st) => ({ ...st, people: st.people.map((x) => (x.id === p.id ? { ...x, restrictions: e.target.value } : x)) }))} /></label>
              <label className="check"><input type="checkbox" checked={p.active} onChange={(e) => set((st) => ({ ...st, people: st.people.map((x) => (x.id === p.id ? { ...x, active: e.target.checked } : x)) }))} /> Activo</label>
            </div>
          ) : (<span><b>{p.name}</b> · {p.alias}{p.restrictions && ` · ${p.restrictions}`}</span>)}
        </div>
      ))}

      {admin && (
        <>
          {cloud && <Members />}
          <h2 className="sec">Ajustes y datos</h2>
          {!cloud && <div className="actions">
            <input inputMode="numeric" type="password" placeholder="Nuevo PIN" value={pin} onChange={(e) => setPin(e.target.value)} />
            <button className="btn" disabled={pin.length < 4} onClick={() => { set((st) => ({ ...st, pin })); setPin(''); alert('PIN actualizado'); }}>Cambiar PIN</button>
          </div>}
          <div className="actions">
            <button className="btn" onClick={exportData}>Exportar respaldo</button>
            <button className="btn" onClick={() => fileRef.current?.click()}>Importar respaldo</button>
            {!cloud && <button className="btn danger" onClick={() => { if (confirm('¿Borrar todos los datos de este dispositivo y volver a los planes iniciales?')) { localStorage.clear(); location.reload(); } }}>Borrar datos locales</button>}
          </div>
        </>
      )}
    </div>
  );
}
