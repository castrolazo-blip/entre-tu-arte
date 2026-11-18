// Copia el lector de fotos (OCR) a dist/ocr para servirlo desde el mismo sitio:
// así la app no descarga nada de servidores externos.
import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
const req = createRequire(import.meta.url);
const dir = (p) => dirname(req.resolve(p));
const out = 'dist/ocr';
mkdirSync(out, { recursive: true });
const files = [
  [join(dir('tesseract.js/package.json'), 'dist/worker.min.js'), 'worker.min.js'],
  [join(dir('tesseract.js-core/package.json'), 'tesseract-core-lstm.wasm.js'), 'tesseract-core-lstm.wasm.js'],
  [join(dir('tesseract.js-core/package.json'), 'tesseract-core-simd-lstm.wasm.js'), 'tesseract-core-simd-lstm.wasm.js'],
  [join(dir('@tesseract.js-data/spa/package.json'), '4.0.0_best_int/spa.traineddata.gz'), 'spa.traineddata.gz'],
];
for (const [from, to] of files) copyFileSync(from, join(out, to));
console.log(`OCR copiado a ${out}`);
