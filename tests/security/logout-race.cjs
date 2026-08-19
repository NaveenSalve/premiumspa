'use strict';

// Logout revocation race: fire a burst of authenticated requests racing a
// logout, then confirm the (previously valid) cookie can never be reused after
// the logout commits. Requests that resolved BEFORE logout may legitimately be
// 200; the invariant is that POST-logout reuse is rejected.

const { request, setCookieFrom, createReporter } = require('./lib/assert.cjs');

const BASE = (process.env.BASE_URL || 'http://127.0.0.1:4000').replace(/\/+$/, '');
const TEST_ADMIN_PIN = process.env.TEST_ADMIN_PIN || '';

const T = createReporter('logout race');

(async () => {
  const login = await fetch(BASE + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: TEST_ADMIN_PIN }),
  });
  const cookie = (login.headers.get('set-cookie') || '').split(';')[0];

  const burst = Array.from({ length: 8 }, () => request(BASE, '/api/auth/me', { cookie }));
  const logoutStatus = await request(BASE, '/api/auth/logout', { method: 'POST', cookie });
  const burstResults = await Promise.all(burst);

  const afterLogout = await request(BASE, '/api/auth/me', { cookie });
  console.log(`    logout=${logoutStatus.status} burst=[${burstResults.map((r) => r.status).join(',')}] afterLogout=${afterLogout.status}`);
  T.record('logout race: no post-logout reuse succeeds', logoutStatus.status === 200 && afterLogout.status === 401, `afterLogout=${afterLogout.status}`);

  T.finish();
})().catch((e) => {
  console.error('HARNESS ERROR:', e && e.message ? e.message : e);
  process.exit(2);
});
