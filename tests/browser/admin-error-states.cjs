'use strict';

const { chromium } = require('playwright-core');
const fs = require('fs');

const BASE = (process.env.BASE_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '');

function readEnvValue(key) {
  const text = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
  const match = text.match(new RegExp(`^${key}=("?)([^"\\r\\n]+)\\1`, 'm'));
  return process.env[key] || (match && match[2]) || '';
}

function assert(condition, message, details = '') {
  if (!condition) throw new Error(`${message}${details ? `: ${details}` : ''}`);
}

async function gotoAdmin(page) {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.click('button[aria-label="Open Navigation Menu"]').catch(() => {});
  const mgmt = page.locator('button:has-text("Management Console")').first();
  if (await mgmt.count()) {
    await mgmt.click();
  } else {
    await page.evaluate(() => {
      const buttons = [...document.querySelectorAll('button')];
      buttons.find((b) => /admin|management|console/i.test(b.textContent || ''))?.click();
    });
  }
  await page.waitForFunction(() => {
    return !!document.querySelector('input[type="password"]') || /Dashboard/i.test(document.body.textContent || '');
  }, { timeout: 10000 });
}

async function login(page, pin) {
  const password = page.locator('input[type="password"]').first();
  await password.fill(pin);
  const started = Date.now();
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/auth/login') && r.status() === 200, { timeout: 10000 }),
    password.press('Enter'),
  ]);
  await page.waitForSelector('button:has-text("Dashboard")', { timeout: 8000 });
  return Date.now() - started;
}

async function openSettings(page) {
  await page.locator('button:has-text("Contact Settings")').first().click();
  await page.waitForSelector('button:has-text("Save Contact Settings")', { timeout: 8000 });
}

async function saveSettingsAndReadError(page) {
  const save = page.locator('button:has-text("Save Contact Settings")').first();
  await save.click();
  await page.waitForTimeout(250);
  const errorText = await page.locator('text=/failed|unauthorized|forbidden|not found|conflict|server|network/i').first().textContent({ timeout: 6000 }).catch(() => '');
  const enabled = await save.isEnabled();
  return { errorText: errorText || '', enabled };
}

async function oneShotRoute(page, matcher, handler) {
  let used = false;
  await page.route(matcher, async (route) => {
    if (used) return route.continue();
    used = true;
    return handler(route);
  });
}

async function apiStatusMatrix(browser, page) {
  const anon = await browser.newContext();
  const anonStatus = (await anon.request.get(`${BASE}/api/bookings?limit=1`)).status();
  await anon.close();
  assert(anonStatus === 401, 'admin list unauth 401', `expected 401, got ${anonStatus}`);

  const cases = [
    { name: 'service create invalid 400', path: '/api/services', opts: { method: 'POST', body: { name: '' } }, want: 400 },
    { name: 'service update missing 404', path: '/api/services/missing-admin-ui-audit', opts: { method: 'PATCH', body: { name: 'Missing' } }, want: 404 },
    { name: 'service delete missing 404', path: '/api/services/missing-admin-ui-audit', opts: { method: 'DELETE' }, want: 404 },
    { name: 'therapist create invalid 400', path: '/api/therapists', opts: { method: 'POST', body: { name: '' } }, want: 400 },
    { name: 'therapist update missing 404', path: '/api/therapists/missing-admin-ui-audit', opts: { method: 'PATCH', body: { name: 'Missing' } }, want: 404 },
    { name: 'therapist delete missing 404', path: '/api/therapists/missing-admin-ui-audit', opts: { method: 'DELETE' }, want: 404 },
    { name: 'booking update missing 404', path: '/api/bookings/missing-admin-ui-audit', opts: { method: 'PATCH', body: { status: 'Confirmed' } }, want: 404 },
    { name: 'notification update missing 404', path: '/api/notifications/missing-admin-ui-audit', opts: { method: 'PATCH', body: { read: true } }, want: 404 },
    { name: 'settings invalid 400', path: '/api/admin/settings', opts: { method: 'PATCH', body: { unknownKey: 'x' } }, want: 400 },
  ];

  const results = [];
  for (const c of cases) {
    const status = await page.evaluate(async ({ base, path, opts }) => {
      const headers = { 'Content-Type': 'application/json' };
      const r = await fetch(base + path, {
        method: opts.method || 'GET',
        headers,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
      });
      return r.status;
    }, { base: BASE, path: c.path, opts: c.opts });
    results.push({ ...c, status });
    assert(status === c.want, c.name, `expected ${c.want}, got ${status}`);
  }
  return [{ name: 'admin list unauth 401', status: anonStatus }, ...results];
}

