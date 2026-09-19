const crypto = require('node:crypto');
const { readJson, sendJson, success, failure, notFound } = require('../utils/http');
const { requireUser, canManageEvents } = require('../middleware/auth');
const { handleAiRoutes } = require('./aiRoutes');

const EVENT_STATUSES = new Set(['in_progress', 'upcoming', 'completed']);
const RISK_LEVELS = new Set(['low', 'medium', 'high', 'critical']);
const PHASES = new Set(['Concept', 'Approvals', 'Promotion', 'Logistics', 'Execution']);

function eventInput(input, partial = false) {
  const result = {};
  const required = ['name', 'type', 'eventDate', 'percentComplete', 'phase', 'riskLevel', 'riskSummary', 'status'];
  if (!partial) for (const key of required) if (input[key] === undefined || input[key] === '') throw Object.assign(new Error(`${key} is required.`), { status: 422 });
  if (input.name !== undefined) { const name = String(input.name).trim(); if (name.length < 3 || name.length > 120) throw Object.assign(new Error('Event name must be 3–120 characters.'), { status: 422 }); result.name = name; }
  if (input.type !== undefined) { const type = String(input.type).trim(); if (!type || type.length > 60) throw Object.assign(new Error('Event type is required.'), { status: 422 }); result.type = type; }
  if (input.eventDate !== undefined) { const eventDate = new Date(input.eventDate); if (Number.isNaN(eventDate.getTime())) throw Object.assign(new Error('eventDate must be a valid date.'), { status: 422 }); result.eventDate = eventDate.toISOString(); }
  if (input.percentComplete !== undefined) { const percent = Number(input.percentComplete); if (!Number.isInteger(percent) || percent < 0 || percent > 100) throw Object.assign(new Error('percentComplete must be an integer from 0 to 100.'), { status: 422 }); result.percentComplete = percent; }
  if (input.phase !== undefined) { if (!PHASES.has(input.phase)) throw Object.assign(new Error('phase is invalid.'), { status: 422 }); result.phase = input.phase; }
  if (input.riskLevel !== undefined) { if (!RISK_LEVELS.has(input.riskLevel)) throw Object.assign(new Error('riskLevel is invalid.'), { status: 422 }); result.riskLevel = input.riskLevel; }
  if (input.riskSummary !== undefined) { const riskSummary = String(input.riskSummary).trim(); if (riskSummary.length > 240) throw Object.assign(new Error('riskSummary must be 240 characters or fewer.'), { status: 422 }); result.riskSummary = riskSummary; }
  if (input.status !== undefined) { if (!EVENT_STATUSES.has(input.status)) throw Object.assign(new Error('status is invalid.'), { status: 422 }); result.status = input.status; }
  if (input.topMembers !== undefined) { if (!Array.isArray(input.topMembers) || input.topMembers.length > 8) throw Object.assign(new Error('topMembers must be an array of at most eight members.'), { status: 422 }); result.topMembers = input.topMembers.map((member) => ({ name: String(member.name || '').slice(0, 80), initials: String(member.initials || '').slice(0, 4), bg: String(member.bg || 'bg-slate-700').slice(0, 60) })); }
  return result;
}

async function authenticated(request, response, context) {
  const user = await requireUser(request, response, context);
  if (!user) { failure(response, 401, 'Authentication is required.'); return null; }
  return user;
}

