'use strict';

// Part 5 — input validation matrix across the public write endpoints.
// Every case must yield a 4xx JSON error (or a safe 200), never a 5xx and
// never a stack trace / non-JSON body.

const H = require('./helpers.cjs');
const T = H.createReporter('input-matrix');

async function main() {
  const cat = await H.loadCatalog();
  const svc = cat.svc;
  const th = cat.availTh;
  const picker = await H.makeSlotPicker(null);

  const bookingBase = {
    customerName: 'Input Matrix',
    customerMobile: '9876543210',
    serviceId: svc.id,
    therapistId: th.id,
    fullAddress: '42 Input Lane',
    city: 'Pune',
    date: H.TEST_DATE,
    time: picker.pickFree(),
    duration: '1H',
  };

  const cases = [
    { name: 'empty name', body: { ...bookingBase, customerName: '' }, expect: 400 },
    { name: 'short name', body: { ...bookingBase, customerName: 'A' }, expect: 400 },
    { name: 'whitespace name', body: { ...bookingBase, customerName: '   ' }, expect: 400 },
    { name: 'name as number', body: { ...bookingBase, customerName: 123 }, expect: 400 },
    { name: 'name as array', body: { ...bookingBase, customerName: ['x', 'y'] }, expect: 400 },
    { name: 'name as object', body: { ...bookingBase, customerName: { a: 1 } }, expect: 400 },
    { name: 'mobile letters', body: { ...bookingBase, customerMobile: 'abcdefghij' }, expect: 400 },
    { name: 'mobile too short', body: { ...bookingBase, customerMobile: '12345' }, expect: 400 },
    { name: 'mobile too long', body: { ...bookingBase, customerMobile: '123456789012345678901234567890' }, expect: 400 },
    { name: 'mobile as number', body: { ...bookingBase, customerMobile: 9876543210 }, expect: 400 },
    { name: 'empty address', body: { ...bookingBase, fullAddress: '' }, expect: 400 },
    { name: 'empty locality', body: { ...bookingBase, city: '' }, expect: 400 },
    { name: 'past date', body: { ...bookingBase, date: '2001-01-01' }, expect: 400 },
    { name: 'bad date format', body: { ...bookingBase, date: 'not-a-date' }, expect: 400 },
    { name: 'bad time', body: { ...bookingBase, time: '25:99 XX' }, expect: 400 },
    { name: 'no service id', body: { ...bookingBase, serviceId: undefined }, expect: 400 },
    { name: 'nonexistent service', body: { ...bookingBase, serviceId: 'srv-does-not-exist' }, expect: 400 },
    { name: 'nonexistent therapist', body: { ...bookingBase, therapistId: 'th-does-not-exist' }, expect: 400 },
  ];

  for (const c of cases) {
    const r = await H.req('/api/bookings', { method: 'POST', body: c.body });
    const isJson = r.data && typeof r.data === 'object';
    const noStack = isJson && !JSON.stringify(r.data).includes('node_modules') && !JSON.stringify(r.data).includes('    at ');
    T.record(`IN ${c.name}`, r.status === c.expect && isJson && noStack, `status=${r.status} ${noStack ? '' : 'NON-JSON/STACK'}`);
  }

  // Enquiry validation.
  const enqCases = [
    { name: 'enquiry empty name', body: { name: '', mobile: '9999999999', message: 'hi' }, expect: 400 },
    { name: 'enquiry missing mobile', body: { name: 'X Y', mobile: '', message: 'hi' }, expect: 400 },
    { name: 'enquiry long name', body: { name: 'n'.repeat(90), mobile: '9999999999', message: 'hi' }, expect: 400 },
    { name: 'enquiry long message', body: { name: 'X Y', mobile: '9999999999', message: 'm'.repeat(2100) }, expect: 400 },
    { name: 'enquiry long mobile', body: { name: 'X Y', mobile: '9'.repeat(25), message: 'hi' }, expect: 400 },
  ];
  for (const c of enqCases) {
    const r = await H.req('/api/enquiries', { method: 'POST', body: c.body });
    T.record(`IN ${c.name}`, r.status === c.expect, `status=${r.status}`);
  }

  // Contact validation (email).
  const ctCases = [
    { name: 'contact bad email', body: { name: 'X Y', phone: '9999999999', email: 'not-an-email', message: 'hi' }, expect: 400 },
    { name: 'contact missing message', body: { name: 'X Y', phone: '9999999999', message: '' }, expect: 400 },
    { name: 'contact long email', body: { name: 'X Y', phone: '9999999999', email: 'e'.repeat(130) + '@x.com', message: 'hi' }, expect: 400 },
  ];
  for (const c of ctCases) {
    const r = await H.req('/api/contact', { method: 'POST', body: c.body });
    T.record(`IN ${c.name}`, r.status === c.expect, `status=${r.status}`);
  }

  // Unicode / emoji / HTML / SQL payloads must be stored safely (parameterized), never 5xx.
  const rich = await H.req('/api/enquiries', {
    method: 'POST',
    body: { name: "O'Brien 中文 太郎 😀 <b>bold</b>", mobile: '9999999999', message: "'; DROP TABLE bookings; -- <script>alert(1)</script>" },
  });
  T.record('IN unicode/emoji/HTML/SQL stored safely', rich.status === 200, `status=${rich.status}`);

  // JSON nesting depth / huge body must not crash (4xx or bounded).
  const deep = { x: {} };
  let d = deep;
  for (let i = 0; i < 50; i++) { d.x = { x: {} }; d = d.x; }
  const deepRes = await H.req('/api/enquiries', { method: 'POST', body: { ...deep, name: 'D', mobile: '9999999999', message: 'hi' } });
  T.record('IN deep nesting handled', deepRes.status === 400 || deepRes.status === 200, `status=${deepRes.status}`);

  const huge = await H.req('/api/enquiries', { method: 'POST', body: { name: 'X', mobile: '9999999999', message: 'huge'.repeat(50000) } });
  T.record('IN oversized body bounded', huge.status === 413 || huge.status === 400, `status=${huge.status}`);

  // Every error response must be JSON, never HTML/stack.
  const errRes = await H.req('/api/bookings', { method: 'POST', body: { customerName: '' } });
  const errText = JSON.stringify(errRes.data || '');
  T.record('IN error body is JSON (no stack leak)', errRes.data && typeof errRes.data === 'object' && !errText.includes(' at ') && !errText.includes('node_modules'), `status=${errRes.status}`);

  T.finish();
}

main().catch((e) => { console.error(e); process.exit(1); });
