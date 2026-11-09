export const TYPES = { hobby: 'Hobby', duty: 'Dever' };
export const ALERTS = { none: 'Sem alerta', notification: 'Notificação', alarm: 'Alarme' };
export const COLORS = ['#2563eb', '#0891b2', '#7c3aed', '#059669', '#d97706'];
export const uid = () => crypto.randomUUID();
export const dayKey = (value = Date.now()) => {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
export function duration(milliseconds, seconds = false) {
  const total = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor(total / 60) % 60;
  return seconds ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}` : `${hours}h ${String(minutes).padStart(2, '0')}min`;
}
export function timerElapsed(timer, now = Date.now()) { return timer ? timer.elapsedMs + (timer.running ? Math.max(0, now - timer.startedAt) : 0) : 0; }
export function startTimer(activityId, now = Date.now()) { return { id: 'timer', kind: 'timer', activityId, sessionId: uid(), originAt: now, startedAt: now, elapsedMs: 0, intervals: [], running: true }; }
export function toggleTimer(timer, now = Date.now()) { return { ...timer, intervals: timer.running ? [...(timer.intervals || []), { start: timer.startedAt, end: Math.max(timer.startedAt, now) }] : timer.intervals || [], elapsedMs: timerElapsed(timer, now), startedAt: now, running: !timer.running }; }
export function finishTimer(timer, activity, now = Date.now()) { return { id: timer.sessionId, kind: 'session', activityId: timer.activityId, activityName: activity?.name || 'Atividade removida', color: activity?.color || COLORS[0], start: timer.originAt, end: now, durationMs: timerElapsed(timer, now), intervals: timer.running ? [...(timer.intervals || []), { start: timer.startedAt, end: now }] : timer.intervals || [], note: '', source: 'timer' }; }
export function validateActivity(input) {
  const name = String(input.name || '').trim();
  const weeklyMinutes = Number(input.weeklyMinutes);
  if (!name || name.length > 80) throw new Error('Informe um nome de até 80 caracteres.');
  if (!Object.hasOwn(TYPES, input.type)) throw new Error('Escolha hobby ou dever.');
  if (!Number.isFinite(weeklyMinutes) || weeklyMinutes < 0 || weeklyMinutes > 10080) throw new Error('A meta semanal deve ficar entre 0 e 168 horas.');
  if (!COLORS.includes(input.color)) throw new Error('Escolha uma das cores disponíveis.');
  return { name, type: input.type, weeklyMinutes, color: input.color };
}
export function validateEvent(input) {
  const title = String(input.title || '').trim();
  const start = Number(input.start);
  const end = Number(input.end);
  if (!title || title.length > 120) throw new Error('Informe um título de até 120 caracteres.');
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || Math.abs(start) > 8000000000000000 || Math.abs(end) > 8000000000000000) throw new Error('O fim deve ser posterior ao início e as datas devem ser válidas.');
  if (!Object.hasOwn(ALERTS, input.alert)) throw new Error('Escolha um tipo de alerta.');
  if (!['low', 'normal', 'high'].includes(input.urgency)) throw new Error('Escolha uma urgência válida.');
  const leadMinutes = Number(input.leadMinutes);
  if (!Number.isFinite(leadMinutes) || leadMinutes < 0 || leadMinutes > 10080) throw new Error('Antecedência inválida.');
  return { title, start, end, alert: input.alert, leadMinutes, urgency: input.urgency, note: String(input.note || '').slice(0, 2000), activityId: input.activityId || '' };
}
export function weekStart(now = Date.now()) {
  const date = new Date(now);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - (date.getDay() + 6) % 7);
  return date.getTime();
}
export function splitSession(session) {
  const segments = [];
  const intervals = session.intervals?.length ? session.intervals : [{ start: session.start, end: session.end }];
  for (const interval of intervals) {
    let cursor = interval.start;
    const ratio = session.intervals?.length ? 1 : session.durationMs / Math.max(1, session.end - session.start);
    while (cursor < interval.end) {
      const next = new Date(cursor);
      next.setHours(24, 0, 0, 0);
      const stop = Math.min(next.getTime(), interval.end);
      segments.push({ day: dayKey(cursor), start: cursor, end: stop, durationMs: (stop - cursor) * ratio });
      cursor = stop;
    }
  }
  return segments;
}
export function statistics(sessions, from, until) {
  const byActivity = {};
  const byDay = {};
  let total = 0;
  let count = 0;
  for (const session of sessions) {
    let contribution = 0;
    for (const segment of splitSession(session)) {
      const overlap = Math.max(0, Math.min(segment.end, until) - Math.max(segment.start, from));
      const amount = segment.durationMs * overlap / Math.max(1, segment.end - segment.start);
      if (amount) byDay[segment.day] = (byDay[segment.day] || 0) + amount;
      contribution += amount;
    }
    if (contribution) { count++; total += contribution; byActivity[session.activityId] = (byActivity[session.activityId] || 0) + contribution; }
  }
  return { total, count, byActivity, byDay };
}
export function reminderKey(event) { return `${event.id}:${event.start}:${event.leadMinutes}:${event.alert}`; }
export function dueReminders(events, fired, now = Date.now()) { return events.filter(event => !event.done && !event.deleted && event.alert !== 'none' && event.start >= now - 300000 && event.start - event.leadMinutes * 60000 <= now && !fired.includes(reminderKey(event))); }
export function calendarBody(event) { return { summary: event.title, description: event.note || '', start: { dateTime: new Date(event.start).toISOString() }, end: { dateTime: new Date(event.end).toISOString() }, reminders: { useDefault: false, overrides: event.alert === 'none' ? [] : [{ method: 'popup', minutes: Math.round(event.leadMinutes) }] } }; }
export const googleEventId = id => `f${id.replaceAll('-', '').toLowerCase()}`;
export function calendarDays(dateKey, mode = 'month') {
  const selected = new Date(`${dateKey}T12:00:00`);
  const start = new Date(selected);
  if (mode === 'month') start.setDate(1);
  const offset = (start.getDay() + 6) % 7;
  const count = mode === 'month' ? Math.ceil((offset + new Date(selected.getFullYear(), selected.getMonth() + 1, 0).getDate()) / 7) * 7 : 7;
  start.setDate(start.getDate() - offset);
  return Array.from({ length: count }, (_, index) => { const date = new Date(start); date.setDate(date.getDate() + index); return dayKey(date); });
}
export function shiftCalendarDate(dateKey, mode, direction) {
  const date = new Date(`${dateKey}T12:00:00`);
  if (mode === 'week') date.setDate(date.getDate() + direction * 7);
  else {
    const day = date.getDate();
    date.setDate(1); date.setMonth(date.getMonth() + direction);
    date.setDate(Math.min(day, new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()));
  }
  return dayKey(date);
}
export function eventsOnDay(events, dateKey) {
  const start = new Date(`${dateKey}T00:00:00`);
  const end = new Date(start); end.setDate(end.getDate() + 1);
  return events.filter(event => !event.deleted && event.start < end.getTime() && event.end > start.getTime()).sort((left, right) => left.start - right.start);
}
export function dailyTaskTotals(events, activities, dateKey) {
  const start = new Date(`${dateKey}T00:00:00`);
  const end = new Date(start); end.setDate(end.getDate() + 1);
  const groups = new Map();
  for (const event of eventsOnDay(events, dateKey)) {
    const activityId = event.activityId || event.routineActivityId;
    const activity = activities.find(item => !item.deleted && item.id === activityId);
    const key = activityId ? `activity:${activityId}` : `title:${event.title.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR')}`;
    if (!groups.has(key)) groups.set(key, { key, title: activity?.name || event.title, urgent: activity?.type === 'duty', done: true, events: [], durationMs: 0 });
    const group = groups.get(key);
    group.events.push(event);
    group.urgent ||= event.urgency === 'high';
    group.done &&= Boolean(event.done);
  }
  for (const group of groups.values()) {
    // Count only this day's portion; overlapping periods of one task count once.
    let cursor = start.getTime();
    for (const event of group.events) {
      const from = Math.max(event.start, start.getTime(), cursor);
      const until = Math.min(event.end, end.getTime());
      group.durationMs += Math.max(0, until - from);
      cursor = Math.max(cursor, until);
    }
  }
  return [...groups.values()];
}
export function taskDuration(milliseconds) {
  const minutes = Math.max(0, Math.round(milliseconds / 60000));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours} ${hours === 1 ? 'hora' : 'horas'}${rest ? ` e ${rest} min` : ''}` : `${minutes} min`;
}
export function validateRecord(record) {
  if (!record || !/^[a-zA-Z0-9-]{1,100}$/.test(record.id) || !['activity', 'event', 'session', 'timer', 'routine'].includes(record.kind)) throw new Error('Registro inválido no backup.');
  if (record.deleted) return record;
  if (record.kind === 'activity') validateActivity(record);
  if (record.kind === 'event') validateEvent(record);
  if (record.kind === 'routine' && (record.id !== 'routine-settings' || !Array.isArray(record.days) || record.days.length !== 7 || !Number.isInteger(record.breakMinutes) || record.breakMinutes < 0 || record.breakMinutes > 60)) throw new Error('Configuração de rotina inválida.');
  if (record.kind === 'session' && (!Number.isFinite(record.start) || !Number.isFinite(record.end) || record.end <= record.start || !Number.isFinite(record.durationMs) || record.durationMs <= 0 || record.durationMs > record.end - record.start + 1000)) throw new Error('Sessão inválida no backup.');
  if (record.kind === 'session' && (record.end - record.start > 366 * 86400000 || Math.abs(record.start) > 8000000000000000 || Math.abs(record.end) > 8000000000000000)) throw new Error('Período da sessão inválido.');
  if (record.intervals) {
    if (!Array.isArray(record.intervals) || record.intervals.length > 10000) throw new Error('Intervalos inválidos.');
    let previous = record.kind === 'timer' ? record.originAt : record.start;
    let amount = 0;
    for (const interval of record.intervals) {
      if (!Number.isFinite(interval.start) || !Number.isFinite(interval.end) || interval.start < previous || interval.end < interval.start || (record.kind === 'session' && interval.end > record.end)) throw new Error('Intervalos fora de ordem.');
      amount += interval.end - interval.start; previous = interval.end;
    }
    if (record.kind === 'session' && Math.abs(amount - record.durationMs) > 1000) throw new Error('A duração não corresponde aos intervalos.');
  }
  if (record.kind === 'timer' && (record.id !== 'timer' || !record.sessionId || !Number.isFinite(record.originAt) || !Number.isFinite(record.startedAt) || !Number.isFinite(record.elapsedMs) || record.elapsedMs < 0 || typeof record.running !== 'boolean')) throw new Error('Cronômetro inválido no backup.');
  return record;
}
