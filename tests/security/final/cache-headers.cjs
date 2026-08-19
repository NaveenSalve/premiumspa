'use strict';

// Part 12 — cache headers: authenticated (admin) responses must not be
// cacheable. If Cache-Control is missing entirely, that is recorded as a FAIL
// finding for the audit report.

const H = require('./helpers.cjs');
const T = H.createReporter('cache-headers');

async function main() {
  const cookie = await H.adminLogin();

  const adminEndpoints = ['/api/auth/me', '/api/bookings?limit=5', '/api/customers?limit=5', '/api/enquiries?limit=5', '/api/contact?limit=5', '/api/notifications?limit=5'];
  for (const ep of adminEndpoints) {
    const r = await H.req(ep, { cookie });
    const cc = (r.headers.get('cache-control') || '').toLowerCase();
    const ok = cc.includes('no-store') || cc.includes('private');
    T.record(`CACHE ${ep} non-cacheable`, ok, `Cache-Control: ${cc || '(absent)'}`);
  }

  // Booking POST response (contains PII: name, phone, address).
  const cat = await H.loadCatalog();
  const picker = await H.makeSlotPicker(cookie);
  const b = await H.mkBookingFactory({ svc: cat.svc, availTh: cat.availTh, cookie, slotPicker: picker });
  const ccB = (b.headers.get('cache-control') || '').toLowerCase();
  T.record('CACHE POST /api/bookings non-cacheable', ccB.includes('no-store') || ccB.includes('private'), `Cache-Control: ${ccB || '(absent)'}`);

  // Login response cookie + body must be non-cacheable.
  const lg = await H.req('/api/auth/login', { method: 'POST', body: { pin: H.TEST_ADMIN_PIN } });
  const ccL = (lg.headers.get('cache-control') || '').toLowerCase();
  T.record('CACHE POST /api/auth/login non-cacheable', ccL.includes('no-store') || ccL.includes('private'), `Cache-Control: ${ccL || '(absent)'}`);

  T.finish();
}

main().catch((e) => { console.error(e); process.exit(1); });
