'use strict';

// Duplicate-booking race: 8 parallel customer bookings for the SAME therapist,
// date and time must resolve to exactly ONE success (200) and SEVEN conflicts
// (409) — the atomic slot protection must hold under concurrency.
//
// Env: BASE_URL, TEST_ADMIN_PIN (used to list already-booked slots so the test
// slot is guaranteed free on a dirty test DB).

const { request, setCookieFrom, createReporter } = require('./lib/assert.cjs');

const BASE = (process.env.BASE_URL || 'http://127.0.0.1:4000').replace(/\/+$/, '');
const TEST_ADMIN_PIN = process.env.TEST_ADMIN_PIN || '';
// Rotating test date (today + 3 days) so repeated runs never saturate the slot
// pool on a fixed date (see harness.cjs for the same rationale).
const TEST_DATE = (() => {
  const d = new Date(Date.now() + 3 * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
})();

const T = createReporter('concurrency race');

(async () => {
  const login = await request(BASE, '/api/auth/login', { method: 'POST', body: { pin: TEST_ADMIN_PIN } });
  if (login.status !== 200) {
    T.record('race login (prerequisite)', login.status === 200, `status=${login.status}`);
    T.finish();
    return;
  }
  const cookie = setCookieFrom(login);

  const services = await request(BASE, '/api/services');
  const therapists = await request(BASE, '/api/therapists');
  const svc = services.data[0];
  const th = therapists.data.find((t) => t.status === 'available');

  const used = new Set();
  let offset = 0;
  for (let pages = 0; pages < 200; pages++) {
    const list = await request(BASE, `/api/bookings?limit=100&offset=${offset}`, { cookie });
    const rows = Array.isArray(list.data) ? list.data : [];
    for (const b of rows) {
      if (b.date === TEST_DATE && b.therapistId === th.id && b.status !== 'Cancelled') used.add(b.time);
    }
    if (rows.length < 100) break;
    offset += 100;
  }
  let slot = null;
  // 900 distinct slots (08:00-22:59, all minutes) with a randomised start,
  // matching tests/security/final/helpers.cjs. The legacy period-60 generator
  // saturated after ~12 runs on the shared test date.
  const all = [];
  for (let h = 8; h <= 22; h++) {
    const mer = h < 12 ? 'AM' : 'PM';
    const hr = h > 12 ? h - 12 : h;
    for (let m = 0; m < 60; m++) all.push(`${hr}:${String(m).padStart(2, '0')} ${mer}`);
  }
  const start = Math.floor(Math.random() * all.length);
  for (let i = 0; i < all.length; i++) {
    const t = all[(start + i) % all.length];
    if (!used.has(t)) {
      slot = t;
      break;
    }
  }

  const body = {
    customerName: 'Race Test',
    customerMobile: '9876500000',
    serviceId: svc.id,
    therapistId: th.id,
    fullAddress: 'Race Lane',
    city: 'Race City',
    date: TEST_DATE,
    time: slot,
    duration: '60 min',
  };
  const results = await Promise.all(
    Array.from({ length: 8 }, (_, i) => request(BASE, '/api/bookings', { method: 'POST', body: { ...body, customerMobile: `98765${String(10000 + i)}` } }))
  );
  const codes = results.map((r) => r.status).sort();
  const twoHundreds = codes.filter((c) => c === 200).length;
  const nineO9s = codes.filter((c) => c === 409).length;
  const others = codes.filter((c) => c !== 200 && c !== 409);
  console.log(`    slots: ${codes.join(',')}`);
  console.log(`    200s=${twoHundreds} 409s=${nineO9s} other=${others.join(',') || 'none'}`);
  T.record('duplicate-slot race: exactly 1 winner, 7 conflicts', twoHundreds === 1 && nineO9s === 7 && others.length === 0, `200s=${twoHundreds} 409s=${nineO9s}`);

  T.finish();
})().catch((e) => {
  console.error('HARNESS ERROR:', e && e.message ? e.message : e);
  process.exit(2);
});
