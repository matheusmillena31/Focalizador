import { dueReminders, reminderKey } from './domain.js';

let native;
export async function nativeBridge() {
  if (!window.Capacitor?.isNativePlatform()) return null;
  if (!native) { const { registerPlugin } = await import('../vendor/capacitor.js'); native = registerPlugin('FocusNative'); }
  return native;
}
export async function requestAlerts() {
  const bridge = await nativeBridge();
  if (bridge) return bridge.permissions();
  if (window.focusDesktop) return { granted: true };
  if (window.location?.protocol === 'file:') return { granted: true, inPage: true };
  if (!('Notification' in window)) throw new Error('Este navegador não oferece notificações.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Permissão de notificações não concedida.');
  return { granted: true };
}
export async function scheduleAlerts(events, namespace, fired = []) {
  const upcoming = events.filter(event => !event.done && !event.deleted && event.alert !== 'none' && !fired.includes(reminderKey(event))).map(event => ({ id: event.id, title: event.title, at: event.start - event.leadMinutes * 60000, mode: event.alert, key: reminderKey(event) })).filter(event => event.at > Date.now());
  const bridge = await nativeBridge();
  if (bridge) return bridge.schedule({ events: upcoming, namespace });
  if (window.focusDesktop) return window.focusDesktop.schedule(upcoming, namespace);
}
export function checkBrowserAlerts(events, store, onAlarm) {
  if (window.focusDesktop || window.Capacitor?.isNativePlatform()) return;
  for (const event of dueReminders(events, store.state.fired)) {
    store.markFired(reminderKey(event));
    if (event.alert === 'alarm') onAlarm(event);
    else if ('Notification' in window && Notification.permission === 'granted') new Notification(event.title, { body: 'Seu compromisso está chegando.', tag: event.id });
    else onAlarm({ ...event, alert: 'notification' });
  }
}
let audioContext;
let soundInterval;
export async function unlockAudio() { audioContext ||= new AudioContext(); await audioContext.resume(); }
export async function alarmSound() {
  await unlockAudio(); stopSound();
  const beep = () => { const oscillator = audioContext.createOscillator(); const gain = audioContext.createGain(); oscillator.frequency.value = 740; gain.gain.setValueAtTime(0.13, audioContext.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5); oscillator.connect(gain).connect(audioContext.destination); oscillator.start(); oscillator.stop(audioContext.currentTime + 0.5); };
  beep(); soundInterval = setInterval(beep, 1300);
}
export function stopSound() { clearInterval(soundInterval); }
export async function calendarToken(config) {
  const bridge = await nativeBridge();
  if (bridge) return (await bridge.authorizeCalendar()).accessToken;
  if (window.focusDesktop) return (await window.focusDesktop.authorizeCalendar(config.googleClientId, config.googleClientSecret)).accessToken;
  throw new Error('A conexão direta ao Google Agenda funciona nos aplicativos Android e Windows. Nesta versão de navegador, exporte o compromisso em .ics.');
}
