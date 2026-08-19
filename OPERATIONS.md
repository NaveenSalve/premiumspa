# Operations

Operator runbook for the Premium Spa & Home Wellness backend (Cloudflare Tunnel → Express → pg.Pool → PostgreSQL 18).

Never paste real secret values (`ADMIN_PIN`, `JWT_SECRET`, `SQL_PASSWORD`, `DATABASE_URL`) into chat, tickets, logs, or this file.

## 1. Rotate the admin PIN

The backend loads `ADMIN_PIN` from the environment only (`server.ts` reads `process.env.ADMIN_PIN`). It is never hardcoded, logged, returned by an API, or bundled into the frontend. On boot the server hashes `ADMIN_PIN` with bcrypt (cost 12) and updates the `admin_users` row (`server.ts` seed block), so a rotation takes effect simply by restarting.

**Safe procedure:**

1. Stop the backend (or `npm start` / the service hosting `dist-server/server.cjs`).
2. Open `.env` in the project root (this file is gitignored).
3. Replace the existing value of `ADMIN_PIN`:

   ```
   ADMIN_PIN="<MY_NEW_PIN>"
   ```

   Requirements enforced on production startup (`server.ts` strong-PIN check):
   - at least 12 characters, and
   - spans at least three of: lowercase, uppercase, digits, symbols.
   Choose a new value; do not reuse a previously used PIN.
4. Save the file. Ensure the file ends with a newline and the value is quoted.
5. Restart the backend: `npm start` (production bundle `dist-server/server.cjs`). If the server is already running, a restart is required — the PIN is read once at process start.
6. Confirm startup succeeded (e.g. log line `Server running on http://127.0.0.1:PORT`). If the new PIN is too weak, production startup is refused with a generic message — the PIN value is never printed.
7. Verify the new PIN works: log in at `/api/auth/login` with the new PIN. The old PIN stops working immediately after restart (the stored bcrypt hash is replaced on boot).
8. If `admin_users` contains more than one row, all rows are updated by the seed; keep a single admin row in production.

**What does NOT change:** JWT/session mechanism, rate limiting, CSRF/origin enforcement, cookie flags (`httpOnly`, `sameSite=lax`, `secure` in production), and the strong-PIN validation remain intact.

## 2. Database backups

