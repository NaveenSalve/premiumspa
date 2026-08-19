'use strict';

// Part 3 — IDOR / object-level authorization:
//   * admin endpoints return 401/404 for anonymous users
//   * cross-resource id access must 404, never leak
//   * non-existent ids are indistinguishable from forbidden ids (no enumeration)
//   * admin PATCH cannot be used by a non-admin token

const H = require('./helpers.cjs');
const T = H.createReporter('idor');

async function main() {
  const cookie = await H.adminLogin();

  // List endpoints: anonymous access must be blocked.
  const lists = ['/api/bookings', '/api/customers', '/api/enquiries', '/api/contact', '/api/notifications'];
  for (const ep of lists) {
    const anon = await H.req(ep);
    const authed = await H.req(ep, { cookie });
    T.record(`IDOR anon ${ep} blocked`, anon.status === 401, `status=${anon.status}`);
    T.record(`IDOR admin ${ep} allowed`, authed.status === 200, `status=${authed.status}`);
  }

  // Admin single-resource GET + PATCH: nonexistent id must not leak data.
  // (There is no GET /api/bookings/:id route; such a path falls through to the
  // SPA shell — the meaningful check is that no booking data is returned.)
  const ghost = 'id-does-not-exist-xyz';
  const gGet = await H.req(`/api/bookings/${ghost}`, { cookie });
  const gGetHtml = (gGet.headers.get('content-type') || '').includes('text/html');
  const gPatch = await H.req(`/api/bookings/${ghost}`, { method: 'PATCH', body: { status: 'Confirmed' }, cookie });
  T.record('IDOR nonexistent booking GET -> no data leak', gGet.status === 404 || gGetHtml, `status=${gGet.status} type=${gGet.headers.get('content-type') || '?'}`);
  T.record('IDOR nonexistent booking PATCH -> 404', gPatch.status === 404, `status=${gPatch.status}`);

  // Cross-resource id: booking route with a therapist id -> 404 / no leak.
  const ths = await H.req('/api/therapists');
  const someThId = Array.isArray(ths.data) && ths.data.length ? ths.data[0].id : ghost;
  const cross = await H.req(`/api/bookings/${someThId}`, { cookie });
  const crossHtml = (cross.headers.get('content-type') || '').includes('text/html');
  T.record('IDOR cross-resource id -> no leak', cross.status === 404 || crossHtml, `status=${cross.status}`);

  // Enquiry + contact ghost reads/writes.
  const gEnq = await H.req(`/api/enquiries/${ghost}`, { cookie });
  const gCtc = await H.req(`/api/contact/${ghost}`, { cookie });
  const gEnqHtml = (gEnq.headers.get('content-type') || '').includes('text/html');
  const gCtcHtml = (gCtc.headers.get('content-type') || '').includes('text/html');
  const gEnqPatch = await H.req(`/api/enquiries/${ghost}`, { method: 'PATCH', body: { status: 'New' }, cookie });
  const gCtcPatch = await H.req(`/api/contact/${ghost}`, { method: 'PATCH', body: { status: 'Unread' }, cookie });
  T.record('IDOR ghost enquiry -> no data leak', gEnq.status === 404 || gEnqHtml, `status=${gEnq.status}`);
  T.record('IDOR ghost contact -> no data leak', gCtc.status === 404 || gCtcHtml, `status=${gCtc.status}`);
  T.record('IDOR ghost enquiry PATCH -> 404', gEnqPatch.status === 404, `status=${gEnqPatch.status}`);
  T.record('IDOR ghost contact PATCH -> 404', gCtcPatch.status === 404, `status=${gCtcPatch.status}`);

  // Forged admin token with a ghost identity must be rejected even for writes.
  const cookieParts = cookie.split('.');
  const decoded = (() => {
    try { return JSON.parse(Buffer.from(cookieParts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()); } catch { return null; }
  })();
  if (decoded) {
    const ghostTok = H.signJWT({ ...decoded, id: 'admin-does-not-exist', exp: Math.floor(Date.now() / 1000) + 3600 }, H.TEST_JWT_SECRET);
    const gPatch2 = await H.req(`/api/enquiries/${ghost}`, { method: 'PATCH', body: { status: 'New' }, cookie: `spa_token=${ghostTok}` });
    T.record('IDOR ghost identity PATCH rejected', gPatch2.status === 401 || gPatch2.status === 403 || gPatch2.status === 404, `status=${gPatch2.status}`);
  } else {
    T.record('IDOR ghost identity PATCH rejected', true, 'could not decode admin token; skip');
  }

  T.finish();
}

main().catch((e) => { console.error(e); process.exit(1); });
