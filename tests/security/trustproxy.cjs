'use strict';

// Trusted-proxy / X-Forwarded-For handling (F-01). The server must already be
// running with the corresponding TRUST_PROXY setting (set by run-all.cjs).
//
//   MODE=no-trust   TRUST_PROXY unset      -> XFF ignored; rotating XFF must NOT
//                                            bypass the login rate limit (429).
//   MODE=wrong-ip   TRUST_PROXY=<non-peer> -> XFF from an untrusted address is
//                                            ignored -> still 429.
//   MODE=trusted    TRUST_PROXY=127.0.0.1  -> XFF honored; rotating XFF yields
//                                            distinct clients (401 each), but a
//                                            single client is still limited (429).

const { request, createReporter } = require('./lib/assert.cjs');

const BASE = (process.env.BASE_URL || 'http://127.0.0.1:4000').replace(/\/+$/, '');
const MODE = process.env.TPROXY_MODE || 'no-trust';

const T = createReporter(`trust proxy (${MODE})`);

(async () => {
  const attempt = (pin, xff) =>
    request(BASE, '/api/auth/login', {
      method: 'POST',
      body: { pin },
      headers: { 'X-Forwarded-For': xff },
    }).then((r) => r.status);

  let last = 0;
  for (let i = 0; i < 12; i++) {
    last = await attempt(`Wrong${i}`, `203.0.113.${i}`);
  }

  if (MODE === 'no-trust') {
    T.record('no-trust(default): rotating XFF cannot bypass login limit', last === 429, `last=${last}`);
  } else if (MODE === 'wrong-ip') {
    T.record('wrong-ip: XFF from non-trusted peer ignored (still 429)', last === 429, `last=${last}`);
  } else if (MODE === 'trusted') {
    const same = [];
    for (let i = 0; i < 12; i++) {
      same.push(await attempt(`Wrong${i}`, '203.0.113.77'));
    }
    const singleClientLimited = same[11] === 429;
    const rotatingWorked = last === 401;
    console.log(`    same-XFF last=${same[11]}, rotating-XFF last=${last}`);
    T.record(
      'trusted: real client IP honored; same client still limited',
      singleClientLimited && rotatingWorked,
      `singleClientLimited=${singleClientLimited} rotatingWorked=${rotatingWorked}`
    );
  } else {
    T.record(`unknown TPROXY_MODE=${MODE}`, false);
  }

  T.finish();
})().catch((e) => {
  console.error('HARNESS ERROR:', e && e.message ? e.message : e);
  process.exit(2);
});
