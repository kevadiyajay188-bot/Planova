class AiUndoService {
  constructor(store) {
    this.store = store;
  }

  async undoAction(actionId, user) {
    let undoneRecord = null;
    let revertedEntitiesSummary = '';

    await this.store.update((data) => {
      const actions = data.aiActions || [];
      const actionIndex = actions.findIndex(a => a.id === actionId);

      if (actionIndex < 0) {
        throw Object.assign(new Error(`AI action '${actionId}' not found.`), { status: 404 });
      }

      const action = actions[actionIndex];
      if (action.undone) {
        throw Object.assign(new Error(`AI action '${actionId}' has already been undone.`), { status: 400 });
      }

      const snapshot = action.undoSnapshot;
      if (!snapshot) {
        throw Object.assign(new Error(`AI action '${actionId}' is not reversible.`), { status: 400 });
      }

      // Revert newly created entities
      if (snapshot.createdTasks && Array.isArray(snapshot.createdTasks)) {
        const idSet = new Set(snapshot.createdTasks);
        data.tasks = (data.tasks || []).filter(t => !idSet.has(t.id));
        revertedEntitiesSummary += `Removed ${idSet.size} created task(s). `;
      }

      if (snapshot.createdRisks && Array.isArray(snapshot.createdRisks)) {
        const idSet = new Set(snapshot.createdRisks);
        data.risks = (data.risks || []).filter(r => !idSet.has(r.id));
        revertedEntitiesSummary += `Removed ${idSet.size} created risk(s). `;
      }

      if (snapshot.createdAnnouncements && Array.isArray(snapshot.createdAnnouncements)) {
        const idSet = new Set(snapshot.createdAnnouncements);
        data.announcements = (data.announcements || []).filter(a => !idSet.has(a.id));
        revertedEntitiesSummary += `Removed ${idSet.size} announcement(s). `;
      }

      // Restore previous state of modified entities
      if (snapshot.previousTasks && Array.isArray(snapshot.previousTasks)) {
        for (const prev of snapshot.previousTasks) {
          const idx = (data.tasks || []).findIndex(t => t.id === prev.id);
          if (idx >= 0) {
            data.tasks[idx] = { ...data.tasks[idx], ...prev };
          }
        }
        revertedEntitiesSummary += `Restored ${snapshot.previousTasks.length} task(s) to previous state. `;
      }

      if (snapshot.volunteerLoads && Array.isArray(snapshot.volunteerLoads)) {
        for (const load of snapshot.volunteerLoads) {
          const idx = (data.volunteers || []).findIndex(v => v.id === load.id);
          if (idx >= 0) {
            data.volunteers[idx].activeTasks = load.activeTasks;
          }
        }
        revertedEntitiesSummary += `Restored volunteer task counts. `;
      }

      // Mark the action as undone
      action.undone = true;
      action.undoneAt = new Date().toISOString();
      action.undoneBy = user?.username || 'User';

      // Update activity feed item if present
      const act = (data.activities || []).find(a => a.id === actionId);
      if (act) {
        act.undoable = false;
        act.text += ' (Undone)';
      }

      undoneRecord = action;
    });

    return {
      success: true,
      actionId,
      summary: revertedEntitiesSummary || 'Changes reverted successfully.',
      undoneRecord
    };
  }
}

module.exports = { AiUndoService };

