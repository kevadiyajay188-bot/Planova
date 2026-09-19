const crypto = require('node:crypto');

class AiActivityLogger {
  constructor(store) {
    this.store = store;
  }

  async logAction({ user, eventId, eventTag = 'AI Copilot', actionDescription, toolName, input, result, affectedEntities = [], undoSnapshot = null }) {
    const actionId = `ai-act-${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    const activityEntry = {
      id: actionId,
      actor: 'ai',
      authorName: 'Planova AI',
      text: actionDescription,
      occurredAt: now,
      eventTag,
      undoable: Boolean(undoSnapshot)
    };

    const auditRecord = {
      id: actionId,
      userId: user?.id || 'system',
      username: user?.username || 'User',
      eventId: eventId || 'evt-general',
      toolName,
      input,
      result,
      affectedEntities, // e.g. [{ type: 'task', id: 'task-123' }]
      undoSnapshot,    // e.g. { createdIds: [...], previousState: {...} }
      timestamp: now,
      status: 'executed'
    };

    await this.store.update((data) => {
      if (!data.activities) data.activities = [];
      if (!data.aiActions) data.aiActions = [];

      data.activities.unshift(activityEntry);
      data.aiActions.unshift(auditRecord);
    });

    return { actionId, activityEntry };
  }

  async getAiActivityHistory(limit = 20) {
    const data = await this.store.read();
    return (data.aiActions || []).slice(0, limit);
  }
}

module.exports = { AiActivityLogger };

