import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { standaloneHtml } from '../scripts/build-standalone.mjs';
import vm from 'node:vm';

test('versão independente embute interface, estilos e código com hash válido na política de segurança', async () => {
  const html = await standaloneHtml();
  const script = html.match(/<script>([\s\S]+)<\/script>/)?.[1];
  assert.ok(script);
  assert.match(html, /<style>[\s\S]+\.focus-card/);
  assert.doesNotMatch(html, /<script[^>]+src=/);
  assert.doesNotMatch(html, /<link[^>]+stylesheet/);
  assert.doesNotMatch(script, /^\s*import\s|^\s*export\s|import\.meta/m);
  const digest = createHash('sha256').update(script.replace(/\r\n?/g, '\n')).digest('base64');
  assert.ok(html.includes(`'sha256-${digest}'`));
});

test('armazenamento bloqueado permite testar e exibe aviso para exportar backup', async () => {
  const html = await standaloneHtml();
  const script = html.match(/<script>([\s\S]+)<\/script>/)[1];
  const elements = new Map(['#app', '#editor', '#alarm', '#toast'].map(name => [name, { innerHTML: '', style: {}, addEventListener() {}, classList: { add() {}, remove() {} } }]));
  const warnings = [];
  const listeners = new Map();
  const sandbox = {
    window: { location: { protocol: 'file:' }, addEventListener() {}, scrollTo() {} },
    document: { hidden: false, querySelector: name => elements.get(name), querySelectorAll: () => [], addEventListener: (name, callback) => listeners.set(name, callback), body: { insertAdjacentHTML: (_position, value) => warnings.push(value) } },
    setInterval: () => 0, setTimeout: () => 0, clearTimeout() {}, clearInterval() {},
    crypto: globalThis.crypto, structuredClone, console
  };
  for (const key of ['localStorage', 'sessionStorage']) Object.defineProperty(sandbox, key, { get() { throw new Error('SecurityError'); } });
  const context = vm.createContext(sandbox);
  vm.runInContext(script, context);
  assert.match(elements.get('#app').innerHTML, /Seu primeiro passo/);
  assert.match(warnings[0], /exportar um backup/);
  const target = { dataset: { action: 'starter' }, disabled: false };
  await listeners.get('click')({ target: { closest: () => target }, preventDefault() {} });
  assert.match(elements.get('#app').innerHTML, /Xadrez/);
  assert.match(elements.get('#app').innerHTML, /Teste temporário/);
});
