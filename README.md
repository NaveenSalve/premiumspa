<div align="center">

# Premium Spa & Home Wellness

A production-ready spa & home wellness booking platform with an admin panel, WhatsApp integration, and Supabase backend.

</div>

## Features

- **Home Page** — Hero, Choose Your Experience (Home / Hotel / Book Therapist), Services, Therapists, Reviews
- **Booking Flow** — Service selection → date/time → customer details → WhatsApp confirmation
- **Admin Panel** — Manage bookings, therapists, services, messages, notifications, and site content
- **Site Settings** — Brand logo, hero images, experience images, contact numbers (WhatsApp / Call / Email), Google Review link — all editable from the admin panel
- **Security** — PIN-based admin auth, rate limiting, origin gate, security headers (CSP, HSTS), PII masking, pagination on all admin lists
- **Responsive** — Mobile-first design with bottom nav

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide icons
- **Backend:** Express 5, Drizzle ORM, PostgreSQL
- **Database:** Supabase (PostgreSQL)
- **Deploy:** Railway / Render / any Node.js host

## Run Locally

**Prerequisites:** Node.js 18+

```bash
npm install
```

Set up your `.env` file (copy from `.env.example`):

```env
DATABASE_URL=postgresql://user:pass@host:5432/db
ADMIN_PIN=your-strong-admin-pin-12chars
JWT_SECRET=your-random-secret
NODE_ENV=development
```

Run the dev server:

```bash
npm run dev
```

Open http://localhost:5173 (Vite) — the API runs on the same dev server.

## Production Build

```bash
npm run build     # builds dist/ (frontend) + dist-server/server.cjs (server)
npm start         # runs the production server on PORT (default 3000)
```

## Deploy on Railway

1. Push this repo to GitHub
2. In Railway: **New Project → Deploy from GitHub repo**
3. Set environment variables (see `.env.example`):
   - `NODE_ENV=production`
   - `DATABASE_URL` — your Supabase/Postgres connection string
   - `ADMIN_PIN` — strong PIN (12+ chars, 3+ character classes)
   - `JWT_SECRET` — random string
   - `TRUST_PROXY=true`
   - `APP_ORIGIN` — your Railway domain (after first deploy)
4. Deploy — Railway runs `npm install && npm run build && npm start`

The database schema is created automatically on first boot (Drizzle migrations run at startup).

## Admin Panel

- Visit `/#admin` or the Admin link in the app
- Login with your `ADMIN_PIN`
- From **Settings** you can change: brand name, logo, hero images, experience images, WhatsApp / call / email, Instagram, Google Review link
- From **Security** you can change the admin PIN (strong PIN enforced)

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build (frontend + server bundle) |
| `npm start` | Run production server |
| `npm run lint` | TypeScript typecheck |
| `npm run test:security` | Security regression suite |

## License

All rights reserved — © Premium Spa.
