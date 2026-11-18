import type { Person, Plan } from './types';

// Versión pública: sin datos de la familia. Los planes y perfiles llegan de Supabase
// después de iniciar sesión (solo miembros autorizados; ver supabase/migrations/*_menu_en_casa.sql).
export const SEED_VERSION = 3;
export const SEED_PEOPLE: Person[] = [];
export const SEED_PLANS: Plan[] = [];
