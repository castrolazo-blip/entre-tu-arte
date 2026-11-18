import type { Dish, Estado, Item, MealKey, Unit, Week } from './types';

export const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

const MEAL_ALIASES: Record<string, MealKey> = {
  desayuno: 'desayuno', 'medio dia': 'mediodia', 'media manana': 'mediodia', merienda: 'mediodia',
  comida: 'comida', almuerzo: 'comida', 'media tarde': 'mediatarde', cena: 'cena',
};

export interface ParseIssue { line: number; text: string; problem: string; level: 'error' | 'aviso' }
export interface ParseResult { week: Week; issues: ParseIssue[]; itemCount: number }

/**
 * Formato de texto de un plan:
 *   ## Lunes
 *   ### Desayuno: Nombre del platillo
 *   - Texto del alimento [Alternativa 1; Alternativa 2] | medida casera | 35 g #cocido #opcional
 *   > Nota u observación
 */
export function parsePlan(src: string): ParseResult {
  const week: Week = {};
  const issues: ParseIssue[] = [];
  let day = -1;
  let dish: (Dish & { parent?: Dish }) | null = null;
  let itemCount = 0;
  src.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    const ln = i + 1;
    if (!line) return;
    if (line.startsWith('## ')) {
      day = DAY_NAMES.findIndex((d) => norm(d) === norm(line.slice(3)));
      if (day < 0) issues.push({ line: ln, text: line, problem: 'Día no reconocido', level: 'error' });
      dish = null;
      return;
    }
    if (line.startsWith('### ')) {
      const [mealTxt, ...rest] = line.slice(4).split(':');
      if (norm(mealTxt) === 'opcion') {
        if (!dish) { issues.push({ line: ln, text: line, problem: 'Opción sin platillo anterior', level: 'error' }); return; }
        const parent = dish.parent ?? dish;
        const alt: Dish & { parent?: Dish } = { name: rest.join(':').trim() || 'Opción', items: [], notes: [], parent };
        (parent.alts ??= []).push(alt);
        dish = alt;
        return;
      }
      const meal = MEAL_ALIASES[norm(mealTxt)];
      if (day < 0) { issues.push({ line: ln, text: line, problem: 'Platillo fuera de un día', level: 'error' }); return; }
      if (!meal) { issues.push({ line: ln, text: line, problem: 'Tiempo de comida no reconocido', level: 'error' }); return; }
      dish = { name: rest.join(':').trim() || mealTxt.trim(), items: [], notes: [] };
      const d = (week[day] ??= {});
      (d[meal] ??= []).push(dish);
      return;
    }
    if (!dish) { issues.push({ line: ln, text: line, problem: 'Línea fuera de un platillo', level: 'error' }); return; }
    if (line.startsWith('>')) { dish.notes.push(line.slice(1).trim()); return; }
    if (line.startsWith('-')) {
      const item = parseItem(line.slice(1).trim());
      itemCount++;
      if (!item.label) issues.push({ line: ln, text: line, problem: 'Alimento sin nombre', level: 'error' });
      if (item.amount == null) issues.push({ line: ln, text: line, problem: 'Falta cantidad en g o ml: no se podrá sumar', level: 'aviso' });
      dish.items.push(item);
      return;
    }
    issues.push({ line: ln, text: line, problem: 'Formato no reconocido', level: 'error' });
  });
  // quitar referencias internas
  Object.values(week).forEach((d) => Object.values(d).forEach((ds) => ds?.forEach((x) => x.alts?.forEach((a) => delete (a as { parent?: Dish }).parent))));
  return { week, issues, itemCount };
}

function parseItem(txt: string): Item {
  const flags = [...txt.matchAll(/#(\w+)/g)].map((m) => norm(m[1]));
  txt = txt.replace(/#\w+/g, '').trim();
  const [head = '', measure = '', qty = ''] = txt.split('|').map((s) => s.trim());
  let label = head;
  let options = [head];
  const br = head.match(/^(.*)\[(.+)\]\s*$/);
  if (br) { label = br[1].trim(); options = br[2].split(';').map((s) => s.trim()).filter(Boolean); }
  // "Huevo entero @ 2 piezas": alternativa con su propia medida casera
  const optMeasure = options.map((o) => (o.includes('@') ? o.split('@')[1].trim() : null));
  options = options.map((o) => o.split('@')[0].trim());
  let amount: number | null = null;
  let unit: Unit | null = null;
  const q = qty.replace(',', '.').match(/^([\d.]+)\s*(g|ml)$/i);
  if (q) { amount = parseFloat(q[1]); unit = q[2].toLowerCase() as Unit; }
  const estado: Estado = flags.includes('cocido') ? 'cocido' : flags.includes('crudo') ? 'crudo' : null;
  return { label, options, optMeasure, measure, amount, unit, estado, optional: flags.includes('opcional') };
}

/** Separa "2 piezas" en número + unidad casera, para sumar piezas cuando coinciden. */
const FRAC: Record<string, number> = { '½': 0.5, '⅓': 1 / 3, '¼': 0.25, '¾': 0.75, '⅔': 2 / 3 };
export function parseMeasure(m: string): { n: number; word: string } | null {
  const r = m.match(/^([\d.]+|[½⅓¼¾⅔])\s+([a-záéíóúñ]+)/i);
  if (!r) return null;
  const n = FRAC[r[1]] ?? parseFloat(r[1]);
  return { n, word: singular(norm(r[2])) };
}
function singular(w: string) {
  if (w.endsWith('ones')) return w.slice(0, -2);
  if (w.endsWith('es') && /[dlnr]es$/.test(w)) return w.slice(0, -2);
  if (w.endsWith('s')) return w.slice(0, -1);
  return w;
}
export { norm };
