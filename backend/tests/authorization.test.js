const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createServer } = require('../server');

let server;
let baseUrl;
let databaseDirectory;
const accounts = {
  president: { username: 'AuthorizationPresident', email: 'authorization-president@campus.edu', password: 'password-12345', role: 'PRESIDENT' },
  volunteer: { username: 'AuthorizationVolunteer', email: 'authorization-volunteer@campus.edu', password: 'password-12345', role: 'VOLUNTEER' },
  webUser: { username: 'AuthorizationUser', email: 'authorization-user@campus.edu', password: 'password-12345', role: 'USER' }
};

async function request(pathname, options = {}) {
  return fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
}

async function signup(account) {
  const response = await request('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ ...account, clubId: 'IEEE001' })
  });
  assert.equal(response.status, 201);
}

async function login(account) {
  const response = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: account.username, password: account.password })
  });
  assert.equal(response.status, 200);
  return response.json();
}

function authOptions(token, options = {}) {
  return { ...options, headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) } };
}

test.before(async () => {
  databaseDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'planova-authorization-'));
  server = createServer({ databaseFile: path.join(databaseDirectory, 'data.json'), jwtSecret: 'test-authorization-secret', tokenTtlHours: 1 });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  await signup(accounts.president);
  await signup(accounts.volunteer);
  await signup(accounts.webUser);
});

test.after(async () => {
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  await fs.rm(databaseDirectory, { recursive: true, force: true });
});

test('President can access existing club management APIs', async () => {
  const president = await login(accounts.president);
  const headers = { Authorization: `Bearer ${president.token}` };

  for (const pathname of ['/api/users', '/api/volunteers', '/api/documents', '/api/risks', '/api/club/settings', '/api/events', '/api/meetings', '/api/announcements']) {
    const response = await request(pathname, { headers });
    assert.equal(response.status, 200, pathname);
  }

  const budgetResponse = await request('/api/events/evt-technova/budget', { headers });
  assert.equal(budgetResponse.status, 200);

  const eventResponse = await request('/api/events', authOptions(president.token, {
    method: 'POST',
    body: JSON.stringify({
      name: 'President Authorization Event',
      type: 'Workshop',
      eventDate: new Date(Date.now() + 86400000).toISOString(),
      percentComplete: 0,
      phase: 'Concept',
      riskLevel: 'low',
      riskSummary: 'Authorization test',
      status: 'upcoming'
    })
  }));
  assert.equal(eventResponse.status, 201);

  const taskResponse = await request('/api/tasks', authOptions(president.token, {
    method: 'POST',
    body: JSON.stringify({ title: 'Authorization test task', dueDate: new Date(Date.now() + 86400000).toISOString() })
  }));
  assert.equal(taskResponse.status, 201);
});

test('Volunteer can access permitted club information and update an assigned task only', async () => {
  const president = await login(accounts.president);
  const volunteer = await login(accounts.volunteer);
  const presidentHeaders = { Authorization: `Bearer ${president.token}` };
  const volunteerHeaders = { Authorization: `Bearer ${volunteer.token}` };

  const assignedTaskResponse = await request('/api/tasks', authOptions(president.token, {
    method: 'POST',
    body: JSON.stringify({
      title: 'Volunteer-owned authorization task',
      assigneeId: volunteer.data.user.id,
      dueDate: new Date(Date.now() + 86400000).toISOString()
    })
  }));
  assert.equal(assignedTaskResponse.status, 201);
  const assignedTaskId = (await assignedTaskResponse.json()).data.task.id;

  for (const pathname of ['/api/events', '/api/meetings', '/api/announcements', '/api/tasks']) {
    const response = await request(pathname, { headers: volunteerHeaders });
    assert.equal(response.status, 200, pathname);
  }

  const updateResponse = await request(`/api/tasks/${assignedTaskId}`, authOptions(volunteer.token, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'done' })
  }));
  assert.equal(updateResponse.status, 200);

  for (const pathname of ['/api/users', '/api/volunteers', '/api/documents', '/api/risks', '/api/club/settings', '/api/events/evt-technova/budget']) {
    const response = await request(pathname, { headers: volunteerHeaders });
    assert.equal(response.status, 403, pathname);
  }

  const createEventResponse = await request('/api/events', authOptions(volunteer.token, {
    method: 'POST',
    body: JSON.stringify({ name: 'Volunteer cannot create this', type: 'Workshop' })
  }));
  assert.equal(createEventResponse.status, 403);

  const createMeetingResponse = await request('/api/meetings', authOptions(volunteer.token, {
    method: 'POST',
    body: JSON.stringify({ title: 'Volunteer cannot create this meeting' })
  }));
  assert.equal(createMeetingResponse.status, 403);

  assert.equal(presidentHeaders.Authorization.startsWith('Bearer '), true);
});

test('Web User can use public event and announcement access but not management APIs', async () => {
  const webUser = await login(accounts.webUser);
  const webHeaders = { Authorization: `Bearer ${webUser.token}` };

  const publicEventsResponse = await request('/api/events/public');
  assert.equal(publicEventsResponse.status, 200);
  const publicEvents = await publicEventsResponse.json();
  assert.ok(publicEvents.length > 0);

  const eventDetailsResponse = await request(`/api/events/${publicEvents[0].id}`, { headers: webHeaders });
  assert.equal(eventDetailsResponse.status, 200);

  const rsvpResponse = await request(`/api/events/${publicEvents[0].id}/rsvp`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${webUser.token}` },
    body: JSON.stringify({ name: 'Authorization Web User', email: 'authorization-rsvp@campus.edu' })
  });
  assert.equal(rsvpResponse.status, 201);

  for (const pathname of ['/api/announcements/featured', '/api/announcements/feed']) {
    const response = await request(pathname);
    assert.equal(response.status, 200, pathname);
  }

  for (const pathname of ['/api/dashboard/stats', '/api/events', '/api/tasks', '/api/meetings', '/api/users', '/api/volunteers', '/api/documents', '/api/risks', '/api/club/settings']) {
    const response = await request(pathname, { headers: webHeaders });
    assert.equal(response.status, 403, pathname);
  }
});

test('Unauthenticated requests are rejected from protected APIs', async () => {
  for (const pathname of ['/api/auth/me', '/api/dashboard/stats', '/api/events', '/api/tasks', '/api/meetings', '/api/users', '/api/volunteers', '/api/documents', '/api/risks', '/api/club/settings']) {
    const response = await request(pathname);
    assert.equal(response.status, 401, pathname);
  }
});
