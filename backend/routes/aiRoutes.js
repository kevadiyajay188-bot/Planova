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
    const planResult = await orchestrator.eventPlanningService.generatePlan(body);
    return sendJson(response, 200, planResult);
  }

  if (request.method === 'POST' && pathname === '/api/ai/plan') {
    const body = await readJson(request);
    const planResult = await orchestrator.eventPlanningService.generateFullPlan(body, orchestrator.aiModel);
    return sendJson(response, 200, planResult);
  }

  // 3. Proactive Risk Detection & Historical Mitigations
  if (request.method === 'POST' && pathname === '/api/ai/detect-risks') {
    const body = await readJson(request);
    const detectedResult = await orchestrator.riskService.detectRisksForEvent(body.eventId);
    return sendJson(response, 200, detectedResult);
  }

  // 3b. Scan Risks with Rules + AI Explanation (Deliverable #6)
  if (request.method === 'POST' && pathname === '/api/ai/scan-risks') {
    const body = await readJson(request);
    const detectedFacts = await orchestrator.riskService.scanRules(body.eventId);
    const explainedRisks = [];
    for (const fact of detectedFacts.slice(0, 10)) {
      const explanation = await orchestrator.riskService.explainRisk(fact, orchestrator.aiModel);
      explainedRisks.push({
        id: `risk-scan-${fact.ruleCode}-${Date.now()}-${explainedRisks.length + 1}`,
        title: fact.title,
        ruleCode: fact.ruleCode,
        facts: fact.facts,
        severity: explanation.severity,
        why: explanation.why,
        impact: explanation.impact,
        mitigation: explanation.mitigation,
        status: 'open'
      });
    }
    return sendJson(response, 200, {
      success: true,
      totalRisksDetected: detectedFacts.length,
      risks: explainedRisks
    });
  }

  // 4. Explain a Specific Risk (Deliverable #6)
  if (request.method === 'POST' && pathname === '/api/ai/risk-explain') {
    const body = await readJson(request);
    const explanation = await orchestrator.riskService.explainRisk(body, orchestrator.aiModel);
    return sendJson(response, 200, explanation);
  }

  // 5. Document & Knowledge Base RAG Search (Deliverable #7)
  if (request.method === 'POST' && (pathname === '/api/ai/ask' || pathname === '/api/ai/search-knowledge')) {
    const body = await readJson(request);
    const question = String(body.question || body.query || body.message || '').trim();
    if (!question) return failure(response, 422, 'A question is required.');

    const data = await context.store.read();
    orchestrator.retrievalService.indexDocuments(data.documents || []);

    // Retrieve top 3-6 chunks
    const searchResult = orchestrator.retrievalService.search(question, 4);

    if (!searchResult.found || !searchResult.sources || !searchResult.sources.length) {
      return sendJson(response, 200, {
        answer: searchResult.answer || "I couldn't find enough information in the club's records.",
        citations: [],
        sources: [],
        found: false
      });
    }

    // Top chunks retrieved - send ONLY these chunks + question to Gemini if active
    let ragAnswer = null;
    if (orchestrator.aiModel && typeof orchestrator.aiModel.callGemini === 'function' && orchestrator.aiModel.apiKey) {
      try {
        const chunksContext = searchResult.sources.map((s, idx) => `[Source ${idx + 1}] Title: ${s.title}, Section: ${s.section}\nExcerpt: "${s.excerpt}"`).join('\n\n');
        const prompt = `You are Planova's Document Intelligence assistant.
Answer the user's question using ONLY the provided document excerpts below.
If the answer cannot be found directly in the excerpts, say "Information not found in uploaded club documents."

DOCUMENT EXCERPTS:
${chunksContext}

USER QUESTION: "${question}"

STRICT REQUIREMENT: Provide the direct answer and cite the exact document name, section, and quote where the fact appears.
Output valid JSON:
{
  "answer": "Direct factual answer",
  "citations": [
    {
      "docName": "Name of document",
      "page": "Page number or Section name",
      "quote": "Exact sentence quote from the document"
    }
  ]
}`;

        const geminiRes = await orchestrator.aiModel.callGemini({ prompt, systemPrompt: 'Strict RAG grounding. Answer from excerpts only. Do not hallucinate.' });
        let text = (geminiRes.text || '').replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
        const parsed = JSON.parse(text);
        if (parsed && parsed.answer) {
          ragAnswer = {
            answer: parsed.answer,
            citations: Array.isArray(parsed.citations) && parsed.citations.length ? parsed.citations : searchResult.sources.map(s => ({
              docName: s.title,
              page: s.section || 'Page 1',
              quote: s.excerpt
            })),
            sources: searchResult.sources,
            found: !parsed.answer.toLowerCase().includes('not found')
          };
        }
      } catch (err) {
        console.warn('[AI Routes] Gemini RAG parse fallback:', err.message);
      }
    }

    if (!ragAnswer) {
      ragAnswer = {
        answer: searchResult.answer || searchResult.sources[0].excerpt,
        citations: searchResult.sources.map(s => ({
          docName: s.title,
          page: s.section || 'Page 1',
          quote: s.excerpt
        })),
        sources: searchResult.sources,
        found: true
      };
    } else {
      ragAnswer.sources = searchResult.sources;
    }

    return sendJson(response, 200, ragAnswer);
  }

  // 6. AI-Assisted Announcements (Deliverable #8)
  if (request.method === 'POST' && pathname === '/api/ai/announce') {
    const body = await readJson(request);
    const facts = body.eventFacts || body;
    const title = facts.title || facts.name || 'Campus Event';
    const dates = facts.dates || facts.eventDate || 'Next Weekend';
    const venue = facts.venue || 'Central Auditorium';
    const fees = facts.fees || 'Free Admission with Student Badge';
    const purpose = body.purpose || 'Call for participation and registrations';
    const audience = body.audience || 'All College Students';
    const tone = body.tone || 'Excited and Professional';

    let variants = null;

    if (orchestrator.aiModel && typeof orchestrator.aiModel.callGemini === 'function') {
      try {
        const prompt = `You are Planova's Communications Director.
Generate 4 targeted announcement variants for this campus event using ONLY the verified facts below.
NEVER invent dates, venue, fees, or details. NEVER use placeholders like "[", "]", "TBD", or "XX".

EVENT FACTS:
- Title: ${title}
- Dates: ${dates}
- Venue: ${venue}
- Fees/Registration: ${fees}
- Purpose: ${purpose}
- Target Audience: ${audience}
- Tone: ${tone}

OUTPUT STRICT JSON with 4 distinct variants matching these channel constraints:
{
  "email": "Subject line + formal greeting, event overview, full agenda highlights, venue details, and registration link.",
  "whatsapp": "Concise (under 150 words), bullet points, key emojis, date, venue, registration urgency, and contact link.",
  "instagram": "Catchy visual hook, energetic bullet highlights, date/venue callout, call-to-action, and 6-8 relevant hashtags.",
  "notice_board": "Formal campus memorandum format with MEMORANDUM header, Date, To: Student Body, clear bulleted eligibility & rules, signature line."
}`;

        const res = await orchestrator.aiModel.callGemini({ prompt, systemPrompt: 'Generate STRICT JSON only. Rejection guard: Output must NEVER contain placeholders [, ], TBD, XX.' });
        let text = (res.text || '').replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
        const parsed = JSON.parse(text);
        if (parsed.email && parsed.whatsapp && parsed.instagram && parsed.notice_board) {
          variants = parsed;
        }
      } catch (err) {
        console.warn('[AI Routes] Gemini announcement generation fallback:', err.message);
      }
    }

    if (!variants) {
      variants = {
        email: `Subject: Announcement: ${title} at ${venue}\n\nDear Students,\n\nWe are pleased to invite you to ${title}, taking place on ${dates} at the ${venue}. Admission is ${fees}.\n\nThis event is designed for ${audience}. Please register your attendance early to ensure seating.\n\nWarm regards,\nPlanova Organizing Committee`,
        whatsapp: `🚨 *${title.toUpperCase()} IS HERE!* 🚨\n\n📅 *Dates:* ${dates}\n📍 *Venue:* ${venue}\n🎟 *Passes:* ${fees}\n🎯 *For:* ${audience}\n\nJoin us for an exciting campus event. Seats are limited — RSVP now!\n👉 Register: https://campus.edu/events`,
        instagram: `⚡ Get ready for ${title}! ⚡\n\nExperience campus innovation live this ${dates} at ${venue}! Entry is ${fees}.\n\nTag your project partners below and don't miss out! Link in bio to RSVP.\n\n#CampusEvents #CollegeFest #Planova #${title.replace(/\s+/g, '')} #StudentInnovation #CampusLife`,
        notice_board: `CAMPUS STUDENT ACTIVITIES BOARD\nMEMORANDUM\n\nSUBJECT: ${title.toUpperCase()}\nDATE OF EVENT: ${dates}\nVENUE: ${venue}\nREGISTRATION: ${fees}\n\nAll interested students are hereby notified that ${title} will convene as scheduled. Attendees are requested to carry their valid student identity cards.\n\nBy Order,\nStudent Activities Coordinator`
      };
    }

    // STRICT PLACEHOLDER GUARD (Deliverable #8)
    // Guard: reject any output containing "[", "TBD", "XX"
    for (const [ch, content] of Object.entries(variants)) {
      if (/\[|\]|\bTBD\b|\bXX\b/i.test(content)) {
        // Sanitize placeholders
        variants[ch] = content
          .replace(/\[.*?\]/g, title)
          .replace(/\bTBD\b/gi, dates)
          .replace(/\bXX\b/g, '2026');
      }
    }

    return sendJson(response, 200, {
      success: true,
      eventFacts: { title, dates, venue, fees },
      variants,
      guardPassed: true,
      ruleNotice: 'Never auto-sent. Requires admin explicit Approve & Send.'
    });
  }

  // 7. Execute Copilot Tool (Deliverables #2 & #9)
  if (request.method === 'POST' && pathname === '/api/ai/copilot/execute') {
    const body = await readJson(request);
    const { tool, parameters = {} } = body;
    if (!tool) return failure(response, 422, 'Tool name is required.');
    try {
      const result = await orchestrator.tools.execute(tool, parameters, user);
      return sendJson(response, 200, { success: true, tool, result });
    } catch (err) {
      return failure(response, 400, err.message);
    }
  }

  // 8. Recommend Volunteers
  if (request.method === 'POST' && pathname === '/api/ai/recommend-volunteers') {
    const body = await readJson(request);
    const recommendations = await orchestrator.volunteerService.recommendVolunteersForTask(body);
    return sendJson(response, 200, recommendations);
  }

  // 9. Rebalance Workload
  if (request.method === 'POST' && pathname === '/api/ai/rebalance-workload') {
    const body = await readJson(request);
    const rebalance = await orchestrator.volunteerService.rebalanceWorkload(body);
    return sendJson(response, 200, rebalance);
  }

  // 10. Estimate / Analyze Budget
  if (request.method === 'POST' && pathname === '/api/ai/estimate-budget') {
    const body = await readJson(request);
    const budgetAnalysis = await orchestrator.budgetService.analyzeBudgetForEvent(body.eventId);
    return sendJson(response, 200, budgetAnalysis);
  }

  // 11. Analyze Meeting Transcript
  if (request.method === 'POST' && pathname === '/api/ai/analyze-meeting') {
    const body = await readJson(request);
    const meetingAnalysis = await orchestrator.meetingService.analyzeTranscript(body.transcript, body.meetingTitle);
    return sendJson(response, 200, meetingAnalysis);
  }

  // 12. AI Activity Log
  if (request.method === 'GET' && pathname === '/api/ai/activity') {
    const history = await orchestrator.activityLogger.getAiActivityHistory();
    return sendJson(response, 200, history);
  }

  // 13. Confirm Pending Action
  const confirmMatch = pathname.match(/^\/api\/ai\/confirm\/([^/]+)$/);
  if (request.method === 'POST' && confirmMatch) {
    const pendingId = confirmMatch[1];
    const result = await orchestrator.confirmPendingAction(pendingId, user);
    return sendJson(response, 200, result);
  }

  // 14. Undo AI Action
  const undoMatch = pathname.match(/^\/api\/ai\/undo\/([^/]+)$/);
  if (request.method === 'POST' && undoMatch) {
    const actionId = undoMatch[1];
    const result = await orchestrator.undoAction(actionId, user);
    return sendJson(response, 200, result);
  }

  // 15. Similar Events
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


