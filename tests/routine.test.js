import test from 'node:test';
import assert from 'node:assert/strict';
import { generateRoutine, validateRoutine, validateProposals, availabilityFields, copyAvailability, freeTimeOnDay, planningFields } from '../src/routine.js';

const week = '2030-01-07';
const now = new Date('2030-01-06T12:00').getTime();
const settings = { days: [[{ start: '09:00', end: '12:00' }], [{ start: '09:00', end: '12:00' }], [], [], [], [], []], breakMinutes: 10 };
const activity = (id, type = 'hobby', extra = {}) => ({ id, kind: 'activity', name: id, type, weeklyMinutes: 60, priority: 'normal', minMinutes: 15, sessionMinutes: 60, frequency: 2, ...extra });
const run = extra => generateRoutine({ activities: [], events: [], sessions: [], settings, week, now, ...extra });
test('limites fixos de 15 a 50 min substituem preferências antigas na geração e validação', () => {
  const legacy = activity('estudo', 'duty', { weeklyMinutes: 150, minMinutes: 5, sessionMinutes: 240, frequency: 1 });
  assert.equal(planningFields(legacy).minMinutes, 15);
  assert.equal(planningFields(legacy).sessionMinutes, 50);
  const result = run({ activities: [legacy] });
  assert.ok(result.proposals.every(item => (item.end - item.start) / 60000 >= 15 && (item.end - item.start) / 60000 <= 50));
  assert.doesNotThrow(() => validateProposals(result.proposals, { activities: [legacy], events: [], settings, now }));
  const start = new Date(`${week}T09:00`).getTime();
  for (const minutes of [10, 51]) assert.throws(() => validateProposals([{ activityId: legacy.id, start, end: start + minutes * 60000 }], { activities: [legacy], events: [], settings, now }), /duração/);
});
test('períodos da mesma tarefa permanecem seguidos antes de encaixar a seguinte', () => {
  const config = { days: [[{ start: '13:00', end: '17:00' }], [{ start: '13:00', end: '17:00' }], [], [], [], [], []], breakMinutes: 10 };
  const activities = [activity('programação', 'duty', { weeklyMinutes: 200 }), activity('teclado', 'hobby', { weeklyMinutes: 40 })];
  const result = run({ settings: config, activities });
  for (const date of [week, '2030-01-08']) {
    const daily = result.proposals.filter(item => new Date(item.start).toLocaleDateString('en-CA') === date);
    assert.deepEqual(daily.map(item => item.activityId), ['programação', 'programação', 'teclado']);
    assert.equal(daily[1].start - daily[0].end, 10 * 60000);
    assert.equal(daily[2].start - daily[1].end, 10 * 60000);
  }
  assert.doesNotThrow(() => validateProposals(result.proposals, { activities, events: [], settings: config, now }));
});
test('meta de 60 minutos cabe em períodos válidos sem deixar um resto de 10 minutos', () => {
  const result = run({ activities: [activity('leitura', 'hobby', { frequency: 1 })] });
  assert.deepEqual(result.proposals.map(item => (item.end - item.start) / 60000), [45, 15]);
  assert.equal(result.unmet.length, 0);
});
test('agrupamento respeita compromissos fixos e disponibilidade fragmentada', () => {
  const start = new Date(`${week}T10:00`).getTime();
  const fixed = { id: 'fixo', start, end: start + 30 * 60000 };
  const activities = [activity('programação', 'duty', { weeklyMinutes: 150, frequency: 1 })];
  const original = structuredClone(fixed);
  const result = run({ activities, events: [fixed] });
  assert.doesNotThrow(() => validateProposals(result.proposals, { activities, events: [fixed], settings, now }));
  assert.deepEqual(fixed, original);
});
test('dever de prioridade baixa passa à frente de hobby de prioridade alta', () => {
  const result = run({ settings: { days: [[{ start: '09:00', end: '10:00' }], [], [], [], [], [], []], breakMinutes: 0 }, activities: [activity('hobby', 'hobby', { priority: 'high' }), activity('dever', 'duty', { priority: 'low' })] });
  assert.equal(result.proposals.reduce((sum, item) => sum + (item.end - item.start) / 60000, 0), 60);
  assert.ok(result.proposals.every(item => item.activityId === 'dever'));
  assert.equal(result.unmet[0].id, 'hobby');
});
test('prazo mais próximo ganha preferência entre deveres', () => {
  const result = run({ activities: [activity('sem-prazo', 'duty', { priority: 'high', weeklyMinutes: 300 }), activity('urgente', 'duty', { priority: 'low', deadline: week })] });
  assert.equal(result.proposals.find(item => item.activityId === 'urgente')?.start, new Date(`${week}T09:00`).getTime());
  assert.ok(result.proposals.filter(item => item.activityId === 'urgente').every(item => item.end < new Date('2030-01-08T00:00').getTime()));
});
test('sugestões respeitam intervalos, disponibilidade e eventos existentes', () => {
  const activities = [activity('xadrez'), activity('estudo', 'duty')];
  const events = [{ start: new Date(`${week}T10:00`).getTime(), end: new Date(`${week}T11:00`).getTime() }];
  const result = run({ activities, events });
  assert.ok(result.proposals.length);
  assert.doesNotThrow(() => validateProposals(result.proposals, { activities, events, settings, now }));
});
test('frequência distribui a atividade por dias diferentes quando há espaço', () => {
  const result = run({ activities: [activity('leitura')] });
  assert.equal(new Set(result.proposals.map(item => new Date(item.start).getDay())).size, 2);
});
test('tempo praticado e sessões já planejadas reduzem a meta, evitando duplicação', () => {
  const start = new Date(`${week}T09:00`).getTime();
  const result = run({ activities: [activity('leitura')], events: [{ start, end: start + 3600000, routineActivityId: 'leitura' }] });
  assert.equal(result.proposals.length, 0);
  const practiced = run({ activities: [activity('leitura')], now: start + 7200000, sessions: [{ activityId: 'leitura', start, end: start + 3600000, durationMs: 3600000 }] });
  assert.equal(practiced.proposals.length, 0);
});
test('metas zero e prazos vencidos geram explicação sem sessões impossíveis', () => {
  const result = run({ activities: [activity('sem-meta', 'hobby', { weeklyMinutes: 0 }), activity('vencido', 'duty', { deadline: '2030-01-01' })] });
  assert.equal(result.proposals.length, 0);
  assert.equal(result.unmet.length, 2);
});
test('prévia editada não pode colidir com outro evento ou ultrapassar o prazo', () => {
  const activities = [activity('dever', 'duty', { deadline: week })];
  const proposals = run({ activities }).proposals;
  assert.throws(() => validateProposals(proposals, { activities, settings, now, events: [{ start: proposals[0].start, end: proposals[0].end }] }), /sobrepostos/);
  const moved = { ...proposals[0], start: new Date('2030-01-08T09:00').getTime(), end: new Date('2030-01-08T09:30').getTime() };
  assert.throws(() => validateProposals([moved], { activities, settings, events: [], now }), /prazo/);
});
test('configuração rejeita sobreposição de horários e sessões invertidas', () => {
  assert.throws(() => validateRoutine({ ...settings, days: [[{ start: '09:00', end: '08:00' }], [], [], [], [], [], []] }));
  assert.throws(() => validateRoutine({ ...settings, days: [[{ start: '09:00', end: '11:00' }, { start: '10:00', end: '12:00' }], [], [], [], [], [], []] }));
});

