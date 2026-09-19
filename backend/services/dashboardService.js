const DAY_MS = 24 * 60 * 60 * 1000;
const STATUS_COLORS = { todo: '#94A3B8', doing: '#2563EB', blocked: '#DC2626', review: '#D97706', done: '#059669' };
const TYPE_BADGES = {
  Hackathon: 'bg-slate-100 text-black border-slate-300', Competition: 'bg-blue-50 text-[#2563EB] border-blue-200',
  Networking: 'bg-emerald-50 text-[#059669] border-emerald-200', Workshop: 'bg-slate-100 text-slate-800 border-slate-300'
};
const SEVERITY_COLORS = { Critical: '#B91C1C', High: '#EA580C', Medium: '#D97706', Low: '#64748B' };

function startOfToday() { const date = new Date(); date.setHours(0, 0, 0, 0); return date; }
function daysUntil(date) { return Math.max(0, Math.ceil((new Date(date).setHours(0, 0, 0, 0) - startOfToday()) / DAY_MS)); }
function relativeTime(value) { const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000)); if (minutes < 60) return `${Math.max(1, minutes)}m ago`; const hours = Math.floor(minutes / 60); if (hours < 24) return `${hours}h ago`; return `${Math.floor(hours / 24)}d ago`; }

function presentationEvent(event) {
  return {
    ...event,
    budgetLabel: event.name.replace(/ Hackathon 2026$/, '').replace(/ Championship$/, ''),
    typeBadgeColor: TYPE_BADGES[event.type] || 'bg-slate-100 text-slate-800 border-slate-300',
    daysLeft: daysUntil(event.eventDate)
  };
}

