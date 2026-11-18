import type { Item, MealKey, Plan, Unit } from './types';
import { norm } from './parser';
import { choiceKey, chosenDishes, pickItem } from './logic';

/**
 * Composición por 100 g (o 100 ml): kcal, proteína, carbohidratos, grasa.
 * Fuente 'usda' = USDA FoodData Central (valores de referencia redondeados).
 * Fuente 'aprox' = valor típico (receta casera, "al gusto" o producto de marca sin etiqueta a mano).
 * Carnes, pescados y granos se toman COCIDOS (así se pesan las porciones en los planes).
 * Es una estimación informativa: no cambia las indicaciones de la nutricionista.
 */
type Src = 'usda' | 'aprox';
type Row = [kcal: number, p: number, c: number, f: number, src: Src, density?: number];
const T: Record<string, Row> = {
  // Proteínas (cocidas)
  'pechuga de pollo': [165, 31, 0, 3.6, 'usda'],
  'pieza de pollo sin piel': [175, 26, 0, 7.5, 'usda'],
  'lomito de res': [205, 29, 0, 9, 'usda'],
  'pieza de res': [220, 28, 0, 11, 'usda'],
  'lomito de cerdo': [143, 26, 0, 3.5, 'usda'],
  'carne de res molida magra': [217, 26, 0, 12, 'usda'],
  'carne de pollo molida': [189, 23, 0, 10, 'usda'],
  'carne de pavo molida': [203, 27, 0, 10, 'usda'],
  'pechuga de pavo': [104, 17, 4.2, 1.7, 'usda'],
  'jamon bajo en grasa': [110, 17, 2, 3.5, 'usda'],
  'filete de pescado': [128, 26, 0, 2.7, 'usda'],
  'salmon': [206, 22, 0, 12, 'usda'],
  'camarones': [99, 24, 0.2, 0.3, 'usda'],
  'huevo entero': [150, 12.6, 1.1, 10, 'usda'],
  'clara de huevo': [52, 10.9, 0.7, 0.2, 'usda'],
  // Lácteos (ml ≈ g)
  'yogurt griego sin azucar': [59, 10, 3.6, 0.4, 'usda'],
  'yogurt sin azucar': [63, 5.3, 7, 1.6, 'usda'],
  'yogurt bebible con proteina': [64, 10, 5, 0.4, 'aprox'],
  'leche descremada': [34, 3.4, 5, 0.1, 'usda'],
  'leche de proteina dos pinos': [50, 6, 5, 0.5, 'aprox'],
  'leche de almendras sin azucar': [15, 0.6, 0.3, 1.2, 'usda'],
  'requeson': [138, 11.4, 5.1, 7.9, 'usda'],
  'queso cottage': [98, 11, 3.4, 4.3, 'usda'],
  'queso fresco': [299, 18, 3, 24, 'usda'],
  'queso mozzarella': [254, 24, 2.8, 16, 'usda'],
  'queso panela': [250, 20, 3, 18, 'aprox'],
  'string cheese': [254, 24, 2.8, 16, 'usda'],
  'mantequilla': [717, 0.9, 0.1, 81, 'usda'],
  // Granos, panes y tortillas
  'pan integral': [247, 13, 41, 3.4, 'usda'],
  'pan de masa madre': [270, 11, 52, 2, 'usda'],
  'tortilla salvadorena': [218, 5.7, 45, 2.9, 'usda'],
  'tortilla de maiz': [218, 5.7, 45, 2.9, 'usda'],
  'tortilla de maiz para taco': [218, 5.7, 45, 2.9, 'usda'],
  'tortilla integral tipo rapiditas': [300, 9, 50, 7, 'aprox'],
  'tostadas de maiz salmas': [390, 9, 80, 3, 'aprox'],
  'arroz': [130, 2.7, 28, 0.3, 'usda'],
  'arroz integral': [123, 2.7, 26, 1, 'usda'],
  'quinoa': [120, 4.4, 21, 1.9, 'usda'],
  'casamiento': [160, 5, 26, 4, 'aprox'],
  'frijoles': [130, 8.5, 23, 0.8, 'usda'],
  'garbanzos': [164, 8.9, 27, 2.6, 'usda'],
  'lentejas': [116, 9, 20, 0.4, 'usda'],
  'granola': [471, 10, 64, 20, 'usda'],
  'avena en hojuelas': [379, 13, 68, 6.5, 'usda'],
  'harina integral para pancakes': [210, 7, 30, 7, 'aprox'],
  'harina de avena': [210, 7, 30, 7, 'aprox'],
  'palomitas de maiz con poca grasa': [387, 13, 78, 4.5, 'usda'],
  // Frutas y vegetales
  'fruta al gusto': [55, 0.7, 14, 0.2, 'aprox'],
  'manzana': [52, 0.3, 14, 0.2, 'usda'],
  'banana': [89, 1.1, 23, 0.3, 'usda'],
  'platano': [116, 0.8, 31, 0.2, 'usda'],
  'frutos rojos': [50, 0.8, 12, 0.3, 'usda'],
  'aguacate': [160, 2, 8.5, 14.7, 'usda'],
  'vegetales al gusto': [30, 1.8, 6, 0.3, 'aprox'],
  'tomate': [18, 0.9, 3.9, 0.2, 'usda'],
  'champinones': [22, 3.1, 3.3, 0.3, 'usda'],
  'espinaca': [23, 2.9, 3.6, 0.4, 'usda'],
  'arugula': [25, 2.6, 3.7, 0.7, 'usda'],
  'elote': [96, 3.4, 21, 1.5, 'usda'],
  'papa': [87, 1.9, 20, 0.1, 'usda'],
  'camote': [90, 2, 21, 0.2, 'usda'],
  'hierbas naturales': [25, 3, 4, 0.5, 'aprox'],
  // Preparaciones caseras (valor típico)
  'chimol': [20, 0.8, 4, 0.2, 'aprox'],
  'guacamole': [155, 2, 8.6, 14, 'usda'],
  'hummus': [166, 7.9, 14, 9.6, 'usda'],
  'crema de tomate casera': [50, 1.5, 7, 2, 'aprox'],
  'crema de vegetales casera': [45, 1.5, 6, 2, 'aprox'],
  'sopa': [20, 1, 3, 0.5, 'aprox'],
  // Otros
  'semillas': [550, 22, 20, 45, 'aprox'],
  'mantequilla de mani': [588, 25, 20, 50, 'usda'],
  'mantequilla de almendras': [614, 21, 19, 56, 'usda'],
  'aceite de oliva extra virgen': [884, 0, 0, 100, 'usda', 0.91],
  'vinagreta': [400, 0.3, 8, 40, 'aprox'],
  'chimichurri casero': [450, 1, 3, 48, 'aprox'],
  'aderezo balsamico': [290, 0.2, 10, 28, 'aprox'],
  'canela en polvo': [247, 4, 81, 1.2, 'usda'],
  'miel de maple 0% azucar': [30, 0, 8, 0, 'aprox'],
  'chocolate semi amargo 70%': [598, 7.8, 46, 43, 'usda'],
  'galleta sin azucar': [450, 7, 65, 18, 'aprox'],
  'galleta tosh sin azucar': [430, 7, 68, 14, 'aprox'],
  'barrita de proteina': [350, 30, 35, 10, 'aprox'],
  'proteina en polvo': [380, 75, 10, 5, 'aprox'],
};

