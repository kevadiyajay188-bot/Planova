/**
 * Event Planning AI Service
 * Synthesizes current event parameters, historical event precedents, volunteer skills,
 * and knowledge documents into a structured operational event plan.
 */

class EventPlanningService {
  constructor({ historicalService, volunteerService, riskService, budgetService, retrievalService }) {
    this.historicalService = historicalService;
    this.volunteerService = volunteerService;
    this.riskService = riskService;
    this.budgetService = budgetService;
    this.retrievalService = retrievalService;
  }

  async generatePlan(eventInput) {
    const name = eventInput.name || 'Campus Tech Event';
    const type = eventInput.type || 'Hackathon';
    const eventDate = eventInput.eventDate ? new Date(eventInput.eventDate) : new Date(Date.now() + 20 * 24 * 60 * 60 * 1000);
    const expectedAttendance = eventInput.expectedAttendance || 450;
    const budgetPlanned = eventInput.budgetPlanned || 10000;

    // 1. Analyze historical similarity
    const similarityResult = await this.historicalService.findSimilarEvents({
      name,
      type,
      expectedAttendance,
      budgetPlanned
    });

    const topSimilar = similarityResult.similarEvents.slice(0, 2);
    const similarNames = topSimilar.map(s => s.event.name).join(' and ') || 'past club events';

    // 2. Fetch recurring task patterns
    const taskPatterns = await this.historicalService.getRecurringTaskPatterns(type);

    // 3. Recommended Phased Tasks with Dates & Dependencies
    const plannedTasks = taskPatterns.map((pattern, idx) => {
      const targetDate = new Date(eventDate.getTime() - pattern.avgDaysBeforeEvent * 24 * 60 * 60 * 1000);
      return {
        id: `plan-task-${idx + 1}`,
        title: pattern.title,
        category: pattern.category,
        priority: pattern.category === 'Permissions' || pattern.category === 'Sponsorship' ? 'High' : 'Medium',
        dueDate: targetDate.toISOString(),
        suggestedDeadline: `${pattern.avgDaysBeforeEvent} days before event (${targetDate.toLocaleDateString()})`,
        dependencies: pattern.dependencies,
        historicalEvidence: `Appeared in ${pattern.frequency} similar events (${similarNames}). Historical completion took ~${pattern.avgCompletionDurationDays} days.`,
        recommendationRationale: pattern.recommendation
      };
    });

    // 4. Proactive Historical Risks & Mitigations
    const risks = [
      {
        id: 'plan-risk-1',
        title: 'Auditorium Permission Delay Risk',
        severity: 'Critical',
        likelihood: 'High',
        evidence: `Permissions were delayed in 3 of 4 previous similar events (${similarNames}) due to campus administrative queue.`,
        mitigationTask: 'Submit Form 4B to Dean of Student Affairs 14 days before execution',
        assignedVertical: 'Logistics'
      },
      {
        id: 'plan-risk-2',
        title: 'Sound & Audio-Visual Budget Overrun',
        severity: 'Medium',
        likelihood: 'Medium',
        evidence: 'TechNova 2025 incurred a $650 overrun on Central Auditorium acoustic tuning.',
        mitigationTask: 'Lock AV equipment rental vendor contract with fixed rate cap 10 days before',
        assignedVertical: 'Finance'
      },
      {
        id: 'plan-risk-3',
        title: 'Volunteer Workload Imbalance during Setup',
        severity: 'High',
        likelihood: 'Medium',
        evidence: 'RoboQuest 2025 post-mortem noted 2 leads carried >8 tasks during day-of execution.',
        mitigationTask: 'Enforce max 6 active tasks per volunteer and assign junior shadow volunteers',
        assignedVertical: 'Operations'
      }
    ];

    // 5. Recommended Key Milestones
    const milestones = [
      { name: 'Phase 1: Concept & Approvals Signed', targetDaysBefore: 14 },
      { name: 'Phase 2: Sponsor & Venue Lockdown', targetDaysBefore: 10 },
      { name: 'Phase 3: Promotion & Attendee Registration Live', targetDaysBefore: 7 },
      { name: 'Phase 4: AV Line Check & Volunteer Briefing', targetDaysBefore: 2 },
      { name: 'Phase 5: Day of Execution & Live Operations', targetDaysBefore: 0 }
    ];

    return {
      eventName: name,
      eventType: type,
      expectedAttendance,
      budgetPlanned,
      confidenceNote: similarityResult.confidenceNote,
      historicalPrecedents: topSimilar.map(s => ({
        name: s.event.name,
        similarity: s.similarity,
        reasons: s.reasons
      })),
      tasks: plannedTasks,
      risks,
      milestones,
      volunteerRequirements: [
        { role: 'Stage Management', count: 2, requiredSkill: 'Stage Management' },
        { role: 'Sponsorship & Finance', count: 2, requiredSkill: 'Sponsorship' },
        { role: 'Registration & Check-in', count: 3, requiredSkill: 'Registration' },
        { role: 'Technical & AV Setup', count: 2, requiredSkill: 'Technical Setup' }
      ]
    };
  }

