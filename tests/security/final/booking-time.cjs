'use strict';

// Same-day booking time validation + Asia/Kolkata business-timezone enforcement.
//
// Covers the required matrix:
//   - past date                      -> 400 'Booking date must be today or in the future.'
//   - today, past slot               -> 400 'Selected booking time is no longer available.' (backend, bypass-proof)
//   - today, valid future slot       -> 200 (and row is created, then cleaned up)
//   - tomorrow, any configured slot  -> 200 (future date unaffected by today's clock)
//   - no row created on rejection
//   - timezone: the server's businessNow() is unit-tested against the actual
//     server.ts source using the Asia/Kolkata midnight window where the UTC
//     calendar date differs from the business date.
//
// Safe: creates bookings with random phone numbers and deletes every row it
// created (bookings, notifications, customers) afterwards.

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { request, createReporter, connectDb, loadEnv } = require('../lib/assert.cjs');

const BASE = (process.env.BASE_URL || 'http://127.0.0.1:4000').replace(/\/+$/, '');
const T = createReporter('same-day booking time validation');

// Independent Asia/Kolkata helpers (mirror of the server's businessNow).
function kolkataParts(d, opts) {
  const out = {};
  new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', ...opts }).formatToParts(d).forEach((p) => {
    if (p.type !== 'literal') out[p.type] = p.value;
  });
  return out;
}
function kolkataDateKey(d) {
  const p = kolkataParts(d, { year: 'numeric', month: '2-digit', day: '2-digit' });
  return `${p.year}-${p.month}-${p.day}`;
}
function kolkataDateLabel(d) {
  const p = kolkataParts(d, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  return `${p.weekday}, ${p.day} ${p.month} ${p.year}`;
}
function kolkataNow() {
  const p = kolkataParts(new Date(), { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  let h = Number(p.hour || 0);
  if (h === 24) h = 0;
  return { dateKey: `${p.year}-${p.month}-${p.day}`, minutes: h * 60 + Number(p.minute || 0), label: kolkataDateLabel(new Date()) };
}
function slotToMinutes(t) {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/.exec(t);
  if (!m) return -1;
  let h = Number(m[1]);
  const min = Number(m[2]);
  if (m[3] === 'PM' && h !== 12) h += 12;
  if (m[3] === 'AM' && h === 12) h = 0;
  return h * 60 + min;
}
const fmtTime = (h, mm) => {
  const mer = h < 12 ? 'AM' : 'PM';
  const hr = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hr}:${String(mm).padStart(2, '0')} ${mer}`;
};

(async () => {
  const now = kolkataNow();

  // ---- TZ unit test against the real server.ts source ----
  const src = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'server.ts'), 'utf8');
  const match = src.match(/const BUSINESS_TIME_ZONE = [\s\S]*?\n};/);
  T.record('TZ1 server.ts ships a businessNow() helper pinned to Asia/Kolkata', !!match && /Asia\/Kolkata/.test(match[0]), match ? 'helper found' : 'helper missing');
  if (match) {
    try {
      const esbuild = require('esbuild');
      const js = esbuild.transformSync(match[0], { loader: 'ts' }).code;
      const RealDate = Date;
      // 2026-08-14T19:30:00Z == 2026-08-15 01:00 IST: the midnight window where
      // the UTC calendar date (14th) differs from the Kolkata business date (15th).
      const MOCK = new RealDate('2026-08-14T19:30:00.000Z');
      const sandbox = { Intl, Number, String };
      sandbox.Date = class { constructor() { return MOCK; } };
      sandbox.Date.now = () => MOCK.getTime();
      vm.createContext(sandbox);
      vm.runInContext(js + '; result = businessNow();', sandbox);
      T.record(
        'TZ2 businessNow() evaluates "today" in Asia/Kolkata, not UTC',
        sandbox.result.dateKey === '2026-08-15' && sandbox.result.minutes === 60,
        JSON.stringify(sandbox.result)
      );
    } catch (e) {
      T.record('TZ2 businessNow() evaluates "today" in Asia/Kolkata, not UTC', false, `eval failed: ${e.message}`);
    }
  }

  // ---- Live API matrix ----
  const services = await request(BASE, '/api/services');
  const svc = services.data && services.data[0];
  const therapists = await request(BASE, '/api/therapists');
  const availTh = therapists.data && therapists.data.find((t) => t.status === 'available');
  T.record('M0 services + available therapist available for matrix', !!svc && !!availTh, JSON.stringify({ svc: svc && svc.id, th: availTh && availTh.id }));

  const good = await request(BASE, '/api/auth/login', { method: 'POST', body: { pin: process.env.TEST_ADMIN_PIN || '' } });
  const cookie = good.headers.get('set-cookie') ? good.headers.get('set-cookie').split(';')[0] : '';

  // Used slot pool for the chosen therapist on the chosen dates (avoid clashes).
  async function usedTimes(date, therapistId) {
    const set = new Set();
    let offset = 0;
    for (let pages = 0; pages < 200; pages++) {
      const r = await request(BASE, `/api/bookings?limit=100&offset=${offset}`, { cookie });
      const rows = Array.isArray(r.data) ? r.data : [];
      for (const b of rows) {
        if (b.date === date && b.therapistId === therapistId && b.status !== 'Cancelled') set.add(b.time);
      }
      if (rows.length < 100) break;
      offset += 100;
    }
    return set;
  }

  const phone1 = `9${String(Date.now()).slice(-9)}`; // unique per run
  const phone2 = `8${String(Date.now() + 1).slice(-9)}`;
  const phone3 = `7${String(Date.now() + 2).slice(-9)}`;
  const phone4 = `6${String(Date.now() + 3).slice(-9)}`;

  const mkBody = (date, time, mobile) => ({
    customerName: 'Booking Time Test',
    customerMobile: mobile,
    serviceId: svc.id,
    therapistId: availTh.id,
    fullAddress: '12 Test Lane',
    city: 'Test City',
    date,
    time,
    duration: '60 min',
  });

  const dates = {
    today: now.label,
    yesterday: kolkataDateLabel(new Date(Date.now() - 86400000)),
    tomorrow: kolkataDateLabel(new Date(Date.now() + 86400000)),
  };

  // T1: today at a genuinely past business slot -> 400 + generic safe message
  // + NO row persisted. Before the first business slot has passed, this case is
  // not testable without clock control, so record NOT TESTED instead of a false
  // failure.
  const pastHour = Math.min(22, Math.floor((now.minutes - 60) / 60));
  const pastTime = pastHour >= 8 ? fmtTime(pastHour, 0) : null;
  const r1 = pastTime
    ? await request(BASE, '/api/bookings', { method: 'POST', body: mkBody(dates.today, pastTime, phone1) })
    : null;
  T.record('T1 today + past slot rejected 4xx', r1 ? (r1.status >= 400 && r1.status < 500) : null, r1 ? `slot=${pastTime} status=${r1.status}` : `no past business slot yet (now=${now.minutes})`);
  T.record(
    'T1 safe generic error (no timestamps/internals)',
    r1 ? (r1.data && r1.data.error === 'Selected booking time is no longer available.' && !JSON.stringify(r1.data).match(/ at |server\.ts|stack/i)) : null,
    r1 ? JSON.stringify(r1.data || {}).slice(0, 120) : `no past business slot yet (now=${now.minutes})`
  );
  const db1 = await connectDb();
  try {
    const bk = await db1.query('SELECT 1 FROM bookings WHERE customer_mobile = $1 LIMIT 1', [phone1]);
    const cu = await db1.query('SELECT 1 FROM customers WHERE phone = $1 LIMIT 1', [phone1]);
    T.record('T1 rejected booking created NO booking row', r1 ? (bk.rowCount === 0) : null, r1 ? `rows=${bk.rowCount}` : `no past business slot yet (now=${now.minutes})`);
    T.record('T1 rejected booking created NO customer row', r1 ? (cu.rowCount === 0) : null, r1 ? `rows=${cu.rowCount}` : `no past business slot yet (now=${now.minutes})`);
  } finally {
    await db1.end();
  }

  // T2: past date -> 400 with the date message.
  const r2 = await request(BASE, '/api/bookings', { method: 'POST', body: mkBody(dates.yesterday, '10:00 AM', phone2) });
  T.record('T2 yesterday + any slot -> 400 date rule', r2.status === 400 && r2.data && r2.data.error === 'Booking date must be today or in the future.', `status=${r2.status} ${JSON.stringify(r2.data || {}).slice(0, 80)}`);

  // T3: tomorrow + free slot -> 200 (future date unaffected by today's clock).
  const tomorrowUsed = await usedTimes(dates.tomorrow, availTh.id);
  let r3 = null;
  for (let i = 0; i < 6 && !r3; i++) {
    const h = 8 + Math.floor(Math.random() * 15);
    const t = fmtTime(h, Math.floor(Math.random() * 60));
    if (tomorrowUsed.has(t)) continue;
    r3 = await request(BASE, '/api/bookings', { method: 'POST', body: mkBody(dates.tomorrow, t, phone3) });
  }
  T.record('T3 tomorrow + valid slot accepted (future date unaffected)', r3 && r3.status === 200, `status=${r3 && r3.status} ${JSON.stringify((r3 && r3.data) || {}).slice(0, 60)}`);

  // T5: today + next valid slot (>= now, business time) -> 200 when one exists.
  const nextHour = Math.floor(now.minutes / 60) + 1;
  let r5 = null;
  let t5status = 'NOT TESTED';
  if (nextHour <= 22) {
    const t = fmtTime(nextHour, 0);
    const todayUsed = await usedTimes(dates.today, availTh.id);
    if (!todayUsed.has(t)) {
      r5 = await request(BASE, '/api/bookings', { method: 'POST', body: mkBody(dates.today, t, phone4) });
      t5status = `status=${r5.status}`;
    } else {
      t5status = 'next slot already booked by prior run';
    }
  } else {
    t5status = `no valid slot remains today (now=${now.minutes})`;
  }
  // NOT TESTED (null) when no today slot can exist/appear: recording that the
  // app is at fault would be a false FAIL at end of day or on a re-run collision.
  const t5ok = r5 ? (r5.status === 200) : null;
  T.record('T5 today + slot at/after current business time accepted', t5ok, t5status);

  // ---- Cleanup every row created by this test ----
  const cleanup = await connectDb();
  try {
    const ids = [];
    for (const r of [r3, r5]) {
      if (r && r.data && r.data.id) ids.push(r.data.id);
      if (r && r.data && r.data.booking && r.data.booking.id) ids.push(r.data.booking.id);
    }
    for (const id of ids) {
      try { await cleanup.query('DELETE FROM admin_notifications WHERE related_id = $1', [id]); } catch { /* best effort */ }
      try { await cleanup.query('DELETE FROM bookings WHERE id = $1', [id]); } catch { /* best effort */ }
    }
    for (const phone of [phone1, phone2, phone3, phone4]) {
      try { await cleanup.query('DELETE FROM customers WHERE phone = $1', [phone]); } catch { /* best effort */ }
    }
  } finally {
    await cleanup.end();
  }

  T.finish();
})().catch((e) => {
  console.error('BOOKING-TIME HARNESS ERROR:', e && e.message ? e.message : e);
  process.exit(2);
});
