const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createServer } = require('../server');

let server;
let baseUrl;
let databaseDirectory;

// Store credentials and tokens for each role
const tokens = {};
const userIds = {};

test.before(async () => {
  databaseDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'planova-auth-test-'));
  server = createServer({
    databaseFile: path.join(databaseDirectory, 'data.json'),
    jwtSecret: 'test-auth-rbac-secret',
    tokenTtlHours: 1
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  // 1. Initial setup creates first account as President
  const presSignupRes = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'president@campus.edu',
      username: 'PresidentUser',
      role: 'President',
      password: 'password-12345'
    })
  });
  assert.equal(presSignupRes.status, 201);
  const presSignup = await presSignupRes.json();
  tokens.president = presSignup.token;
  userIds.president = presSignup.data.user.id;

  // 2. Register a Volunteer account
  const volSignupRes = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'volunteer@campus.edu',
      username: 'VolunteerUser',
      role: 'Volunteer',
      password: 'password-12345'
    })
  });
  assert.equal(volSignupRes.status, 201);
  const volSignup = await volSignupRes.json();
  tokens.volunteer = volSignup.token;
  userIds.volunteer = volSignup.data.user.id;

  // 3. Register a Web User account
  const webSignupRes = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'webuser@campus.edu',
      username: 'WebUser',
      role: 'Web User',
      password: 'password-12345'
    })
  });
  assert.equal(webSignupRes.status, 201);
  const webSignup = await webSignupRes.json();
  tokens.webUser = webSignup.token;
  userIds.webUser = webSignup.data.user.id;

  // 4. Register a user and have President promote them to Team Lead
  const leadSignupRes = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'teamlead@campus.edu',
      username: 'TeamLeadUser',
      role: 'Volunteer',
      password: 'password-12345'
    })
  });
  const leadSignup = await leadSignupRes.json();
  userIds.teamLead = leadSignup.data.user.id;

  const promoteRes = await fetch(`${baseUrl}/api/users/${userIds.teamLead}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokens.president}`
    },
    body: JSON.stringify({ role: 'TEAM_LEAD' })
  });
  assert.equal(promoteRes.status, 200);

  // Login as Team Lead to get refreshed token with TEAM_LEAD role
  const leadLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'TeamLeadUser',
      password: 'password-12345'
    })
  });
  assert.equal(leadLoginRes.status, 200);
  const leadLogin = await leadLoginRes.json();
  tokens.teamLead = leadLogin.token;

  // 5. Create a suspended user
  const suspSignupRes = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'suspended@campus.edu',
      username: 'SuspendedUser',
      role: 'Web User',
      password: 'password-12345'
    })
  });
  const suspSignup = await suspSignupRes.json();
  userIds.suspended = suspSignup.data.user.id;

  // Suspend user via President
  const suspendRes = await fetch(`${baseUrl}/api/users/${userIds.suspended}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokens.president}`
    },
    body: JSON.stringify({ status: 'SUSPENDED' })
  });
  assert.equal(suspendRes.status, 200);
});

test.after(async () => {
  await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  await fs.rm(databaseDirectory, { recursive: true, force: true });
});

// Helper for authenticated requests
function authFetch(pathname, token, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };
  return fetch(`${baseUrl}${pathname}`, { ...options, headers });
}

/* =========================================================================
   ROLE TESTING
   ========================================================================= */

test('TEST 1: President logs in, receives President role, and accesses all administrative operations', async () => {
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'PresidentUser', password: 'password-12345' })
  });
  assert.equal(loginRes.status, 200);
  const body = await loginRes.json();
  assert.equal(body.data.user.role, 'PRESIDENT');
  assert.equal(body.data.user.passwordHash, undefined);
  assert.ok(body.token);

  // President can read stats, users, club settings, volunteers
  const statsRes = await authFetch('/api/dashboard/stats', body.token);
  assert.equal(statsRes.status, 200);

  const usersRes = await authFetch('/api/users', body.token);
  assert.equal(usersRes.status, 200);
  const usersList = await usersRes.json();
  assert.ok(Array.isArray(usersList.data.users));

  const settingsRes = await authFetch('/api/club/settings', body.token);
  assert.equal(settingsRes.status, 200);

  const volRes = await authFetch('/api/volunteers', body.token);
  assert.equal(volRes.status, 200);
});

test('TEST 2: Team Lead logs in, receives Coordinator/Team Lead permissions, but cannot access President-only routes', async () => {
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'TeamLeadUser', password: 'password-12345' })
  });
  assert.equal(loginRes.status, 200);
  const body = await loginRes.json();
  assert.equal(body.data.user.role, 'TEAM_LEAD');

  // Team Lead can read volunteers and create tasks
  const volRes = await authFetch('/api/volunteers', body.token);
  assert.equal(volRes.status, 200);

  const createTaskRes = await authFetch('/api/tasks', body.token, {
    method: 'POST',
    body: JSON.stringify({
      title: 'Setup Stage Cables',
      category: 'Logistics',
      priority: 'high',
      dueDate: new Date().toISOString()
    })
  });
  assert.equal(createTaskRes.status, 201);

  // Team Lead CANNOT access user management or club settings
  const usersRes = await authFetch('/api/users', body.token);
  assert.equal(usersRes.status, 403);

  const settingsRes = await authFetch('/api/club/settings', body.token);
  assert.equal(settingsRes.status, 403);
});

