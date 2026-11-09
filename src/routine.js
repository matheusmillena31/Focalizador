import { dayKey, calendarDays, statistics } from './domain.js';

export const WEEKDAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
export function validateRoutine(settings) {
  const breakMinutes = Number(settings.breakMinutes ?? 10);
  if (!Number.isInteger(breakMinutes) || breakMinutes < 0 || breakMinutes > 60) throw new Error('O intervalo deve ficar entre 0 e 60 minutos.');
  if (!Array.isArray(settings.days) || settings.days.length !== 7) throw new Error('Configure os sete dias da semana.');
  const days = settings.days.map(slots => {
    if (!Array.isArray(slots) || slots.length > 1440) throw new Error('As faixas do dia são inválidas.');
    const result = slots.map(slot => {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.end) || slot.end <= slot.start) throw new Error('Cada faixa deve começar antes de terminar, no mesmo dia.');
      return { start: slot.start, end: slot.end };
    }).sort((left, right) => left.start.localeCompare(right.start));
    if (result.some((slot, index) => index > 0 && slot.start < result[index - 1].end)) throw new Error('As faixas do mesmo dia não podem se sobrepor.');
    return result;
  });
  return { days, breakMinutes };
}
export function availabilityFields(data, day) {
  const indexes = [...new Set(Object.keys(data).flatMap(key => {
    const match = key.match(/^(?:from|to)-(\d+)-(\d+)$/);
    return match && Number(match[1]) === day ? [Number(match[2])] : [];
  }))].sort((left, right) => left - right);
  return indexes.flatMap(index => {
    const start = data[`from-${day}-${index}`] || '';
    const end = data[`to-${day}-${index}`] || '';
    if (!start && !end) return [];
    if (!start || !end) throw new Error('Preencha início e fim de cada faixa, ou deixe ambos vazios.');
    return [{ start, end }];
  });
}
export function copyAvailability(days, sourceDay, group) {
  const indexes = group === 'weekdays' ? [0, 1, 2, 3, 4] : group === 'weekend' ? [5, 6] : null;
  if (!indexes || !Number.isInteger(sourceDay) || sourceDay < 0 || sourceDay > 6) throw new Error('Escolha um dia de origem e um grupo válido.');
  return days.map((slots, index) => structuredClone(indexes.includes(index) ? days[sourceDay] : slots));
}
export function freeTimeOnDay(settings, events, dateKey) {
  const config = validateRoutine(settings);
  const day = (new Date(`${dateKey}T12:00`).getDay() + 6) % 7;
  let free = config.days[day].map(slot => ({ day: dateKey, start: new Date(`${dateKey}T${slot.start}`).getTime(), end: new Date(`${dateKey}T${slot.end}`).getTime() }));
  for (const event of events.filter(event => !event.deleted)) free = subtract(free, event, config.breakMinutes * 60000);
  return free;
}
export function planningFields(activity) {
  const priority = activity.priority || 'normal';
  const frequency = Number(activity.frequency ?? 3);
  const minMinutes = 15;
  const sessionMinutes = 50;
  const deadline = activity.deadline || '';
  if (!['high', 'normal', 'low'].includes(priority) || !Number.isInteger(frequency) || frequency < 1 || frequency > 7) throw new Error('Confira prioridade e frequência (1–7 dias).');
  if (deadline && (!/^\d{4}-\d{2}-\d{2}$/.test(deadline) || dayKey(new Date(`${deadline}T12:00`)) !== deadline)) throw new Error('Prazo inválido.');
  return { priority, frequency, minMinutes, sessionMinutes, deadline };
}
function subtract(blocks, occupied, gap) {
  return blocks.flatMap(block => {
    const start = occupied.start - gap;
    const end = occupied.end + gap;
    if (end <= block.start || start >= block.end) return [block];
    return [{ ...block, end: Math.min(start, block.end) }, { ...block, start: Math.max(end, block.start) }].filter(part => part.end > part.start);
  });
}
export function generateRoutine({ activities, events, sessions, settings, week, now = Date.now() }) {
  const config = validateRoutine(settings);
  const dates = calendarDays(week, 'week');
  const weekStart = new Date(`${dates[0]}T00:00`).getTime();
  const weekEnd = new Date(`${dates[6]}T00:00`); weekEnd.setDate(weekEnd.getDate() + 1);
  const spent = statistics(sessions, weekStart, Math.min(now, weekEnd.getTime())).byActivity;
  let free = dates.flatMap((date, index) => config.days[index].map(slot => ({ day: date, start: Math.max(new Date(`${date}T${slot.start}`).getTime(), Math.ceil(now / 300000) * 300000), end: new Date(`${date}T${slot.end}`).getTime() })).filter(block => block.end > block.start));
  const gap = config.breakMinutes * 60000;
  for (const event of events.filter(event => !event.deleted)) free = subtract(free, event, gap);
  const availableMinutes = free.reduce((sum, block) => sum + (block.end - block.start) / 60000, 0);
  const rank = { high: 0, normal: 1, low: 2 };
  const jobs = activities.map(activity => {
    const fields = planningFields(activity);
    const booked = events.filter(event => !event.deleted && !event.done && event.routineActivityId === activity.id).reduce((sum, event) => sum + Math.max(0, Math.min(event.end, weekEnd.getTime()) - Math.max(event.start, weekStart)) / 60000, 0);
    return { ...activity, ...fields, remaining: Math.max(0, activity.weeklyMinutes - (spent[activity.id] || 0) / 60000 - booked), allocated: {}, proposedMinutes: 0 };
  }).sort((left, right) => (left.type === 'duty' ? 0 : 1) - (right.type === 'duty' ? 0 : 1) || (left.type === 'duty' ? (left.deadline || '9999').localeCompare(right.deadline || '9999') : 0) || rank[left.priority] - rank[right.priority] || left.name.localeCompare(right.name));
  const proposals = [];
  for (const job of jobs) {
    const deadline = job.type === 'duty' && job.deadline ? new Date(`${job.deadline}T23:59:59.999`).getTime() : Infinity;
    let iterations = 0;
    while (job.remaining >= job.minMinutes && iterations++ < 2500) {
      const neededDays = Math.max(1, job.frequency - Object.keys(job.allocated).length);
      const dailyTarget = Math.min(job.remaining, Math.max(job.minMinutes, Math.ceil(job.remaining / neededDays / 5) * 5));
      const candidates = free.map(block => ({ ...block, capacity: Math.floor((Math.min(block.end, deadline) - block.start) / 60000) })).filter(block => block.capacity >= job.minMinutes).sort((left, right) => (job.allocated[left.day] || 0) - (job.allocated[right.day] || 0) || left.start - right.start);
      const block = candidates[0]; if (!block) break;
      let dailyRemaining = dailyTarget;
      while (dailyRemaining >= job.minMinutes) {
        const next = free.filter(part => part.day === block.day).map(part => ({ ...part, capacity: Math.floor((Math.min(part.end, deadline) - part.start) / 60000) })).filter(part => part.capacity >= job.minMinutes).sort((left, right) => left.start - right.start)[0];
        if (!next) break;
        let minutes = Math.min(job.sessionMinutes, dailyRemaining, next.capacity);
        const remainder = dailyRemaining - minutes;
        if (remainder > 0 && remainder < job.minMinutes && minutes - (job.minMinutes - remainder) >= job.minMinutes) minutes -= job.minMinutes - remainder;
        const item = { activityId: job.id, title: job.name, start: next.start, end: next.start + minutes * 60000, type: job.type, priority: job.priority, deadline: job.deadline, minMinutes: job.minMinutes };
        proposals.push(item); free = subtract(free, item, gap);
        job.remaining -= minutes; job.proposedMinutes += minutes; dailyRemaining -= minutes;
        job.allocated[block.day] = (job.allocated[block.day] || 0) + minutes;
      }
    }
  }
  return { proposals: proposals.sort((left, right) => left.start - right.start), availableMinutes, dates, unmet: jobs.filter(job => job.remaining > 0 || !job.weeklyMinutes).map(job => ({ id: job.id, name: job.name, minutes: job.remaining, reason: !job.weeklyMinutes ? 'Defina uma meta semanal para receber sugestões.' : job.deadline && new Date(`${job.deadline}T23:59:59`).getTime() < now ? 'O prazo já passou.' : 'Faltou espaço livre antes do prazo ou um bloco com a duração mínima. Deveres receberam preferência.' })) };
}
export function validateProposals(proposals, { activities, events, settings, now = Date.now() }) {
  const config = validateRoutine(settings);
  for (const item of proposals) {
    const activity = activities.find(value => value.id === item.activityId);
    if (!activity) throw new Error('Uma atividade foi removida. Gere a rotina novamente.');
    const fields = planningFields(activity);
    const minutes = (item.end - item.start) / 60000;
    if (!Number.isFinite(item.start) || !Number.isFinite(item.end) || item.start < now || minutes < fields.minMinutes || minutes > fields.sessionMinutes) throw new Error('Confira os horários e a duração das sessões da prévia.');
    if (activity.type === 'duty' && fields.deadline && item.end > new Date(`${fields.deadline}T23:59:59.999`).getTime()) throw new Error('A sessão precisa terminar antes do prazo do dever.');
    const date = new Date(item.start); const day = (date.getDay() + 6) % 7;
    if (!config.days[day].some(slot => item.start >= new Date(`${dayKey(date)}T${slot.start}`).getTime() && item.end <= new Date(`${dayKey(date)}T${slot.end}`).getTime())) throw new Error('Uma sessão está fora da sua disponibilidade.');
    const others = [...events.filter(event => !event.deleted), ...proposals.filter(other => other !== item)];
    if (others.some(other => item.start < other.end + config.breakMinutes * 60000 && item.end > other.start - config.breakMinutes * 60000)) throw new Error('Há horários sobrepostos ou sem o intervalo configurado. Ajuste a prévia ou gere novamente.');
  }
  return proposals;
}
