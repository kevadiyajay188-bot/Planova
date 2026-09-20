/**
 * Deterministic Owner and Deadline Resolvers
 * Implemented strictly in code without LLM hallucination.
 */

function levenshteinDistance(s1 = '', s2 = '') {
  const a = String(s1).toLowerCase().trim();
  const b = String(s2).toLowerCase().trim();
  const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return matrix[a.length][b.length];
}

/**
 * resolveOwner(name, roster)
 * 1. exact match on roster first/full name -> confidence 0.95
 * 2. fuzzy match (Levenshtein <= 2) -> confidence 0.75
 * 3. two+ matches -> ownerId = null, flag "ambiguous", show both as picker options in review UI
 * 4. no match -> ownerId = null, flag for manual pick
 */
function resolveOwner(rawName, roster = []) {
  if (!rawName || typeof rawName !== 'string' || !rawName.trim()) {
    return {
      ownerId: null,
      ownerName: null,
      confidence: 0,
      status: 'manual_pick',
      options: roster.map(r => ({ id: r.id, name: r.name }))
    };
  }

  const query = rawName.trim().toLowerCase();

  // 1. Exact match on full name or first name
  const exactMatches = roster.filter(member => {
    const fullName = (member.name || '').toLowerCase().trim();
    const firstName = fullName.split(/\s+/)[0];
    return fullName === query || firstName === query;
  });

  if (exactMatches.length === 1) {
    return {
      ownerId: exactMatches[0].id,
      ownerName: exactMatches[0].name,
      confidence: 0.95,
      status: 'resolved',
      options: []
    };
  }

  if (exactMatches.length > 1) {
    return {
      ownerId: null,
      ownerName: rawName,
      confidence: 0.5,
      status: 'ambiguous',
      options: exactMatches.map(r => ({ id: r.id, name: r.name }))
    };
  }

  // 2. Fuzzy match (Levenshtein <= 2 on full name or first name)
  const fuzzyMatches = [];
  for (const member of roster) {
    const fullName = (member.name || '').toLowerCase().trim();
    const firstName = fullName.split(/\s+/)[0];
    const distFull = levenshteinDistance(query, fullName);
    const distFirst = levenshteinDistance(query, firstName);

    if (distFull <= 2 || distFirst <= 2) {
      fuzzyMatches.push(member);
    }
  }

  if (fuzzyMatches.length === 1) {
    return {
      ownerId: fuzzyMatches[0].id,
      ownerName: fuzzyMatches[0].name,
      confidence: 0.75,
      status: 'resolved_fuzzy',
      options: []
    };
  }

  if (fuzzyMatches.length > 1) {
    return {
      ownerId: null,
      ownerName: rawName,
      confidence: 0.4,
      status: 'ambiguous',
      options: fuzzyMatches.map(r => ({ id: r.id, name: r.name }))
    };
  }

  // 4. No match
  return {
    ownerId: null,
    ownerName: rawName,
    confidence: 0,
    status: 'manual_pick',
    options: roster.map(r => ({ id: r.id, name: r.name }))
  };
}

/**
 * resolveDue(dueText, meetingDate, eventEndDate)
 * "by Friday" -> next Friday after meetingDate, 18:00
 * "next week" -> Monday of following week, 18:00
 * "ASAP" -> meetingDate + 1 day, priority bumped to P1
 * Clamp: never let a resolved date fall after eventEndDate - pull back to eventEndDate minus 1 day and flag for review.
 */
function resolveDue(dueText, meetingDateInput, eventEndDateInput) {
  const meetingDate = meetingDateInput ? new Date(meetingDateInput) : new Date();
  const eventEndDate = eventEndDateInput ? new Date(eventEndDateInput) : null;

  if (Number.isNaN(meetingDate.getTime())) {
    return { dueAt: null, priorityBump: false, clamped: false, note: 'Invalid meeting date' };
  }

  const raw = String(dueText || '').toLowerCase().trim();
  let resolved = new Date(meetingDate.getTime());
  let priorityBump = false;

  if (raw.includes('asap') || raw.includes('immediately') || raw.includes('urgent') || raw.includes('right away')) {
    resolved.setDate(resolved.getDate() + 1);
    resolved.setHours(18, 0, 0, 0);
    priorityBump = true;
  } else if (raw.includes('tomorrow')) {
    resolved.setDate(resolved.getDate() + 1);
    resolved.setHours(18, 0, 0, 0);
  } else if (raw.includes('next week')) {
    // Monday of next week
    const currentDay = meetingDate.getDay(); // 0 is Sunday, 1 is Monday...
    const daysUntilNextMonday = ((1 + 7 - currentDay) % 7) || 7;
    resolved.setDate(resolved.getDate() + daysUntilNextMonday);
    resolved.setHours(18, 0, 0, 0);
  } else if (raw.includes('friday') || raw.includes('by fri')) {
    // Next Friday after meetingDate
    const currentDay = meetingDate.getDay(); // 5 is Friday
    let daysUntilFriday = (5 - currentDay + 7) % 7;
    if (daysUntilFriday === 0) daysUntilFriday = 7; // strictly next Friday
    resolved.setDate(resolved.getDate() + daysUntilFriday);
    resolved.setHours(18, 0, 0, 0);
  } else if (raw.includes('monday') || raw.includes('by mon')) {
    const currentDay = meetingDate.getDay();
    let daysUntilMon = (1 - currentDay + 7) % 7;
    if (daysUntilMon === 0) daysUntilMon = 7;
    resolved.setDate(resolved.getDate() + daysUntilMon);
    resolved.setHours(18, 0, 0, 0);
  } else if (raw.includes('thursday') || raw.includes('by thu')) {
    const currentDay = meetingDate.getDay();
    let daysUntilThu = (4 - currentDay + 7) % 7;
    if (daysUntilThu === 0) daysUntilThu = 7;
    resolved.setDate(resolved.getDate() + daysUntilThu);
    resolved.setHours(18, 0, 0, 0);
  } else if (raw.includes('wednesday') || raw.includes('by wed')) {
    const currentDay = meetingDate.getDay();
    let daysUntilWed = (3 - currentDay + 7) % 7;
    if (daysUntilWed === 0) daysUntilWed = 7;
    resolved.setDate(resolved.getDate() + daysUntilWed);
    resolved.setHours(18, 0, 0, 0);
  } else if (raw.includes('tuesday') || raw.includes('by tue')) {
    const currentDay = meetingDate.getDay();
    let daysUntilTue = (2 - currentDay + 7) % 7;
    if (daysUntilTue === 0) daysUntilTue = 7;
    resolved.setDate(resolved.getDate() + daysUntilTue);
    resolved.setHours(18, 0, 0, 0);
  } else {
    // Default fallback: 3 days from meeting
    resolved.setDate(resolved.getDate() + 3);
    resolved.setHours(18, 0, 0, 0);
  }

  // Clamping check
  let clamped = false;
  if (eventEndDate && !Number.isNaN(eventEndDate.getTime())) {
    if (resolved.getTime() >= eventEndDate.getTime()) {
      clamped = true;
      resolved = new Date(eventEndDate.getTime() - 24 * 60 * 60 * 1000);
      resolved.setHours(18, 0, 0, 0);
    }
  }

  return {
    dueAt: resolved.toISOString(),
    priorityBump,
    clamped,
    dueText: raw,
    flagForReview: clamped
  };
}

module.exports = {
  levenshteinDistance,
  resolveOwner,
  resolveDue
};
