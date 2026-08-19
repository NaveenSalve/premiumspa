# Final Vibe-Coding Production Audit

Project: Premium Spa & Home Wellness  
Audit date: 2026-08-16  
Environment observed: Windows, Node/Express, React/Vite, PostgreSQL, Cloudflare quick-tunnel scripts

## A. Architecture

Current architecture:

`React/Vite UI -> /api client -> Express server.ts -> Drizzle ORM -> PostgreSQL`

Deployment/runtime shape observed in source:

`Cloudflare quick tunnel -> 127.0.0.1:<PORT> -> Express -> PostgreSQL`

Important sources of truth:

| Entity | Source of truth | Evidence |
|---|---|---|
| Admin users | `admin_users` table | `server.ts` verifies bcrypt hash and session version from DB |
| Services | `services` table | Public `/api/services`; admin create/update/delete routes |
| Therapists | `therapists` table | Public `/api/therapists`; admin create/update/delete routes |
| Bookings | `bookings` table | Public/admin `/api/bookings`; server calculates public booking amounts |
| Customers | `customers` table | Booking transaction upserts by phone |
| Settings/contact/homepage images | `site_settings` table | `/api/settings`, `/api/admin/settings`; localStorage is only first-paint cache |
| Enquiries/contact messages | `enquiries`, `contact_messages` | Public create routes; admin list/update/delete |

## B. Findings

| Severity | Issue | Root Cause | Evidence | Fix |
|---|---|---|---|---|
| HIGH | Backup scripts failed against the actual app DB config | Scripts ignored `DATABASE_URL`/`POSTGRES_URL`, used stale `SQL_*`, and libpq rejected pooler-only URL params | `backup-db.ps1` initially failed with password auth, then `pg_dump: invalid URI query parameter: "pgbouncer"` | Updated backup/restore scripts to prefer app connection URL and strip unsupported pooler params |
| HIGH | Restore test could not restore managed platform objects | Full dump included non-app schemas/functions that require elevated managed DB permissions | `pg_restore` failed on managed `realtime` function permission | Scoped `pg_dump` to `--schema=public` for app disaster recovery |
| MEDIUM | Restore test was fragile around temp DB state | Failed restore left active sessions/default schema conflicts | Errors: temp DB accessed by other users; `schema "public" already exists` | Added forced temp DB drop, default public schema drop before restore, and schema-qualified row-count checks |
| MEDIUM | Public booking confirmation used client-generated ID/object | Frontend ignored authoritative server booking returned by `/api/bookings` | Source: `BookingView` sent WhatsApp/confirmation using `newBooking` after API success | Changed `onAddBooking` contract to return persisted booking; confirmation and admin notification now use server object |
| LOW | Production JS bundle is large | Single Vite chunk includes app/admin/chart code | Build warning: JS chunk ~832.92 kB minified, 221.90 kB gzip | Not fixed; consider code splitting admin/dashboard views |
| INFO | Security suites require disposable DB | Harnesses mutate data and set spawned admin password | `tests/security/run-all.cjs` and final suite exited with `TEST_ADMIN_PIN is required`; headers warn disposable DB only | Not run against current DB; documented limitation |

## C. AI/Vibe-Coding Risks Found

- Client/server mismatch: booking UI displayed a fake client-generated booking reference after server success.
- Backup drift: operational scripts did not match the app’s actual DB connection strategy.
- Managed DB assumption: backup included provider-owned schemas, making restore verification fail.
- LocalStorage exists for chat/favorites/settings cache, but settings are DB-backed and API-overridden.
- Several `any` usages remain in route adapters and admin UI. No verified exploit from these during this audit, but they increase maintenance risk.
- Some frontend handlers still optimistically update admin state and rely on later reload/toast for errors; full browser failure-state testing remains not verified.

## D. Admin Performance

Measured local API route timings. Production-mode admin cookie could not be replayed over plain HTTP because cookies are correctly `Secure` in production; authenticated timings were measured against the same built server in development mode over localhost.

| Operation | Requests | Avg | Max | Duplicate | Hang | UI |
|---|---:|---:|---:|---|---|---|
| Admin login | 1 | 392 ms | 392 ms | Not tested | No API hang | API only |
| Auth session check | 1 | 113 ms | 113 ms | Not tested | No API hang | API only |
| Bookings load | 1 | 227 ms | 227 ms | Not tested | No API hang | API only |
| Customers load | 1 | 229 ms | 229 ms | Not tested | No API hang | API only |
| Notifications load | 1 | 237 ms | 237 ms | Not tested | No API hang | API only |
| Enquiries load | 1 | 231 ms | 231 ms | Not tested | No API hang | API only |
| Contact load | 1 | 230 ms | 230 ms | Not tested | No API hang | API only |
| Service/therapist/booking/settings update | Not measured | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | Browser/UI not instrumented |

Classification: measured admin API loads were GOOD (`<300ms`) except login ACCEPTABLE (`300-1000ms`), likely bcrypt cost.

## E. API Performance

Production local server, unauthenticated public/non-destructive probes:

| Endpoint | Average | Minimum | Maximum | HTTP status |
|---|---:|---:|---:|---:|
| GET `/api/services` | 155 ms | 155 ms | 155 ms | 200 |
| GET `/api/therapists` | 159 ms | 159 ms | 159 ms | 200 |
| GET `/api/settings` | 107 ms | 107 ms | 107 ms | 200 |
| GET `/api/bookings` without auth | 2 ms | 2 ms | 2 ms | 401 |
| GET `/api/unknown` | 1 ms | 1 ms | 1 ms | 404 |
| POST `/api/auth/login` | 383 ms | 383 ms | 383 ms | 200 |
| POST `/api/contact` bad Origin | 1 ms | 1 ms | 1 ms | 403 |

