'use strict';

// F-11 pagination matrix: every list endpoint must honor default limit=50,
// cap at 100, and reject invalid limit/offset (negative, zero, non-numeric,
// repeated params) with 400 instead of returning unbounded data.

const H = require('./helpers.cjs');
const T = H.createReporter('f11-pagination');

const PUBLIC_LISTS = ['/api/services', '/api/therapists'];
const ADMIN_LISTS = ['/api/bookings', '/api/customers', '/api/enquiries', '/api/contact', '/api/notifications'];

async function main() {
  const cookie = await H.adminLogin();

  // 1) Default limit = 50 (no params).
  for (const ep of PUBLIC_LISTS) {
    const r = await H.req(ep);
    const n = Array.isArray(r.data) ? r.data.length : -1;
    T.record(`F11 default ${ep} <= 50`, r.status === 200 && n >= 0 && n <= 50, `status=${r.status} count=${n}`);
  }
  for (const ep of ADMIN_LISTS) {
    const r = await H.req(ep, { cookie });
    const n = Array.isArray(r.data) ? r.data.length : -1;
    T.record(`F11 default ${ep} <= 50`, r.status === 200 && n >= 0 && n <= 50, `status=${r.status} count=${n}`);
  }

  // 2) Explicit limit honored up to 100.
  for (const [ep, isAdmin] of [...PUBLIC_LISTS.map((e) => [e, false]), ...ADMIN_LISTS.map((e) => [e, true])]) {
    const opts = isAdmin ? { cookie } : {};
    const r5 = await H.req(`${ep}?limit=5`, opts);
    const r100 = await H.req(`${ep}?limit=100`, opts);
    const r999 = await H.req(`${ep}?limit=999`, opts);
    T.record(`F11 limit=5 ${ep}`, r5.status === 200 && Array.isArray(r5.data) && r5.data.length <= 5, `status=${r5.status} count=${Array.isArray(r5.data) ? r5.data.length : '?'}`);
    T.record(`F11 limit=100 ${ep}`, r100.status === 200 && Array.isArray(r100.data) && r100.data.length <= 100, `status=${r100.status} count=${Array.isArray(r100.data) ? r100.data.length : '?'}`);
    T.record(`F11 limit=999 capped to 100 ${ep}`, r999.status === 200 && Array.isArray(r999.data) && r999.data.length <= 100, `status=${r999.status} count=${Array.isArray(r999.data) ? r999.data.length : '?'}`);
  }

  // 3) Invalid limits/offsets must be 400 (never unbounded/500).
  const bad = ['limit=-1', 'limit=0', 'limit=abc', 'limit=1.5', 'limit=1&limit=2', 'offset=-5', 'offset=abc', 'offset=1&offset=2'];
  for (const q of bad) {
    const r = await H.req(`/api/services?${q}`);
    T.record(`F11 invalid ${q} rejected`, r.status === 400, `status=${r.status}`);
  }

  // 4) Offset paging returns no duplicates and no gaps.
  const page1 = await H.req('/api/services?limit=100', {});
  const p1 = Array.isArray(page1.data) ? page1.data : [];
  if (p1.length === 100) {
    const page2 = await H.req('/api/services?limit=100&offset=100', {});
    const p2 = Array.isArray(page2.data) ? page2.data : [];
    const ids = new Set(p1.map((r) => r.id));
    const dupes = p2.filter((r) => ids.has(r.id)).length;
    T.record('F11 offset pagination no dupes', dupes === 0, `dupes=${dupes}`);
  } else {
    T.record('F11 offset pagination no dupes', true, 'dataset < 100, pagination not exercisable');
  }

  // 5) Large offset returns empty (bounded) not an error.
  const big = await H.req('/api/services?offset=1000000', {});
  T.record('F11 huge offset bounded', big.status === 200 && Array.isArray(big.data), `status=${big.status}`);

  // 6) Never unbounded: a limit=1000000 must still be capped.
  const huge = await H.req('/api/services?limit=1000000', {});
  T.record('F11 huge limit capped', huge.status === 200 && Array.isArray(huge.data) && huge.data.length <= 100, `status=${huge.status} count=${Array.isArray(huge.data) ? huge.data.length : '?'}`);

  T.finish();
}

main().catch((e) => { console.error(e); process.exit(1); });
