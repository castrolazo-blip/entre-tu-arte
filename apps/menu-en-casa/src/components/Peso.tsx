import { useState } from 'react';
import { useStore } from '../store';
import { shortDate } from '../dates';
import { CAMPOS, historial, leerBascula, medKey, type Campo, type Medicion } from '../bascula';

/** «Mi peso»: leer la foto de la báscula (en el teléfono, sin subirla) y llevar el historial. */
export default function Peso({ person, date, onClose }: { person: string; date: string; onClose: () => void }) {
  const { s } = useStore();
  const [tab, setTab] = useState<'nueva' | 'historial'>(historial(s.registro, person).length ? 'historial' : 'nueva');
  const who = s.people.find((p) => p.id === person)?.name ?? '';
  return (
    <div className="modal" onClick={onClose}>
      <div className="sheet" onClick={(ev) => ev.stopPropagation()}>
        <h2>Mi peso · {who}</h2>
        <div className="seg">
          <button className={tab === 'nueva' ? 'on' : ''} onClick={() => setTab('nueva')}>Nueva medición</button>
          <button className={tab === 'historial' ? 'on' : ''} onClick={() => setTab('historial')}>Historial</button>
        </div>
        {tab === 'nueva' ? <Nueva person={person} date={date} onSaved={() => setTab('historial')} /> : <Historial person={person} />}
      </div>
    </div>
  );
}

function Nueva({ person, date, onSaved }: { person: string; date: string; onSaved: () => void }) {
  const { s, set } = useStore();
  const prev = s.registro[medKey(person, date)] as Medicion | undefined;
  const [fecha, setFecha] = useState(date);
  const [vals, setVals] = useState<Partial<Record<Campo, string>>>(() =>
    Object.fromEntries(CAMPOS.filter((c) => prev?.[c.k] != null).map((c) => [c.k, String(prev![c.k])])));
  const [leidos, setLeidos] = useState<Set<Campo>>(new Set());
  const [estado, setEstado] = useState('');
  const [busy, setBusy] = useState(false);

  const leerFoto = async (file: File) => {
    setBusy(true); setEstado('Preparando lector… (la primera vez tarda un poco)');
    try {
      const { createWorker } = await import('tesseract.js');
      // Todo se sirve desde este mismo sitio (carpeta ocr/), sin servidores externos.
      const base = new URL('ocr/', document.baseURI).href;
      const worker = await createWorker('spa', 1, {
        workerPath: `${base}worker.min.js`, corePath: base, langPath: base, workerBlobURL: false,
        logger: (m: { status: string; progress: number }) => { if (m.status === 'recognizing text') setEstado(`Leyendo la foto… ${Math.round(m.progress * 100)} %`); },
      });
      const { data } = await worker.recognize(file);
      await worker.terminate();
      const r = leerBascula(data.text);
      const ks = Object.keys(r) as Campo[];
      setVals((v) => ({ ...v, ...Object.fromEntries(ks.map((k) => [k, String(r[k])])) }));
      setLeidos(new Set(ks));
      setEstado(ks.length ? `Leí ${ks.length} valores. Revísalos y corrige lo que haga falta antes de guardar.` : 'No pude leer los valores. Prueba con una captura de pantalla más nítida o escríbelos.');
    } catch {
      setEstado('No se pudo leer la foto. Puedes escribir los valores.');
    }
    setBusy(false);
  };
  const num = (k: Campo) => { const v = vals[k]; return v != null && v !== '' ? Number(String(v).replace(',', '.')) : undefined; };
  const peso = num('peso_lb');
  const save = () => {
    const m: Medicion = { person, date: fecha, at: new Date().toISOString(), peso_lb: peso! };
    for (const c of CAMPOS) { const v = num(c.k); if (v != null && !Number.isNaN(v)) (m as unknown as Record<string, number>)[c.k] = v; }
    set((st) => ({ ...st, registro: { ...st.registro, [medKey(person, fecha)]: m } }));
    onSaved();
  };
  return (
    <>
      <label className="foto">
        <span className="btn primary block">{busy ? '⏳ Leyendo…' : '📷 Subir foto o captura de la báscula'}</span>
        <input type="file" accept="image/*" hidden disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) leerFoto(f); }} />
      </label>
      <p className="small muted">La foto se lee aquí en el teléfono y no se guarda; solo se guardan los números.</p>
      {estado && <p className="banner">{estado}</p>}
      <label>Fecha<input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></label>
      <div className="grid2">
        {CAMPOS.map((c) => (
          <label key={c.k} className={leidos.has(c.k) ? 'leido' : ''}>{c.l}
            <input type="number" inputMode="decimal" step="any" value={vals[c.k] ?? ''} onChange={(e) => setVals((v) => ({ ...v, [c.k]: e.target.value }))} />
          </label>
        ))}
      </div>
      {peso != null && (peso < 40 || peso > 600) && <p className="banner">Revisa el peso: debe estar en libras.</p>}
      <button className="btn primary block" disabled={busy || peso == null || peso < 40 || peso > 600} onClick={save}>Guardar medición</button>
    </>
  );
}

