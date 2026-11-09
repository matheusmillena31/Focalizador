const { app, BrowserWindow, ipcMain, Notification, Tray, Menu, nativeImage, dialog, shell, powerMonitor } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { deflateSync } = require('node:zlib');
const { authorize } = require('./oauth.cjs');

let window;
let tray;
let quitting = false;
let scheduler = { events: [], fired: [], namespace: 'local' };
let dataFile;
let currentAlarm;
const home = pathToFileURL(path.join(__dirname, '../dist/index.html')).href;
app.setAppUserModelId('com.focalizador.personal');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => show());
  app.whenReady().then(() => {
    dataFile = path.join(app.getPath('userData'), 'reminders.json');
    try { scheduler = JSON.parse(fs.readFileSync(dataFile, 'utf8')); } catch {}
    createWindow();
    tray = new Tray(makeIcon());
    tray.setToolTip('Focalizador · seus alertas continuam ativos');
    tray.setContextMenu(Menu.buildFromTemplate([{ label: 'Abrir Focalizador', click: show }, { type: 'separator' }, { label: 'Sair e desativar alertas', click: () => { quitting = true; app.quit(); } }]));
    tray.on('double-click', show);
    setInterval(checkReminders, 1000);
    powerMonitor.on('resume', checkReminders);
  });
}
function makeIcon() {
  const crc = buffer => { let value = 0xffffffff; for (const byte of buffer) { value ^= byte; for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1; } return (value ^ 0xffffffff) >>> 0; };
  const chunk = (name, bytes) => { const label = Buffer.from(name); const size = Buffer.alloc(4); size.writeUInt32BE(bytes.length); const checksum = Buffer.alloc(4); checksum.writeUInt32BE(crc(Buffer.concat([label, bytes]))); return Buffer.concat([size, label, bytes, checksum]); };
  const header = Buffer.alloc(13); header.writeUInt32BE(32); header.writeUInt32BE(32, 4); header[8] = 8; header[9] = 6;
  const pixels = Buffer.alloc(32 * 129);
  for (let row = 0; row < 32; row++) for (let column = 0; column < 32; column++) { const position = row * 129 + 1 + column * 4; const light = (column > 13 && column < 18 && row > 5 && row < 26) || (row > 13 && row < 18 && column > 5 && column < 26); pixels.set(light ? [255, 255, 255, 255] : [37, 99, 235, 255], position); }
  return nativeImage.createFromBuffer(Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(pixels)), chunk('IEND', Buffer.alloc(0))]));
}
function createWindow() {
  window = new BrowserWindow({ width: 1350, height: 940, minWidth: 360, minHeight: 650, backgroundColor: '#f4f8ff', title: 'Focalizador', icon: makeIcon(), autoHideMenuBar: true, webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false } });
  window.loadFile(path.join(__dirname, '../dist/index.html'));
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => { if (url !== home) event.preventDefault(); });
  window.webContents.session.setPermissionRequestHandler((contents, permission, callback) => callback(contents === window.webContents && contents.getURL() === home && permission === 'notifications'));
  window.on('close', event => { if (!quitting) { event.preventDefault(); window.hide(); } });
  window.webContents.on('did-finish-load', () => { if (currentAlarm) window.webContents.send('focus:alarm', currentAlarm); });
}
function show() { if (!window || window.isDestroyed()) createWindow(); if (window.isMinimized()) window.restore(); window.show(); window.focus(); }
function trusted(event) { if (event.sender !== window?.webContents || event.senderFrame?.url !== home) throw new Error('Solicitação de origem não permitida.'); }
function saveScheduler() { fs.writeFileSync(`${dataFile}.tmp`, JSON.stringify(scheduler), 'utf8'); fs.renameSync(`${dataFile}.tmp`, dataFile); }
function checkReminders() {
  const now = Date.now();
  for (const event of scheduler.events || []) {
    if (event.at > now || event.at < now - 300000 || scheduler.fired.includes(event.key)) continue;
    scheduler.fired = [...scheduler.fired, event.key].slice(-2000); saveScheduler();
    const notification = new Notification({ title: event.title, body: event.mode === 'alarm' ? 'Alarme · abra o Focalizador para parar.' : 'Seu compromisso está chegando.', silent: event.mode === 'alarm' });
    notification.on('click', () => { show(); if (event.mode === 'alarm') window.webContents.send('focus:alarm', event); });
    notification.show();
    if (event.mode === 'alarm') { currentAlarm = event; show(); if (!window.webContents.isLoading()) window.webContents.send('focus:alarm', event); }
  }
}
ipcMain.handle('focus:schedule', (event, events, namespace) => {
  trusted(event);
  if (!Array.isArray(events) || events.length > 2000 || typeof namespace !== 'string') throw new Error('Agenda inválida.');
  for (const reminder of events) if (typeof reminder.id !== 'string' || typeof reminder.key !== 'string' || typeof reminder.title !== 'string' || reminder.title.length > 120 || !Number.isFinite(reminder.at) || !['notification', 'alarm'].includes(reminder.mode)) throw new Error('Lembrete inválido.');
  if (scheduler.namespace !== namespace) { scheduler.fired = []; currentAlarm = null; }
  scheduler.events = events; scheduler.namespace = namespace; saveScheduler(); return { scheduled: events.length };
});
ipcMain.handle('focus:stop-alarm', event => { trusted(event); currentAlarm = null; });
ipcMain.handle('focus:calendar', (event, clientId, clientSecret) => { trusted(event); return authorize(clientId, clientSecret, url => shell.openExternal(url)); });
ipcMain.handle('focus:save', async (event, name, text) => {
  trusted(event);
  if (typeof text !== 'string' || text.length > 10000000 || typeof name !== 'string' || !/^[a-zA-Z0-9.-]+$/.test(name)) throw new Error('Arquivo inválido.');
  const result = await dialog.showSaveDialog(window, { defaultPath: name });
  if (!result.canceled && result.filePath) { await fs.promises.writeFile(result.filePath, text, 'utf8'); return { saved: true }; }
  return { saved: false };
});
app.on('before-quit', () => { quitting = true; });
app.on('window-all-closed', () => {});
