export type MealKey = 'desayuno' | 'mediodia' | 'comida' | 'mediatarde' | 'cena';
export const MEALS: { key: MealKey; label: string; short: string; main: boolean }[] = [
  { key: 'desayuno', label: 'Desayuno', short: 'Desayuno', main: true },
  { key: 'mediodia', label: 'Refrigerio de media mañana', short: 'Media mañana', main: false },
  { key: 'comida', label: 'Almuerzo', short: 'Almuerzo', main: true },
  { key: 'mediatarde', label: 'Refrigerio de media tarde', short: 'Media tarde', main: false },
  { key: 'cena', label: 'Cena', short: 'Cena', main: true },
];

export type Estado = 'crudo' | 'cocido' | null;
export type Unit = 'g' | 'ml';

export interface Item {
  label: string;          // texto tal como lo escribió la nutricionista
  options: string[];      // ingredientes normalizados; >1 = alternativas autorizadas
  optMeasure: (string | null)[]; // medida propia de una alternativa (ej. "2 piezas"); sin gramos conocidos
  measure: string;        // medida casera (ej. "½ taza"), puede ir vacía
  amount: number | null;  // cantidad en g o ml
  unit: Unit | null;
  estado: Estado;
  optional: boolean;
}
export interface Dish { name: string; items: Item[]; notes: string[]; alts?: Dish[] }  // alts = platillos alternativos autorizados
/** 0 = lunes … 6 = domingo */
export type Week = Record<number, Partial<Record<MealKey, Dish[]>>>;

export type PlanStatus = 'borrador' | 'activo' | 'archivado';
export interface Plan {
  id: string;
  personId: string;
  title: string;
  source: string;          // texto fuente (formato del plan)
  fileName?: string;       // documento original
  fileId?: string;         // id en IndexedDB
  start: string;           // YYYY-MM-DD
  end: string;             // YYYY-MM-DD
  status: PlanStatus;
  version: number;
  createdAt: string;
  approvedAt?: string;
  history: { at: string; what: string }[];
}

export interface Person { id: string; name: string; alias: string; color: string; active: boolean; restrictions: string }

/** Algo que alguien comió fuera del plan (sorbete, pupusa…), para contar sus calorías. */
export interface Extra { person: string; date: string; meal: MealKey; name: string; kcal: number | null; at: string }

export type Role = 'admin' | 'cocina' | 'integrante';
