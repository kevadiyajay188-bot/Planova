const crypto = require('node:crypto');
const { readJson, sendJson, success, failure, notFound } = require('../utils/http');
const { authenticateUser, authorizeRoles, canManageEvents, isPresident, isTeamLead, isClubMember } = require('../middleware/auth');
const { ROLES } = require('../auth/roles');
const { handleAiRoutes } = require('./aiRoutes');
const { handleAuthRoutes } = require('./authRoutes');

const EVENT_STATUSES = new Set(['in_progress', 'upcoming', 'completed']);
const TASK_STATUSES = new Set(['todo', 'doing', 'review', 'blocked', 'done']);
const RISK_LEVELS = new Set(['low', 'medium', 'high', 'critical']);
const PHASES = new Set(['Concept', 'Approvals', 'Promotion', 'Logistics', 'Execution']);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function error(message, status = 422) {
  const instance = new Error(message);
  instance.status = status;
  return instance;
}

function eventInput(input, partial = false) {
  const result = {};
  const required = ['name', 'type', 'eventDate', 'percentComplete', 'phase', 'riskLevel', 'riskSummary', 'status'];
  if (!partial) for (const key of required) if (input[key] === undefined || input[key] === '') throw error(`${key} is required.`);
  if (input.name !== undefined) { const name = String(input.name).trim(); if (name.length < 3 || name.length > 120) throw error('Event name must be 3–120 characters.'); result.name = name; }
  if (input.type !== undefined) { const type = String(input.type).trim(); if (!type || type.length > 60) throw error('Event type is required.'); result.type = type; }
  if (input.eventDate !== undefined) { const eventDate = new Date(input.eventDate); if (Number.isNaN(eventDate.getTime())) throw error('eventDate must be a valid date.'); result.eventDate = eventDate.toISOString(); }
  if (input.percentComplete !== undefined) { const percent = Number(input.percentComplete); if (!Number.isInteger(percent) || percent < 0 || percent > 100) throw error('percentComplete must be an integer from 0 to 100.'); result.percentComplete = percent; }
  if (input.phase !== undefined) { if (!PHASES.has(input.phase)) throw error('phase is invalid.'); result.phase = input.phase; }
  if (input.riskLevel !== undefined) { if (!RISK_LEVELS.has(input.riskLevel)) throw error('riskLevel is invalid.'); result.riskLevel = input.riskLevel; }
  if (input.riskSummary !== undefined) { const riskSummary = String(input.riskSummary).trim(); if (riskSummary.length > 240) throw error('riskSummary must be 240 characters or fewer.'); result.riskSummary = riskSummary; }
  if (input.status !== undefined) { if (!EVENT_STATUSES.has(input.status)) throw error('status is invalid.'); result.status = input.status; }
  if (input.topMembers !== undefined) {
    if (!Array.isArray(input.topMembers) || input.topMembers.length > 8) throw error('topMembers must be an array of at most eight members.');
    result.topMembers = input.topMembers.map((member) => ({ name: String(member.name || '').slice(0, 80), initials: String(member.initials || '').slice(0, 4), bg: String(member.bg || 'bg-slate-700').slice(0, 60) }));
  }
  return result;
}

function taskInput(input, partial = false) {
  const task = {};
  if (!partial && !String(input.title || '').trim()) throw error('title is required.');
  if (input.title !== undefined) { const title = String(input.title).trim(); if (title.length < 3 || title.length > 160) throw error('Task title must be 3–160 characters.'); task.title = title; }
  if (input.category !== undefined) task.category = String(input.category).trim().slice(0, 60) || 'Operations';
  if (input.priority !== undefined) task.priority = String(input.priority).trim().slice(0, 20);
  if (input.status !== undefined) { if (!TASK_STATUSES.has(input.status)) throw error('Task status is invalid.'); task.status = input.status; }
  if (input.dueDate !== undefined) { const dueDate = new Date(input.dueDate); if (Number.isNaN(dueDate.getTime())) throw error('dueDate must be a valid date.'); task.dueDate = dueDate.toISOString(); }
  if (input.assigneeId !== undefined) task.assigneeId = input.assigneeId === null ? null : String(input.assigneeId).slice(0, 120);
  return task;
}

function publicEvent(event) {
  return {
    id: event.id,
    name: event.name,
    type: event.type,
    eventDate: event.eventDate,
    status: event.status,
    venue: event.venue,
    expectedAttendance: event.expectedAttendance,
    percentComplete: event.percentComplete
  };
}

function clientIp(request) {
  return String(request.headers['x-forwarded-for'] || request.socket.remoteAddress || 'unknown').split(',')[0].trim();
}

function requireRole(response, user, roles, message = 'You do not have permission to perform this action.') {
  if (authorizeRoles(user, ...roles)) return true;
  failure(response, 403, message);
  return false;
}

async function authenticated(request, response, context) {
  const authentication = await authenticateUser(request, context);
  if (!authentication) { failure(response, 401, 'Please log in to continue.'); return null; }
  return authentication;
}

