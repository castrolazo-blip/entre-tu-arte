import type { Person } from '../types';
import { useStore } from '../store';

/** Quiénes no comen en casa ese día (se comparte entre teléfonos; cada día empieza con todos). */
const clave = (date: string) => `ausentes|${date}`;

export function useQuienes(people: Person[], date: string) {
  const { s, set } = useStore();
  const fuera = (s.registro[clave(date)] as string[] | undefined) ?? [];
  const toggle = (id: string) => set((st) => {
    const prev = (st.registro[clave(date)] as string[] | undefined) ?? [];
    const n = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
    const r = { ...st.registro };
    if (n.length) r[clave(date)] = n; else delete r[clave(date)];
    return { ...st, registro: r };
  });
  return { incluidos: people.filter((p) => !fuera.includes(p.id)), fuera, toggle };
}

export default function Quienes({ people, fuera, toggle }: { people: Person[]; fuera: string[]; toggle: (id: string) => void }) {
  const n = people.filter((p) => !fuera.includes(p.id)).length;
  return (
    <div className="quienes noprint">
      <p className="optlabel">¿Quiénes comen? <span className="muted">({n} de {people.length})</span></p>
      <div className="chips">
        {people.map((p) => {
          const on = !fuera.includes(p.id);
          return (
            <button key={p.id} className={`chip quien ${on ? 'on' : 'off'}`} style={{ ['--pc' as string]: p.color }} aria-pressed={on} onClick={() => toggle(p.id)}>
              {on ? '✓ ' : ''}{p.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
