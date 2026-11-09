import { cleanRecord } from './store.js';
import { validateRecord } from './domain.js';

export async function jsonFetch(url, options = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(20000) });
  const body = response.status === 204 ? {} : await response.json();
  if (!response.ok) { const error = new Error(body.error?.message || `Falha na conexão (${response.status}).`); error.status = response.status; throw error; }
  return body;
}
export class Cloud {
  constructor(config, sessionStorage) {
    this.config = config;
    this.sessionStorage = sessionStorage;
    this.session = JSON.parse(sessionStorage.getItem('focus-auth') || 'null');
    if (this.session?.projectId !== config.projectId) this.session = null;
    this.busy = false;
  }
  async auth(action, email, password) {
    if (!this.config.apiKey || !this.config.projectId) throw new Error('Configure o Firebase antes de entrar na conta.');
    const body = await jsonFetch(`https://identitytoolkit.googleapis.com/v1/accounts:${action}?key=${encodeURIComponent(this.config.apiKey)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }) });
    this.session = { uid: body.localId, email: body.email, token: body.idToken, refresh: body.refreshToken, expires: Date.now() + Number(body.expiresIn) * 1000, projectId: this.config.projectId };
    this.persist();
    return this.session;
  }
  persist() { this.sessionStorage.setItem('focus-auth', JSON.stringify(this.session)); }
  logout() { this.session = null; this.sessionStorage.removeItem('focus-auth'); }
  async reset(email) {
    await jsonFetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${encodeURIComponent(this.config.apiKey)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestType: 'PASSWORD_RESET', email }) });
  }
  async token() {
    if (!this.session) throw new Error('Entre na sua conta.');
    if (this.session.expires - Date.now() < 60000) {
      const body = await jsonFetch(`https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(this.config.apiKey)}`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: this.session.refresh }).toString() });
      this.session = { ...this.session, token: body.id_token, refresh: body.refresh_token, expires: Date.now() + Number(body.expires_in) * 1000 };
      this.persist();
    }
    return this.session.token;
  }
  async sync(store) {
    if (this.busy || !this.session) return;
    this.busy = true;
    try {
      const token = await this.token();
      const base = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(this.config.projectId)}/databases/(default)/documents/users/${encodeURIComponent(this.session.uid)}/records`;
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      const remote = new Map();
      let pageToken = '';
      do {
        const page = await jsonFetch(`${base}?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`, { headers });
        for (const document of page.documents || []) { const record = validateRecord(JSON.parse(document.fields.data.stringValue)); remote.set(record.id, { ...record, _cloudTime: document.updateTime }); }
        pageToken = page.nextPageToken || '';
      } while (pageToken);
      store.transaction(next => {
        for (const [id, record] of remote) {
          const local = next.records[id];
          if (!local?._dirty || local.changeId === record.changeId) { next.records[id] = { ...record, _dirty: false }; delete next.conflicts[id]; }
          else if (local._cloudTime !== record._cloudTime) next.conflicts[id] = record;
          else delete next.conflicts[id];
        }
      });
      for (const record of Object.values(store.state.records)) {
        if (!record._dirty || store.state.conflicts[record.id]) continue;
        const precondition = record._cloudTime ? `currentDocument.updateTime=${encodeURIComponent(record._cloudTime)}` : 'currentDocument.exists=false';
        try {
          const saved = await jsonFetch(`${base}/${encodeURIComponent(record.id)}?${precondition}`, { method: 'PATCH', headers, body: JSON.stringify({ fields: { data: { stringValue: JSON.stringify(cleanRecord(record)) } } }) });
          store.transaction(next => {
            if (next.records[record.id]?.changeId === record.changeId) next.records[record.id] = { ...record, _dirty: false, _cloudTime: saved.updateTime };
            else if (next.records[record.id]) next.records[record.id]._cloudTime = saved.updateTime;
          });
        } catch (error) {
          if ([400, 409, 412].includes(error.status)) throw new Error('Outra alteração chegou durante a sincronização. Tente sincronizar novamente para resolver o conflito.');
          throw error;
        }
      }
      return Object.keys(store.state.conflicts).length;
    } finally { this.busy = false; }
  }
}
