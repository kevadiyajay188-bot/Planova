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
  president: { username: 'RsvpPresident', email: 'rsvp-president@campus.edu', role: 'PRESIDENT', password: 'password-12345' },
  volunteer: { username: 'RsvpVolunteer', email: 'rsvp-volunteer@campus.edu', role: 'VOLUNTEER', password: 'password-12345' },
  webUser: { username: 'RsvpUser', email: 'rsvp-user@campus.edu', role: 'USER', password: 'password-12345' }
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

test.before(async () => {
  const databaseDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'planova-rsvp-'));
  databaseFile = path.join(databaseDirectory, 'data.json');
  server = createServer({ databaseFile, jwtSecret: 'test-rsvp-secret', tokenTtlHours: 1 });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  await signup(accounts.president);
  await signup(accounts.volunteer);
  await signup(accounts.webUser);

  const data = JSON.parse(await fs.readFile(databaseFile, 'utf8'));
  data.clubs.push({ id: 'club-other', clubId: 'OTHER001', name: 'Other Club', status: 'ACTIVE', settings: {} });
  data.events.push({
    id: 'rsvp-other-club-event',
    clubId: 'OTHER001',
    name: 'Other Club Public Event',
    type: 'Workshop',
    eventDate: new Date(Date.now() + 86400000).toISOString(),
    status: 'upcoming',
    visibility: 'public',
    phase: 'Concept',
    riskLevel: 'low',
    riskSummary: 'Other club event'
  });
  await fs.writeFile(databaseFile, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
});

test.after(async () => {
  const databaseDirectory = path.dirname(databaseFile);
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  await fs.rm(databaseDirectory, { recursive: true, force: true });
});

test('Web User can RSVP once, retrieve My Events, and cancel the RSVP', async () => {
  const webUser = await login(accounts.webUser);
  const publicEvents = await (await request('/api/events/public')).json();
  const event = publicEvents[0];

  const createResponse = await request(`/api/events/${event.id}/rsvp`, auth(webUser.token, {
    method: 'POST',
    body: JSON.stringify({ name: 'Spoofed Name', email: 'spoofed-email@campus.edu', userId: 'other-user', clubId: 'OTHER001' })
  }));
  assert.equal(createResponse.status, 201);

  const data = JSON.parse(await fs.readFile(databaseFile, 'utf8'));
  const saved = data.rsvps.find((rsvp) => rsvp.eventId === event.id);
  assert.equal(saved.userId, webUser.data.user.id);
  assert.equal(saved.clubId, 'IEEE001');
  assert.equal(saved.status, 'CONFIRMED');
  assert.equal(saved.email, 'spoofed-email@campus.edu');

  const duplicate = await request(`/api/events/${event.id}/rsvp`, auth(webUser.token, {
    method: 'POST',
    body: JSON.stringify({ name: 'Duplicate', email: 'duplicate@campus.edu' })
  }));
  assert.equal(duplicate.status, 409);

  const myEventsResponse = await request('/api/my-events', auth(webUser.token));
  assert.equal(myEventsResponse.status, 200);
  assert.ok((await myEventsResponse.json()).some((myEvent) => myEvent.id === event.id));

  const cancelResponse = await request(`/api/events/${event.id}/rsvp`, auth(webUser.token, { method: 'DELETE' }));
  assert.equal(cancelResponse.status, 200);
  const afterCancel = await request('/api/my-events', auth(webUser.token));
  assert.equal((await afterCancel.json()).some((myEvent) => myEvent.id === event.id), false);
});

test('Volunteer cannot use Web User RSVP APIs', async () => {
  const volunteer = await login(accounts.volunteer);
  const publicEvents = await (await request('/api/events/public')).json();
  const event = publicEvents[0];
  assert.equal((await request(`/api/events/${event.id}/rsvp`, auth(volunteer.token, { method: 'POST', body: JSON.stringify({}) }))).status, 403);
  assert.equal((await request('/api/my-events', auth(volunteer.token))).status, 403);
});

test('Unauthenticated and cross-club RSVPs are rejected', async () => {
  const publicEvents = await (await request('/api/events/public')).json();
  assert.equal((await request(`/api/events/${publicEvents[0].id}/rsvp`, { method: 'POST', body: JSON.stringify({}) })).status, 401);

  const webUser = await login(accounts.webUser);
  const crossClub = await request('/api/events/rsvp-other-club-event/rsvp', auth(webUser.token, {
    method: 'POST',
    body: JSON.stringify({ name: 'Cross Club', email: 'cross-club@campus.edu' })
  }));
  assert.equal(crossClub.status, 404);
});
