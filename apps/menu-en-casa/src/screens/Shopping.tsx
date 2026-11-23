import { useMemo, useState } from 'react';
import type { Nav } from '../App';
import { MEALS } from '../types';
import { addDays, mondayOf, range, shortDate } from '../dates';
import { useStore } from '../store';
import { aggregate, collect, fmtBuy, fmtPieces, fromStock, stockUnit, toStock, type Group, type UnitSystem } from '../logic';
import { CATEGORIES } from '../catalog';

type Preset = 'semana' | 'quincena' | 'mes' | 'custom';

/** Quincena del calendario: del 1 al 15, o del 16 al último día del mes. */
function quincena(d: string): [string, string] {
  const [y, m, day] = d.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  const p = (n: number) => `${y}-${String(m).padStart(2, '0')}-${String(n).padStart(2, '0')}`;
  return day <= 15 ? [p(1), p(15)] : [p(16), p(last)];
}
const readSys = (): UnitSystem => { try { return localStorage.getItem('menu:unidades') === 'g' ? 'g' : 'lb'; } catch { return 'lb'; } };

export default function Shopping({ date, go }: { date: string; go: (n: Nav) => void }) {
  const { s, set } = useStore();
  const [preset, setPreset] = useState<Preset>('quincena');
  const [sys, setSysState] = useState<UnitSystem>(readSys);
  const setSys = (v: UnitSystem) => { setSysState(v); try { localStorage.setItem('menu:unidades', v); } catch { /* ignore */ } };
  const [from, setFrom] = useState(date);
  const [to, setTo] = useState(addDays(date, 6));
  const [open, setOpen] = useState<string | null>(null);
  const [hideBought, setHideBought] = useState(false);

  const [f, t] = (() => {
    switch (preset) {
      case 'mes': { const [y, m] = date.split('-').map(Number); return [`${y}-${String(m).padStart(2, '0')}-01`, `${y}-${String(m).padStart(2, '0')}-${new Date(y, m, 0).getDate()}`]; }
      case 'semana': return [mondayOf(date), addDays(mondayOf(date), 6)];
      case 'quincena': return quincena(date);
      default: return from <= to ? [from, to] : [to, from];
    }
  })();
  const people = s.people.filter((p) => p.active);
  const dates = range(f, t);
  const cs = useMemo(() => collect(s.plans, people, dates, MEALS.map((m) => m.key), s.choices), [s.plans, s.choices, people, f, t]);
  const groups = useMemo(() => aggregate(cs), [cs]);
  const period = `${f}_${t}`;
  const bkey = (g: Group) => `${period}|${g.key}`;
  const need = (g: Group) => Math.max(0, g.total - (s.stock[g.key] ?? 0));
  const daysWithout = dates.filter((d) => !cs.some((c) => c.date === d));
  const pending = groups.filter((g) => !s.bought[bkey(g)]);

  const text = () => {
    const lines = [`Lista del súper · ${shortDate(f)} a ${shortDate(t)}`];
    for (const c of CATEGORIES) {
      const gs = groups.filter((g) => g.category === c.key && !s.bought[bkey(g)]);
      if (!gs.length) continue;
      lines.push('', `${c.icon} ${c.label}`);
      gs.forEach((g) => lines.push(`☐ ${g.name}: ${g.noAmount ? 'revisar cantidad' : fmtBuy(need(g), g.unit, sys)}${g.pieces ? ` (${fmtPieces(g.pieces)})` : ''}${g.estado === 'cocido' ? ' · medido cocido' : ''}`));
    }
    return lines.join('\n');
  };
  const share = async () => {
    const t2 = text();
    try { if (navigator.share) { await navigator.share({ title: 'Lista del súper', text: t2 }); return; } } catch { return; }
    try { await navigator.clipboard.writeText(t2); alert('Lista copiada. Pégala en WhatsApp o notas.'); } catch { alert(t2); }
  };

  return (
    <div className="page">
      <div className="sticky">
        <button className="back" onClick={() => go({ screen: 'home' })}>‹ Inicio</button>
        <div className="crumb"><b>Lista del súper</b><span>{shortDate(f)} – {shortDate(t)}</span></div>
      </div>
      <div className="seg noprint">
        {([['semana', 'Semana'], ['quincena', 'Quincena'], ['mes', 'Mes'], ['custom', 'Personalizado']] as [Preset, string][]).map(([k, l]) => (
          <button key={k} className={preset === k ? 'on' : ''} onClick={() => setPreset(k)}>{l}</button>
        ))}
      </div>
      {preset === 'custom' && (
        <div className="range noprint">
          <label>Desde <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label>Hasta <input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        </div>
      )}
      <div className="seg noprint" role="group" aria-label="Unidades">
        <button className={sys === 'lb' ? 'on' : ''} onClick={() => setSys('lb')}>Libras y onzas</button>
        <button className={sys === 'g' ? 'on' : ''} onClick={() => setSys('g')}>Gramos y kilos</button>
      </div>
      <div className="toolbar noprint">
        <span className="muted small">{pending.length} pendientes de {groups.length}</span>
        <label className="small"><input type="checkbox" checked={hideBought} onChange={(e) => setHideBought(e.target.checked)} /> Ocultar comprados</label>
        <button className="btn" onClick={share}>Compartir</button>
        <button className="btn" onClick={() => window.print()}>Imprimir</button>
      </div>
      {daysWithout.length > 0 && <p className="banner">Días sin ningún menú programado en el rango: {daysWithout.map(shortDate).join(', ')}.</p>}
      <p className="muted small">Se suman todas las comidas del periodo, solo con la alternativa elegida (o la 1.ª si no se eligió). Las cantidades son de consumo: no se convierten a crudo ni a empaques sin un factor validado.</p>

      {CATEGORIES.map((c) => {
        const gs = groups.filter((g) => g.category === c.key && !(hideBought && s.bought[bkey(g)]));
        if (!gs.length) return null;
        return (
          <section key={c.key} className="cat">
            <h2>{c.icon} {c.label}</h2>
            {gs.map((g) => {
              const b = !!s.bought[bkey(g)];
              const stock = s.stock[g.key] ?? 0;
              return (
                <div key={g.key} className={`shop ${b ? 'bought' : ''}`}>
                  <div className="shop-row">
                    <input type="checkbox" checked={b} aria-label={`Comprado: ${g.name}`} onChange={() => set((st) => ({ ...st, bought: { ...st.bought, [bkey(g)]: !b } }))} />
                    <button className="shop-main" onClick={() => setOpen(open === g.key ? null : g.key)}>
                      <span className="shop-name">{g.name}</span>
                      <span className="shop-qty">
                        {g.noAmount ? 'Revisar' : fmtBuy(need(g), g.unit, sys)}
                        {g.pieces && <small> · {fmtPieces(g.pieces)}</small>}
                      </span>
                    </button>
                  </div>
                  <div className="flags">
                    {g.estado === 'cocido' && <em className="tag warn">medido cocido · sin factor crudo validado</em>}
                    {g.estado === 'crudo' && <em className="tag">crudo</em>}
                    {g.generic && <em className="tag">al gusto: definir cuál</em>}
                    {g.preparation && <em className="tag">receta casera: ingredientes no detallados</em>}
                    {g.defaulted && <em className="tag warn">incluye alternativas sin elegir</em>}
                    {g.optional && <em className="tag">incluye opcionales</em>}
                    {stock > 0 && <em className="tag">en casa: {fmtBuy(stock, g.unit, sys)}</em>}
                  </div>
                  {open === g.key && (
                    <div className="detail">
                      <p className="small">Total del periodo: <b>{fmtBuy(g.total, g.unit, sys)}</b>{sys === 'lb' && <span className="muted"> ({fmtBuy(g.total, g.unit, 'g')})</span>}</p>
                      {g.unit && (
                        <label className="small">Ya hay en casa ({stockUnit(g.unit, sys)}):{' '}
                          <input key={sys} type="number" min={0} step="any" inputMode="decimal" defaultValue={stock ? Math.round(fromStock(stock, g.unit, sys) * 10) / 10 : ''} placeholder="0"
                            onChange={(e) => set((st) => ({ ...st, stock: { ...st.stock, [g.key]: Math.max(0, toStock(Number(e.target.value) || 0, g.unit, sys)) } }))} />
                        </label>
                      )}
                      <ul className="breakdown">
                        {g.contributions.map((c, i) => (
                          <li key={i}><span><span style={{ color: c.person.color }}>{c.person.name}</span> · {shortDate(c.date)} · {MEALS.find((m) => m.key === c.meal)!.short}</span><span>{c.item.measure} {c.item.amount != null && `${c.item.amount} ${c.item.unit}`}</span></li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        );
      })}
      {groups.length === 0 && <div className="empty">No hay menús programados en este periodo.</div>}
    </div>
  );
}
