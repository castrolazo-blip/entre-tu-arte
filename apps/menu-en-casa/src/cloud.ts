import { createClient } from '@supabase/supabase-js';

// Modo en línea: solo si la compilación trae la dirección y la llave pública de Supabase.
// La llave pública puede ir en el código: los datos los protegen las reglas por filas (RLS).
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const cloud = url && key ? createClient(url, key) : null;
export const HOGAR = 'casa';