test('cada dia admite zero, uma, três ou mais faixas, ordenadas sem sobreposição', () => {
  const slots = [{ start: '18:00', end: '19:00' }, { start: '09:00', end: '10:00' }, { start: '13:00', end: '14:00' }];
  const result = validateRoutine({ ...settings, days: [slots, [slots[0]], [], [], [], [], []] });
  assert.equal(result.days[0].length, 3);
  assert.equal(result.days[0][0].start, '09:00');
  assert.equal(result.days[1].length, 1);
  assert.equal(result.days[2].length, 0);
  assert.throws(() => validateRoutine({ ...settings, days: [[...slots, { start: '13:30', end: '15:00' }], [], [], [], [], [], []] }), /sobrepor/);
});
test('campos dinâmicos preservam faixas após remover uma linha intermediária', () => {
  assert.deepEqual(availabilityFields({ 'from-0-0': '09:00', 'to-0-0': '10:00', 'from-0-2': '18:00', 'to-0-2': '20:00', 'from-1-0': '07:00', 'to-1-0': '08:00' }, 0), [{ start: '09:00', end: '10:00' }, { start: '18:00', end: '20:00' }]);
  assert.throws(() => availabilityFields({ 'from-0-3': '09:00' }, 0), /início e fim/);
  assert.deepEqual(availabilityFields({ 'from-0-0': '', 'to-0-0': '' }, 0), []);
});
test('copiar segunda a sexta preserva o fim de semana e cria cópias independentes', () => {
  const original = [[{ start: '09:00', end: '10:00' }], [], [], [], [], [{ start: '14:00', end: '18:00' }], []];
  const copied = copyAvailability(original, 0, 'weekdays');
  assert.ok(copied.slice(0, 5).every(day => day[0].start === '09:00'));
  assert.deepEqual(copied[5], original[5]);
  copied[1][0].start = '08:00';
  assert.equal(original[0][0].start, '09:00');
  assert.equal(copied[0][0].start, '09:00');
});
test('copiar para finais de semana não modifica dias úteis e pode limpar o grupo', () => {
  const copied = copyAvailability(settings.days, 0, 'weekend');
  assert.deepEqual(copied[5], settings.days[0]);
  assert.deepEqual(copied[6], settings.days[0]);
  assert.deepEqual(copied[1], settings.days[1]);
  assert.deepEqual(copyAvailability(copied, 2, 'weekend').slice(5), [[], []]);
});
test('agenda mostra somente os intervalos desocupados, descontando pausas', () => {
  const stamp = time => new Date(`${week}T${time}`).getTime();
  const events = [{ start: stamp('10:00'), end: stamp('10:45') }];
  const free = freeTimeOnDay(settings, events, week);
  assert.deepEqual(free.map(slot => [slot.start, slot.end]), [[stamp('09:00'), stamp('09:50')], [stamp('10:55'), stamp('12:00')]]);
});
test('compromissos sobrepostos são descontados uma vez e exclusão libera a faixa', () => {
  const stamp = time => new Date(`${week}T${time}`).getTime();
  const events = [{ start: stamp('08:00'), end: stamp('10:00'), done: true }, { start: stamp('09:30'), end: stamp('11:00') }, { start: stamp('11:30'), end: stamp('12:30'), deleted: true }];
  const free = freeTimeOnDay({ ...settings, breakMinutes: 0 }, events, week);
  assert.deepEqual(free.map(slot => [slot.start, slot.end]), [[stamp('11:00'), stamp('12:00')]]);
  assert.equal(freeTimeOnDay(settings, [], '2030-01-09').length, 0);
  assert.equal(freeTimeOnDay(settings, [{ start: stamp('08:00'), end: stamp('13:00') }], week).length, 0);
});
test('planejador usa a terceira faixa quando as outras já estão ocupadas', () => {
  const stamp = time => new Date(`${week}T${time}`).getTime();
  const config = { days: [[{ start: '09:00', end: '10:00' }, { start: '13:00', end: '14:00' }, { start: '18:00', end: '19:00' }], [], [], [], [], [], []], breakMinutes: 0 };
  const result = run({ settings: config, activities: [activity('leitura')], events: [{ start: stamp('09:00'), end: stamp('14:00'), done: true }] });
  assert.ok(result.proposals.length);
  assert.ok(result.proposals.every(item => item.start >= stamp('18:00') && item.end <= stamp('19:00')));
});