function createDashboardService(store) {
  async function stats(user) {
    const data = await store.read();
    const today = startOfToday().getTime();
    const weekEnd = today + (7 * DAY_MS);
    const openTasks = data.tasks.filter((task) => task.status !== 'done');
    const myToday = openTasks.filter((task) => task.assigneeId === user.id && new Date(task.dueDate).getTime() >= today && new Date(task.dueDate).getTime() < today + DAY_MS).length;
    const overdue = openTasks.filter((task) => new Date(task.dueDate).getTime() < today).length;
    const openRisks = data.risks.filter((risk) => risk.status === 'open');
    const deadlines = openTasks.filter((task) => { const due = new Date(task.dueDate).getTime(); return due >= today && due <= weekEnd; }).length;
    const activeEvents = data.events.filter((event) => ['in_progress', 'upcoming'].includes(event.status)).length;
    return {
      myTasksToday: { value: myToday, trend: myToday ? `${myToday} due today` : 'No tasks due today', trendUp: false },
      overdue: { value: overdue, trend: overdue ? 'Needs action' : 'All caught up', isAlert: overdue > 0 },
      openRisks: { value: openRisks.length, criticalCount: openRisks.filter((risk) => risk.severity === 'Critical').length, label: `${openRisks.filter((risk) => risk.severity === 'Critical').length} Critical` },
      upcomingDeadlines: { value: deadlines, subtext: 'Next 7 days' },
      activeEvents: { value: activeEvents, subtext: 'Across your club' }
    };
  }

  async function events() { const data = await store.read(); return data.events.map(presentationEvent); }

  async function modules() {
    const data = await store.read();
    const done = data.tasks.filter((task) => task.status === 'done').length;
    const overloaded = data.volunteers.filter((volunteer) => volunteer.activeTasks > 6).length;
    const lastMeeting = data.meetings.sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt))[0];
    const nextWeek = await stats({ id: '__none__' });
    const indexing = data.documents.filter((document) => document.status === 'indexing').length;
    const critical = data.risks.filter((risk) => risk.status === 'open' && risk.severity === 'Critical').length;
    const latestAnnouncement = data.announcements.sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))[0];
    return {
      tasks: { stat: `${done} of ${data.tasks.length} done`, statusDot: '#2563EB', statusLabel: 'Doing' },
      volunteers: { stat: `${data.volunteers.length} active, ${overloaded} overloaded`, statusDot: overloaded ? '#DC2626' : '#059669', statusLabel: overloaded ? 'Overload Alert' : 'Balanced' },
      meetings: { stat: lastMeeting ? `Last: ${lastMeeting.title}, ${relativeTime(lastMeeting.occurredAt)}` : 'No meetings logged', statusDot: '#059669', statusLabel: 'Minutes Logged' },
      deadlines: { stat: `${nextWeek.upcomingDeadlines.value} due this week`, statusDot: '#D97706', statusLabel: 'Urgent' },
      documents: { stat: `${data.documents.length} files, ${indexing} indexing`, statusDot: '#000000', statusLabel: 'Synced' },
      risks: { stat: `${data.risks.filter((risk) => risk.status === 'open').length} open (${critical} critical)`, statusDot: critical ? '#B91C1C' : '#059669', statusLabel: critical ? 'Critical' : 'Monitored' },
      announcements: { stat: latestAnnouncement ? `Last sent: ${latestAnnouncement.title}` : 'No announcements sent', statusDot: '#059669', statusLabel: 'Delivered' },
      knowledgeBase: { stat: 'Ask a question about past events', statusDot: '#0E7490', statusLabel: 'AI Indexed' }
    };
  }

  async function activity() { const data = await store.read(); return data.activities.slice().sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt)).map(({ occurredAt, ...item }) => ({ ...item, timestamp: relativeTime(occurredAt) })); }

  async function budgets() {
    const data = await store.read();
    // Supports databases created before multi-event budgets were introduced.
    return data.budgets || (data.budget ? [{ eventId: data.events[0]?.id || 'default', sponsorshipReceived: 0, ...data.budget }] : []);
  }

  async function budgetForEvent(eventId) {
    const data = await store.read();
    const event = data.events.find((candidate) => candidate.id === eventId);
    if (!event) return { event: null, budget: null };
    const allBudgets = data.budgets || (data.budget ? [{ eventId: data.events[0]?.id || 'default', sponsorshipReceived: 0, ...data.budget }] : []);
    return { event, budget: allBudgets.find((candidate) => candidate.eventId === eventId) || null };
  }

  async function charts() {
    const data = await store.read();
    const orderedStatuses = [['done', 'Done'], ['doing', 'Doing'], ['review', 'Review'], ['blocked', 'Blocked'], ['todo', 'To do']];
    const taskStatus = orderedStatuses.map(([key, name]) => ({ name, count: data.tasks.filter((task) => task.status === key).length, color: STATUS_COLORS[key] }));
    const riskSeverity = ['Critical', 'High', 'Medium', 'Low'].map((severity) => ({ severity, count: data.risks.filter((risk) => risk.status === 'open' && risk.severity === severity).length, color: SEVERITY_COLORS[severity] }));
    const totalDone = taskStatus.find((item) => item.name === 'Done').count;
    return {
      taskStatus,
      riskSeverity,
      volunteerLoad: data.volunteers.map((volunteer) => ({ name: volunteer.name, tasks: volunteer.activeTasks, isOverloaded: volunteer.activeTasks > 6 })),
      completionTrend: [{ day: 'Day 1', actual: Math.max(0, totalDone - 37), planned: Math.max(0, totalDone - 38) }, { day: 'Day 3', actual: Math.max(0, totalDone - 32), planned: Math.max(0, totalDone - 34) }, { day: 'Day 5', actual: Math.max(0, totalDone - 26), planned: Math.max(0, totalDone - 29) }, { day: 'Day 7', actual: Math.max(0, totalDone - 20), planned: Math.max(0, totalDone - 23) }, { day: 'Day 9', actual: Math.max(0, totalDone - 13), planned: Math.max(0, totalDone - 16) }, { day: 'Day 11', actual: Math.max(0, totalDone - 7), planned: Math.max(0, totalDone - 9) }, { day: 'Day 13', actual: Math.max(0, totalDone - 2), planned: Math.max(0, totalDone - 3) }, { day: 'Day 14', actual: totalDone, planned: totalDone + 1 }],
      budget: data.budget || data.budgets?.[0] || { event: 'No event budget', totalPlanned: 0, committed: 0, spent: 0, currency: '$' },
      eventsComparison: data.events.filter((event) => event.status !== 'completed').map((event, index) => ({ name: event.name.replace(' Championship', '').replace(' Hackathon 2026', ''), percent: event.percentComplete, fill: ['#000000', '#2563EB', '#059669'][index % 3] }))
    };
  }

  async function summary(user) {
    const value = await stats(user);
    const data = await store.read();
    const critical = data.risks.find((risk) => risk.status === 'open' && risk.severity === 'Critical');
    return { greetingLine: `${value.myTasksToday.value} tasks due today, ${value.overdue.value} overdue${critical ? `, and ${critical.title.toLowerCase()}` : ''}.` };
  }

  return { stats, events, modules, activity, budgets, budgetForEvent, charts, summary, presentationEvent };
}

module.exports = { createDashboardService };
