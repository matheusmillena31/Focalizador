import test from 'node:test';
import assert from 'node:assert/strict';
import { startTimer, toggleTimer, timerElapsed, finishTimer, statistics, dayKey, validateEvent, validateRecord, dueReminders, reminderKey } from '../src/domain.js';
import { Store } from '../src/store.js';

class MemoryStorage {
  data = new Map();
  getItem(key) { return this.data.get(key) || null; }
  setItem(key, value) { this.data.set(key, value); }
}
test('cronômetro mantém pausas e continua correto depois de reabrir', () => {
  let timer = startTimer('xadrez', 10000);
  timer = toggleTimer(timer, 70000);
  assert.equal(timerElapsed(timer, 130000), 60000);
  timer = toggleTimer(timer, 130000);
  const reloaded = JSON.parse(JSON.stringify(timer));
  assert.equal(timerElapsed(reloaded, 160000), 90000);
  assert.equal(finishTimer(reloaded, { name: 'Xadrez' }, 160000).durationMs, 90000);
});
test('sessões atravessam meia-noite e pausas não contam como foco', () => {
  const start = new Date(2026, 10, 6, 23, 30).getTime();
  let timer = startTimer('xadrez', start);
  timer = toggleTimer(timer, start + 15 * 60000);
  timer = toggleTimer(timer, start + 45 * 60000);
  const end = start + 60 * 60000;
  const session = finishTimer(timer, { name: 'Xadrez' }, end);
  validateRecord(session);
  const stats = statistics([session], start, end);
  assert.equal(stats.total, 30 * 60000);
  assert.equal(stats.byDay[dayKey(start)], 15 * 60000);
  assert.equal(stats.byDay[dayKey(end)], 15 * 60000);
});
test('limites de período excluem sessões fora do intervalo', () => {
  const session = { activityId: 'xadrez', start: 1000, end: 11000, durationMs: 10000 };
  assert.equal(statistics([session], 6000, 9000).total, 3000);
  assert.equal(statistics([session], 12000, 13000).count, 0);
});
test('finalizar e começar outra sessão restaura o registro timer removido', () => {
  const storage = new MemoryStorage(); const store = new Store(storage);
  const timer = startTimer('xadrez', 1000); store.put(timer);
  store.batch([finishTimer(timer, { name: 'Xadrez' }, 61000), { ...timer, deleted: true }]);
  assert.equal(store.get('timer'), null);
  store.put(startTimer('xadrez', 70000));
  assert.ok(store.get('timer'));
  assert.equal(new Store(storage).all('session').length, 1);
});
test('gravações locais são atômicas quando o armazenamento fica cheio', () => {
  const storage = new MemoryStorage(); const store = new Store(storage);
  storage.setItem = () => { throw new Error('QuotaExceededError'); };
  assert.throws(() => store.put(startTimer('xadrez')), /Quota/);
  assert.equal(store.get('timer'), undefined);
});
test('backup valida tudo antes de importar e não traz metadados de nuvem', () => {
  const store = new Store(new MemoryStorage());
  store.put({ id: 'activity', kind: 'activity', name: 'Xadrez', type: 'hobby', weeklyMinutes: 60, color: '#2563eb' });
  const backup = store.export();
  assert.equal(backup.records[0]._dirty, undefined);
  const size = store.all().length;
  assert.throws(() => store.import({ ...backup, records: [...backup.records, { id: '../danger' }] }));
  assert.equal(store.all().length, size);
  assert.throws(() => store.import({ ...backup, records: [{ id: '__proto__', kind: 'event' }] }));
});
test('contas distintas não compartilham o armazenamento', () => {
  const storage = new MemoryStorage(); const local = new Store(storage); local.put(startTimer('xadrez'));
  assert.equal(new Store(storage, 'account-one').get('timer'), undefined);
});
test('alerta nenhum, concluídos e alertas já exibidos não disparam', () => {
  const event = { id: 'event', start: 1000000, leadMinutes: 10, alert: 'alarm' };
  assert.equal(dueReminders([event], [], 500000).length, 1);
  assert.equal(dueReminders([event], [reminderKey(event)], 500000).length, 0);
  assert.equal(dueReminders([{ ...event, alert: 'none' }, { ...event, done: true }], [], 500000).length, 0);
  assert.equal(dueReminders([event], [], 2000000).length, 0);
});
test('compromisso exige fim posterior ao início e alerta válido', () => {
  const input = { title: 'Treino', start: 1000, end: 2000, alert: 'alarm', leadMinutes: 0, urgency: 'normal' };
  assert.equal(validateEvent(input).alert, 'alarm');
  assert.throws(() => validateEvent({ ...input, end: 1000 }));
  assert.throws(() => validateEvent({ ...input, alert: 'toString' }));
});
