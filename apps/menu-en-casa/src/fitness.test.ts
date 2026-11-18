import { expect, it } from 'vitest';
import { basal, edad, kcalEjercicio, veredicto, type Cuerpo } from './fitness';

it('basal Mifflin-St Jeor', () => {
  const c: Cuerpo = { sexo: 'm', nacimiento: '1980-05-10', estatura_cm: 175, peso_lb: 180, meta: 'bajar', actividad: 1.2 };
  expect(edad(c.nacimiento, '2026-11-18')).toBe(46);
  // 10×81.65 + 6.25×175 − 5×46 + 5 = 1685
  expect(Math.round(basal(c, '2026-11-18'))).toBe(1685);
  expect(Math.round(basal({ ...c, sexo: 'f' }, '2026-11-18'))).toBe(1519);
});
it('ejercicio y veredicto', () => {
  expect(kcalEjercicio(9.8, 30, 150)).toBe(299); // correr 30 min, 68 kg: (9.8−1)×68×0.5
  expect(veredicto('bajar', -500)!.tono).toBe('bien');
  expect(veredicto('bajar', 400)!.tono).toBe('mal');
  expect(veredicto('bajar', -1300)!.tono).toBe('alerta');
  expect(veredicto('mantener', 100)!.tono).toBe('bien');
  expect(veredicto('subir', 300)!.tono).toBe('bien');
});
