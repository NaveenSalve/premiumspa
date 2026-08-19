'use strict';

// Security suite orchestrator.
//
//   - Requires the production build: dist-server/server.cjs (run `npm run build`)
//   - Spawns disposable servers on BASE_URL's port for each scenario
//   - Requires TEST_ADMIN_PIN (the PIN the spawned test server will use; on boot
//     the server sets the target DB admin password to this value)
//   - NEVER prints secrets: credentials, cookies, JWT tokens, connection strings
//   - Exits 0 only if every security assertion passed

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const net = require('net');
const { redact } = require('./lib/assert.cjs');

const ROOT = path.resolve(__dirname, '..', '..');
const SERVER_BUNDLE = path.join(ROOT, 'dist-server', 'server.cjs');
const TSX = path.join(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const ASSERT_CJS = path.join(__dirname, 'lib', 'assert.cjs');

const BASE_URL = (process.env.BASE_URL || 'http://127.0.0.1:4000').replace(/\/+$/, '');
const urlPort = (BASE_URL.match(/:(\d+)\/?$/) || [])[1];
const PORT = urlPort ? Number(urlPort) : 4000;
const APP_ORIGIN = new URL(BASE_URL).origin;
const DB_DOWN_PORT = PORT + 1;
const TEST_ADMIN_PIN = process.env.TEST_ADMIN_PIN || '';
const JWT_SECRET = process.env.JWT_SECRET || `test-${crypto.randomBytes(24).toString('hex')}`;

const tally = { pass: 0, fail: 0, nottested: 0 };
let scenarios = 0;

function check(ok, name, detail = '') {
  if (ok) {
    tally.pass++;
    console.log(`PASS  ${name}${detail ? `  -> ${detail}` : ''}`);
  } else {
    tally.fail++;
    console.log(`FAIL  ${name}${detail ? `  -> ${detail}` : ''}`);
  }
}

function phase(title) {
  scenarios++;
  console.log(`\n==== scenario ${scenarios}: ${title} ====`);
}

function serverEnv(extra = {}) {
  return {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(PORT),
    ADMIN_PIN: TEST_ADMIN_PIN,
    JWT_SECRET,
    // F-08: the production origin allowlist — the harness sends Origin headers
    // equal to origin(BASE_URL) for the allowed-origin assertions.
    APP_ORIGIN,
    RATE_LIMIT_DISABLED: '0',
    TRUST_PROXY: '',
    ...extra,
  };
}

function startServer(args, env, label) {
  const proc = spawn(process.execPath, args, { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  let err = '';
  proc.stdout.on('data', (d) => { out += d.toString(); });
  proc.stderr.on('data', (d) => { err += d.toString(); });
  return {
    proc,
    getOut: () => out,
    getErr: () => err,
    async stop() {
      try { proc.kill(); } catch { /* already gone */ }
      await waitPortClosed(PORT, 10000);
    },
  };
}

function waitPortClosed(port, timeoutMs) {
  const start = Date.now();
  return new Promise((resolve) => {
    const poll = () => {
      const sock = net.connect(port, '127.0.0.1');
      let done = false;
      const finish = (closed) => {
        if (done) return;
        done = true;
        sock.destroy();
        if (closed) resolve(true);
        else if (Date.now() - start > timeoutMs) resolve(false);
        else setTimeout(poll, 300);
      };
      sock.on('connect', () => finish(false));
      sock.on('error', () => finish(true));
    };
    poll();
  });
}

async function waitReady(base, proc, timeoutMs = 40000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (proc.exitCode !== null) return { ok: false, reason: `server exited code=${proc.exitCode}` };
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 2000);
      const r = await fetch(base + '/api/services', { signal: ctl.signal });
      clearTimeout(t);
      if (r) return { ok: true };
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  return { ok: false, reason: 'timeout waiting for server' };
}

async function runHarness(file, extraEnv = {}) {
  const env = {
    ...process.env,
    BASE_URL,
    TEST_ADMIN_PIN,
    JWT_SECRET,
    ...extraEnv,
  };
  return new Promise((resolve) => {
    const proc = spawn(process.execPath, [file], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    proc.stdout.on('data', (d) => { out += d.toString(); });
    proc.stderr.on('data', (d) => { err += d.toString(); });
    proc.on('close', (code) => resolve({ code, out, err }));
  });
}

function emitHarnessOutput(out, label) {
  let scenarioFailed = false;
  for (const rawLine of out.split('\n')) {
    const line = rawLine.replace(/\r$/, '');
    if (line.startsWith('FAIL  ')) scenarioFailed = true;
    if (line.startsWith('PASS  ')) tally.pass++;
    else if (line.startsWith('FAIL  ')) tally.fail++;
    else if (line.startsWith('NOT TESTED  ')) tally.nottested++;
    console.log(line);
  }
  return scenarioFailed;
}

async function bootAndRun(serverArgs, env, harnessFile, harnessEnv, label) {
  phase(label);
  const s = startServer(serverArgs, env, label);
  const ready = await waitReady(BASE_URL, s.proc);
  if (!ready.ok) {
    console.log(redact(`FAIL  ${label}: server did not start -> ${ready.reason}`));
    console.log(redact('    server stdout (first 40):\n' + s.getOut().split('\n').slice(0, 40).join('\n')));
    console.log(redact('    server stderr (full):\n' + s.getErr()));
    tally.fail++;
    await s.stop();
    return false;
  }
  const res = await runHarness(harnessFile, harnessEnv);
  const failed = emitHarnessOutput(res.out, label);
  if (res.code !== 0 && !failed) {
    tally.fail++;
    console.log(`FAIL  ${label}: harness crashed (exit ${res.code})`);
  }
  if (res.code !== 0 && !failed) {
    console.log(redact('    harness stderr (full):\n' + res.err));
  }
  await s.stop();
  return !failed;
}

async function main() {
  console.log(`Security suite: BASE_URL=${BASE_URL}`);
  if (!TEST_ADMIN_PIN) {
    console.error('FATAL  TEST_ADMIN_PIN is required. It sets the target DB admin password for the spawned test server; run against a disposable test DB only.');
    process.exit(2);
  }
  if (!fs.existsSync(SERVER_BUNDLE)) {
    console.error('FATAL  dist-server/server.cjs not found. Run `npm run build` first.');
    process.exit(2);
  }
  if (!fs.existsSync(ASSERT_CJS)) {
    console.error('FATAL  tests/security/lib/assert.cjs missing.');
    process.exit(2);
  }
  const tsxAvailable = fs.existsSync(TSX);

  // 1. Main regression harness
  await bootAndRun([SERVER_BUNDLE], serverEnv(), path.join(__dirname, 'harness.cjs'), {}, 'main regression harness');

  // 1b. Same-day booking time validation + Asia/Kolkata timezone enforcement
  await bootAndRun([SERVER_BUNDLE], serverEnv(), path.join(__dirname, 'final', 'booking-time.cjs'), {}, 'same-day booking time validation');

  // 2. Duplicate-booking race
  await bootAndRun([SERVER_BUNDLE], serverEnv(), path.join(__dirname, 'concurrency.cjs'), {}, 'duplicate booking race');

  // 3. Logout revocation race
  await bootAndRun([SERVER_BUNDLE], serverEnv(), path.join(__dirname, 'logout-race.cjs'), {}, 'logout revocation race');

  // 4-6. Trusted-proxy modes
  await bootAndRun([SERVER_BUNDLE], serverEnv(), path.join(__dirname, 'trustproxy.cjs'), { TPROXY_MODE: 'no-trust' }, 'trust proxy: no-trust (default)');
  await bootAndRun([SERVER_BUNDLE], serverEnv({ TRUST_PROXY: '10.0.0.5' }), path.join(__dirname, 'trustproxy.cjs'), { TPROXY_MODE: 'wrong-ip' }, 'trust proxy: non-trusted peer');
  await bootAndRun([SERVER_BUNDLE], serverEnv({ TRUST_PROXY: '127.0.0.1' }), path.join(__dirname, 'trustproxy.cjs'), { TPROXY_MODE: 'trusted' }, 'trust proxy: trusted peer');

  // 7. Weak ADMIN_PIN production refusal (server must refuse to start)
  phase('weak ADMIN_PIN production refusal');
  const wp = startServer([SERVER_BUNDLE], serverEnv({ ADMIN_PIN: '1234' }), 'weak-pin');
  const wpExit = await new Promise((resolve) => {
    const t = setTimeout(() => resolve('timeout'), 20000);
    wp.proc.on('close', (code) => { clearTimeout(t); resolve(code); });
  });
  const wpErr = wp.getErr();
  check(wpExit !== 0, 'weak ADMIN_PIN: production startup refused', `exit=${wpExit}`);
  check(/Production startup refused/.test(wpErr), 'weak ADMIN_PIN: generic error message shown', '');
  check(!wpErr.includes('1234'), 'weak ADMIN_PIN: the PIN value is never logged', '');

  // 8. Database failure handling (dev server against unreachable DB)
  if (tsxAvailable) {
    phase('database failure handling');
    const dbDownBase = BASE_URL.replace(/:(\d+)\/?$/, ':' + DB_DOWN_PORT);
    const dbEnv = {
      ...process.env,
      NODE_ENV: 'development',
      PORT: String(DB_DOWN_PORT),
      DATABASE_URL: '',
      SQL_HOST: '127.0.0.1',
      SQL_PORT: '59999',
      SQL_DB_NAME: 'spa',
      SQL_USER: 'no-such-user',
      SQL_PASSWORD: '',
      SQL_SSL: 'false',
      JWT_SECRET,
      ADMIN_PIN: TEST_ADMIN_PIN,
      RATE_LIMIT_DISABLED: '0',
    };
    const dbs = startServer([TSX, 'server.ts'], dbEnv, 'db-down');
    const dbReady = await waitReady(dbDownBase, dbs.proc, 45000);
    if (!dbReady.ok) {
      console.log(redact(`FAIL  db-down: server did not start -> ${dbReady.reason}`));
      console.log(redact('    server stderr (last 8):\n' + dbs.getErr().split('\n').slice(-8).join('\n')));
      tally.fail++;
    } else {
      const dbRes = await runHarness(path.join(__dirname, 'db-down.cjs'), { BASE_URL: dbDownBase, TEST_SERVER_PID: String(dbs.proc.pid) });
      emitHarnessOutput(dbRes.out, 'db-down');
      if (dbRes.code !== 0) console.log(redact(`    db-down stderr: ${dbRes.err.split('\n').slice(-4).join(' | ')}`));
    }
    try { dbs.proc.kill(); } catch { /* gone */ }
  } else {
    tally.nottested++;
    console.log('NOT TESTED  database failure handling  -> devDependencies not installed (tsx missing)');
  }

  // Summary
  console.log('\n==== SECURITY SUITE SUMMARY ====');
  console.log(`Assertions:  ${tally.pass} PASS / ${tally.fail} FAIL / ${tally.nottested} NOT TESTED`);
  console.log(`Scenarios:   ${scenarios}`);
  console.log(`Exit:        ${tally.fail > 0 ? 1 : 0}`);
  process.exit(tally.fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('RUNNER ERROR:', e && e.message ? e.message : e);
  process.exit(2);
});
