'use strict';

// Final security audit orchestrator (disposable servers).
//   - Boots a disposable production server on 4060 (RATE_LIMIT_DISABLED=1) for logic tests
//   - Boots a disposable production server on 4061 (rate limits ON) for lockout/rate tests
//   - Runs each harness in tests/security/final/*.cjs against them
//   - Exits 0 only if every harness passed
// Requires TEST_ADMIN_PIN (the PIN the disposable servers seed into the DB admin user).
// NEVER prints credentials, cookies, JWTs, or connection strings.

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const net = require('net');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const TSX = path.join(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');

const TEST_ADMIN_PIN = process.env.TEST_ADMIN_PIN || '';
const JWT_SECRET = process.env.JWT_SECRET || `final-${crypto.randomBytes(24).toString('hex')}`;
const PIN_PORT = 4060;
const RL_PORT = 4061;

async function waitForPort(port, timeoutMs = 40000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ok = await new Promise((resolve) => {
      const c = net.connect(port, '127.0.0.1');
      const done = (good) => { try { c.destroy(); } catch {} resolve(good); };
      c.once('connect', () => done(true));
      c.once('error', () => done(false));
      setTimeout(() => done(false), 1500);
    });
    if (ok) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

function spawnServer(port, extraEnv) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [TSX, 'server.ts'], {
      cwd: ROOT,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: String(port),
        APP_ORIGIN: `http://127.0.0.1:${port}`,
        ADMIN_PIN: TEST_ADMIN_PIN,
        JWT_SECRET,
        ...extraEnv,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let log = '';
    child.stdout.on('data', (d) => (log += d.toString()));
    child.stderr.on('data', (d) => (log += d.toString()));
    resolve({ child, getLog: () => log });
  });
}

const TALLIES = { pass: 0, fail: 0, nottested: 0 };

function absorb(out) {
  for (const line of String(out).split('\n')) {
    if (line.startsWith('PASS ')) TALLIES.pass++;
    else if (line.startsWith('FAIL ')) TALLIES.fail++;
    else if (line.startsWith('NOT TESTED')) TALLIES.nottested++;
  }
}

function runHarness(file, { port }) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(__dirname, file)], {
      cwd: ROOT,
      env: {
        ...process.env,
        BASE_URL: `http://127.0.0.1:${port}`,
        TEST_ADMIN_PIN,
        JWT_SECRET,
      },
    });
    let out = '';
    child.stdout.on('data', (d) => (out += d.toString()));
    child.stderr.on('data', (d) => (out += d.toString()));
    child.on('close', (code) => { absorb(out); resolve({ out, code }); });
  });
}

async function killServer(s) {
  try { s.child.kill(); } catch {}
  await new Promise((r) => setTimeout(r, 500));
}

const LOGIC_HARNESSES = [
  'f08-origin.cjs',
  'f11-pagination.cjs',
  'f12-fk.cjs',
  'f13-pii.cjs',
  'auth-extras.cjs',
  'idor.cjs',
  'mass-assign.cjs',
  'input-matrix.cjs',
  'bizlogic.cjs',
  'cache-headers.cjs',
  'integrity.cjs',
  'path-traversal.cjs',
];

const RATE_HARNESSES = ['api-abuse.cjs', 'rate-lockout.cjs'];

async function main() {
  if (!TEST_ADMIN_PIN) {
    console.error('FATAL: TEST_ADMIN_PIN is required.');
    process.exit(2);
  }

  console.log('--- Booting disposable prod server (logic, rate limits OFF) on 4060 ---');
  const s1 = await spawnServer(PIN_PORT, { RATE_LIMIT_DISABLED: '1' });
  const up1 = await waitForPort(PIN_PORT);
  if (!up1) {
    console.log('FATAL: server on 4060 did not boot.');
    console.log((s1.getLog() || '').slice(-2500));
    process.exit(2);
  }

  for (const f of LOGIC_HARNESSES) {
    console.log(`\n--- ${f} ---`);
    const r = await runHarness(f, { port: PIN_PORT });
    console.log(r.out);
    if (r.code !== 0) console.log(`(harness exit ${r.code})`);
  }
  await killServer(s1);

  console.log('\n--- Booting disposable prod server (rate limits ON) on 4061 ---');
  const s2 = await spawnServer(RL_PORT, {});
  const up2 = await waitForPort(RL_PORT);
  if (!up2) {
    console.log('FATAL: server on 4061 did not boot.');
    process.exit(2);
  }

  for (const f of RATE_HARNESSES) {
    console.log(`\n--- ${f} ---`);
    const r = await runHarness(f, { port: RL_PORT });
    console.log(r.out);
    if (r.code !== 0) console.log(`(harness exit ${r.code})`);
  }
  await killServer(s2);

  console.log(`\nTALLY: ${TALLIES.pass} pass, ${TALLIES.fail} fail, ${TALLIES.nottested} not tested`);
  process.exit(TALLIES.fail > 0 ? 1 : 0);
}

main();
