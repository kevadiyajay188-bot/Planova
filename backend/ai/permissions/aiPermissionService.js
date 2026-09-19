const { AUTONOMY_LEVELS } = require('../config/aiConfig');

class AiPermissionService {
  constructor(autonomyLevel = AUTONOMY_LEVELS.ASK_FOR_RISKY) {
    this.autonomyLevel = autonomyLevel;

    // Permissions matrix mapping tools to allowed roles
    this.toolPermissions = {
      // Read-only safe tools
      find_free_volunteers: ['Admin', 'President', 'Core Team', 'Coordinator', 'Team Lead', 'Volunteer', 'Web User'],
      find_similar_events: ['Admin', 'President', 'Core Team', 'Coordinator', 'Team Lead', 'Volunteer', 'Web User'],
      get_event_budget: ['Admin', 'President', 'Core Team', 'Coordinator', 'Team Lead', 'Volunteer'],
      search_documents: ['Admin', 'President', 'Core Team', 'Coordinator', 'Team Lead', 'Volunteer'],
      get_event_history: ['Admin', 'President', 'Core Team', 'Coordinator', 'Team Lead', 'Volunteer'],

      // Operations & Task management
      create_task: ['Admin', 'President', 'Core Team', 'Coordinator', 'Team Lead'],
      update_task: ['Admin', 'President', 'Core Team', 'Coordinator', 'Team Lead', 'Volunteer'], // volunteers can update status
      delete_task: ['Admin', 'President'], // Only President/Admin can delete tasks
      assign_task: ['Admin', 'President', 'Core Team', 'Coordinator', 'Team Lead'],
      update_deadline: ['Admin', 'President', 'Core Team', 'Coordinator', 'Team Lead'],
      create_risk: ['Admin', 'President', 'Core Team', 'Coordinator', 'Team Lead'],
      create_mitigation_task: ['Admin', 'President', 'Core Team', 'Coordinator', 'Team Lead'],
      generate_event_plan: ['Admin', 'President', 'Core Team', 'Coordinator', 'Team Lead'],
      create_announcement: ['Admin', 'President', 'Core Team', 'Coordinator', 'Team Lead'],
      rebalance_workload: ['Admin', 'President', 'Core Team', 'Coordinator', 'Team Lead'],
      create_meeting_action: ['Admin', 'President', 'Core Team', 'Coordinator', 'Team Lead'],
      delete_event: ['Admin', 'President']
    };

    // Tools deemed "Risky" that alter databases in bulk or impact schedules/volunteers
    this.riskyTools = new Set([
      'assign_task',
      'update_deadline',
      'delete_task',
      'delete_event',
      'create_announcement',
      'rebalance_workload',
      'generate_event_plan'
    ]);
  }

  normalizeRole(role = '') {
    const r = String(role).trim().toLowerCase();
    if (r === 'president' || r === 'admin') return 'Admin';
    if (r === 'coordinator' || r === 'team lead' || r === 'core team') return 'Core Team';
    if (r === 'volunteer') return 'Volunteer';
    return 'Web User';
  }

  canExecuteTool(user, toolName) {
    if (!user) return { allowed: false, reason: 'Authentication is required to perform AI operations.' };
    const role = this.normalizeRole(user.role);
    const allowedRoles = this.toolPermissions[toolName];

    if (!allowedRoles) {
      return { allowed: false, reason: `Tool '${toolName}' is unrecognized or unpermitted.` };
    }

    const hasPermission = allowedRoles.some(ar => this.normalizeRole(ar) === role);
    if (!hasPermission) {
      return {
        allowed: false,
        reason: `Your role (${user.role || 'User'}) does not have permission to execute '${toolName}'. This action requires ${allowedRoles.join(' or ')} privileges.`
      };
    }

    return { allowed: true };
  }

  requiresConfirmation(toolName, autonomyOverride) {
    const autonomy = autonomyOverride || this.autonomyLevel;

    if (autonomy === AUTONOMY_LEVELS.ASK_ALWAYS) {
      // Every modifying action requires confirmation
      return !this.isReadOnlyTool(toolName);
    }

    if (autonomy === AUTONOMY_LEVELS.ASK_FOR_RISKY) {
      return this.riskyTools.has(toolName);
    }

    if (autonomy === AUTONOMY_LEVELS.AUTO) {
      return false;
    }

    return this.riskyTools.has(toolName);
  }

  isReadOnlyTool(toolName) {
    return [
      'find_free_volunteers',
      'find_similar_events',
      'get_event_budget',
      'search_documents',
      'get_event_history'
    ].includes(toolName);
  }
}

module.exports = { AiPermissionService };

