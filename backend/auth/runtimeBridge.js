const RUNTIME_BRIDGE = `<script>
(() => {
  const nativeFetch = window.fetch.bind(window);
  const sessionKey = 'planova.auth.user';
  const clearSession = () => {
    localStorage.removeItem('token');
    localStorage.removeItem(sessionKey);
  };
  const homeForRole = (user) => {
    if (!user) return '/';
    if (user.role === 'WEB_USER') return '/user.html';
    if (user.role === 'VOLUNTEER') return '/my-tasks.html';
    return '/dashboard.html';
  };
  const pageRoles = {
    '/dashboard.html': ['PRESIDENT', 'TEAM_LEAD'],
    '/events-new.html': ['PRESIDENT', 'TEAM_LEAD'],
    '/tasks.html': ['PRESIDENT', 'TEAM_LEAD'],
    '/deadlines.html': ['PRESIDENT', 'TEAM_LEAD'],
    '/volunteers.html': ['PRESIDENT', 'TEAM_LEAD'],
    '/meetings.html': ['PRESIDENT', 'TEAM_LEAD', 'VOLUNTEER'],
    '/announcements.html': ['PRESIDENT', 'TEAM_LEAD'],
    '/documents-review.html': ['PRESIDENT', 'TEAM_LEAD'],
    '/knowledge.html': ['PRESIDENT', 'TEAM_LEAD'],
    '/risks.html': ['PRESIDENT', 'TEAM_LEAD'],
    '/my-tasks.html': ['VOLUNTEER'],
    '/user.html': ['WEB_USER'],
    '/profile.html': ['PRESIDENT', 'TEAM_LEAD', 'VOLUNTEER', 'WEB_USER']
  };

  window.PlanovaAuth = {
    setSession(result) {
      const token = result && result.token;
      const user = result && (result.user || (result.data && result.data.user));
      if (token) localStorage.setItem('token', token);
      if (user) localStorage.setItem(sessionKey, JSON.stringify(user));
      return user;
    },
    user() {
      try { return JSON.parse(localStorage.getItem(sessionKey) || 'null'); } catch { return null; }
    },
    clearSession,
    redirectForRole(user) { location.assign(homeForRole(user || this.user())); },
    async logout() {
      try {
        await nativeFetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + (localStorage.getItem('token') || '') }
        });
      } finally {
        clearSession();
        location.assign('/');
      }
    }
  };

  window.fetch = (input, init = {}) => {
    const url = typeof input === 'string' ? input : input.url;
    if (!url.startsWith('/api/')) return nativeFetch(input, init);
    const token = localStorage.getItem('token');
    const headers = new Headers(init.headers || (typeof input === 'object' ? input.headers : undefined));
    if (token) headers.set('Authorization', 'Bearer ' + token);
    return nativeFetch(input, { ...init, headers }).then((response) => {
      if (response.status === 401 && !url.startsWith('/api/auth/')) {
        clearSession();
        if (location.pathname !== '/') location.replace('/');
      }
      return response;
    });
  };

  async function protectPage() {
    const requiredRoles = pageRoles[location.pathname];
    if (!requiredRoles) return;
    const token = localStorage.getItem('token');
    if (!token) return location.replace('/');
    try {
      const response = await nativeFetch('/api/auth/me', {
        headers: { Authorization: 'Bearer ' + token }
      });
      if (!response.ok) throw new Error('No active session');
      const payload = await response.json();
      const user = window.PlanovaAuth.setSession(payload);
      if (!user || !requiredRoles.includes(user.role)) location.replace(homeForRole(user));
    } catch {
      clearSession();
      location.replace('/');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', protectPage);
  else protectPage();
})();
</script>`;

module.exports = { RUNTIME_BRIDGE };
