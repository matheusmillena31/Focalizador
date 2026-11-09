const http = require('node:http');
const crypto = require('node:crypto');

let inProgress = false;
exports.authorize = async function authorize(clientId, clientSecret, openBrowser) {
  if (inProgress) throw new Error('Já existe uma autorização Google em andamento.');
  if (typeof clientId !== 'string' || !/^[a-zA-Z0-9-]+\.apps\.googleusercontent\.com$/.test(clientId)) throw new Error('Configure o Client ID de aplicativo desktop nos Ajustes.');
  if (typeof clientSecret !== 'string' || clientSecret.length > 500) throw new Error('Client secret inválido.');
  inProgress = true;
  const state = crypto.randomBytes(32).toString('base64url');
  const verifier = crypto.randomBytes(48).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  let server;
  let timeout;
  try {
    const result = new Promise((resolve, reject) => {
      server = http.createServer((request, response) => {
        const url = new URL(request.url, 'http://127.0.0.1');
        if (url.pathname !== '/callback') { response.writeHead(404); response.end(); return; }
        if (url.searchParams.get('state') !== state) { response.writeHead(400); response.end('Estado de autenticacao invalido.'); return; }
        response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Security-Policy': "default-src 'none'", 'Cache-Control': 'no-store' });
        response.end('Você já pode voltar ao Focalizador e fechar esta aba.');
        if (url.searchParams.get('error')) reject(new Error('A autorização do Google foi cancelada.'));
        else if (!url.searchParams.get('code')) reject(new Error('O Google não retornou um código.'));
        else resolve(url.searchParams.get('code'));
      });
      server.on('error', reject);
      timeout = setTimeout(() => reject(new Error('O tempo para autorizar terminou. Tente novamente.')), 180000);
    });
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    const redirect = `http://127.0.0.1:${server.address().port}/callback`;
    const query = new URLSearchParams({ client_id: clientId, redirect_uri: redirect, response_type: 'code', scope: 'https://www.googleapis.com/auth/calendar.events', state, code_challenge: challenge, code_challenge_method: 'S256', access_type: 'online', prompt: 'consent' });
    await openBrowser(`https://accounts.google.com/o/oauth2/v2/auth?${query}`);
    const code = await result;
    const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirect, grant_type: 'authorization_code', code_verifier: verifier }), signal: AbortSignal.timeout(20000) });
    const body = await response.json();
    if (!response.ok || !body.access_token) throw new Error(body.error_description || 'Falha ao autorizar o Google Agenda.');
    return { accessToken: body.access_token };
  } finally { clearTimeout(timeout); server?.close(); server?.closeAllConnections(); inProgress = false; }
};
