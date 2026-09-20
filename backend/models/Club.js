const crypto = require('node:crypto');

const CLUB_ID_PATTERN = /^[A-Z0-9][A-Z0-9_-]{2,31}$/;
const DEFAULT_CLUB_ID = 'IEEE001';
const DEFAULT_CLUB_NAME = 'IEEE Student Branch';

function normalizeClubId(value) {
  const clubId = String(value || '').trim().toUpperCase();
  return CLUB_ID_PATTERN.test(clubId) ? clubId : null;
}

class Club {
  constructor({
    id = crypto.randomUUID(),
    clubId = DEFAULT_CLUB_ID,
    name = DEFAULT_CLUB_NAME,
    status = 'ACTIVE',
    settings = {},
    createdAt = new Date().toISOString(),
    updatedAt = createdAt
  } = {}) {
    const normalizedClubId = normalizeClubId(clubId);
    if (!normalizedClubId) throw new Error('A valid Club ID is required.');
    this.id = id;
    this.clubId = normalizedClubId;
    this.name = String(name || DEFAULT_CLUB_NAME).trim();
    this.status = String(status || 'ACTIVE').trim().toUpperCase();
    this.settings = settings && typeof settings === 'object' ? settings : {};
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  toPublicJSON() {
    return {
      id: this.id,
      clubId: this.clubId,
      name: this.name,
      status: this.status,
      settings: this.settings,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  toJSON() {
    return this.toPublicJSON();
  }
}

function createDefaultClub() {
  return new Club({ clubId: DEFAULT_CLUB_ID, name: DEFAULT_CLUB_NAME }).toJSON();
}

module.exports = {
  CLUB_ID_PATTERN,
  DEFAULT_CLUB_ID,
  DEFAULT_CLUB_NAME,
  normalizeClubId,
  Club,
  createDefaultClub
};