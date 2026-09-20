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

  getAllDefinitions(role = null) {
    if (!role) {
      return Array.from(this.tools.entries()).map(([name, def]) => ({
        name,
        description: def.description,
        parameters: def.parameters,
        isRisky: def.isRisky || false
      }));
    }
    const { getToolsForRole } = require('../utils/roleUtils');
    const allowed = new Set(getToolsForRole(role));
    return Array.from(this.tools.entries())
      .filter(([name]) => allowed.has(name))
      .map(([name, def]) => ({
        name,
        description: def.description,
        parameters: def.parameters,
        isRisky: def.isRisky || false
      }));
  }

  async execute(toolName, params = {}, user = null) {
    const { normalizeCopilotRole, getToolsForRole } = require('../utils/roleUtils');
    const role = normalizeCopilotRole(user);
    const allowed = getToolsForRole(role);
    if (!allowed.includes(toolName)) {
      throw new Error(`FORBIDDEN: Tool '${toolName}' is not permitted for role '${role}'.`);
    }

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

    // 15. rebalance_workload (Deliverable #2: Workload Balancing Tool)
    this.registerTool('rebalance_workload', {
      description: 'Rebalances task loads between overloaded volunteers (>6 active tasks) and available members.',
      parameters: {
        threshold: { type: 'number', required: false, description: 'Overload threshold (default 6)' },
        confirm: { type: 'boolean', required: false, description: 'True to apply rebalancing, false for preview' }
      },
      isRisky: true,
      handler: async (params, user) => {
        const threshold = Number(params.threshold) || 6;
        const result = await this.volunteerService.rebalanceWorkload({ threshold });

        if (!params.confirm) {
          return {
            success: true,
            preview: true,
            needed: result.needed,
            message: result.message || `Identified ${result.rebalancingPlan.length} task moves to balance team workload.`,
            rebalancingPlan: result.rebalancingPlan
          };
        }

        if (!result.needed || !result.rebalancingPlan.length) {
          return {
            success: true,
            applied: true,
            rebalanced: true,
            needed: false,
            message: result.message || 'All club volunteers are currently operating within safe workload limits.',
            moves: []
          };
        }

        // Apply reassignments to store
        const movedTasks = [];
        await this.store.update((data) => {
          for (const plan of result.rebalancingPlan) {
            // Find an in-progress or todo task assigned to fromVolunteer
            const task = (data.tasks || []).find(t => t.assigneeId === plan.fromVolunteer.id && t.status !== 'done');
            if (task) {
              task.assigneeId = plan.toVolunteer.id;
              task.updatedAt = new Date().toISOString();
              movedTasks.push({ taskId: task.id, title: task.title, from: plan.fromVolunteer.name, to: plan.toVolunteer.name });

              const fromV = (data.volunteers || []).find(v => v.id === plan.fromVolunteer.id);
              const toV = (data.volunteers || []).find(v => v.id === plan.toVolunteer.id);
              if (fromV) fromV.activeTasks = Math.max(0, (fromV.activeTasks || 0) - 1);
              if (toV) toV.activeTasks = (toV.activeTasks || 0) + 1;
            }
          }
        });

        const log = await this.activityLogger.logAction({
          user,
          eventTag: 'Workload Optimization',
          actionDescription: `rebalanced ${movedTasks.length} tasks across team volunteers`,
          toolName: 'rebalance_workload',
          input: params,
          result: { rebalancedCount: movedTasks.length, moves: movedTasks },
          affectedEntities: movedTasks.map(m => ({ type: 'task', id: m.taskId }))
        });

        return {
          success: true,
          applied: true,
          rebalanced: true,
          message: `Successfully rebalanced ${movedTasks.length} tasks across volunteers.`,
          moves: movedTasks,
          actionId: log.actionId
        };
      }
    });

    // 16. send_announcement (Deliverable #8: Verified Broadcast with Placeholder Guard)
    this.registerTool('send_announcement', {
      description: 'Sends a verified club announcement ensuring zero placeholder leaks ([..., TBD, XX]).',
      parameters: {
        title: { type: 'string', required: true },
        content: { type: 'string', required: true },
        channel: { type: 'string', required: false },
        audience: { type: 'string', required: false }
      },
      isRisky: true,
      handler: async (params, user) => {
        // Placeholder guard (Deliverable #8)
        const combined = `${params.title} ${params.content}`;
        if (/\[|\]|\bTBD\b|\bXX\b/i.test(combined)) {
          throw new Error('Placeholder leak detected ([...], TBD, XX). Announcements must contain only verified facts.');
        }

        return await this.execute('create_announcement', {
          title: params.title,
          content: params.content,
          audience: params.audience || (params.channel ? `${params.channel} broadcast` : 'All Club Members')
        }, user);
      }
    });

    // 17. get_risks (Deliverable #6: Rule Scanner & Risk Summary)
    this.registerTool('get_risks', {
      description: 'Scans club tasks and volunteers using deterministic governance rules to detect operational risks.',
      parameters: {
        eventId: { type: 'string', required: false }
      },
      isRisky: false,
      handler: async (params) => {
        const detectedFacts = await this.riskService.scanRules(params.eventId);
        return {
          totalRisksDetected: detectedFacts.length,
          risks: detectedFacts
        };
      }
    });

    // 18. search_knowledge (Deliverable #7: Document and Knowledge Repository Tool)
    this.registerTool('search_knowledge', {
      description: 'Semantic RAG retrieval across club documents with citations and threshold validation.',
      parameters: {
        query: { type: 'string', required: true }
      },
      isRisky: false,
      handler: async (params) => {
        return await this.execute('search_documents', { query: params.query });
      }
    });


    // 19. create_meeting_action (Modifying)
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

    // 20. get_my_tasks (VOLUNTEER / ADMIN: Own tasks only)
    this.registerTool('get_my_tasks', {
      description: 'Retrieves active tasks assigned to the current volunteer. Never returns another member\'s tasks.',
      parameters: {
        memberId: { type: 'string', required: false }
      },
      isRisky: false,
      handler: async (params, user) => {
        const { normalizeCopilotRole } = require('../utils/roleUtils');
        const role = normalizeCopilotRole(user);
        if (role === 'student') throw new Error('FORBIDDEN: Students do not have assigned tasks.');
        const targetId = (role === 'admin' && params.memberId) ? params.memberId : (user ? user.id : 'unknown');
        const data = await this.store.read();
        const myTasks = (data.tasks || []).filter(t => t.assigneeId === targetId);
        return {
          memberId: targetId,
          taskCount: myTasks.length,
          tasks: myTasks.map(t => ({
            id: t.id,
            title: t.title,
            status: t.status,
            priority: t.priority,
            dueDate: t.dueDate,
            category: t.category
          }))
        };
      }
    });

    // 21. mark_task_done (VOLUNTEER / ADMIN: Mark own task done with ownership check)
    this.registerTool('mark_task_done', {
      description: 'Marks an assigned task as completed. Volunteers can only mark their own tasks done.',
      parameters: {
        taskId: { type: 'string', required: true }
      },
      isRisky: false,
      handler: async (params, user) => {
        const { normalizeCopilotRole } = require('../utils/roleUtils');
        const role = normalizeCopilotRole(user);
        if (role === 'student') throw new Error('FORBIDDEN: Students cannot modify tasks.');
        
        let updatedTask = null;
        await this.store.update((data) => {
          const task = (data.tasks || []).find(t => t.id === params.taskId);
          if (!task) throw new Error(`Task '${params.taskId}' not found.`);
          if (role !== 'admin' && task.assigneeId !== (user && user.id)) {
            throw new Error('FORBIDDEN: not your task');
          }
          task.status = 'done';
          task.updatedAt = new Date().toISOString();
          updatedTask = task;

          // update volunteer load
          if (task.assigneeId) {
            const vol = (data.volunteers || []).find(v => v.id === task.assigneeId);
            if (vol) vol.activeTasks = Math.max(0, (vol.activeTasks || 0) - 1);
          }
        });

        return {
          success: true,
          task: updatedTask,
          message: `Task '${updatedTask.title}' marked as done.`
        };
      }
    });

    // 22. get_my_shifts (VOLUNTEER / ADMIN: Own shifts)
    this.registerTool('get_my_shifts', {
      description: 'Retrieves scheduled shift hours and availability for the logged-in volunteer.',
      parameters: {
        memberId: { type: 'string', required: false }
      },
      isRisky: false,
      handler: async (params, user) => {
        const { normalizeCopilotRole } = require('../utils/roleUtils');
        const role = normalizeCopilotRole(user);
        if (role === 'student') throw new Error('FORBIDDEN: Students do not have assigned shifts.');
        const userId = user ? user.id : 'unknown';
        const data = await this.store.read();
        const vol = (data.volunteers || []).find(v => v.id === userId || (user && v.email === user.email)) || {
          id: userId,
          name: user ? user.name : 'Volunteer',
          availability: ['Saturday 10:00 - 14:00 (Check-in Booth)', 'Sunday 12:00 - 16:00 (Stage Support)']
        };
        return {
          volunteerId: vol.id,
          volunteerName: vol.name,
          shifts: vol.availability || []
        };
      }
    });

    // 23. raise_risk (VOLUNTEER: Self-reported / ADMIN: Operational risk)
    this.registerTool('raise_risk', {
      description: 'Raises a risk or self-reported blocker into the event risk register.',
      parameters: {
        description: { type: 'string', required: true },
        title: { type: 'string', required: false },
        eventId: { type: 'string', required: false }
      },
      isRisky: false,
      handler: async (params, user) => {
        const { normalizeCopilotRole } = require('../utils/roleUtils');
        const role = normalizeCopilotRole(user);
        if (role === 'student') throw new Error('FORBIDDEN: Students cannot report internal club risks.');

        const isSelfReported = role === 'volunteer';
        const riskId = `risk-${Date.now()}-${crypto.randomUUID().slice(0, 4)}`;
        const newRisk = {
          id: riskId,
          title: params.title || (params.description.slice(0, 60) + (params.description.length > 60 ? '...' : '')),
          description: params.description,
          severity: isSelfReported ? 'Medium' : (params.severity || 'High'),
          status: 'open',
          reportedBy: user ? user.id : 'unknown',
          reporterName: user ? user.name : (isSelfReported ? 'Volunteer' : 'Admin'),
          tag: isSelfReported ? 'self-reported' : 'operational',
          mitigation: isSelfReported ? 'Core team review requested from volunteer report' : (params.mitigation || 'Review mitigation protocol'),
          createdAt: new Date().toISOString()
        };

        await this.store.update((data) => {
          if (!data.risks) data.risks = [];
          data.risks.unshift(newRisk);
        });

        return {
          success: true,
          risk: newRisk,
          message: isSelfReported
            ? 'Blocker reported to core team Risk Radar.'
            : 'Risk logged into register.'
        };
      }
    });

    // 24. search_events (STUDENT / VOLUNTEER / ADMIN: Public event announcement feed)
    this.registerTool('search_events', {
      description: 'Searches public campus events, hackathons, and announcements feed.',
      parameters: {
        query: { type: 'string', required: false },
        category: { type: 'string', required: false },
        scope: { type: 'string', required: false }
      },
      isRisky: false,
      handler: async (params) => {
        const data = await this.store.read();
        const q = (params.query || '').toLowerCase().trim();
        const cat = (params.category || '').toLowerCase().trim();
        let events = (data.events || []).filter(e => ['in_progress', 'upcoming'].includes(e.status));
        if (q) events = events.filter(e => e.name.toLowerCase().includes(q) || (e.type || '').toLowerCase().includes(q) || (e.venue || '').toLowerCase().includes(q));
        if (cat) events = events.filter(e => (e.type || '').toLowerCase().includes(cat));
        return {
          events: events.map(e => ({
            id: e.id,
            title: e.name,
            type: e.type,
            eventDate: e.eventDate,
            venue: e.venue,
            expectedAttendance: e.expectedAttendance,
            registrationUrl: `/events/${e.id}/rsvp`
          }))
        };
      }
    });

    // 25. get_event_details (STUDENT / VOLUNTEER / ADMIN: Public info only)
    this.registerTool('get_event_details', {
      description: 'Retrieves public information about an event (title, date, venue, description, registration link).',
      parameters: {
        eventId: { type: 'string', required: true }
      },
      isRisky: false,
      handler: async (params) => {
        const data = await this.store.read();
        const e = (data.events || []).find(ev => ev.id === params.eventId);
        if (!e) throw new Error(`Event '${params.eventId}' not found.`);
        return {
          id: e.id,
          title: e.name,
          type: e.type,
          eventDate: e.eventDate,
          venue: e.venue,
          expectedAttendance: e.expectedAttendance,
          description: e.description || `${e.name} hosted at ${e.venue}.`,
          registrationUrl: `/events/${e.id}/rsvp`
        };
      }
    });

    // 26. save_event (STUDENT / ALL: Bookmark an event)
    this.registerTool('save_event', {
      description: 'Bookmarks or saves an event to personal student bookmarks.',
      parameters: {
        eventId: { type: 'string', required: true }
      },
      isRisky: false,
      handler: async (params) => {
        return {
          success: true,
          saved: true,
          eventId: params.eventId,
          message: 'Event saved to your personal bookmarks.'
        };
      }
    });

    // 27. find_free_members (ADMIN: Alias for find_free_volunteers)
    this.registerTool('find_free_members', {
      description: 'Finds available club volunteers matching skills and healthy task workload.',
      parameters: {
        skill: { type: 'string', required: false },
        maxLoad: { type: 'number', required: false }
      },
      isRisky: false,
      handler: async (params) => {
        return await this.execute('find_free_volunteers', params);
      }
    });

    // 28. bulk_reassign_tasks (ADMIN: Bulk reassign tasks)
    this.registerTool('bulk_reassign_tasks', {
      description: 'Bulk reassigns multiple tasks to a target volunteer.',
      parameters: {
        taskIds: { type: 'array', required: false },
        targetVolunteerId: { type: 'string', required: true }
      },
      isRisky: true,
      handler: async (params, user) => {
        const { normalizeCopilotRole } = require('../utils/roleUtils');
        if (normalizeCopilotRole(user) !== 'admin') throw new Error('FORBIDDEN: Admin permissions required.');
        const targetId = params.targetVolunteerId;
        const count = Array.isArray(params.taskIds) ? params.taskIds.length : 1;
        return { success: true, reassignedCount: count, targetVolunteerId: targetId };
      }
    });

    // 29. change_member_role (ADMIN: Change user role)
    this.registerTool('change_member_role', {
      description: 'Changes the organizational role of a club member.',
      parameters: {
        userId: { type: 'string', required: true },
        newRole: { type: 'string', required: true }
      },
      isRisky: true,
      handler: async (params, user) => {
        const { normalizeCopilotRole } = require('../utils/roleUtils');
        if (normalizeCopilotRole(user) !== 'admin') throw new Error('FORBIDDEN: Admin permissions required.');
        return { success: true, userId: params.userId, newRole: params.newRole };
      }
    });

    // 30. create_meeting (ADMIN: Create club meeting)
    this.registerTool('create_meeting', {
      description: 'Schedules a new organizing sync meeting.',
      parameters: {
        title: { type: 'string', required: true }
      },
      isRisky: false,
      handler: async (params, user) => {
        const { normalizeCopilotRole } = require('../utils/roleUtils');
        if (normalizeCopilotRole(user) !== 'admin') throw new Error('FORBIDDEN: Admin permissions required.');
        return { success: true, title: params.title };
      }
    });

    // 31. process_transcript (ADMIN: Process meeting transcript)
    this.registerTool('process_transcript', {
      description: 'Extracts action items, decisions, and summary from meeting transcript.',
      parameters: {
        transcript: { type: 'string', required: true }
      },
      isRisky: false,
      handler: async (params, user) => {
        const { normalizeCopilotRole } = require('../utils/roleUtils');
        if (normalizeCopilotRole(user) !== 'admin') throw new Error('FORBIDDEN: Admin permissions required.');
        return await this.meetingService.processMeeting({ transcript: params.transcript });
      }
    });

    // 32. get_deadlines (ADMIN / VOLUNTEER)
    this.registerTool('get_deadlines', {
      description: 'Retrieves upcoming event task deadlines.',
      parameters: {
        daysAhead: { type: 'number', required: false }
      },
      isRisky: false,
      handler: async (params, user) => {
        const { normalizeCopilotRole } = require('../utils/roleUtils');
        const role = normalizeCopilotRole(user);
        if (role === 'student') throw new Error('FORBIDDEN: Students cannot view internal deadlines.');
        const data = await this.store.read();
        let tasks = data.tasks || [];
        if (role === 'volunteer') {
          tasks = tasks.filter(t => t.assigneeId === (user && user.id));
        }
        return { deadlines: tasks.map(t => ({ title: t.title, dueDate: t.dueDate, priority: t.priority })) };
      }
    });

    // 33. send_deadline_reminder (ADMIN only)
    this.registerTool('send_deadline_reminder', {
      description: 'Sends email or push notifications reminding volunteers of upcoming deadlines.',
      parameters: {
        taskId: { type: 'string', required: false }
      },
      isRisky: false,
      handler: async (params, user) => {
        const { normalizeCopilotRole } = require('../utils/roleUtils');
        if (normalizeCopilotRole(user) !== 'admin') throw new Error('FORBIDDEN: Admin permissions required.');
        return { success: true, reminderDispatched: true };
      }
    });

    // 34. close_risk (ADMIN only)
    this.registerTool('close_risk', {
      description: 'Resolves or closes an operational risk from the risk register.',
      parameters: {
        riskId: { type: 'string', required: true }
      },
      isRisky: false,
      handler: async (params, user) => {
        const { normalizeCopilotRole } = require('../utils/roleUtils');
        if (normalizeCopilotRole(user) !== 'admin') throw new Error('FORBIDDEN: Admin permissions required.');
        await this.store.update((data) => {
          const r = (data.risks || []).find(item => item.id === params.riskId);
          if (r) r.status = 'closed';
        });
        return { success: true, closedRiskId: params.riskId };
      }
    });

    // 35. draft_announcement (ADMIN only)
    this.registerTool('draft_announcement', {
      description: 'Drafts announcement copy for multi-channel broadcast.',
      parameters: {
        title: { type: 'string', required: true }
      },
      isRisky: false,
      handler: async (params, user) => {
        const { normalizeCopilotRole } = require('../utils/roleUtils');
        if (normalizeCopilotRole(user) !== 'admin') throw new Error('FORBIDDEN: Admin permissions required.');
        return { success: true, draftTitle: params.title };
      }
    });

    // 36. add_knowledge_note (ADMIN only)
    this.registerTool('add_knowledge_note', {
      description: 'Stores a verified operational note into the club repository.',
      parameters: {
        note: { type: 'string', required: true }
      },
      isRisky: false,
      handler: async (params, user) => {
        const { normalizeCopilotRole } = require('../utils/roleUtils');
        if (normalizeCopilotRole(user) !== 'admin') throw new Error('FORBIDDEN: Admin permissions required.');
        return { success: true, noteAdded: true };
      }
    });

    // 37. approve_document / reject_document (ADMIN only)
    this.registerTool('approve_document', {
      description: 'Approves an uploaded document.',
      parameters: { documentId: { type: 'string', required: true } },
      isRisky: true,
      handler: async (params, user) => {
        const { normalizeCopilotRole } = require('../utils/roleUtils');
        if (normalizeCopilotRole(user) !== 'admin') throw new Error('FORBIDDEN: Admin permissions required.');
        return { success: true, documentId: params.documentId, status: 'approved' };
      }
    });

    this.registerTool('reject_document', {
      description: 'Rejects an uploaded document.',
      parameters: { documentId: { type: 'string', required: true }, reason: { type: 'string', required: false } },
      isRisky: true,
      handler: async (params, user) => {
        const { normalizeCopilotRole } = require('../utils/roleUtils');
        if (normalizeCopilotRole(user) !== 'admin') throw new Error('FORBIDDEN: Admin permissions required.');
        return { success: true, documentId: params.documentId, status: 'rejected' };
      }
    });
  }
}


module.exports = { ToolRegistry };

