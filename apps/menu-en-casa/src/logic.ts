import type { Dish, Item, MealKey, Person, Plan, Unit } from './types';
import { parsePlan, parseMeasure, norm } from './parser';
import { weekdayIdx } from './dates';
import { categoryOf, isGeneric, isPreparation, type Category } from './catalog';

const parsedCache = new Map<string, ReturnType<typeof parsePlan>>();
export function parsed(plan: Plan) {
  const k = plan.id + '::' + plan.source;
  let r = parsedCache.get(k);
  if (!r) { r = parsePlan(plan.source); parsedCache.set(k, r); }
  return r;
}

/** Plan vigente de una persona en una fecha (RN-06). Borradores nunca cuentan (CA-07).
 *  Los archivados siguen valiendo para su periodo, así el historial no cambia (RF-06). */
export function planFor(plans: Plan[], personId: string, date: string): Plan | null {
  const c = plans.filter((p) => p.personId === personId && p.status !== 'borrador' && p.start <= date && date <= p.end);
  c.sort((a, b) => (a.start === b.start ? b.version - a.version : b.start.localeCompare(a.start)));
  return c[0] ?? null;
}
export function dishesFor(plans: Plan[], personId: string, date: string, meal: MealKey): { plan: Plan | null; dishes: Dish[] } {
  const plan = planFor(plans, personId, date);
  if (!plan) return { plan: null, dishes: [] };
  return { plan, dishes: parsed(plan).week[weekdayIdx(date)]?.[meal] ?? [] };
}

/** di = platillo; ai = platillo alternativo (0 = el original); ii = alimento */
export const choiceKey = (date: string, meal: MealKey, personId: string, di: number, ii: number | 'dish', ai = 0) =>
  `${date}|${meal}|${personId}|${ai ? `${di}.${ai}` : di}|${ii}`;

/** Platillo efectivo según la opción elegida (0 = el del plan). */
export function pickDish(dish: Dish, ai: number | undefined): Dish {
  const all = [dish, ...(dish.alts ?? [])];
  return all[Math.min(ai ?? 0, all.length - 1)];
}
export const hasChange = (dish: Dish) => !!dish.alts?.length || dish.items.some((i) => i.options.length > 1);

/** Alimento efectivo según la alternativa elegida. Una alternativa con medida propia no tiene gramos conocidos. */
export function pickItem(item: Item, idx: number | undefined) {
  const i = Math.min(idx ?? 0, item.options.length - 1);
  const own = item.optMeasure?.[i];
  return { name: item.options[i], measure: own ?? item.measure, amount: own ? null : item.amount, unit: own ? null : item.unit, own: !!own, index: i };
}

export interface Chosen { dish: Dish; di: number; ai: number }
export function chosenDishes(plans: Plan[], personId: string, date: string, meal: MealKey, choices: Record<string, number>): Chosen[] {
  return dishesFor(plans, personId, date, meal).dishes.map((d, di) => {
    const ai = choices[choiceKey(date, meal, personId, di, 'dish')] ?? 0;
    return { dish: pickDish(d, ai), di, ai: Math.min(ai, d.alts?.length ?? 0) };
  });
}

export interface Contribution { date: string; meal: MealKey; person: Person; dish: string; item: Item; chosen: string; defaulted: boolean }
export interface Group {
  key: string; name: string; category: Category; unit: Unit | null; estado: Item['estado'];
  total: number; pieces: { n: number; word: string } | null;
  contributions: Contribution[];
  defaulted: boolean; optional: boolean; generic: boolean; preparation: boolean; noAmount: boolean;
}

export function collect(plans: Plan[], people: Person[], dates: string[], meals: MealKey[], choices: Record<string, number>): Contribution[] {
  const out: Contribution[] = [];
  for (const date of dates) for (const meal of meals) for (const person of people) {
    chosenDishes(plans, person.id, date, meal, choices).forEach(({ dish, di, ai }) => dish.items.forEach((orig, ii) => {
      const idx = choices[choiceKey(date, meal, person.id, di, ii, ai)];
      const p = pickItem(orig, idx);
      const item: Item = { ...orig, measure: p.measure, amount: p.amount, unit: p.unit };
      out.push({ date, meal, person, dish: dish.name, item, chosen: p.name, defaulted: orig.options.length > 1 && idx == null });
    }));
  }
  return out;
}

