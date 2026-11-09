import test from 'node:test';
import assert from 'node:assert/strict';
import { calendarDays, shiftCalendarDate, eventsOnDay, dailyTaskTotals, taskDuration } from '../src/domain.js';

test('agenda mensal começa na segunda e inclui todas as seis semanas quando necessário', () => {
  const days = calendarDays('2026-11-07');
  assert.equal(days.length, 42);
  assert.equal(days[0], '2026-10-26');
  assert.equal(days.at(-1), '2026-12-06');
  assert.equal(new Set(days).size, days.length);
});
test('fevereiro bissexto e meses com quatro semanas mantêm todas as datas', () => {
  assert.ok(calendarDays('2028-02-20').includes('2028-02-29'));
  assert.equal(calendarDays('2027-02-15').length, 28);
});
test('trocar o modo mantém a mesma data dentro dos dois calendários', () => {
  for (const key of ['2026-12-31', '2027-01-01', '2028-02-29']) {
    assert.ok(calendarDays(key, 'month').includes(key));
    assert.ok(calendarDays(key, 'week').includes(key));
    assert.equal(calendarDays(key, 'week').length, 7);
  }
});
test('setas mensais limitam o dia ao mês de destino sem saltar fevereiro', () => {
  assert.equal(shiftCalendarDate('2027-01-31', 'month', 1), '2027-02-28');
  assert.equal(shiftCalendarDate('2028-01-31', 'month', 1), '2028-02-29');
  assert.equal(shiftCalendarDate('2026-12-31', 'month', 1), '2027-01-31');
  assert.equal(shiftCalendarDate('2026-01-01', 'week', -1), '2025-12-25');
});
test('compromissos de vários dias aparecem nas datas corretas, sem incluir fim à meia-noite', () => {
  const event = { id: 'trip', start: new Date('2026-11-07T23:00').getTime(), end: new Date('2026-11-09T00:00').getTime() };
  assert.equal(eventsOnDay([event], '2026-11-07').length, 1);
  assert.equal(eventsOnDay([event], '2026-11-08').length, 1);
  assert.equal(eventsOnDay([event], '2026-11-09').length, 0);
  assert.equal(eventsOnDay([{ ...event, deleted: true }], '2026-11-08').length, 0);
});

const stamp = value => new Date(`2026-11-09T${value}`).getTime();
test('resumo diário reúne períodos da mesma atividade e preserva os compromissos originais', () => {
  const events = [
    { id: 'a', title: 'Estudo', activityId: 'code', start: stamp('13:00'), end: stamp('13:45'), done: true },
    { id: 'b', title: 'Prática', routineActivityId: 'code', start: stamp('13:55'), end: stamp('14:40') },
    { id: 'c', title: 'Estudo', activityId: 'code', start: stamp('17:00'), end: stamp('17:30') },
    { id: 'd', title: 'Teclado', start: stamp('15:00'), end: stamp('16:00'), done: true },
    { id: 'e', title: 'Excluído', start: stamp('18:00'), end: stamp('19:00'), deleted: true }
  ];
  const original = structuredClone(events);
  const tasks = dailyTaskTotals(events, [{ id: 'code', name: 'Programação', type: 'duty' }], '2026-11-09');
  assert.equal(tasks.length, 2);
  assert.equal(tasks[0].title, 'Programação');
  assert.equal(tasks[0].durationMs, 120 * 60000);
  assert.equal(tasks[0].events.length, 3);
  assert.equal(tasks[0].urgent, true);
  assert.equal(tasks[0].done, false);
  assert.equal(tasks[1].done, true);
  assert.deepEqual(events, original);
});
test('tarefas sem vínculo são reunidas pelo título, e atividades distintas com mesmo nome continuam separadas', () => {
  const event = { title: 'Leitura', start: stamp('09:00'), end: stamp('10:00') };
  const tasks = dailyTaskTotals([event, { ...event, title: '  LEITURA  ', start: stamp('11:00'), end: stamp('12:00') }, { ...event, activityId: 'one' }, { ...event, activityId: 'two' }], [], '2026-11-09');
  assert.equal(tasks.length, 3);
  assert.equal(tasks[0].durationMs, 2 * 3600000);
});
test('totais diários recortam a meia-noite e não contam períodos sobrepostos da mesma tarefa duas vezes', () => {
  const events = [
    { title: 'Leitura', start: new Date('2026-11-08T23:00').getTime(), end: stamp('01:00') },
    { title: 'Leitura', start: stamp('00:30'), end: stamp('02:00') },
    { title: 'Leitura', start: stamp('01:00'), end: stamp('01:15') }
  ];
  assert.equal(dailyTaskTotals(events, [], '2026-11-08')[0].durationMs, 3600000);
  assert.equal(dailyTaskTotals(events, [], '2026-11-09')[0].durationMs, 2 * 3600000);
  assert.equal(dailyTaskTotals(events, [], '2026-11-10').length, 0);
});
test('duração das tarefas mostra horas e preserva minutos sem arredondar para horas inteiras', () => {
  assert.equal(taskDuration(3600000), '1 hora');
  assert.equal(taskDuration(7200000), '2 horas');
  assert.equal(taskDuration(95 * 60000), '1 hora e 35 min');
  assert.equal(taskDuration(25 * 60000), '25 min');
});
