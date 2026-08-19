'use strict';

// F-13 PII: notification text must never duplicate customer PII (mobile,
// message body, email, address). Verified with a unique probe value that we
// search for in every notification; also confirms customer PII is only ever
// returned from admin-protected endpoints, never public ones.

const H = require('./helpers.cjs');
const T = H.createReporter('f13-pii');

async function main() {
  const cookie = await H.adminLogin();
  const probe = 'PIIPROBE' + Date.now().toString().slice(-6);
  const probeMobile = '98765' + String(Date.now()).slice(-5);
  const probeMessage = 'need massage with ' + probe;

  // Create an enquiry carrying PII (name is deliberately normal; the PII to
  // protect is the mobile number and the message body).
  const enq = await H.req('/api/enquiries', {
    method: 'POST',
    body: { name: 'Audit PII Enquiry', mobile: probeMobile, message: probeMessage },
  });
  T.record('F13 enquiry created for probe', enq.status === 200, `status=${enq.status}`);

  // 1) Search every notification for leaked PII (mobile or message body).
  let leaked = null;
  let total = 0;
  let offset = 0;
  for (let i = 0; i < 200 && !leaked; i++) {
    const r = await H.req(`/api/notifications?limit=100&offset=${offset}`, { cookie });
    const rows = Array.isArray(r.data) ? r.data : [];
    if (rows.length === 0) break;
    total += rows.length;
    for (const n of rows) {
      const text = JSON.stringify(n);
      if (text.includes(probeMobile) || text.includes(probeMessage)) {
        leaked = { id: n.id, type: n.type, title: n.title, message: n.message };
        break;
      }
    }
    if (rows.length < 100) break;
    offset += 100;
  }
  T.record('F13 no PII in notification text', leaked === null, leaked ? `LEAK in ${leaked.type} (${leaked.id}): "${leaked.title}" -> ${leaked.message}` : `scanned ${total} notifications`);

  // 2) The notification that corresponds to the probe must reference via relatedId, not PII.
  const nres = await H.req(`/api/notifications?limit=100`, { cookie });
  const nrows = Array.isArray(nres.data) ? nres.data : [];
  const related = nrows.find((n) => n.relatedId === enq.data?.id);
  T.record('F13 notification uses relatedId not PII', !!related, related ? `relatedId=${related.relatedId}` : 'related notification not found');
  if (related) {
    const hasPII = JSON.stringify(related.message).includes(probeMobile) || JSON.stringify(related.message).includes(probeMessage);
    T.record('F13 related notification text PII-free', !hasPII, related.message || '');
  }

  // 3) Customer PII must only appear on admin-protected endpoints.
  const publicServices = await H.req('/api/services');
  const publicTherapists = await H.req('/api/therapists');
  const pubText = JSON.stringify(publicServices.data) + JSON.stringify(publicTherapists.data);
  T.record('F13 public endpoints carry no customer PII', !pubText.includes(probeMobile), 'no booking/customer fields on public endpoints');

  const anonAdmin = await H.req('/api/customers?limit=5');
  T.record('F13 customers endpoint requires admin', anonAdmin.status === 401, `status=${anonAdmin.status}`);

  T.finish();
}

main().catch((e) => { console.error(e); process.exit(1); });
