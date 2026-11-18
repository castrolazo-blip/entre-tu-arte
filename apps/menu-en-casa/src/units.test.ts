import { expect, it } from 'vitest';
import { fmtBuy, toStock, fromStock } from './logic';
it('libras y onzas', () => {
  expect(fmtBuy(120, 'g', 'lb')).toBe('4,2 oz'.replace(',', '.'));
  expect(fmtBuy(453.6, 'g', 'lb')).toBe('1 lb');
  expect(fmtBuy(690, 'g', 'lb')).toBe('1 lb 8 oz');
  expect(fmtBuy(2000, 'ml', 'lb')).toMatch(/oz fl \(2 L\)/);
  expect(fmtBuy(690, 'g', 'g')).toBe('690 g');
  expect(Math.round(fromStock(toStock(12, 'g', 'lb'), 'g', 'lb'))).toBe(12);
});
