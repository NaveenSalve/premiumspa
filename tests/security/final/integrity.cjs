'use strict';

// Part 15 — concurrency & integrity:
//   * concurrent double-booking of the same slot -> exactly one succeeds
//   * concurrent payment verification -> idempotent final state
//   * concurrent status updates -> consistent final state (no torn writes)
//   * server remains responsive afterwards

const H = require('./helpers.cjs');
const T = H.createReporter('integrity');

const parallel = async (fn, n) => Promise.all(Array.from({ length: n }, (_, i) => fn(i)));

async function main() {
  const cookie = await H.adminLogin();
  const cat = await H.loadCatalog();
  const svc = cat.svc;
  const th = cat.availTh;
  const picker = await H.makeSlotPicker(cookie);

  // 1) 8 concurrent identical booking attempts (same therapist/date/time, distinct mobiles).
  const slot = picker.pickFree();
  const results = await parallel(() =>
    H.req('/api/bookings', {
      method: 'POST',
      body: {
        customerName: 'Race User', customerMobile: '9800' + String(Math.floor(100000 + Math.random() * 899999)),
        serviceId: svc.id, therapistId: th.id, fullAddress: 'Race Lane', city: 'Pune',
        date: H.TEST_DATE, time: slot, duration: '1H',
      },
    }), 8);
  const success = results.filter((r) => r.status === 200).length;
  const conflict = results.filter((r) => r.status === 409).length;
  const serverErr = results.filter((r) => r.status >= 500).length;
  T.record('I1 concurrent same-slot: exactly one winner', success === 1, `200s=${success} 409s=${conflict}`);
  T.record('I2 concurrent same-slot: no 5xx', serverErr === 0, `5xx=${serverErr}`);

  // 2) Concurrent payment verification on a fresh booking -> idempotent final PAID.
  const b = await H.mkBookingFactory({ svc, availTh: th, cookie, slotPicker: picker });
  const bk = b.data && b.data.booking ? b.data.booking : b.data;
  if (bk && bk.id) {
    const payRes = await parallel(() => H.req(`/api/bookings/${bk.id}`, { method: 'PATCH', body: { paymentStatus: 'PAID' }, cookie }), 6);
    const payOk = payRes.filter((r) => r.status === 200).length;
    const payErr = payRes.filter((r) => r.status >= 500).length;
    const final = await H.req(`/api/bookings?limit=100`, { cookie });
    const finalRows = Array.isArray(final.data) ? final.data : [];
    const finBk = finalRows.find((r) => r.id === bk.id);
    T.record('I3 concurrent payment verify no errors', payErr === 0 && payOk >= 1, `200s=${payOk} 5xx=${payErr}`);
    T.record('I4 concurrent payment verify final PAID', finBk && finBk.paymentStatus === 'PAID', `final=${finBk && finBk.paymentStatus}`);
  } else {
    T.record('I3/I4 concurrent payment verify', false, 'booking creation failed');
  }

  // 3) Concurrent status + therapist reassignment -> consistent final state, no 5xx.
  const c2 = await H.mkBookingFactory({ svc, availTh: th, cookie, slotPicker: picker });
  const b2 = c2.data && c2.data.booking ? c2.data.booking : c2.data;
  if (b2 && b2.id) {
    const mix = await parallel(() => H.req(`/api/bookings/${b2.id}`, { method: 'PATCH', body: { status: Math.random() < 0.5 ? 'Confirmed' : 'Pending' }, cookie }), 8);
    const mixErr = mix.filter((r) => r.status >= 500).length;
    T.record('I5 concurrent status writes no 5xx', mixErr === 0, `5xx=${mixErr}`);
    const fin = await H.req(`/api/bookings?limit=100`, { cookie });
    const fr = Array.isArray(fin.data) ? fin.data : [];
    const f2 = fr.find((r) => r.id === b2.id);
    T.record('I6 concurrent status writes consistent', f2 && ['Confirmed', 'Pending'].includes(f2.status), `final=${f2 && f2.status}`);
  } else {
    T.record('I5/I6 concurrent status writes', false, 'booking creation failed');
  }

  // 4) Server still healthy after the storm.
  const health = await H.req('/api/services?limit=1');
  T.record('I7 server responsive after concurrency', health.status === 200, `status=${health.status}`);

  T.finish();
}

main().catch((e) => { console.error(e); process.exit(1); });
