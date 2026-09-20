function authorizedClubId(user) {
  return user && user.clubId ? user.clubId : null;
}

function belongsToClub(record, user) {
  const clubId = authorizedClubId(user);
  return Boolean(clubId && record && record.clubId === clubId);
}

function scopeCollection(records, user) {
  const clubId = authorizedClubId(user);
  return clubId ? (records || []).filter((record) => record.clubId === clubId) : [];
}

module.exports = { authorizedClubId, belongsToClub, scopeCollection };