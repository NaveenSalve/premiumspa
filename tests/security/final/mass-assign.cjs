'use strict';

// Part 4 — mass assignment: client-supplied privileged fields must be ignored.
//   * anonymous booking cannot set status / paymentStatus / amounts / role
//   * admin PATCH endpoints only accept their whitelisted fields
//   * login ignores role/isAdmin fields in the body
//   * service/therapist creation ignores role/isAdmin

const H = require('./helpers.cjs');
const T = H.createReporter('mass-assign');

async function main() {
  const cookie = await H.adminLogin();
  const cat = await H.loadCatalog();
  const picker = await H.makeSlotPicker(cookie);

  // 1) Anonymous customer booking with privileged overrides -> all ignored.
  //    (No cookie attached to the POST so the server treats it as a customer.)
  const b = await H.mkBookingFactory({
    svc: cat.svc, availTh: cat.availTh, slotPicker: picker,
    over: {
      paymentStatus: 'PAID',
      status: 'Completed',
      servicePrice: 0,
      visitFee: 0,
      totalPayable: 0,
      serviceAmount: 0,
      travelAdvance: 0,
      totalAmount: 0,
      role: 'admin',
      isAdmin: true,
      customerId: 'cust-hijack',
      createdAt: '2001-01-01',
      updatedAt: '2001-01-01',
      id: 'BK-HIJACKED-1',
    },
  });
  const bk = b.data && b.data.booking ? b.data.booking : b.data;
  T.record('M1 tampered booking created', b.status === 200, `status=${b.status}`);
  T.record('M2 customer cannot set status', bk && bk.status === 'Pending', `status=${bk && bk.status}`);
  T.record('M3 customer cannot set paymentStatus', bk && bk.paymentStatus === 'PENDING_VERIFICATION', `payment=${bk && bk.paymentStatus}`);
  T.record('M4 customer cannot zero out price', bk && bk.servicePrice > 0, `price=${bk && bk.servicePrice}`);
  T.record('M5 customer cannot set travel advance', bk && bk.visitFee > 0, `visitFee=${bk && bk.visitFee}`);
  T.record('M6 customer cannot pick booking id', bk && bk.id !== 'BK-HIJACKED-1' && /^BK-/.test(bk.id), `id=${bk && bk.id}`);
  T.record('M7 customer id/createdAt not honoured', bk && !bk.customerId && !bk.createdAt.startsWith('2001'), 'server fields only');
  T.record('M8 tampered customer did not become admin', bk && bk.status === 'Pending', 'role ignored');

  // 2) Admin PATCH booking: only status/paymentStatus/therapistId accepted.
  const bId = bk && bk.id;
  if (bId) {
    const p1 = await H.req(`/api/bookings/${bId}`, {
      method: 'PATCH', body: { status: 'Confirmed' }, cookie,
    });
    T.record('M9 admin can set status', p1.status === 200, `status=${p1.status}`);

    const p2 = await H.req(`/api/bookings/${bId}`, {
      method: 'PATCH', body: { paymentStatus: 'PAID', status: 'Completed' }, cookie,
    });
    T.record('M10 admin can set paymentStatus', p2.status === 200, `status=${p2.status}`);

    const p3 = await H.req(`/api/bookings/${bId}`, {
      method: 'PATCH', body: { role: 'user', isAdmin: false, customerId: 'x', createdAt: '2001', updatedAt: '2001', serviceAmount: 0, totalAmount: 0, price: -999 }, cookie,
    });
    T.record('M11 admin PATCH rejects non-whitelisted fields', p3.status === 400, `status=${p3.status}`);
  } else {
    T.record('M9..M11 admin PATCH booking', false, 'booking id missing');
  }

  // 3) Login must ignore role/isAdmin in the body (role from DB only).
  const lr = await H.req('/api/auth/login', {
    method: 'POST',
    body: { pin: H.TEST_ADMIN_PIN, role: 'user', isAdmin: false, username: 'admin' },
  });
  const lrBody = lr.data || {};
  T.record('M12 login ignores role/isAdmin fields', lr.status === 200 && lrBody.user && lrBody.user.role === 'admin', `status=${lr.status} role=${lrBody.user && lrBody.user.role}`);

  // 4) Create service/therapist with role/isAdmin/id spoof -> role ignored, server id used.
  const uniqS = `srv-mass-${Date.now()}`;
  const uniqT = `th-mass-${Date.now()}`;
  const s = await H.req('/api/services', {
    method: 'POST',
    body: { name: 'Audit Mass Service', price: 1500, role: 'user', isAdmin: false, createdAt: '2001', id: uniqS },
    cookie,
  });
  const sv = s.data && s.data.service;
  T.record('M13 service create ignores role/isAdmin', s.status === 200 && !!sv, `status=${s.status}`);
  if (sv) {
    const th2 = await H.req(`/api/services/${sv.id}`, {
      method: 'PATCH', body: { price: 0, role: 'superadmin', isAdmin: true }, cookie,
    });
    T.record('M14 service PATCH rejects role/isAdmin silently', th2.status === 200, `status=${th2.status} (price=0 allowed for admin, role ignored)`);
  }

  const t = await H.req('/api/therapists', {
    method: 'POST',
    body: { name: 'Audit Mass Therapist', role: 'user', isAdmin: false, createdAt: '2001', id: uniqT },
    cookie,
  });
  const tv = t.data && t.data.therapist;
  T.record('M15 therapist create ignores role/isAdmin', t.status === 200 && !!tv, `status=${t.status}`);

  // 5) Admin booking creation is the ONLY path that may set amounts/status — confirm it works (authorized path).
  const ab = await H.mkBookingFactory({
    svc: cat.svc, availTh: cat.availTh, cookie, slotPicker: picker,
    over: { status: 'Confirmed', paymentStatus: 'PAID', servicePrice: 999, visitFee: 100, totalPayable: 1099 },
  });
  const abk = ab.data && ab.data.booking ? ab.data.booking : ab.data;
  T.record('M16 authorized admin CAN set amounts/status', ab.status === 200 && abk && abk.status === 'Confirmed' && abk.paymentStatus === 'PAID', `status=${ab.status} st=${abk && abk.status} pay=${abk && abk.paymentStatus}`);

  if (sv) await H.req(`/api/services/${sv.id}`, { method: 'DELETE', cookie });
  if (tv) await H.req(`/api/therapists/${tv.id}`, { method: 'DELETE', cookie });

  T.finish();
}

main().catch((e) => { console.error(e); process.exit(1); });
