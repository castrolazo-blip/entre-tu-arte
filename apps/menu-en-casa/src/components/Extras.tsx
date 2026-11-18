import { useState } from 'react';
import { MEALS, type Extra, type MealKey } from '../types';
import { useStore } from '../store';

/** Opciones rápidas con calorías típicas por porción (valores aproximados). */
const QUICK: [string, number][] = [
  ['Sorbete (1 bola)', 140], ['Sorbete de paleta', 100], ['Pupusa', 300], ['Pan dulce', 300],
  ['Refresco (lata)', 150], ['Cerveza', 150], ['Copa de vino', 125], ['Café con azúcar y leche', 90],
  ['Galleta', 80], ['Chocolate', 150], ['Papitas (bolsa pequeña)', 160], ['Pizza (1 porción)', 285],
  ['Hamburguesa', 350], ['Pastel (1 porción)', 350], ['Fruta extra', 80],
];

export const extrasOf = (extras: Record<string, Extra>, person: string, date: string, meal?: MealKey) =>
  Object.entries(extras).filter(([, e]) => e && e.person === person && e.date === date && (!meal || e.meal === meal));

/** Lista y botón «Comí algo más» de una persona en una fecha. */
export default function Extras({ person, date, meal }: { person: string; date: string; meal: MealKey }) {
  const { s, set } = useStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [when, setWhen] = useState<MealKey>(meal);
  const mine = extrasOf(s.extras, person, date);
  const who = s.people.find((p) => p.id === person)?.name ?? '';
  const save = (n: string, k: number | null) => {
    if (!n.trim()) return;
    const key = `${date}|${person}|${Date.now()}`;
    const e: Extra = { person, date, meal: when, name: n.trim(), kcal: k, at: new Date().toISOString() };
    set((st) => ({ ...st, extras: { ...st.extras, [key]: e } }));
    setOpen(false); setName(''); setKcal('');
  };
  const del = (k: string) => set((st) => { const x = { ...st.extras }; delete x[k]; return { ...st, extras: x }; });
  return (
    <div className="extras">
      <div className="extras-head">
        <b>Fuera del plan hoy</b>
        <button className="btn" onClick={() => { setWhen(meal); setOpen(true); }}>+ Comí algo más</button>
      </div>
      {mine.length === 0 && <p className="small muted">Nada anotado.</p>}
      {mine.map(([k, e]) => (
        <div key={k} className="extra-row">
          <span>{e.name} <span className="small muted">· {MEALS.find((m) => m.key === e.meal)?.short}</span></span>
          <span className="extra-k">{e.kcal != null ? `${e.kcal} kcal` : 'sin kcal'} <button className="x" aria-label={`Borrar ${e.name}`} onClick={() => del(k)}>✕</button></span>
        </div>
      ))}
      {open && (
        <div className="modal" onClick={() => setOpen(false)}>
          <div className="sheet" onClick={(ev) => ev.stopPropagation()}>
            <h2>¿Qué más comió {who}?</h2>
            <label className="small muted">¿En qué comida?
              <select value={when} onChange={(ev) => setWhen(ev.target.value as MealKey)}>{MEALS.map((m) => <option key={m.key} value={m.key}>{m.short}</option>)}</select>
            </label>
            <p className="optlabel">Toca una opción rápida</p>
            <div className="chips">{QUICK.map(([n, k]) => <button key={n} className="chip" onClick={() => save(n, k)}>{n} · {k}</button>)}</div>
            <p className="optlabel">O escríbelo</p>
            <div className="grid2">
              <label>Qué comió<input value={name} placeholder="Ej. 2 tamales" onChange={(ev) => setName(ev.target.value)} /></label>
              <label>Calorías (si sabes)<input type="number" inputMode="numeric" min={0} value={kcal} placeholder="Opcional" onChange={(ev) => setKcal(ev.target.value)} /></label>
            </div>
            <button className="btn primary block" disabled={!name.trim()} onClick={() => save(name, kcal ? Math.max(0, Math.round(Number(kcal))) : null)}>Guardar</button>
            <p className="small muted">Las calorías rápidas son aproximadas por porción típica.</p>
          </div>
        </div>
      )}
    </div>
  );
}
