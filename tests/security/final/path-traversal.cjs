'use strict';

// Part 18 — path traversal & source exposure:
//   * traversal payloads (%2e%2e, %00, ..%2f, raw ..) must never serve file contents
//   * source/env/build files must never be downloadable
//   * responses must be SPA fallback or 4xx — never raw file bytes

const H = require('./helpers.cjs');
const T = H.createReporter('path-traversal');

const TRAVERSALS = [
  '/..%2f..%2f..%2fetc/passwd',
  '/%2e%2e%2f%2e%2e%2fetc/passwd',
  '/..%2F..%2F..%2FWindows%2Fwin.ini',
  '/%00',
  '/.%00',
  '/.../.../etc/passwd',
  '/%2e%2e/%2e%2e/%2e%2e/etc/shadow',
  '/api/%2e%2e/%2e%2e/etc/passwd',
  '/a/../b/../../../etc/hosts',
];

const SOURCE_PATHS = [
  '/server.ts',
  '/server.cjs',
  '/src/App.tsx',
  '/.env',
  '/.env.local',
  '/.git/config',
  '/dist-server/server.cjs',
  '/package.json',
  '/schema.ts',
  '/drizzle/0000_init.sql',
  '/vite.config.ts',
  '/app/package.json',
  '/routes/server.ts',
];

const LEAK_MARKERS = ['password_hash', 'ADMIN_PIN=', 'JWT_SECRET=', 'postgres://', 'jwt.verify', 'const db =', 'bcrypt', 'DATABASE_URL='];

async function main() {
  for (const p of TRAVERSALS) {
    const r = await H.req(p);
    const body = typeof r.data === 'string' ? r.data : JSON.stringify(r.data || '');
    const leaked = LEAK_MARKERS.some((m) => body.includes(m)) || body.includes('root:') || body.includes('[extensions]');
    const isHtml = (r.headers.get('content-type') || '').includes('text/html');
    const is404 = r.status === 404 || r.status === 400;
    T.record(`PT ${p}`, (isHtml && r.status === 200) || is404, `status=${r.status} type=${r.headers.get('content-type') || '?'} leaked=${leaked}`);
    T.record(`PT ${p} no content leak`, !leaked, leaked ? 'LEAK MARKER FOUND' : 'clean');
  }

  for (const p of SOURCE_PATHS) {
    const r = await H.req(p);
    const body = typeof r.data === 'string' ? r.data : JSON.stringify(r.data || '');
    const leaked = LEAK_MARKERS.some((m) => body.includes(m));
    const isHtml = (r.headers.get('content-type') || '').includes('text/html');
    const is404 = r.status === 404 || r.status === 403;
    T.record(`SRC ${p} not served`, (isHtml && r.status === 200) || is404, `status=${r.status} type=${r.headers.get('content-type') || '?'}`);
    T.record(`SRC ${p} no secret in body`, !leaked, leaked ? 'SECRET LEAKED' : 'clean');
  }

  T.finish();
}

main().catch((e) => { console.error(e); process.exit(1); });
