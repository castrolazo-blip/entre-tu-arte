import { useState } from 'react';
import type { Dish, MealKey } from '../types';
import { useStore } from '../store';
import { choiceKey, hasChange, pickDish, pickItem } from '../logic';

/** Platillo de una persona. Si la nutricionista autorizó cambios, avisa y permite elegir. */
export default function DishCard({ dish: base, di, date, meal, personId }: { dish: Dish; di: number; date: string; meal: MealKey; personId: string }) {
  const { s, set } = useStore();
  const [open, setOpen] = useState(false);
  const dk = choiceKey(date, meal, personId, di, 'dish');
  const ai = Math.min(s.choices[dk] ?? 0, base.alts?.length ?? 0);
  const dish = pickDish(base, ai);
  const change = hasChange(base);
  const choose = (k: string, v: number) => set((st) => ({ ...st, choices: { ...st.choices, [k]: v } }));
  const changed = ai > 0 || dish.items.some((_, ii) => (s.choices[choiceKey(date, meal, personId, di, ii, ai)] ?? 0) > 0);

  return (
    <div className="dish">
      {change && (
        <div className="change">
          <span>🔄 Este menú tiene opción de cambio{changed && <b> · cambiado</b>}</span>
          <button className="change-btn" onClick={() => setOpen(!open)}>{open ? 'Listo' : 'Quiero ver'}</button>
        </div>
      )}
      <h3>{dish.name}</h3>

      {open && base.alts?.length ? (
        <div className="optbox">
          <p className="optlabel">Elige el platillo</p>
          <div className="chips">
            {[base, ...base.alts].map((d, i) => (
              <button key={i} className={`chip ${ai === i ? 'on' : ''}`} onClick={() => choose(dk, i)}>{i === 0 ? `${d.name} (del plan)` : d.name}</button>
            ))}
          </div>
        </div>
      ) : null}

      {dish.items.length > 0 && (
        <ul className="items">
          {dish.items.map((it, ii) => {
            const k = choiceKey(date, meal, personId, di, ii, ai);
            const p = pickItem(it, s.choices[k]);
            const multi = it.options.length > 1;
            return (
              <li key={ii}>
                <div className="item-row">
                  <span className="item-name">
                    {multi ? p.name : it.label}
                    {it.optional && <em className="tag">opcional</em>}
                    {it.estado && !p.own && <em className="tag">{it.estado}</em>}
                    {multi && !open && <em className="tag opt">{it.options.length} opciones</em>}
                  </span>
                  <span className="item-qty">
                    {p.measure && <span>{p.measure}</span>}
                    {p.amount != null ? <b>{p.amount} {p.unit}</b> : p.own ? null : <b className="warn">sin cantidad</b>}
                  </span>
                </div>
                {multi && open && (
                  <div className="optbox">
                    <p className="optlabel">Opciones para «{it.label}»</p>
                    <div className="chips">
                      {it.options.map((o, oi) => (
                        <button key={oi} className={`chip ${p.index === oi ? 'on' : ''}`} onClick={() => choose(k, oi)}>
                          {o}{it.optMeasure[oi] ? ` · ${it.optMeasure[oi]}` : ''}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {dish.notes.map((n, i) => <p key={i} className="note"><b>Nota:</b> {n}</p>)}
    </div>
  );
}
