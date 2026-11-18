import { expect, it } from 'vitest';
import { leerBascula } from './bascula';

// Texto real que devuelve el OCR (Tesseract, español) con la captura de la app de la báscula
const OCR = `10:49 2 al 7 EC
< Detalles E O
Métricas corporales
($) Peso(LB) 254.9
Obese 1
E) BMI 32.7
Obese 1
E Grasa(%) 32.3
Obese 1
A Peso de grasa corporal(LB) 82.2
Obese 1
a Porcentaje de masa muscular 35.8
esquelética(%) Saludable 1
Peso de la masa muscular
A - 91.4
esquelética (LB) Saludable 1
2 Músculo (%) 64.7
Perfecto '
3 Peso muscular(LB) 165.0
Perfecto '
AN Grasa visceral 26.0
Obese 1
Agua(%) 49.8
Bajo
Y) Peso del agua(LB) 127.0
Bajo
(QA) Metabolismo (Kcal/dia 2219.0
La`;

it('lee todos los valores de la captura de la báscula', () => {
  expect(leerBascula(OCR)).toEqual({
    peso_lb: 254.9, imc: 32.7, grasa_pct: 32.3, grasa_lb: 82.2, mme_pct: 35.8, mme_lb: 91.4,
    musculo_pct: 64.7, musculo_lb: 165, visceral: 26, agua_pct: 49.8, agua_lb: 127, metabolismo: 2219,
  });
});
it('peso en kg se convierte a lb', () => {
  expect(leerBascula('Peso (kg) 80.0').peso_lb).toBe(176.4);
});
