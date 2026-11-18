import { useMemo, useState } from 'react';
import type { Nav } from '../App';
import { MEALS } from '../types';
import { addDays, mondayOf, range, shortDate } from '../dates';
import { useStore } from '../store';
import { aggregate, collect, fmtPieces, fmtQty, toLb, type Group } from '../logic';
import { CATEGORIES } from '../catalog';

type Preset = 'hoy' | 'manana' | 'semana' | 'proxima' | 'custom';

export default function Shopping({ date, go }: { date: string; go: (n: Nav) => void }) {
  const { s, set } = useStore();
  const [preset, setPreset] = useState<Preset>('semana');
  const [from, setFrom] = useState(date);
  const [to, setTo] = useState(addDays(date, 6));
  const [open, setOpen] = useState<string | null>(null);
  const [hideBought, setHideBought] = useState(false);

  const [f, t] = (() => {
    switch (preset) {
      case 'hoy': return [date, date];
      case 'manana': return [addDays(date, 1), addDays(date, 1)];
      case 'semana': return [mondayOf(date), addDays(mondayOf(date), 6)];
      case 'proxima': return [date, addDays(date, 6)];
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
      gs.forEach((g) => lines.push(`☐ ${g.name}: ${g.noAmount ? 'revisar cantidad' : fmtQty(need(g), g.unit)}${g.pieces ? ` (${fmtPieces(g.pieces)})` : ''}${g.estado === 'cocido' ? ' · medido cocido' : ''}`));
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
      <div className="seg wrap noprint">
        {([['hoy', 'Este día'], ['manana', 'Día siguiente'], ['semana', 'Semana (lun–dom)'], ['proxima', 'Próximos 7 días'], ['custom', 'Personalizado']] as [Preset, string][]).map(([k, l]) => (
          <button key={k} className={preset === k ? 'on' : ''} onClick={() => setPreset(k)}>{l}</button>
        ))}
      </div>
      {preset === 'custom' && (
        <div className="range noprint">
          <label>Desde <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label>Hasta <input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        </div>
      )}
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
                        {g.noAmount ? 'Revisar' : fmtQty(need(g), g.unit)}
                        {g.unit === 'g' && !g.noAmount && need(g) >= 200 && <small> ≈ {toLb(need(g))}</small>}
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
                    {stock > 0 && <em className="tag">en casa: {fmtQty(stock, g.unit)}</em>}
                  </div>
                  {open === g.key && (
                    <div className="detail">
                      <p className="small">Total del periodo: <b>{fmtQty(g.total, g.unit)}</b></p>
                      {g.unit && (
                        <label className="small">Ya hay en casa ({g.unit}):{' '}
                          <input type="number" min={0} inputMode="decimal" value={stock || ''} placeholder="0"
                            onChange={(e) => set((st) => ({ ...st, stock: { ...st.stock, [g.key]: Math.max(0, Number(e.target.value) || 0) } }))} />
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
