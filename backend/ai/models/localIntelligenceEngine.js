/**
 * Planova Local Intelligence Engine
 * Provides deterministic pattern recognition, semantic intent matching,
 * similarity heuristics, and tool resolution for the Planova AI Copilot.
 */

class LocalIntelligenceEngine {
  constructor() {
    this.name = 'PlanovaLocalEngine';
  }

  /**
   * Classify user intent into an appropriate action / tool.
   */
  classifyIntent(message, context = {}) {
    const text = String(message || '').toLowerCase();

    if (/who\s+is\s+free|available\s+volunteers?|find\s+volunteers?|who\s+can\s+help|volunteer\s+recommendation/i.test(text)) {
      return {
        action: 'find_volunteers',
        toolName: 'find_free_volunteers',
        params: {
          skill: this.extractSkillMention(text),
          day: this.extractDayMention(text),
          maxLoad: 6
        }
      };
    }

    if (/rebalance|overload(ed)?|redistribute\s+tasks?|workload/i.test(text)) {
      return {
        action: 'rebalance_workload',
        toolName: 'rebalance_workload',
        params: {
          threshold: 6,
          eventId: context.currentEventId || 'evt-technova'
        }
      };
    }

    if (/generate\s+(an?\s+)?(event\s+)?plan|create\s+(an?\s+)?plan|plan\s+for/i.test(text)) {
      const eventName = this.extractEventName(text) || context.currentEventName || 'New Event';
      const eventType = this.extractEventType(text) || context.currentEventType || 'Hackathon';
      return {
        action: 'generate_plan',
        toolName: 'generate_event_plan',
        params: {
          name: eventName,
          type: eventType,
          budget: this.extractNumber(text, 10000),
          expectedAttendance: this.extractAttendance(text, 400)
        }
      };
    }

    if (/(potential\s+)?risks?|detect\s+risks?|flag\s+risks?|what\s+could\s+go\s+wrong/i.test(text)) {
      return {
        action: 'detect_risks',
        toolName: 'create_risk',
        params: {
          eventId: context.currentEventId || 'evt-technova'
        }
      };
    }

    if (/budget|spending|cost|financial|expense|overrun/i.test(text)) {
      if (/last\s+year|sound|stage|previous|history|historical/i.test(text)) {
        return {
          action: 'search_knowledge',
          toolName: 'search_documents',
          params: { query: message }
        };
      }
      return {
        action: 'get_budget',
        toolName: 'get_event_budget',
        params: {
          eventId: context.currentEventId || 'evt-technova'
        }
      };
    }

    if (/similar\s+events?|historical\s+events?|past\s+competitions?|past\s+hackathons?/i.test(text)) {
      return {
        action: 'find_similar_events',
        toolName: 'find_similar_events',
        params: {
          eventId: context.currentEventId || 'evt-technova'
        }
      };
    }

    if (/delete\s+task|remove\s+task/i.test(text)) {
      const match = text.match(/(?:task\s+)?([a-z0-9_-]+)/i);
      return {
        action: 'delete_task',
        toolName: 'delete_task',
        params: {
          taskId: this.extractTaskId(text) || 'task-done-1'
        }
      };
    }

    if (/assign\s+task|assign\s+volunteer/i.test(text)) {
      return {
        action: 'assign_task',
        toolName: 'assign_task',
        params: {
          taskId: this.extractTaskId(text) || 'task-doing-1',
          volunteerId: this.extractVolunteerMention(text) || 'vol-1'
        }
      };
    }

    if (/create\s+task|add\s+task|standard\s+registration\s+tasks?/i.test(text)) {
      return {
        action: 'create_task',
        toolName: 'create_task',
        params: {
          title: this.extractTaskTitle(message) || 'Coordinate Venue Logistics',
          category: 'Operations',
          priority: 'High',
          daysFromNow: 5,
          eventId: context.currentEventId || 'evt-technova'
        }
      };
    }

    if (/delay|deadline|postpone|extend/i.test(text)) {
      return {
        action: 'update_deadline',
        toolName: 'update_deadline',
        params: {
          taskId: context.currentTaskId || 'task-doing-1',
          newDeadlineDays: 7
        }
      };
    }

    if (/meeting|minutes|transcript|action\s+items/i.test(text)) {
      return {
        action: 'analyze_meeting',
        toolName: 'create_meeting_action',
        params: {
          transcript: message
        }
      };
    }

    if (/announcement|broadcast|notify\s+members/i.test(text)) {
      return {
        action: 'create_announcement',
        toolName: 'create_announcement',
        params: {
          title: 'Event Operations Update',
          content: message,
          audience: 'All Volunteers'
        }
      };
    }

    // Default to RAG knowledge search
    return {
      action: 'search_knowledge',
      toolName: 'search_documents',
      params: { query: message }
    };
  }

  extractSkillMention(text) {
    const skills = [
      'stage management', 'stage setup', 'sound check', 'sponsorship',
      'poster design', 'graphic design', 'marketing', 'logistics',
      'registration', 'technical setup', 'av', 'hardware'
    ];
    for (const skill of skills) {
      if (text.includes(skill)) {
        return skill.split(' ').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
      }
    }
    return null;
  }

  extractDayMention(text) {
    const days = ['saturday morning', 'saturday evening', 'saturday afternoon', 'saturday', 'sunday', 'friday'];
    for (const day of days) {
      if (text.includes(day)) return day;
    }
    return null;
  }

  extractEventName(text) {
    const match = text.match(/(?:for|event)\s+["']?([A-Za-z0-9\s-]{3,40}?)(?:["']|\s+(?:in|with|having|$))/i);
    return match ? match[1].trim() : null;
  }

  extractEventType(text) {
    if (/hackathon/i.test(text)) return 'Hackathon';
    if (/competition|championship|contest/i.test(text)) return 'Competition';
    if (/workshop|bootcamp/i.test(text)) return 'Workshop';
    if (/networking|mixer|meetup/i.test(text)) return 'Networking';
    return 'Hackathon';
  }

  extractNumber(text, fallback) {
    const match = text.match(/(?:budget|₹|\$|rs\.?)\s*([0-9,]+)/i) || text.match(/([0-9,]+)\s*(?:budget|inr|usd)/i);
    if (!match) return fallback;
    const num = parseInt(match[1].replace(/,/g, ''), 10);
    return Number.isFinite(num) && num > 0 ? num : fallback;
  }

  extractAttendance(text, fallback) {
    const match = text.match(/([0-9]+)\s*(?:attendees|participants|students|people)/i);
    if (!match) return fallback;
    const num = parseInt(match[1], 10);
    return Number.isFinite(num) && num > 0 ? num : fallback;
  }

  extractTaskTitle(text) {
    const match = text.match(/(?:create|add)(?:\s+the)?\s+task\s+["']?([^"'\n]+?)["']?(?:$|\s+for|\s+with)/i);
    return match ? match[1].trim() : null;
  }

  extractTaskId(text) {
    const match = text.match(/(task-[a-z0-9_-]+)/i);
    return match ? match[1] : null;
  }

  extractVolunteerMention(text) {
    const match = text.match(/(vol-[a-z0-9_-]+)/i);
    return match ? match[1] : null;
  }
}

module.exports = { LocalIntelligenceEngine };