function Historial({ person }: { person: string }) {
  const { s, set } = useStore();
  const h = historial(s.registro, person);
  if (!h.length) return <p className="empty">Todavía no hay mediciones. Sube la foto de la báscula en «Nueva medición».</p>;
  const del = (m: Medicion) => confirm(`¿Borrar la medición del ${shortDate(m.date)}?`) &&
    set((st) => { const r = { ...st.registro }; delete r[medKey(person, m.date)]; return { ...st, registro: r }; });
  const first = h[0], last = h[h.length - 1];
  const delta = (a?: number, b?: number) => (a != null && b != null ? Math.round((a - b) * 10) / 10 : null);
  const d = delta(last.peso_lb, first.peso_lb);
  return (
    <>
      {h.length > 1 && (
        <div className={`veredicto ${d! < 0 ? 'bien' : d! > 0 ? 'mal' : 'neutro'}`}>
          <b>{d! > 0 ? '+' : ''}{d} lb</b>
          <span>desde el {shortDate(first.date)} ({first.peso_lb} → {last.peso_lb} lb)
            {delta(last.grasa_pct, first.grasa_pct) != null && ` · grasa ${delta(last.grasa_pct, first.grasa_pct)! > 0 ? '+' : ''}${delta(last.grasa_pct, first.grasa_pct)} %`}</span>
        </div>
      )}
      <Grafica h={h} />
      {[...h].reverse().map((m, i, arr) => {
        const ant = arr[i + 1];
        const dp = ant ? delta(m.peso_lb, ant.peso_lb) : null;
        return (
          <div key={m.date} className="plan">
            <div className="plan-head">
              <span><b>{shortDate(m.date)}</b> · {m.peso_lb} lb{dp != null && <span className={dp < 0 ? 'ok' : dp > 0 ? 'err' : 'muted'}> ({dp > 0 ? '+' : ''}{dp})</span>}</span>
              <button className="x" aria-label="Borrar" onClick={() => del(m)}>✕</button>
            </div>
            <p className="small muted">{CAMPOS.filter((c) => c.k !== 'peso_lb' && m[c.k] != null).map((c) => `${c.l}: ${m[c.k]}`).join(' · ')}</p>
          </div>
        );
      })}
    </>
  );
}

/** Línea del peso en el tiempo. */
function Grafica({ h }: { h: Medicion[] }) {
  if (h.length < 2) return null;
  const W = 320, H = 120, P = 24;
  const ys = h.map((m) => m.peso_lb), min = Math.min(...ys), max = Math.max(...ys), span = max - min || 1;
  const pts = h.map((m, i) => [P + (i * (W - 2 * P)) / (h.length - 1), H - P - ((m.peso_lb - min) / span) * (H - 2 * P)] as const);
  return (
    <svg className="grafica" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Peso en el tiempo">
      <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" />
      {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3.5" fill="var(--accent)" />)}
      <text x={P} y={H - 6} fontSize="10" fill="var(--muted)">{shortDate(h[0].date)}</text>
      <text x={W - P} y={H - 6} fontSize="10" fill="var(--muted)" textAnchor="end">{shortDate(h[h.length - 1].date)}</text>
      <text x={4} y={pts[0][1] - 6} fontSize="10" fill="var(--muted)">{h[0].peso_lb}</text>
      <text x={W - 4} y={pts[pts.length - 1][1] - 6} fontSize="10" fill="var(--muted)" textAnchor="end">{h[h.length - 1].peso_lb}</text>
    </svg>
  );
}
