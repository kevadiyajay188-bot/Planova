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
  president: { username: 'AnnouncementsPresident', email: 'announcements-president@campus.edu', role: 'PRESIDENT', password: 'password-12345' },
  volunteer: { username: 'AnnouncementsVolunteer', email: 'announcements-volunteer@campus.edu', role: 'VOLUNTEER', password: 'password-12345' },
  webUser: { username: 'AnnouncementsUser', email: 'announcements-user@campus.edu', role: 'USER', password: 'password-12345' }
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
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'planova-announcements-'));
  databaseFile = path.join(directory, 'data.json');
  server = createServer({ databaseFile, jwtSecret: 'test-announcements-secret', tokenTtlHours: 1 });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  await signup(accounts.president);
  await signup(accounts.volunteer);
  await signup(accounts.webUser);

  const data = JSON.parse(await fs.readFile(databaseFile, 'utf8'));
  data.clubs.push({ id: 'club-other', clubId: 'OTHER001', name: 'Other Club', status: 'ACTIVE', settings: {} });
  data.announcements.push({
    id: 'announcement-other-private',
    clubId: 'OTHER001',
    title: 'Other Club Private Notice',
    content: 'Private club content.',
    status: 'PUBLISHED',
    visibility: 'private',
    createdAt: new Date().toISOString()
  });
  await fs.writeFile(databaseFile, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
});

test.after(async () => {
  const directory = path.dirname(databaseFile);
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  await fs.rm(directory, { recursive: true, force: true });
});

test('announcement listing and details follow public and club access rules', async () => {
  const publicList = await request('/api/announcements');
  assert.equal(publicList.status, 200);
  const publicAnnouncements = await publicList.json();
  assert.ok(publicAnnouncements.length > 0);
  assert.equal(publicAnnouncements.some((announcement) => announcement.id === 'announcement-other-private'), false);

  const publicDetail = await request(`/api/announcements/${publicAnnouncements[0].id}`);
  assert.equal(publicDetail.status, 200);
  const detail = await publicDetail.json();
  assert.equal(detail.id, publicAnnouncements[0].id);
  assert.ok(detail.title);

  const privateDetail = await request('/api/announcements/announcement-other-private');
  assert.equal(privateDetail.status, 401);
});

test('President can create, update, and delete announcements in their club', async () => {
  const president = await login(accounts.president);
  const createdResponse = await request('/api/announcements', auth(president.token, {
    method: 'POST',
    body: JSON.stringify({
      clubId: 'OTHER001',
      subject: 'President Announcement',
      body: 'Announcement content',
      purpose: 'Operational Sync',
      audience: 'Club members',
      channels: ['Email'],
      status: 'PUBLISHED',
      visibility: 'public'
    })
  }));
  assert.equal(createdResponse.status, 201);
  const created = (await createdResponse.json()).data.announcement;
  assert.equal(created.clubId, undefined);
  assert.equal(created.title, 'President Announcement');

  const rawData = JSON.parse(await fs.readFile(databaseFile, 'utf8'));
  const rawCreated = rawData.announcements.find((announcement) => announcement.id === created.id);
  assert.equal(rawCreated.clubId, 'IEEE001');
  assert.equal(rawCreated.author, 'AnnouncementsPresident');

  const updatedResponse = await request(`/api/announcements/${created.id}`, auth(president.token, {
    method: 'PATCH',
    body: JSON.stringify({ title: 'Updated Announcement', content: 'Updated content', clubId: 'OTHER001' })
  }));
  assert.equal(updatedResponse.status, 200);
  assert.equal((await updatedResponse.json()).data.announcement.title, 'Updated Announcement');

  const deletedResponse = await request(`/api/announcements/${created.id}`, auth(president.token, { method: 'DELETE' }));
  assert.equal(deletedResponse.status, 200);
  assert.equal((await request(`/api/announcements/${created.id}`)).status, 404);
});

test('Volunteer and Web User permissions are enforced', async () => {
  const volunteer = await login(accounts.volunteer);
  const webUser = await login(accounts.webUser);
  assert.equal((await request('/api/announcements', { headers: { Authorization: `Bearer ${volunteer.token}` } })).status, 200);
  assert.equal((await request('/api/announcements', { headers: { Authorization: `Bearer ${webUser.token}` } })).status, 200);

  const payload = JSON.stringify({ title: 'Not Allowed', content: 'No' });
  assert.equal((await request('/api/announcements', auth(volunteer.token, { method: 'POST', body: payload }))).status, 403);
  assert.equal((await request('/api/announcements', auth(webUser.token, { method: 'POST', body: payload }))).status, 403);
});

test('Unauthenticated management and cross-club access are denied', async () => {
  assert.equal((await request('/api/announcements', { method: 'POST', body: JSON.stringify({ title: 'No token', content: 'Denied' }) })).status, 401);
  const president = await login(accounts.president);
  assert.equal((await request('/api/announcements/announcement-other-private', { headers: { Authorization: `Bearer ${president.token}` } })).status, 404);
  assert.equal((await request('/api/announcements/announcement-other-private', { method: 'PATCH', headers: { Authorization: `Bearer ${president.token}` }, body: JSON.stringify({ title: 'Denied' }) })).status, 404);
  assert.equal((await request('/api/announcements/announcement-other-private', { method: 'DELETE', headers: { Authorization: `Bearer ${president.token}` } })).status, 404);
});
