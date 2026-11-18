import { useMemo, useState } from 'react';
import type { Nav } from '../App';
import { MEALS, type MealKey, type Person } from '../types';
import { shortDate, longDate } from '../dates';
import { useStore } from '../store';
import { aggregate, chosenDishes, choiceKey, collect, dishesFor, fmtPieces, fmtQty, pickItem } from '../logic';
import { norm } from '../parser';
import DishCard from '../components/DishCard';
import { add, fmtKcal, fmtMacros, mealNut, ZERO } from '../nutrition';

export default function MealScreen({ date, meal, person, go }: { date: string; meal: MealKey; person: string; go: (n: Nav) => void }) {
  const { s } = useStore();
  const m = MEALS.find((x) => x.key === meal)!;
  const people = s.people.filter((p) => p.active);
  return (
    <div className="page">
      <div className="sticky">
        <button className="back" onClick={() => go({ screen: 'home' })}>‹ Inicio</button>
        <div className="crumb"><b>{m.short}</b><span>{shortDate(date)}</span></div>
      </div>
      <div className="people">
        {people.map((p) => (
          <button key={p.id} className={`person ${person === p.id ? 'on' : ''}`} style={{ ['--pc' as string]: p.color }}
            onClick={() => go({ screen: 'meal', meal, person: p.id })}>{p.name}</button>
        ))}
        <button className={`person todos ${person === 'todos' ? 'on' : ''}`} onClick={() => go({ screen: 'meal', meal, person: 'todos' })}>Todos</button>
      </div>
      <div className="mealtabs">
        {MEALS.map((x) => (
          <button key={x.key} className={x.key === meal ? 'on' : ''} onClick={() => go({ screen: 'meal', meal: x.key, person })}>{x.short}</button>
        ))}
      </div>
      {person === 'todos' ? <Everyone date={date} meal={meal} people={people} /> : <PersonView date={date} meal={meal} p={people.find((x) => x.id === person)!} />}
    </div>
  );
}

function PersonView({ date, meal, p }: { date: string; meal: MealKey; p: Person }) {
  const { s } = useStore();
  if (!p) return null;
  const { plan, dishes } = dishesFor(s.plans, p.id, date, meal);
  return (
    <section>
      <h2 className="who" style={{ color: p.color }}>{p.alias}</h2>
      {p.restrictions && <p className="restr">Restricciones: {p.restrictions}</p>}
      {!plan && <div className="empty">Sin menú programado: {p.name} no tiene un plan activo para el {longDate(date)}.</div>}
      {plan && dishes.length === 0 && <div className="empty">El plan de {p.name} no indica nada para este tiempo de comida.</div>}
      {plan && dishes.length > 0 && <Kcal personId={p.id} date={date} meal={meal} />}
      {dishes.map((d, di) => <DishCard key={di} dish={d} di={di} date={date} meal={meal} personId={p.id} />)}
      {plan && <p className="muted small">Plan: {plan.title} · versión {plan.version} · vigente {plan.start} a {plan.end}</p>}
    </section>
  );
}

