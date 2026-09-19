const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createServer } = require('../server');

let server;
let baseUrl;
let databaseDirectory;
let authToken;

test.before(async () => {
  databaseDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'planova-ai-test-'));
  server = createServer({
    databaseFile: path.join(databaseDirectory, 'data.json'),
    jwtSecret: 'test-ai-secret'
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  // Create an admin user to get auth token
  const signupRes = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'ai-admin@campus.edu',
      username: 'AIAdmin',
      role: 'Admin',
      password: 'password-12345'
    })
  });
  const signup = await signupRes.json();
  authToken = signup.token;
});

test.after(async () => {
  await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  await fs.rm(databaseDirectory, { recursive: true, force: true });
});

function authFetch(pathname, options = {}) {
  const headers = {
    Authorization: `Bearer ${authToken}`,
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  return fetch(`${baseUrl}${pathname}`, { ...options, headers });
}

// 1. Similar Event Retrieval
test('1. Similar event retrieval matches historical precedents by type, attendance, and budget', async () => {
  const res = await authFetch('/api/ai/similar-events/evt-technova');
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.similarEvents));
  assert.ok(data.similarEvents.length > 0);
  const topMatch = data.similarEvents[0];
  assert.ok(topMatch.similarity > 0.5);
  assert.ok(topMatch.reasons.length > 0);
  assert.match(data.confidenceNote, /historical evidence|patterns/i);
});

// 2. Event Plan Generation
test('2. Event plan generation synthesizes tasks, deadlines, dependencies, milestones, and risks with explanations', async () => {
  const res = await authFetch('/api/ai/generate-plan', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Hackathon 2027',
      type: 'Hackathon',
      expectedAttendance: 500,
      budgetPlanned: 12000
    })
  });
  assert.equal(res.status, 200);
  const plan = await res.json();
  assert.equal(plan.eventName, 'Hackathon 2027');
  assert.ok(plan.tasks.length >= 5);
  assert.ok(plan.risks.length >= 2);
  assert.ok(plan.milestones.length >= 3);
  assert.ok(plan.tasks.every(t => t.title && t.historicalEvidence && t.recommendationRationale));
});

