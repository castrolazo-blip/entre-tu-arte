import { MEALS } from '../types';
import { useStore } from '../store';
import { add, mealNut, ZERO, type Nut } from '../nutrition';
import { extrasOf } from './Extras';

const g = (n: number) => Math.round(n).toLocaleString('es-SV');

/** Tabla del consumo del día de una persona: kcal, proteína, carbohidratos y grasa por comida. */
export default function NutTable({ person, date }: { person: string; date: string }) {
  const { s } = useStore();
  const rows = MEALS.map((m) => ({ m, r: mealNut(s.plans, person, date, m.key, s.choices) })).filter((x) => !x.r.empty);
  const extra = extrasOf(s.extras, person, date).reduce((t, [, e]) => t + (e.kcal ?? 0), 0);
  const total: Nut = rows.reduce((t, x) => add(t, x.r.total), ZERO);
  const missing = [...new Set(rows.flatMap((x) => x.r.missing))];
  if (!rows.length && !extra) return <div className="empty">No hay menú programado para este día.</div>;
  // kcal que aporta cada macro: proteína y carbohidratos 4 kcal/g, grasa 9 kcal/g
  const kP = total.p * 4, kC = total.c * 4, kG = total.f * 9, kT = kP + kC + kG || 1;
  const pct = (k: number) => `${Math.round((k / kT) * 100)} %`;
  const w = (k: number) => `${(k / kT) * 100}%`;
  return (
    <div className="nut">
      <table>
        <thead><tr><th>Comida</th><th>kcal</th><th>Prot.</th><th>Carb.</th><th>Grasa</th></tr></thead>
        <tbody>
          {rows.map(({ m, r }) => (
            <tr key={m.key}><td>{m.short}</td><td>{g(r.total.kcal)}</td><td>{g(r.total.p)} g</td><td>{g(r.total.c)} g</td><td>{g(r.total.f)} g</td></tr>
          ))}
          {extra > 0 && <tr className="extra"><td>Fuera del plan</td><td>{g(extra)}</td><td>—</td><td>—</td><td>—</td></tr>}
        </tbody>
        <tfoot>
          <tr><td>Total del día</td><td>{g(total.kcal + extra)}</td><td>{g(total.p)} g</td><td>{g(total.c)} g</td><td>{g(total.f)} g</td></tr>
          <tr className="pct"><td>Reparto</td><td></td><td>{pct(kP)}</td><td>{pct(kC)}</td><td>{pct(kG)}</td></tr>
        </tfoot>
      </table>
      <div className="bar" aria-hidden="true">
        <span style={{ width: w(kP), background: 'var(--sage)' }} />
        <span style={{ width: w(kC), background: '#C9893F' }} />
        <span style={{ width: w(kG), background: 'var(--accent)' }} />
      </div>
      <p className="small muted">
        <span className="dot" style={{ background: 'var(--sage)', display: 'inline-block', width: 10, height: 10, marginTop: 0 }} /> Proteína ·{' '}
        <span className="dot" style={{ background: '#C9893F', display: 'inline-block', width: 10, height: 10, marginTop: 0 }} /> Carbohidratos ·{' '}
        <span className="dot" style={{ background: 'var(--accent)', display: 'inline-block', width: 10, height: 10, marginTop: 0 }} /> Grasa (por calorías).
        {' '}Plan completo del día con lo elegido; lo de fuera del plan solo suma calorías.
        {missing.length > 0 && ` Sin calcular: ${missing.join(', ')}.`} Estimación con tabla USDA.
      </p>
    </div>
  );
}
