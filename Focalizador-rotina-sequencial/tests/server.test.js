import test from 'node:test';
import assert from 'node:assert/strict';
import { handleRequest } from '../scripts/serve.mjs';

test('tratamento HTTP entrega a interface e bloqueia arquivos internos', async () => {
  const request = async (url, method = 'GET') => {
    const response = { status: 0, headers: {}, body: '', writeHead(status, headers) { this.status = status; this.headers = headers || {}; }, end(body) { this.body = body?.toString() || ''; } };
    await handleRequest({ url, method }, response);
    return response;
  };
  const response = await request('/');
  assert.equal(response.status, 200);
  assert.match(response.body, /src\/app.js/);
  assert.equal((await request('/src/styles.css')).status, 200);
  assert.equal((await request('/src/app.js')).headers['Content-Type'], 'text/javascript; charset=utf-8');
  assert.equal((await request('/desktop/main.cjs')).status, 404);
  assert.equal((await request('/package.json')).status, 404);
  assert.equal((await request('/.env.local')).status, 404);
  assert.equal((await request('/%2e%2e%2fREADME.md')).status, 404);
  assert.equal((await request('/', 'POST')).status, 405);
  assert.equal((await request('/', 'HEAD')).body, '');
});
