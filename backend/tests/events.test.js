const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createServer } = require('../server');

let server;
let baseUrl;
let databaseFile;
const accounts = {
  president: { username: 'EventsPresident', email: 'events-president@campus.edu', role: 'PRESIDENT', password: 'password-12345' },
  volunteer: { username: 'EventsVolunteer', email: 'events-volunteer@campus.edu', role: 'VOLUNTEER', password: 'password-12345' },
  webUser: { username: 'EventsUser', email: 'events-user@campus.edu', role: 'USER', password: 'password-12345' }
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

function auth(token, options = {}) {
  return { ...options, headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) } };
}

function eventPayload(overrides = {}) {
  return {
    name: 'Backend Event Contract Test',
    type: 'Workshop',
    description: 'An event created by the event API test.',
    eventDate: new Date(Date.now() + 86400000).toISOString(),
    time: '10:30 AM',
    venue: 'Central Auditorium',
    organizer: 'IEEE Student Branch',
    visibility: 'public',
    capacity: 120,
    tags: ['Workshop', 'API'],
    importantInfo: 'Bring your student ID.',
    percentComplete: 0,
    phase: 'Concept',
    riskLevel: 'low',
    riskSummary: 'Initial planning',
    status: 'upcoming',
    ...overrides
  };
}

test.before(async () => {
  const databaseDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'planova-events-'));
  databaseFile = path.join(databaseDirectory, 'data.json');
  server = createServer({ databaseFile, jwtSecret: 'test-events-secret', tokenTtlHours: 1 });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  await signup(accounts.president);
  await signup(accounts.volunteer);
  await signup(accounts.webUser);

  const data = JSON.parse(await fs.readFile(databaseFile, 'utf8'));
  data.clubs.push({ id: 'club-other', clubId: 'OTHER001', name: 'Other Club', status: 'ACTIVE', settings: {} });
  data.events.push({
    id: 'event-other-private',
    clubId: 'OTHER001',
    name: 'Other Club Private Event',
    type: 'Workshop',
    description: 'Private event from another club.',
    eventDate: new Date(Date.now() + 86400000).toISOString(),
    status: 'upcoming',
    visibility: 'private',
    phase: 'Concept',
    riskLevel: 'low',
    riskSummary: 'Private'
  });
  data.events.push({
    id: 'event-public',
    clubId: 'IEEE001',
    name: 'Public Event Contract Test',
    type: 'Hackathon',
    description: 'Public event detail description.',
    eventDate: new Date(Date.now() + 86400000).toISOString(),
    time: '09:00 AM',
    venue: 'Campus Hall',
    organizer: 'IEEE Student Branch',
    capacity: 200,
    tags: ['Public'],
    importantInfo: 'Bring your ID.',
    status: 'upcoming',
    visibility: 'public',
    phase: 'Concept',
    riskLevel: 'low',
    riskSummary: 'Initial planning'
  });
  await fs.writeFile(databaseFile, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
});

test.after(async () => {
  const databaseDirectory = path.dirname(databaseFile);
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  await fs.rm(databaseDirectory, { recursive: true, force: true });
});

test('public event listing and details expose only active public event data', async () => {
  const listResponse = await request('/api/events/public');
  assert.equal(listResponse.status, 200);
  const events = await listResponse.json();
  assert.ok(events.some((event) => event.id === 'event-public'));
  assert.equal(events.some((event) => event.id === 'event-other-private'), false);

  const detailResponse = await request('/api/events/event-public');
  assert.equal(detailResponse.status, 200);
  const detail = await detailResponse.json();
  assert.equal(detail.description, 'Public event detail description.');
  assert.equal(detail.date, detail.eventDate);
  assert.equal(detail.time, '09:00 AM');
  assert.equal(detail.organizer, 'IEEE Student Branch');

  const privateResponse = await request('/api/events/event-other-private');
  assert.equal(privateResponse.status, 401);
});

test('President can manage own-club events and client clubId cannot change ownership', async () => {
  const president = await login(accounts.president);
  const headers = { Authorization: `Bearer ${president.token}` };

  const listResponse = await request('/api/events', { headers });
  assert.equal(listResponse.status, 200);
  assert.ok((await listResponse.json()).every((event) => event.clubId === undefined || event.clubId === 'IEEE001'));

  const createResponse = await request('/api/events', auth(president.token, {
    method: 'POST',
    body: JSON.stringify(eventPayload({ clubId: 'OTHER001', name: 'President-Owned Event' }))
  }));
  assert.equal(createResponse.status, 201);
  const created = (await createResponse.json()).data;
  assert.equal(created.clubId, 'IEEE001');
  assert.equal(created.description, 'An event created by the event API test.');

  const updateResponse = await request(`/api/events/${created.id}`, auth(president.token, {
    method: 'PATCH',
    body: JSON.stringify({ name: 'Updated President Event', clubId: 'OTHER001', visibility: 'private' })
  }));
  assert.equal(updateResponse.status, 200);
  assert.equal((await updateResponse.json()).data.name, 'Updated President Event');

  const deleteResponse = await request(`/api/events/${created.id}`, auth(president.token, { method: 'DELETE' }));
  assert.equal(deleteResponse.status, 200);
});

test('Volunteer can read permitted club events but cannot manage them', async () => {
  const volunteer = await login(accounts.volunteer);
  const headers = { Authorization: `Bearer ${volunteer.token}` };
  assert.equal((await request('/api/events', { headers })).status, 200);

  const createResponse = await request('/api/events', auth(volunteer.token, { method: 'POST', body: JSON.stringify(eventPayload()) }));
  assert.equal(createResponse.status, 403);
  const updateResponse = await request('/api/events/event-public', auth(volunteer.token, { method: 'PATCH', body: JSON.stringify({ name: 'Not allowed' }) }));
  assert.equal(updateResponse.status, 403);
  const deleteResponse = await request('/api/events/event-public', auth(volunteer.token, { method: 'DELETE' }));
  assert.equal(deleteResponse.status, 403);
});

test('Web User has public event access but not private club event APIs', async () => {
  const webUser = await login(accounts.webUser);
  assert.equal((await request('/api/events/public')).status, 200);
  assert.equal((await request('/api/events/event-public', { headers: { Authorization: `Bearer ${webUser.token}` } })).status, 200);
  assert.equal((await request('/api/events', { headers: { Authorization: `Bearer ${webUser.token}` } })).status, 403);
  assert.equal((await request('/api/events', auth(webUser.token, { method: 'POST', body: JSON.stringify(eventPayload()) }))).status, 403);
});

test('Unauthenticated event management requests are denied', async () => {
  assert.equal((await request('/api/events')).status, 401);
  assert.equal((await request('/api/events/event-public', { method: 'PATCH', body: JSON.stringify({ name: 'No token' }) })).status, 401);
  assert.equal((await request('/api/events/event-public', { method: 'DELETE' })).status, 401);
});
