const crypto = require('node:crypto');
const { readJson, sendJson, success, failure, notFound } = require('../utils/http');
const { authenticateUser, authorizeRoles, canManageEvents, isPresident, isTeamLead, isClubMember } = require('../middleware/auth');
const { ROLES } = require('../auth/roles');
const { belongsToClub, scopeCollection } = require('../middleware/clubScope');
const { requirePolicy, requireClubResource, canManageClub } = require('../middleware/authorization');
const { handleAiRoutes } = require('./aiRoutes');
const { handleAuthRoutes } = require('./authRoutes');

const EVENT_STATUSES = new Set(['in_progress', 'upcoming', 'completed']);
const TASK_STATUSES = new Set(['todo', 'doing', 'review', 'blocked', 'done']);
const RISK_LEVELS = new Set(['low', 'medium', 'high', 'critical']);
const PHASES = new Set(['Concept', 'Approvals', 'Promotion', 'Logistics', 'Execution']);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isPublicEvent(event) {
  return event.visibility !== 'private' && ['in_progress', 'upcoming'].includes(event.status);
}

function isPublicAnnouncement(announcement) {
  return announcement.visibility !== 'private' && announcement.isInternal !== true && announcement.status !== 'DRAFT';
}

function announcementInput(input, partial = false) {
  const result = {};
  const title = input.title !== undefined ? input.title : input.subject;
  const content = input.content !== undefined ? input.content : (input.body !== undefined ? input.body : input.description);
  if (!partial && (title === undefined || content === undefined)) throw error('title and content are required.');
  if (title !== undefined) {
    const value = String(title).trim();
    if (value.length < 3 || value.length > 200) throw error('Announcement title must be 3–200 characters.');
    result.title = value;
  }
  if (content !== undefined) {
    const value = String(content).trim();
    if (!value || value.length > 10000) throw error('Announcement content must be 1–10000 characters.');
    result.content = value;
  }
  if (input.eventId !== undefined) result.eventId = input.eventId === null ? null : String(input.eventId).slice(0, 120);
  if (input.audience !== undefined) result.audience = String(input.audience).trim().slice(0, 160);
  if (input.purpose !== undefined) result.purpose = String(input.purpose).trim().slice(0, 120);
  if (input.category !== undefined) result.category = String(input.category).trim().slice(0, 80);
  if (input.channels !== undefined) result.channels = Array.isArray(input.channels) ? input.channels.map((channel) => String(channel).slice(0, 40)).slice(0, 8) : [];
  if (input.variants !== undefined) result.variants = input.variants && typeof input.variants === 'object' ? input.variants : {};
  if (input.visibility !== undefined) { if (!['public', 'private'].includes(input.visibility)) throw error('visibility is invalid.'); result.visibility = input.visibility; }
  if (input.status !== undefined) { if (!['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(input.status)) throw error('status is invalid.'); result.status = input.status; }
  if (input.featured !== undefined) result.featured = Boolean(input.featured);
  if (input.scale !== undefined) result.scale = String(input.scale).slice(0, 40);
  if (input.venue !== undefined) result.venue = String(input.venue).slice(0, 200);
  if (input.eventDate !== undefined) result.eventDate = new Date(input.eventDate).toISOString();
  return result;
}

function publicAnnouncement(announcement) {
  return {
    id: announcement.id,
    eventId: announcement.eventId || null,
    title: announcement.title,
    subject: announcement.title,
    description: announcement.description || announcement.content || '',
    content: announcement.content || announcement.body || '',
    body: announcement.body || announcement.content || '',
    clubName: announcement.clubName || 'Planova Club',
    collegeName: announcement.collegeName || 'Campus Central',
    category: announcement.category || announcement.purpose || 'General',
    purpose: announcement.purpose || '',
    audience: announcement.audience || 'Club members',
    channels: announcement.channels || [],
    variants: announcement.variants || {},
    author: announcement.author || announcement.authorName || announcement.sentBy || '',
    sentBy: announcement.sentBy || announcement.author || announcement.authorName || '',
    status: announcement.status || 'PUBLISHED',
    visibility: announcement.visibility || 'public',
    featured: Boolean(announcement.featured),
    venue: announcement.venue || '',
    eventDate: announcement.eventDate || announcement.sentAt || announcement.createdAt || new Date().toISOString(),
    postedAt: announcement.postedAt || announcement.sentAt || announcement.createdAt || new Date().toISOString(),
    createdAt: announcement.createdAt || announcement.sentAt,
    updatedAt: announcement.updatedAt || announcement.sentAt,
    coverPhotoUrl: announcement.coverPhotoUrl || '',
    scale: announcement.scale || 'college',
    registrationUrl: announcement.registrationUrl || undefined
  };
}

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
  if (input.description !== undefined) { const description = String(input.description).trim(); if (description.length > 5000) throw error('description must be 5000 characters or fewer.'); result.description = description; }
  if (input.eventDate !== undefined) { const eventDate = new Date(input.eventDate); if (Number.isNaN(eventDate.getTime())) throw error('eventDate must be a valid date.'); result.eventDate = eventDate.toISOString(); }
  if (input.time !== undefined) { const time = String(input.time).trim(); if (time.length > 40) throw error('time must be 40 characters or fewer.'); result.time = time; }
  if (input.venue !== undefined) { const venue = String(input.venue).trim(); if (venue.length > 200) throw error('venue must be 200 characters or fewer.'); result.venue = venue; }
  if (input.organizer !== undefined) { const organizer = String(input.organizer).trim(); if (organizer.length > 160) throw error('organizer must be 160 characters or fewer.'); result.organizer = organizer; }
  if (input.visibility !== undefined) { if (!['public', 'private'].includes(input.visibility)) throw error('visibility is invalid.'); result.visibility = input.visibility; }
  if (input.capacity !== undefined) { const capacity = Number(input.capacity); if (!Number.isInteger(capacity) || capacity < 0) throw error('capacity must be a non-negative integer.'); result.capacity = capacity; }
  if (input.tags !== undefined) { if (!Array.isArray(input.tags) || input.tags.length > 20) throw error('tags must be an array of at most twenty values.'); result.tags = input.tags.map((tag) => String(tag).trim().slice(0, 60)).filter(Boolean); }
  if (input.importantInfo !== undefined) { result.importantInfo = String(input.importantInfo).trim().slice(0, 2000); }
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
  const cat = input.vertical || input.category;
  if (cat !== undefined) task.category = String(cat).trim().slice(0, 60) || 'Operations';
  if (input.vertical !== undefined) task.vertical = String(input.vertical).trim().slice(0, 60);
  if (input.priority !== undefined) task.priority = String(input.priority).trim().slice(0, 20);
  if (input.status !== undefined) { if (!TASK_STATUSES.has(input.status)) throw error('Task status is invalid.'); task.status = input.status; }
  const dueVal = input.dueDate || input.dueAt;
  if (dueVal !== undefined) { const dueDate = new Date(dueVal); if (Number.isNaN(dueDate.getTime())) throw error('dueDate must be a valid date.'); task.dueDate = dueDate.toISOString(); }
  if (input.assigneeId !== undefined) task.assigneeId = input.assigneeId === null ? null : String(input.assigneeId).slice(0, 120);
  if (input.source !== undefined) task.source = String(input.source).slice(0, 60);
  if (input.estimateHours !== undefined) task.estimateHours = Number(input.estimateHours) || null;
  if (input.evidenceQuote !== undefined) task.evidenceQuote = String(input.evidenceQuote).slice(0, 500);
  return task;
}


function publicEvent(event) {
  return {
    id: event.id,
    name: event.name,
    description: event.description || '',
    type: event.type,
    date: event.date || event.eventDate,
    time: event.time || '',
    eventDate: event.eventDate,
    status: event.status,
    venue: event.venue,
    organizer: event.organizer || '',
    capacity: event.capacity || event.expectedAttendance || 0,
    rsvpCount: event.rsvpCount || 0,
    tags: Array.isArray(event.tags) ? event.tags : [],
    importantInfo: event.importantInfo || '',
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
    const events = (await context.dashboard.events()).filter(isPublicEvent).map(publicEvent);
    return sendJson(response, 200, events);
  }
  const rsvpMatch = pathname.match(/^\/api\/events\/([^/]+)\/rsvp$/);
  if (rsvpMatch && ['POST', 'DELETE'].includes(request.method)) {
    const authentication = await authenticated(request, response, context);
    if (!authentication) return;
    const { user } = authentication;
    if (!requirePolicy(response, user, [ROLES.WEB_USER], 'Only Web Users can manage event RSVPs.')) return;
    const input = request.method === 'POST' ? await readJson(request) : {};
    if (request.method === 'POST') {
      const name = String(input.name || user.name || user.username || '').trim();
      const email = String(input.email || user.email || '').trim().toLowerCase();
      if (name.length < 2 || name.length > 100 || !EMAIL_PATTERN.test(email)) return failure(response, 422, 'Please provide a valid name and email address.');
      input.name = name;
      input.email = email;
    }

    let result;
    await context.store.update((data) => {
      const event = (data.events || []).find((candidate) => candidate.id === rsvpMatch[1] && candidate.clubId === user.clubId && isPublicEvent(candidate));
      if (!event) throw error('Event not found or unavailable for RSVP.', 404);

      const existing = (data.rsvps || []).find((candidate) => candidate.userId === user.id && candidate.eventId === event.id && candidate.clubId === user.clubId);
      if (request.method === 'DELETE') {
        if (!existing || existing.status !== 'CONFIRMED') throw error('RSVP not found.', 404);
        existing.status = 'CANCELLED';
        existing.updatedAt = new Date().toISOString();
        result = existing;
        return;
      }

      if (existing && existing.status === 'CONFIRMED') throw error('You have already RSVP’d to this event.', 409);
      const now = new Date().toISOString();
      if (existing) {
        existing.status = 'CONFIRMED';
        existing.updatedAt = now;
        result = existing;
        return;
      }
      result = {
        id: crypto.randomUUID(),
        userId: user.id,
        eventId: event.id,
        clubId: user.clubId,
        name: input.name || user.name || user.username,
        email: input.email || user.email,
        status: 'CONFIRMED',
        createdAt: now,
        updatedAt: now
      };
      data.rsvps.push(result);
    });
    return success(response, { id: result.id, eventId: result.eventId, status: result.status }, request.method === 'POST' ? 201 : 200, { message: request.method === 'POST' ? 'Your RSVP has been recorded.' : 'Your RSVP has been cancelled.' });
  }
  const publicEventMatch = pathname.match(/^\/api\/events\/([^/]+)$/);
  if (publicEventMatch && request.method === 'GET') {
    const data = await context.store.read();
    const event = (data.events || []).find((candidate) => candidate.id === publicEventMatch[1] && isPublicEvent(candidate));
    const publicAuthentication = await authenticateUser(request, context);
    if (event && (!publicAuthentication || belongsToClub(event, publicAuthentication.user))) {
      return sendJson(response, 200, publicEvent(event));
    }
  }

  // Student Announcement Discovery Feed endpoints (accessible to students)
  if (request.method === 'GET' && pathname === '/api/announcements/featured') {
    const data = await context.store.read();
    const featuredAuthentication = await authenticateUser(request, context);
    const announcements = (Array.isArray(data.announcements) ? data.announcements : [])
      .filter(isPublicAnnouncement)
      .filter((announcement) => !featuredAuthentication || belongsToClub(announcement, featuredAuthentication.user));
    const featured = announcements
      .filter((a) => a.featured || ['national', 'state'].includes(a.scale))
      .map((a) => ({
        id: a.id,
        title: a.title,
        clubName: a.clubName || 'Planova Club',
        collegeName: a.collegeName || 'Campus Central',
        category: a.category || 'Hackathon',
        coverPhotoUrl: a.coverPhotoUrl || '',
        scale: a.scale || 'college',
        venue: a.venue || 'Campus Auditorium',
        eventDate: a.eventDate || a.sentAt || new Date().toISOString(),
        registrationUrl: a.registrationUrl || undefined
      }));
    return sendJson(response, 200, featured);
  }

  if (request.method === 'GET' && pathname === '/api/announcements/feed') {
    const data = await context.store.read();
    const feedAuthentication = await authenticateUser(request, context);
    const announcements = (Array.isArray(data.announcements) ? data.announcements : [])
      .filter(isPublicAnnouncement)
      .filter((announcement) => !feedAuthentication || belongsToClub(announcement, feedAuthentication.user));
    const category = url.searchParams.get('category');
    const scope = url.searchParams.get('scope');
    const sort = url.searchParams.get('sort');
    const search = (url.searchParams.get('search') || '').trim().toLowerCase();

    let list = announcements.map((a) => ({
      id: a.id,
      eventId: a.eventId || a.id,
      title: a.title,
      clubName: a.clubName || 'Planova Club',
      collegeName: a.collegeName || 'Campus Central',
      category: a.category || 'Hackathon',
      coverPhotoUrl: a.coverPhotoUrl || '',
      preview: a.preview || a.content || '',
      venue: a.venue || 'Campus',
      eventDate: a.eventDate || a.sentAt || new Date().toISOString(),
      postedAt: a.postedAt || a.sentAt || new Date().toISOString(),
      saved: Boolean(a.saved),
      scale: a.scale || 'college',
      isMyClub: Boolean(a.isMyClub)
    }));

    if (category && category.toLowerCase() !== 'all') {
      list = list.filter((a) => (a.category || '').toLowerCase() === category.toLowerCase());
    }
    if (scope === 'my-clubs') {
      list = list.filter((a) => a.isMyClub);
    }
    if (search) {
      list = list.filter((a) =>
        (a.title || '').toLowerCase().includes(search) ||
        (a.clubName || '').toLowerCase().includes(search) ||
        (a.collegeName || '').toLowerCase().includes(search) ||
        (a.venue || '').toLowerCase().includes(search) ||
        (a.preview || '').toLowerCase().includes(search)
      );
    }

    if (sort === 'this-week' || sort === 'this_week') {
      const now = Date.now();
      const in7Days = now + 7 * 24 * 60 * 60 * 1000;
      list = list.filter((a) => {
        const t = new Date(a.eventDate).getTime();
        return t >= now - 24 * 60 * 60 * 1000 && t <= in7Days;
      });
    } else if (sort === 'happening-soon' || sort === 'happening_soon') {
      list.sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
    } else {
      // newest
      list.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
    }

    return sendJson(response, 200, list);
  }

  const saveAnnMatch = pathname.match(/^\/api\/announcements\/([^/]+)\/save$/);
  if (request.method === 'POST' && saveAnnMatch) {
    const auth = await authenticateUser(request, context);
    const userId = auth ? auth.user.id : (request.headers['x-forwarded-for'] || request.socket.remoteAddress || 'guest');
    const id = saveAnnMatch[1];
    let updatedSaved = false;
    await context.store.update((data) => {
      const ann = (data.announcements || []).find((candidate) => candidate.id === id);
      if (!ann) throw error('Announcement not found.', 404);
      if (!Array.isArray(data.bookmarks)) data.bookmarks = [];
      const bookmarkIndex = data.bookmarks.findIndex((b) => b.userId === userId && b.announcementId === id);
      if (bookmarkIndex >= 0) {
        data.bookmarks.splice(bookmarkIndex, 1);
        updatedSaved = false;
      } else {
        data.bookmarks.push({ id: `bm-${crypto.randomUUID()}`, userId, announcementId: id, createdAt: new Date().toISOString() });
        updatedSaved = true;
      }
      ann.saved = updatedSaved;
    });
    return success(response, { id, saved: updatedSaved }, 200, { message: updatedSaved ? 'Announcement saved.' : 'Announcement removed from saved.' });
  }

  const singleAnnMatch = pathname.match(/^\/api\/announcements\/([^/]+)$/);
  if (request.method === 'GET' && singleAnnMatch && !['featured', 'feed'].includes(singleAnnMatch[1])) {
    const data = await context.store.read();
    const ann = (data.announcements || []).find((candidate) => candidate.id === singleAnnMatch[1]);
    if (!ann) return failure(response, 404, 'Announcement not found.');
    const detailAuthentication = await authenticateUser(request, context);
    if (detailAuthentication && !belongsToClub(ann, detailAuthentication.user)) return failure(response, 404, 'Announcement not found.');
    if (!isPublicAnnouncement(ann)) {
      if (!detailAuthentication) return failure(response, 401, 'Please log in to continue.');
      if (!isClubMember(detailAuthentication.user)) return failure(response, 403, 'You do not have access to this announcement.');
    }
    return sendJson(response, 200, publicAnnouncement(ann));
  }

  if (request.method === 'GET' && pathname === '/api/announcements') {
    const data = await context.store.read();
    const announcementAuthentication = await authenticateUser(request, context);
    const announcements = (data.announcements || [])
      .filter((announcement) => !announcementAuthentication || belongsToClub(announcement, announcementAuthentication.user))
      .filter((announcement) => announcementAuthentication && isClubMember(announcementAuthentication.user) ? true : isPublicAnnouncement(announcement))
      .map(publicAnnouncement);
    return sendJson(response, 200, announcements);
  }

  // Public authentication endpoints (signup, register, login, bootstrap)
  if (pathname.startsWith('/api/auth/') && ['/api/auth/signup', '/api/auth/register', '/api/auth/login', '/api/auth/bootstrap'].includes(pathname)) {
    return await handleAuthRoutes(request, response, url, context);
  }

  // AI Copilot & AI services (Role-aware: Admin, Volunteer, or Student)
  if (pathname.startsWith('/api/ai/')) {
    const auth = await authenticateUser(request, context);
    const user = auth ? auth.user : { id: 'guest-student', role: 'student', name: 'Student' };
    const payload = auth ? auth.payload : null;
    return await handleAiRoutes(request, response, url, { ...context, user, payload });
  }

  const authentication = await authenticated(request, response, context);
  if (!authentication) return;
  const { user, payload } = authentication;
  // Protected authentication and user endpoints
  if (pathname.startsWith('/api/auth/') || pathname === '/api/profile' || pathname === '/api/users' || pathname.startsWith('/api/users/')) {
    const handled = await handleAuthRoutes(request, response, url, { ...context, user, payload });
    if (handled !== false) return handled;
  }

  if (request.method === 'GET' && pathname === '/api/my-events') {
    if (!requirePolicy(response, user, [ROLES.WEB_USER], 'Only Web Users can view their RSVP events.')) return;
    const data = await context.store.read();
    const confirmedEventIds = new Set((data.rsvps || [])
      .filter((rsvp) => rsvp.userId === user.id && rsvp.clubId === user.clubId && rsvp.status === 'CONFIRMED')
      .map((rsvp) => rsvp.eventId));
    const events = (data.events || [])
      .filter((event) => event.clubId === user.clubId && event.visibility !== 'private' && confirmedEventIds.has(event.id))
      .map(publicEvent);
    return sendJson(response, 200, events);
  }

  if (request.method === 'POST' && pathname === '/api/announcements') {
    if (!canManageClub(user)) return failure(response, 403, 'Your role cannot publish announcements.');
    const input = announcementInput(await readJson(request));
    const now = new Date().toISOString();
    const announcement = await context.store.update((data) => {
      const created = {
        id: crypto.randomUUID(),
        ...input,
        clubId: user.clubId,
        author: user.name || user.username,
        authorName: user.name || user.username,
        sentBy: user.name || user.username,
        status: input.status || 'PUBLISHED',
        visibility: input.visibility || 'public',
        createdAt: now,
        updatedAt: now,
        sentAt: now
      };
      data.announcements.unshift(created);
      return created;
    });
    return success(response, { announcement: publicAnnouncement(announcement) }, 201);
  }

  const announcementMatch = pathname.match(/^\/api\/announcements\/([^/]+)$/);
  if (announcementMatch && ['PATCH', 'DELETE'].includes(request.method)) {
    if (!canManageClub(user)) return failure(response, 403, 'Your role cannot manage announcements.');
    const announcement = await context.store.update(async (data) => {
      const index = (data.announcements || []).findIndex((candidate) => candidate.id === announcementMatch[1] && belongsToClub(candidate, user));
      if (index < 0) return null;
      if (request.method === 'DELETE') return data.announcements.splice(index, 1)[0];
      const input = announcementInput(await readJson(request), true);
      data.announcements[index] = { ...data.announcements[index], ...input, updatedAt: new Date().toISOString() };
      return data.announcements[index];
    });
    if (!announcement) return failure(response, 404, 'Announcement not found.');
    if (request.method === 'DELETE') return success(response, { id: announcement.id });
    return success(response, { announcement: publicAnnouncement(announcement) });
  }

  if (!requirePolicy(response, user, 'CLUB_MEMBER', 'Your role does not have access to private club operations.')) return;

  if (request.method === 'GET' && pathname === '/api/dashboard/stats') return sendJson(response, 200, await context.dashboard.stats(user));
  if (request.method === 'GET' && pathname === '/api/dashboard/modules') return sendJson(response, 200, await context.dashboard.modules(user));
  if (request.method === 'GET' && pathname === '/api/dashboard/activity') return sendJson(response, 200, await context.dashboard.activity(user));
  if (request.method === 'GET' && pathname === '/api/dashboard/charts') return sendJson(response, 200, await context.dashboard.charts(user));
  if (request.method === 'GET' && pathname === '/api/dashboard/summary') return sendJson(response, 200, await context.dashboard.summary(user));

  if (request.method === 'GET' && pathname === '/api/events') {
    let events = await context.dashboard.events(user);
    if (url.searchParams.get('status') === 'active') events = events.filter((event) => ['in_progress', 'upcoming'].includes(event.status));
    else if (EVENT_STATUSES.has(url.searchParams.get('status'))) events = events.filter((event) => event.status === url.searchParams.get('status'));
    return sendJson(response, 200, events);
  }
  const budgetMatch = pathname.match(/^\/api\/events\/([^/]+)\/budget$/);
  if (budgetMatch && request.method === 'GET') {
    if (!requirePolicy(response, user, 'MANAGEMENT')) return;
    const { event, budget } = await context.dashboard.budgetForEvent(budgetMatch[1], user);
    if (!event) return failure(response, 404, 'Event not found.');
    if (!budget) return failure(response, 404, 'No budget data is available for this event.');
    return sendJson(response, 200, budget);
  }
  const eventMatch = pathname.match(/^\/api\/events\/([^/]+)$/);
  if (eventMatch && request.method === 'GET') {
    const event = (await context.dashboard.events(user)).find((candidate) => candidate.id === eventMatch[1]);
    return event ? sendJson(response, 200, event) : failure(response, 404, 'Event not found.');
  }
  if (request.method === 'POST' && pathname === '/api/events') {
    if (!canManageClub(user)) return failure(response, 403, 'Your role cannot create events.');
    const input = eventInput(await readJson(request));
    const event = await context.store.update((data) => {
      const now = new Date().toISOString();
      const created = { id: crypto.randomUUID(), ...input, clubId: user.clubId, topMembers: input.topMembers || [], createdBy: user.id, createdAt: now, updatedAt: now };
      data.events.push(created);
      data.activities.push({ id: crypto.randomUUID(), actor: 'user', authorName: user.name || user.username, avatarInitials: user.username.slice(0, 2).toUpperCase(), avatarBg: 'bg-slate-700', text: `created '${created.name}'`, occurredAt: now, eventTag: 'Events', undoable: false });
      return created;
    });
    return success(response, context.dashboard.presentationEvent(event), 201);
  }
  if (eventMatch && ['PATCH', 'PUT'].includes(request.method)) {
    if (!canManageClub(user)) return failure(response, 403, 'Your role cannot update events.');
    const input = eventInput(await readJson(request), true);
    const event = await context.store.update((data) => {
      const index = data.events.findIndex((candidate) => candidate.id === eventMatch[1] && belongsToClub(candidate, user));
      if (index < 0) return null;
      data.events[index] = { ...data.events[index], ...input, updatedAt: new Date().toISOString() };
      return data.events[index];
    });
    return event ? success(response, context.dashboard.presentationEvent(event)) : failure(response, 404, 'Event not found.');
  }
  if (eventMatch && request.method === 'DELETE') {
    if (!requirePolicy(response, user, 'PRESIDENT', 'Only President users can delete events.')) return;
    const removed = await context.store.update((data) => {
      const index = data.events.findIndex((candidate) => candidate.id === eventMatch[1] && belongsToClub(candidate, user));
      return index < 0 ? null : data.events.splice(index, 1)[0];
    });
    return removed ? success(response, { id: removed.id }) : failure(response, 404, 'Event not found.');
  }

  if (request.method === 'GET' && pathname === '/api/tasks') {
    const data = await context.store.read();
    const clubTasks = scopeCollection(data.tasks, user);
    const tasks = authorizeRoles(user, ROLES.VOLUNTEER) ? clubTasks.filter((task) => task.assigneeId === user.id) : clubTasks;
    return success(response, { tasks });
  }
  if (request.method === 'POST' && pathname === '/api/tasks') {
    if (!canManageClub(user)) return failure(response, 403, 'Your role cannot create tasks.');
    const input = taskInput(await readJson(request));
    const created = await context.store.update((data) => {
      const task = { id: crypto.randomUUID(), ...input, clubId: user.clubId, status: input.status || 'todo', assigneeId: input.assigneeId || null, createdBy: user.id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      data.tasks.push(task);
      return task;
    });
    return success(response, { task: created }, 201);
  }
  const taskMatch = pathname.match(/^\/api\/tasks\/([^/]+)$/);
  if (taskMatch && request.method === 'PATCH') {
    const input = taskInput(await readJson(request), true);
    const updated = await context.store.update((data) => {
      const index = data.tasks.findIndex((task) => task.id === taskMatch[1] && belongsToClub(task, user));
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
    if (!requirePolicy(response, user, 'MANAGEMENT')) return;
    return success(response, { volunteers: scopeCollection((await context.store.read()).volunteers, user) });
  }
  if (request.method === 'GET' && pathname === '/api/meetings') return success(response, { meetings: scopeCollection((await context.store.read()).meetings, user) });
  if (request.method === 'POST' && pathname === '/api/meetings') {
    if (!canManageClub(user)) return failure(response, 403, 'Your role cannot create meetings.');
    const input = await readJson(request);
    const title = String(input.title || '').trim();
    if (title.length < 3 || title.length > 160) return failure(response, 422, 'Meeting title must be 3–160 characters.');
    const meeting = await context.store.update((data) => {
      const created = { id: crypto.randomUUID(), clubId: user.clubId, title, occurredAt: input.occurredAt ? new Date(input.occurredAt).toISOString() : new Date().toISOString(), transcript: String(input.transcript || '').slice(0, 50000), createdBy: user.id };
      if (Number.isNaN(new Date(created.occurredAt).getTime())) throw error('occurredAt must be a valid date.');
      data.meetings.push(created);
      return created;
    });
    return success(response, { meeting }, 201);
  }
  if (request.method === 'POST' && pathname === '/api/tasks/bulk') {
    if (!canManageClub(user)) return failure(response, 403, 'Your role cannot create tasks.');
    const input = await readJson(request);
    const rawTasks = Array.isArray(input.tasks) ? input.tasks : (Array.isArray(input) ? input : []);
    if (!rawTasks.length) return failure(response, 422, 'Tasks array cannot be empty.');
    const createdTasks = [];
    await context.store.update((data) => {
      if (!data.tasks) data.tasks = [];
      for (const item of rawTasks) {
        const parsed = taskInput(item);
        const task = {
          id: crypto.randomUUID(),
          clubId: user.clubId,
          ...parsed,
          status: parsed.status || 'todo',
          source: parsed.source || 'ai_plan',
          assigneeId: parsed.assigneeId || null,
          createdBy: user.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        data.tasks.unshift(task);
        createdTasks.push(task);
      }
    });
    return success(response, { createdCount: createdTasks.length, tasks: createdTasks }, 201);
  }

  const meetingProcessMatch = pathname.match(/^\/api\/meetings\/([^/]+)\/process$/);
  if (request.method === 'POST' && meetingProcessMatch) {
    const meetingId = meetingProcessMatch[1];
    const input = await readJson(request);
    const meetingData = await context.store.read();
    const meeting = (meetingData.meetings || []).find((candidate) => candidate.id === meetingId);
    if (!requireClubResource(response, user, meeting)) return;
    const result = await context.aiOrchestrator.meetingService.processMeeting({
      ...input,
      meetingId,
      aiModel: context.aiOrchestrator.aiModel
    });
    return sendJson(response, 200, result);
  }

  if (request.method === 'GET' && pathname === '/api/documents') {
    if (!requirePolicy(response, user, 'MANAGEMENT')) return;
    return success(response, { documents: scopeCollection((await context.store.read()).documents, user).map(({ content, ...document }) => document) });
  }
  if (request.method === 'POST' && pathname === '/api/documents') {
    if (!canManageClub(user)) return failure(response, 403, 'Your role cannot upload documents.');
    const input = await readJson(request);
    const docType = String(input.docType || input.title || '').trim();
    if (!docType || docType.length > 200) return failure(response, 422, 'docType/title is required (max 200 chars).');
    const doc = await context.store.update((data) => {
      const created = {
        id: crypto.randomUUID(), clubId: user.clubId, docType, title: docType,
        fileName: String(input.fileName || '').slice(0, 260),
        fileUrl: String(input.fileUrl || '').slice(0, 2000),
        mimeType: String(input.mimeType || 'application/octet-stream').slice(0, 80),
        fileSize: String(input.fileSize || '').slice(0, 40),
        vertical: String(input.vertical || '').slice(0, 80),
        category: String(input.category || 'document').slice(0, 80),
        assignee: input.assignee || null,
        dueDate: input.dueDate ? new Date(input.dueDate).toISOString().slice(0, 10) : null,
        status: 'pending_review',
        uploadedBy: user.id,
        uploadedByName: user.name || user.username,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      };
      data.documents.push(created);
      return created;
    });
    return success(response, { document: doc }, 201);
  }
  const documentStatusMatch = pathname.match(/^\/api\/documents\/([^/]+)\/status$/);
  if (request.method === 'PATCH' && documentStatusMatch) {
    if (!canManageClub(user)) return failure(response, 403, 'Your role cannot update document status.');
    const input = await readJson(request);
    const validStatuses = ['pending_review', 'approved', 'rejected', 'revision_needed'];
    if (!validStatuses.includes(input.status)) return failure(response, 422, `status must be one of: ${validStatuses.join(', ')}`);
    const updated = await context.store.update((data) => {
      const index = (data.documents || []).findIndex((d) => d.id === documentStatusMatch[1] && belongsToClub(d, user));
      if (index < 0) return null;
      data.documents[index] = { ...data.documents[index], status: input.status, reviewNote: String(input.reviewNote || '').slice(0, 500), reviewedBy: user.id, updatedAt: new Date().toISOString() };
      return data.documents[index];
    });
    return updated ? success(response, { document: updated }) : failure(response, 404, 'Document not found.');
  }

  if (request.method === 'GET' && pathname === '/api/risks') {
    if (!requirePolicy(response, user, 'MANAGEMENT')) return;
    return success(response, { risks: scopeCollection((await context.store.read()).risks, user) });
  }
  if (request.method === 'POST' && pathname === '/api/risks') {
    if (!canManageClub(user)) return failure(response, 403, 'Your role cannot create risks.');
    const input = await readJson(request);
    const title = String(input.title || input.risk || '').trim();
    if (!title || title.length > 300) return failure(response, 422, 'title is required (max 300 chars).');
    const risk = await context.store.update((data) => {
      const created = {
        id: crypto.randomUUID(), clubId: user.clubId, title,
        severity: ['low', 'medium', 'high', 'critical'].includes(input.severity) ? input.severity : 'medium',
        likelihood: ['low', 'high'].includes(input.likelihood) ? input.likelihood : 'medium',
        impact: ['low', 'medium', 'high'].includes(input.impact) ? input.impact : 'medium',
        facts: String(input.facts || '').slice(0, 2000),
        aiExplanation: String(input.aiExplanation || '').slice(0, 2000),
        mitigationSteps: Array.isArray(input.mitigationSteps) ? input.mitigationSteps.map((s) => ({ text: String(s.text || s).slice(0, 500), done: Boolean(s.done) })) : [],
        owner: String(input.owner || user.name || user.username || '').slice(0, 100),
        isEscalated: Boolean(input.isEscalated),
        status: ['open', 'mitigated', 'closed'].includes(input.status) ? input.status : 'open',
        eventId: input.eventId ? String(input.eventId).slice(0, 120) : null,
        createdBy: user.id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      };
      data.risks.push(created);
      return created;
    });
    return success(response, { risk }, 201);
  }
  const riskMatch = pathname.match(/^\/api\/risks\/([^/]+)$/);
  if (riskMatch && request.method === 'PATCH') {
    if (!canManageClub(user)) return failure(response, 403, 'Your role cannot update risks.');
    const input = await readJson(request);
    const updated = await context.store.update((data) => {
      const index = (data.risks || []).findIndex((r) => r.id === riskMatch[1] && belongsToClub(r, user));
      if (index < 0) return null;
      const curr = data.risks[index];
      data.risks[index] = {
        ...curr,
        ...(input.title !== undefined && { title: String(input.title).trim().slice(0, 300) }),
        ...(input.severity !== undefined && { severity: input.severity }),
        ...(input.likelihood !== undefined && { likelihood: input.likelihood }),
        ...(input.impact !== undefined && { impact: input.impact }),
        ...(input.facts !== undefined && { facts: String(input.facts).slice(0, 2000) }),
        ...(input.aiExplanation !== undefined && { aiExplanation: String(input.aiExplanation).slice(0, 2000) }),
        ...(input.mitigationSteps !== undefined && { mitigationSteps: Array.isArray(input.mitigationSteps) ? input.mitigationSteps.map((s) => ({ text: String(s.text || s).slice(0, 500), done: Boolean(s.done) })) : curr.mitigationSteps }),
        ...(input.owner !== undefined && { owner: String(input.owner).slice(0, 100) }),
        ...(input.isEscalated !== undefined && { isEscalated: Boolean(input.isEscalated) }),
        ...(input.status !== undefined && { status: input.status }),
        updatedAt: new Date().toISOString()
      };
      return data.risks[index];
    });
    return updated ? success(response, { risk: updated }) : failure(response, 404, 'Risk not found.');
  }

  // Volunteer portal routes (volunteer-scoped task/shift access)
  if (request.method === 'GET' && pathname === '/api/volunteer/tasks') {
    const data = await context.store.read();
    const tasks = scopeCollection(data.tasks, user).filter((t) => t.assigneeId === user.id);
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const enriched = tasks.map((t) => {
      const due = t.dueDate || t.deadline || '';
      const overdue = due && due < today && t.status !== 'done';
      let group = 'later';
      if (due === today) group = 'today';
      else if (due && due <= new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10)) group = 'week';
      return { ...t, overdue, group, dueAt: due, dueTimeStr: overdue ? 'Overdue' : (due ? `Due ${due}` : 'No deadline') };
    });
    const active = enriched.filter((t) => t.status !== 'done');
    const completed = enriched.filter((t) => t.status === 'done');
    return success(response, { tasks: active, completedTasks: completed });
  }
  const volunteerTaskMatch = pathname.match(/^\/api\/volunteer\/tasks\/([^/]+)$/);
  if (volunteerTaskMatch && request.method === 'PATCH') {
    const input = await readJson(request);
    const updated = await context.store.update((data) => {
      const index = (data.tasks || []).findIndex((t) => t.id === volunteerTaskMatch[1] && t.assigneeId === user.id && belongsToClub(t, user));
      if (index < 0) return null;
      // Volunteers can only update status and blockedReason
      const allowed = {};
      if (input.status !== undefined && TASK_STATUSES.has(input.status)) allowed.status = input.status;
      if (input.blockedReason !== undefined) allowed.blockedReason = String(input.blockedReason).slice(0, 500);
      data.tasks[index] = { ...data.tasks[index], ...allowed, updatedAt: new Date().toISOString() };
      return data.tasks[index];
    });
    return updated ? success(response, { task: updated }) : failure(response, 404, 'Task not found or not assigned to you.');
  }
  const volunteerProofMatch = pathname.match(/^\/api\/volunteer\/tasks\/([^/]+)\/proof$/);
  if (volunteerProofMatch && request.method === 'POST') {
    const input = await readJson(request);
    const proofUrl = String(input.proofUrl || input.photoUrl || input.url || '').trim();
    if (!proofUrl || proofUrl.length > 2000) return failure(response, 422, 'proofUrl is required.');
    const updated = await context.store.update((data) => {
      const index = (data.tasks || []).findIndex((t) => t.id === volunteerProofMatch[1] && t.assigneeId === user.id && belongsToClub(t, user));
      if (index < 0) return null;
      data.tasks[index] = { ...data.tasks[index], proofPhoto: proofUrl, proofUploadedAt: new Date().toISOString(), proofUploadedBy: user.id, updatedAt: new Date().toISOString() };
      return data.tasks[index];
    });
    return updated ? success(response, { task: updated }) : failure(response, 404, 'Task not found or not assigned to you.');
  }
  if (request.method === 'GET' && pathname === '/api/volunteer/shifts') {
    const data = await context.store.read();
    const shifts = scopeCollection(data.shifts || [], user).filter((s) => s.assigneeId === user.id || s.volunteerId === user.id);
    return success(response, { shifts });
  }

  // Volunteer management (President/management only)
  if (request.method === 'POST' && pathname === '/api/volunteers') {
    if (!canManageClub(user)) return failure(response, 403, 'Your role cannot add volunteers.');
    const input = await readJson(request);
    const name = String(input.name || '').trim();
    if (!name || name.length > 120) return failure(response, 422, 'name is required (max 120 chars).');
    const vol = await context.store.update((data) => {
      const created = {
        id: crypto.randomUUID(), clubId: user.clubId, name,
        email: String(input.email || '').trim().slice(0, 254),
        avatar: String(input.avatar || name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 3)).slice(0, 10),
        role: String(input.role || 'Volunteer').slice(0, 60),
        vertical: String(input.vertical || 'General').slice(0, 80),
        skills: Array.isArray(input.skills) ? input.skills.map((s) => String(s).slice(0, 80)).slice(0, 20) : [],
        openTasks: 0, availability: Array.isArray(input.availability) ? input.availability.slice(0, 7) : [1, 1, 1, 1, 1, 0, 0],
        status: 'active', addedBy: user.id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      };
      data.volunteers.push(created);
      return created;
    });
    return success(response, { volunteer: vol }, 201);
  }
  const volunteerMatch = pathname.match(/^\/api\/volunteers\/([^/]+)$/);
  if (volunteerMatch && request.method === 'PATCH') {
    if (!canManageClub(user)) return failure(response, 403, 'Your role cannot update volunteers.');
    const input = await readJson(request);
    const updated = await context.store.update((data) => {
      const index = (data.volunteers || []).findIndex((v) => v.id === volunteerMatch[1] && belongsToClub(v, user));
      if (index < 0) return null;
      const curr = data.volunteers[index];
      data.volunteers[index] = {
        ...curr,
        ...(input.name !== undefined && { name: String(input.name).trim().slice(0, 120) }),
        ...(input.email !== undefined && { email: String(input.email).trim().slice(0, 254) }),
        ...(input.role !== undefined && { role: String(input.role).slice(0, 60) }),
        ...(input.vertical !== undefined && { vertical: String(input.vertical).slice(0, 80) }),
        ...(input.skills !== undefined && { skills: Array.isArray(input.skills) ? input.skills.map((s) => String(s).slice(0, 80)).slice(0, 20) : curr.skills }),
        ...(input.availability !== undefined && { availability: Array.isArray(input.availability) ? input.availability.slice(0, 7) : curr.availability }),
        ...(input.status !== undefined && { status: String(input.status).slice(0, 40) }),
        updatedAt: new Date().toISOString()
      };
      return data.volunteers[index];
    });
    return updated ? success(response, { volunteer: updated }) : failure(response, 404, 'Volunteer not found.');
  }
  if (request.method === 'POST' && pathname === '/api/volunteers/assign') {
    if (!canManageClub(user)) return failure(response, 403, 'Your role cannot assign volunteers.');
    const input = await readJson(request);
    const taskId = String(input.taskId || '').trim();
    const volunteerId = String(input.volunteerId || '').trim();
    if (!taskId || !volunteerId) return failure(response, 422, 'taskId and volunteerId are required.');
    const updated = await context.store.update((data) => {
      const tIndex = (data.tasks || []).findIndex((t) => t.id === taskId && belongsToClub(t, user));
      if (tIndex < 0) throw error('Task not found.', 404);
      const vol = (data.volunteers || []).find((v) => v.id === volunteerId && belongsToClub(v, user));
      if (!vol) throw error('Volunteer not found in this club.', 404);
      data.tasks[tIndex] = { ...data.tasks[tIndex], assigneeId: volunteerId, assigneeName: vol.name, updatedAt: new Date().toISOString() };
      return data.tasks[tIndex];
    });
    return success(response, { task: updated });
  }

  // Task deletion (President only)
  const taskDeleteMatch = pathname.match(/^\/api\/tasks\/([^/]+)$/);
  if (taskDeleteMatch && request.method === 'DELETE') {
    if (!requirePolicy(response, user, 'PRESIDENT', 'Only Presidents can delete tasks.')) return;
    const removed = await context.store.update((data) => {
      const index = (data.tasks || []).findIndex((t) => t.id === taskDeleteMatch[1] && belongsToClub(t, user));
      return index < 0 ? null : data.tasks.splice(index, 1)[0];
    });
    return removed ? success(response, { id: removed.id }) : failure(response, 404, 'Task not found.');
  }

  // Deadlines endpoint — derived from tasks and events
  if (request.method === 'GET' && pathname === '/api/deadlines') {
    const data = await context.store.read();
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const weekFromNow = new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10);
    const nextWeek = new Date(now.getTime() + 14 * 86400000).toISOString().slice(0, 10);

    function getGroup(dueAt) {
      if (!dueAt) return 'Later';
      if (dueAt <= today) return 'Today';
      if (dueAt <= weekFromNow) return `This week`;
      if (dueAt <= nextWeek) return 'Next week';
      return 'Later';
    }

    const taskDeadlines = scopeCollection(data.tasks || [], user)
      .filter((t) => t.status !== 'done' && (t.dueDate || t.deadline))
      .map((t) => {
        const dueAt = t.dueDate || t.deadline || '';
        return {
          id: `dl-task-${t.id}`, type: 'task', title: t.title || t.name || 'Task',
          owner: t.assigneeName || t.assigneeId || 'Unassigned',
          dueAt, overdue: dueAt < today, group: getGroup(dueAt), sourceId: t.id
        };
      });

    const eventDeadlines = scopeCollection(data.events || [], user)
      .filter((e) => e.status !== 'completed' && e.eventDate)
      .map((e) => {
        const dueAt = e.eventDate ? e.eventDate.slice(0, 10) : '';
        return {
          id: `dl-event-${e.id}`, type: 'meeting', title: `Event: ${e.name || 'Unnamed'}`,
          owner: e.organizer || 'Club',
          dueAt, overdue: dueAt < today, group: getGroup(dueAt), sourceId: e.id
        };
      });

    const meetingDeadlines = scopeCollection(data.meetings || [], user)
      .flatMap((m) => (m.actionItems || []).filter((a) => a.deadline).map((a) => {
        const dueAt = a.deadline ? a.deadline.slice(0, 10) : '';
        return {
          id: `dl-mtg-${m.id}-${a.text?.slice(0, 8) || Math.random()}`, type: 'meeting',
          title: a.text || 'Meeting action item', owner: a.owner || 'Team',
          dueAt, overdue: dueAt < today, group: getGroup(dueAt), sourceId: m.id
        };
      }));

    const all = [...taskDeadlines, ...eventDeadlines, ...meetingDeadlines]
      .sort((a, b) => (a.dueAt || '').localeCompare(b.dueAt || ''));
    return success(response, { deadlines: all });
  }

  // Knowledge / RAG routes
  if (request.method === 'GET' && pathname === '/api/knowledge/documents') {
    if (!requirePolicy(response, user, 'MANAGEMENT')) return;
    const data = await context.store.read();
    const docs = scopeCollection(data.knowledge || [], user);
    return success(response, { documents: docs });
  }
  if (request.method === 'POST' && pathname === '/api/knowledge/upload') {
    if (!canManageClub(user)) return failure(response, 403, 'Your role cannot upload knowledge documents.');
    const input = await readJson(request);
    const name = String(input.name || input.title || '').trim();
    if (!name || name.length > 300) return failure(response, 422, 'name is required (max 300 chars).');
    const doc = await context.store.update((data) => {
      if (!Array.isArray(data.knowledge)) data.knowledge = [];
      const created = {
        id: `src-${crypto.randomUUID().slice(0, 8)}`, clubId: user.clubId, name,
        category: String(input.category || 'General').slice(0, 80),
        content: String(input.content || '').slice(0, 100000),
        fileUrl: String(input.fileUrl || '').slice(0, 2000),
        pages: Number(input.pages) || 1,
        status: 'indexed',
        indexedDate: new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
        uploadedBy: user.id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      };
      data.knowledge.push(created);
      return created;
    });
    return success(response, { document: doc }, 201);
  }

  // Bookmarks — list user's saved announcements
  if (request.method === 'GET' && pathname === '/api/announcements/bookmarks') {
    const data = await context.store.read();
    const userBookmarkIds = (data.bookmarks || []).filter((b) => b.userId === user.id).map((b) => b.announcementId);
    const bookmarked = (data.announcements || []).filter((a) => userBookmarkIds.includes(a.id)).map(publicAnnouncement);
    return success(response, { bookmarks: bookmarked });
  }

  if (pathname === '/api/club/settings') {
    if (!requirePolicy(response, user, 'PRESIDENT')) return;
    if (request.method === 'GET') {
      const data = await context.store.read();
      return success(response, { settings: data.settings[user.clubId] || {} });
    }
    if (['PUT', 'PATCH'].includes(request.method)) {
      const input = await readJson(request);
      const settings = await context.store.update((data) => {
        data.settings[user.clubId] = { ...(data.settings[user.clubId] || {}), ...input, updatedAt: new Date().toISOString(), updatedBy: user.id };
        return data.settings[user.clubId];
      });
      return success(response, { settings });
    }
  }
  return notFound(response);
}

module.exports = { handleApi };
