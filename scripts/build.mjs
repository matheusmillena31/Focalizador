import { cp, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { buildStandalone } from './build-standalone.mjs';

await mkdir('dist', { recursive: true });
await cp('index.html', 'dist/index.html');
await cp('src', 'dist/src', { recursive: true });
try {
  await access('node_modules/@capacitor/core/dist/index.js');
  await mkdir('dist/vendor', { recursive: true });
  await cp('node_modules/@capacitor/core/dist/index.js', 'dist/vendor/capacitor.js');
} catch { console.log('Versão local gerada. Para Android, instale as dependências antes de sincronizar.'); }
console.log(`Aplicativo pronto em ${path.resolve('dist')}`);
await buildStandalone();
