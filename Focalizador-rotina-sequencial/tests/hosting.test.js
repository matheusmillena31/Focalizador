import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { hostingSettings, siteExists, PROJECT_ID } from '../scripts/publish-firebase.mjs';

test('publicação envia somente a pasta da interface do projeto correto', async () => {
  const config = JSON.parse(await readFile(new URL('../firebase.json', import.meta.url), 'utf8'));
  assert.equal(hostingSettings(config).public, 'web-public');
  assert.throws(() => hostingSettings({ hosting: { ...config.hosting, public: '.' } }));
  assert.throws(() => hostingSettings({ ...config, firestore: {} }));
});
test('site existente é reconhecido e resposta inválida não dispara criação indevida', () => {
  assert.equal(siteExists({ status: 'success', result: { sites: [{ name: `projects/${PROJECT_ID}/sites/${PROJECT_ID}` }] } }), true);
  assert.equal(siteExists({ status: 'success', result: { sites: [] } }), false);
  assert.throws(() => siteExists({ status: 'error' }));
});
