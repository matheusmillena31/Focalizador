import { TYPES, ALERTS, COLORS, uid, dayKey, duration, timerElapsed, startTimer, toggleTimer, finishTimer, validateActivity, validateEvent, weekStart, statistics, calendarBody, googleEventId, calendarDays, shiftCalendarDate, dailyTaskTotals, taskDuration } from './domain.js';
import { Store } from './store.js';
import { Cloud, jsonFetch } from './cloud.js';
import { requestAlerts, scheduleAlerts, checkBrowserAlerts, unlockAudio, alarmSound, stopSound, calendarToken, nativeBridge } from './platform.js';
import { WEEKDAYS, validateRoutine, planningFields, generateRoutine, validateProposals, availabilityFields, copyAvailability, freeTimeOnDay } from './routine.js';
import { DEFAULT_CONNECTION } from './project.js';

const root = document.querySelector('#app');
const editor = document.querySelector('#editor');
const alarm = document.querySelector('#alarm');
const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const icons = { home: '⌂', activities: '◈', agenda: '▦', stats: '▥', settings: '⚙', play: '▶', pause: 'Ⅱ', check: '✓', arrow: '↗' };
let config = JSON.parse(localStorage.getItem('focus-config') || '{}');
if (!config.projectId && !config.apiKey) config = { ...config, ...DEFAULT_CONNECTION };
let cloud = new Cloud(config, sessionStorage);
let store = new Store(localStorage, cloud.session ? `${config.projectId}-${cloud.session.uid}` : 'local');
let view = 'home';
let activityQuery = '';
let agendaDate = dayKey();
let agendaMode = localStorage.getItem('focus-agenda-mode') === 'week' ? 'week' : 'month';
let statsPeriod = 7;
let syncStatus = cloud.session ? 'Aguardando sincronização' : window.focusStandalone?.temporary ? 'Teste temporário · exporte um backup' : 'Salvo neste dispositivo';
let googleToken = null;
let googleEvents = [];
let pendingSync;
let operationBusy = false;
const timeText = value => new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const dateText = value => new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
const selected = (left, right) => left === right ? ' selected' : '';
const button = (action, text, style = '', extra = '') => `<button type="button" class="${style}" data-action="${action}" ${extra}>${text}</button>`;
function toast(message) {
  if (editor.open) editor.querySelector('.dialog-status').textContent = message;
  const target = document.querySelector('#toast'); target.textContent = message; target.classList.add('visible'); clearTimeout(toast.timeout); toast.timeout = setTimeout(() => target.classList.remove('visible'), 5500);
}
function readableError(error) {
  const code = error.message || String(error);
  if (/quota/i.test(code)) return 'O armazenamento deste dispositivo ficou cheio. Exporte um backup e libere espaço antes de continuar.';
  const known = { INVALID_LOGIN_CREDENTIALS: 'E-mail ou senha incorretos.', EMAIL_EXISTS: 'Este e-mail já possui uma conta.', WEAK_PASSWORD: 'Use uma senha de pelo menos 6 caracteres.', PERMISSION_DENIED: 'Acesso ao banco negado. Confira as regras do Firestore.', OPERATION_NOT_ALLOWED: 'Ative o login por e-mail e senha no Firebase.', TOO_MANY_ATTEMPTS_TRY_LATER: 'Muitas tentativas. Aguarde antes de tentar novamente.' };
  return Object.entries(known).find(([key]) => code.includes(key))?.[1] || (code.includes('fetch') ? 'Sem conexão. Seus dados continuam salvos neste dispositivo.' : code);
}
async function changed(message) {
  render();
  try { await scheduleAlerts(store.all('event'), store.namespace, store.state.fired); } catch (error) { toast(`Dados salvos. Alertas: ${readableError(error)}`); }
  clearTimeout(pendingSync); if (cloud.session) pendingSync = setTimeout(() => sync(false), 700);
  if (message) toast(message);
}
async function sync(manual = true) {
  if (!cloud.session || cloud.busy) { if (manual && !cloud.session) toast('Entre na conta em Ajustes para sincronizar.'); return; }
  syncStatus = 'Sincronizando…'; updateSyncLabel();
  try {
    const conflicts = await cloud.sync(store);
    syncStatus = conflicts ? `${conflicts} conflito(s) em Ajustes` : `Sincronizado às ${timeText(Date.now())}`;
    await scheduleAlerts(store.all('event'), store.namespace, store.state.fired);
    if (!editor.open) render();
    if (manual) toast(conflicts ? 'Revise as alterações em conflito nos Ajustes.' : 'Seus dados estão sincronizados.');
  } catch (error) { syncStatus = `Pendente: ${readableError(error)}`; if (manual) toast(readableError(error)); }
  updateSyncLabel();
}
function updateSyncLabel() { for (const label of document.querySelectorAll('[data-sync-label]')) label.textContent = syncStatus; }
function nav() {
  return [['home', 'Hoje'], ['activities', 'Atividades'], ['agenda', 'Agenda'], ['stats', 'Progresso'], ['settings', 'Ajustes']].map(([key, title]) => `<button type="button" data-action="navigate" data-view="${key}" aria-label="${title}" title="${title}" class="nav-item ${view === key ? 'active' : ''}" ${view === key ? 'aria-current="page"' : ''}><span aria-hidden="true">${icons[key]}</span><span>${title}</span></button>`).join('');
}
function render() {
  const titles = { home: 'Seu tempo, com intenção.', activities: 'Espaço para o que importa.', agenda: 'Um dia de cada vez.', stats: 'Cada minuto conta.', settings: 'Do seu jeito.' };
  root.innerHTML = `<aside class="sidebar"><a class="brand" href="#" data-action="navigate" data-view="home"><span class="brand-icon">✳</span><span>Focalizador<small>FOCO E DISCIPLINA</small></span></a><nav aria-label="Principal">${nav()}</nav><div class="sidebar-note"><span class="mini-star">✧</span><strong>Pequenos passos.<br>Grandes mudanças.</strong><p>Reserve tempo para a pessoa que você quer ser.</p></div><button class="profile" data-action="navigate" data-view="settings"><span class="avatar">${escape((cloud.session?.email || 'Você').slice(0, 1).toUpperCase())}</span><span><strong>${cloud.session ? 'Minha conta' : 'Seu espaço pessoal'}</strong><small>${cloud.session ? 'Sincronização ativada' : 'Modo local'}</small></span><span>›</span></button></aside><main><header class="topbar"><div class="mobile-brand">✳ Focalizador</div><span class="eyebrow">${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</span><button class="sync-state" data-action="sync"><span class="status-dot ${cloud.session ? 'online' : ''}"></span><span data-sync-label>${escape(syncStatus)}</span></button></header><section class="page-heading"><div><p class="eyebrow">${view === 'home' ? 'BOM TER VOCÊ POR AQUI' : 'SEU ESPAÇO DE FOCO'}</p><h1>${titles[view]}</h1><p>${{ home: 'Menos pressa. Mais presença no que faz sentido para você.', activities: 'Organize seus hobbies e deveres, sem perder a leveza.', agenda: 'Dê lugar aos seus compromissos e ao seu tempo livre.', stats: 'Veja o caminho que você está construindo.', settings: 'Conta, lembretes e cuidado com seus dados.' }[view]}</p></div>${['home', 'activities'].includes(view) ? button('activity-new', '+ Nova atividade', 'primary') : view === 'agenda' ? button('event-new', '+ Compromisso', 'primary') : ''}</section>${view === 'home' ? homeView() : view === 'activities' ? activitiesView() : view === 'agenda' ? agendaView() : view === 'stats' ? statsView() : settingsView()}<footer class="page-footer"><span>Feito para focar no que importa.</span><span>Focalizador · v0.1</span></footer></main><nav class="bottom-nav" aria-label="Navegação móvel">${nav()}</nav>`;
  tick();
}
function weekStats() { return statistics(store.all('session'), weekStart(), Date.now() + 1); }
function homeView() {
  const stats = weekStats();
  const timer = store.get('timer');
  const activity = timer ? store.get(timer.activityId) : null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayStats = statistics(store.all('session'), today.getTime(), Date.now() + 1);
  const upcoming = store.all('event').filter(event => !event.done && event.end >= Date.now()).sort((left, right) => left.start - right.start).slice(0, 3);
  const active = store.all('activity').slice(0, 3);
  return `<div class="dashboard-grid"><section class="focus-card"><div class="focus-top"><span class="pill">✦ MOMENTO DE FOCO</span><span class="orbital">✧</span></div><p class="focus-caption">${timer ? 'Agora, sua atenção está em' : 'Uma coisa de cada vez'}</p><h2>${timer ? escape(activity?.name || 'Atividade removida') : 'O próximo passo começa aqui.'}</h2><div class="timer" data-timer>${duration(timerElapsed(timer), true)}</div><p class="timer-status" data-timer-status>${timer ? timer.running ? 'Seu tempo está sendo registrado.' : 'Pausa também faz parte.' : 'Escolha uma atividade e dê espaço para ela.'}</p><div class="focus-actions">${timer ? `${button('timer-toggle', timer.running ? 'Ⅱ Pausar' : '▶ Continuar', 'white')}${button('timer-finish', '✓ Concluir sessão', 'glass')}` : button('pick-activity', '▶ Começar a focar', 'white')}</div><div class="focus-decoration" aria-hidden="true"></div></section><section class="card week-summary"><div class="section-label"><span>SUA SEMANA</span><span class="subtle-icon">↗</span></div><h2>${duration(stats.total)}</h2><p>investidos no que importa</p>${sparkline(stats.byDay)}<div class="summary-foot"><span><strong>${stats.count}</strong> sessões de foco</span><span><strong>${Object.keys(stats.byDay).length}</strong> dias ativos</span></div></section></div><div class="metric-strip"><div><span class="metric-icon">◷</span><span><small>Foco hoje</small><strong>${duration(todayStats.total)}</strong></span></div><div><span class="metric-icon purple">◈</span><span><small>Suas atividades</small><strong>${store.all('activity').length} <em>para cultivar</em></strong></span></div><div><span class="metric-icon cyan">▦</span><span><small>Próximos compromissos</small><strong>${store.all('event').filter(event => !event.done && event.start >= Date.now()).length} <em>no seu ritmo</em></strong></span></div></div><div class="section-title"><h2>Suas atividades <span>Um pouco de dedicação, todos os dias.</span></h2>${button('navigate', 'Ver todas ↗', 'text-button', 'data-view="activities"')}</div>${active.length ? `<div class="activity-grid">${active.map(activityCard).join('')}</div>` : empty('Seu primeiro passo', 'Adicione um hobby ou dever para começar a registrar seu tempo.', `${button('activity-new', '+ Criar atividade', 'primary')}${button('starter', 'Usar atividades iniciais', 'secondary')}`)}<div class="section-title"><h2>No horizonte <span>Abra espaço para o que vem aí.</span></h2>${button('navigate', 'Abrir agenda ↗', 'text-button', 'data-view="agenda"')}</div><section class="card upcoming">${upcoming.length ? upcoming.map(eventRow).join('') : '<p class="muted">Sua agenda está livre. Que tal reservar um momento para você?</p>'}</section>`;
}
function empty(title, description, actions = '') { return `<section class="empty card"><div class="empty-symbol">✧</div><h3>${title}</h3><p>${description}</p><div class="button-row">${actions}</div></section>`; }
function sparkline(byDay) {
  const days = [];
  const first = new Date(weekStart());
  for (let index = 0; index < 7; index++) { const date = new Date(first); date.setDate(date.getDate() + index); days.push({ key: dayKey(date), label: ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'][index] }); }
  const max = Math.max(3600000, ...Object.values(byDay));
  return `<div class="mini-chart" role="img" aria-label="Tempo por dia nesta semana">${days.map(day => `<div class="mini-column"><span class="mini-value">${byDay[day.key] ? duration(byDay[day.key]) : ''}</span><div style="height:${Math.max(5, (byDay[day.key] || 0) / max * 76)}px" class="mini-bar ${day.key === dayKey() ? 'today' : ''}"></div><small>${day.label}</small></div>`).join('')}</div>`;
}
function activityCard(activity) {
  const amount = weekStats().byActivity[activity.id] || 0;
  const percent = activity.weeklyMinutes ? Math.min(100, amount / (activity.weeklyMinutes * 60000) * 100) : 0;
  const timer = store.get('timer');
  return `<article class="card activity-card"><div class="activity-top"><span class="activity-symbol" style="--accent:${escape(activity.color)}">${activity.type === 'hobby' ? '✧' : '▤'}</span><span class="type-pill">${TYPES[activity.type]}</span>${button('activity-edit', '•••', 'icon-button', `data-id="${activity.id}" aria-label="Editar ${escape(activity.name)}"`)}</div><h3>${escape(activity.name)}</h3><p class="muted">${duration(amount)} nesta semana</p><div class="progress-track"><div style="width:${percent}%;background:${escape(activity.color)}"></div></div><div class="activity-bottom"><small>${activity.weeklyMinutes ? `Meta: ${duration(activity.weeklyMinutes * 60000)}/sem` : 'No seu próprio ritmo'}</small>${button('timer-start', timer?.activityId === activity.id ? 'Em foco' : '▶ Focar', 'soft-button', `data-id="${activity.id}" ${timer ? 'disabled' : ''}`)}</div></article>`;
}
function activitiesView() {
  const all = store.all('activity');
  const activities = all.filter(activity => activity.name.toLocaleLowerCase('pt-BR').includes(activityQuery.toLocaleLowerCase('pt-BR')));
  return `<div class="section-title activity-toolbar"><span class="muted">${all.length} ${all.length === 1 ? 'atividade para cultivar' : 'atividades para cultivar'}</span><div class="button-row">${all.length > 8 || activityQuery ? `<label class="activity-search">Buscar atividade<input id="activity-search" type="search" value="${escape(activityQuery)}" placeholder="Nome da atividade" /></label>` : ''}${button('session-new', '+ Registro manual', 'secondary')}</div></div>${activities.length ? `<div class="activity-grid activity-catalog">${activities.map(activityCard).join('')}</div>` : empty(activityQuery ? 'Nenhuma atividade encontrada' : 'Cultive algo que importa', activityQuery ? 'Experimente outro nome na busca.' : 'Você pode criar hobbies e deveres com metas semanais opcionais.', activityQuery ? '' : button('activity-new', '+ Nova atividade', 'primary'))}${store.get('timer') ? `<div class="inline-note">◷ Uma sessão está ${store.get('timer').running ? 'em andamento' : 'pausada'}. ${button('navigate', 'Voltar ao cronômetro', 'text-button', 'data-view="home"')}</div>` : ''}`;
}
function eventRow(event) {
  return `<article class="event-row ${event.done ? 'completed' : ''}"><div class="event-time"><strong>${timeText(event.start)} – ${timeText(event.end)}</strong><small>${dateText(event.start)}${dayKey(event.start) !== dayKey(event.end) ? ` – ${dateText(event.end)}` : ''}</small></div><span class="event-line ${event.urgency === 'high' ? 'urgent' : ''}"></span><div class="event-detail"><strong>${escape(event.title)}</strong><small>${ALERTS[event.alert]}${event.leadMinutes && event.alert !== 'none' ? ` · ${event.leadMinutes} min antes` : ''}${event.done ? ' · Concluído' : ''}</small></div>${button('event-edit', '↗', 'icon-button', `data-id="${event.id}" aria-label="Editar ${escape(event.title)}"`)}</article>`;
}
function dailyTasksView(tasks) {
  const max = Math.max(1, ...tasks.map(task => task.durationMs));
  return `<p class="daily-tasks-caption">Tempo planejado por tarefa. Abra uma tarefa para consultar ou editar seus horários.</p><div class="daily-tasks">${tasks.map(task => `<details class="daily-task ${task.urgent ? 'is-urgent' : ''} ${task.done ? 'is-done' : ''}"><summary><span class="daily-task-track" aria-hidden="true"><span class="daily-task-bar" style="width:${task.durationMs / max * 100}%"></span></span><span class="daily-task-label"><strong>${escape(task.title)}</strong><span class="daily-task-duration"> · ${taskDuration(task.durationMs)}</span>${task.done ? '<small>Concluída</small>' : ''}</span><span class="daily-task-chevron" aria-hidden="true">⌄</span></summary><div class="daily-task-periods">${task.events.map(eventRow).join('')}</div></details>`).join('')}</div>`;
}
function agendaView() {
  const allEvents = store.all('event');
  const activities = store.all('activity');
  const tasks = dailyTaskTotals(allEvents, activities, agendaDate);
  const total = tasks.reduce((sum, task) => sum + task.durationMs, 0);
  const days = calendarDays(agendaDate, agendaMode);
  const anchor = new Date(`${agendaDate}T12:00:00`);
  const period = agendaMode === 'month' ? 'mês' : 'semana';
  const modeIcon = mode => `<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="3" y="4" width="14" height="13" rx="3"/><path d="M3 8h14M7 2v4M13 2v4${mode === 'week' ? 'M7 8v9M12 8v9' : 'M7 11h1M12 11h1M7 14h1M12 14h1'}"/></svg>`;
  const cells = days.map(key => {
    const date = new Date(`${key}T12:00:00`);
    const items = dailyTaskTotals(allEvents, activities, key);
    const planned = items.reduce((sum, item) => sum + item.durationMs, 0);
    const isToday = key === dayKey();
    const outside = date.getMonth() !== anchor.getMonth();
    const preview = items.slice(0, 2).map(task => `<span class="calendar-preview ${task.done ? 'is-done' : ''} ${task.urgent ? 'is-urgent' : ''}"><span>${duration(task.durationMs)}</span><span>${escape(task.title)}</span></span>`).join('');
    return `<button type="button" data-action="date-select" data-date="${key}" class="calendar-day ${key === agendaDate ? 'is-selected' : ''} ${isToday ? 'is-today' : ''} ${outside ? 'outside-month' : ''}" aria-pressed="${key === agendaDate}" ${isToday ? 'aria-current="date"' : ''} aria-label="${escape(date.toLocaleDateString('pt-BR', { dateStyle: 'full' }))}, ${items.length} tarefa(s), tempo planejado: ${taskDuration(planned)}"><span class="calendar-day-heading"><span class="calendar-date-number">${date.getDate()}</span>${isToday ? '<span class="today-label">Hoje</span>' : ''}</span>${agendaMode === 'month' ? `<span class="calendar-previews">${preview}${items.length > 2 ? `<span class="calendar-more">+${items.length - 2} tarefa${items.length === 3 ? '' : 's'}</span>` : ''}</span>` : `<span class="week-event-count">${items.length ? `${duration(planned)}<small>planejados</small>` : 'Sem tarefas'}</span>`}<span class="mobile-event-dots" aria-hidden="true">${items.slice(0, 3).map(() => '<i></i>').join('')}</span></button>`;
  }).join('');
  return `<section class="card routine-launch"><div><span class="eyebrow">ROTINA SEMANAL</span><h3>Uma semana que cabe na sua vida.</h3><p>Deveres primeiro. Hobbies nos espaços disponíveis. Você revisa antes de confirmar.</p></div><div class="button-row">${button('routine-hours', 'Horários livres', 'secondary')}${button('routine-goals', 'Prioridades e metas', 'secondary')}${button('routine-generate', '✧ Sugerir rotina', 'primary')}</div></section><section class="card calendar-card calendar-redesign">
    <div class="calendar-toolbar"><div class="calendar-period-controls">${button('date-today', 'Hoje', 'calendar-today')}<div class="calendar-arrows">${button('date-prev', '‹', 'calendar-arrow', `aria-label="${agendaMode === 'month' ? 'Mês anterior' : 'Semana anterior'}"`)}${button('date-next', '›', 'calendar-arrow', `aria-label="${agendaMode === 'month' ? 'Próximo mês' : 'Próxima semana'}"`)}</div></div><div class="calendar-period-title"><h2>${anchor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h2><p>${agendaMode === 'week' ? `${dateText(new Date(`${days[0]}T12:00`))} – ${dateText(new Date(`${days[6]}T12:00`))}` : 'Planeje o mês. Cuide de um dia por vez.'}</p></div><div class="calendar-mode-switch" role="group" aria-label="Visualização da agenda">${[['week', 'Semana'], ['month', 'Mês']].map(([mode, label]) => button('calendar-mode', `${modeIcon(mode)}<span>${label}</span>`, agendaMode === mode ? 'is-active' : '', `data-mode="${mode}" aria-pressed="${agendaMode === mode}"`)).join('')}</div></div>
    <div class="calendar-weekday-labels">${['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(label => `<span>${label}</span>`).join('')}</div><div class="calendar-grid ${agendaMode}-view" aria-label="Calendário por ${period}">${cells}</div>
    <div class="calendar-legend"><span><i class="legend-today"></i>Hoje</span><span><i class="legend-selected"></i>Dia selecionado</span><label class="date-picker">Ir para a data<input type="date" id="agenda-date" value="${agendaDate}" /></label></div>
    <section class="day-events" id="agenda-details" aria-label="Tarefas do dia selecionado"><div class="day-events-heading"><div><span class="eyebrow">DIA SELECIONADO</span><h3>${anchor.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</h3></div><span class="day-total">Tempo planejado: ${duration(total)}</span></div>${freeTimeView(allEvents)}${tasks.length ? dailyTasksView(tasks) : '<div class="empty-inline">✧<h3>Espaço para um bom dia.</h3><p>Nenhuma tarefa nesta data. Use + Compromisso para reservar um horário.</p></div>'}</section>
    </section><section class="card integration-card"><div><span class="eyebrow">GOOGLE AGENDA</span><h3>Seu planejamento, conectado.</h3><p>Envie compromissos e consulte os próximos eventos. A importação é somente para consulta.</p></div><div class="button-row">${button('google-connect', googleToken ? 'Reconectar Google' : 'Conectar Google', 'secondary')}${googleToken ? button('google-list', 'Atualizar eventos', 'primary') : ''}</div>${googleEvents.length ? `<div class="google-events">${googleEvents.map(event => `<div><strong>${escape(event.summary || 'Sem título')}</strong><small>${escape(event.start?.dateTime ? new Date(event.start.dateTime).toLocaleString('pt-BR') : event.start?.date || '')}</small></div>`).join('')}</div>` : ''}</section>`;
}
function routineConfig() { return store.get('routine-settings') || { days: WEEKDAYS.map(() => []), breakMinutes: 10 }; }
function freeTimeView(events) {
  const settings = routineConfig();
  const periods = freeTimeOnDay(settings, events, agendaDate);
  const day = (new Date(`${agendaDate}T12:00`).getDay() + 6) % 7;
  const total = periods.reduce((sum, period) => sum + period.end - period.start, 0);
  return `<section class="free-time-card" aria-label="Horários livres do dia"><div class="free-time-heading"><h4>Horários livres do dia</h4>${periods.length ? `<span>${duration(total)} disponíveis</span>` : ''}</div>${periods.length ? `<div class="free-time-periods">${periods.map(period => `<span class="free-period"><strong>${timeText(period.start)} – ${timeText(period.end)}</strong><small>${duration(period.end - period.start)}</small></span>`).join('')}</div><p>Dentro da sua disponibilidade, sem compromissos, deveres ou hobbies agendados.${settings.breakMinutes ? ` Reservados ${settings.breakMinutes} min de intervalo ao redor de cada compromisso.` : ''}</p>` : `<p>${settings.days[day].length ? 'Não há faixas livres restantes neste dia, considerando compromissos e intervalos.' : 'Nenhuma disponibilidade cadastrada para este dia.'}</p>${button('routine-hours', 'Ajustar horários livres', 'text-button')}`}</section>`;
}
function availabilityRow(day, index, slot = {}) {
  return `<div class="availability-slot" data-slot="${index}"><label>Início<input type="time" name="from-${day}-${index}" value="${escape(slot.start || '')}" /></label><span>até</span><label>Fim<input type="time" name="to-${day}-${index}" value="${escape(slot.end || '')}" /></label>${button('availability-remove', '×', 'availability-remove', `data-day="${day}" aria-label="Remover faixa de ${WEEKDAYS[day]}"`)}</div>`;
}
function routineHours() {
  const config = routineConfig();
  dialog('Seus horários livres, toda semana', `<p class="muted">Cada dia pode ter uma, três ou mais faixas. Adicione ou remova conforme precisar; dias sem faixas ficam indisponíveis.</p><section class="availability-copy"><h3>Repetir horários</h3><label>Copiar as faixas do dia<select id="availability-source">${WEEKDAYS.map((day, index) => `<option value="${index}">${day}</option>`).join('')}</select></label><div class="button-row">${button('availability-copy', 'Segunda a sexta', 'secondary', 'data-group="weekdays"')}${button('availability-copy', 'Finais de semana', 'secondary', 'data-group="weekend"')}</div><p>Substitui as faixas do grupo pelas do dia escolhido. Você pode ajustar cada dia depois. Só será salvo ao confirmar abaixo.</p></section><div class="availability-list">${WEEKDAYS.map((day, index) => `<fieldset data-availability-day="${index}"><legend>${day}</legend><div class="availability-rows">${(config.days[index].length ? config.days[index] : [{}]).map((slot, row) => availabilityRow(index, row, slot)).join('')}</div>${button('availability-add', '+ Adicionar faixa', 'text-button', `data-day="${index}"`)}</fieldset>`).join('')}</div><label>Intervalo entre sessões (minutos)<input name="breakMinutes" type="number" min="0" max="60" required value="${config.breakMinutes}" /></label>`, 'Salvar horários', async data => {
    const days = WEEKDAYS.map((_day, index) => availabilityFields(data, index));
    store.put({ id: 'routine-settings', kind: 'routine', ...validateRoutine({ days, breakMinutes: Number(data.breakMinutes) }) }); await changed('Disponibilidade semanal salva.');
  });
}
function copyHours(group) {
  const form = editor.querySelector('form');
  const data = Object.fromEntries(new FormData(form));
  const source = Number(editor.querySelector('#availability-source').value);
  const sourceDays = WEEKDAYS.map((_day, index) => index === source ? availabilityFields(data, index) : []);
  const validated = validateRoutine({ days: sourceDays, breakMinutes: 0 });
  const copied = copyAvailability(validated.days, source, group);
  if (!confirm(`Substituir os horários de ${group === 'weekdays' ? 'segunda a sexta' : 'sábado e domingo'} pelas faixas de ${WEEKDAYS[source]}? As alterações só serão salvas ao clicar em Salvar horários.`)) return;
  const indexes = group === 'weekdays' ? [0, 1, 2, 3, 4] : [5, 6];
  for (const index of indexes) editor.querySelector(`[data-availability-day="${index}"] .availability-rows`).innerHTML = copied[index].map((slot, row) => availabilityRow(index, row, slot)).join('');
  toast('Faixas copiadas. Confira e use Salvar horários para confirmar.');
}
function routineGoals() {
  const activities = store.all('activity');
  if (!activities.length) { toast('Crie ao menos uma atividade primeiro.'); return; }
  dialog('Prioridades e metas da rotina', `<p class="muted">Deveres recebem preferência automática. Entre deveres, o prazo mais próximo vem primeiro; depois vale a prioridade escolhida. A frequência orienta a distribuição, sem garantir espaço quando a semana estiver cheia.</p>${activities.map((activity, index) => { const fields = planningFields(activity); return `<fieldset class="routine-activity"><legend>${escape(activity.name)} · ${TYPES[activity.type]}</legend><div class="form-grid"><label>Prioridade<select name="priority-${index}">${[['high', 'Alta'], ['normal', 'Média'], ['low', 'Baixa']].map(([key, label]) => `<option value="${key}"${selected(fields.priority, key)}>${label}</option>`).join('')}</select></label><label>Meta semanal (horas)<input type="number" step="0.25" min="0" max="168" name="goal-${index}" value="${activity.weeklyMinutes / 60}" required /></label></div><div class="form-grid"><label>Dias desejados por semana<input type="number" min="1" max="7" name="frequency-${index}" value="${fields.frequency}" required /></label>${activity.type === 'duty' ? `<label>Prazo opcional<input type="date" name="deadline-${index}" value="${fields.deadline}" /></label>` : ''}</div></fieldset>`; }).join('')}<p class="fine-print">Os períodos sugeridos duram de 15 a 50 minutos, com preferência por manter a mesma tarefa em sequência. Meta 0 exclui a atividade das sugestões. A rotina nunca altera compromissos existentes nem marca atividades como realizadas.</p>`, 'Salvar prioridades', async data => {
    const records = activities.map((activity, index) => {
      const current = store.get(activity.id); if (!current) throw new Error('Uma atividade foi removida. Abra esta configuração novamente.');
      const weeklyMinutes = Number(data[`goal-${index}`]) * 60;
      return { ...current, ...validateActivity({ ...current, weeklyMinutes }), ...planningFields({ priority: data[`priority-${index}`], frequency: data[`frequency-${index}`], deadline: data[`deadline-${index}`] || '' }) };
    });
    store.batch(records); await changed('Preferências de planejamento salvas.');
  });
}
function routinePreview() {
  const settings = routineConfig();
  if (!settings.days.some(day => day.length)) { routineHours(); toast('Cadastre seus horários e depois use Sugerir rotina.'); return; }
  const activities = store.all('activity');
  if (!activities.length) { toast('Crie suas atividades e metas semanais primeiro.'); return; }
  const result = generateRoutine({ activities, events: store.all('event'), sessions: store.all('session'), settings, week: agendaDate });
  const namespace = store.namespace;
  const fingerprint = JSON.stringify([settings, activities]);
  dialog('Sua semana, antes de confirmar', `<p class="muted">Semana de ${dateText(new Date(`${result.dates[0]}T12:00`))} a ${dateText(new Date(`${result.dates[6]}T12:00`))}. ${result.proposals.length} sessões sugeridas, com deveres primeiro. Desmarque o que não quiser ou ajuste os horários abaixo.</p>${result.proposals.map((item, index) => `<fieldset class="routine-proposal"><legend><label class="routine-keep"><input type="checkbox" name="keep-${index}" checked />${escape(item.title)} · ${TYPES[item.type]}</label></legend><div class="form-grid"><label>Início<input type="datetime-local" name="start-${index}" value="${localDateTime(item.start)}" required /></label><label>Fim<input type="datetime-local" name="end-${index}" value="${localDateTime(item.end)}" required /></label></div></fieldset>`).join('') || '<p class="inline-note">Nenhuma sessão coube nesta semana. Confira horários, metas e prazos, ou selecione uma semana futura no calendário.</p>'}${result.unmet.length ? `<section class="routine-unmet"><h3>O que ficou de fora</h3>${result.unmet.map(item => `<p><strong>${escape(item.name)}</strong>${item.minutes ? `: faltaram ${Math.ceil(item.minutes)} min` : ''}<br>${escape(item.reason)}</p>`).join('')}</section>` : ''}<label>Alertas para as novas sessões<select name="alert">${Object.entries(ALERTS).map(([key, value]) => `<option value="${key}"${selected(key, 'none')}>${value}</option>`).join('')}</select></label><p class="fine-print">As sessões serão compromissos normais, que você poderá editar ou remover na Agenda. A rotina só conta como tempo praticado após registrar uma sessão. A disponibilidade habitual permanece intacta.</p>`, 'Confirmar na agenda', async data => {
    if (store.namespace !== namespace || JSON.stringify([routineConfig(), store.all('activity')]) !== fingerprint) throw new Error('As preferências ou atividades mudaram. Feche esta prévia e gere novamente.');
    const accepted = result.proposals.filter((_item, index) => data[`keep-${index}`]).map(item => {
      const index = result.proposals.indexOf(item);
      return { ...item, start: new Date(data[`start-${index}`]).getTime(), end: new Date(data[`end-${index}`]).getTime() };
    });
    if (!accepted.length) throw new Error('Selecione ao menos uma sessão ou feche a prévia para ajustar as preferências.');
    if (accepted.some(item => !result.dates.includes(dayKey(item.start)) || !result.dates.includes(dayKey(item.end - 1)))) throw new Error('Mantenha as sessões dentro da semana planejada.');
    validateProposals(accepted, { activities: store.all('activity'), events: store.all('event'), settings: routineConfig() });
    if (data.alert !== 'none') { await unlockAudio().catch(() => {}); await requestAlerts(); }
    store.batch(accepted.map(item => ({ id: uid(), kind: 'event', ...validateEvent({ title: item.title, start: item.start, end: item.end, alert: data.alert, urgency: item.type === 'duty' ? 'high' : 'normal', leadMinutes: 0, activityId: item.activityId, note: 'Sessão sugerida pelo planejador semanal.' }), routineActivityId: item.activityId })));
    await changed(`${accepted.length} sessões adicionadas à agenda.`);
  });
}
function statsView() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const from = new Date(today); from.setDate(from.getDate() - statsPeriod + 1);
  const stats = statistics(store.all('session'), from.getTime(), Date.now() + 1);
  const days = Array.from({ length: statsPeriod }, (_, index) => { const date = new Date(from); date.setDate(date.getDate() + index); return date; });
  const max = Math.max(3600000, ...Object.values(stats.byDay));
  const sessions = store.all('session').filter(session => session.end > from.getTime()).sort((left, right) => right.start - left.start).slice(0, 50);
  return `<div class="section-title"><h2>Tempo bem investido</h2><div class="segmented">${[7, 30].map(days => button('stats-period', `${days} dias`, statsPeriod === days ? 'chosen' : '', `data-period="${days}"`)).join('')}</div></div><div class="stats-counters"><section class="card"><span>Tempo registrado</span><h2>${duration(stats.total)}</h2></section><section class="card"><span>Sessões</span><h2>${stats.count}</h2></section><section class="card"><span>Dias ativos</span><h2>${Object.keys(stats.byDay).length}<small> / ${statsPeriod}</small></h2></section></div><section class="card chart-card"><h3>Seu ritmo, dia após dia</h3><p class="muted">Tempo concluído ou registrado manualmente. Sessões em andamento não entram no total.</p><div class="bar-chart ${statsPeriod === 30 ? 'month' : ''}" role="img" aria-label="Tempo diário em minutos">${days.map(date => { const amount = stats.byDay[dayKey(date)] || 0; return `<div class="chart-column" title="${dayKey(date)}: ${duration(amount)}"><span class="chart-value">${Math.round(amount / 60000)}<small>min</small></span><div class="bar-space"><div class="chart-bar" style="height:${Math.max(2, amount / max * 100)}%"></div></div><small>${statsPeriod === 7 ? date.toLocaleDateString('pt-BR', { weekday: 'short' }) : date.getDate()}</small></div>`; }).join('')}</div></section><section class="card"><h3>Por atividade</h3>${Object.entries(stats.byActivity).length ? Object.entries(stats.byActivity).sort((left, right) => right[1] - left[1]).map(([id, amount]) => { const activity = store.get(id) || store.all('session').find(session => session.activityId === id); return `<div class="distribution"><div><strong>${escape(activity?.name || activity?.activityName || 'Atividade removida')}</strong><span>${duration(amount)} · ${Math.round(amount / stats.total * 100)}%</span></div><div class="progress-track"><div style="width:${amount / stats.total * 100}%"></div></div></div>`; }).join('') : '<p class="muted">Suas estatísticas aparecem depois da primeira sessão.</p>'}</section><div class="section-title"><h2>Histórico recente</h2>${button('session-new', '+ Registro manual', 'secondary')}</div><section class="card history">${sessions.length ? sessions.map(session => `<article><span class="history-icon">✓</span><div><strong>${escape(session.activityName)}</strong><small>${new Date(session.start).toLocaleString('pt-BR')} · ${session.source === 'manual' ? 'Manual' : 'Cronômetro'}${session.note ? ` · ${escape(session.note)}` : ''}</small></div><b>${duration(session.durationMs)}</b>${button('session-delete', '×', 'icon-button', `data-id="${session.id}" aria-label="Remover registro"`)}</article>`).join('') : '<p class="muted">Você ainda não concluiu nenhuma sessão neste período.</p>'}</section>`;
}
function settingsView() {
  const conflicts = Object.entries(store.state.conflicts);
  return `<div class="settings-grid"><section class="card"><span class="eyebrow">SUA CONTA</span><h2>${cloud.session ? 'Tudo no mesmo lugar.' : 'Comece aqui. Continue em qualquer lugar.'}</h2><p class="muted">${cloud.session ? escape(cloud.session.email) : 'O modo local funciona sem conta. Para compartilhar seus dados entre Android e Windows, configure a nuvem e entre com o mesmo e-mail.'}</p><p class="status-text" data-sync-label>${escape(syncStatus)}</p><div class="button-row">${cloud.session ? `${button('sync', 'Sincronizar agora', 'primary')}${button('logout', 'Sair da conta', 'secondary')}` : `${button('login', 'Entrar', 'primary')}${button('signup', 'Criar conta', 'secondary')}`}</div><p class="fine-print">Os dados locais e os de cada conta ficam separados. Exporte e importe um backup para transferi-los. Por segurança, a sessão da conta dura até fechar o aplicativo.</p></section><section class="card"><span class="eyebrow">LEMBRETES</span><h2>Na medida certa.</h2><p class="muted">Cada compromisso permite escolher alarme, notificação ou nenhum alerta. Você também define a antecedência.</p>${button('enable-alerts', 'Ativar notificações e som', 'secondary')}<p class="fine-print">${window.focusDesktop ? 'No Windows, feche a janela para manter o aplicativo na bandeja. Ao escolher Sair, os alertas param até abrir novamente.' : window.Capacitor?.isNativePlatform() ? 'No Android, permita notificações e alarmes exatos. Após reiniciar, os alertas são reagendados pelo aplicativo.' : 'No navegador, mantenha esta página aberta. Para alertas com a página fechada, use o aplicativo Android ou Windows. O som depende da interação com a página.'}</p></section><section class="card"><span class="eyebrow">SEUS DADOS</span><h2>Seu progresso é seu.</h2><p class="muted">Guarde uma cópia e restaure quando precisar. A importação combina registros pelo identificador e substitui os correspondentes.</p><div class="button-row">${button('backup-export', '↓ Exportar backup', 'secondary')}${button('backup-import', '↑ Importar backup', 'secondary')}</div><input type="file" id="backup-file" accept="application/json,.json" hidden /><p class="fine-print">O backup contém atividades, sessões e compromissos. Não inclui senhas, tokens ou configurações de conexão.</p></section><section class="card"><span class="eyebrow">CONEXÕES</span><h2>Prepare a sincronização.</h2><p class="muted">Configure uma vez em cada dispositivo, conforme o guia que acompanha o programa.</p>${button('configuration', 'Configurar conexões', 'secondary')}<p class="fine-print">Firebase: ${config.projectId ? escape(config.projectId) : 'não configurado'}<br>Google Agenda: ${config.googleClientId ? 'cliente Windows configurado' : 'configuração necessária no Google Cloud'}</p></section></div>${conflicts.length ? `<section class="card conflict-card"><h2>Alterações em conflito</h2><p>O mesmo registro mudou em dois dispositivos. Exporte um backup antes de escolher qual versão manter.</p>${conflicts.map(([id, remote]) => `<article><h3>${escape(store.state.records[id]?.name || store.state.records[id]?.title || remote.kind)}</h3><div class="conflict-comparison"><div><strong>Neste dispositivo</strong><pre>${escape(JSON.stringify(store.state.records[id], null, 2))}</pre></div><div><strong>Na nuvem</strong><pre>${escape(JSON.stringify(remote, null, 2))}</pre></div></div><div class="button-row">${button('conflict-local', 'Manter deste dispositivo', 'secondary', `data-id="${id}"`)}${button('conflict-remote', 'Usar versão da nuvem', 'secondary', `data-id="${id}"`)}</div></article>`).join('')}</section>` : ''}`;
}
function dialog(title, content, submitLabel, onSubmit, extra = '') {
  editor.innerHTML = `<form><div class="dialog-heading"><div><p class="eyebrow">FOCALIZADOR</p><h2>${title}</h2></div><button type="button" data-action="close-dialog" class="icon-button" aria-label="Fechar">×</button></div>${content}<p class="dialog-status" role="status" aria-live="polite"></p><p class="form-error" role="alert"></p><div class="dialog-actions">${extra}<button type="submit" class="primary">${submitLabel}</button></div></form>`;
  editor.showModal();
  const form = editor.querySelector('form');
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const submit = form.querySelector('[type="submit"]'); submit.disabled = true;
    try { await onSubmit(Object.fromEntries(new FormData(form))); if (editor.open) editor.close(); }
    catch (error) { form.querySelector('.form-error').textContent = readableError(error); }
    finally { submit.disabled = false; }
  });
}
function activityEditor(activity) {
  dialog(activity ? 'Seu espaço de dedicação' : 'Uma nova atividade', `<label>Nome<input name="name" required maxlength="80" placeholder="Ex.: Xadrez, leitura, estudos" value="${escape(activity?.name || '')}" /></label><div class="form-grid"><label>Tipo<select name="type">${Object.entries(TYPES).map(([key, value]) => `<option value="${key}"${selected(activity?.type, key)}>${value}</option>`).join('')}</select></label><label>Meta semanal (horas)<input name="weeklyHours" type="number" min="0" max="168" step="0.25" value="${(activity?.weeklyMinutes || 0) / 60}" /></label></div><p class="fine-print">Uma meta é um convite à consistência. Deixe 0 para acompanhar sem meta.</p><fieldset class="color-picker"><legend>Cor da atividade</legend>${COLORS.map((color, index) => `<label style="--swatch:${color}"><input type="radio" name="color" value="${color}" ${color === (activity?.color || COLORS[0]) ? 'checked' : ''} aria-label="Cor ${index + 1}" /><span></span></label>`).join('')}</fieldset>`, 'Salvar atividade', data => { store.put({ ...activity, id: activity?.id || uid(), kind: 'activity', ...validateActivity({ ...data, weeklyMinutes: Number(data.weeklyHours) * 60 }) }); changed('Atividade salva.'); }, activity ? button('activity-delete', 'Remover atividade', 'danger text-button', `data-id="${activity.id}"`) : '');
}
const localDateTime = value => { const date = new Date(value); return `${dayKey(date)}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`; };
function eventEditor(event) {
  const beginning = event?.start || (agendaDate === dayKey() ? Math.ceil((Date.now() + 3600000) / 900000) * 900000 : new Date(`${agendaDate}T09:00`).getTime());
  dialog(event ? 'Seu compromisso' : 'Abra espaço na agenda', `<label>Título<input name="title" required maxlength="120" value="${escape(event?.title || '')}" placeholder="Ex.: Treino de xadrez" /></label><div class="form-grid"><label>Início<input type="datetime-local" name="start" required value="${localDateTime(beginning)}" /></label><label>Fim<input type="datetime-local" name="end" required value="${localDateTime(event?.end || beginning + 3600000)}" /></label></div><label>Atividade relacionada<select name="activityId"><option value="">Nenhuma</option>${store.all('activity').map(activity => `<option value="${activity.id}"${selected(event?.activityId, activity.id)}>${escape(activity.name)}</option>`).join('')}</select></label><div class="form-grid"><label>Como lembrar<select name="alert">${Object.entries(ALERTS).map(([key, label]) => `<option value="${key}"${selected(event?.alert || 'notification', key)}>${label}</option>`).join('')}</select></label><label>Antecedência (minutos)<input type="number" name="leadMinutes" min="0" max="10080" value="${event?.leadMinutes ?? 10}" required /></label></div><label>Urgência<select name="urgency">${[['low', 'Baixa'], ['normal', 'Normal'], ['high', 'Alta']].map(([key, label]) => `<option value="${key}"${selected(event?.urgency || 'normal', key)}>${label}</option>`).join('')}</select></label><label>Anotações<textarea name="note" maxlength="2000" rows="2">${escape(event?.note || '')}</textarea></label><p class="fine-print">A urgência é uma marcação visual. O tipo de alerta escolhido determina se haverá som. O Google Agenda usa os próprios lembretes.</p>${event ? `<div class="event-tools">${button('event-done', event.done ? 'Reabrir compromisso' : '✓ Marcar concluído', 'secondary', `data-id="${event.id}"`)}${button('event-google', event.googleId ? 'Atualizar no Google' : 'Enviar ao Google', 'secondary', `data-id="${event.id}"`)}${button('event-ics', '↓ Calendário (.ics)', 'secondary', `data-id="${event.id}"`)}</div>` : ''}`, 'Salvar compromisso', async data => {
    const validated = validateEvent({ ...data, start: new Date(data.start).getTime(), end: new Date(data.end).getTime() });
    if (validated.alert !== 'none' && (!event || event.alert === 'none')) { await unlockAudio().catch(() => {}); await requestAlerts(); }
    store.put({ ...event, id: event?.id || uid(), kind: 'event', ...validated }); await changed('Compromisso salvo.');
  }, event ? button('event-delete', 'Remover', 'danger text-button', `data-id="${event.id}"`) : '');
}
function manualSession() {
  if (!store.all('activity').length) { toast('Crie uma atividade antes de registrar tempo.'); return; }
  dialog('Seu tempo também pode ser registrado depois', `<label>Atividade<select name="activityId">${store.all('activity').map(activity => `<option value="${activity.id}">${escape(activity.name)}</option>`).join('')}</select></label><label>Quando começou<input type="datetime-local" name="start" required value="${localDateTime(Date.now() - 1800000)}" /></label><label>Duração (minutos)<input type="number" name="minutes" min="1" max="1440" required value="30" /></label><label>Anotações<textarea name="note" maxlength="1000" rows="2"></textarea></label>`, 'Registrar tempo', data => {
    const start = new Date(data.start).getTime(); const minutes = Number(data.minutes); const end = start + minutes * 60000;
    if (!Number.isFinite(start) || !Number.isFinite(minutes) || minutes <= 0 || minutes > 1440 || end > Date.now() + 60000) throw new Error('Registre até 24 horas e escolha um período já concluído.');
    if (store.all('session').some(session => start < session.end && end > session.start)) throw new Error('Este horário coincide com outra sessão. Ajuste para evitar contar tempo duas vezes.');
    const timer = store.get('timer'); if (timer && end > timer.originAt) throw new Error('Conclua a sessão atual antes de registrar esse horário.');
    const activity = store.get(data.activityId);
    store.put({ id: uid(), kind: 'session', activityId: activity.id, activityName: activity.name, color: activity.color, start, end, durationMs: minutes * 60000, source: 'manual', note: data.note }); changed('Tempo registrado.');
  });
}
function configure() {
  dialog('Conectar seus dispositivos', `<p class="muted">Use os dados do seu próprio projeto, seguindo o README. A chave Web do Firebase identifica o projeto; não use uma chave de serviço.</p><label>Firebase · Project ID<input name="projectId" value="${escape(config.projectId || '')}" pattern="[a-z0-9-]+" /></label><label>Firebase · Web API Key<input name="apiKey" value="${escape(config.apiKey || '')}" /></label><label>Google · Client ID de aplicativo desktop<input name="googleClientId" value="${escape(config.googleClientId || '')}" /></label><label>Google · Client secret do cliente desktop<input name="googleClientSecret" value="${escape(config.googleClientSecret || '')}" /></label><p class="fine-print">Esses identificadores de aplicativo desktop ficam neste dispositivo. No Android, a autorização Google usa o pacote e a assinatura do APK registrados no Google Cloud.</p>`, 'Salvar conexões', data => {
    if (cloud.session) throw new Error('Saia da conta antes de alterar a configuração.');
    config = Object.fromEntries(Object.entries(data).map(([key, value]) => [key, value.trim()])); localStorage.setItem('focus-config', JSON.stringify(config)); cloud = new Cloud(config, sessionStorage); googleToken = null; render(); toast('Configuração salva. Agora você pode entrar na conta.');
  });
}
function login(create = false) {
  if (!config.apiKey || !config.projectId) { configure(); return; }
  dialog(create ? 'Seu espaço, em todos os dispositivos' : 'Bom ter você de volta', `<label>E-mail<input type="email" name="email" required autocomplete="email" /></label><label>Senha<input type="password" name="password" required minlength="6" autocomplete="${create ? 'new-password' : 'current-password'}" /></label><p class="fine-print">Os dados do modo local continuam guardados separadamente. Use backup para levá-los à conta.</p>`, create ? 'Criar minha conta' : 'Entrar', async data => {
    await cloud.auth(create ? 'signUp' : 'signInWithPassword', data.email, data.password);
    clearTimeout(pendingSync); store = new Store(localStorage, `${config.projectId}-${cloud.session.uid}`); googleEvents = []; syncStatus = 'Conta conectada'; await changed(); await sync(false);
  }, create ? '' : button('reset-password', 'Esqueci a senha', 'text-button'));
}
async function saveFile(name, text, type) {
  const bridge = await nativeBridge();
  if (bridge) return bridge.saveText({ name, text, mime: type });
  if (window.focusDesktop) return window.focusDesktop.saveText(name, text);
  const url = URL.createObjectURL(new Blob([text], { type })); const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function icsText(event) {
  const timestamp = value => new Date(value).toISOString().replaceAll('-', '').replaceAll(':', '').replace(/\.\d{3}/, '');
  const quote = value => String(value || '').replaceAll('\\', '\\\\').replaceAll('\r', '').replaceAll('\n', '\\n').replaceAll(',', '\\,').replaceAll(';', '\\;');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Focalizador//PT-BR', 'BEGIN:VEVENT', `UID:${event.id}@focalizador.local`, `DTSTAMP:${timestamp(Date.now())}`, `DTSTART:${timestamp(event.start)}`, `DTEND:${timestamp(event.end)}`, `SUMMARY:${quote(event.title)}`, `DESCRIPTION:${quote(event.note)}`];
  if (event.alert !== 'none') lines.push('BEGIN:VALARM', `TRIGGER:-PT${event.leadMinutes}M`, 'ACTION:DISPLAY', `DESCRIPTION:${quote(event.title)}`, 'END:VALARM');
  lines.push('END:VEVENT', 'END:VCALENDAR'); return lines.join('\r\n');
}
async function googleRequest(path, options = {}) {
  googleToken ||= await calendarToken(config);
  try { return await jsonFetch(`https://www.googleapis.com/calendar/v3/${path}`, { ...options, headers: { Authorization: `Bearer ${googleToken}`, 'Content-Type': 'application/json' } }); }
  catch (error) { if (error.status === 401) googleToken = null; throw error; }
}
async function pushGoogle(event) {
  const id = event.googleId || googleEventId(event.id);
  try { await googleRequest(`calendars/primary/events/${id}`, { method: 'PUT', body: JSON.stringify(calendarBody(event)) }); }
  catch (error) {
    if (error.status !== 404) throw error;
    try { await googleRequest('calendars/primary/events', { method: 'POST', body: JSON.stringify({ id, ...calendarBody(event) }) }); }
    catch (retryError) { if (retryError.status !== 409) throw retryError; await googleRequest(`calendars/primary/events/${id}`, { method: 'PUT', body: JSON.stringify(calendarBody(event)) }); }
  }
  store.put({ ...event, googleId: id, googleSentAt: Date.now() }); await changed('Compromisso salvo no Google Agenda.');
}
function showAlarm(event) {
  const isAlarm = event.alert === 'alarm' || event.mode === 'alarm';
  alarm.innerHTML = `<div class="alarm-content"><div class="empty-symbol">${isAlarm ? '◷' : '♧'}</div><p class="eyebrow">${isAlarm ? 'SEU ALARME' : 'LEMBRETE'}</p><h2>${escape(event.title)}</h2><p>Um momento reservado por você.</p><button class="primary" data-action="alarm-stop">Entendi${isAlarm ? ' · Parar alarme' : ''}</button></div>`;
  if (!alarm.open) alarm.showModal();
  if (isAlarm) alarmSound().catch(() => toast('Toque em Ativar notificações e som nos Ajustes para liberar o áudio.'));
}
function confirmAction(title, description, perform) { dialog(title, `<p class="muted">${description}</p>`, 'Confirmar', async () => { await perform(); }); }
async function action(name, target) {
  const id = target.dataset.id;
  if (name === 'navigate') { view = target.dataset.view; render(); window.scrollTo(0, 0); }
  else if (name === 'routine-hours') routineHours();
  else if (name === 'availability-add') {
    const day = Number(target.dataset.day);
    const rows = editor.querySelector(`[data-availability-day="${day}"] .availability-rows`);
    const index = Math.max(-1, ...Array.from(rows.querySelectorAll('[data-slot]'), row => Number(row.dataset.slot))) + 1;
    rows.insertAdjacentHTML('beforeend', availabilityRow(day, index));
  }
  else if (name === 'availability-remove') target.closest('.availability-slot').remove();
  else if (name === 'availability-copy') copyHours(target.dataset.group);
  else if (name === 'routine-goals') routineGoals();
  else if (name === 'routine-generate') routinePreview();
  else if (name === 'activity-new') activityEditor();
  else if (name === 'activity-edit') activityEditor(store.get(id));
  else if (name === 'activity-delete') {
    if (store.get('timer')?.activityId === id) throw new Error('Conclua a sessão desta atividade antes de removê-la.');
    editor.close(); confirmAction('Remover atividade?', 'O histórico das sessões será preservado.', () => { store.remove(id); changed('Atividade removida.'); });
  } else if (name === 'starter') { store.batch([['Xadrez', 'hobby', 180], ['Leitura', 'hobby', 120], ['Estudos', 'duty', 300]].map(([name, type, weeklyMinutes], index) => ({ id: uid(), kind: 'activity', name, type, weeklyMinutes, color: COLORS[index] }))); await changed('Atividades iniciais criadas. Você pode editar todas.'); }
  else if (name === 'calendar-mode') { if (!['week', 'month'].includes(target.dataset.mode)) return; agendaMode = target.dataset.mode; localStorage.setItem('focus-agenda-mode', agendaMode); render(); }
  else if (name === 'pick-activity') {
    if (!store.all('activity').length) { activityEditor(); return; }
    dialog('A que você quer dedicar atenção?', `<label>Atividade<select name="activityId">${store.all('activity').map(activity => `<option value="${activity.id}">${escape(activity.name)}</option>`).join('')}</select></label>`, '▶ Começar', async data => { if (store.get('timer')) throw new Error('Já existe uma sessão aberta.'); await unlockAudio().catch(() => {}); store.put(startTimer(data.activityId)); await changed(); });
  } else if (name === 'timer-start') { if (store.get('timer')) throw new Error('Conclua a sessão atual primeiro.'); await unlockAudio().catch(() => {}); store.put(startTimer(id)); view = 'home'; await changed(); }
  else if (name === 'timer-toggle') { const timer = store.get('timer'); if (timer) { store.put(toggleTimer(timer)); await changed(); } }
  else if (name === 'timer-finish') { const timer = store.get('timer'); if (!timer) return; if (timerElapsed(timer) < 1000) throw new Error('Registre pelo menos um segundo de foco.'); store.batch([finishTimer(timer, store.get(timer.activityId)), { ...timer, deleted: true }]); await changed('Sessão concluída. Cada passo conta!'); }
  else if (name === 'session-new') manualSession();
  else if (name === 'session-delete') confirmAction('Remover registro?', 'O tempo desta sessão deixará de aparecer nas estatísticas.', () => { store.remove(id); changed('Registro removido.'); });
  else if (name === 'event-new') eventEditor();
  else if (name === 'event-edit') eventEditor(store.get(id));
  else if (name === 'event-done') { const event = store.get(id); store.put({ ...event, done: !event.done }); editor.close(); await changed(); }
  else if (name === 'event-delete') { editor.close(); confirmAction('Remover compromisso?', 'Ele será removido do Focalizador. Se você o enviou ao Google Agenda, a cópia no Google será mantida.', () => { store.remove(id); changed('Compromisso removido.'); }); }
  else if (name === 'event-ics') { await saveFile('compromisso.ics', icsText(store.get(id)), 'text/calendar'); toast('Arquivo de calendário preparado.'); }
  else if (name === 'event-google') { if (!confirm('Enviar a versão salva deste compromisso para sua agenda principal do Google? Salve primeiro se alterou campos neste formulário.')) return; await pushGoogle(store.get(id)); }
  else if (name.startsWith('date-')) {
    if (name === 'date-today') agendaDate = dayKey();
    else if (name === 'date-select') agendaDate = target.dataset.date;
    else agendaDate = shiftCalendarDate(agendaDate, agendaMode, name === 'date-prev' ? -1 : 1);
    render();
    if (name === 'date-select' && window.matchMedia?.('(max-width:640px)')?.matches) document.querySelector('#agenda-details')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else if (name === 'stats-period') { statsPeriod = Number(target.dataset.period); render(); }
  else if (name === 'close-dialog') editor.close();
  else if (name === 'configuration') configure();
  else if (name === 'login') login();
  else if (name === 'signup') login(true);
  else if (name === 'reset-password') { const email = editor.querySelector('[name="email"]').value; if (!email) throw new Error('Preencha seu e-mail para receber a recuperação.'); await cloud.reset(email); toast('Se a conta existir, você receberá um e-mail de recuperação.'); }
  else if (name === 'logout') { if (cloud.busy) throw new Error('Aguarde a sincronização terminar.'); cloud.logout(); googleToken = null; googleEvents = []; clearTimeout(pendingSync); store = new Store(localStorage); syncStatus = 'Salvo neste dispositivo'; await changed('Conta desconectada. Seus dados continuam guardados separadamente.'); }
  else if (name === 'sync') await sync();
  else if (name === 'enable-alerts') { await unlockAudio().catch(() => {}); await requestAlerts(); await scheduleAlerts(store.all('event'), store.namespace, store.state.fired); toast('Permissões solicitadas. Confira as opções autorizadas no sistema.'); }
  else if (name === 'backup-export') { await saveFile(`focalizador-${dayKey()}.json`, JSON.stringify(store.export(), null, 2), 'application/json'); toast('Backup preparado.'); }
  else if (name === 'backup-import') document.querySelector('#backup-file').click();
  else if (name === 'google-connect') { googleToken = await calendarToken(config); render(); toast('Google Agenda conectado nesta sessão.'); }
  else if (name === 'google-list') { const query = new URLSearchParams({ timeMin: new Date().toISOString(), maxResults: '30', singleEvents: 'true', orderBy: 'startTime' }); const result = await googleRequest(`calendars/primary/events?${query}`); googleEvents = result.items || []; render(); }
  else if (name === 'alarm-stop') { stopSound(); alarm.close(); window.focusDesktop?.stopAlarm(); }
  else if (name === 'conflict-local' || name === 'conflict-remote') {
    store.transaction(next => { const remote = next.conflicts[id]; if (name === 'conflict-remote') next.records[id] = { ...remote, _dirty: false }; else next.records[id] = { ...next.records[id], _cloudTime: remote._cloudTime, _dirty: true }; delete next.conflicts[id]; }); await changed(); await sync(false);
  }
}
document.addEventListener('click', async event => {
  const target = event.target.closest('[data-action]'); if (!target || target.disabled || operationBusy) return;
  event.preventDefault(); operationBusy = true; target.disabled = true;
  try { await action(target.dataset.action, target); } catch (error) { toast(readableError(error)); } finally { operationBusy = false; target.disabled = false; }
});
document.addEventListener('change', async event => {
  try {
    if (event.target.id === 'activity-search') { activityQuery = event.target.value.trim(); render(); }
    if (event.target.id === 'agenda-date' && event.target.value) { agendaDate = event.target.value; render(); }
    if (event.target.id === 'backup-file') {
      const file = event.target.files[0]; if (!file) return; if (file.size > 10000000) throw new Error('O backup deve ter até 10 MB.'); const data = JSON.parse(await file.text());
      confirmAction('Importar backup?', 'Os registros do arquivo serão combinados aos seus. Registros com o mesmo identificador serão substituídos.', () => { store.import(data); changed('Backup importado.'); });
    }
  } catch (error) { toast(readableError(error)); }
});
alarm.addEventListener('cancel', event => event.preventDefault());
function tick() {
  const timer = store.get('timer'); for (const element of document.querySelectorAll('[data-timer]')) element.textContent = duration(timerElapsed(timer), true);
  checkBrowserAlerts(store.all('event'), store, showAlarm);
}
window.addEventListener('storage', event => {
  if (event.key === store.key) { store = new Store(localStorage, store.namespace); if (!editor.open) render(); }
});
window.addEventListener('online', () => sync(false));
document.addEventListener('visibilitychange', () => { if (!document.hidden) { tick(); sync(false); } });
if (window.focusDesktop) window.focusDesktop.onAlarm(showAlarm);
render();
setInterval(tick, 1000);
setInterval(() => { if (!document.hidden) sync(false); }, 30000);
scheduleAlerts(store.all('event'), store.namespace, store.state.fired).catch(error => toast(readableError(error)));
sync(false);