export interface Nut { kcal: number; p: number; c: number; f: number; approx: boolean }
export const ZERO: Nut = { kcal: 0, p: 0, c: 0, f: 0, approx: false };

/** Nutrientes de una cantidad. null = no calculable (sin gramos o alimento sin dato). */
export function nutOf(name: string, amount: number | null, unit: Unit | null): Nut | null {
  if (amount == null || !unit) return null;
  const r = T[norm(name)];
  if (!r) return null;
  const grams = unit === 'ml' ? amount * (r[5] ?? 1) : amount;
  const k = grams / 100;
  return { kcal: r[0] * k, p: r[1] * k, c: r[2] * k, f: r[3] * k, approx: r[4] === 'aprox' };
}
export const nutItem = (item: Item, idx: number | undefined) => {
  const x = pickItem(item, idx);
  return nutOf(x.name, x.amount, x.unit);
};
export const add = (a: Nut, b: Nut): Nut => ({ kcal: a.kcal + b.kcal, p: a.p + b.p, c: a.c + b.c, f: a.f + b.f, approx: a.approx || b.approx });

export interface MealNut { total: Nut; missing: string[]; empty: boolean }
/** Total de una comida de una persona, con lo elegido; lista lo que no se pudo calcular. */
export function mealNut(plans: Plan[], personId: string, date: string, meal: MealKey, choices: Record<string, number>): MealNut {
  let total = ZERO; const missing: string[] = []; let n = 0;
  for (const { dish, di, ai } of chosenDishes(plans, personId, date, meal, choices)) {
    dish.items.forEach((it, ii) => {
      n++;
      const x = pickItem(it, choices[choiceKey(date, meal, personId, di, ii, ai)]);
      const v = nutOf(x.name, x.amount, x.unit);
      if (v) total = add(total, v); else missing.push(x.name);
    });
  }
  return { total, missing, empty: n === 0 };
}
export const fmtKcal = (n: number) => `${Math.round(n).toLocaleString('es-SV')} kcal`;
export const fmtMacros = (t: Nut) => `P ${Math.round(t.p)} g · C ${Math.round(t.c)} g · G ${Math.round(t.f)} g`;
