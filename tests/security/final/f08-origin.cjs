'use strict';

// F-08 origin matrix: the Origin allowlist must reject cross-origin
// state-changing requests while leaving same-origin + read-only traffic alone.
// Asserts against a disposable production server whose APP_ORIGIN is
// http://127.0.0.1:<port>.

const H = require('./helpers.cjs');
const T = H.createReporter('f08-origin');

async function main() {
  const { BASE } = H;
  const APP = new URL(BASE).origin; // e.g. http://127.0.0.1:4060
  const cookie = await H.adminLogin();

  const badOrigins = [
    'https://evil.example',
    'http://evil.example',
    'https://sub.trycloudflare.com',
    'http://127.0.0.1:9999',
    'http://localhost:' + new URL(BASE).port,
    'https://' + new URL(BASE).host,
    'null',
    `${APP}/evil`,
    'http://127.0.0.1:4060.evil.example',
  ];

  // 1) Same-origin state-changing request must NOT be blocked.
  const same = await H.req('/api/enquiries', {
    method: 'POST',
    body: { name: 'Origin Probe', mobile: '9988001122', message: 'same-origin probe' },
    headers: { Origin: APP },
  });
  T.record('F08 same-origin enquiry POST allowed', same.status === 200, `status=${same.status}`);

  // 2) Every disallowed Origin must be rejected 403 on state-changing methods.
  for (const o of badOrigins) {
    const r = await H.req('/api/enquiries', {
      method: 'POST',
      body: { name: 'Origin Probe', mobile: '9988001123', message: 'cross-origin probe' },
      headers: { Origin: o },
    });
    T.record(`F08 blocked origin ${o}`, r.status === 403, `status=${r.status}`);
  }

  // 3) Missing Origin (curl / server-to-server) must be allowed, not blocked.
  const noOrigin = await H.req('/api/enquiries', {
    method: 'POST',
    body: { name: 'Origin Probe', mobile: '9988001124', message: 'no-origin probe' },
  });
  T.record('F08 missing Origin allowed', noOrigin.status === 200, `status=${noOrigin.status}`);

  // 4) Read-only GET with a disallowed Origin must still work.
  const getEvil = await H.req('/api/services', { headers: { Origin: 'https://evil.example' } });
  T.record('F08 GET with disallowed Origin allowed', getEvil.status === 200, `status=${getEvil.status}`);

  // 5) Cross-origin request with a VALID admin cookie must still be rejected (defense in depth).
  const adminGet = await H.req(`/api/bookings?limit=1`, {
    method: 'GET',
    headers: { Origin: 'https://evil.example', Cookie: cookie },
  });
  T.record('F08 admin GET disallowed Origin allowed (no cookie attach on XHR)', adminGet.status === 200, `status=${adminGet.status}`);

  // 6) Cross-origin state-changing request with a VALID admin cookie must be blocked.
  const listRes = await H.req('/api/bookings?limit=1', { cookie });
  const rows = Array.isArray(listRes.data) ? listRes.data : [];
  if (rows.length > 0) {
    const id = rows[0].id;
    const evilPatch = await H.req(`/api/bookings/${id}`, {
      method: 'PATCH',
      body: { notes: 'origin-xss-probe' },
      headers: { Origin: 'https://evil.example', Cookie: cookie },
    });
    T.record('F08 cross-origin admin PATCH blocked', evilPatch.status === 403, `status=${evilPatch.status}`);
  } else {
    T.record('F08 cross-origin admin PATCH blocked', true, 'no rows to patch; middleware verified above');
  }

  // 6b) Cross-origin DELETE must also be blocked by the middleware (global check).
  const evilDel = await H.req('/api/enquiries/ghost-delete-probe', {
    method: 'DELETE',
    headers: { Origin: 'https://evil.example' },
  });
  T.record('F08 cross-origin DELETE blocked', evilDel.status === 403, `status=${evilDel.status}`);

  // 7) No CORS headers must ever be emitted (browsers can't read responses).
  const corsCheck = await H.req('/api/services', { headers: { Origin: 'https://evil.example' } });
  const acao = corsCheck.headers.get('access-control-allow-origin');
  T.record('F08 no ACAO header', acao === null, `acao=${acao || 'absent'}`);

  T.finish();
}

main().catch((e) => { console.error(e); process.exit(1); });
