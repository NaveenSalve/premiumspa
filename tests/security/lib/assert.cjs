'use strict';

// Shared helpers for the security regression suite.
// This library must NEVER print credentials, cookies, tokens or secrets.
// Any string passed through redact() is scrubbed before it can reach output.

const crypto = require('crypto');

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Build a JWT locally so the suite can prove the server rejects forged,
// algorithm-confused, expired and stale-session tokens. The secret used here is
// the TEST secret for the spawned test server only — never a real credential.
function signJWT(payload, secret, algo = 'HS256') {
  const header = { alg: algo, typ: 'JWT' };
  const h = b64url(JSON.stringify(header));
  const p = b64url(JSON.stringify(payload));
  const algMap = { HS256: 'sha256', HS384: 'sha384', HS512: 'sha512' };
  const sig = crypto.createHmac(algMap[algo], secret).update(`${h}.${p}`).digest();
  return `${h}.${p}.${b64url(sig)}`;
}

function normalizeBase(url) {
  return String(url || '').replace(/\/+$/, '');
}

// HTTP helper with an abort timeout so a hung server cannot stall the suite.
async function request(base, path, { method = 'GET', body, cookie, headers = {} } = {}) {
  const h = { ...headers };
  if (body !== undefined) h['Content-Type'] = 'application/json';
  if (cookie) h['Cookie'] = cookie;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 20000);
  try {
    const res = await fetch(normalizeBase(base) + path, {
      method,
      headers: h,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      redirect: 'manual',
      signal: ctl.signal,
    });
    let data = null;
    try { data = await res.json(); } catch { /* non-JSON body */ }
    return { status: res.status, data, headers: res.headers };
  } finally {
    clearTimeout(timer);
  }
}

// First cookie of a Set-Cookie header, e.g. "spa_token=abc".
function setCookieFrom(res) {
  const sc = res.headers.get('set-cookie');
  if (!sc) return '';
  return sc.split(';')[0];
}

function hasSetCookieAttr(res, attr) {
  const sc = res.headers.get('set-cookie') || '';
  return new RegExp(attr, 'i').test(sc);
}

function createReporter(label) {
  const counts = { pass: 0, fail: 0, nottested: 0 };
  const record = (name, ok, detail = '') => {
    if (ok === null || ok === undefined) {
      counts.nottested++;
      console.log(`NOT TESTED  ${name}${detail ? `  -> ${detail}` : ''}`);
    } else if (ok) {
      counts.pass++;
      console.log(`PASS  ${name}${detail ? `  -> ${detail}` : ''}`);
    } else {
      counts.fail++;
      console.log(`FAIL  ${name}${detail ? `  -> ${detail}` : ''}`);
    }
  };
  const finish = (exitOnFail = true) => {
    console.log(`RESULT ${label}: ${counts.pass} PASS / ${counts.fail} FAIL / ${counts.nottested} NOT TESTED`);
    if (exitOnFail && counts.fail > 0) process.exit(1);
    return counts;
  };
  return { record, finish, counts };
}

// Scrub anything that could carry a secret before it is echoed to output.
function redact(s) {
  if (!s) return s;
  return String(s)
    .replace(/(postgres(ql)?|http|https):\/\/[^\s"'`]+/gi, '$1://REDACTED')
    .replace(/(jwt[_-]?secret|admin[_-]?pin|password|passwd|pwd|token|bearer|apikey|api[_-]?key)(\s*[=:]\s*)[^\s,;]+/gi, '$1$2REDACTED')
    .replace(/DATABASE_URL=REDACTED/g, 'DATABASE_URL=REDACTED')
    .replace(/([0-9a-f]{40,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})/g, 'REDACTED')
    .replace(/spa_token=[^;\s]+/gi, 'spa_token=REDACTED');
}

// DB helper used by assertions that need to prove DB-level invariants (F-09
// non-admin role rows, F-12 FK behaviour). Loads the same .env the server uses,
// then connects via TEST_DATABASE_URL / DATABASE_URL / POSTGRES_URL / SQL_*.
// The returned client is never used for destructive operations on real data.
const fs = require('fs');
const path = require('path');

function loadEnv() {
  // assert.cjs lives at ROOT/tests/security/lib — three levels below the project root.
  const envPath = path.join(__dirname, '..', '..', '..', '.env');
  if (fs.existsSync(envPath)) {
    try {
      require('dotenv').config({ path: envPath, quiet: true });
    } catch { /* dotenv optional for pure-HTTP assertions */ }
  }
}

async function connectDb() {
  const { Client } = require('pg');
  loadEnv();
  const url = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;
  const cfg = url
    ? { connectionString: url, ssl: /sslmode=disable/.test(url) ? false : { rejectUnauthorized: false } }
    : {
        host: process.env.SQL_HOST || '127.0.0.1',
        port: Number(process.env.SQL_PORT || 5432),
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DB_NAME,
      };
  const c = new Client(cfg);
  await c.connect();
  return c;
}

module.exports = { b64url, signJWT, request, setCookieFrom, hasSetCookieAttr, createReporter, redact, loadEnv, connectDb };
