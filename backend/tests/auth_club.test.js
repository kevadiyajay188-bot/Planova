const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createServer } = require('../server');

let server;
let baseUrl;
let databaseFile;
const credentials = {
  president: { email: 'club-president@campus.edu', username: 'ClubPresident', password: 'password-12345', role: 'PRESIDENT' },
  volunteer: { email: 'club-volunteer@campus.edu', username: 'ClubVolunteer', password: 'password-12345', role: 'VOLUNTEER' },
  user: { email: 'club-user@campus.edu', username: 'ClubUser', password: 'password-12345', role: 'USER' }
};

async function jsonRequest(pathname, options = {}) {
  return fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
}

async function login(account) {
  const response = await jsonRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: account.username, password: account.password })
  });
  assert.equal(response.status, 200);
  return response.json();
}

test.before(async () => {
  const databaseDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'planova-club-auth-'));
  databaseFile = path.join(databaseDirectory, 'data.json');
  server = createServer({ databaseFile, jwtSecret: 'test-club-auth-secret', tokenTtlHours: 1 });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  const databaseDirectory = path.dirname(databaseFile);
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  await fs.rm(databaseDirectory, { recursive: true, force: true });
});

test('signup and login return the canonical role and authorized Club ID', async () => {
  const presidentSignup = await jsonRequest('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ ...credentials.president, name: 'Club President', clubId: 'IEEE001' })
  });
  assert.equal(presidentSignup.status, 201);
  const presidentSignupBody = await presidentSignup.json();
  assert.equal(presidentSignupBody.data.user.role, 'PRESIDENT');
  assert.equal(presidentSignupBody.data.user.clubId, 'IEEE001');

  const volunteerSignup = await jsonRequest('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ ...credentials.volunteer, name: 'Club Volunteer', clubId: 'IEEE001' })
  });
  assert.equal(volunteerSignup.status, 201);
  assert.equal((await volunteerSignup.json()).data.user.role, 'VOLUNTEER');

  const userSignup = await jsonRequest('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ ...credentials.user, name: 'Club User', clubId: 'IEEE001' })
  });
  assert.equal(userSignup.status, 201);
  assert.equal((await userSignup.json()).data.user.role, 'WEB_USER');

  for (const account of Object.values(credentials)) {
    const loginBody = await login(account);
    assert.ok(loginBody.token);
    assert.equal(loginBody.data.user.clubId, 'IEEE001');
    assert.equal(loginBody.data.user.role, account.role === 'USER' ? 'WEB_USER' : account.role);

    const meResponse = await jsonRequest('/api/auth/me', {
      headers: { Authorization: `Bearer ${loginBody.token}` }
    });
    assert.equal(meResponse.status, 200);
    const meBody = await meResponse.json();
    assert.equal(meBody.data.user.clubId, 'IEEE001');
    assert.equal(meBody.data.user.role, account.role === 'USER' ? 'WEB_USER' : account.role);
  }
});

test('signup rejects an unknown Club ID after the initial club exists', async () => {
  const response = await jsonRequest('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      email: 'unknown-club@campus.edu',
      username: 'UnknownClubUser',
      password: 'password-12345',
      role: 'USER',
      clubId: 'NOPE001'
    })
  });
  assert.equal(response.status, 422);
});

test('protected data is isolated to the authenticated user club', async () => {
  const data = JSON.parse(await fs.readFile(databaseFile, 'utf8'));
  data.clubs.push({ id: 'club-other', clubId: 'OTHER001', name: 'Other Club', status: 'ACTIVE', settings: {} });
  data.events.push({
    id: 'event-other-club',
    clubId: 'OTHER001',
    name: 'Other Club Private Event',
    type: 'Workshop',
    eventDate: new Date(Date.now() + 86400000).toISOString(),
    percentComplete: 0,
    phase: 'Concept',
    riskLevel: 'low',
    riskSummary: 'Private',
    status: 'upcoming'
  });
  data.tasks.push({ id: 'task-other-club', clubId: 'OTHER001', title: 'Other Club Private Task', status: 'todo', assigneeId: null });
  await fs.writeFile(databaseFile, `${JSON.stringify(data, null, 2)}\n`, 'utf8');

  const president = await login(credentials.president);
  const authHeaders = { Authorization: `Bearer ${president.token}` };

  const eventsResponse = await jsonRequest('/api/events', { headers: authHeaders });
  assert.equal(eventsResponse.status, 200);
  const events = await eventsResponse.json();
  assert.ok(events.every((event) => event.clubId === undefined || event.clubId === 'IEEE001'));
  assert.equal(events.some((event) => event.id === 'event-other-club'), false);

  const foreignEventResponse = await jsonRequest('/api/events/event-other-club', { headers: authHeaders });
  assert.equal(foreignEventResponse.status, 404);

  const tasksResponse = await jsonRequest('/api/tasks', { headers: authHeaders });
  assert.equal(tasksResponse.status, 200);
  const tasks = (await tasksResponse.json()).data.tasks;
  assert.equal(tasks.some((task) => task.id === 'task-other-club'), false);

  const usersResponse = await jsonRequest('/api/users', { headers: authHeaders });
  assert.equal(usersResponse.status, 200);
  const users = (await usersResponse.json()).data.users;
  assert.ok(users.every((user) => user.clubId === 'IEEE001'));

  const createResponse = await jsonRequest('/api/events', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      clubId: 'OTHER001',
      name: 'Own Club Event',
      type: 'Workshop',
      eventDate: new Date(Date.now() + 172800000).toISOString(),
      percentComplete: 0,
      phase: 'Concept',
      riskLevel: 'low',
      riskSummary: 'Initial planning',
      status: 'upcoming'
    })
  });
  assert.equal(createResponse.status, 201);
  assert.equal((await createResponse.json()).data.clubId, 'IEEE001');
});
