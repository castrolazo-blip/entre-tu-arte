import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { cloud, HOGAR } from './cloud';
import type { Person, Plan, Role } from './types';
import { SEED_PEOPLE, SEED_PLANS, SEED_VERSION } from './seed';

export interface State {
  seed: number;
  people: Person[];
  plans: Plan[];
  choices: Record<string, number>;   // alternativa elegida por comida/persona/alimento
  ready: Record<string, boolean>;    // platillos marcados como listos
  bought: Record<string, boolean>;   // artículos comprados (por periodo)
  stock: Record<string, number>;     // inventario en casa (g/ml) por ingrediente
  role: Role;
  pin: string;
}

/** Estado de la conexión en línea. 'local' = sin Supabase (todo en el teléfono). */
export type Sync = 'local' | 'cargando' | 'sin-sesion' | 'sin-acceso' | 'listo' | 'error';
const DICTS = ['choices', 'ready', 'bought', 'stock'] as const;

const KEY = 'menu-en-casa:v1';
function load(): State {
  const base: State = { seed: SEED_VERSION, people: SEED_PEOPLE, plans: SEED_PLANS, choices: {}, ready: {}, bought: {}, stock: {}, role: 'cocina', pin: '1234' };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved: State = { ...base, ...JSON.parse(raw) };
      // Planes iniciales nuevos: se agregan sin tocar lo que el usuario ya guardó.
      if ((saved.seed ?? 0) < SEED_VERSION) {
        // Los planes iniciales que nadie ha editado (1 entrada de historial) se actualizan; los editados se respetan.
        const seeds = new Map(SEED_PLANS.map((p) => [p.id, p]));
        saved.plans = saved.plans.map((p) => (seeds.has(p.id) && p.history.length === 1 ? seeds.get(p.id)! : p));
        const ids = new Set(saved.plans.map((p) => p.id));
        saved.plans = [...saved.plans, ...SEED_PLANS.filter((p) => !ids.has(p.id))];
        saved.seed = SEED_VERSION;
      }
      return saved;
    }
  } catch { /* sin almacenamiento: usar datos iniciales */ }
  return base;
}

interface Ctx { s: State; set: (f: (s: State) => State) => void; sync: Sync; email: string | null; reload: () => void; error: string }
const Ctx = createContext<Ctx | null>(null);

const EMPTY: State = { seed: SEED_VERSION, people: [], plans: [], choices: {}, ready: {}, bought: {}, stock: {}, role: 'integrante', pin: '' };

export function StoreProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<State>(() => (cloud ? EMPTY : load()));
  const [sync, setSync] = useState<Sync>(cloud ? 'cargando' : 'local');
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState('');
  const server = useRef<State | null>(null); // lo último que sabemos que tiene el servidor
  const base = useRef<string | null>(null);   // fecha de la versión de planes que tenemos

  // Modo local: guardar en el teléfono
  useEffect(() => { if (!cloud) try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ } }, [s]);

  const reload = useCallback(async () => {
    if (!cloud) return;
    const { data: ses } = await cloud.auth.getSession();
    if (!ses.session) { server.current = null; setEmail(null); setSync('sin-sesion'); return; }
    setEmail(ses.session.user.email ?? null);
    const { data: rol, error: e1 } = await cloud.rpc('menu_rol');
    if (e1) { setError(e1.message); setSync('error'); return; }
    if (!rol) { setSync('sin-acceso'); return; }
    const [pl, co] = await Promise.all([
      cloud.from('menu_planes').select('people, plans, actualizado').eq('hogar', HOGAR).maybeSingle(),
      cloud.from('menu_cocina').select('choices, ready, bought, stock').eq('hogar', HOGAR).maybeSingle(),
    ]);
    if (pl.error || co.error) { setError((pl.error ?? co.error)!.message); setSync('error'); return; }
    const next: State = { ...EMPTY, role: rol as Role, people: pl.data?.people ?? [], plans: pl.data?.plans ?? [],
      choices: co.data?.choices ?? {}, ready: co.data?.ready ?? {}, bought: co.data?.bought ?? {}, stock: co.data?.stock ?? {} };
    base.current = pl.data?.actualizado ?? null;
    server.current = next;
    setS(next);
    setError('');
    setSync('listo');
  }, []);

  useEffect(() => {
    if (!cloud) return;
    reload();
    const { data: sub } = cloud.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_IN' || ev === 'SIGNED_OUT') reload(); });
    // Ver lo que cambiaron otros teléfonos: al volver a la app y cada minuto
    const onVis = () => document.visibilityState === 'visible' && reload();
    document.addEventListener('visibilitychange', onVis);
    const t = setInterval(() => document.visibilityState === 'visible' && reload(), 60000);
    return () => { sub.subscription.unsubscribe(); document.removeEventListener('visibilitychange', onVis); clearInterval(t); };
  }, [reload]);

  // Enviar al servidor solo lo que cambió. Cada marca de la cocina se guarda por separado
  // (función menu_cocina_cambiar), así dos teléfonos no se pisan.
  useEffect(() => {
    const prev = server.current;
    if (!cloud || sync !== 'listo' || !prev || prev === s) return;
    server.current = s;
    const jobs: PromiseLike<{ error: { message: string } | null }>[] = [];
    for (const campo of DICTS) {
      const a = prev[campo] as Record<string, unknown>, b = s[campo] as Record<string, unknown>;
      if (a === b) continue;
      for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
        if (a[k] !== b[k]) jobs.push(cloud.rpc('menu_cocina_cambiar', { p_hogar: HOGAR, p_campo: campo, p_clave: k, p_valor: b[k] ?? null }));
      }
    }
    if ((prev.people !== s.people || prev.plans !== s.plans) && s.role === 'admin') {
      // Solo se guarda si nadie cambió los planes desde que los cargamos (protege contra datos viejos)
      jobs.push(cloud.rpc('menu_planes_guardar', { p_hogar: HOGAR, p_people: s.people, p_plans: s.plans, p_base: base.current })
        .then((r) => { if (!r.error) base.current = r.data as string; return r; }));
    }
    Promise.all(jobs).then((rs) => {
      const e = rs.find((r) => r.error)?.error;
      if (e) {
        setError(e.message.includes('menu:desactualizado')
          ? 'Otro teléfono cambió los planes mientras editabas. Se cargó la versión más reciente; repite tu cambio.'
          : `No se pudo guardar: ${e.message}`);
        reload();
      }
    });
  }, [s, sync, reload]);

  return <Ctx.Provider value={{ s, set: setS, sync, email, reload, error }}>{children}</Ctx.Provider>;
}
export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error('StoreProvider');
  return c;
}

// ── Documentos originales (PDF / imagen / Excel) en IndexedDB ──
function db(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open('menu-en-casa-files', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('files');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
export async function saveFile(id: string, file: Blob) {
  const d = await db();
  await new Promise<void>((res, rej) => { const t = d.transaction('files', 'readwrite'); t.objectStore('files').put(file, id); t.oncomplete = () => res(); t.onerror = () => rej(t.error); });
}
export async function getFile(id: string): Promise<Blob | undefined> {
  const d = await db();
  return new Promise((res, rej) => { const r = d.transaction('files').objectStore('files').get(id); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
}
