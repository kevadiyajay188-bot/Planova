const crypto = require('node:crypto');

function toBase64Url(value) {
  return Buffer.from(value).toString('base64url');
}

function sign(payload, secret, ttlHours) {
  if (!secret || typeof secret !== 'string') throw new Error('JWT signing secret is not configured.');
  const now = Math.floor(Date.now() / 1000);
  const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = toBase64Url(JSON.stringify({ ...payload, iat: now, exp: now + (ttlHours * 60 * 60) }));
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verify(token, secret) {
  if (typeof token !== 'string') return null;
  const [header, body, signature] = token.split('.');
  if (!header || !body || !signature) return null;
  const expected = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest();
  const supplied = Buffer.from(signature, 'base64url');
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return null;
  try {
    const parsedHeader = JSON.parse(Buffer.from(header, 'base64url').toString('utf8'));
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (parsedHeader.alg !== 'HS256' || parsedHeader.typ !== 'JWT' || !payload.sub || !payload.sid || !Number.isInteger(payload.exp) || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

module.exports = { sign, verify };
