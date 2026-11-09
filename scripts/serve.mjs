import http from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { startServer } from './start-server.mjs';

const root = await realpath(path.resolve(process.argv[2]?.startsWith('--') ? '.' : process.argv[2] || '.'));
const instanceId = createHash('sha256').update(process.platform === 'win32' ? root.toLowerCase() : root).digest('hex');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
export async function handleRequest(request, response) {
  try {
    if (!['GET', 'HEAD'].includes(request.method || 'GET')) { response.writeHead(405); response.end(); return; }
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const target = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!target.startsWith(`${root}${path.sep}`) || !types[path.extname(target)] || /node_modules|desktop|tests|scripts/.test(path.relative(root, target))) throw new Error('404');
    const resolved = await realpath(target);
    if (!resolved.startsWith(`${root}${path.sep}`)) throw new Error('404');
    const content = await readFile(resolved);
    response.writeHead(200, { 'Content-Type': types[path.extname(target)], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Focalizador-Instance': instanceId }); response.end(request.method === 'HEAD' ? undefined : content);
  } catch { response.writeHead(404); response.end('Não encontrado'); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const port = Number(process.env.PORT || 4173);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    console.error('A porta configurada é inválida. Use um número entre 1 e 65535.');
    process.exitCode = 1;
  } else {
    const result = await startServer({
      server: http.createServer(handleRequest),
      port,
      identify: async url => {
        const response = await fetch(url, { signal: AbortSignal.timeout(2500), redirect: 'error' });
        if (!response.ok) return false;
        const existingId = response.headers.get('x-focalizador-instance');
        if (existingId) { await response.body?.cancel(); return existingId === instanceId; }
        const expected = await readFile(path.join(root, 'index.html'), 'utf8');
        if (await response.text() !== expected) return false;
        const script = await fetch(`${url}/src/app.js`, { signal: AbortSignal.timeout(2500), redirect: 'error' });
        return script.ok && await script.text() === await readFile(path.join(root, 'src/app.js'), 'utf8');
      },
      open: process.argv.includes('--open') && process.platform === 'win32' ? url => new Promise((resolve, reject) => {
        const opener = spawn('rundll32.exe', ['url.dll,FileProtocolHandler', url], { windowsHide: true, stdio: 'ignore' });
        opener.once('error', reject);
        opener.once('spawn', () => { opener.unref(); resolve(); });
      }) : null
    });
    process.exitCode = result.exitCode;
  }
}