(async () => {
  const adminPin = readEnvValue('ADMIN_PIN');
  assert(adminPin, 'ADMIN_PIN is required for browser admin error-state test');

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const page = await context.newPage();
  const results = [];

  page.setDefaultTimeout(10000);

  await gotoAdmin(page);

  await page.locator('input[type="password"]').first().fill('000000-wrong');
  await page.locator('input[type="password"]').first().press('Enter');
  const invalidLogin = await page.waitForResponse((r) => r.url().includes('/api/auth/login'), { timeout: 8000 });
  assert(invalidLogin.status() === 401, 'invalid admin login returns 401');
  assert(await page.locator('input[type="password"]').first().isEnabled(), 'login input re-enabled after 401');
  results.push('PASS invalid login 401 recovery');

  await oneShotRoute(page, '**/api/bookings?limit=100&offset=0', async (route) => {
    await new Promise((r) => setTimeout(r, 3000));
    await route.continue();
  });
  const loginMs = await login(page, adminPin);
  assert(loginMs < 4500, 'admin UI unlocks before slow list load completes', `${loginMs}ms`);
  results.push(`PASS admin login UI unlock ${loginMs}ms with delayed bookings list`);

  const matrix = await apiStatusMatrix(browser, page);
  results.push(`PASS API error/status matrix ${matrix.length} cases`);

  await openSettings(page);

  await oneShotRoute(page, '**/api/admin/settings', async (route) => {
    await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Unauthorized' }) });
  });
  let state = await saveSettingsAndReadError(page);
  assert(/unauthorized|failed/i.test(state.errorText) && state.enabled, 'settings UI recovers after 401', state.errorText);
  results.push('PASS settings UI 401 recovery');

  await oneShotRoute(page, '**/api/admin/settings', async (route) => {
    await route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: 'Forbidden' }) });
  });
  state = await saveSettingsAndReadError(page);
  assert(/forbidden|failed/i.test(state.errorText) && state.enabled, 'settings UI recovers after 403', state.errorText);
  results.push('PASS settings UI 403 recovery');

  await oneShotRoute(page, '**/api/admin/settings', async (route) => {
    await route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: 'Conflict' }) });
  });
  state = await saveSettingsAndReadError(page);
  assert(/conflict|failed/i.test(state.errorText) && state.enabled, 'settings UI recovers after 409', state.errorText);
  results.push('PASS settings UI 409 recovery');

  await oneShotRoute(page, '**/api/admin/settings', async (route) => {
    await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Server error' }) });
  });
  state = await saveSettingsAndReadError(page);
  assert(/server error|failed/i.test(state.errorText) && state.enabled, 'settings UI recovers after 500', state.errorText);
  results.push('PASS settings UI 500 recovery');

  await oneShotRoute(page, '**/api/admin/settings', async (route) => {
    await route.abort('failed');
  });
  state = await saveSettingsAndReadError(page);
  assert(/failed|network/i.test(state.errorText) && state.enabled, 'settings UI recovers after network failure', state.errorText);
  results.push('PASS settings UI network-failure recovery');

  await oneShotRoute(page, '**/api/admin/settings', async (route) => {
    await new Promise((r) => setTimeout(r, 1200));
    await route.continue();
  });
  const save = page.locator('button:has-text("Save Contact Settings")').first();
  const slowStart = Date.now();
  await save.click();
  await page.waitForSelector('text=Saving...', { timeout: 1000 });
  await page.waitForSelector('text=/updated successfully/i', { timeout: 8000 });
  assert(await save.isEnabled(), 'settings UI re-enabled after slow success');
  results.push(`PASS settings slow success recovery ${Date.now() - slowStart}ms`);

  await browser.close();
  console.log('\n===== ADMIN BROWSER ERROR-STATE AUDIT =====');
  results.forEach((r) => console.log(r));
})().catch((err) => {
  console.error('\nFAIL ADMIN BROWSER ERROR-STATE AUDIT');
  console.error(err && err.message ? err.message : err);
  process.exit(1);
});
