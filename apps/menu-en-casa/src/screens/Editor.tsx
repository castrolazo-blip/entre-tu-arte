import { useMemo, useState } from 'react';
import type { Nav } from '../App';
import { MEALS, type Plan } from '../types';
import { addDays, mondayOf, today } from '../dates';
import { saveFile, useStore } from '../store';
import { DAY_NAMES, parsePlan } from '../parser';
import { openOriginal } from './Admin';

const TEMPLATE = `## Lunes
### Desayuno: Nombre del platillo
- Pan integral o masa madre tostado [Pan integral; Pan de masa madre] | 1 pieza | 35 g
- Arroz integral cocido | ⅓ taza | 42 g #cocido
> Nota de la nutricionista
### Comida: ...
`;

export default function Editor({ planId, go }: { planId: string | null; go: (n: Nav) => void }) {
  const { s, set } = useStore();
  const orig = s.plans.find((p) => p.id === planId) ?? null;
  const admin = s.role === 'admin';
  const ro = !admin;
  const mon = mondayOf(today());
  const [personId, setPersonId] = useState(orig?.personId ?? s.people[0]?.id);
  const [title, setTitle] = useState(orig?.title ?? 'Plan semanal');
  const [start, setStart] = useState(orig?.start ?? mon);
  const [end, setEnd] = useState(orig?.end ?? addDays(mon, 6));
  const [source, setSource] = useState(orig?.source ?? TEMPLATE);
  const [file, setFile] = useState<File | null>(null);
  const [checked, setChecked] = useState(false);
  const [tab, setTab] = useState<'texto' | 'vista'>(ro ? 'vista' : 'texto');
  const r = useMemo(() => parsePlan(source), [source]);
  const errors = r.issues.filter((i) => i.level === 'error');
  const now = () => new Date().toISOString();

  const save = async (activate: boolean) => {
    if (end < start) { alert('La fecha final es anterior a la inicial.'); return; }
    // Un plan ya aprobado no se modifica: se crea una nueva versión (RN-04, historial).
    const editingApproved = orig && orig.status !== 'borrador';
    const id = !orig || editingApproved ? `${personId}-${Date.now()}` : orig.id;
    let fileId = orig?.fileId, fileName = orig?.fileName;
    if (file) { fileId = `file-${id}`; fileName = file.name; await saveFile(fileId, file); }
    const base: Plan = {
      id, personId: personId!, title, source, start, end, fileId, fileName,
      status: activate ? 'activo' : 'borrador',
      version: editingApproved ? orig.version + 1 : orig?.version ?? 1,
      createdAt: orig && !editingApproved ? orig.createdAt : now(),
      approvedAt: activate ? now() : undefined,
      history: [...(orig && !editingApproved ? orig.history : editingApproved ? [{ at: now(), what: `Nueva versión basada en v${orig.version}` }] : [{ at: now(), what: file ? `Documento «${file.name}» cargado` : 'Creado' }]),
        { at: now(), what: activate ? 'Revisado y activado por administrador' : 'Borrador guardado' }],
    };
    set((st) => {
      let plans = st.plans.filter((p) => p.id !== id);
      if (activate) plans = plans.map((p) => (p.personId === personId && p.status === 'activo' && p.start <= end && start <= p.end
        ? { ...p, status: 'archivado' as const, history: [...p.history, { at: now(), what: `Archivado: reemplazado por «${title}» desde ${start}` }] } : p));
      return { ...st, plans: [...plans, base] };
    });
    go({ screen: 'admin' });
  };

  return (
    <div className="page">
      <div className="sticky">
        <button className="back" onClick={() => go({ screen: 'admin' })}>‹ Planes</button>
        <div className="crumb"><b>{orig ? (ro ? 'Plan' : 'Revisar plan') : 'Nuevo plan'}</b>{orig && <span className={`badge ${orig.status}`}>{orig.status}</span>}</div>
      </div>
      {orig && orig.status !== 'borrador' && admin && <p className="banner">Este plan ya fue aprobado. Al guardar se crea una nueva versión en borrador; la anterior queda en el historial.</p>}

      {s.people.length === 0 && <p className="banner">Todavía no hay integrantes. Ve a Planes y perfiles e importa el respaldo o toca «+ Agregar integrante».</p>}
      <div className="grid2">
        <label>Integrante<select disabled={ro} value={personId} onChange={(e) => setPersonId(e.target.value)}>{s.people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label>Título<input disabled={ro} value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <label>Vigente desde<input disabled={ro} type="date" value={start} onChange={(e) => setStart(e.target.value)} /></label>
        <label>Hasta<input disabled={ro} type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></label>
        {!ro && (
          <label className="span2">Documento original (PDF, imagen o Excel)
            <input type="file" accept="application/pdf,image/*,.xlsx,.xls,.csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
        )}
        {orig?.fileId && <button className="btn span2" onClick={() => openOriginal(orig)}>Abrir original: {orig.fileName}</button>}
        {orig?.fileName && !orig.fileId && <p className="small muted span2">Original: {orig.fileName} (transcrito; el PDF no está guardado en la app)</p>}
      </div>

      <div className="seg">
        {!ro && <button className={tab === 'texto' ? 'on' : ''} onClick={() => setTab('texto')}>Texto del plan</button>}
        <button className={tab === 'vista' ? 'on' : ''} onClick={() => setTab('vista')}>Vista previa</button>
      </div>

      {tab === 'texto' && !ro && (
        <>
          <details className="small help"><summary>Formato</summary>
            <p><code>## Lunes</code> día · <code>### Desayuno: Platillo</code> (Desayuno, Medio día, Comida, Media tarde, Cena)</p>
            <p><code>- Texto | medida casera | 35 g</code> alimento. Alternativas entre corchetes: <code>[Pan integral; Pan de masa madre]</code>. Marcas: <code>#cocido</code> <code>#crudo</code> <code>#opcional</code></p>
            <p><code>&gt; texto</code> nota u observación.</p>
            <p>Cambio con otra medida: <code>[Pechuga de pollo; Huevo entero @ 2 piezas]</code>. Platillo alternativo: <code>### Opción: Nombre</code> justo después del platillo.</p>
          </details>
          <textarea className="src" spellCheck={false} value={source} onChange={(e) => setSource(e.target.value)} />
        </>
      )}

      <div className="review">
        <b>Revisión:</b> {r.itemCount} alimentos · {errors.length} errores · {r.issues.length - errors.length} avisos
        {r.issues.length > 0 && <ul>{r.issues.map((i, k) => <li key={k} className={i.level}>Línea {i.line}: {i.problem} — <code>{i.text}</code></li>)}</ul>}
        {DAY_NAMES.map((d, i) => !r.week[i] && <span key={d} className="tag warn">{d} sin datos</span>)}
      </div>

      {tab === 'vista' && DAY_NAMES.map((d, i) => (
        <details key={d} className="day" open={ro && i === 0}>
          <summary>{d}</summary>
          {MEALS.map((m) => (r.week[i]?.[m.key] ?? []).map((dish, k) => (
            <div key={m.key + k} className="dish">
              <p className="eyebrow">{m.short}</p>
              <h3>{dish.name}</h3>
              <ul className="items">{dish.items.map((it, j) => (
                <li key={j}><div className="item-row"><span className="item-name">{it.label}{it.options.length > 1 && <em className="tag">{it.options.length} alternativas</em>}{it.estado && <em className="tag">{it.estado}</em>}</span>
                  <span className="item-qty">{it.measure} {it.amount != null ? <b>{it.amount} {it.unit}</b> : <b className="warn">sin cantidad</b>}</span></div></li>))}</ul>
              {dish.notes.map((n, j) => <p key={j} className="note">{n}</p>)}
              {dish.alts?.map((a, j) => <p key={'a' + j} className="note"><b>Opción de cambio:</b> {a.name} — {a.items.map((x) => x.label).join(', ')}</p>)}
            </div>
          )))}
        </details>
      ))}

      {!ro && (
        <div className="savebar">
          <button className="btn" onClick={() => save(false)}>Guardar borrador</button>
          <label className="check small"><input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} /> Revisé los datos contra el documento original</label>
          <button className="btn primary" disabled={!checked || errors.length > 0 || r.itemCount === 0} onClick={() => save(true)}>Aprobar y activar</button>
        </div>
      )}
    </div>
  );
}
