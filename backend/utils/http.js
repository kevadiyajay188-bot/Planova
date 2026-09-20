const MAX_BODY_BYTES = 1024 * 1024;

function sendJson(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, HEAD',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, X-Requested-With'
  });
  response.end(JSON.stringify(body));
}

function success(response, data, status = 200, extra = {}) {
  sendJson(response, status, { success: true, data, ...extra });
}

function failure(response, status, message, details) {
  sendJson(response, status, { success: false, message, ...(details ? { details } : {}) });
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      const error = new Error('Request body is too large.');
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  if (size === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    const error = new Error('Request body must be valid JSON.');
    error.status = 400;
    throw error;
  }
}

function notFound(response) {
  failure(response, 404, 'The requested resource was not found.');
}

module.exports = { sendJson, success, failure, readJson, notFound };
