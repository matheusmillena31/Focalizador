import test from 'node:test';
import assert from 'node:assert/strict';
import { Cloud } from '../src/cloud.js';
import { Store } from '../src/store.js';

class MemoryStorage {
  data = new Map();
  getItem(key) { return this.data.get(key) || null; }
  setItem(key, value) { this.data.set(key, value); }
  removeItem(key) { this.data.delete(key); }
}
function fixture() {
  const session = new MemoryStorage();
  session.setItem('focus-auth', JSON.stringify({ uid: 'user', email: 'test@example.com', token: 'token', refresh: 'refresh', expires: Date.now() + 3600000, projectId: 'test-project' }));
  return { cloud: new Cloud({ apiKey: 'key', projectId: 'test-project' }, session), store: new Store(new MemoryStorage(), 'user') };
}
const activity = { id: 'activity', kind: 'activity', name: 'Xadrez', type: 'hobby', weeklyMinutes: 60, color: '#2563eb', changeId: 'remote-change' };
const document = (record, time = '2026-11-07T00:00:00Z') => ({ fields: { data: { stringValue: JSON.stringify(record) } }, updateTime: time });
test('sincronização usa precondição para impedir sobrescrita concorrente', async context => {
  const { cloud, store } = fixture(); store.put(activity);
  const requests = [];
  context.mock.method(globalThis, 'fetch', async (url, options) => { requests.push({ url, options }); return Response.json(options.method === 'PATCH' ? { updateTime: 'time-1' } : { documents: [] }); });
  await cloud.sync(store);
  assert.match(requests[1].url, /currentDocument.exists=false/);
  assert.equal(store.get('activity')._dirty, false);
  store.put({ ...store.get('activity'), name: 'Leitura' });
  await cloud.sync(store);
  assert.match(requests.at(-1).url, /currentDocument.updateTime=time-1/);
});
test('mudança concorrente preserva os dois lados e não envia PATCH', async context => {
  const { cloud, store } = fixture(); store.put({ ...activity, name: 'Minha alteração' });
  let writes = 0;
  context.mock.method(globalThis, 'fetch', async (_url, options) => { if (options.method === 'PATCH') writes++; return Response.json({ documents: [document(activity)] }); });
  assert.equal(await cloud.sync(store), 1);
  assert.equal(store.get('activity').name, 'Minha alteração');
  assert.equal(store.state.conflicts.activity.name, 'Xadrez');
  assert.equal(writes, 0);
});
test('resposta perdida após gravação não cria conflito falso', async context => {
  const { cloud, store } = fixture(); store.put(activity);
  const current = store.get('activity');
  context.mock.method(globalThis, 'fetch', async () => Response.json({ documents: [document(current)] }));
  assert.equal(await cloud.sync(store), 0);
  assert.equal(store.get('activity')._dirty, false);
});
test('edição feita enquanto o envio acontece continua pendente', async context => {
  const { cloud, store } = fixture(); store.put(activity);
  context.mock.method(globalThis, 'fetch', async (_url, options) => {
    if (options.method === 'PATCH') { store.put({ ...store.get('activity'), name: 'Mudou durante o envio' }); return Response.json({ updateTime: 'time-2' }); }
    return Response.json({ documents: [] });
  });
  await cloud.sync(store);
  assert.equal(store.get('activity')._dirty, true);
  assert.equal(store.get('activity')._cloudTime, 'time-2');
  assert.equal(store.get('activity').name, 'Mudou durante o envio');
});
test('erro de rede mantém fila e libera tentativa seguinte', async context => {
  const { cloud, store } = fixture(); store.put(activity);
  context.mock.method(globalThis, 'fetch', async () => { throw new Error('offline'); });
  await assert.rejects(cloud.sync(store), /offline/);
  assert.equal(store.get('activity')._dirty, true);
  assert.equal(cloud.busy, false);
});
