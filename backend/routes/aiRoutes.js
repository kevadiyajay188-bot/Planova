const { readJson, sendJson, success, failure } = require('../utils/http');

async function handleAiRoutes(request, response, url, context) {
  const { pathname } = url;
  const user = context.user;
  const orchestrator = context.aiOrchestrator;

  if (!orchestrator) {
    return failure(response, 500, 'AI Orchestrator is not initialized.');
  }

  // 1. Copilot Conversational & Action Pipeline
  if (request.method === 'POST' && pathname === '/api/ai/copilot') {
    const body = await readJson(request);
    const result = await orchestrator.processCopilotQuery({
      message: body.message || body.query,
      user,
      context: body.context || {}
    });
    return sendJson(response, 200, result);
  }

  // 2. Generate Event Plan
  if (request.method === 'POST' && pathname === '/api/ai/generate-plan') {
    const body = await readJson(request);
    const plan = await orchestrator.eventPlanningService.generatePlan(body);
    return sendJson(response, 200, plan);
  }

  // 3. Detect Risks
  if (request.method === 'POST' && pathname === '/api/ai/detect-risks') {
    const body = await readJson(request);
    const risks = await orchestrator.riskService.detectRisksForEvent(body.eventId);
    return sendJson(response, 200, risks);
  }

  // 4. Recommend Volunteers
  if (request.method === 'POST' && pathname === '/api/ai/recommend-volunteers') {
    const body = await readJson(request);
    const recommendations = await orchestrator.volunteerService.recommendVolunteersForTask(body);
    return sendJson(response, 200, recommendations);
  }

  // 5. Rebalance Workload
  if (request.method === 'POST' && pathname === '/api/ai/rebalance-workload') {
    const body = await readJson(request);
    const rebalance = await orchestrator.volunteerService.rebalanceWorkload(body);
    return sendJson(response, 200, rebalance);
  }

  // 6. Estimate / Analyze Budget
  if (request.method === 'POST' && pathname === '/api/ai/estimate-budget') {
    const body = await readJson(request);
    const budgetAnalysis = await orchestrator.budgetService.analyzeBudgetForEvent(body.eventId);
    return sendJson(response, 200, budgetAnalysis);
  }

  // 7. Analyze Meeting Transcript
  if (request.method === 'POST' && pathname === '/api/ai/analyze-meeting') {
    const body = await readJson(request);
    const meetingAnalysis = await orchestrator.meetingService.analyzeTranscript(body.transcript, body.meetingTitle);
    return sendJson(response, 200, meetingAnalysis);
  }

  // 8. RAG Knowledge Search
  if (request.method === 'POST' && pathname === '/api/ai/search-knowledge') {
    const body = await readJson(request);
    const data = await context.store.read();
    orchestrator.retrievalService.indexDocuments(data.documents || []);
    const searchResult = orchestrator.retrievalService.search(body.query || body.message);
    return sendJson(response, 200, searchResult);
  }

  // 9. AI Activity Log
  if (request.method === 'GET' && pathname === '/api/ai/activity') {
    const history = await orchestrator.activityLogger.getAiActivityHistory();
    return sendJson(response, 200, history);
  }

  // 10. Confirm Pending Action
  const confirmMatch = pathname.match(/^\/api\/ai\/confirm\/([^/]+)$/);
  if (request.method === 'POST' && confirmMatch) {
    const pendingId = confirmMatch[1];
    const result = await orchestrator.confirmPendingAction(pendingId, user);
    return sendJson(response, 200, result);
  }

  // 11. Undo AI Action
  const undoMatch = pathname.match(/^\/api\/ai\/undo\/([^/]+)$/);
  if (request.method === 'POST' && undoMatch) {
    const actionId = undoMatch[1];
    const result = await orchestrator.undoAction(actionId, user);
    return sendJson(response, 200, result);
  }

  // 12. Similar Events
  const similarMatch = pathname.match(/^\/api\/ai\/similar-events\/([^/]+)$/);
  if (request.method === 'GET' && similarMatch) {
    const eventId = similarMatch[1];
    const data = await context.store.read();
    const target = (data.events || []).find(e => e.id === eventId) || { id: eventId, type: 'Hackathon' };
    const similar = await orchestrator.historicalService.findSimilarEvents(target);
    return sendJson(response, 200, similar);
  }

  return failure(response, 404, 'AI API endpoint not found.');
}

module.exports = { handleAiRoutes };

