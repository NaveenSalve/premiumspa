'use strict';

// Database failure handling: while the database is unreachable the API must
// (1) respond — never hang or crash the process, (2) return a graceful 5xx
// JSON error, and (3) leak nothing internal (no stack traces, no connection
// string fragments, no host/port details, no SQL driver messages).
//
// The server for this scenario is started by run-all.cjs in dev mode against an
// unreachable DB port. Env: BASE_URL, TEST_SERVER_PID (the server process).

const { request, createReporter } = require('./lib/assert.cjs');

const BASE = (process.env.BASE_URL || 'http://127.0.0.1:4000').replace(/\/+$/, '');
const SERVER_PID = Number(process.env.TEST_SERVER_PID || 0);

const T = createReporter('db failure');

function noLeak(body) {
  return !/node_modules|\s+at\s+|\bECONNREFUSED\b|connect ECONN|postgres:|59999|10\.255\./i.test(String(body));
}

(async () => {
  const svc = await request(BASE, '/api/services');
  const s1 = svc.status;
  const b1 = await request(BASE, '/api/bookings', {
    method: 'POST',
    body: { customerName: 'Graceful User', customerMobile: '1234567890', serviceId: 'srv-any', date: '2099-01-01', time: '11:00 AM', fullAddress: 'x', city: 'y' },
  });
  const s2 = b1.status;

  T.record('DB down: API responds (no hang, no crash)', s1 >= 500 && s1 < 600, `services=${s1} booking=${s2}`);
  T.record(
    'DB down: graceful 5xx JSON, no internal leak',
    Boolean(s2 >= 500 && s2 < 600 && noLeak(JSON.stringify(b1.data)) && b1.data && b1.data.error),
    `booking=${s2}`
  );

  let alive = false;
  try {
    process.kill(SERVER_PID, 0);
    alive = true;
  } catch { alive = false; }
  T.record('DB down: server process still alive after errors', alive, `pid=${SERVER_PID}`);

  T.finish();
})().catch((e) => {
  console.error('HARNESS ERROR:', e && e.message ? e.message : e);
  process.exit(2);
});
