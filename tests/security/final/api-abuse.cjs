'use strict';

// Part 8 — API abuse & availability against the RATE-LIMITED disposable server
// (port 4061): burst load, deep nesting, oversized payloads, unusual methods,
// unsupported content types. The app must stay responsive and error cleanly.

const H = require('./helpers.cjs');
const T = H.createReporter('api-abuse');

async function main() {
  // 1) Burst: 50 parallel public GETs -> all complete, no 5xx.
  const g = await Promise.all(Array.from({ length: 50 }, () => H.req('/api/services?limit=5')));
  const g5xx = g.filter((r) => r.status >= 500).length;
  const gOk = g.filter((r) => r.status === 200).length;
  T.record('A1 burst GET /api/services stable', gOk === 50 && g5xx === 0, `200=${gOk} 5xx=${g5xx}`);

  // 2) Malformed JSON body -> 400, not 500.
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 20000);
  const mal = await fetch(H.BASE + '/api/enquiries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{bad json!!',
    signal: ctl.signal,
  }).catch(() => ({ status: 0 }));
  clearTimeout(timer);
  T.record('A2 malformed JSON rejected', mal.status === 400, `status=${mal.status}`);

  // 3) Deep nesting (100 levels) — 4xx or 200, never 5xx.
  let deep = {};
  let cur = deep;
  for (let i = 0; i < 100; i++) { cur.k = {}; cur = cur.k; }
  const d = await H.req('/api/enquiries', { method: 'POST', body: { ...deep, name: 'D', mobile: '9999999999', message: 'hi' } });
  T.record('A3 deep nesting handled', d.status === 400 || d.status === 200, `status=${d.status}`);

  // 4) Unsupported content type — must be a clean 4xx, never a 5xx.
  const ctl2 = new AbortController();
  const timer2 = setTimeout(() => ctl2.abort(), 20000);
  const xml = await fetch(H.BASE + '/api/enquiries', {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml' },
    body: '<enquiry/>',
    signal: ctl2.signal,
  }).catch(() => ({ status: 0 }));
  clearTimeout(timer2);
  T.record('A4 unsupported content-type handled', xml.status === 400 || xml.status === 415, `status=${xml.status} (500 => FINDING: unparseable content-type not rejected)`);

  // 5) Oversized body (300kb) -> 413.
  const big = await H.req('/api/enquiries', { method: 'POST', body: { name: 'X', mobile: '9999999999', message: 'z'.repeat(300000) } });
  T.record('A5 oversized body -> 413', big.status === 413, `status=${big.status}`);

  // 6) Unusual methods return clean errors, never 5xx or stack traces.
  //    node fetch rejects TRACE/CONNECT/BREW, so those go over raw http.
  const http = require('http');
  const raw = (method) => new Promise((resolve) => {
    const u = new URL(H.BASE + '/api/services');
    const r = http.request({ hostname: u.hostname, port: u.port, path: u.pathname, method }, (res) => {
      let body = '';
      res.on('data', (d) => (body += d.toString()));
      res.on('end', () => resolve({ status: res.statusCode, data: body }));
    });
    r.on('error', () => resolve({ status: 0, data: '' }));
    r.end();
  });
  for (const method of ['TRACE', 'CONNECT', 'BREW', 'OPTIONS', 'HEAD', 'PATCH', 'DELETE']) {
    const r = method === 'OPTIONS' || method === 'HEAD' || method === 'PATCH' || method === 'DELETE'
      ? await H.req('/api/services', { method })
      : await raw(method);
    const body = typeof r.data === 'string' ? r.data : JSON.stringify(r.data || '');
    const noStack = !body.includes('node_modules') && !body.includes('    at ');
    T.record(`A6 ${method} handled`, r.status < 500 && noStack, `status=${r.status}`);
  }

  // 7) Still responsive after abuse.
  const health = await H.req('/api/services?limit=1');
  T.record('A7 responsive after abuse', health.status === 200, `status=${health.status}`);

  T.finish();
}

main().catch((e) => { console.error(e); process.exit(1); });
