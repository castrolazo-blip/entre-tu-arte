import type { Nav } from '../App';
import { MEALS } from '../types';
import { addDays, longDate, today } from '../dates';
import { useStore } from '../store';
import { dishesFor } from '../logic';

export default function Home({ date, setDate, go }: { date: string; setDate: (d: string) => void; go: (n: Nav) => void }) {
  const { s } = useStore();
  const people = s.people.filter((p) => p.active);
  const count = (meal: (typeof MEALS)[number]['key']) => people.filter((p) => dishesFor(s.plans, p.id, date, meal).dishes.length).length;
  const any = MEALS.some((m) => count(m.key) > 0);
  const isToday = date === today();
  return (
    <div className="page">
      <section className="datebox">
        <button className="arrow" aria-label="Día anterior" onClick={() => setDate(addDays(date, -1))}>‹</button>
        <label className="datecenter">
          <span className="eyebrow">{isToday ? 'Hoy' : 'Fecha seleccionada'}</span>
          <span className="bigdate">{longDate(date)}</span>
          <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Elegir fecha" />
        </label>
        <button className="arrow" aria-label="Día siguiente" onClick={() => setDate(addDays(date, 1))}>›</button>
      </section>
      {!isToday && <button className="link center" onClick={() => setDate(today())}>Volver a hoy</button>}

      {!any && <div className="empty">Sin menú programado para esta fecha.</div>}

      <div className="meals">
        {MEALS.filter((m) => m.main).map((m) => (
          <button key={m.key} className={`meal-btn meal-${m.key}`} onClick={() => go({ screen: 'meal', meal: m.key, person: 'todos' })}>
            <span className="meal-name">{m.short}</span>
            <span className="meal-sub">{count(m.key)} de {people.length} con menú</span>
          </button>
        ))}
      </div>
      <div className="snacks">
        {MEALS.filter((m) => !m.main).map((m) => (
          <button key={m.key} className="snack-btn" onClick={() => go({ screen: 'meal', meal: m.key, person: 'todos' })}>
            {m.short} <small>· {count(m.key)}</small>
          </button>
        ))}
      </div>

      <div className="cards">
        <button className="card" onClick={() => go({ screen: 'shop' })}><span className="card-ico">🛒</span><b>Lista del súper</b><span className="muted">Día, semana o rango</span></button>
        <button className="card" onClick={() => go({ screen: 'admin' })}><span className="card-ico">📋</span><b>Planes y perfiles</b><span className="muted">{s.plans.filter((p) => p.status === 'borrador').length} por revisar</span></button>
      </div>
    </div>
  );
}
