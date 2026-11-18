import { useState } from 'react';
import { useStore } from '../store';
import { ACTIVIDAD, EJERCICIOS, META, cuerpoKey, edad, entrenoKey, entrenosOf, getCuerpo, kcalEjercicio, resumenDia, type Cuerpo, type Entreno, type Meta, type Sexo } from '../fitness';

const k = (n: number) => `${Math.round(n).toLocaleString('es-SV')} kcal`;

/** Resumen del día de una persona: consumo vs. quema (basal + ejercicio), con «Mi entreno» y «Mis datos». */
export default function DaySummary({ person, date }: { person: string; date: string }) {
  const { s, set } = useStore();
  const [modal, setModal] = useState<'entreno' | 'datos' | null>(null);
  const d = resumenDia(s.plans, s.choices, s.extras, s.registro, person, date);
  const ents = entrenosOf(s.registro, person, date);
  const del = (key: string) => set((st) => { const r = { ...st.registro }; delete r[key]; return { ...st, registro: r }; });
  return (
    <div className="dia">
      <div className="extras-head">
        <b>Mi día</b>
        <span className="actions" style={{ margin: 0 }}>
          <button className="btn primary" onClick={() => setModal('entreno')}>+ Mi entreno</button>
          <button className="btn" onClick={() => setModal('datos')}>Mis datos</button>
        </span>
      </div>
      {ents.map(([key, e]) => (
        <div key={key} className="extra-row">
          <span>🏃 {e.tipo} <span className="small muted">· {e.minutos} min</span></span>
          <span className="extra-k">−{e.kcal} kcal{e.estimado && <span className="small muted"> (estim.)</span>} <button className="x" aria-label={`Borrar ${e.tipo}`} onClick={() => del(key)}>✕</button></span>
        </div>
      ))}
      <div className="dia-grid">
        <div><span className="eyebrow">Consumo</span><b>{k(d.consumo)}</b><span className="small muted">plan {k(d.consumoPlan)}{d.extras > 0 && ` + extra ${k(d.extras)}`}</span></div>
        <div><span className="eyebrow">Quema</span><b>{d.quema != null ? k(d.quema) : '—'}</b>
          <span className="small muted">{d.basal != null ? `basal ${k(d.basal)} · día ${k(d.diario! - d.basal)} · ejercicio ${k(d.ejercicio)}` : `ejercicio ${k(d.ejercicio)}`}</span></div>
      </div>
      {d.faltanDatos && <p className="banner">Para calcular tu quema basal llena <b>Mis datos</b> (sexo, edad, estatura y peso).</p>}
      {d.balance != null && d.veredicto && (
        <div className={`veredicto ${d.veredicto.tono}`}>
          <b>{d.balance > 0 ? '+' : ''}{k(d.balance)}</b>
          <span>{{ bien: '✅ ', neutro: '➖ ', mal: '❌ ', alerta: '⚠️ ' }[d.veredicto.tono]}{d.veredicto.texto}</span>
        </div>
      )}
      <p className="small muted">El consumo cuenta el plan completo del día (como si se comiera todo) más lo anotado fuera del plan. Basal con fórmula Mifflin-St Jeor; ejercicio estimado con valores MET si no anotas las calorías. Son estimaciones.</p>
      {modal === 'entreno' && <EntrenoModal person={person} date={date} onClose={() => setModal(null)} />}
      {modal === 'datos' && <DatosModal person={person} date={date} onClose={() => setModal(null)} />}
    </div>
  );
}

