/**
 * Volunteer Recommendation & Workload Balancing Service
 */

class VolunteerRecommendationService {
  constructor(store) {
    this.store = store;
  }

  async recommendVolunteersForTask({ taskTitle, requiredSkill, eventId }) {
    const data = await this.store.read();
    const volunteers = data.volunteers || [];

    const scored = volunteers.map(v => {
      let score = 0;
      const reasons = [];

      // 1. Skill Match (40 pts)
      const hasSkill = requiredSkill && (v.skills || []).some(s => s.toLowerCase().includes(requiredSkill.toLowerCase()));
      if (hasSkill) {
        score += 40;
        reasons.push(`Has verified skill in '${requiredSkill}'`);
      }

      // 2. Workload Availability (40 pts)
      const activeTasks = v.activeTasks || 0;
      if (activeTasks <= 2) {
        score += 40;
        reasons.push(`Light workload (${activeTasks} active tasks)`);
      } else if (activeTasks <= 5) {
        score += 25;
        reasons.push(`Balanced workload (${activeTasks} active tasks)`);
      } else if (activeTasks <= 6) {
        score += 10;
        reasons.push(`Near capacity (${activeTasks} active tasks)`);
      } else {
        score -= 20;
        reasons.push(`Currently overloaded (${activeTasks} active tasks - threshold is 6)`);
      }

      // 3. Past Experience (20 pts)
      const experience = v.experienceEvents || 1;
      score += Math.min(20, experience * 6);
      if (experience >= 2) {
        reasons.push(`Experienced across ${experience} past club events`);
      }

      return {
        id: v.id,
        name: v.name,
        email: v.email,
        activeTasks: v.activeTasks,
        skills: v.skills || [],
        availability: v.availability || [],
        score,
        isOverloaded: activeTasks > 6,
        reasons
      };
    });

    scored.sort((a, b) => b.score - a.score);

    return {
      taskTitle: taskTitle || 'New Task',
      requiredSkill: requiredSkill || 'General Operations',
      recommendedVolunteers: scored.slice(0, 3),
      allVolunteers: scored
    };
  }

  async rebalanceWorkload({ threshold = 6, eventId } = {}) {
    const data = await this.store.read();
    const volunteers = data.volunteers || [];

    const overloaded = volunteers.filter(v => (v.activeTasks || 0) > threshold);
    const available = volunteers.filter(v => (v.activeTasks || 0) <= 3).sort((a, b) => a.activeTasks - b.activeTasks);

    if (overloaded.length === 0) {
      return {
        needed: false,
        message: `All club volunteers are operating within safe workload limits (max active tasks <= ${threshold}).`,
        rebalancingPlan: []
      };
    }

    const rebalancingPlan = [];
    for (const over of overloaded) {
      const excess = over.activeTasks - threshold;
      const candidates = available.slice(0, Math.min(excess, available.length));

      for (const target of candidates) {
        rebalancingPlan.push({
          fromVolunteer: { id: over.id, name: over.name, currentTasks: over.activeTasks },
          toVolunteer: { id: target.id, name: target.name, currentTasks: target.activeTasks },
          tasksToMove: 1,
          rationale: `Reassign 1 task from ${over.name} (${over.activeTasks} active) to ${target.name} (${target.activeTasks} active) to prevent burnout and maintain milestone pace.`
        });
      }
    }

    return {
      needed: true,
      overloadedVolunteers: overloaded.map(v => ({ id: v.id, name: v.name, activeTasks: v.activeTasks })),
      rebalancingPlan,
      requiresConfirmation: true
    };
  }
}

module.exports = { VolunteerRecommendationService };