  /**
   * Deliverable #1: Strict JSON event plan generation with 25-35 tasks across verticals
   * and hard date clamping between today and event end date.
   */
  async generateFullPlan(input, aiModel = null) {
    const title = input.title || input.name || 'Campus Hackathon 2026';
    const type = input.type || 'Hackathon';
    const today = input.todayDate ? new Date(input.todayDate) : new Date();
    const todayIso = today.toISOString();
    
    // Parse date range
    let startDate = input.startDate ? new Date(input.startDate) : null;
    let endDate = input.endDate ? new Date(input.endDate) : null;
    if (!endDate && input.dateRange) {
      const parts = String(input.dateRange).split(/to|-|\u2013/).map(s => s.trim());
      if (parts[0]) startDate = new Date(parts[0]);
      if (parts[1]) endDate = new Date(parts[1]);
    }
    if (!endDate || Number.isNaN(endDate.getTime())) {
      // Default to 3 weeks from today
      endDate = new Date(today.getTime() + 21 * 24 * 60 * 60 * 1000);
    }
    if (!startDate || Number.isNaN(startDate.getTime())) {
      startDate = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000);
    }
    if (endDate <= today) {
      endDate = new Date(today.getTime() + 21 * 24 * 60 * 60 * 1000);
    }

    const budget = Number(input.budget) || 12000;
    const teamSize = Number(input.teamSize) || 30;
    const rawVerticals = input.verticals || ['Logistics', 'Technical', 'Marketing', 'Sponsorship', 'Operations'];
    const verticals = Array.isArray(rawVerticals) ? rawVerticals : String(rawVerticals).split(',').map(v => v.trim()).filter(Boolean);

    let generatedPlan = null;

