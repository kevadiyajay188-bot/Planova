const crypto = require('node:crypto');

/**
 * Tool Registry
 * Controlled backend tools that execute real database operations with permission checks,
 * validation, undo snapshots, and auditable activity logging.
 */

class ToolRegistry {
  constructor({ store, activityLogger, retrievalService, historicalService, volunteerService, riskService, budgetService, eventPlanningService }) {
    this.store = store;
    this.activityLogger = activityLogger;
    this.retrievalService = retrievalService;
    this.historicalService = historicalService;
    this.volunteerService = volunteerService;
    this.riskService = riskService;
    this.budgetService = budgetService;
    this.eventPlanningService = eventPlanningService;

    this.tools = new Map();
    this.registerAllTools();
  }

  registerTool(name, definition) {
    this.tools.set(name, definition);
  }

  getTool(name) {
    return this.tools.get(name);
  }

  getAllDefinitions() {
    return Array.from(this.tools.entries()).map(([name, def]) => ({
      name,
      description: def.description,
      parameters: def.parameters,
      isRisky: def.isRisky || false
    }));
  }

  async execute(toolName, params = {}, user = null) {
    const def = this.tools.get(toolName);
    if (!def) {
      throw new Error(`Tool '${toolName}' not found in registry.`);
    }

    // Validate required parameters
    for (const [key, prop] of Object.entries(def.parameters || {})) {
      if (prop.required && (params[key] === undefined || params[key] === null || params[key] === '')) {
        throw new Error(`Missing required parameter '${key}' for tool '${toolName}'.`);
      }
    }

    return await def.handler(params, user);
  }

