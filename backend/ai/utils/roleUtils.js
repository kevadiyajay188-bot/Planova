/**
 * Role Normalization and Capability Utils for AI Copilot
 */

function normalizeCopilotRole(user) {
  if (!user) return 'student';
  const r = String(user.role || '').trim().toLowerCase();
  if (
    r === 'admin' ||
    r === 'president' ||
    r === 'team_lead' ||
    r === 'team lead' ||
    r === 'coordinator' ||
    r === 'core team' ||
    r === 'core_team'
  ) {
    return 'admin';
  }
  if (r === 'volunteer') {
    return 'volunteer';
  }
  if (r === 'student' || r === 'web_user' || r === 'web user' || r === 'user') {
    return 'student';
  }
  return 'student'; // deny by default to least-privileged role
}

function getToolsForRole(role) {
  const normalized = normalizeCopilotRole({ role });
  if (normalized === 'admin') {
    return [
      'create_task',
      'update_task',
      'delete_task',
      'assign_task',
      'bulk_reassign_tasks',
      'find_free_members',
      'find_free_volunteers',
      'rebalance_workload',
      'change_member_role',
      'create_meeting',
      'process_transcript',
      'get_deadlines',
      'send_deadline_reminder',
      'raise_risk',
      'close_risk',
      'create_risk',
      'create_mitigation_task',
      'draft_announcement',
      'send_announcement',
      'create_announcement',
      'search_knowledge',
      'search_documents',
      'add_knowledge_note',
      'approve_document',
      'reject_document',
      'get_event_budget',
      'find_similar_events',
      'get_event_history',
      'generate_event_plan',
      'update_deadline',
      'delete_event',
      'create_meeting_action'
    ];
  }
  if (normalized === 'volunteer') {
    return [
      'get_my_tasks',
      'mark_task_done',
      'get_my_shifts',
      'raise_risk',
      'search_knowledge'
    ];
  }
  if (normalized === 'student') {
    return [
      'search_events',
      'get_event_details',
      'save_event',
      'search_knowledge'
    ];
  }
  throw new Error('Unknown role - deny by default');
}

/**
 * Backend Context Isolation:
 * A student's Gemini call must NEVER receive: roster names/IDs, task lists, risk data, budget figures,
 * or internal meeting transcripts in its context.
 */
async function getContextForRole(role, user, eventId, store) {
  const normalized = normalizeCopilotRole({ role: role || (user && user.role) });
  const data = await store.read();

  // 1. STUDENT: buildPublicContext (only public events & announcements)
  if (normalized === 'student') {
    const publicEvents = (data.events || [])
      .filter(e => ['in_progress', 'upcoming'].includes(e.status))
      .map(e => ({
        id: e.id,
        name: e.name,
        type: e.type,
        eventDate: e.eventDate,
        venue: e.venue,
        expectedAttendance: e.expectedAttendance,
        registrationUrl: `/events/${e.id}/rsvp`
      }));

    const publicAnnouncements = (data.announcements || [])
      .filter(a => a.featured || a.scale || !a.isInternal)
      .map(a => ({
        id: a.id,
        title: a.title,
        content: a.content || a.preview || a.body,
        venue: a.venue,
        eventDate: a.eventDate,
        category: a.category
      }));

    return {
      role: 'student',
      events: publicEvents,
      announcements: publicAnnouncements
      // Notice: NO tasks, NO roster, NO risks, NO budgets, NO transcripts
    };
  }

  // 2. VOLUNTEER: buildSelfScopedContext (own tasks, own shifts, event public details, own self-reported risks)
  if (normalized === 'volunteer') {
    const userId = user ? user.id : 'unknown';
    const myTasks = (data.tasks || [])
      .filter(t => t.assigneeId === userId)
      .map(t => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        status: t.status,
        dueDate: t.dueDate,
        category: t.category || t.vertical
      }));

    const myVol = (data.volunteers || []).find(v => v.id === userId || (user && v.email === user.email));
    const myShifts = myVol ? (myVol.availability || []) : ['Saturday 10:00 - 14:00', 'Sunday 12:00 - 16:00'];
    const myRisks = (data.risks || []).filter(r => r.reportedBy === userId);

    const activeEvent = (data.events || []).find(e => e.id === eventId) || (data.events || [])[0];
    const eventSummary = activeEvent ? {
      name: activeEvent.name,
      eventDate: activeEvent.eventDate,
      venue: activeEvent.venue
    } : null;

    return {
      role: 'volunteer',
      user: { id: userId, name: user ? user.name : 'Volunteer' },
      myTasks,
      myShifts,
      myRisks,
      event: eventSummary
      // Notice: NO other members' tasks, NO other members' workloads, NO budgets, NO internal financial/admin docs
    };
  }

  // 3. ADMIN: buildFullContext
  const activeEvent = (data.events || []).find(e => e.id === eventId) || (data.events || [])[0];
  return {
    role: 'admin',
    user: { id: user ? user.id : 'admin-1', name: user ? user.name : 'President', role: 'President' },
    event: activeEvent,
    tasks: data.tasks || [],
    volunteers: data.volunteers || [],
    risks: data.risks || [],
    budgets: data.budgets || [],
    announcements: data.announcements || [],
    meetings: data.meetings || []
  };
}

module.exports = {
  normalizeCopilotRole,
  getToolsForRole,
  getContextForRole
};