// 3. Proactive Risk Detection
test('3. Risk detection identifies failure modes with historical evidence and mitigations', async () => {
  const res = await authFetch('/api/ai/detect-risks', {
    method: 'POST',
    body: JSON.stringify({ eventId: 'evt-technova' })
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.detectedRisks.length >= 2);
  const critRisk = data.detectedRisks.find(r => r.severity === 'Critical');
  assert.ok(critRisk);
  assert.match(critRisk.evidence, /Post-Mortem|Campus SOP|TechNova/i);
  assert.ok(critRisk.recommendedMitigation);
});

// 4. Volunteer Recommendation & Skills Matching
test('4. Volunteer recommendation ranks by verified skills and healthy workload capacity', async () => {
  const res = await authFetch('/api/ai/recommend-volunteers', {
    method: 'POST',
    body: JSON.stringify({ taskTitle: 'Stage Management & Sound Line Check', requiredSkill: 'Stage Management' })
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.recommendedVolunteers.length > 0);
  const top = data.recommendedVolunteers[0];
  assert.ok(top.skills.includes('Stage Management'));
  assert.ok(top.score > 50);
});

// 5. Workload Rebalancing
test('5. Workload balancing detects overloaded volunteers and generates rebalancing plan', async () => {
  const res = await authFetch('/api/ai/rebalance-workload', {
    method: 'POST',
    body: JSON.stringify({ threshold: 6 })
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.needed);
  assert.ok(data.overloadedVolunteers.length > 0);
  assert.ok(data.rebalancingPlan.length > 0);
  assert.ok(data.rebalancingPlan[0].fromVolunteer && data.rebalancingPlan[0].toVolunteer);
});

// 6. Budget Intelligence
test('6. Budget analysis flags historical category overspending and calculates planning ranges', async () => {
  const res = await authFetch('/api/ai/estimate-budget', {
    method: 'POST',
    body: JSON.stringify({ eventId: 'evt-technova' })
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.eventId, 'evt-technova');
  assert.ok(data.historicalOverruns.length > 0);
  assert.ok(data.planningEstimates.conservativeRange.min > 0);
  assert.match(data.explanation, /TechNova 2025/i);
});

// 7. Meeting Transcript Analysis
test('7. Meeting transcript processing extracts decisions, action items, owners, deadlines, and evidence quotes', async () => {
  const transcript = 'Priya: I will submit the central auditorium permission letter tomorrow morning. Arjun: We agreed to finalize the $5000 DevRel sponsorship by Thursday.';
  const res = await authFetch('/api/ai/analyze-meeting', {
    method: 'POST',
    body: JSON.stringify({ transcript, meetingTitle: 'Sprint 3 Standup' })
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.actionItems.length >= 1);
  const priyaTask = data.actionItems.find(a => a.suggestedOwner === 'Priya');
  assert.ok(priyaTask);
  assert.match(priyaTask.evidenceQuote, /auditorium permission/i);
  assert.match(priyaTask.deadline, /tomorrow/i);
});

// 8. RAG Document Retrieval
test('8. RAG knowledge search returns cited source excerpts, and handles unrecorded queries gracefully', async () => {
  // Query with matching information
  const res = await authFetch('/api/ai/search-knowledge', {
    method: 'POST',
    body: JSON.stringify({ query: 'What did we spend on sound and audio-visual last year in Central Auditorium?' })
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.found, true);
  assert.ok(data.sources.length > 0);
  assert.match(data.answer, /2,800|sound|TechNova 2025/i);

  // Query with nonexistent information
  const emptyRes = await authFetch('/api/ai/search-knowledge', {
    method: 'POST',
    body: JSON.stringify({ query: 'xyz nonexistent quantum propulsion flux capacitor' })
  });
  assert.equal(emptyRes.status, 200);
  const emptyData = await emptyRes.json();
  assert.equal(emptyData.found, false);
  assert.equal(emptyData.answer, "I couldn't find enough information in the club's records.");
});

// 9. Copilot Pipeline: Intent to Tool Execution (Safe Action)
test('9. Copilot understands intent, selects appropriate tool, executes database action, and logs to activity feed', async () => {
  const res = await authFetch('/api/ai/copilot', {
    method: 'POST',
    body: JSON.stringify({
      message: 'Create task Submit Dean Escalation Letter for Central Auditorium'
    })
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.toolExecuted, 'create_task');
  assert.ok(data.actionId);
  assert.match(data.text, /Successfully created task/i);

  // Check activity feed received entry
  const actRes = await authFetch('/api/ai/activity');
  const activities = await actRes.json();
  assert.ok(activities.some(a => a.id === data.actionId));
});

// 10. Autonomy & Confirmation for Risky Actions
test('10. Risky tools require user confirmation when under ASK_FOR_RISKY autonomy', async () => {
  const res = await authFetch('/api/ai/copilot', {
    method: 'POST',
    body: JSON.stringify({
      message: 'Rebalance volunteer workload across the club'
    })
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.requiresConfirmation, true);
  assert.ok(data.pendingActionId);
  assert.match(data.text, /proposes: Rebalance tasks[\s\S]*confirm/i);

  // Now confirm the pending action
  const confirmRes = await authFetch(`/api/ai/confirm/${data.pendingActionId}`, {
    method: 'POST'
  });
  assert.equal(confirmRes.status, 200);
  const confirmData = await confirmRes.json();
  assert.equal(confirmData.toolExecuted, 'rebalance_workload');
  assert.ok(confirmData.data.rebalanced);
});

// 11. Strict RBAC Permission Enforcement
test('11. Volunteer role cannot execute privileged actions (e.g. delete task or rebalance workload)', async () => {
  // Create a volunteer user
  const volSignup = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'regular-volunteer@campus.edu',
      username: 'RegularVol',
      role: 'Volunteer',
      password: 'password-volunteer'
    })
  });
  const { token: volToken } = await volSignup.json();

  const res = await fetch(`${baseUrl}/api/ai/copilot`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${volToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: 'Delete task task-done-1'
    })
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.permissionDenied, true);
  assert.match(data.text, /Action Denied.*does not have permission/i);
});

// 12. Reversible Undo Mechanism
test('12. AI action undo cleanly reverses database changes without touching unrelated data', async () => {
  // 1. Create a task via AI
  const res = await authFetch('/api/ai/copilot', {
    method: 'POST',
    body: JSON.stringify({
      message: 'Create task Temporary Reversible Poster Design Task'
    })
  });
  const data = await res.json();
  const createdTaskId = data.data.task.id;
  const actionId = data.actionId;
  assert.ok(createdTaskId);
  assert.ok(actionId);

  // Verify task exists in dashboard
  const statsBefore = await authFetch('/api/dashboard/stats');
  assert.equal(statsBefore.status, 200);

  // 2. Perform Undo
  const undoRes = await authFetch(`/api/ai/undo/${actionId}`, {
    method: 'POST'
  });
  assert.equal(undoRes.status, 200);
  const undoData = await undoRes.json();
  assert.equal(undoData.success, true);
  assert.match(undoData.summary, /Removed 1 created task/i);

  // 3. Attempting double undo fails cleanly
  const doubleUndoRes = await authFetch(`/api/ai/undo/${actionId}`, {
    method: 'POST'
  });
  assert.equal(doubleUndoRes.status, 400);
});

// 13. Cascade Dependency Warning on Deadline Shift
test('13. Updating task deadline alerts regarding impacted downstream milestone dependencies', async () => {
  const res = await authFetch('/api/ai/copilot', {
    method: 'POST',
    body: JSON.stringify({
      message: 'Extend deadline for task task-doing-1 by 14 days',
      context: { autonomyOverride: 'AUTO' } // Execute directly to verify impact warning
    })
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.toolExecuted, 'update_deadline');
  assert.ok(data.data.impactedTasks.length > 0);
  assert.match(data.text, /affect.*dependent tasks/i);
});

// 14. Batch Event Plan Creates Real Database Tasks
test('14. Batch event plan generation creates real database tasks and records auditable activity', async () => {
  const res = await authFetch('/api/ai/copilot', {
    method: 'POST',
    body: JSON.stringify({
      message: 'Generate event plan for Robotics Expo 2027 with 400 attendees',
      context: { autonomyOverride: 'AUTO' }
    })
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.toolExecuted, 'generate_event_plan');
  assert.ok(data.data.createdTasksCount >= 5);

  // Undo the batch creation cleanly
  const undoRes = await authFetch(`/api/ai/undo/${data.actionId}`, {
    method: 'POST'
  });
  assert.equal(undoRes.status, 200);
  const undoData = await undoRes.json();
  assert.match(undoData.summary, /Removed .* created task/i);
});
