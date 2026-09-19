const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createServer } = require('../server');

let server;
let baseUrl;
let databaseDirectory;

test.before(async () => {
  databaseDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'planova-api-test-'));
  server = createServer({ databaseFile: path.join(databaseDirectory, 'data.json'), jwtSecret: 'test-secret' });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await fs.rm(databaseDirectory, { recursive: true, force: true });
});

async function request(pathname, options = {}) {
  return fetch(`${baseUrl}${pathname}`, options);
}

test('signup, login, authenticated dashboard reads, and event creation work end-to-end', async () => {
  const signupResponse = await request('/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@campus.edu', username: 'CampusAdmin', role: 'Admin', password: 'correct-horse-battery-staple' }) });
  assert.equal(signupResponse.status, 201);
  const signup = await signupResponse.json();
  assert.equal(signup.success, true);
  assert.equal(signup.data.user.passwordHash, undefined);
  assert.ok(signup.token);

  const unauthorized = await request('/api/dashboard/stats');
  assert.equal(unauthorized.status, 401);
  const authorizedHeaders = { Authorization: `Bearer ${signup.token}`, 'Content-Type': 'application/json' };
  const statsResponse = await request('/api/dashboard/stats', { headers: authorizedHeaders });
  assert.equal(statsResponse.status, 200);
  assert.equal(typeof (await statsResponse.json()).activeEvents.value, 'number');

  const eventsResponse = await request('/api/events?status=active', { headers: authorizedHeaders });
  const events = await eventsResponse.json();
  assert.ok(Array.isArray(events));
  assert.ok(events.every((event) => event.typeBadgeColor && Number.isInteger(event.daysLeft)));

  const roboQuest = events.find((event) => event.name.includes('RoboQuest'));
  const budgetResponse = await request(`/api/events/${roboQuest.id}/budget`, { headers: authorizedHeaders });
  assert.equal(budgetResponse.status, 200);
  const roboQuestBudget = await budgetResponse.json();
  assert.equal(roboQuestBudget.eventId, roboQuest.id);
  assert.equal(roboQuestBudget.totalPlanned, 9000);
  assert.equal(roboQuestBudget.spent, 1850);

  const createdResponse = await request('/api/events', { method: 'POST', headers: authorizedHeaders, body: JSON.stringify({ name: 'Campus Research Expo', type: 'Workshop', eventDate: '2026-12-18T10:00:00.000Z', percentComplete: 0, phase: 'Concept', riskLevel: 'low', riskSummary: 'Initial planning', status: 'upcoming' }) });
  assert.equal(createdResponse.status, 201);
  const created = (await createdResponse.json()).data;
  assert.equal(created.name, 'Campus Research Expo');
  const missingBudget = await request(`/api/events/${created.id}/budget`, { headers: authorizedHeaders });
  assert.equal(missingBudget.status, 404);

  const loginResponse = await request('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'CampusAdmin', password: 'correct-horse-battery-staple' }) });
  assert.equal(loginResponse.status, 200);
  assert.ok((await loginResponse.json()).token);
});

test('duplicate accounts and invalid credentials produce safe client errors', async () => {
  const duplicate = await request('/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@campus.edu', username: 'DifferentName', role: 'Volunteer', password: 'another-secure-password' }) });
  assert.equal(duplicate.status, 409);
  assert.equal((await duplicate.json()).success, false);
  const invalid = await request('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'CampusAdmin', password: 'wrong-password' }) });
  assert.equal(invalid.status, 401);
});

test('the server serves the original auth visual without its preview-only auth mock', async () => {
  const page = await request('/');
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.doesNotMatch(html, /Mock \/api\/auth\/\* for preview/);
  assert.match(html, /PLANOVA/);
});

test('the served dashboard includes the non-visual budget selector enhancement', async () => {
  const page = await request('/dashboard.html');
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /Select event/);
  assert.match(html, /fetch\('\/api\/events'\)/);
  assert.doesNotMatch(html, /Loading budget/);
});
