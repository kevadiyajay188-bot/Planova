const crypto = require('node:crypto');

const KEY_LENGTH = 64;
const SCRYPT_OPTIONS = Object.freeze({ N: 16384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 });

function hashPassword(password, salt = crypto.randomBytes(16).toString('base64url')) {
  const hash = crypto.scryptSync(String(password), salt, KEY_LENGTH, SCRYPT_OPTIONS).toString('base64url');
  return `scrypt$${SCRYPT_OPTIONS.N}$${SCRYPT_OPTIONS.r}$${SCRYPT_OPTIONS.p}$${salt}$${hash}`;
}

function compare(password, stored) {
  const value = String(stored || '');
  const modern = value.split('$');
  let salt;
  let expectedHash;
  let options = SCRYPT_OPTIONS;

  if (modern.length === 6 && modern[0] === 'scrypt') {
    const [, N, r, p, parsedSalt, parsedHash] = modern;
    if (![N, r, p].every((item) => /^\d+$/.test(item)) || !parsedSalt || !parsedHash) return false;
    salt = parsedSalt;
    expectedHash = parsedHash;
    options = { N: Number(N), r: Number(r), p: Number(p), maxmem: 32 * 1024 * 1024 };
  } else {
    // Read existing Planova accounts created before the versioned password format.
    [salt, expectedHash] = value.split(':');
    if (!salt || !expectedHash) return false;
  }

  try {
    const actual = Buffer.from(crypto.scryptSync(String(password), salt, KEY_LENGTH, options).toString('base64url'));
    const expected = Buffer.from(expectedHash);
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

module.exports = { hashPassword, compare };
