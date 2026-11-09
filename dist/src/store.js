import { uid, validateRecord } from './domain.js';

export class Store {
  constructor(storage, namespace = 'local') {
    this.storage = storage;
    this.namespace = namespace;
    this.key = `focalizador-v1:${namespace}`;
    const raw = storage.getItem(this.key);
    this.state = raw ? JSON.parse(raw) : { version: 1, records: {}, fired: [], conflicts: {} };
    if (this.state.version !== 1 || !this.state.records) throw new Error('Formato de dados não suportado. Exporte uma cópia antes de continuar.');
  }
  transaction(callback) {
    const next = structuredClone(this.state);
    callback(next);
    this.storage.setItem(this.key, JSON.stringify(next));
    this.state = next;
  }
  all(kind) { return Object.values(this.state.records).filter(record => !record.deleted && (!kind || record.kind === kind)); }
  get(id) { const record = this.state.records[id]; return record?.deleted ? null : record; }
  put(record) { this.batch([record]); }
  batch(records) {
    this.transaction(next => {
      for (const record of records) {
        validateRecord(record);
        next.records[record.id] = { ...next.records[record.id], deleted: false, ...record, changeId: uid(), modifiedAt: Date.now(), _dirty: true };
      }
    });
  }
  remove(id) { const record = this.get(id); if (record) this.put({ ...record, deleted: true }); }
  markFired(key) { this.transaction(next => { next.fired = [...next.fired.filter(value => value !== key), key].slice(-1000); }); }
  export() { return { app: 'Focalizador', version: 1, exportedAt: new Date().toISOString(), records: Object.values(this.state.records).map(cleanRecord) }; }
  import(data) {
    if (data?.app !== 'Focalizador' || data.version !== 1 || !Array.isArray(data.records) || data.records.length > 20000) throw new Error('Este arquivo não é um backup válido do Focalizador.');
    const records = data.records.map(record => cleanRecord(validateRecord(record)));
    this.batch(records);
  }
}
export function cleanRecord(record) { return Object.fromEntries(Object.entries(record).filter(([key]) => !key.startsWith('_'))); }