test('TEST 3: Volunteer logs in, receives Volunteer role, views only assigned tasks, and cannot perform privileged actions', async () => {
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'VolunteerUser', password: 'password-12345' })
  });
  assert.equal(loginRes.status, 200);
  const body = await loginRes.json();
  assert.equal(body.data.user.role, 'VOLUNTEER');

  // Volunteer CANNOT create tasks
  const createTaskRes = await authFetch('/api/tasks', body.token, {
    method: 'POST',
    body: JSON.stringify({ title: 'Volunteer Unauthorized Task', dueDate: new Date().toISOString() })
  });
  assert.equal(createTaskRes.status, 403);

  // Volunteer CANNOT create events
  const createEventRes = await authFetch('/api/events', body.token, {
    method: 'POST',
    body: JSON.stringify({
      name: 'Unauthorized Fest',
      type: 'Hackathon',
      eventDate: new Date().toISOString(),
      percentComplete: 0,
      phase: 'Concept',
      riskLevel: 'low',
      riskSummary: 'None',
      status: 'upcoming'
    })
  });
  assert.equal(createEventRes.status, 403);

  // Volunteer CANNOT view all volunteers list
  const volRes = await authFetch('/api/volunteers', body.token);
  assert.equal(volRes.status, 403);

  // First create a task assigned to this volunteer via President
  const assignTaskRes = await authFetch('/api/tasks', tokens.president, {
    method: 'POST',
    body: JSON.stringify({
      title: 'Design Badges for Volunteers',
      category: 'Design',
      priority: 'medium',
      dueDate: new Date().toISOString(),
      assigneeId: userIds.volunteer
    })
  });
  assert.equal(assignTaskRes.status, 201);
  const assignedTaskId = (await assignTaskRes.json()).data.task.id;

  // Volunteer reads /api/tasks and sees only tasks assigned to them
  const myTasksRes = await authFetch('/api/tasks', body.token);
  assert.equal(myTasksRes.status, 200);
  const myTasks = (await myTasksRes.json()).data.tasks;
  assert.ok(myTasks.every(t => t.assigneeId === userIds.volunteer));

  // Volunteer can update STATUS of their assigned task
  const updateStatusRes = await authFetch(`/api/tasks/${assignedTaskId}`, body.token, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'done' })
  });
  assert.equal(updateStatusRes.status, 200);
  assert.equal((await updateStatusRes.json()).data.task.status, 'done');

  // Volunteer CANNOT update non-status fields (e.g. title) of assigned task
  const updateTitleRes = await authFetch(`/api/tasks/${assignedTaskId}`, body.token, {
    method: 'PATCH',
    body: JSON.stringify({ title: 'Hacked Title' })
  });
  assert.equal(updateTitleRes.status, 403);
});

