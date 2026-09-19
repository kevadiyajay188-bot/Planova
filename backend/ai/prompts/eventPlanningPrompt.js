function buildEventPlanningPrompt({ eventName, eventType, expectedAttendance, budgetPlanned, similarEvents = [] }) {
  const similarContext = similarEvents.map(s => `- ${s.name}: ${s.expectedAttendance} attendees, budget $${s.budgetPlanned}`).join('\n');

  return `Generate an operational event plan for:
Event Name: ${eventName}
Event Type: ${eventType}
Expected Attendance: ${expectedAttendance}
Planned Budget: $${budgetPlanned}

Similar Historical Precedents:
${similarContext || 'No identical past events found.'}

Synthesize recurring tasks, realistic deadlines based on past velocity, milestone checkpoints, and common failure risks with mitigations. Provide an explanatory rationale for each recommendation.`;
}

module.exports = { buildEventPlanningPrompt };

