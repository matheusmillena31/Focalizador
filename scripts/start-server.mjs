export async function startServer({ server, port, identify, open, log = console.log, logError = console.error }) {
  const ready = await new Promise(resolve => {
    const onError = error => { server.removeListener('listening', onListening); resolve({ error }); };
    const onListening = () => { server.removeListener('error', onError); resolve({ started: true }); };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, '127.0.0.1');
  });
  if (ready.error && ready.error.code !== 'EADDRINUSE') {
    logError(`Não foi possível iniciar o Focalizador: ${ready.error.message}`);
    return { exitCode: 1 };
  }
  const actualPort = ready.started ? server.address().port : port;
  const url = `http://127.0.0.1:${actualPort}`;
  if (ready.error) {
    let recognized = false;
    try { recognized = await identify(url); } catch {}
    if (!recognized) {
      logError(`A porta ${port} já está sendo usada por outro programa ou não foi possível verificar a instância aberta.`);
      logError(`Se você já abriu o Focalizador, tente acessar ${url} no navegador.`);
      logError('Para iniciar esta cópia, feche a janela original do Focalizador e tente novamente. Nenhum processo foi encerrado automaticamente.');
      logError('Evite mudar de porta: seus registros locais estão associados ao endereço usado anteriormente.');
      return { exitCode: 1 };
    }
    log(`O Focalizador já está aberto: ${url}`);
    log('Você pode fechar esta nova janela. Mantenha aberta a janela que iniciou o programa primeiro.');
  } else {
    log(`Focalizador: ${url}`);
    log('Mantenha esta janela aberta enquanto usa o programa. Para encerrar, pressione Ctrl+C.');
    server.on('error', error => logError(`Erro no servidor local: ${error.message}`));
  }
  if (open) {
    try { await open(url); } catch { log(`Abra este endereço no navegador: ${url}`); }
  }
  return { exitCode: 0, reused: !ready.started, url };
}
