import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const sourceRoot = new URL('../', import.meta.url);
const moduleNames = ['domain', 'store', 'cloud', 'platform', 'routine', 'project', 'app'];

export async function standaloneHtml() {
  const blocks = [];
  for (const name of moduleNames) {
    let source = await readFile(new URL(`src/${name}.js`, sourceRoot), 'utf8');
    const exports = [...source.matchAll(/^export\s+(?:async\s+)?(?:const|class|function)\s+(\w+)/gm)].map(match => match[1]);
    source = source.replace(/^import\s+\{([^}]+)\}\s+from\s+['"]\.\/([\w-]+)\.js['"];?\s*$/gm, (_match, bindings, dependency) => {
      if (!moduleNames.slice(0, moduleNames.indexOf(name)).includes(dependency) || !/^[\w\s,]+$/.test(bindings)) throw new Error(`Importação não suportada em ${name}.`);
      return `const {${bindings}} = focusModules.${dependency};`;
    }).replace(/^export\s+(?=(?:async\s+)?(?:const|class|function)\s)/gm, '');
    if (/^\s*(?:import\s|export\s)/m.test(source)) throw new Error(`Módulo não suportado no arquivo independente: ${name}.`);
    blocks.push(`focusModules.${name} = (() => {\n${source}\nreturn { ${exports.join(', ')} };\n})();`);
  }
  const script = `(() => {
'use strict';
try {
  let temporary = false;
  function storageFor(name) {
    try {
      const storage = globalThis[name];
      const probe = 'focus-storage-test-' + Date.now();
      storage.setItem(probe, '1');
      storage.removeItem(probe);
      return storage;
    } catch {
      if (name === 'localStorage') temporary = true;
      const records = new Map();
      return { getItem: key => records.get(key) || null, setItem: (key, value) => records.set(key, String(value)), removeItem: key => records.delete(key) };
    }
  }
  const localStorage = storageFor('localStorage');
  const sessionStorage = storageFor('sessionStorage');
  window.focusStandalone = { temporary };
  const focusModules = Object.create(null);
  ${blocks.join('\n')}
  if (temporary) document.body.insertAdjacentHTML('afterbegin', '<div role="alert" style="position:sticky;top:0;z-index:2000;padding:12px;background:#fff0c5;color:#654812;text-align:center;font:14px Arial">Seu navegador bloqueou o armazenamento. Você pode testar, mas precisa exportar um backup em Ajustes antes de fechar esta página.</div>');
} catch (error) {
  const target = document.querySelector('#app');
  target.style.cssText = 'display:block;max-width:650px;margin:60px auto;padding:30px;background:white;border-radius:20px;font:16px Arial;line-height:1.6';
  target.textContent = 'Não foi possível abrir o Focalizador neste navegador. Tente abrir este mesmo arquivo no Chrome ou Edge. Detalhe: ' + (error.message || String(error));
}
})();`.replace(/\r\n?/g, '\n').replace(/<\/script/gi, '<\\/script');
  new vm.Script(script, { filename: 'Focalizador.html' });
  const digest = createHash('sha256').update(script).digest('base64');
  let template = await readFile(new URL('index.html', sourceRoot), 'utf8');
  const styles = (await Promise.all(['styles', 'calendar', 'routine'].map(name => readFile(new URL(`src/${name}.css`, sourceRoot), 'utf8')))).join('\n');
  template = template.replace("script-src 'self'", `script-src 'self' 'sha256-${digest}'`);
  template = template.replace('<link rel="stylesheet" href="./src/styles.css" />', () => `<style>${styles}</style>`);
  template = template.replace('<link rel="stylesheet" href="./src/calendar.css" />', '');
  template = template.replace('<link rel="stylesheet" href="./src/routine.css" />', '');
  template = template.replace('<script type="module" src="./src/app.js"></script>', () => `<script>${script}</script>`);
  return template;
}

export async function buildStandalone() {
  const html = await standaloneHtml();
  const target = new URL('Focalizador.html', sourceRoot);
  await writeFile(target, html, 'utf8');
  console.log(`Versão sem servidor: ${fileURLToPath(target)}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await buildStandalone();