All measured `/api/*` 200 responses had `Cache-Control: no-store`.

## F. Security

Verified:

- TypeScript: `node node_modules/typescript/bin/tsc --noEmit` passed.
- Production build: `npm run build` passed.
- Production dependency audit: `npm audit --omit=dev --audit-level=low` found 0 vulnerabilities.
- Full audit: 4 moderate dev-only vulnerabilities via `drizzle-kit -> @esbuild-kit -> esbuild <=0.24.2`; force fix would install a breaking `drizzle-kit@0.18.1`.
- Production local bad-origin POST returned 403.
- Unauthenticated admin collection routes returned 401.
- API cache policy observed as `no-store`.
- Secret value scan found `NO_SECRET_VALUE_HITS` outside `.env`.

Not verified:

- Full security suites were not run because they require `TEST_ADMIN_PIN` and a disposable DB.
- Browser CSRF/SameSite/CSP behavior through Cloudflare was not re-tested.
- Slow-response, 4xx/5xx UI recovery and duplicate-click browser behavior were not instrumented.

## G. Database

Read-only DB probe results:

| Table | Rows |
|---|---:|
| services | 5 |
| therapists | 11 |
| bookings | 2 |
| customers | 5 |
| enquiries | 0 |
| contact_messages | 0 |
| admin_notifications | 2 |
| admin_users | 1 |
| site_settings | 12 |

Integrity probes:

- Duplicate active therapist slots: 0.
- Duplicate customer phones: 0.
- Constraints observed: primary keys, booking foreign keys to services/therapists, booking amount/status checks, customer total-order check, service price check.

## H. Cloudflare

Source/config evidence:

- `server.ts` binds Express to `127.0.0.1`.
- `start.bat` starts `cloudflared tunnel --url http://127.0.0.1:%PORT%`.
- `OPERATIONS.md` documents Cloudflare quick tunnel behavior and prior evidence.

Runtime Cloudflare tunnel verification during this audit: NOT VERIFIED.

## I. Backup

Verified after fixes:

- `powershell -ExecutionPolicy Bypass -File scripts\backup-db.ps1`
- Result: `BACKUP OK: ...\backups\spa-20260816-235527.dump (21.2 KB)` and `RETENTION OK`.
- `powershell -ExecutionPolicy Bypass -File scripts\restore-test.ps1`
- Result: `RESTORE VERIFICATION PASSED`.

Restore row counts matched source:

| Table | Source | Restored | Result |
|---|---:|---:|---|
| bookings | 2 | 2 | MATCH |
| customers | 5 | 5 | MATCH |
| services | 5 | 5 | MATCH |
| therapists | 11 | 11 | MATCH |
| enquiries | 0 | 0 | MATCH |
| contact_messages | 0 | 0 | MATCH |
| admin_notifications | 2 | 2 | MATCH |
| admin_users | 1 | 1 | MATCH |

Scheduled Task execution during this audit: NOT VERIFIED.

## J. Secret Scan

Secret-value scan compared `.env` sensitive values against project files excluding `.env`, `node_modules`, and `.git`.

Result: `NO_SECRET_VALUE_HITS`.

Keyword scan did find expected secret/config names in source, tests, operations docs, lockfiles, and built server bundle. No actual `.env` secret values were printed or found outside `.env`.

## K. Files Changed

| File | Reason |
|---|---|
| `src/App.tsx` | Return authoritative persisted booking object/error from booking API handler |
| `src/components/BookingView.tsx` | Use server-returned booking for confirmation modal and WhatsApp URL |
| `src/components/AdminView.tsx` | Use server-returned booking ID/details for admin-created booking notification/toast |
| `scripts/backup-db.ps1` | Support `DATABASE_URL`/`POSTGRES_URL`, sanitize libpq-incompatible pooler params, dump only `public` schema |
| `scripts/restore-test.ps1` | Support sanitized URL restore, force-clean temp DB, drop temp public schema before restore, schema-qualify row checks, expose non-secret create errors |
| `FINAL-VIBE-CODING-PRODUCTION-AUDIT.md` | Audit report |

## L. Remaining Risks

BLOCKER:

- None verified.

HIGH:

- Full mutating security/final audit suites were not run against a disposable DB in this audit.
- Cloudflare live tunnel behavior, HTTPS cookie roundtrip, and edge caching were not re-verified.

MEDIUM:

- Browser UI failure-state testing for admin saves/deletes/update buttons is incomplete.
- Duplicate-click/concurrency tests for bookings were not run live in this audit.
- Large Vite bundle may affect low-end mobile load performance.

LOW:

- Dev-only `drizzle-kit` dependency chain contains moderate esbuild advisory; production audit is clean.
- Several TypeScript `any` uses remain in integration boundaries.

INFO:

- Existing Node process observed: `node dist-server/server.cjs` PID 30084. It was not stopped because it may be the user’s running app.

## M. Final Verdict

READY WITH DOCUMENTED LIMITATIONS

Rationale: build/type/audit/backup/restore/public API/admin API timing/DB integrity/secret-value checks are verified, and two real production issues were fixed. Readiness is limited by unverified Cloudflare runtime behavior and unrun mutating security/browser/concurrency suites that require a disposable test database.