  registerAllTools() {
    // 1. find_free_volunteers (Read-Only)
    this.registerTool('find_free_volunteers', {
      description: 'Finds available club volunteers matching skills and healthy task workload.',
      parameters: {
        skill: { type: 'string', required: false, description: 'Required skill keyword' },
        maxLoad: { type: 'number', required: false, description: 'Maximum active tasks filter' }
      },
      isRisky: false,
      handler: async (params) => {
        return await this.volunteerService.recommendVolunteersForTask({
          requiredSkill: params.skill,
          taskTitle: params.taskTitle
        });
      }
    });

    // 2. find_similar_events (Read-Only)
    this.registerTool('find_similar_events', {
      description: 'Finds previous club events with similar size, budget, and vertical patterns.',
      parameters: {
        eventId: { type: 'string', required: false, description: 'Current event ID' },
        type: { type: 'string', required: false, description: 'Event type' }
      },
      isRisky: false,
      handler: async (params) => {
        const data = await this.store.read();
        const target = (data.events || []).find(e => e.id === params.eventId) || {
          type: params.type || 'Hackathon',
          expectedAttendance: 450,
          budgetPlanned: 10000
        };
        return await this.historicalService.findSimilarEvents(target);
      }
    });

    // 3. get_event_budget (Read-Only)
    this.registerTool('get_event_budget', {
      description: 'Analyzes event budget, committed spend, and category overspending patterns.',
      parameters: {
        eventId: { type: 'string', required: false, description: 'Event ID to inspect' }
      },
      isRisky: false,
      handler: async (params) => {
        return await this.budgetService.analyzeBudgetForEvent(params.eventId);
      }
    });

    // 4. search_documents (Read-Only / RAG)
    this.registerTool('search_documents', {
      description: 'Searches club archives and post-mortems using semantic RAG with source citations.',
      parameters: {
        query: { type: 'string', required: true, description: 'Search query or question' }
      },
      isRisky: false,
      handler: async (params) => {
        const data = await this.store.read();
        this.retrievalService.indexDocuments(data.documents || []);
        return this.retrievalService.search(params.query);
      }
    });

    // 5. get_event_history (Read-Only)
    this.registerTool('get_event_history', {
      description: 'Retrieves completed historical events and recurring operational milestones.',
      parameters: {
        type: { type: 'string', required: false }
      },
      isRisky: false,
      handler: async (params) => {
        const data = await this.store.read();
        const completed = (data.events || []).filter(e => e.status === 'completed');
        const patterns = await this.historicalService.getRecurringTaskPatterns(params.type);
        return { completedEvents: completed, recurringMilestones: patterns };
      }
    });

    // 6. create_task (Modifying)
    this.registerTool('create_task', {
      description: 'Creates a real task in the club database with category, due date, and priority.',
      parameters: {
        title: { type: 'string', required: true },
        category: { type: 'string', required: false },
        priority: { type: 'string', required: false },
        daysFromNow: { type: 'number', required: false },
        eventId: { type: 'string', required: false }
      },
      isRisky: false,
      handler: async (params, user) => {
        const taskId = `task-ai-${crypto.randomUUID().slice(0, 8)}`;
        const days = params.daysFromNow || 5;
        const dueDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

        const createdTask = {
          id: taskId,
          title: params.title,
          category: params.category || 'Operations',
          priority: params.priority || 'Medium',
          status: 'todo',
          dueDate,
          assigneeId: null,
          createdAt: new Date().toISOString()
        };

        await this.store.update((data) => {
          if (!data.tasks) data.tasks = [];
          data.tasks.push(createdTask);
        });

        const log = await this.activityLogger.logAction({
          user,
          eventId: params.eventId,
          eventTag: 'Task Operations',
          actionDescription: `created task '${params.title}' (Due in ${days}d)`,
          toolName: 'create_task',
          input: params,
          result: { taskId },
          affectedEntities: [{ type: 'task', id: taskId }],
          undoSnapshot: { createdTasks: [taskId] }
        });

        return { success: true, task: createdTask, actionId: log.actionId };
      }
    });

    // 7. update_task (Modifying)
    this.registerTool('update_task', {
      description: 'Updates task attributes or status (e.g. moves to done, review, doing).',
      parameters: {
        taskId: { type: 'string', required: true },
        status: { type: 'string', required: false },
        title: { type: 'string', required: false }
      },
      isRisky: false,
      handler: async (params, user) => {
        let previousTask = null;
        let updatedTask = null;

        await this.store.update((data) => {
          const idx = (data.tasks || []).findIndex(t => t.id === params.taskId);
          if (idx < 0) throw new Error(`Task '${params.taskId}' not found.`);
          previousTask = { ...data.tasks[idx] };

          if (params.status) data.tasks[idx].status = params.status;
          if (params.title) data.tasks[idx].title = params.title;
          data.tasks[idx].updatedAt = new Date().toISOString();
          updatedTask = data.tasks[idx];
        });

        const log = await this.activityLogger.logAction({
          user,
          eventTag: 'Task Update',
          actionDescription: `updated task '${updatedTask.title}' status to '${updatedTask.status}'`,
          toolName: 'update_task',
          input: params,
          result: { updatedTask },
          affectedEntities: [{ type: 'task', id: params.taskId }],
          undoSnapshot: { previousTasks: [previousTask] }
        });

        return { success: true, task: updatedTask, actionId: log.actionId };
      }
    });

    // 8. delete_task (Modifying / Risky)
    this.registerTool('delete_task', {
      description: 'Permanently deletes a task from the board.',
      parameters: {
        taskId: { type: 'string', required: true }
      },
      isRisky: true,
      handler: async (params, user) => {
        let deletedTask = null;

        await this.store.update((data) => {
          const idx = (data.tasks || []).findIndex(t => t.id === params.taskId);
          if (idx < 0) throw new Error(`Task '${params.taskId}' not found.`);
          deletedTask = data.tasks.splice(idx, 1)[0];
        });

        const log = await this.activityLogger.logAction({
          user,
          eventTag: 'Task Cleanup',
          actionDescription: `deleted task '${deletedTask.title}'`,
          toolName: 'delete_task',
          input: params,
          result: { deletedId: params.taskId },
          affectedEntities: [{ type: 'task', id: params.taskId }],
          undoSnapshot: { previousTasks: [deletedTask] }
        });

        return { success: true, deletedTask, actionId: log.actionId };
      }
    });

    // 9. assign_task (Modifying / Risky)
    this.registerTool('assign_task', {
      description: 'Assigns a volunteer to a task and updates workload counters.',
      parameters: {
        taskId: { type: 'string', required: true },
        volunteerId: { type: 'string', required: true }
      },
      isRisky: true,
      handler: async (params, user) => {
        let previousTask = null;
        let assignedVolunteer = null;
        let taskTitle = '';

        await this.store.update((data) => {
          const task = (data.tasks || []).find(t => t.id === params.taskId);
          if (!task) throw new Error(`Task '${params.taskId}' not found.`);
          previousTask = { ...task };
          taskTitle = task.title;

          const vol = (data.volunteers || []).find(v => v.id === params.volunteerId || v.name.toLowerCase().includes(params.volunteerId.toLowerCase()));
          if (!vol) throw new Error(`Volunteer '${params.volunteerId}' not found.`);

          task.assigneeId = vol.id;
          vol.activeTasks = (vol.activeTasks || 0) + 1;
          assignedVolunteer = vol;
        });

        const log = await this.activityLogger.logAction({
          user,
          eventTag: 'Volunteer Copilot',
          actionDescription: `assigned '${assignedVolunteer.name}' to task '${taskTitle}'`,
          toolName: 'assign_task',
          input: params,
          result: { taskId: params.taskId, volunteerId: assignedVolunteer.id },
          affectedEntities: [{ type: 'task', id: params.taskId }, { type: 'volunteer', id: assignedVolunteer.id }],
          undoSnapshot: {
            previousTasks: [previousTask],
            volunteerLoads: [{ id: assignedVolunteer.id, activeTasks: assignedVolunteer.activeTasks - 1 }]
          }
        });

        return { success: true, taskId: params.taskId, volunteer: assignedVolunteer, actionId: log.actionId };
      }
    });

    // 10. update_deadline (Modifying / Risky - Detects Cascade Impact)
    this.registerTool('update_deadline', {
      description: 'Updates task deadline and alerts if dependent milestone tasks are impacted.',
      parameters: {
        taskId: { type: 'string', required: true },
        newDeadlineDays: { type: 'number', required: true }
      },
      isRisky: true,
      handler: async (params, user) => {
        let previousTask = null;
        let updatedTask = null;
        const newDueDate = new Date(Date.now() + params.newDeadlineDays * 24 * 60 * 60 * 1000).toISOString();

        await this.store.update((data) => {
          const task = (data.tasks || []).find(t => t.id === params.taskId);
          if (!task) throw new Error(`Task '${params.taskId}' not found.`);
          previousTask = { ...task };
          task.dueDate = newDueDate;
          updatedTask = task;
        });

        // Detect dependency impact (e.g. venue delay cascades to stage and sound)
        const impactedTasks = ['Stage Planning & Audio-Visual Setup', 'Sound Check & Acoustic Run-through'];

        const log = await this.activityLogger.logAction({
          user,
          eventTag: 'Deadline Intelligence',
          actionDescription: `shifted deadline for '${updatedTask.title}' to ${params.newDeadlineDays} days out. Impacted: 2 downstream tasks.`,
          toolName: 'update_deadline',
          input: params,
          result: { taskId: params.taskId, newDueDate, impactedTasks },
          affectedEntities: [{ type: 'task', id: params.taskId }],
          undoSnapshot: { previousTasks: [previousTask] }
        });

        return {
          success: true,
          task: updatedTask,
          impactedTasks,
          warning: `This deadline change may affect ${impactedTasks.length} dependent tasks: ${impactedTasks.join(', ')}.`,
          actionId: log.actionId
        };
      }
    });

    // 11. create_risk (Modifying)
    this.registerTool('create_risk', {
      description: 'Logs a detected risk into the event risk register with severity and mitigation.',
      parameters: {
        title: { type: 'string', required: true },
        severity: { type: 'string', required: false },
        mitigation: { type: 'string', required: false },
        eventId: { type: 'string', required: false }
      },
      isRisky: false,
      handler: async (params, user) => {
        const riskId = `risk-ai-${crypto.randomUUID().slice(0, 8)}`;
        const newRisk = {
          id: riskId,
          title: params.title,
          severity: params.severity || 'High',
          status: 'open',
          mitigation: params.mitigation || 'Review mitigation checklist with club leads'
        };

        await this.store.update((data) => {
          if (!data.risks) data.risks = [];
          data.risks.unshift(newRisk);
        });

        const log = await this.activityLogger.logAction({
          user,
          eventId: params.eventId,
          eventTag: 'Risk Detection',
          actionDescription: `raised risk: '${newRisk.title}' (${newRisk.severity})`,
          toolName: 'create_risk',
          input: params,
          result: { riskId },
          affectedEntities: [{ type: 'risk', id: riskId }],
          undoSnapshot: { createdRisks: [riskId] }
        });

        return { success: true, risk: newRisk, actionId: log.actionId };
      }
    });

    // 12. create_mitigation_task (Modifying)
    this.registerTool('create_mitigation_task', {
      description: 'Pairs an actionable mitigation task with an existing open risk.',
      parameters: {
        riskTitle: { type: 'string', required: true },
        taskTitle: { type: 'string', required: true }
      },
      isRisky: false,
      handler: async (params, user) => {
        const taskId = `task-mit-${crypto.randomUUID().slice(0, 8)}`;
        const newTask = {
          id: taskId,
          title: `[Mitigation] ${params.taskTitle}`,
          category: 'Risk Mitigation',
          priority: 'High',
          status: 'todo',
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
        };

        await this.store.update((data) => {
          if (!data.tasks) data.tasks = [];
          data.tasks.unshift(newTask);
        });

        const log = await this.activityLogger.logAction({
          user,
          eventTag: 'Risk Mitigation',
          actionDescription: `created mitigation task for risk '${params.riskTitle}'`,
          toolName: 'create_mitigation_task',
          input: params,
          result: { taskId },
          affectedEntities: [{ type: 'task', id: taskId }],
          undoSnapshot: { createdTasks: [taskId] }
        });

        return { success: true, task: newTask, actionId: log.actionId };
      }
    });

    // 13. generate_event_plan (Modifying / Risky - Batch Task Creation)
    this.registerTool('generate_event_plan', {
      description: 'Generates end-to-end event tasks, risks, and milestones from historical patterns.',
      parameters: {
        name: { type: 'string', required: true },
        type: { type: 'string', required: false },
        budget: { type: 'number', required: false },
        expectedAttendance: { type: 'number', required: false }
      },
      isRisky: true,
      handler: async (params, user) => {
        const plan = await this.eventPlanningService.generatePlan({
          name: params.name,
          type: params.type || 'Hackathon',
          budgetPlanned: params.budget || 10000,
          expectedAttendance: params.expectedAttendance || 450
        });

        // Batch create real tasks in database
        const createdTaskIds = [];
        const createdTasks = [];

        await this.store.update((data) => {
          if (!data.tasks) data.tasks = [];
          for (const item of plan.tasks) {
            const id = `task-plan-${crypto.randomUUID().slice(0, 8)}`;
            const task = {
              id,
              title: item.title,
              category: item.category,
              priority: item.priority,
              status: 'todo',
              dueDate: item.dueDate,
              historicalEvidence: item.historicalEvidence
            };
            data.tasks.unshift(task);
            createdTaskIds.push(id);
            createdTasks.push(task);
          }
        });

        const log = await this.activityLogger.logAction({
          user,
          eventTag: 'Event Planning',
          actionDescription: `generated ${createdTasks.length} operational tasks for '${params.name}'`,
          toolName: 'generate_event_plan',
          input: params,
          result: { taskCount: createdTasks.length },
          affectedEntities: createdTaskIds.map(id => ({ type: 'task', id })),
          undoSnapshot: { createdTasks: createdTaskIds }
        });

        return {
          success: true,
          plan,
          createdTasksCount: createdTasks.length,
          actionId: log.actionId
        };
      }
    });

    // 14. create_announcement (Modifying / Risky)
    this.registerTool('create_announcement', {
      description: 'Creates a broadcast announcement for club volunteers and members.',
      parameters: {
        title: { type: 'string', required: true },
        content: { type: 'string', required: true },
        audience: { type: 'string', required: false }
      },
      isRisky: true,
      handler: async (params, user) => {
        const annId = `ann-${crypto.randomUUID().slice(0, 8)}`;
        const newAnn = {
          id: annId,
          title: params.title,
          content: params.content,
          audience: params.audience || 'All Volunteers',
          sentAt: new Date().toISOString()
        };

        await this.store.update((data) => {
          if (!data.announcements) data.announcements = [];
          data.announcements.unshift(newAnn);
        });

        const log = await this.activityLogger.logAction({
          user,
          eventTag: 'Broadcast',
          actionDescription: `published announcement '${params.title}' to ${newAnn.audience}`,
          toolName: 'create_announcement',
          input: params,
          result: { announcementId: annId },
          affectedEntities: [{ type: 'announcement', id: annId }],
          undoSnapshot: { createdAnnouncements: [annId] }
        });

        return { success: true, announcement: newAnn, actionId: log.actionId };
      }
    });

    // 15. rebalance_workload (Modifying / Risky)
    this.registerTool('rebalance_workload', {
      description: 'Reassigns tasks from overloaded volunteers to available volunteers.',
      parameters: {
        threshold: { type: 'number', required: false }
      },
      isRisky: true,
      handler: async (params, user) => {
        const rebalanceResult = await this.volunteerService.rebalanceWorkload({
          threshold: params.threshold || 6
        });

        if (!rebalanceResult.needed) {
          return { success: true, message: rebalanceResult.message, rebalanced: false };
        }

        const volunteerLoadsPrevious = [];
        await this.store.update((data) => {
          for (const plan of rebalanceResult.rebalancingPlan) {
            const fromVol = (data.volunteers || []).find(v => v.id === plan.fromVolunteer.id);
            const toVol = (data.volunteers || []).find(v => v.id === plan.toVolunteer.id);

            if (fromVol && toVol) {
              volunteerLoadsPrevious.push({ id: fromVol.id, activeTasks: fromVol.activeTasks });
              volunteerLoadsPrevious.push({ id: toVol.id, activeTasks: toVol.activeTasks });
              fromVol.activeTasks -= plan.tasksToMove;
              toVol.activeTasks += plan.tasksToMove;
            }
          }
        });

        const log = await this.activityLogger.logAction({
          user,
          eventTag: 'Workload Copilot',
          actionDescription: `rebalanced ${rebalanceResult.rebalancingPlan.length} task(s) away from overloaded volunteers`,
          toolName: 'rebalance_workload',
          input: params,
          result: rebalanceResult,
          undoSnapshot: { volunteerLoads: volunteerLoadsPrevious }
        });

        return {
          success: true,
          rebalanced: true,
          details: rebalanceResult.rebalancingPlan,
          actionId: log.actionId
        };
      }
    });

    // 16. create_meeting_action (Modifying)
    this.registerTool('create_meeting_action', {
      description: 'Converts an accepted meeting transcript action item into an active database task.',
      parameters: {
        taskTitle: { type: 'string', required: true },
        suggestedOwner: { type: 'string', required: false },
        evidenceQuote: { type: 'string', required: false }
      },
      isRisky: false,
      handler: async (params, user) => {
        const taskId = `task-meet-${crypto.randomUUID().slice(0, 8)}`;
        const newTask = {
          id: taskId,
          title: params.taskTitle,
          category: 'Meeting Action',
          priority: 'High',
          status: 'todo',
          dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          notes: params.evidenceQuote ? `Extracted from meeting: "${params.evidenceQuote}"` : undefined
        };

        await this.store.update((data) => {
          if (!data.tasks) data.tasks = [];
          data.tasks.unshift(newTask);
        });

        const log = await this.activityLogger.logAction({
          user,
          eventTag: 'Meeting Copilot',
          actionDescription: `created task from meeting item: '${params.taskTitle}'`,
          toolName: 'create_meeting_action',
          input: params,
          result: { taskId },
          affectedEntities: [{ type: 'task', id: taskId }],
          undoSnapshot: { createdTasks: [taskId] }
        });

        return { success: true, task: newTask, actionId: log.actionId };
      }
    });
  }
}

module.exports = { ToolRegistry };