    if (aiModel && typeof aiModel.callGemini === 'function') {
      try {
        const prompt = `You are Planova's expert AI Campus Event Planner.
Generate a comprehensive operational event plan for:
- Event Title: ${title}
- Event Type: ${type}
- Date Range: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()} (Duration: ~${Math.round((endDate - today) / (1000 * 60 * 60 * 24))} days)
- Total Budget: $${budget}
- Club Verticals: ${verticals.join(', ')}
- Core Team Size: ${teamSize} volunteers
- Today's Date: ${today.toISOString().split('T')[0]}

STRICT REQUIREMENT: Output must be valid, parseable JSON with NO markdown codeblocks or extra prose.
The schema is:
{
  "tasks": [
    {
      "title": "Task title (actionable, 5-15 words)",
      "vertical": "One of: ${verticals.join(', ')}",
      "priority": "P1" | "P2" | "P3",
      "dueAt": "ISO date string between ${today.toISOString().split('T')[0]} and ${endDate.toISOString().split('T')[0]}",
      "estimateHours": 3
    }
  ],
  "milestones": [
    {
      "title": "Milestone description",
      "dueAt": "ISO date string"
    }
  ],
  "budgetLines": [
    {
      "category": "Category name",
      "allocated": 1500,
      "description": "Justification"
    }
  ]
}

CRITICAL: Generate between 25 and 35 granular, realistic tasks evenly spread across all listed verticals.
Every task dueAt MUST fall strictly between ${today.toISOString().split('T')[0]} and ${endDate.toISOString().split('T')[0]}.`;

        const response = await aiModel.callGemini({ prompt, systemPrompt: 'You output STRICT JSON only. Do not enclose in backticks if possible, or use standard JSON.' });
        let text = response.text || '';
        text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed.tasks) && parsed.tasks.length >= 10) {
          generatedPlan = parsed;
        }
      } catch (err) {
        console.warn('[EventPlanningService] Gemini call failed or returned invalid JSON. Using deterministic plan generator:', err.message);
      }
    }

    // Fallback or guarantee 25-35 tasks across verticals
    if (!generatedPlan || !Array.isArray(generatedPlan.tasks) || generatedPlan.tasks.length < 20) {
      generatedPlan = this._buildDeterministicPlan({ title, type, today, startDate, endDate, budget, verticals, teamSize });
    }

    // Code Validation & Clamping: Every dueAt MUST fall between today and endDate
    const todayMs = today.getTime();
    const endMs = endDate.getTime();
    const durationMs = Math.max(24 * 60 * 60 * 1000, endMs - todayMs);

    const clampedTasks = (generatedPlan.tasks || []).map((task, idx) => {
      let taskDue = task.dueAt ? new Date(task.dueAt) : null;
      if (!taskDue || Number.isNaN(taskDue.getTime()) || taskDue.getTime() <= todayMs) {
        // Distribute proportionally across the timeline
        const offset = Math.floor(((idx + 1) / (generatedPlan.tasks.length + 1)) * durationMs);
        taskDue = new Date(todayMs + offset);
      } else if (taskDue.getTime() >= endMs) {
        taskDue = new Date(endMs - 12 * 60 * 60 * 1000); // 12h before event end
      }
      taskDue.setHours(18, 0, 0, 0);

      const vertical = verticals.includes(task.vertical) ? task.vertical : verticals[idx % verticals.length];
      const priority = ['P1', 'P2', 'P3'].includes(task.priority) ? task.priority : (idx % 3 === 0 ? 'P1' : idx % 3 === 1 ? 'P2' : 'P3');
      const estimateHours = Number(task.estimateHours) || (2 + (idx % 8));

      return {
        id: `ai-plan-task-${idx + 1}-${Date.now()}`,
        title: task.title || `Execute ${vertical} preparation milestone ${idx + 1}`,
        vertical,
        priority,
        dueAt: taskDue.toISOString(),
        estimateHours,
        source: 'ai_plan',
        status: 'todo'
      };
    });

    const clampedMilestones = (generatedPlan.milestones || []).map((m, idx) => {
      let mDue = m.dueAt ? new Date(m.dueAt) : null;
      if (!mDue || Number.isNaN(mDue.getTime()) || mDue.getTime() <= todayMs || mDue.getTime() >= endMs) {
        mDue = new Date(todayMs + Math.floor(((idx + 1) / ((generatedPlan.milestones || []).length + 1)) * durationMs));
      }
      return {
        id: `ms-${idx + 1}`,
        title: m.title || `Phase ${idx + 1} Lockdown`,
        dueAt: mDue.toISOString()
      };
    });

    return {
      success: true,
      eventTitle: title,
      eventType: type,
      dateRange: { start: startDate.toISOString(), end: endDate.toISOString() },
      totalBudget: budget,
      taskCount: clampedTasks.length,
      tasks: clampedTasks,
      milestones: clampedMilestones,
      budgetLines: generatedPlan.budgetLines || [
        { category: 'Venue & Audio-Visual', allocated: Math.round(budget * 0.35), description: 'Auditorium booking, acoustic tuning, high-output power breakers' },
        { category: 'Catering & Refreshments', allocated: Math.round(budget * 0.25), description: 'Meals, coffee, water stations, dietary requirements' },
        { category: 'Prizes & Swag', allocated: Math.round(budget * 0.20), description: 'Winner cash prizes, trophies, sticker packs, lanyards' },
        { category: 'Marketing & Printables', allocated: Math.round(budget * 0.12), description: 'Stage backdrop banners, campus flyers, social media ads' },
        { category: 'Contingency Reserve', allocated: Math.round(budget * 0.08), description: 'Emergency repairs, replacement hardware, expedited shipping' }
      ]
    };
  }

  _buildDeterministicPlan({ title, type, today, startDate, endDate, budget, verticals, teamSize }) {
    const defaultTemplates = [
      // Logistics (6 tasks)
      { title: 'Submit Central Auditorium Form 4B air-conditioning & power permission', vertical: 'Logistics', priority: 'P1', estimateHours: 4, dayRatio: 0.15 },
      { title: 'Inspect auditorium high-amp 15A electrical breakers and test 3-phase line', vertical: 'Logistics', priority: 'P1', estimateHours: 5, dayRatio: 0.35 },
      { title: 'Procure 60 commercial heavy-duty power strips and surge protectors', vertical: 'Logistics', priority: 'P2', estimateHours: 3, dayRatio: 0.45 },
      { title: 'Coordinate campus security clearance and campus EMT medical standby', vertical: 'Logistics', priority: 'P1', estimateHours: 4, dayRatio: 0.60 },
      { title: 'Finalize venue floor layout map with team tables and mentor booths', vertical: 'Logistics', priority: 'P2', estimateHours: 6, dayRatio: 0.70 },
      { title: 'Setup overnight green-room hospitality and quiet resting lounge', vertical: 'Logistics', priority: 'P3', estimateHours: 3, dayRatio: 0.85 },

      // Technical (6 tasks)
      { title: 'Deploy live participant registration and QR ticket issuance dashboard', vertical: 'Technical', priority: 'P1', estimateHours: 8, dayRatio: 0.20 },
      { title: 'Configure dedicated high-density Wi-Fi SSID and bandwidth throttle limits', vertical: 'Technical', priority: 'P1', estimateHours: 6, dayRatio: 0.50 },
      { title: 'Build automated submission portal and GitHub webhook verification pipeline', vertical: 'Technical', priority: 'P2', estimateHours: 10, dayRatio: 0.55 },
      { title: 'Implement judge evaluation scoring rubric and live leaderboard portal', vertical: 'Technical', priority: 'P2', estimateHours: 7, dayRatio: 0.65 },
      { title: 'Run end-to-end rehearsal of presentation streaming and projector inputs', vertical: 'Technical', priority: 'P1', estimateHours: 4, dayRatio: 0.80 },
      { title: 'Prepare offline backup scoring sheets and USB emergency software packages', vertical: 'Technical', priority: 'P3', estimateHours: 2, dayRatio: 0.90 },

      // Marketing (6 tasks)
      { title: 'Design and publish primary social teaser posters and registration reels', vertical: 'Marketing', priority: 'P2', estimateHours: 5, dayRatio: 0.15 },
      { title: 'Distribute print posters across engineering and science campus boards', vertical: 'Marketing', priority: 'P3', estimateHours: 4, dayRatio: 0.30 },
      { title: 'Launch Instagram sponsor spotlight countdown posts across partner accounts', vertical: 'Marketing', priority: 'P2', estimateHours: 4, dayRatio: 0.50 },
      { title: 'Send bulk email newsletter to 2,000+ past campus hackathon participants', vertical: 'Marketing', priority: 'P2', estimateHours: 3, dayRatio: 0.60 },
      { title: 'Order vinyl stage banners, photo-booth backdrop, and direction signage', vertical: 'Marketing', priority: 'P1', estimateHours: 5, dayRatio: 0.40 },
      { title: 'Brief student media photographers and videographers on key shot list', vertical: 'Marketing', priority: 'P3', estimateHours: 2, dayRatio: 0.85 },

      // Sponsorship (5 tasks)
      { title: 'Draft and circulate Tier 1 Title and Tier 2 Associate sponsor brochures', vertical: 'Sponsorship', priority: 'P1', estimateHours: 6, dayRatio: 0.10 },
      { title: 'Follow up with 15 corporate tech partners for API credits and mentor slots', vertical: 'Sponsorship', priority: 'P2', estimateHours: 8, dayRatio: 0.30 },
      { title: 'Execute sponsor MoUs and collect company SVG logos for merchandise print', vertical: 'Sponsorship', priority: 'P1', estimateHours: 4, dayRatio: 0.45 },
      { title: 'Confirm advance 50% disbursement invoices for campus vendor payments', vertical: 'Sponsorship', priority: 'P1', estimateHours: 3, dayRatio: 0.55 },
      { title: 'Assemble sponsor VIP welcome kits and verify booth allocation tables', vertical: 'Sponsorship', priority: 'P3', estimateHours: 3, dayRatio: 0.85 },

      // Operations (6 tasks)
      { title: 'Publish volunteer recruitment form and conduct first onboarding briefing', vertical: 'Operations', priority: 'P2', estimateHours: 5, dayRatio: 0.25 },
      { title: 'Draft comprehensive 36-hour master run-of-show minute-by-minute schedule', vertical: 'Operations', priority: 'P1', estimateHours: 8, dayRatio: 0.40 },
      { title: 'Procure participant wristbands, custom lanyards, and team identifier badges', vertical: 'Operations', priority: 'P2', estimateHours: 4, dayRatio: 0.50 },
      { title: 'Lock catering contracts for 4 meals and midnight snack station delivery', vertical: 'Operations', priority: 'P1', estimateHours: 5, dayRatio: 0.60 },
      { title: 'Assign volunteer shift rotations ensuring maximum 6 active tasks per lead', vertical: 'Operations', priority: 'P2', estimateHours: 4, dayRatio: 0.75 },
      { title: 'Print emergency contact sheets and distribute walkie-talkie channel guide', vertical: 'Operations', priority: 'P1', estimateHours: 2, dayRatio: 0.90 }
    ];

    const todayMs = today.getTime();
    const endMs = endDate.getTime();
    const totalDuration = Math.max(86400000, endMs - todayMs);

    const tasks = defaultTemplates.map((tpl, i) => {
      const targetMs = todayMs + Math.round(tpl.dayRatio * totalDuration);
      const dueAt = new Date(Math.min(endMs - 3600000, Math.max(todayMs + 86400000, targetMs)));
      dueAt.setHours(18, 0, 0, 0);

      return {
        title: tpl.title,
        vertical: tpl.vertical,
        priority: tpl.priority,
        dueAt: dueAt.toISOString(),
        estimateHours: tpl.estimateHours
      };
    });

    const milestones = [
      { title: 'Phase 1: Approvals & Sponsorship Lockdown', dueAt: new Date(todayMs + 0.25 * totalDuration).toISOString() },
      { title: 'Phase 2: Registration Launch & Infrastructure Testing', dueAt: new Date(todayMs + 0.50 * totalDuration).toISOString() },
      { title: 'Phase 3: Catering, Merchandise & Logistics Lockdown', dueAt: new Date(todayMs + 0.75 * totalDuration).toISOString() },
      { title: 'Phase 4: Day-0 AV Line Checks & Final Run-Through', dueAt: new Date(endMs - 86400000).toISOString() }
    ];

    return { tasks, milestones };
  }
}

module.exports = { EventPlanningService };


