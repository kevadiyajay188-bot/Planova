const crypto = require('node:crypto');
const { getAiConfig, AUTONOMY_LEVELS } = require('../config/aiConfig');
const { AiModelService } = require('../models/aiModel');
const { AiPermissionService } = require('../permissions/aiPermissionService');
const { AiActivityLogger } = require('../activity/aiActivityLogger');
const { AiUndoService } = require('../activity/aiUndoService');
const { RetrievalService } = require('../rag/retrievalService');
const { HistoricalAnalysisService } = require('../services/historicalAnalysisService');
const { EventPlanningService } = require('../services/eventPlanningService');
const { RiskAnalysisService } = require('../services/riskAnalysisService');
const { VolunteerRecommendationService } = require('../services/volunteerRecommendationService');
const { BudgetAnalysisService } = require('../services/budgetAnalysisService');
const { MeetingAnalysisService } = require('../services/meetingAnalysisService');
const { ToolRegistry } = require('../tools/toolRegistry');
const { buildCopilotSystemPrompt } = require('../prompts/copilotPrompt');

class AiOrchestrator {
  constructor(store, envConfig = {}) {
    this.store = store;
    this.config = getAiConfig(envConfig);

    this.modelService = new AiModelService(this.config);
    this.permissionService = new AiPermissionService(this.config.autonomy);
    this.activityLogger = new AiActivityLogger(store);
    this.undoService = new AiUndoService(store);
    this.retrievalService = new RetrievalService({ similarityThreshold: this.config.similarityThreshold });

    this.historicalService = new HistoricalAnalysisService(store);
    this.riskService = new RiskAnalysisService(store);
    this.volunteerService = new VolunteerRecommendationService(store);
    this.budgetService = new BudgetAnalysisService(store);

    this.eventPlanningService = new EventPlanningService({
      historicalService: this.historicalService,
      volunteerService: this.volunteerService,
      riskService: this.riskService,
      budgetService: this.budgetService,
      retrievalService: this.retrievalService
    });

    this.meetingService = new MeetingAnalysisService(store);

    this.toolRegistry = new ToolRegistry({
      store,
      activityLogger: this.activityLogger,
      retrievalService: this.retrievalService,
      historicalService: this.historicalService,
      volunteerService: this.volunteerService,
      riskService: this.riskService,
      budgetService: this.budgetService,
      eventPlanningService: this.eventPlanningService
    });
    this.tools = this.toolRegistry;

    // In-memory pending confirmations map
    this.pendingConfirmations = new Map();
  }

  /**
   * Main conversational Copilot entrypoint
   */
  async processCopilotQuery({ message, user, context = {} }) {
    const rawQuery = String(message || '').trim();
    if (!rawQuery) {
      return { response: 'How can I assist you with your club event operations today?' };
    }

    const { normalizeCopilotRole, getToolsForRole, getContextForRole } = require('../utils/roleUtils');
    const role = normalizeCopilotRole(user);
    const eventId = context.eventId || context.currentEventId || 'evt-technova';

    // 1. Build Isolated Context per Role (Back-end enforced data security)
    const roleContext = await getContextForRole(role, user, eventId, this.store);
    const combinedContext = {
      ...roleContext,
      role,
      user: {
        id: user ? user.id : 'unknown',
        name: user ? user.name : (role === 'admin' ? 'President' : (role === 'volunteer' ? 'Volunteer' : 'Student')),
        role
      },
      clubName: context.clubName || 'IEEE Student Branch',
      eventName: context.eventName || 'TechNova Hackathon 2026',
      currentEventId: eventId
    };

    // 2. Build Tools Whitelist strictly per Role
    const availableTools = this.toolRegistry.getAllDefinitions(role);
    const systemPrompt = buildCopilotSystemPrompt({
      user: combinedContext.user,
      club: combinedContext.clubName,
      currentEvent: combinedContext.eventName,
      tools: availableTools,
      context: combinedContext
    });

    // 3. Model / Intent Classification with Role-Isolated Context
    const modelOutput = await this.modelService.generateCompletion({
      prompt: rawQuery,
      systemPrompt,
      tools: availableTools,
      context: combinedContext,
      user: combinedContext.user
    });

    const toolCall = modelOutput.toolCall;

    // If no tool selected or direct text refusal, provide direct response
    if (!toolCall || !toolCall.name) {
      return {
        role: 'ai',
        text: modelOutput.text || "I'm analyzing your request against our club's operational records.",
        confidence: modelOutput.confidence || 0.85
      };
    }

    const toolName = toolCall.name;
    const toolParams = toolCall.parameters || {};

    // 4. Strict Role & Tool Whitelist Gate
    const allowedTools = getToolsForRole(role);
    if (!allowedTools.includes(toolName)) {
      return {
        role: 'ai',
        text: `Action Denied: Tool '${toolName}' is not accessible for role '${role}'.`,
        permissionDenied: true,
        toolAttempted: toolName
      };
    }

    // 5. Autonomy & Confirmation Check
    const needsConfirmation = this.permissionService.requiresConfirmation(toolName, context.autonomyOverride);

    if (needsConfirmation) {
      const pendingId = `pending-${crypto.randomUUID().slice(0, 8)}`;
      this.pendingConfirmations.set(pendingId, {
        id: pendingId,
        toolName,
        params: toolParams,
        user,
        context: combinedContext,
        query: rawQuery,
        createdAt: new Date().toISOString()
      });

      const description = this.formatActionPreview(toolName, toolParams);
      return {
        role: 'ai',
        text: `Planova AI proposes: ${description}.\n\nThis action modifies club data. Please confirm to proceed.`,
        requiresConfirmation: true,
        pendingActionId: pendingId,
        toolName,
        preview: description
      };
    }

    // 6. Safe / Auto Tool Execution
    return await this.executeToolDirectly({
      toolName,
      params: toolParams,
      user,
      query: rawQuery
    });
  }