async function handleApi(request, response, url, context) {
  const { pathname } = url;
  if (request.method === 'POST' && pathname === '/api/auth/signup') {
    const result = await context.auth.signup(await readJson(request));
    return success(response, { user: result.user }, 201, { token: result.token, message: 'Account created successfully.' });
  }
  if (request.method === 'POST' && pathname === '/api/auth/login') {
    const result = await context.auth.login(await readJson(request));
    return success(response, { user: result.user }, 200, { token: result.token, message: 'Signed in successfully.' });
  }
  if (request.method === 'GET' && pathname === '/api/auth/me') {
    const user = await authenticated(request, response, context); if (!user) return;
    return success(response, { user: context.auth.publicUser(user) });
  }

  const user = await authenticated(request, response, context);
  if (!user) return;
  if (pathname.startsWith('/api/ai/')) return await handleAiRoutes(request, response, url, { ...context, user });
  // These read responses deliberately match the locked frontend's existing data contract.
  if (request.method === 'GET' && pathname === '/api/dashboard/stats') return sendJson(response, 200, await context.dashboard.stats(user));
  if (request.method === 'GET' && pathname === '/api/dashboard/modules') return sendJson(response, 200, await context.dashboard.modules());
  if (request.method === 'GET' && pathname === '/api/dashboard/activity') return sendJson(response, 200, await context.dashboard.activity());
  if (request.method === 'GET' && pathname === '/api/dashboard/charts') return sendJson(response, 200, await context.dashboard.charts());
  if (request.method === 'GET' && pathname === '/api/dashboard/summary') return sendJson(response, 200, await context.dashboard.summary(user));

  if (request.method === 'GET' && pathname === '/api/events') {
    let events = await context.dashboard.events();
    if (url.searchParams.get('status') === 'active') events = events.filter((event) => ['in_progress', 'upcoming'].includes(event.status));
    else if (EVENT_STATUSES.has(url.searchParams.get('status'))) events = events.filter((event) => event.status === url.searchParams.get('status'));
    return sendJson(response, 200, events);
  }

  const budgetMatch = pathname.match(/^\/api\/events\/([^/]+)\/budget$/);
  if (budgetMatch && request.method === 'GET') {
    const { event, budget } = await context.dashboard.budgetForEvent(budgetMatch[1]);
    if (!event) return failure(response, 404, 'Event not found.');
    if (!budget) return failure(response, 404, 'No budget data is available for this event.');
    return sendJson(response, 200, budget);
  }

  const match = pathname.match(/^\/api\/events\/([^/]+)$/);
  if (match && request.method === 'GET') {
    const events = await context.dashboard.events();
    const event = events.find((candidate) => candidate.id === match[1]);
    return event ? sendJson(response, 200, event) : failure(response, 404, 'Event not found.');
  }
  if (request.method === 'POST' && pathname === '/api/events') {
    if (!canManageEvents(user)) return failure(response, 403, 'Your role cannot create events.');
    const input = eventInput(await readJson(request));
    const event = await context.store.update((data) => {
      const now = new Date().toISOString();
      const created = { id: crypto.randomUUID(), ...input, topMembers: input.topMembers || [], createdBy: user.id, createdAt: now, updatedAt: now };
      data.events.push(created);
      data.activities.push({ id: crypto.randomUUID(), actor: 'user', authorName: user.username, avatarInitials: user.username.slice(0, 2).toUpperCase(), avatarBg: 'bg-slate-700', text: `created '${created.name}'`, occurredAt: now, eventTag: 'Events', undoable: false });
      return created;
    });
    return success(response, context.dashboard.presentationEvent(event), 201);
  }
  if (match && ['PATCH', 'PUT'].includes(request.method)) {
    if (!canManageEvents(user)) return failure(response, 403, 'Your role cannot update events.');
    const input = eventInput(await readJson(request), true);
    const event = await context.store.update((data) => {
      const index = data.events.findIndex((candidate) => candidate.id === match[1]);
      if (index < 0) return null;
      data.events[index] = { ...data.events[index], ...input, updatedAt: new Date().toISOString() };
      return data.events[index];
    });
    return event ? success(response, context.dashboard.presentationEvent(event)) : failure(response, 404, 'Event not found.');
  }
  if (match && request.method === 'DELETE') {
    if (user.role !== 'Admin') return failure(response, 403, 'Only Admin users can delete events.');
    const removed = await context.store.update((data) => {
      const index = data.events.findIndex((candidate) => candidate.id === match[1]);
      return index < 0 ? null : data.events.splice(index, 1)[0];
    });
    return removed ? success(response, { id: removed.id }) : failure(response, 404, 'Event not found.');
  }
  return notFound(response);
}

module.exports = { handleApi };
