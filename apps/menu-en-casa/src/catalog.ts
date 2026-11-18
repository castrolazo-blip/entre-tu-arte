import { norm } from './parser';

export type Category = 'proteinas' | 'lacteos' | 'frutas' | 'vegetales' | 'granos' | 'preparaciones' | 'otros';
export const CATEGORIES: { key: Category; label: string; icon: string }[] = [
  { key: 'proteinas', label: 'Proteínas', icon: '🍗' },
  { key: 'lacteos', label: 'Lácteos', icon: '🥛' },
  { key: 'frutas', label: 'Frutas', icon: '🍎' },
  { key: 'vegetales', label: 'Vegetales', icon: '🥦' },
  { key: 'granos', label: 'Granos, panes y tortillas', icon: '🌾' },
  { key: 'preparaciones', label: 'Preparaciones caseras', icon: '🥣' },
  { key: 'otros', label: 'Otros', icon: '🧂' },
];

// Reglas por palabra clave (se evalúan en orden). Solo clasifican para la lista de compras.
const RULES: [RegExp, Category][] = [
  [/chimol|guacamole|crema de|sopa|chimichurri|casamiento|hummus/, 'preparaciones'],
  [/mantequilla de|aceite|vinagreta|aderezo|miel|canela|chocolate|semillas|palomitas|galleta|barrita|proteina en polvo|hierbas|harina/, 'otros'],
  [/yogurt|leche|queso|requeson|cottage|string cheese|mantequilla/, 'lacteos'],
  [/pollo|res|pavo|cerdo|pescado|salmon|camaron|huevo|clara|jamon|carne/, 'proteinas'],
  [/fruta|manzana|banana|platano|frutos rojos|fresa/, 'frutas'],
  [/vegetal|espinaca|arugula|champinon|tomate|elote|papa|camote|aguacate/, 'vegetales'],
  [/pan|tortilla|tostada|arroz|quinoa|avena|granola|frijol|garbanzo|lenteja/, 'granos'],
];
export function categoryOf(name: string): Category {
  const n = norm(name);
  return RULES.find(([re]) => re.test(n))?.[1] ?? 'otros';
}
/** Recetas caseras: el plan no detalla sus ingredientes. */
export const isPreparation = (name: string) => categoryOf(name) === 'preparaciones';
/** "al gusto": el plan no especifica cuál. */
export const isGeneric = (name: string) => /al gusto/.test(norm(name));
