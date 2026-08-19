'use strict';

// Rate limiting against a DISPOSABLE server with limits ENABLED (port 4061):
//   * brute-force login lockout (10/15 min) -> 429 after 10
//   * rate-limit headers present
//   * message limiter (40/hr) kicks in
// Uses disposable public endpoints (no real data writes).

const H = require('./helpers.cjs');
const T = H.createReporter('rate-lockout');

async function main() {
  // 1) Brute-force: 11 wrong-pin logins. All must be 401 until the limiter kicks in, then 429.
  let got429 = false;
  let got401 = 0;
  let codes = [];
  for (let i = 0; i < 12; i++) {
    const r = await H.req('/api/auth/login', { method: 'POST', body: { pin: `wrong-pin-${i}` } });
    codes.push(r.status);
    if (r.status === 429) got429 = true;
    if (r.status === 401) got401++;
    if (r.status >= 500) { codes.push(`5xx!`); break; }
  }
  T.record('R1 login lockout triggers 429', got429, codes.join(','));
  T.record('R2 no 5xx during brute force', codes.every((c) => c !== '5xx!'), codes.join(','));

  // 2) Rate-limit headers should be present on the 429.
  const r429 = await H.req('/api/auth/login', { method: 'POST', body: { pin: 'still-wrong' } });
  const hasRlHdr = !!r429.headers.get('ratelimit-limit') || !!r429.headers.get('x-ratelimit-limit') || !!r429.headers.get('ratelimit-remaining');
  T.record('R3 rate-limit headers present', hasRlHdr, `hdr=${hasRlHdr}`);

  // 3) Message limiter (40/hr) — after the login attempts we still have a clean key space.
  //    Exhaust the remaining messages budget in 42 calls; some must 429.
  let msg429 = false;
  let msgOk = 0;
  for (let i = 0; i < 42; i++) {
    const r = await H.req('/api/enquiries', {
      method: 'POST',
      body: { name: `RL ${i}`, mobile: '9999900' + String(i).padStart(3, '0'), message: 'rate probe' },
    });
    if (r.status === 429) { msg429 = true; break; }
    if (r.status === 200) msgOk++;
    if (r.status >= 500) break;
  }
  T.record('R4 message limiter triggers 429', msg429, `ok=${msgOk} then 429`);

  T.finish();
}

main().catch((e) => { console.error(e); process.exit(1); });
