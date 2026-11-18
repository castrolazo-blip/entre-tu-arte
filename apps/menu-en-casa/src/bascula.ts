import { norm } from './parser';

/** Una medición de la báscula inteligente (lo que se pudo leer o escribir). */
export interface Medicion {
  person: string; date: string; at: string;
  peso_lb: number; imc?: number; grasa_pct?: number; grasa_lb?: number;
  mme_pct?: number; mme_lb?: number; musculo_pct?: number; musculo_lb?: number;
  visceral?: number; agua_pct?: number; agua_lb?: number; metabolismo?: number;
  proteina_pct?: number; hueso_lb?: number; grasa_sub_pct?: number; edad_metabolica?: number;
}
export type Campo = Exclude<keyof Medicion, 'person' | 'date' | 'at'>;

/** Campos en el orden en que se muestran, con su etiqueta y rango válido. */
export const CAMPOS: { k: Campo; l: string; min: number; max: number }[] = [
  { k: 'peso_lb', l: 'Peso (lb)', min: 40, max: 600 },
  { k: 'imc', l: 'IMC', min: 10, max: 80 },
  { k: 'grasa_pct', l: 'Grasa (%)', min: 2, max: 75 },
  { k: 'grasa_lb', l: 'Peso de grasa (lb)', min: 1, max: 400 },
  { k: 'mme_pct', l: 'Masa muscular esquelética (%)', min: 5, max: 80 },
  { k: 'mme_lb', l: 'Masa muscular esquelética (lb)', min: 5, max: 300 },
  { k: 'musculo_pct', l: 'Músculo (%)', min: 10, max: 95 },
  { k: 'musculo_lb', l: 'Peso muscular (lb)', min: 10, max: 400 },
  { k: 'visceral', l: 'Grasa visceral', min: 1, max: 60 },
  { k: 'agua_pct', l: 'Agua (%)', min: 20, max: 80 },
  { k: 'agua_lb', l: 'Peso del agua (lb)', min: 10, max: 400 },
  { k: 'metabolismo', l: 'Metabolismo (kcal/día)', min: 600, max: 5000 },
  { k: 'proteina_pct', l: 'Proteína (%)', min: 5, max: 40 },
  { k: 'hueso_lb', l: 'Masa ósea (lb)', min: 1, max: 30 },
  { k: 'grasa_sub_pct', l: 'Grasa subcutánea (%)', min: 1, max: 70 },
  { k: 'edad_metabolica', l: 'Edad metabólica', min: 5, max: 110 },
];

// Del más específico al más general: «peso de grasa» antes que «grasa» y que «peso».
const REGLAS: [RegExp, Campo][] = [
  [/peso de (la )?grasa|grasa corporal ?\(lb|masa grasa/, 'grasa_lb'],
  [/porcentaje de masa muscular|masa muscular esqueletica ?\(%/, 'mme_pct'],
  [/peso de la masa muscular|masa muscular esqueletica ?\(lb/, 'mme_lb'],
  [/peso muscular|masa muscular ?\(lb/, 'musculo_lb'],
  [/peso del agua|agua corporal ?\(lb/, 'agua_lb'],
  [/masa osea|peso oseo|hueso/, 'hueso_lb'],
  [/proteina/, 'proteina_pct'],
  [/grasa subcutanea/, 'grasa_sub_pct'],
  [/grasa visceral|visceral/, 'visceral'],
  [/edad (metabolica|corporal)/, 'edad_metabolica'],
  [/metabolismo|\bbmr\b|\btmb\b/, 'metabolismo'],
  [/musculo/, 'musculo_pct'],
  [/\bagua\b/, 'agua_pct'],
  [/grasa/, 'grasa_pct'],
  [/\bbmi\b|\bimc\b/, 'imc'],
  [/\bpeso\b/, 'peso_lb'],
];
const NUM = /(\d{1,4}(?:[.,]\d{1,2})?)/g;
const numsOf = (t: string) => [...t.matchAll(NUM)].map((m) => parseFloat(m[1].replace(',', '.')));

/** Lee el texto de la foto (OCR) y devuelve los valores reconocidos dentro de rangos razonables. */
export function leerBascula(texto: string): Partial<Record<Campo, number>> {
  const out: Partial<Record<Campo, number>> = {};
  const lines = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  lines.forEach((line, i) => {
    const n = norm(line);
    const regla = REGLAS.find(([re]) => re.test(n));
    if (!regla) return;
    const campo = regla[1];
    if (out[campo] != null) return;
    // número de la misma línea (el último, después de la etiqueta); si no hay, el de la línea siguiente
    let nums = numsOf(line.replace(/\((lb|kg|%|kcal[^)\d]*)\)?/gi, ' '));
    if (!nums.length && lines[i + 1] && !REGLAS.some(([re]) => re.test(norm(lines[i + 1])))) nums = numsOf(lines[i + 1]);
    let v = nums.length ? nums[nums.length - 1] : undefined;
    if (v == null) return;
    if (campo === 'peso_lb' && /\bkg\b/.test(n)) v = Math.round(v * 2.20462 * 10) / 10;
    const c = CAMPOS.find((x) => x.k === campo)!;
    if (v >= c.min && v <= c.max) out[campo] = v;
  });
  return out;
}

export const medKey = (person: string, date: string) => `peso|${person}|${date}`;
/** Historial de una persona, de la más antigua a la más reciente. */
export const historial = (reg: Record<string, unknown>, person: string) =>
  (Object.entries(reg).filter(([k, v]) => k.startsWith(`peso|${person}|`) && v).map(([, v]) => v as Medicion)).sort((a, b) => a.date.localeCompare(b.date));
/** La medición más reciente hasta una fecha. */
export const ultimaMedicion = (reg: Record<string, unknown>, person: string, date: string) =>
  historial(reg, person).filter((m) => m.date <= date).pop() ?? null;
