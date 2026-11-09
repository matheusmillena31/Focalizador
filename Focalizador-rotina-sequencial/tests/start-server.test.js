import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { startServer } from '../scripts/start-server.mjs';

class FakeServer extends EventEmitter {
  constructor(error) { super(); this.error = error; }
  listen(port, host) {
    this.port = port; this.host = host;
    queueMicrotask(() => this.emit(this.error ? 'error' : 'listening', this.error));
  }
  address() { return { port: this.port || 49152 }; }
}
test('primeira inicialização abre o navegador na porta efetivamente escolhida', async () => {
  const server = new FakeServer(); const opened = [];
  const result = await startServer({ server, port: 4173, open: async url => opened.push(url), log() {} });
  assert.equal(result.reused, false);
  assert.deepEqual(opened, ['http://127.0.0.1:4173']);
  assert.equal(server.host, '127.0.0.1');
});
test('porta ocupada pelo Focalizador reutiliza a instância sem trocar de endereço', async () => {
  const server = new FakeServer({ code: 'EADDRINUSE' }); const opened = []; const messages = [];
  const result = await startServer({ server, port: 4173, identify: async () => true, open: async url => opened.push(url), log: message => messages.push(message) });
  assert.equal(result.exitCode, 0);
  assert.equal(result.reused, true);
  assert.deepEqual(opened, ['http://127.0.0.1:4173']);
  assert.ok(messages.some(message => message.includes('já está aberto')));
});
test('porta ocupada por programa desconhecido explica o problema sem abrir ou encerrar processos', async () => {
  const errors = []; let opened = false;
  const result = await startServer({ server: new FakeServer({ code: 'EADDRINUSE' }), port: 4173, identify: async () => false, open: async () => { opened = true; }, logError: message => errors.push(message) });
  assert.equal(result.exitCode, 1);
  assert.equal(opened, false);
  assert.ok(errors.some(message => message.includes('registros locais')));
});
test('falha ao verificar a instância não derruba a inicialização com exceção', async () => {
  const result = await startServer({ server: new FakeServer({ code: 'EADDRINUSE' }), port: 4173, identify: async () => { throw new Error('EACCES'); }, logError() {} });
  assert.equal(result.exitCode, 1);
});
test('outros erros de rede são comunicados sem consultar a instância', async () => {
  let checked = false;
  const result = await startServer({ server: new FakeServer({ code: 'EACCES', message: 'Acesso negado' }), port: 4173, identify: async () => { checked = true; }, logError() {} });
  assert.equal(result.exitCode, 1);
  assert.equal(checked, false);
});