function EntrenoModal({ person, date, onClose }: { person: string; date: string; onClose: () => void }) {
  const { s, set } = useStore();
  const c = getCuerpo(s.registro, person);
  const who = s.people.find((p) => p.id === person)?.name ?? '';
  const [tipo, setTipo] = useState(EJERCICIOS[0][0]);
  const [otro, setOtro] = useState('');
  const [min, setMin] = useState('45');
  const [kcal, setKcal] = useState('');
  const met = EJERCICIOS.find(([n]) => n === tipo)?.[1];
  const minutos = Math.max(0, Math.round(Number(min) || 0));
  const estimado = met && c ? kcalEjercicio(met, minutos, c.peso_lb) : null;
  const final = kcal ? Math.max(0, Math.round(Number(kcal))) : estimado;
  const save = () => {
    const nombre = tipo === 'Otro' ? otro.trim() || 'Ejercicio' : tipo;
    const e: Entreno = { person, date, tipo: nombre, minutos, kcal: final ?? 0, estimado: !kcal, at: new Date().toISOString() };
    set((st) => ({ ...st, registro: { ...st.registro, [entrenoKey(date, person)]: e } }));
    onClose();
  };
  return (
    <div className="modal" onClick={onClose}>
      <div className="sheet" onClick={(ev) => ev.stopPropagation()}>
        <h2>Mi entreno · {who}</h2>
        <p className="optlabel">¿Qué entreno hiciste?</p>
        <div className="chips">
          {[...EJERCICIOS.map(([n]) => n), 'Otro'].map((n) => <button key={n} className={`chip ${tipo === n ? 'on' : ''}`} onClick={() => setTipo(n)}>{n}</button>)}
        </div>
        {tipo === 'Otro' && <label>¿Cuál?<input value={otro} placeholder="Ej. Escalada" onChange={(e) => setOtro(e.target.value)} /></label>}
        <div className="grid2" style={{ marginTop: 10 }}>
          <label>Tiempo (minutos)<input type="number" inputMode="numeric" min={0} value={min} onChange={(e) => setMin(e.target.value)} /></label>
          <label>Calorías quemadas<input type="number" inputMode="numeric" min={0} value={kcal} placeholder={estimado != null ? `≈ ${estimado}` : 'del reloj o app'} onChange={(e) => setKcal(e.target.value)} /></label>
        </div>
        <p className="small muted">
          {kcal ? 'Se usarán las calorías que escribiste (de tu reloj o app).'
            : estimado != null ? `Si lo dejas vacío se estima ≈ ${estimado} kcal con tu peso y el tipo de ejercicio.`
            : !c ? 'Para estimar las calorías llena primero «Mis datos», o escríbelas.' : 'Escribe las calorías quemadas.'}
        </p>
        <button className="btn primary block" disabled={!minutos || final == null} onClick={save}>Guardar entreno</button>
      </div>
    </div>
  );
}

function DatosModal({ person, date, onClose }: { person: string; date: string; onClose: () => void }) {
  const { s, set } = useStore();
  const c = getCuerpo(s.registro, person);
  const who = s.people.find((p) => p.id === person)?.name ?? '';
  const [sexo, setSexo] = useState<Sexo>(c?.sexo ?? 'f');
  const [nac, setNac] = useState(c?.nacimiento ?? '');
  const [cm, setCm] = useState(c ? String(c.estatura_cm) : '');
  const [lb, setLb] = useState(c ? String(c.peso_lb) : '');
  const [meta, setMeta] = useState<Meta>(c?.meta ?? 'bajar');
  const [act, setAct] = useState(c?.actividad ?? 1.2);
  const ok = nac && Number(cm) > 100 && Number(cm) < 230 && Number(lb) > 60 && Number(lb) < 500;
  const save = () => {
    const v: Cuerpo = { sexo, nacimiento: nac, estatura_cm: Number(cm), peso_lb: Number(lb), meta, actividad: act };
    set((st) => ({ ...st, registro: { ...st.registro, [cuerpoKey(person)]: v } }));
    onClose();
  };
  return (
    <div className="modal" onClick={onClose}>
      <div className="sheet" onClick={(ev) => ev.stopPropagation()}>
        <h2>Mis datos · {who}</h2>
        <div className="seg">
          <button className={sexo === 'f' ? 'on' : ''} onClick={() => setSexo('f')}>Mujer</button>
          <button className={sexo === 'm' ? 'on' : ''} onClick={() => setSexo('m')}>Hombre</button>
        </div>
        <div className="grid2">
          <label>Fecha de nacimiento<input type="date" value={nac} onChange={(e) => setNac(e.target.value)} /></label>
          <label>Edad<input disabled value={nac ? `${edad(nac, date)} años` : '—'} /></label>
          <label>Estatura (cm)<input type="number" inputMode="decimal" value={cm} placeholder="Ej. 165" onChange={(e) => setCm(e.target.value)} /></label>
          <label>Peso (lb)<input type="number" inputMode="decimal" value={lb} placeholder="Ej. 150" onChange={(e) => setLb(e.target.value)} /></label>
        </div>
        <label>Meta<select value={meta} onChange={(e) => setMeta(e.target.value as Meta)}>{META.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label>Actividad diaria (sin contar el ejercicio)<select value={act} onChange={(e) => setAct(Number(e.target.value))}>{ACTIVIDAD.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <button className="btn primary block" disabled={!ok} onClick={save}>Guardar mis datos</button>
        <p className="small muted">Actualiza tu peso cuando cambie para que el cálculo siga siendo correcto.</p>
      </div>
    </div>
  );
}