- `scripts/backup-db.ps1` — produces a compressed `pg_dump -Fc` snapshot in `backups\` (gitignored) and prunes to the newest 14 dumps. Reads credentials from `.env`; never echoes them.
- `scripts/restore-test.ps1` — restores the latest dump into a throwaway database, validates 8 tables, and drops the throwaway database.
- Windows Task Scheduler task `SpaDBBackup` — daily 03:00, runs `C:\Users\Lenovo\spa-backup\backup-task.ps1`.

**Manual backup:**

```
powershell -NoProfile -File scripts\backup-db.ps1
```

Expected output: `BACKUP OK: ...\backups\spa-<timestamp>.dump (<size>)` and `RETENTION OK`.

**Restore verification:**

```
powershell -NoProfile -File scripts\restore-test.ps1
```

Expected output: `RESTORE VERIFICATION PASSED` and a per-table `MATCH` line for all 8 tables.

**Scheduled backup (Windows Task Scheduler):**

- **Task name:** `SpaDBBackup`
- **Execution account:** `Lenovo` (interactive logon; task runs only while this user is logged on)
- **Schedule:** Daily at 03:00 (`StartWhenAvailable` will catch a missed run on the next opportunity)
- **Command** (Task Scheduler action):

  ```
  cmd.exe /d /c C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "C:\Users\Lenovo\spa-backup\backup-task.ps1" >> "C:\Users\Lenovo\spa-backup\spa-backup-task.log" 2>&1
  ```

  - **Start in:** project directory (`C:\Users\Lenovo\Downloads\premium-spa-&-home-wellness`)
  - The task runs PowerShell **via `cmd.exe`** deliberately: Windows PowerShell 5.1 hangs during engine startup when launched directly by the Task Scheduler service in this environment (the script never starts; task shows `Running`, Last Result `0x41301`). The `cmd` wrapper gives PowerShell a working console, and output is redirected to `C:\Users\Lenovo\spa-backup\spa-backup-task.log` (task history/evidence — truncate this file manually if it grows).
  - **Battery settings:** `DisallowStartIfOnBatteries=false` and `StopIfGoingOnBatteries=false` are set. Without this, Task Scheduler **silently skips** the run when the laptop is on battery (Last Result stays `0x41303`, "task has not yet run") — verified on this machine (laptop, battery discharging). If a 03:00 run is missing with `0x41303` and the machine is on battery, this is why. Auto-execution itself was proven with a one-time trigger task (`SpaAutoTest2`): it fired at its boundary with no `schtasks /Run`, Last Result 0, and created `backups\spa-20260815-191424.dump`.
  - No credentials appear in the task command line. Credentials are read by `backup-db.ps1` from the project `.env` (via `$env:PGPASSWORD` in-process, then removed). Never put `ADMIN_PIN`, `JWT_SECRET`, `SQL_PASSWORD`, or `DATABASE_URL` values into the task action.

**Manual trigger:**

```
schtasks /Run /TN SpaDBBackup
```

**Verify a new dump was created:** note the newest dump before triggering, then after the run confirm the newest changed and is non-empty:

```
Get-ChildItem backups -Filter 'spa-*.dump' | Sort-Object Name -Descending | Select-Object -First 3 Name,Length
```

A successful run also appends `BACKUP OK: ...` and `RETENTION OK` to `C:\Users\Lenovo\spa-backup\spa-backup-task.log`.

**Inspect task status:**

```
schtasks /Query /TN SpaDBBackup /V /FO LIST
```

Healthy: `Status: Ready`, `Last Result: 0`, `Next Run Time` = coming 03:00. A task stuck at `Status: Running` with `Last Result: 267009 (0x41301)` is hung — stop it with `schtasks /End /TN SpaDBBackup` and investigate (see troubleshooting).

**Troubleshooting failures:**
1. Read `C:\Users\Lenovo\spa-backup\spa-backup-task.log` — backup and retention status, plus any PowerShell errors, are written here.
2. Confirm the task principal/`Logon Mode` is `Interactive only` (`Run As User: Lenovo`). The task requires that user to be logged on. To run with **no user logged on**, an elevated session is required to re-register the task under a service/S4U principal (e.g. `schtasks /Create /RU SYSTEM ...` or an S4U logon type) — not done here to avoid storing credentials and because this is a single-user workstation.
3. Confirm `.env` is readable by the execution account and contains valid `SQL_*` values.
4. Confirm PostgreSQL 18 is running (`netstat -ano | findstr :5432`) and `C:\Program Files\PostgreSQL\18\bin\pg_dump.exe` exists.
5. Test the exact command from an interactive console; it should print `BACKUP OK` / `RETENTION OK`.

## 3. Restore from backup (disaster recovery)

1. Stop the backend.
2. Restore the newest dump into the live `spa` database (adjust `-d` target and file as needed):

   ```
   & "C:\Program Files\PostgreSQL\18\bin\pg_restore.exe" -h 127.0.0.1 -U postgres -d spa --clean --if-exists --no-owner --no-privileges backups\spa-<timestamp>.dump
   ```

3. Restart the backend; the admin row is re-seeded from `ADMIN_PIN` automatically.

## 4. Security invariants (verified by test suites)

- PostgreSQL 18: listener bound to `127.0.0.1`, pg_hba loopback = `scram-sha-256`.
- Express: binds `127.0.0.1`.
- API responses carry `Cache-Control: no-store`; unknown `/api/*` returns JSON 404.
- Rate limiting, CSRF/origin checks, security headers, and the weak-PIN refusal are covered by `npm run test:security`.

## 5. Google Analytics and Search Console

These are prepared but disabled until Google provides the IDs.

1. Create a GA4 web stream and copy the measurement ID, e.g. `G-XXXXXXXXXX`.
2. Add it to `.env`:

   ```
   VITE_GA_MEASUREMENT_ID="G-XXXXXXXXXX"
   ```

3. In Google Search Console, add the deployed Firebase URL:

   ```
   https://elated-rainfall-l9v0l.web.app/
   ```

4. Choose the HTML meta-tag verification method and copy only the token from the `content="..."` value.
5. Add it to `.env`:

   ```
   VITE_GOOGLE_SITE_VERIFICATION="google-verification-token"
   ```

6. Rebuild and redeploy:

   ```
   npm run build
   ```

Then verify Search Console and submit:

```
https://elated-rainfall-l9v0l.web.app/sitemap.xml
```

## 6. Booking date/time rules

- **Business timezone is `Asia/Kolkata`** (`BUSINESS_TIME_ZONE` in `server.ts`), independent of the server's or the browser's clock. The backend derives "today" and "current minutes" from Kolkata local time (`businessNow()`), never from `new Date().toISOString()`.
- Backend `POST /api/bookings` (non-admin) rejects:
  - a date before Kolkata-today → `400 Booking date must be today or in the future.`
  - today with a start time earlier than the current Kolkata time → `400 Selected booking time is no longer available.` (a slot exactly at the current minute is still accepted)
- Frontend (`src/components/BookingView.tsx`) computes the 7-day list from the Kolkata date key, refreshes the cutoff every 30 s, disables past same-day slot buttons, and auto-resets a selected past slot to the first valid slot.
- No closing-time / operating-hours rule exists (service `duration` is pricing-only via `durationMultiplier`); if an operating-hours policy is added later, it belongs next to the same-day checks in the booking POST.
