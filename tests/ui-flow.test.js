import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { standaloneHtml } from '../scripts/build-standalone.mjs';

async function integratedFlow(context, standalone = false) {
  class Storage {
    data = new Map();
    getItem(key) { return this.data.get(key) || null; }
    setItem(key, value) { this.data.set(key, value); }
    removeItem(key) { this.data.delete(key); }
  }
  class Element {
    listeners = new Map();
    innerHTML = '';
    open = false;
    disabled = false;
    values = {};
    textContent = '';
    classList = { add() {}, remove() {} };
    addEventListener(name, callback) { this.listeners.set(name, callback); }
    showModal() { this.open = true; }
    close() { this.open = false; }
    querySelector(selector) {
      this.children ||= new Map();
      if (!this.children.has(selector)) this.children.set(selector, new Element());
      return this.children.get(selector);
    }
  }
  const elements = new Map(['#app', '#editor', '#alarm', '#toast'].map(key => [key, new Element()]));
  const listeners = new Map();
  const document = { head: { append() {} }, hidden: false, createElement: () => ({}), querySelector: selector => elements.get(selector), querySelectorAll: () => [], addEventListener: (name, callback) => listeners.set(name, callback) };
  const storage = new Storage();
  context.mock.method(globalThis, 'setInterval', () => 0);
  context.mock.method(globalThis, 'setTimeout', () => 0);
  const globals = { window: { addEventListener() {}, scrollTo() {} }, document, localStorage: storage, sessionStorage: new Storage(), confirm: () => true, FormData: class { constructor(form) { this.values = form.values; } *[Symbol.iterator]() { yield* Object.entries(this.values); } } };
  for (const [key, value] of Object.entries(globals)) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
    context.after(() => { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; });
  }
  let now = new Date(2026, 10, 7, 10).getTime();
  context.mock.method(Date, 'now', () => now);
  if (standalone) {
    const html = await standaloneHtml();
    const script = html.match(/<script>([\s\S]+)<\/script>/)?.[1];
    assert.ok(script);
    vm.runInThisContext(script, { filename: 'Focalizador.html' });
  } else await import('../src/app.js');
  const root = elements.get('#app');
  const editor = elements.get('#editor');
  const records = () => JSON.parse(storage.getItem('focalizador-v1:local')).records;
  const click = async (action, extra = {}) => {
    const target = { dataset: { action, ...extra }, disabled: false };
    await listeners.get('click')({ target: { closest: () => target }, preventDefault() {} });
  };
  const submit = async values => {
    const form = editor.querySelector('form'); form.values = values;
    await form.listeners.get('submit')({ preventDefault() {} });
    assert.equal(form.querySelector('.form-error').textContent, '');
  };
  assert.match(root.innerHTML, /Seu primeiro passo/);
  await click('activity-new');
  assert.equal(editor.open, true);
  await submit({ name: 'Xadrez <script>', type: 'hobby', color: '#2563eb', weeklyHours: '3' });
  assert.equal(editor.open, false);
  const activity = Object.values(records()).find(record => record.kind === 'activity');
  assert.equal(activity.weeklyMinutes, 180);
  assert.match(root.innerHTML, /Xadrez &lt;script&gt;/);
  assert.doesNotMatch(root.innerHTML, /Xadrez <script>/);
  await click('timer-start', { id: activity.id });
  now += 60000;
  await click('timer-toggle');
  assert.equal(records().timer.running, false);
  now += 120000;
  await click('timer-toggle');
  now += 60000;
  await click('timer-finish');
  const session = Object.values(records()).find(record => record.kind === 'session');
  assert.equal(session.durationMs, 120000);
  assert.equal(records().timer.deleted, true);
  await click('timer-start', { id: activity.id });
  assert.equal(records().timer.deleted, false);
  await click('navigate', { view: 'agenda' });
  assert.match(root.innerHTML, /Um dia de cada vez/);
  assert.match(root.innerHTML, /calendar-grid month-view/);
  assert.match(root.innerHTML, /data-details-mode="sessions" aria-pressed="true"/);
  assert.match(root.innerHTML, /data-details-mode="summary" aria-pressed="false"/);
  await click('calendar-mode', { mode: 'week' });
  assert.match(root.innerHTML, /calendar-grid week-view/);
  assert.equal(storage.getItem('focus-agenda-mode'), 'week');
  await click('date-select', { date: '2027-01-31' });
  await click('calendar-mode', { mode: 'month' });
  await click('date-next');
  assert.match(root.innerHTML, /id="agenda-date" value="2027-02-28"/);
  await click('date-prev');
  assert.match(root.innerHTML, /id="agenda-date" value="2027-01-28"/);
  await click('date-select', { date: '2026-11-07' });
  await click('event-new');
  await submit({ title: 'Treino pessoal', start: '2026-11-07T15:00', end: '2026-11-07T16:00', activityId: activity.id, alert: 'none', urgency: 'high', leadMinutes: '0', note: 'Sem som' });
  const event = Object.values(records()).find(record => record.kind === 'event');
  assert.equal(event.alert, 'none');
  assert.match(root.innerHTML, /<div class="daily-sessions">/);
  assert.match(root.innerHTML, /Treino pessoal/);
  await click('agenda-details-mode', { detailsMode: 'summary' });
  assert.match(root.innerHTML, /<div class="daily-tasks">/);
  assert.match(root.innerHTML, /Xadrez &lt;script&gt;/);
  assert.equal(storage.getItem('focus-agenda-details-mode'), 'summary');
  await click('agenda-details-mode', { detailsMode: 'sessions' });
  assert.match(root.innerHTML, /<div class="daily-sessions">/);
  assert.equal(storage.getItem('focus-agenda-details-mode'), 'sessions');
  await click('event-edit', { id: event.id });
  await click('event-done', { id: event.id });
  assert.equal(records()[event.id].done, true);
  await click('navigate', { view: 'stats' });
  assert.match(root.innerHTML, /Histórico recente/);
  await click('stats-period', { period: '30' });
  assert.match(root.innerHTML, /30 dias/);
  await click('navigate', { view: 'settings' });
  assert.match(root.innerHTML, /Configurar conexões/);
  await click('login');
  await click('reset-password');
  assert.match(editor.querySelector('.dialog-status').textContent, /Preencha seu e-mail/);
  await click('close-dialog');
  await click('configuration');
  await submit({ projectId: 'test-project', apiKey: 'example-key', googleClientId: '', googleClientSecret: '' });
  assert.equal(JSON.parse(storage.getItem('focus-config')).projectId, 'test-project');
}

test('fluxo integrado: criar atividade, pausar, concluir, cadastrar compromisso e navegar', context => integratedFlow(context));
test('arquivo HTML independente executa o mesmo fluxo sem servidor nem módulos externos', context => integratedFlow(context, true));