async function handleApi(request, response, url, context) {
  const { pathname } = url;

  // Public event discovery and RSVP are deliberately available without club credentials.
  if (request.method === 'GET' && pathname === '/api/events/public') {
    const events = (await context.dashboard.events()).filter((event) => ['in_progress', 'upcoming'].includes(event.status)).map(publicEvent);
    return sendJson(response, 200, events);
  }
  const rsvpMatch = pathname.match(/^\/api\/events\/([^/]+)\/rsvp$/);
  if (request.method === 'POST' && rsvpMatch) {
    const input = await readJson(request);
    const name = String(input.name || '').trim();
    const email = String(input.email || '').trim().toLowerCase();
    if (name.length < 2 || name.length > 100 || !EMAIL_PATTERN.test(email)) return failure(response, 422, 'Please provide a valid name and email address.');
    let rsvp;
    await context.store.update((data) => {
      const event = data.events.find((candidate) => candidate.id === rsvpMatch[1] && ['in_progress', 'upcoming'].includes(candidate.status));
      if (!event) throw error('Event not found.', 404);
      if (data.rsvps.some((candidate) => candidate.eventId === event.id && candidate.email === email)) throw error('You have already RSVP’d to this event.', 409);
      rsvp = { id: crypto.randomUUID(), eventId: event.id, name, email, createdAt: new Date().toISOString() };
      data.rsvps.push(rsvp);
    });
    return success(response, { id: rsvp.id, eventId: rsvp.eventId }, 201, { message: 'Your RSVP has been recorded.' });
  }

  // Public authentication endpoints (signup, register, login, bootstrap)
  if (pathname.startsWith('/api/auth/') && ['/api/auth/signup', '/api/auth/register', '/api/auth/login', '/api/auth/bootstrap'].includes(pathname)) {
    return await handleAuthRoutes(request, response, url, context);
  }

  const authentication = await authenticated(request, response, context);
  if (!authentication) return;
  const { user, payload } = authentication;
  // Protected authentication and user endpoints
  if (pathname.startsWith('/api/auth/') || pathname === '/api/users' || pathname.startsWith('/api/users/')) {
    const handled = await handleAuthRoutes(request, response, url, { ...context, user, payload });
    if (handled !== false) return handled;
  }

  if (pathname.startsWith('/api/ai/')) {
    return await handleAiRoutes(request, response, url, { ...context, user, payload });
  }

  if (!isClubMember(user)) return failure(response, 403, 'Your role does not have access to private club operations.');

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
    if (!requireRole(response, user, [ROLES.PRESIDENT, ROLES.TEAM_LEAD])) return;
    const { event, budget } = await context.dashboard.budgetForEvent(budgetMatch[1]);
    if (!event) return failure(response, 404, 'Event not found.');
    if (!budget) return failure(response, 404, 'No budget data is available for this event.');
    return sendJson(response, 200, budget);
  }
  const eventMatch = pathname.match(/^\/api\/events\/([^/]+)$/);
  if (eventMatch && request.method === 'GET') {
    const event = (await context.dashboard.events()).find((candidate) => candidate.id === eventMatch[1]);
    return event ? sendJson(response, 200, event) : failure(response, 404, 'Event not found.');
  }
  if (request.method === 'POST' && pathname === '/api/events') {
    if (!canManageEvents(user)) return failure(response, 403, 'Your role cannot create events.');
    const input = eventInput(await readJson(request));
    const event = await context.store.update((data) => {
      const now = new Date().toISOString();
      const created = { id: crypto.randomUUID(), ...input, topMembers: input.topMembers || [], createdBy: user.id, createdAt: now, updatedAt: now };
      data.events.push(created);
      data.activities.push({ id: crypto.randomUUID(), actor: 'user', authorName: user.name || user.username, avatarInitials: user.username.slice(0, 2).toUpperCase(), avatarBg: 'bg-slate-700', text: `created '${created.name}'`, occurredAt: now, eventTag: 'Events', undoable: false });
      return created;
    });
    return success(response, context.dashboard.presentationEvent(event), 201);
  }
  if (eventMatch && ['PATCH', 'PUT'].includes(request.method)) {
    if (!canManageEvents(user)) return failure(response, 403, 'Your role cannot update events.');
    const input = eventInput(await readJson(request), true);
    const event = await context.store.update((data) => {
      const index = data.events.findIndex((candidate) => candidate.id === eventMatch[1]);
      if (index < 0) return null;
      data.events[index] = { ...data.events[index], ...input, updatedAt: new Date().toISOString() };
      return data.events[index];
    });
    return event ? success(response, context.dashboard.presentationEvent(event)) : failure(response, 404, 'Event not found.');
  }
  if (eventMatch && request.method === 'DELETE') {
    if (!isPresident(user)) return failure(response, 403, 'Only President users can delete events.');
    const removed = await context.store.update((data) => {
      const index = data.events.findIndex((candidate) => candidate.id === eventMatch[1]);
      return index < 0 ? null : data.events.splice(index, 1)[0];
    });
    return removed ? success(response, { id: removed.id }) : failure(response, 404, 'Event not found.');
  }

  if (request.method === 'GET' && pathname === '/api/tasks') {
    const data = await context.store.read();
    const tasks = authorizeRoles(user, ROLES.VOLUNTEER) ? data.tasks.filter((task) => task.assigneeId === user.id) : data.tasks;
    return success(response, { tasks });
  }
  if (request.method === 'POST' && pathname === '/api/tasks') {
    if (!canManageEvents(user)) return failure(response, 403, 'Your role cannot create tasks.');
    const input = taskInput(await readJson(request));
    const created = await context.store.update((data) => {
      const task = { id: crypto.randomUUID(), ...input, status: input.status || 'todo', assigneeId: input.assigneeId || null, createdBy: user.id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      data.tasks.push(task);
      return task;
    });
    return success(response, { task: created }, 201);
  }
  const taskMatch = pathname.match(/^\/api\/tasks\/([^/]+)$/);
  if (taskMatch && request.method === 'PATCH') {
    const input = taskInput(await readJson(request), true);
    const updated = await context.store.update((data) => {
      const index = data.tasks.findIndex((task) => task.id === taskMatch[1]);
      if (index < 0) return null;
      const current = data.tasks[index];
      if (authorizeRoles(user, ROLES.VOLUNTEER)) {
        if (current.assigneeId !== user.id) throw error('You can only update tasks assigned to you.', 403);
        if (Object.keys(input).some((key) => key !== 'status')) throw error('Volunteers can only update the status of assigned tasks.', 403);
      } else if (!canManageEvents(user)) throw error('You do not have permission to update tasks.', 403);
      data.tasks[index] = { ...current, ...input, updatedAt: new Date().toISOString() };
      return data.tasks[index];
    });
    return updated ? success(response, { task: updated }) : failure(response, 404, 'Task not found.');
  }

  if (request.method === 'GET' && pathname === '/api/volunteers') {
    if (!requireRole(response, user, [ROLES.PRESIDENT, ROLES.TEAM_LEAD])) return;
    return success(response, { volunteers: (await context.store.read()).volunteers });
  }
  if (request.method === 'GET' && pathname === '/api/meetings') return success(response, { meetings: (await context.store.read()).meetings });
  if (request.method === 'POST' && pathname === '/api/meetings') {
    if (!canManageEvents(user)) return failure(response, 403, 'Your role cannot create meetings.');
    const input = await readJson(request);
    const title = String(input.title || '').trim();
    if (title.length < 3 || title.length > 160) return failure(response, 422, 'Meeting title must be 3–160 characters.');
    const meeting = await context.store.update((data) => {
      const created = { id: crypto.randomUUID(), title, occurredAt: input.occurredAt ? new Date(input.occurredAt).toISOString() : new Date().toISOString(), transcript: String(input.transcript || '').slice(0, 50000), createdBy: user.id };
      if (Number.isNaN(new Date(created.occurredAt).getTime())) throw error('occurredAt must be a valid date.');
      data.meetings.push(created);
      return created;
    });
    return success(response, { meeting }, 201);
  }
  if (request.method === 'GET' && pathname === '/api/announcements') return success(response, { announcements: (await context.store.read()).announcements });
  if (request.method === 'POST' && pathname === '/api/announcements') {
    if (!canManageEvents(user)) return failure(response, 403, 'Your role cannot publish announcements.');
    const input = await readJson(request);
    const title = String(input.title || '').trim();
    const content = String(input.content || '').trim();
    if (!title || !content || title.length > 160 || content.length > 5000) return failure(response, 422, 'A valid announcement title and content are required.');
    const announcement = await context.store.update((data) => {
      const created = { id: crypto.randomUUID(), title, content, audience: String(input.audience || 'Club members').slice(0, 100), sentAt: new Date().toISOString(), createdBy: user.id };
      data.announcements.unshift(created);
      return created;
    });
    return success(response, { announcement }, 201);
  }
  if (request.method === 'GET' && pathname === '/api/documents') return success(response, { documents: (await context.store.read()).documents.map(({ content, ...document }) => document) });
  if (request.method === 'GET' && pathname === '/api/risks') return success(response, { risks: (await context.store.read()).risks });
  if (pathname === '/api/club/settings') {
    if (!requireRole(response, user, [ROLES.PRESIDENT])) return;
    if (request.method === 'GET') return success(response, { settings: (await context.store.read()).settings });
    if (['PUT', 'PATCH'].includes(request.method)) {
      const input = await readJson(request);
      const settings = await context.store.update((data) => {
        data.settings = { ...data.settings, ...input, updatedAt: new Date().toISOString(), updatedBy: user.id };
        return data.settings;
      });
      return success(response, { settings });
    }
  }
  return notFound(response);
}

module.exports = { handleApi };