test('TEST 4: Web User logs in, accesses public events & RSVP, but is blocked from private club operations', async () => {
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'WebUser', password: 'password-12345' })
  });
  assert.equal(loginRes.status, 200);
  const body = await loginRes.json();
  assert.equal(body.data.user.role, 'WEB_USER');

  // Web User can discover public events
  const publicRes = await fetch(`${baseUrl}/api/events/public`);
  assert.equal(publicRes.status, 200);
  const publicEvents = await publicRes.json();
  assert.ok(Array.isArray(publicEvents));
  assert.ok(publicEvents.length > 0);

  // Web User can RSVP to a public event
  const targetEvent = publicEvents[0];
  const rsvpRes = await fetch(`${baseUrl}/api/events/${targetEvent.id}/rsvp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Web User Attendee', email: 'attendee@campus.edu' })
  });
  assert.equal(rsvpRes.status, 201);

  // Web User CANNOT access private club dashboard or tasks
  const statsRes = await authFetch('/api/dashboard/stats', body.token);
  assert.equal(statsRes.status, 403);

  const tasksRes = await authFetch('/api/tasks', body.token);
  assert.equal(tasksRes.status, 403);

  const meetingsRes = await authFetch('/api/meetings', body.token);
  assert.equal(meetingsRes.status, 403);
});

/* =========================================================================
   SECURITY TESTING
   ========================================================================= */

test('Security: Wrong password and wrong username return generic 401 without account enumeration', async () => {
  const wrongPass = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'PresidentUser', password: 'incorrect-password' })
  });
  assert.equal(wrongPass.status, 401);
  const passErr = await wrongPass.json();
  assert.equal(passErr.message, 'Invalid email or password.');

  const wrongUser = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'NonExistentUser123', password: 'some-password' })
  });
  assert.equal(wrongUser.status, 401);
  const userErr = await wrongUser.json();
  assert.equal(userErr.message, 'Invalid email or password.');
});

test('Security: Missing login credentials return 422 validation error', async () => {
  const missing = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: '', password: '' })
  });
  assert.equal(missing.status, 422);
});

test('Security: Tampered or invalid JWT token is rejected with 401', async () => {
  const tamperedRes = await authFetch('/api/auth/me', 'invalid.jwt.token.string');
  assert.equal(tamperedRes.status, 401);
});

test('Security: Suspended user cannot log in and existing token is rejected', async () => {
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'SuspendedUser', password: 'password-12345' })
  });
  assert.equal(loginRes.status, 401);

  // Authenticating with suspended user token returns 401
  const meRes = await authFetch('/api/auth/me', tokens.suspended);
  assert.equal(meRes.status, 401);
});

test('Security: Public registration rejects self-assigning Admin or Coordinator role', async () => {
  const hackerAdmin = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'hacker@campus.edu',
      username: 'HackerAdmin',
      role: 'ADMIN',
      password: 'password-12345'
    })
  });
  assert.equal(hackerAdmin.status, 403);

  const hackerCoord = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'hacker2@campus.edu',
      username: 'HackerCoord',
      role: 'COORDINATOR',
      password: 'password-12345'
    })
  });
  assert.equal(hackerCoord.status, 403);
});

test('Security: Non-President cannot change roles via /api/users/:id', async () => {
  const unauthorizedChange = await authFetch(`/api/users/${userIds.volunteer}`, tokens.volunteer, {
    method: 'PATCH',
    body: JSON.stringify({ role: 'PRESIDENT' })
  });
  assert.equal(unauthorizedChange.status, 403);
});

test('Security: Safeguard prevents deactivating or demoting the final active President', async () => {
  const demoteRes = await authFetch(`/api/users/${userIds.president}`, tokens.president, {
    method: 'PATCH',
    body: JSON.stringify({ role: 'VOLUNTEER' })
  });
  assert.equal(demoteRes.status, 409);
  const err = await demoteRes.json();
  assert.match(err.message, /final active President/i);
});

test('Security: Logout invalidates session and subsequent calls with that token fail', async () => {
  // 1. Create a fresh temporary user and login
  const tempSignup = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'templogout@campus.edu',
      username: 'TempLogoutUser',
      role: 'Volunteer',
      password: 'password-12345'
    })
  });
  const tempToken = (await tempSignup.json()).token;

  // 2. Verified active
  const meBefore = await authFetch('/api/auth/me', tempToken);
  assert.equal(meBefore.status, 200);

  // 3. Logout
  const logoutRes = await authFetch('/api/auth/logout', tempToken, { method: 'POST' });
  assert.equal(logoutRes.status, 200);

  // 4. Token is now invalidated
  const meAfter = await authFetch('/api/auth/me', tempToken);
  assert.equal(meAfter.status, 401);
});

/* =========================================================================
   AI + AUTHENTICATION PERMISSION TESTS
   ========================================================================= */

test('AI RBAC: President can execute privileged AI operations via Copilot', async () => {
  const copilotRes = await authFetch('/api/ai/copilot', tokens.president, {
    method: 'POST',
    body: JSON.stringify({ message: 'Find similar events to TechNova' })
  });
  assert.equal(copilotRes.status, 200);
  const data = await copilotRes.json();
  assert.equal(data.role, 'ai');
  assert.equal(data.permissionDenied, undefined);
});

test('AI RBAC: Volunteer asking AI to delete a task is rejected with permissionDenied', async () => {
  const copilotRes = await authFetch('/api/ai/copilot', tokens.volunteer, {
    method: 'POST',
    body: JSON.stringify({ message: 'Delete task task-101' })
  });
  assert.equal(copilotRes.status, 200);
  const data = await copilotRes.json();
  assert.equal(data.permissionDenied, true);
  assert.match(data.text, /Action Denied/i);
});

test('AI RBAC: Volunteer asking AI to rebalance workload is rejected with permissionDenied', async () => {
  const copilotRes = await authFetch('/api/ai/copilot', tokens.volunteer, {
    method: 'POST',
    body: JSON.stringify({ message: 'Rebalance tasks among all volunteers' })
  });
  assert.equal(copilotRes.status, 200);
  const data = await copilotRes.json();
  assert.equal(data.permissionDenied, true);
  assert.match(data.text, /Action Denied/i);
});

test('AI RBAC: Web User asking AI to delete an event or manage club is rejected', async () => {
  const copilotRes = await authFetch('/api/ai/copilot', tokens.webUser, {
    method: 'POST',
    body: JSON.stringify({ message: 'Delete event evt-technova' })
  });
  assert.equal(copilotRes.status, 200);
  const data = await copilotRes.json();
  assert.equal(data.permissionDenied, true);
  assert.match(data.text, /Action Denied/i);
});