  formatActionPreview(toolName, params) {
    switch (toolName) {
      case 'rebalance_workload':
        return `Rebalance tasks away from overloaded volunteers (threshold: ${params.threshold || 6} active tasks)`;
      case 'generate_event_plan':
        return `Generate end-to-end plan with tasks, risks, and deadlines for '${params.name || 'Event'}'`;
      case 'assign_task':
        return `Assign volunteer '${params.volunteerId}' to task '${params.taskId}'`;
      case 'update_deadline':
        return `Shift deadline for task '${params.taskId}' to ${params.newDeadlineDays} days from now`;
      case 'delete_task':
        return `Delete task '${params.taskId}' permanently from board`;
      case 'create_announcement':
        return `Publish announcement: '${params.title}'`;
      default:
        return `Execute operation '${toolName}'`;
    }
  }

  async executeToolDirectly({ toolName, params, user, query }) {
    try {
      const toolResult = await this.toolRegistry.execute(toolName, params, user);
      const formattedText = this.formatToolResultText(toolName, toolResult, query);

      return {
        role: 'ai',
        text: formattedText,
        toolExecuted: toolName,
        data: toolResult,
        actionId: toolResult.actionId || null,
        undoable: Boolean(toolResult.actionId)
      };
    } catch (error) {
      return {
        role: 'ai',
        text: `Error executing tool '${toolName}': ${error.message}`,
        error: true
      };
    }
  }

