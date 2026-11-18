import { MEALS, type Plan, type Extra } from './types';
import { mealNut } from './nutrition';
import { ultimaMedicion } from './bascula';

export type Sexo = 'f' | 'm';
export type Meta = 'bajar' | 'mantener' | 'subir';
export interface Cuerpo { sexo: Sexo; nacimiento: string; estatura_cm: number; peso_lb: number; meta: Meta; actividad: number }
export interface Entreno { person: string; date: string; tipo: string; minutos: number; kcal: number; estimado: boolean; at: string }

export const ACTIVIDAD: [number, string][] = [
  [1.2, 'Sedentaria (oficina, poco caminar)'],
  [1.3, 'Ligera (camina algo en el día)'],
  [1.45, 'Activa (de pie o caminando casi todo el día)'],
];
export const META: [Meta, string][] = [['bajar', 'Bajar de peso'], ['mantener', 'Mantener'], ['subir', 'Subir masa / peso']];

/** Ejercicios con su gasto típico (MET, Compendium of Physical Activities). */
export const EJERCICIOS: [string, number][] = [
  ['Caminar', 3.5], ['Caminar rápido', 4.3], ['Correr', 9.8], ['Bicicleta', 7.5], ['Spinning', 8.5],
  ['Pesas / gimnasio', 5], ['Funcional / HIIT', 8], ['Natación', 7], ['Fútbol', 7], ['Pádel / tenis', 7],
  ['Yoga / pilates', 2.8], ['Baile / zumba', 5.5],
];

export const cuerpoKey = (person: string) => `cuerpo|${person}`;
export const entrenoKey = (date: string, person: string) => `entreno|${date}|${person}|${Date.now()}`;
export const getCuerpo = (reg: Record<string, unknown>, person: string) => (reg[cuerpoKey(person)] as Cuerpo | undefined) ?? null;
export const entrenosOf = (reg: Record<string, unknown>, person: string, date: string) =>
  Object.entries(reg).filter(([k, v]) => k.startsWith(`entreno|${date}|${person}|`) && v) as [string, Entreno][];

export const kg = (lb: number) => lb * 0.45359237;
export function edad(nac: string, date: string) {
  const [y, m, d] = nac.split('-').map(Number); const [Y, M, D] = date.split('-').map(Number);
  return Y - y - (M < m || (M === m && D < d) ? 1 : 0);
}
/** Metabolismo basal: Mifflin-St Jeor (kcal/día). */
export function basal(c: Cuerpo, date: string) {
  return 10 * kg(c.peso_lb) + 6.25 * c.estatura_cm - 5 * edad(c.nacimiento, date) + (c.sexo === 'm' ? 5 : -161);
}
/** kcal ≈ MET × peso (kg) × horas (descontando el gasto en reposo ya incluido en el basal). */
export const kcalEjercicio = (met: number, minutos: number, pesoLb: number) => Math.round(Math.max(0, met - 1) * kg(pesoLb) * (minutos / 60));

export interface Dia {
  consumoPlan: number; extras: number; consumo: number;
  basal: number | null; diario: number | null; ejercicio: number; quema: number | null; balance: number | null;
  veredicto: { tono: 'bien' | 'neutro' | 'mal' | 'alerta'; texto: string } | null; faltanDatos: boolean;
  basalFuente: 'bascula' | 'formula' | null;
}
/** Peso más reciente: la báscula manda sobre «Mis datos». */
export const pesoActual = (reg: Record<string, unknown>, person: string, date: string) =>
  ultimaMedicion(reg, person, date)?.peso_lb ?? getCuerpo(reg, person)?.peso_lb ?? null;
export function resumenDia(plans: Plan[], choices: Record<string, number>, extras: Record<string, Extra>, reg: Record<string, unknown>, person: string, date: string): Dia {
  const consumoPlan = MEALS.reduce((t, m) => t + mealNut(plans, person, date, m.key, choices).total.kcal, 0);
  const ex = Object.values(extras).filter((e) => e && e.person === person && e.date === date).reduce((t, e) => t + (e.kcal ?? 0), 0);
  const consumo = consumoPlan + ex;
  const ejercicio = entrenosOf(reg, person, date).reduce((t, [, e]) => t + (e.kcal || 0), 0);
  const c = getCuerpo(reg, person);
  const med = ultimaMedicion(reg, person, date);
  // Basal: el metabolismo que mide la báscula; si no hay, la fórmula con los datos (y el último peso).
  const b = med?.metabolismo ?? (c ? basal({ ...c, peso_lb: med?.peso_lb ?? c.peso_lb }, date) : null);
  if (b == null) return { consumoPlan, extras: ex, consumo, basal: null, diario: null, ejercicio, quema: null, balance: null, veredicto: null, faltanDatos: true, basalFuente: null };
  const diario = b * (c?.actividad ?? 1.2);
  const quema = diario + ejercicio;
  const balance = consumo - quema;
  return { consumoPlan, extras: ex, consumo, basal: b, diario, ejercicio, quema, balance, veredicto: veredicto(c?.meta ?? 'mantener', balance), faltanDatos: false,
    basalFuente: med?.metabolismo ? 'bascula' : 'formula' };
}
/** Bueno o malo según la meta. Rangos prudentes: un déficit de 300–700 kcal es lo habitual para bajar. */
export function veredicto(meta: Meta, bal: number): Dia['veredicto'] {
  const r = Math.round(bal);
  if (meta === 'bajar') {
    if (bal < -1000) return { tono: 'alerta', texto: `Déficit muy grande (${r} kcal). Come lo que indica tu plan; comer muy poco tampoco ayuda.` };
    if (bal <= -250) return { tono: 'bien', texto: `¡Buen día! Déficit de ${-r} kcal, vas bien para bajar.` };
    if (bal <= 150) return { tono: 'neutro', texto: 'Día equilibrado: comiste más o menos lo que gastaste.' };
    return { tono: 'mal', texto: `Te pasaste ${r} kcal de lo que gastaste. Mañana es otro día.` };
  }
  if (meta === 'subir') {
    if (bal >= 200 && bal <= 600) return { tono: 'bien', texto: `¡Buen día! Superávit de ${r} kcal para subir.` };
    if (bal > 600) return { tono: 'neutro', texto: `Superávit alto (${r} kcal).` };
    return { tono: 'mal', texto: `Te faltaron ${200 - r} kcal para tu meta de subir.` };
  }
  if (Math.abs(bal) <= 250) return { tono: 'bien', texto: '¡Buen día! Comiste casi lo mismo que gastaste.' };
  return bal > 0 ? { tono: 'mal', texto: `Te pasaste ${r} kcal de lo que gastaste.` } : { tono: 'neutro', texto: `Comiste ${-r} kcal menos de lo que gastaste.` };
}