type View = 'persona' | 'platillo' | 'ingrediente';
function Everyone({ date, meal, people }: { date: string; meal: MealKey; people: Person[] }) {
  const { s, set } = useStore();
  const [view, setView] = useState<View>('platillo');
  const groups = useMemo(() => aggregate(collect(s.plans, people, [date], [meal], s.choices)), [s.plans, s.choices, people, date, meal]);
  const byDish = useMemo(() => {
    const map = new Map<string, { name: string; rows: { p: Person; di: number; ai: number; dish: ReturnType<typeof dishesFor>['dishes'][number] }[] }>();
    for (const p of people) chosenDishes(s.plans, p.id, date, meal, s.choices).forEach(({ dish, di, ai }) => {
      const k = norm(dish.name);
      if (!map.has(k)) map.set(k, { name: dish.name, rows: [] });
      map.get(k)!.rows.push({ p, di, ai, dish });
    });
    return [...map.entries()];
  }, [s.plans, s.choices, people, date, meal]);
  const missing = people.filter((p) => !dishesFor(s.plans, p.id, date, meal).plan);

  return (
    <section>
      <div className="seg">
        {(['platillo', 'persona', 'ingrediente'] as View[]).map((v) => (
          <button key={v} className={view === v ? 'on' : ''} onClick={() => setView(v)}>
            {{ platillo: 'Por platillo', persona: 'Por persona', ingrediente: 'Ingredientes' }[v]}
          </button>
        ))}
      </div>
      {missing.length > 0 && <p className="banner">Sin plan activo esta fecha: {missing.map((p) => p.name).join(', ')}.</p>}
      {byDish.length === 0 && <div className="empty">Sin menú programado.</div>}

      {view === 'persona' && people.map((p) => {
        const { dishes } = dishesFor(s.plans, p.id, date, meal);
        if (!dishes.length) return null;
        return (
          <div key={p.id} className="pblock" style={{ ['--pc' as string]: p.color }}>
            <h2 className="who">{p.name}</h2>
            <Kcal personId={p.id} date={date} meal={meal} compact />
            {dishes.map((d, di) => <DishCard key={di} dish={d} di={di} date={date} meal={meal} personId={p.id} />)}
          </div>
        );
      })}

      {view === 'platillo' && byDish.map(([k, g]) => {
        const rk = `${date}|${meal}|${k}`;
        const ready = !!s.ready[rk];
        return (
          <div key={k} className={`dish ${ready ? 'done' : ''}`}>
            <div className="dish-head">
              <h3>{g.name}</h3>
              {s.role !== 'integrante' && (
                <button className={`ready ${ready ? 'on' : ''}`} onClick={() => set((st) => ({ ...st, ready: { ...st.ready, [rk]: !ready } }))}>{ready ? '✓ Listo' : 'Marcar listo'}</button>
              )}
            </div>
            <p className="muted small">Para: {g.rows.map((r) => r.p.name).join(', ')}</p>
            {g.rows.map(({ p, dish, di, ai }) => (
              <div key={p.id} className="portion" style={{ ['--pc' as string]: p.color }}>
                <b>{p.name}</b>
                <ul>{dish.items.map((it, i) => { const x = pickItem(it, s.choices[choiceKey(date, meal, p.id, di, i, ai)]); return <li key={i}>{it.options.length > 1 ? x.name : it.label} — {x.measure} {x.amount != null && `(${x.amount} ${x.unit})`}{it.estado && !x.own && ` · ${it.estado}`}</li>; })}</ul>
                {dish.notes.map((n, i) => <p key={i} className="note small">{n}</p>)}
              </div>
            ))}
          </div>
        );
      })}

      {view === 'ingrediente' && (
        <>
          <p className="muted small">Total para cocinar con desglose por persona. Solo se suman cantidades con la misma unidad y el mismo estado (crudo/cocido/no indicado).</p>
          {groups.map((g) => (
            <div key={g.key} className="ing">
              <div className="ing-head">
                <span>{g.name}{g.estado && <em className="tag">{g.estado}</em>}{g.defaulted && <em className="tag warn">alternativa sin elegir</em>}</span>
                <b>{g.noAmount ? 'Sin cantidad' : fmtQty(g.total, g.unit)}{g.pieces && <small> · {fmtPieces(g.pieces)}</small>}</b>
              </div>
              <ul className="breakdown">
                {g.contributions.map((c, i) => <li key={i}><span style={{ color: c.person.color }}>{c.person.name}</span> <span>{c.item.measure} {c.item.amount != null && `${c.item.amount} ${c.item.unit}`}</span></li>)}
              </ul>
            </div>
          ))}
        </>
      )}
    </section>
  );
}

/** Calorías estimadas de la comida y del día de una persona (informativo, RF-07). */
function Kcal({ personId, date, meal, compact }: { personId: string; date: string; meal: MealKey; compact?: boolean }) {
  const { s } = useStore();
  const m = mealNut(s.plans, personId, date, meal, s.choices);
  if (m.empty) return null;
  if (compact) return <p className="kcalbar compact">≈ {fmtKcal(m.total.kcal)} · {fmtMacros(m.total)}{m.missing.length > 0 && <span className="muted"> · sin calcular: {m.missing.join(', ')}</span>}</p>;
  let day = ZERO; const dayMissing: string[] = [];
  for (const x of MEALS) { const r = mealNut(s.plans, personId, date, x.key, s.choices); day = add(day, r.total); dayMissing.push(...r.missing); }
  return (
    <div className="kcalbar">
      <div><span className="eyebrow">Esta comida</span><b>≈ {fmtKcal(m.total.kcal)}</b><span className="small">{fmtMacros(m.total)}</span></div>
      <div><span className="eyebrow">Total del día</span><b>≈ {fmtKcal(day.kcal)}</b><span className="small">{fmtMacros(day)}</span></div>
      {m.missing.length > 0 && <p className="small warn">Sin calcular (falta peso o dato): {m.missing.join(', ')}</p>}
      {dayMissing.length > 0 && m.missing.length === 0 && <p className="small muted">El total del día no incluye: {[...new Set(dayMissing)].join(', ')}</p>}
      <p className="small muted">Estimación informativa con tabla USDA (carnes y granos cocidos){(m.total.approx || day.approx) ? '; algunos valores son aproximados (al gusto o receta casera)' : ''}. No cambia lo que indica la nutricionista.</p>
    </div>
  );
}