  formatToolResultText(toolName, result, query) {
    if (toolName === 'find_free_volunteers') {
      const recs = result.recommendedVolunteers || [];
      if (recs.length === 0) return 'No volunteers currently match the availability criteria.';
      const list = recs.map(v => `• ${v.name} (${v.activeTasks} active tasks) — ${v.reasons.join(', ')}`).join('\n');
      return `Recommended Volunteers:\n${list}`;
    }

    if (toolName === 'search_documents') {
      return result.answer;
    }

    if (toolName === 'find_similar_events') {
      const events = (result.similarEvents || []).map(s => `• ${s.event.name} (${Math.round(s.similarity * 100)}% match) — ${s.reasons.join(', ')}`).join('\n');
      return `Similar Historical Events (${result.confidenceNote}):\n${events || 'No similar events found.'}`;
    }

    if (toolName === 'get_event_budget') {
      const b = result.budget;
      return `Budget Analysis for ${result.eventName}:\nPlanned: $${b.totalPlanned.toLocaleString()} | Committed: $${b.committed.toLocaleString()} | Spent: $${b.spent.toLocaleString()} (${b.utilizedPercent}% utilized).\n${result.explanation}`;
    }

    if (toolName === 'create_task') {
      return `Successfully created task "${result.task.title}" (Due: ${new Date(result.task.dueDate).toLocaleDateString()}). Real database record added and logged to activity feed.`;
    }

    if (toolName === 'generate_event_plan') {
      return `Generated operational plan for "${result.plan.eventName}"! Created ${result.createdTasksCount} tasks based on historical precedents from ${result.plan.historicalPrecedents.map(h => h.name).join(' and ')}.`;
    }

    if (toolName === 'rebalance_workload') {
      if (!result.rebalanced) return result.message;
      return `Workload rebalanced successfully! Moved tasks away from overloaded members to prevent burnout.`;
    }

    if (toolName === 'update_deadline') {
      return `Deadline updated for "${result.task.title}". Notice: ${result.warning}`;
    }

    if (toolName === 'create_announcement') {
      return `Announcement "${result.announcement.title}" broadcasted to ${result.announcement.audience}.`;
    }

    if (toolName === 'create_meeting_action') {
      return `Action item created from meeting transcript: "${result.task.title}".`;
    }

    if (toolName === 'get_my_tasks') {
      const tasks = result.tasks || [];
      if (tasks.length === 0) return 'You have no pending assigned tasks for this event.';
      const list = tasks.map(t => `• ${t.title} [Priority: ${t.priority || 'Normal'}, Due: ${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'TBD'}]`).join('\n');
      return `Here are your assigned tasks (${tasks.length} total):\n${list}`;
    }

    if (toolName === 'mark_task_done') {
      return `Task "${result.task ? result.task.title : 'Task'}" has been marked as done. Your active workload has been updated.`;
    }

    if (toolName === 'get_my_shifts') {
      const shifts = result.shifts || [];
      if (shifts.length === 0) return 'No shifts currently scheduled for your profile.';
      const list = shifts.map(s => `• ${s}`).join('\n');
      return `Your scheduled shift hours:\n${list}`;
    }

    if (toolName === 'raise_risk') {
      return result.message || `Risk reported to core team Risk Radar: "${result.risk?.title}".`;
    }

    if (toolName === 'search_events') {
      const events = result.events || [];
      if (events.length === 0) return 'No matching campus events or hackathons found.';
      const list = events.map(e => `• ${e.title} (${e.type || 'Event'}) — ${new Date(e.eventDate).toLocaleDateString()} at ${e.venue}. RSVP: ${e.registrationUrl}`).join('\n');
      return `Found ${events.length} campus event(s):\n${list}`;
    }

    if (toolName === 'get_event_details') {
      return `Event: ${result.title}\nDate: ${new Date(result.eventDate).toLocaleDateString()}\nVenue: ${result.venue}\nDetails: ${result.description}\nRegistration: ${result.registrationUrl}`;
    }

    if (toolName === 'save_event') {
      return `Event saved to your personal bookmarks.`;
    }

    if (toolName === 'search_knowledge') {
      return result.answer || 'Information retrieved from knowledge base.';
    }

    return `Completed action [${toolName}] successfully.`;
  }

  /**
   * Confirm and execute a pending risky AI action
   */
  async confirmPendingAction(pendingId, user) {
    const pending = this.pendingConfirmations.get(pendingId);
    if (!pending) {
      throw Object.assign(new Error(`Pending action '${pendingId}' not found or expired.`), { status: 404 });
    }

    this.pendingConfirmations.delete(pendingId);

    // Permission re-verification at confirmation execution time
    const perm = this.permissionService.canExecuteTool(user || pending.user, pending.toolName);
    if (!perm.allowed) {
      throw Object.assign(new Error(`Permission denied: ${perm.reason}`), { status: 403 });
    }

    return await this.executeToolDirectly({
      toolName: pending.toolName,
      params: pending.params,
      user: user || pending.user,
      query: pending.query
    });
  }

  cancelPendingAction(pendingId) {
    const exists = this.pendingConfirmations.has(pendingId);
    if (exists) this.pendingConfirmations.delete(pendingId);
    return { cancelled: exists };
  }

  async undoAction(actionId, user) {
    return await this.undoService.undoAction(actionId, user);
  }
}

module.exports = { AiOrchestrator };

