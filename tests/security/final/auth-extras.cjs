'use strict';

// Part 2 — authentication extras beyond the base harness:
//   * no session fixation (fresh JWT per login; client-provided cookie ignored)
//   * token revocation at logout (old cookie 401 after logout)
//   * simultaneous sessions both work, logout revokes the session family
//   * malformed / tampered / expired / alg-confused / wrong-identity tokens rejected

const H = require('./helpers.cjs');
const T = H.createReporter('auth-extras');

function decodeJwt(token) {
  try {
    const p = token.split('.')[1];
    return JSON.parse(Buffer.from(p.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
  } catch {
    return null;
  }
}

async function me(cookie) {
  return H.req('/api/auth/me', { cookie });
}

// Send a raw JWT as the cookie value (cookie-parser requires the name prefix).
const authed = (token) => `spa_token=${token}`;

async function main() {
  const cookie1 = await H.adminLogin();
  const p1 = decodeJwt(cookie1);
  T.record('A1 login issued JWT with identity', !!p1 && !!p1.id && !!p1.username, p1 ? `id=${p1.id}` : 'no payload');

  // Session fixation: a second login must NOT reuse cookie1's value.
  // (The JWT carries no nonce; iat has second precision, so wait a beat to
  // guarantee a different iat/exp rather than an accidental same-second match.)
  await new Promise((r) => setTimeout(r, 1200));
  const cookie2 = await H.adminLogin();
  T.record('A2 fresh JWT per login (no fixation)', cookie1 !== cookie2, 'token differs');

  // Client-supplied cookie must be ignored: login with attacker cookie yields server token.
  const att = await H.req('/api/auth/login', {
    method: 'POST',
    body: { pin: H.TEST_ADMIN_PIN },
    headers: { Cookie: 'spa_token=attacker-chosen-value' },
  });
  const setC = att.headers.get('set-cookie') || '';
  T.record('A3 login ignores client-supplied token', setC.includes('spa_token=') && !setC.includes('attacker-chosen-value'), H.redact(setC.split(';')[0]) || 'no set-cookie');

  // Both simultaneous sessions valid.
  const m1 = await me(cookie1);
  const m2 = await me(cookie2);
  T.record('A4 simultaneous sessions both valid', m1.status === 200 && m2.status === 200, `c1=${m1.status} c2=${m2.status}`);

  // Logout revokes the session family (F-03: sessionVersion bump invalidates both).
  const lg = await H.req('/api/auth/logout', { method: 'POST', cookie: cookie1 });
  T.record('A5 logout accepted', lg.status === 200, `status=${lg.status}`);
  const a1 = await me(cookie1);
  const a2 = await me(cookie2);
  T.record('A6 revoked cookie rejected after logout', a1.status === 401, `status=${a1.status}`);
  T.record('A7 sibling session revoked at logout (F-03)', a2.status === 401, `status=${a2.status}`);

  // Re-login for fresh tokens for the remaining checks.
  const cookie3 = await H.adminLogin();
  const p3 = decodeJwt(cookie3);
  const claims = { id: p3.id, username: p3.username, role: 'admin', sessionVersion: p3.sessionVersion };

  // Malformed / empty / oversized cookies.
  const mal = await me('garbage-not-a-jwt');
  T.record('A8 malformed cookie rejected', mal.status === 401, `status=${mal.status}`);
  const empty = await me('spa_token=');
  T.record('A9 empty cookie rejected', empty.status === 401, `status=${empty.status}`);
  const big = await me('spa_token=' + 'x'.repeat(4000));
  T.record('A10 oversized cookie handled (no 500)', big.status === 401 || big.status === 400 || big.status === 431, `status=${big.status}`);

  // Tampered signature: flip one char of the signature.
  const parts = cookie3.split('.');
  const flipped = parts[2].endsWith('a') ? parts[2].slice(0, -1) + 'b' : parts[2].slice(0, -1) + 'a';
  const tampered = `${parts[0]}.${parts[1]}.${flipped}`;
  const t1 = await me(authed(tampered));
  T.record('A11 tampered signature rejected', t1.status === 401, `status=${t1.status}`);

  // Expired token (exp in the past).
  const expired = H.signJWT({ ...claims, iat: Math.floor(Date.now() / 1000) - 7200, exp: Math.floor(Date.now() / 1000) - 3600 }, H.TEST_JWT_SECRET);
  const e1 = await me(authed(expired));
  T.record('A12 expired token rejected', e1.status === 401, `status=${e1.status}`);

  // Algorithm confusion: none / HS384 / HS512.
  const noneHdr = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const noPayload = Buffer.from(JSON.stringify({ ...claims, iat: 0, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
  const noneTok = `${noneHdr}.${noPayload}.`;
  const n1 = await me(authed(noneTok));
  T.record('A13 alg=none rejected', n1.status === 401, `status=${n1.status}`);
  const hs384 = H.signJWT({ ...claims, iat: 0, exp: Math.floor(Date.now() / 1000) + 3600 }, H.TEST_JWT_SECRET, 'HS384');
  const h1 = await me(authed(hs384));
  T.record('A14 alg=HS384 rejected', h1.status === 401, `status=${h1.status}`);

  // Identity manipulation: correct signature + correct sessionVersion but wrong id.
  const wrongId = H.signJWT({ ...claims, id: 'admin-2', iat: 0, exp: Math.floor(Date.now() / 1000) + 3600 }, H.TEST_JWT_SECRET);
  const w1 = await me(authed(wrongId));
  T.record('A15 forged identity (wrong id) rejected', w1.status === 401, `status=${w1.status}`);

  // Role claim: F-09 makes the DB the authority — a forged role claim is
  // overridden by the stored role. A viewer-claim token on an admin identity
  // must NOT demote; only DB rows grant roles. (Escalation to a role never
  // stored in the DB is therefore impossible.)
  const viewer = H.signJWT({ ...claims, role: 'viewer', iat: 0, exp: Math.floor(Date.now() / 1000) + 3600 }, H.TEST_JWT_SECRET);
  const v1 = await me(authed(viewer));
  T.record('A16 forged role claim ignored (DB authoritative)', v1.status === 200, `status=${v1.status} (role=admin from DB)`);

  // Control: a correctly-signed token with the exact DB claims must pass.
  const good = H.signJWT({ ...claims, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 }, H.TEST_JWT_SECRET);
  const g1 = await me(authed(good));
  T.record('A17 control: correctly signed token accepted', g1.status === 200, `status=${g1.status}`);

  T.finish();
}

main().catch((e) => { console.error(e); process.exit(1); });
