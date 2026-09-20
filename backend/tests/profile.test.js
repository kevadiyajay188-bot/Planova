const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createServer } = require('../server');

let server;
let baseUrl;
let databaseDirectory;
let token;

async function request(pathname, options = {}) {
  return fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
}

function authenticated(options = {}) {
  return {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) }
  };
}

test.before(async () => {
  databaseDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'planova-profile-'));
  server = createServer({ databaseFile: path.join(databaseDirectory, 'data.json'), jwtSecret: 'test-profile-secret', tokenTtlHours: 1 });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  await request('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email: 'profile-president@campus.edu', username: 'ProfilePresident', role: 'PRESIDENT', password: 'password-12345', clubId: 'IEEE001' })
  });
  const signup = await request('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email: 'profile-user@campus.edu', username: 'ProfileUser', role: 'USER', password: 'password-12345', clubId: 'IEEE001' })
  });
  assert.equal(signup.status, 201);
  const signupBody = await signup.json();
  token = signupBody.token;
});

test.after(async () => {
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  await fs.rm(databaseDirectory, { recursive: true, force: true });
});

test('GET /api/profile returns only the authenticated user profile', async () => {
  const response = await request('/api/profile', authenticated());
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.data.profile.username, 'ProfileUser');
  assert.equal(body.data.profile.role, 'WEB_USER');
  assert.equal(body.data.profile.clubId, 'IEEE001');
  assert.ok(body.data.profile.createdAt);
  assert.equal(body.data.profile.passwordHash, undefined);
});

test('PATCH /api/profile updates only the authenticated user profile', async () => {
  const response = await request('/api/profile', authenticated({
    method: 'PATCH',
    body: JSON.stringify({ name: 'Updated Profile User', email: 'updated-profile@campus.edu', avatar: 'data:image/png;base64,AAAA' })
  }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.data.profile.name, 'Updated Profile User');
  assert.equal(body.data.profile.email, 'updated-profile@campus.edu');
  assert.equal(body.data.profile.avatar, 'data:image/png;base64,AAAA');
  assert.equal(body.data.profile.role, 'WEB_USER');
  assert.equal(body.data.profile.clubId, 'IEEE001');
  assert.equal(body.data.profile.passwordHash, undefined);

  const persisted = await request('/api/profile', authenticated());
  assert.equal((await persisted.json()).data.profile.email, 'updated-profile@campus.edu');
});

test('profile access requires authentication', async () => {
  assert.equal((await request('/api/profile')).status, 401);
  assert.equal((await request('/api/profile', { method: 'PATCH', body: JSON.stringify({ name: 'No Token', email: 'no-token@campus.edu' }) })).status, 401);
});

test('profile cannot change role, clubId, or password', async () => {
  const response = await request('/api/profile', authenticated({
    method: 'PATCH',
    body: JSON.stringify({ name: 'Attempted Escalation', email: 'escalation@campus.edu', role: 'PRESIDENT', clubId: 'OTHER001', password: 'changed-password' })
  }));
  assert.equal(response.status, 403);

  const profile = await request('/api/profile', authenticated());
  const body = await profile.json();
  assert.equal(body.data.profile.role, 'WEB_USER');
  assert.equal(body.data.profile.clubId, 'IEEE001');
  assert.equal(body.data.profile.name, 'Updated Profile User');
});

test('profile rejects invalid email and required fields', async () => {
  const invalidEmail = await request('/api/profile', authenticated({
    method: 'PATCH',
    body: JSON.stringify({ name: 'Valid Name', email: 'not-an-email' })
  }));
  assert.equal(invalidEmail.status, 422);

  const invalidName = await request('/api/profile', authenticated({
    method: 'PATCH',
    body: JSON.stringify({ name: 'A', email: 'valid-profile@campus.edu' })
  }));
  assert.equal(invalidName.status, 422);
});
