import { useState } from 'react';
import type { Person } from '../types';

const KEY = 'menu:quienes-no';
const leer = (): string[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };

/** Quiénes cuentan para cocinar y comprar (p. ej., quitar a quien no está). Se recuerda en este teléfono. */
export function useQuienes(people: Person[]) {
  const [fuera, setFuera] = useState<string[]>(leer);
  const toggle = (id: string) => setFuera((f) => {
    const n = f.includes(id) ? f.filter((x) => x !== id) : [...f, id];
    try { localStorage.setItem(KEY, JSON.stringify(n)); } catch { /* ignore */ }
    return n;
  });
  return { incluidos: people.filter((p) => !fuera.includes(p.id)), fuera, toggle };
}

export default function Quienes({ people, fuera, toggle }: { people: Person[]; fuera: string[]; toggle: (id: string) => void }) {
  const n = people.length - people.filter((p) => fuera.includes(p.id)).length;
  return (
    <div className="quienes noprint">
      <p className="optlabel">¿Para quiénes? <span className="muted">({n} de {people.length})</span></p>
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
