export const DOW = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const parseYmd = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (s: string, n: number) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
export const today = () => ymd(new Date());
/** 0 = lunes … 6 = domingo */
export const weekdayIdx = (s: string) => (parseYmd(s).getDay() + 6) % 7;
export const longDate = (s: string) => { const d = parseYmd(s); return `${DOW[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`; };
export const shortDate = (s: string) => { const d = parseYmd(s); return `${DOW[d.getDay()].slice(0, 3)} ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`; };
export const mondayOf = (s: string) => addDays(s, -weekdayIdx(s));
export function range(from: string, to: string) { const out: string[] = []; for (let d = from; d <= to && out.length < 62; d = addDays(d, 1)) out.push(d); return out; }
