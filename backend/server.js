const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { getConfig } = require('./config/env');
const { createStore } = require('./database/store');
const { createAuthService } = require('./services/authService');
const { createDashboardService } = require('./services/dashboardService');
const { createLoginRateLimiter } = require('./auth/rateLimit');
const { handleApi } = require('./routes/apiRoutes');
const { failure } = require('./utils/http');
const { AiOrchestrator } = require('./ai/orchestrator/aiOrchestrator');
const { RUNTIME_BRIDGE: ROLE_RUNTIME_BRIDGE } = require('./auth/runtimeBridge');

const MIME_TYPES = { '.html': 'text/html; charset=utf-8', '.jsx': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8' };
const RUNTIME_BRIDGE = `<script>\n(() => {\n  const nativeFetch = window.fetch.bind(window);\n  const sessionKey = 'planova.auth.user';\n  const clearSession = () => { localStorage.removeItem('token'); localStorage.removeItem(sessionKey); };\n  const homeForRole = (user) => user && user.role === 'WEB_USER' ? '/?public=1' : '/dashboard.html';\n  window.PlanovaAuth = {\n    setSession(result) {\n      const token = result && result.token;\n      const user = result && (result.user || (result.data && result.data.user));\n      if (token) localStorage.setItem('token', token);\n      if (user) localStorage.setItem(sessionKey, JSON.stringify(user));\n      return user;\n    },\n    user() { try { return JSON.parse(localStorage.getItem(sessionKey) || 'null'); } catch { return null; } },\n    clearSession,\n    redirectForRole(user) { location.assign(homeForRole(user || this.user())); },\n    async logout() {\n      try { await nativeFetch('/api/auth/logout', { method: 'POST', headers: { Authorization: 'Bearer ' + (localStorage.getItem('token') || '') } }); } finally { clearSession(); location.assign('/'); }\n    }\n  };\n  window.fetch = (input, init = {}) => {\n    const url = typeof input === 'string' ? input : input.url;\n    if (!url.startsWith('/api/')) return nativeFetch(input, init);\n    const token = localStorage.getItem('token');\n    const headers = new Headers(init.headers || (typeof input === 'object' ? input.headers : undefined));\n    if (token) headers.set('Authorization', 'Bearer ' + token);\n    return nativeFetch(input, { ...init, headers }).then((response) => {\n      if (response.status === 401 && !url.startsWith('/api/auth/')) { clearSession(); if (location.pathname !== '/') location.replace('/'); }\n      return response;\n    });\n  };\n  async function protectPage() {\n    const protectedPage = location.pathname.endsWith('/dashboard.html') || location.pathname.endsWith('/documents-review.html');\n    if (!protectedPage) return;\n    const token = localStorage.getItem('token');\n    if (!token) return location.replace('/');\n    try {\n      const response = await nativeFetch('/api/auth/me', { headers: { Authorization: 'Bearer ' + token } });\n      if (!response.ok) throw new Error('No active session');\n      const payload = await response.json();\n      const user = window.PlanovaAuth.setSession(payload);\n      if (location.pathname.endsWith('/dashboard.html') && user.role === 'WEB_USER') return location.replace('/?public=1');\n      if (location.pathname.endsWith('/documents-review.html') && user.role !== 'PRESIDENT') return location.replace('/dashboard.html');\n    } catch { clearSession(); location.replace('/'); }\n  }\n  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', protectPage); else protectPage();\n})();\n</script>`;
const BUDGET_SELECTOR_BRIDGE = `<script>\n(() => {\n  function mountBudgetSelector() {\n    const heading = Array.from(document.querySelectorAll('h3')).find((node) => node.textContent.trim() === 'Event Budget Tracker');\n    if (!heading) return false;\n    const card = heading.parentElement.parentElement;\n    if (card.dataset.eventSelectorMounted) return true;\n    card.dataset.eventSelectorMounted = 'true';\n    fetch('/api/events').then((response) => response.ok ? response.json() : Promise.reject()).then((events) => {\n      if (!Array.isArray(events) || !events.length) return;\n      const currentLabel = heading.parentElement.lastElementChild;\n      const select = document.createElement('select');\n      select.className = 'text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-black cursor-pointer';\n      select.setAttribute('aria-label', 'Select event');\n      const defaultEvent = events.find((event) => event.budgetLabel === currentLabel.textContent.trim()) || events[0];\n      events.forEach((event) => {\n        const option = document.createElement('option');\n        option.value = event.id;\n        option.textContent = event.budgetLabel || event.name;\n        option.selected = event.id === defaultEvent.id;\n        select.append(option);\n      });\n      currentLabel.replaceWith(select);\n    }).catch(() => { card.dataset.eventSelectorMounted = ''; });\n    return true;\n  }\n  let attempts = 0; const timer = setInterval(() => { if (mountBudgetSelector() || ++attempts > 50) clearInterval(timer); }, 100);\n})();\n</script>`;

function runtimeHtml(source, fileName) {
  let page = source;
  if (fileName === 'index.html') page = page.replace(/\s*\/\/ Mock \/api\/auth\/\* for preview[\s\S]*?\n\s*function AuthPage/, '\n    function AuthPage');
  const enhancements = fileName === 'dashboard.html' ? `${ROLE_RUNTIME_BRIDGE}\n${BUDGET_SELECTOR_BRIDGE}` : ROLE_RUNTIME_BRIDGE;
  return page.replace('<body', `${enhancements}\n<body`);
}

function safeFilePath(frontendDirectory, pathname) {
  let requested = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  if (requested === 'announcements' || requested === 'announcements/') {
    requested = 'student-announcements.html';
  }
  if (requested === 'events/new' || requested === 'events/new/') {
    requested = 'events-new.html';
  }
  const resolved = path.resolve(frontendDirectory, requested);
  return resolved.startsWith(`${path.resolve(frontendDirectory)}${path.sep}`) || resolved === path.resolve(frontendDirectory) ? resolved : null;
}


function createServer(overrides = {}) {
  const config = getConfig(overrides);
  const store = createStore(config.databaseFile);
  const aiOrchestrator = new AiOrchestrator(store, config);
  const context = {
    config,
    store,
    auth: createAuthService(store, config),
    dashboard: createDashboardService(store),
    aiOrchestrator,
    loginRateLimiter: createLoginRateLimiter({ maxAttempts: config.loginRateLimitAttempts, windowMs: config.loginRateLimitWindowMinutes * 60 * 1000 })
  };
  return http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
      if (request.method === 'OPTIONS') {
        response.writeHead(204, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, HEAD',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, X-Requested-With',
          'Access-Control-Max-Age': '86400'
        });
        return response.end();
      }
      if (url.pathname.startsWith('/api/')) return await handleApi(request, response, url, context);
      if (request.method !== 'GET' && request.method !== 'HEAD') return failure(response, 405, 'Method not allowed.');
      const filePath = safeFilePath(config.frontendDirectory, decodeURIComponent(url.pathname));
      if (!filePath) return failure(response, 403, 'Access denied.');
      let content;
      try { content = await fs.readFile(filePath); } catch (error) { if (error.code === 'ENOENT') return failure(response, 404, 'Page not found.'); throw error; }
      const extension = path.extname(filePath).toLowerCase();
      const type = MIME_TYPES[extension] || 'application/octet-stream';
      if (extension === '.html') content = Buffer.from(runtimeHtml(content.toString('utf8'), path.basename(filePath)), 'utf8');
      response.writeHead(200, {
        'Content-Type': type,
        'Access-Control-Allow-Origin': '*',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'same-origin',
        'Cache-Control': extension === '.html' ? 'no-store' : 'public, max-age=3600'
      });
      if (request.method === 'HEAD') return response.end();
      response.end(content);
    } catch (error) {
      if (response.headersSent) return response.end();
      const status = error.status || 500;
      if (status >= 500) console.error(error);
      failure(response, status, status >= 500 ? 'An unexpected server error occurred.' : error.message);
    }
  });
}

if (require.main === module) {
  const config = getConfig();
  createServer(config).listen(config.port, () => console.log(`Planova is running at http://localhost:${config.port}`));
}

module.exports = { createServer };