/** Agrupa por ingrediente elegido + unidad + estado. Nunca mezcla unidades ni crudo/cocido (RN-02). */
export function aggregate(cs: Contribution[]): Group[] {
  const map = new Map<string, Group>();
  for (const c of cs) {
    const { item } = c;
    const key = `${norm(c.chosen)}|${item.unit ?? 'sin'}|${item.estado ?? ''}`;
    let g = map.get(key);
    if (!g) {
      g = { key, name: c.chosen, category: categoryOf(c.chosen), unit: item.unit, estado: item.estado, total: 0, pieces: undefined as never,
        contributions: [], defaulted: false, optional: false, generic: isGeneric(c.chosen), preparation: isPreparation(c.chosen), noAmount: item.amount == null };
      map.set(key, g);
    }
    g.contributions.push(c);
    g.total += item.amount ?? 0;
    g.defaulted ||= c.defaulted;
    g.optional ||= item.optional;
    const m = parseMeasure(item.measure);
    if (g.pieces === undefined) g.pieces = m ? { ...m } : null;
    else if (g.pieces && m && m.word === g.pieces.word) g.pieces.n += m.n;
    else g.pieces = null;
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

export const fmtNum = (n: number) => (Math.round(n * 10) / 10).toLocaleString('es-SV', { maximumFractionDigits: 1 });
export function fmtQty(n: number, unit: Unit | null) {
  if (!unit) return '—';
  if (unit === 'g') return n >= 1000 ? `${fmtNum(n / 1000)} kg` : `${fmtNum(n)} g`;
  return n >= 1000 ? `${fmtNum(n / 1000)} L` : `${fmtNum(n)} ml`;
}
/** g → lb es conversión exacta de unidades; no es un factor de rendimiento. */
export const toLb = (g: number) => `${fmtNum(g / 453.592)} lb`;
export function fmtPieces(p: { n: number; word: string } | null) {
  if (!p) return '';
  const n = Math.round(p.n * 100) / 100;
  const w = n === 1 ? p.word : p.word.match(/[aeiou]$/) ? p.word + 's' : p.word + 'es';
  return `${fmtNum(n)} ${w}`;
}

/** Sistema de unidades para comprar: 'lb' = libras y onzas (como en el súper), 'g' = gramos y kilos. */
export type UnitSystem = 'lb' | 'g';
const G_PER_OZ = 28.349523125;
const ML_PER_FLOZ = 29.5735295625;
/** Conversión exacta de unidades (no es un factor de rendimiento). */
export function fmtBuy(n: number, unit: Unit | null, sys: UnitSystem) {
  if (!unit) return '—';
  if (sys === 'g') return fmtQty(n, unit);
  if (unit === 'ml') {
    const fl = n / ML_PER_FLOZ;
    return n >= 1000 ? `${fmtNum(fl)} oz fl (${fmtNum(n / 1000)} L)` : `${fmtNum(fl)} oz fl`;
  }
  const oz = n / G_PER_OZ;
  if (oz < 16) return `${fmtNum(oz)} oz`;
  let lb = Math.floor(oz / 16);
  let rest = Math.round(oz - lb * 16);
  if (rest === 16) { lb += 1; rest = 0; }
  return rest ? `${lb} lb ${rest} oz` : `${lb} lb`;
}
/** Para el inventario: cantidad en la unidad que ve la persona ↔ g/ml guardados. */
export const stockUnit = (unit: Unit | null, sys: UnitSystem) => (unit === 'ml' ? (sys === 'lb' ? 'oz fl' : 'ml') : sys === 'lb' ? 'oz' : 'g');
export const toStock = (v: number, unit: Unit | null, sys: UnitSystem) => (sys === 'g' ? v : v * (unit === 'ml' ? ML_PER_FLOZ : G_PER_OZ));
export const fromStock = (v: number, unit: Unit | null, sys: UnitSystem) => (sys === 'g' ? v : v / (unit === 'ml' ? ML_PER_FLOZ : G_PER_OZ));
