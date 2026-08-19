# Security Regression Suite — `tests/security/`

Reusable, self-contained security harness for the Premium Spa & Home Wellness backend.
It re-verifies every fix from `SECURITY-AUDIT.md` (F-01…F-13, strong `ADMIN_PIN`,
security headers) plus CORS/CSRF posture, Origin allowlist, role enforcement,
duplicate-booking races, logout revocation races, pagination bounds, FK integrity,
notification-PII hygiene, weak-PIN rejection and database-failure handling.

> **ALWAYS run against a disposable test/staging environment.**
> The suite boots disposable server instances that **set the target database's admin
> password to `TEST_ADMIN_PIN`** and **create real rows** (test bookings, enquiries,
> contact messages). It is **NOT** for destructive or production testing.

---

## What it tests

| Group | Coverage |
|---|---|
| A — Artifacts / headers | SPA served, CSP (no `script-src 'unsafe-inline'`, pinned `object-src/base-uri/form-action`, Google Fonts + FontAwesome allowlist), HSTS, nosniff, DENY, referrer & permissions policies, source/sourcemap/source-file exposure blocked (F-02) |
| B — Auth | wrong PIN → 401, login → 200 + `httpOnly` cookie, no JWT in login body (F-10), Bearer rejected, `/me` auth, logout clears cookie, revocation (F-03) |
| CSRF/CORS | auth cookie `SameSite=Lax`; no `Access-Control-Allow-Origin` / `Allow-Credentials` on public, preflight or authenticated responses |
| C — JWT | forged token, `alg:none`, HS384 algorithm-confusion, expired token, stale `sessionVersion` (F-07, F-03) |
| D — Rate limiting | 15 wrong logins with rotating `X-Forwarded-For` still hit 429; correct PIN blocked while limited (F-01) |
| E — Bookings | valid booking, unavailable/inactive therapist → 409 (F-04), unknown service → 400, payment/status/price manipulation ignored, past date → 400, duplicate slot → 409, admin reassign to off-duty → 409 |
| F — Injection / malformed | SQLi payloads parameterized, XSS stored as text, malformed JSON → 400, oversized body → 413, bad types handled |
| G — Authorization | admin list endpoints → 401 unauthenticated; customer cannot PATCH bookings |
| H — Revocation | token for a deleted admin → 401 |
| Trust proxy | no-trust / non-trusted-peer / trusted-peer `X-Forwarded-For` behaviour |
| Weak PIN | production startup refuses a 12<sup>-class</sup>-weak `ADMIN_PIN` with a generic error and never logs the PIN |
| DB failure | graceful 5xx JSON, no internal leaks, process stays alive when the database is unreachable |
| Races | 8 parallel bookings for one slot → exactly 1×200 + 7×409; logout racing 8 requests → no post-logout reuse |
| F-08 Origin allowlist | same-origin POST allowed; foreign-origin → 403; `Origin: null` → 403; missing-Origin over HTTP → rejected; `APP_ORIGIN` comma-separated, unset in production → fail-closed |
| F-09 Role enforcement | forged `role:'user'` cookie → 403; forged `role:'admin'` → 200; missing role → 401 |
| F-11 Pagination bounds | no `?limit=` → default 100; `limit=1000000` → capped at 1000; oversized `offset` bounded |
| F-12 FK integrity | orphan `service_id`/`therapist_id` insert rejected by FK; valid insert OK (migration `0003`) |
| F-13 Notification PII | enquiry/contact/booking notifications no longer embed customer mobile/message text |

Each line of output is prefixed `PASS`, `FAIL`, or `NOT TESTED`. Anything that cannot be
verified from a local harness (live Supabase switch, host-header/smuggling against the
real ingress, live DDoS) is reported honestly as `NOT TESTED`. The previously
NOT-TESTED runtime items (real-browser SameSite/CSP, TLS/HSTS behind a real CDN,
CDN presence) are now covered by the optional live-browser test — see below.

---

## Prerequisites

- Node 20+ (`fetch` is required; the project already targets Node 24).
- Build output present: run `npm run build` first (the suite boots `dist-server/server.cjs`).
- devDependencies installed (`npm ci` / `npm install`) — the DB-failure scenario uses `tsx`
  to boot the dev server; if it is missing that scenario is reported `NOT TESTED`.
- A reachable PostgreSQL for the API (the suite's own `.env`/`SQL_*` or `TEST_DATABASE_URL`).

## How to run

```bash
npm run build            # ensure dist-server/server.cjs is fresh
npm run test:security    # run the full suite
```

The suite exits `0` only if **every** assertion passes; any `FAIL` produces a non-zero
exit code (so it can gate CI).

## Environment variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `TEST_ADMIN_PIN` | **yes** | — | PIN the spawned test server uses; **the target DB admin password is set to this on boot** |
| `BASE_URL` | no | `http://127.0.0.1:4000` | Where the suite expects its own disposable servers to listen (used to build ports) |
| `TEST_DATABASE_URL` | no | none (falls back to `.env` / `SQL_*`) | Point the spawned servers at a disposable database |
| `JWT_SECRET` | no | auto-generated per run | Test signing secret shared with the spawned servers; enables the algorithm-confusion & stale-session assertions against the real test secret |

The suite refuses to start without `TEST_ADMIN_PIN` so an unknown value can never
clobber a real admin credential.

## Never

- Never point `TEST_DATABASE_URL` / `SQL_*` at production.
- Never run this suite against a live customer database.
- The suite never prints credentials, cookies, tokens, `DATABASE_URL`, `JWT_SECRET`
  or `ADMIN_PIN`; if it ever crashed in a way that could, run logs are redacted.

## Live-browser admin error-state test (optional, 2026-08-17)

`tests/browser/admin-error-states.cjs` drives a **real browser** (Playwright headless
Edge, `channel:'msedge'`) against the **production-mode server**. It verifies invalid
admin login recovery, fast dashboard unlock while admin list loading is delayed, admin
API error statuses, and settings UI recovery for 401, 403, 409, 500, network failure,
and slow success.

```bash
# 1. boot the server in production mode (strong ADMIN_PIN required in .env)
node node_modules\tsx\dist\cli.mjs server.ts        # NODE_ENV=production in .env
# 2. optional: put it behind a tunnel for the HTTPS/CDN checks
cloudflared tunnel --url http://127.0.0.1:3000     # add the *.trycloudflare.com URL to APP_ORIGIN
# 3. run the browser test (reads ADMIN_PIN from .env; point BASE_URL at the app)
BASE_URL=http://127.0.0.1:3000 node tests/browser/admin-error-states.cjs
```

Requires `playwright-core` and Edge or Chrome.
Never run against production data.

## Windows note

The project folder name contains `&`, which breaks `npx`/PATH resolution. Always invoke
the suite via the npm script (`npm run test:security`) which uses relative `node` paths,
or run `node tests/security/run-all.cjs` directly from the project root.
