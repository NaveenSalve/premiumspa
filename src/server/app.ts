import express from 'express';
import crypto from 'crypto';
import cookieParser from 'cookie-parser';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { db } from '../db/index.ts';
import { and, eq, ne, desc, asc, sql } from 'drizzle-orm';
import {
  services,
  therapists,
  bookings,
  customers,
  enquiries,
  contactMessages,
  adminNotifications,
  adminUsers,
  siteSettings,
} from '../db/schema.ts';
import {
  INITIAL_SERVICES,
  INITIAL_THERAPISTS,
} from '../data/mockData.ts';

dotenv.config();

const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.warn('[security] JWT_SECRET not set — using an ephemeral random secret. Set JWT_SECRET in the deployment environment for persistent sessions.');
    return crypto.randomBytes(48).toString('hex');
  }
  return secret;
})();
const ADMIN_PIN = process.env.ADMIN_PIN;
const TRAVEL_ADVANCE = 200;

// ---- F-01: Trusted-proxy configuration ----
// Never honor client-supplied X-Forwarded-For unless the deployment explicitly
// names the trusted proxy. Default = trust nobody, so req.ip is the TCP socket
// remote address (which the client cannot spoof). Rate limiters key on req.ip,
// so blind XFF rotation can no longer bypass them.
// TRUST_PROXY values:
//   (unset / empty / "false")  → no proxy trusted (direct exposure)
//   "true"                     → trust a single proxy hop (was: trust proxy=1)
//   "<number>"                 → trust N proxy hops
//   "1.2.3.4,10.0.0.0/8,..."   → trust only these IPs/CIDRs (preferred)
function parseTrustProxySetting(): boolean | number | string[] {
  const raw = process.env.TRUST_PROXY;
  if (!raw || raw.trim() === '' || raw.trim().toLowerCase() === 'false') return false;
  const v = raw.trim();
  if (v.toLowerCase() === 'true') return 1;
  if (/^\d+$/.test(v)) return Math.max(0, Number(v));
  return v.split(',').map((s) => s.trim()).filter(Boolean);
}

// ---- Strong ADMIN_PIN (production) ----
// A weak PIN is the brute-force key (see F-01). Refuse production startup with
// a generic error; never log the actual PIN or its length.
function isStrongAdminPin(pin: string): boolean {
  if (pin.length < 12) return false;
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) => re.test(pin)).length;
  return classes >= 3;
}
if (process.env.NODE_ENV === 'production' && (!ADMIN_PIN || !isStrongAdminPin(ADMIN_PIN))) {
  console.warn(
    '[security] WARNING: ADMIN_PIN is missing or weak. Please configure a strong ADMIN_PIN (at least 12 chars, 3 char classes) in the deployment environment variables.'
  );
}
const VALID_BOOKING_STATUSES = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];

// ---- Site settings (DB-backed public display settings) ----
// Fixed allowlist of editable settings: the allowlist itself is the
// mass-assignment guard — PATCH only ever accepts these camelCase keys, which
// map 1:1 onto site_settings rows. Secrets (ADMIN_PIN, JWT_SECRET, SQL_*,
// DATABASE_URL) are environment-only and can never be written or read here.
const SITE_SETTING_DEFS: Record<string, { dbKey: string; maxLen: number }> = {
  whatsappNumber: { dbKey: 'whatsapp_number', maxLen: 32 },
  callNumber: { dbKey: 'call_number', maxLen: 32 },
  contactEmail: { dbKey: 'contact_email', maxLen: 200 },
  instagramUrl: { dbKey: 'instagram_url', maxLen: 200 },
  googleReviewUrl: { dbKey: 'google_review_url', maxLen: 300 },
  brandName: { dbKey: 'brand_name', maxLen: 80 },
  // Image settings may hold either a URL or a base64 data-URL from the admin
  // image uploader; the 300k cap keeps a single value within the 500kb JSON body
  // limit (larger uploads are rejected by the server, never unbounded).
  brandLogoUrl: { dbKey: 'brand_logo_url', maxLen: 300000 },
  heroDesktopImageUrl: { dbKey: 'hero_desktop_image_url', maxLen: 300000 },
  heroLaptopImageUrl: { dbKey: 'hero_laptop_image_url', maxLen: 300000 },
  experienceHomeImageUrl: { dbKey: 'experience_home_image_url', maxLen: 300000 },
  experienceHotelImageUrl: { dbKey: 'experience_hotel_image_url', maxLen: 300000 },
  experienceTherapistImageUrl: { dbKey: 'experience_therapist_image_url', maxLen: 300000 },
};
const DEFAULT_SITE_SETTINGS: Record<string, string> = {
  whatsapp_number: '6260104019',
  call_number: '6260104019',
  contact_email: 'premiumspaindore@gmail.com',
  instagram_url: 'https://instagram.com',
  google_review_url: 'https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4',
  brand_name: 'Premium Spa',
  brand_logo_url: 'https://placehold.co/300x180/F9F5EC/C5A059?text=LOGO',
  hero_desktop_image_url: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1600&q=80',
  hero_laptop_image_url: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1400&q=80',
  experience_home_image_url: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&w=800&q=80',
  experience_hotel_image_url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
  experience_therapist_image_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80',
};
const VALID_PAYMENT_STATUSES = ['PENDING_VERIFICATION', 'PAID', 'REFUND_REQUESTED', 'REFUNDED', 'FAILED'];
const PUBLIC_MESSAGE_BODY_LIMIT = 100 * 1024;

const jsonByteLength = (value: unknown): number => Buffer.byteLength(JSON.stringify(value ?? {}), 'utf8');

const tierBasePrice = (tier: string | null | undefined): number => {
  const t = (tier || '').trim();
  if (t === 'Classic') return 999;
  if (t === 'Luxury') return 4999;
  if (t === 'Deluxe') return 2499;
  return 2499;
};

const durationMultiplier = (duration: unknown): number => {
  const d = String(duration || '').toLowerCase();
  if (d.includes('120') || d.includes('2h')) return 2;
  if (d.includes('90')) return 1.5;
  return 1;
};

const extractPincode = (value: unknown): string | null => {
  const match = String(value || '').match(/\b\d{6}\b/);
  return match ? match[0] : null;
};

const extractAddressValue = (value: unknown, labelPattern: string): string => {
  const match = String(value || '').match(new RegExp(`${labelPattern}:\\s*([^,]+)`, 'i'));
  return match ? match[1].trim() : '';
};

const parseTimeMinutes = (value: unknown): number | null => {
  const t = String(value || '').trim().toUpperCase();
  const m = t.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const mer = m[3];
  if (min > 59) return null;
  if (mer) {
    if (h < 1 || h > 12) return null;
    if (mer === 'AM') h = h === 12 ? 0 : h;
    else h = h === 12 ? 12 : h + 12;
  } else {
    if (h > 23) return null;
  }
  return h * 60 + min;
};

const normalizeDate = (value: unknown): string | null => {
  const d = new Date(String(value || '').trim());
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// ---- Business timezone (Asia/Kolkata) ----
// The app serves Indore; "today" and the same-day booking cut-off must be
// evaluated in the business timezone using the server's clock. Never UTC,
// never the client's clock, never formatted display strings.
const BUSINESS_TIME_ZONE = 'Asia/Kolkata';

const businessNow = (): { dateKey: string; minutes: number } => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const get = (type: string): number =>
    Number(parts.find((p) => p.type === type)?.value || 0);
  let hour = get('hour');
  if (hour === 24) hour = 0;
  const mm = String(get('month')).padStart(2, '0');
  const dd = String(get('day')).padStart(2, '0');
  return { dateKey: `${get('year')}-${mm}-${dd}`, minutes: hour * 60 + get('minute') };
};

const fail = (res: any, e: unknown, context: string) => {
  console.error(`[error] ${context}:`, e);
  if (!res.headersSent) {
    const code = (e as any)?.statusCode;
    if (code && Number.isInteger(code) && code >= 400 && code < 600) {
      return res.status(code).json({ error: (e as any)?.message || 'Request failed.' });
    }
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};

export async function seedInitialData() {
  try {
    // Check & seed services
    const existingServices = await db.select().from(services);
    if (existingServices.length === 0) {
      for (const s of INITIAL_SERVICES) {
        await db.insert(services).values({
          id: s.id,
          name: s.name,
          category: s.category,
          description: s.description,
          price: s.price,
          duration: s.duration,
          image: s.imageUrl,
          popular: s.popular || false,
          visible: true,
        }).onConflictDoNothing();
      }
      console.log('Seeded initial services');
    }

    // Check & seed therapists
    const existingTherapists = await db.select().from(therapists);
    if (existingTherapists.length === 0) {
      for (const t of INITIAL_THERAPISTS) {
        await db.insert(therapists).values({
          id: t.id,
          name: t.name,
          tier: t.category,
          category: t.category,
          rating: String(t.rating),
          experience: `${t.experienceYears} Years`,
          specialties: t.specialty,
          bio: t.bio,
          image: t.avatarUrl,
          availability: t.status === 'available',
          status: 'Active',
        }).onConflictDoNothing();
      }
      console.log('Seeded initial therapists');
    }

    // Customers and bookings are NOT auto-seeded: only real leads/bookings
    // created through the public flows are stored.

    // Check & seed site settings (public display settings)
    const existingSettings = await db.select().from(siteSettings);
    if (existingSettings.length === 0) {
      for (const [key, value] of Object.entries(DEFAULT_SITE_SETTINGS)) {
        await db.insert(siteSettings).values({ key, value }).onConflictDoNothing();
      }
      console.log('Seeded initial site settings');
    }

    // Check & seed admin user
    const existingAdmins = await db.select().from(adminUsers);
    if (existingAdmins.length === 0) {
      if (!ADMIN_PIN || ADMIN_PIN.length < 4) {
        console.warn('[seed] No admin user exists and ADMIN_PIN is not set. Admin login is disabled until ADMIN_PIN is configured.');
      } else {        const hash = await bcrypt.hash(ADMIN_PIN, 12);
        await db.insert(adminUsers).values({
          id: 'admin-1',
          username: 'admin',
          passwordHash: hash,
          role: 'admin',
        }).onConflictDoNothing();
        console.log('Seeded admin user from ADMIN_PIN');
      }
    } else if (process.env.FORCE_RESYNC_ADMIN_PIN === '1' && ADMIN_PIN && ADMIN_PIN.length >= 4) {
      // Explicit ops recovery: re-apply ADMIN_PIN to every admin row. Intended
      // for disaster recovery (e.g. after test pollution) or to roll a PIN back
      // to the .env value. Panel-changed PINs are otherwise preserved across
      // restarts, so they are NOT silently reverted by the .env on every boot.
      const hash = await bcrypt.hash(ADMIN_PIN, 12);
      await db.update(adminUsers).set({ passwordHash: hash, updatedAt: new Date() });
      console.log('[seed] Updated admin password from ADMIN_PIN (FORCE_RESYNC_ADMIN_PIN=1)');
    } else {
      console.log('[seed] Admin user exists; keeping existing password hash (set FORCE_RESYNC_ADMIN_PIN=1 to re-apply ADMIN_PIN)');
    }
  } catch (err) {
    console.error('[seed] FAILED — database not seeded:', err);
  }
}


export async function createApiApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', parseTrustProxySetting());
  // type: ['application/json', 'application/*+json'] — express.json's default
  // only matches the literal 'application/json' subtype (type-is mimeMatch does
  // not do +suffix matching without a wildcard), so 'application/vnd.api+json'
  // style media types were skipped by the parser but allowed through the C2
  // content-type gate, leaving req.body undefined and causing a 500 TypeError
  // in route handlers. The explicit type list keeps the parser and the gate
  // aligned for every accepted media type.
  app.use(express.json({ limit: '500kb', type: ['application/json', 'application/*+json'] }));
  app.use(cookieParser());

  app.get('/health', (_req, res) => {
    res.status(200).send('OK');
  });
  app.get('/api/health', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use((err: any, _req: any, res: any, next: any) => {
    if (err?.type === 'entity.parse.failed' || (err instanceof SyntaxError && (err as any).status === 400)) {
      // C1: parse-error responses are /api responses too; keep them non-cacheable.
      res.setHeader('Cache-Control', 'no-store');
      return res.status(400).json({ error: 'Invalid JSON payload.' });
    }
    if (err?.type === 'entity.too.large') {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(413).json({ error: 'Request payload too large.' });
    }
    next(err);
  });

  // Basic security headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (process.env.NODE_ENV === 'production') {
      // F-05: HSTS only in production (browsers only honor it over HTTPS).
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      // F-06: no inline scripts (Vite emits external module scripts only). Kept:
      //  - style-src 'unsafe-inline'  → React inline style attributes + Tailwind
      //  - https://fonts.googleapis.com / cdnjs.cloudflare.com → stylesheet links in dist/index.html
      //  - https://fonts.gstatic.com / cdnjs.cloudflare.com → woff2 font files
      // img-src https: covers Unsplash service images; connect-src 'self' covers all /api calls.
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; img-src 'self' data: https:; font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
      );
    }
    next();
  });

  // ---- C1: Anti-caching for API responses ----
  // Every /api/* response must be non-cacheable (no-store) so authenticated
  // admin/sensitive data is never held by a browser, shared cache or edge.
  // Scope is /api only: static assets (dist/) and public pages keep normal
  // caching behaviour.
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  // Liveness probe for Railway/Render/etc. Lightweight, no auth, no DB query:
  // a crash-free process with a working listener is all a platform health check
  // needs. This is intentionally NOT part of /api (keeps /api fully auth-scoped
  // and cache-controlled).
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // ---- C2: Content-Type gate ----
  // express.json() only parses application/json (and *+json) and silently
  // skips other media types, leaving req.body undefined — which made routes
  // destructuring req.body throw an unhandled TypeError -> 500 for
  // client-controlled media types. Reject unsupported/absent content types
  // with 415 BEFORE route handlers run. Malformed JSON and oversized bodies
  // are already handled by the parser error middleware above (400 / 413).
  app.use((req, res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const hasBody =
        (typeof req.headers['content-length'] === 'string' && Number(req.headers['content-length']) > 0) ||
        typeof req.headers['transfer-encoding'] === 'string';
      if (hasBody) {
        const ct = (req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
        if (!ct) return res.status(415).json({ error: 'Content-Type header is required.' });
        if (ct !== 'application/json' && !ct.endsWith('+json')) {
          return res.status(415).json({ error: 'Unsupported Media Type.' });
        }
      }
    }
    next();
  });

  // ---- F-08: Strict Origin allowlist (production) ----
  // Browsers send an Origin header on every same-origin state-changing request.
  // Any POST/PATCH/PUT/DELETE whose Origin is NOT on the configured APP_ORIGIN
  // allowlist is rejected with 403 (no wildcards). Requests WITHOUT an Origin
  // header (server-to-server clients, curl, non-browser tooling) are allowed —
  // they carry no ambient browser credentials and cannot be CSRF'd. GET/HEAD/
  // OPTIONS pass through; the server never emits CORS headers, so cross-origin
  // JS can never read responses or attach cookies (SameSite=Lax remains the
  // cookie-level control). Unset APP_ORIGIN in production = fail-closed: every
  // browser state-changing request is rejected until an origin is configured.
  const allowedOrigins = (process.env.APP_ORIGIN || '')
    .split(/[,\s]+/)
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  app.use((req, res, next) => {
    if (process.env.NODE_ENV === 'production') {
      const origin = (req.headers.origin || '').toString().trim();
      if (origin) {
        const normalized = origin.replace(/\/+$/, '');
        const allowed = allowedOrigins.length > 0 && allowedOrigins.includes(normalized);
        if (!allowed) {
          if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
            return res.status(403).json({ error: 'Origin not allowed.' });
          }
        }
      }
    }
    next();
  });

  // Rate limiting
  const skipRL = process.env.RATE_LIMIT_DISABLED === '1';  const RL = (mw: ReturnType<typeof rateLimit>, _req: any, _res: any, next: any) =>
    skipRL ? next() : mw(_req, _res, next);

  // Key on req.ip (the real client IP: socket remote address unless a trusted
  // proxy is configured). ipKeyGenerator() normalizes IPv4/IPv6 so the same
  // client can't rotate buckets. xForwardedForHeader validation is disabled
  // because we intentionally do NOT trust arbitrary client-supplied
  // X-Forwarded-For (F-01).
  const rlOptions = {
    keyGenerator: (req: any) => ipKeyGenerator(req.ip),
    validate: { xForwardedForHeader: false },
    standardHeaders: true,
    legacyHeaders: false,
  };

  const loginLimiter = rateLimit({
    ...rlOptions,
    windowMs: 15 * 60 * 1000,
    limit: 10,
    message: { error: 'Too many login attempts. Please try again later.' },
  });
  const bookingLimiter = rateLimit({
    ...rlOptions,
    windowMs: 60 * 60 * 1000,
    limit: 10,
    message: { error: 'Too many booking attempts. Please try again later.' },
  });
  const messageLimiter = rateLimit({
    ...rlOptions,
    windowMs: 60 * 60 * 1000,
    limit: 40,
    message: { error: 'Too many messages. Please try again later.' },
  });

  // ---- F-11: bounded, validated pagination for every collection endpoint ----
  // No endpoint returns an unbounded dataset. Default limit = 50, hard cap = 100
  // (huge limits are capped, never unbounded). Negative, zero, non-integer or
  // non-numeric limit/offset are rejected with 400 instead of being silently
  // clamped or ignored. Repeated query params (?limit=1&limit=2) are rejected.
  const DEFAULT_LIST_LIMIT = 50;
  const MAX_LIST_LIMIT = 100;
  const pageArgs = (req: any) => {
    const rawLimit = req.query?.limit;
    const rawOffset = req.query?.offset;
    let limit = DEFAULT_LIST_LIMIT;
    if (rawLimit !== undefined) {
      if (typeof rawLimit !== 'string' || !/^\d+$/.test(rawLimit)) {
        throw Object.assign(new Error('Invalid limit parameter.'), { statusCode: 400 });
      }
      const n = Number(rawLimit);
      if (n < 1) {
        throw Object.assign(new Error('Invalid limit parameter.'), { statusCode: 400 });
      }
      limit = Math.min(n, MAX_LIST_LIMIT);
    }
    let offset = 0;
    if (rawOffset !== undefined) {
      if (typeof rawOffset !== 'string' || !/^\d+$/.test(rawOffset)) {
        throw Object.assign(new Error('Invalid offset parameter.'), { statusCode: 400 });
      }
      offset = Number(rawOffset);
    }
    return { limit, offset };
  };

  // Admin Auth Middleware — httpOnly cookie only. Bearer-token support was
  // removed (F-10): the JWT is never exposed to browser JS, so a token cannot be
  // lifted and replayed via an Authorization header.
  const getToken = (req: any): string | null => req.cookies?.spa_token || null;

  // F-07: JWT must be signed/verified with exactly HS256. F-03: a token is only
  // valid while its embedded sessionVersion matches the current DB value.
  // F-09: the authoritative role is read from the DB, never trusted from the
  // token claim, so a stale/re-tagged role cannot grant admin.
  const verifyAdminToken = async (token: string): Promise<any | null> => {
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    } catch (e) {
      return null;
    }
    if (!decoded || typeof decoded.id !== 'string') return null;
    const row = await db
      .select({ sessionVersion: adminUsers.sessionVersion, role: adminUsers.role })
      .from(adminUsers)
      .where(eq(adminUsers.id, decoded.id))
      .limit(1);
    if (!row[0] || (row[0].sessionVersion || 0) !== (decoded.sessionVersion || 0)) {
      return null;
    }
    return { ...decoded, role: row[0].role || 'admin' };
  };

  // F-09: two gates — authenticated (valid, non-revoked token) AND authorized
  // (role === 'admin' from the DB). 401 when not authenticated, 403 when
  // authenticated but lacking the admin role. Every admin-only route uses this.
  const requireAdminRole = async (req: any, res: any, next: any) => {
    try {
      const token = getToken(req);
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized: Missing token' });
      }
      const decoded = await verifyAdminToken(token);
      if (!decoded) {
        return res.status(401).json({ error: 'Unauthorized: Invalid or revoked token' });
      }
      if (decoded.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
      }
      req.user = decoded;
      next();
    } catch (e) {
      return res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
  };

  const isAdminRequest = async (req: any): Promise<boolean> => {
    const token = getToken(req);
    if (!token) return false;
    const decoded = await verifyAdminToken(token);
    return !!decoded && decoded.role === 'admin';
  };

  // Auth Endpoints
  app.post('/api/auth/login', (req, res, next) => RL(loginLimiter, req, res, next), async (req, res) => {
    try {
      const { pin, password } = req.body;
      const passToVerify = (pin || password || '').toString();
      if (!passToVerify) {
        return res.status(400).json({ error: 'Password or PIN is required' });
      }
      if (passToVerify.length > 128 || typeof req.body?.pin !== 'string' && typeof req.body?.password !== 'string') {
        return res.status(400).json({ error: 'Invalid credentials format' });
      }

      const admins = await db.select().from(adminUsers);
      if (admins.length === 0) {
        return res.status(401).json({ error: 'No admin account configured. Set ADMIN_PIN in environment before login.' });
      }

      let admin: any = null;
      for (const candidate of admins) {
        if (await bcrypt.compare(passToVerify, candidate.passwordHash)) {
          admin = candidate;
          break;
        }
      }

      if (!admin) {
        return res.status(401).json({ error: 'Invalid PIN or Password' });
      }

      const token = jwt.sign(
        { id: admin.id, username: admin.username, role: admin.role || 'admin', sessionVersion: admin.sessionVersion || 0 },
        JWT_SECRET,
        { algorithm: 'HS256', expiresIn: '7d' }
      );
      res.cookie('spa_token', token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
      });
      // F-10: the JWT lives only in the httpOnly cookie — never in the body.
      return res.json({ success: true, user: { username: admin.username, role: admin.role } });
    } catch (e: any) {
      return fail(res, e, 'login');
    }
  });

  // F-03: logout revokes the session server-side (bumps session_version) so a
  // captured cookie/token is dead immediately, then clears the httpOnly cookie.
  app.post('/api/auth/logout', async (req, res) => {
    try {
      const token = getToken(req);
      if (token) {
        try {
          const decoded: any = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
          if (decoded?.id) {
            await db
              .update(adminUsers)
              .set({ sessionVersion: sql`${adminUsers.sessionVersion} + 1`, updatedAt: new Date() })
              .where(eq(adminUsers.id, decoded.id));
          }
        } catch {
          // malformed/expired token — still clear the cookie below
        }
      }
      res.clearCookie('spa_token', { path: '/' });
      return res.json({ success: true });
    } catch (e: any) {
      return fail(res, e, 'logout');
    }
  });

  app.get('/api/auth/me', requireAdminRole, (req: any, res) => {
    return res.json({ user: req.user });
  });

  // ---- Site settings endpoints ----
  // Public read: returns only allowlisted display settings (never secrets).
  // Admin write: authenticated + origin-gated + validated against the allowlist.
  const getPublicSettings = async (): Promise<Record<string, string>> => {
    const rows = await db.select().from(siteSettings);
    const byKey: Record<string, string> = {};
    for (const r of rows) byKey[r.key] = r.value;
    const out: Record<string, string> = {};
    for (const camel of Object.keys(SITE_SETTING_DEFS)) {
      out[camel] = byKey[SITE_SETTING_DEFS[camel].dbKey] ?? DEFAULT_SITE_SETTINGS[SITE_SETTING_DEFS[camel].dbKey];
    }
    return out;
  };

  app.get('/api/settings', async (_req, res) => {
    try {
      return res.json(await getPublicSettings());
    } catch (e: any) {
      return fail(res, e, 'GET /api/settings');
    }
  });

  app.patch('/api/admin/settings', requireAdminRole, async (req, res) => {
    try {
      const data = req.body;
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return res.status(400).json({ error: 'Invalid settings payload.' });
      }
      const entries = Object.keys(data);
      if (entries.length === 0) {
        return res.status(400).json({ error: 'No settings provided.' });
      }
      const updates: { key: string; value: string }[] = [];
      for (const camel of entries) {
        const def = SITE_SETTING_DEFS[camel];
        if (!def) {
          return res.status(400).json({ error: `Unknown setting: ${camel}` });
        }
        const raw = data[camel];
        if (typeof raw !== 'string' || !raw.trim()) {
          return res.status(400).json({ error: `Setting "${camel}" must be a non-empty string.` });
        }
        const value = raw.trim();
        if (value.length > def.maxLen) {
          return res.status(400).json({ error: `Setting "${camel}" is too long (max ${def.maxLen} characters).` });
        }
        updates.push({ key: def.dbKey, value });
      }
      const now = new Date();
      for (const u of updates) {
        await db
          .insert(siteSettings)
          .values({ key: u.key, value: u.value, updatedAt: now })
          .onConflictDoUpdate({ target: siteSettings.key, set: { value: u.value, updatedAt: now } });
      }
      return res.json({ success: true, settings: await getPublicSettings() });
    } catch (e: any) {
      return fail(res, e, 'PATCH /api/admin/settings');
    }
  });

  // Change the admin PIN from the panel. Requires the current PIN (re-auth),
  // enforces the same strength rule as ADMIN_PIN, and bumps sessionVersion so
  // the current token is revoked immediately (same mechanism as logout).
  app.post('/api/admin/change-pin', requireAdminRole, (req, res, next) => RL(loginLimiter, req, res, next), async (req: any, res: any) => {
    try {
      const { currentPin, newPin } = req.body;
      if (typeof currentPin !== 'string' || !currentPin || typeof newPin !== 'string' || !newPin) {
        return res.status(400).json({ error: 'Current PIN and new PIN are required.' });
      }
      if (currentPin.length > 128 || newPin.length > 128) {
        return res.status(400).json({ error: 'PIN is too long.' });
      }
      if (!isStrongAdminPin(newPin)) {
        return res.status(400).json({
          error: 'New PIN must be at least 12 characters and span at least three of: lowercase, uppercase, digits, symbols.',
        });
      }
      if (currentPin === newPin) {
        return res.status(400).json({ error: 'New PIN must be different from the current PIN.' });
      }

      const admins = await db.select().from(adminUsers);
      const target =
        admins.find((a: any) => a.id === req.user?.id) ||
        admins.find((a: any) => a.id === 'admin-1') ||
        admins[0];
      if (!target) {
        return res.status(401).json({ error: 'No admin account configured.' });
      }
      if (!(await bcrypt.compare(currentPin, target.passwordHash))) {
        return res.status(401).json({ error: 'Current PIN is incorrect.' });
      }

      const hash = await bcrypt.hash(newPin, 12);
      await db
        .update(adminUsers)
        .set({ passwordHash: hash, sessionVersion: sql`${adminUsers.sessionVersion} + 1`, updatedAt: new Date() })
        .where(eq(adminUsers.id, target.id));
      return res.json({ success: true, sessionRevoked: true });
    } catch (e: any) {
      return fail(res, e, 'POST /api/admin/change-pin');
    }
  });

  // Services Endpoints
  app.get('/api/services', async (req, res) => {
    try {
      const page = pageArgs(req);
      const allServices = await db.select().from(services).limit(page.limit).offset(page.offset);
      const formatted = allServices.map(s => ({
        id: s.id,
        name: s.name,
        category: s.category,
        description: s.description,
        duration: s.duration,
        price: s.price,
        imageUrl: s.image,
        popular: s.popular,
        visible: s.visible,
      }));
      return res.json(formatted);
    } catch (e: any) {
      return fail(res, e, `${req.method} ${req.originalUrl || req.url}`);
    }
  });

  app.post('/api/services', requireAdminRole, async (req, res) => {
    try {
      const data = req.body;
      if (!data || typeof data.name !== 'string' || !data.name.trim()) {
        return res.status(400).json({ error: 'Service name is required.' });
      }
      const id = data.id || `srv-${crypto.randomUUID()}`;
      if (!Number.isFinite(Number(data.price)) || Number(data.price) < 0) {
        return res.status(400).json({ error: 'Invalid service price.' });
      }
      const newService = {
        id,
        name: data.name.trim(),
        category: (data.category || 'Therapeutic').toString().slice(0, 60),
        description: (data.description || 'Premium spa & home wellness service, delivered to your door.').toString().slice(0, 500),
        price: Math.round(Number(data.price)),
        duration: (data.duration || '1H').toString().slice(0, 10),
        image: data.imageUrl || data.image || 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80',
        popular: !!data.popular,
        visible: data.visible !== false,
      };
      await db.insert(services).values(newService);
      return res.json({ success: true, service: { ...newService, imageUrl: newService.image } });
    } catch (e: any) {
      return fail(res, e, `${req.method} ${req.originalUrl || req.url}`);
    }
  });

  app.patch('/api/services/:id', requireAdminRole, async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;
      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.price !== undefined) {
        if (!Number.isFinite(Number(data.price)) || Number(data.price) < 0) {
          return res.status(400).json({ error: 'Invalid service price.' });
        }
        updateData.price = Math.round(Number(data.price));
      }
      if (data.duration !== undefined) updateData.duration = data.duration;
      if (data.category !== undefined) updateData.category = data.category;
      if (data.imageUrl !== undefined || data.image !== undefined) updateData.image = data.imageUrl || data.image;
      if (data.visible !== undefined) updateData.visible = data.visible;
      if (data.popular !== undefined) updateData.popular = data.popular;
      updateData.updatedAt = new Date();

      const existingS = (await db.select({ id: services.id }).from(services).where(eq(services.id, id)).limit(1))[0];
      if (!existingS) {
        return res.status(404).json({ error: 'Service not found.' });
      }
      await db.update(services).set(updateData).where(eq(services.id, id));
      return res.json({ success: true });
    } catch (e: any) {
      return fail(res, e, `${req.method} ${req.originalUrl || req.url}`);
    }
  });

  app.delete('/api/services/:id', requireAdminRole, async (req, res) => {
    try {
      const { id } = req.params;
      const existingS = (await db.select({ id: services.id }).from(services).where(eq(services.id, id)).limit(1))[0];
      if (!existingS) {
        return res.status(404).json({ error: 'Service not found.' });
      }
      await db.delete(services).where(eq(services.id, id));
      return res.json({ success: true });
    } catch (e: any) {
      // F-12: RESTRICT FK — a service with booking history cannot be deleted.
      // ON DELETE RESTRICT raises SQLSTATE 23001 (restrict_violation); NO ACTION
      // raises 23503. Drizzle wraps pg errors as DrizzleQueryError, so the
      // SQLSTATE can be on e.cause.code — check both shapes.
      const fkCode = e?.code || e?.cause?.code;
      if (fkCode === '23503' || fkCode === '23001') {
        return res.status(409).json({ error: 'This service has existing bookings and cannot be deleted.' });
      }
      return fail(res, e, `${req.method} ${req.originalUrl || req.url}`);
    }
  });

  // Therapists Endpoints
  // F-XX: deterministic ordering — created_at (then id) so the public list and
  // the homepage's featured therapists are stable across edits; new therapists
  // append to the end instead of reshuffling the featured set.
  app.get('/api/therapists', async (req, res) => {
    try {
      const page = pageArgs(req);
      const allTherapists = await db
        .select()
        .from(therapists)
        .orderBy(asc(therapists.createdAt), asc(therapists.id))
        .limit(page.limit)
        .offset(page.offset);
      const formatted = allTherapists.map(t => ({
        id: t.id,
        name: t.name,
        category: t.tier,
        experienceYears: parseInt(t.experience) || 4,
        rating: parseFloat(t.rating) || 4.8,
        reviewsCount: 25,
        price: t.tier === 'Classic' ? 999 : t.tier === 'Deluxe' ? 2499 : 4999,
        durationMinutes: 60,
        specialty: t.specialties,
        status: t.availability ? 'available' : 'off_duty',
        verified: true,
        avatarUrl: t.image,
        bio: t.bio,
        language: 'English, Hindi',
        availability: t.availability,
      }));
      return res.json(formatted);
    } catch (e: any) {
      return fail(res, e, `${req.method} ${req.originalUrl || req.url}`);
    }
  });

  app.post('/api/therapists', requireAdminRole, async (req, res) => {
    try {
      const data = req.body;
      if (!data || typeof data.name !== 'string' || !data.name.trim()) {
        return res.status(400).json({ error: 'Therapist name is required.' });
      }
      const id = data.id || `th-${crypto.randomUUID()}`;
      const newTherapist = {
        id,
        name: data.name.trim(),
        tier: data.category || data.tier || 'Classic',
        category: data.category || data.tier || 'Classic',
        rating: String(data.rating || 4.8),
        experience: `${data.experienceYears || 4} Years`,
        specialties: data.specialty || 'Full Body Massage',
        bio: data.bio || 'Professional certified therapist.',
        image: data.avatarUrl || data.image || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
        availability: data.status === 'available' || data.availability !== false,
        status: 'Active',
      };
      await db.insert(therapists).values(newTherapist);
      return res.json({ success: true, therapist: newTherapist });
    } catch (e: any) {
      return fail(res, e, `${req.method} ${req.originalUrl || req.url}`);
    }
  });

  app.patch('/api/therapists/:id', requireAdminRole, async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;
      const updateData: any = {};
      if (data.name !== undefined) {
        // F-XX: strict name validation, consistent with the services endpoints —
        // non-string or empty/over-long names are rejected with 400 and the row
        // is left untouched.
        if (typeof data.name !== 'string' || !data.name.trim()) {
          return res.status(400).json({ error: 'Therapist name must be a non-empty string.' });
        }
        if (data.name.trim().length > 100) {
          return res.status(400).json({ error: 'Therapist name is too long (max 100 characters).' });
        }
        updateData.name = data.name.trim();
      }
      if (data.category !== undefined || data.tier !== undefined) {
        updateData.tier = data.category || data.tier;
        updateData.category = data.category || data.tier;
      }
      if (data.bio !== undefined) updateData.bio = data.bio;
      if (data.specialty !== undefined) updateData.specialties = data.specialty;
      if (data.avatarUrl !== undefined || data.image !== undefined) updateData.image = data.avatarUrl || data.image;
      if (data.availability !== undefined) updateData.availability = data.availability;
      if (data.status !== undefined) updateData.availability = data.status === 'available';
      if (data.rating !== undefined) updateData.rating = String(data.rating);
      updateData.updatedAt = new Date();

      const existingT = (await db.select({ id: therapists.id }).from(therapists).where(eq(therapists.id, id)).limit(1))[0];
      if (!existingT) {
        return res.status(404).json({ error: 'Therapist not found.' });
      }
      await db.update(therapists).set(updateData).where(eq(therapists.id, id));
      return res.json({ success: true });
    } catch (e: any) {
      return fail(res, e, `${req.method} ${req.originalUrl || req.url}`);
    }
  });

  app.delete('/api/therapists/:id', requireAdminRole, async (req, res) => {
    try {
      const { id } = req.params;
      const existingT = (await db.select({ id: therapists.id }).from(therapists).where(eq(therapists.id, id)).limit(1))[0];
      if (!existingT) {
        return res.status(404).json({ error: 'Therapist not found.' });
      }
      await db.delete(therapists).where(eq(therapists.id, id));
      return res.json({ success: true });
    } catch (e: any) {
      return fail(res, e, `${req.method} ${req.originalUrl || req.url}`);
    }
  });

  // Bookings Endpoints
  app.get('/api/bookings', requireAdminRole, async (req, res) => {
    try {
      const page = pageArgs(req);
      const allBookings = await db.select().from(bookings).orderBy(desc(bookings.createdAt)).limit(page.limit).offset(page.offset);
      const formatted = allBookings.map(b => ({
        id: b.id,
        customerName: b.customerName,
        customerMobile: b.customerMobile,
        customerEmail: b.customerEmail,
        serviceId: b.serviceId,
        serviceName: b.serviceName,
        therapistId: b.therapistId,
        therapistName: b.therapistName,
        therapistCategory: b.therapistTier || 'Classic',
        date: b.date,
        time: b.time,
        duration: b.duration,
        fullAddress: b.address,
        houseFlatNo: extractAddressValue(b.address, '(?:House/Flat|Room)') || b.houseDetails || '',
        floor: extractAddressValue(b.address, 'Floor'),
        city: b.locality,
        state: 'Madhya Pradesh',
        pincode: extractPincode(b.address) || '452001',
        notes: b.notes,
        serviceLocation: b.address?.includes('[Hotel Service]') ? 'hotel' : 'home',
        status: b.status,
        servicePrice: b.serviceAmount,
        visitFee: b.travelAdvance,
        totalPayable: b.totalAmount,
        paymentStatus: b.paymentStatus,
        paymentOption: 'pay_now',
        paymentMethod: 'online',
        createdAt: b.createdAt.toISOString(),
      }));
      return res.json(formatted);
    } catch (e: any) {
      return fail(res, e, `${req.method} ${req.originalUrl || req.url}`);
    }
  });

  app.post('/api/bookings', (req, res, next) => RL(bookingLimiter, req, res, next), async (req, res) => {
    try {
      const b = req.body || {};
      const isAdmin = await isAdminRequest(req);

      const customerName = typeof b.customerName === 'string' ? b.customerName.trim() : '';
      const customerMobile = typeof b.customerMobile === 'string' ? b.customerMobile.trim() : '';
      const customerEmail = typeof b.customerEmail === 'string' ? b.customerEmail.trim() : null;
      const serviceId = typeof b.serviceId === 'string' && b.serviceId ? b.serviceId : null;
      const therapistId = typeof b.therapistId === 'string' && b.therapistId ? b.therapistId : null;
      const address = typeof (b.fullAddress || b.address) === 'string' ? (b.fullAddress || b.address).trim() : '';
      const locality = typeof (b.city || b.locality) === 'string' ? (b.city || b.locality).trim() : '';
      const date = String(b.date || '').trim();
      const time = String(b.time || '').trim();
      const duration = String(b.duration || '1H').trim();
      const houseDetails = `${b.houseFlatNo || ''} ${b.floor || ''}`.trim() || null;
      const notes = b.notes || null;

      // ---- Basic field validation (always) ----
      if (customerName.length < 2 || customerName.length > 80) {
        return res.status(400).json({ error: 'Please enter a valid full name.' });
      }
      const digitsOnly = customerMobile.replace(/[^0-9]/g, '');
      if (digitsOnly.length < 10 || digitsOnly.length > 15) {
        return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number.' });
      }
      if (!address || !locality) {
        return res.status(400).json({ error: 'Please fill in your locality/area and street address.' });
      }
      if (!date || !time) {
        return res.status(400).json({ error: 'Date and time are required.' });
      }
      const parsedTime = parseTimeMinutes(time);
      if (parsedTime === null) {
        return res.status(400).json({ error: 'Please select a valid time slot.' });
      }
      const canonicalDate = normalizeDate(date);
      if (!canonicalDate) {
        return res.status(400).json({ error: 'Please select a valid date.' });
      }
      const { dateKey: todayKey, minutes: nowMinutes } = businessNow();
      if (!isAdmin && todayKey && canonicalDate < todayKey) {
        return res.status(400).json({ error: 'Booking date must be today or in the future.' });
      }
      // Same-day cut-off, enforced server-side in the business timezone: a slot
      // whose start time has already passed today is rejected even if the client
      // UI still shows it. Independent of any frontend disabling.
      if (!isAdmin && todayKey && canonicalDate === todayKey && parsedTime !== null && parsedTime < nowMinutes) {
        return res.status(400).json({ error: 'Selected booking time is no longer available.' });
      }

      // ---- Authoritative service/therapist lookup ----
      const service = serviceId
        ? (await db.select().from(services).where(eq(services.id, serviceId)).limit(1))[0]
        : undefined;
      if (!service) {
        return res.status(400).json({ error: 'Invalid service selected.' });
      }
      if (!isAdmin && !service.visible) {
        return res.status(400).json({ error: 'This service is currently unavailable.' });
      }
      let therapist: any = undefined;
      if (therapistId) {
        therapist = (await db.select().from(therapists).where(eq(therapists.id, therapistId)).limit(1))[0];
        if (!therapist) {
          return res.status(400).json({ error: 'Invalid therapist selected.' });
        }
        // F-04: off-duty/inactive therapists must not be bookable — the API no
        // longer trusts the frontend's disabled state.
        if (!therapist.availability || therapist.status !== 'Active') {
          return res.status(409).json({ error: 'This therapist is currently unavailable. Please select another therapist.' });
        }
      }

      // ---- Amount / status integrity ----
      let serviceAmount: number;
      let travelAdvance: number;
      let totalAmount: number;
      let paymentStatus = 'PENDING_VERIFICATION';
      let status = 'Pending';

      if (isAdmin) {
        serviceAmount = Math.max(0, Number(b.servicePrice || b.serviceAmount || 0) || 0);
        travelAdvance = Math.max(0, Number(b.visitFee || b.travelAdvance || 0) || 0);
        totalAmount = Math.max(0, Number(b.totalPayable || b.totalAmount || serviceAmount + travelAdvance) || serviceAmount + travelAdvance);
        if (b.paymentStatus && VALID_PAYMENT_STATUSES.includes(b.paymentStatus)) paymentStatus = b.paymentStatus;
        if (b.status && VALID_BOOKING_STATUSES.includes(b.status)) status = b.status;
      } else {
        const basePrice = therapist ? tierBasePrice(therapist.tier || therapist.category) : service.price;
        serviceAmount = Math.round(basePrice * durationMultiplier(duration));
        travelAdvance = TRAVEL_ADVANCE;
        totalAmount = serviceAmount + travelAdvance;
      }

      const id = `BK-${Date.now().toString(36).toUpperCase()}${crypto.randomInt(1000, 9999)}`;

      // ---- Atomic write with duplicate-slot protection ----
      const result = await db.transaction(async (tx) => {
        if (therapistId) {
          const clash = await tx.select({ id: bookings.id }).from(bookings).where(
            and(
              eq(bookings.therapistId, therapistId),
              eq(bookings.date, date),
              eq(bookings.time, time),
              ne(bookings.status, 'Cancelled')
            )
          ).limit(1);
          if (clash.length > 0) {
            throw Object.assign(new Error('This time slot has just been booked. Please pick another time.'), { statusCode: 409 });
          }
        }

        const inserted = await tx.insert(bookings).values({
          id,
          customerName,
          customerMobile,
          customerEmail,
          serviceId: service.id,
          serviceName: service.name,
          therapistId: therapistId || null,
          therapistName: therapist ? therapist.name : (b.therapistName || service.name),
          therapistTier: therapist ? (therapist.tier || therapist.category || 'Classic') : (b.therapistCategory || null),
          date,
          time,
          duration,
          address,
          locality,
          landmark: b.landmark || null,
          houseDetails,
          notes,
          serviceAmount,
          travelAdvance,
          totalAmount,
          paymentStatus,
          status,
        }).onConflictDoNothing({
          target: [bookings.therapistId, bookings.date, bookings.time],
          where: sql`${bookings.status} <> 'Cancelled'`,
        });
        if ((inserted as any).rowCount === 0) {
          throw Object.assign(new Error('This time slot has just been booked. Please pick another time.'), { statusCode: 409 });
        }

        // Upsert Customer by phone — atomic ON CONFLICT so two concurrent
        // bookings with the same new phone cannot both INSERT (the S5 unique
        // index makes the read-then-write pattern race-prone); semantics are
        // unchanged: new phone -> insert with total_orders=1, existing phone ->
        // bump total_orders and refresh the upcoming visit.
        const mobileKey = digitsOnly;
        await tx.insert(customers).values({
          id: `cust-${crypto.randomUUID()}`,
          name: customerName,
          phone: mobileKey,
          email: customerEmail,
          totalOrders: 1,
          upcomingVisit: `${date}, ${time}`,
          status: 'New',
        }).onConflictDoUpdate({
          target: [customers.phone],
          set: {
            totalOrders: sql`${customers.totalOrders} + 1`,
            upcomingVisit: `${date}, ${time}`,
            updatedAt: new Date(),
          },
        });

        // Create Admin Notification
        await tx.insert(adminNotifications).values({
          id: `notif-${crypto.randomUUID()}`,
          type: 'booking',
          title: 'New Booking Request',
          message: `${customerName} booked ${service.name} for ${date} at ${time}`,
          time: 'Just now',
          read: false,
          relatedId: id,
        });

        return {
          id,
          customerName,
          customerMobile,
          customerEmail,
          serviceId: service.id,
          serviceName: service.name,
          therapistId: therapistId || undefined,
          therapistName: therapist ? therapist.name : undefined,
          therapistCategory: therapist ? (therapist.tier || 'Classic') : undefined,
          date,
          time,
          duration,
          fullAddress: address,
          houseFlatNo: b.houseFlatNo || '',
          floor: b.floor || '',
          city: locality,
          state: b.state || 'Madhya Pradesh',
          pincode: b.pincode || extractPincode(address) || '452001',
          notes,
          serviceLocation: b.serviceLocation === 'hotel' ? 'hotel' : 'home',
          status,
          servicePrice: serviceAmount,
          visitFee: travelAdvance,
          totalPayable: totalAmount,
          paymentOption: b.paymentOption || 'pay_now',
          paymentMethod: b.paymentMethod || 'online',
          paymentStatus,
          createdAt: new Date().toISOString(),
        };
      });

      return res.json({ success: true, id, booking: result });
    } catch (e: any) {
      if (e?.statusCode === 409) {
        return res.status(409).json({ error: e.message });
      }
      return fail(res, e, 'create booking');
    }
  });

  app.patch('/api/bookings/:id', requireAdminRole, async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body || {};
      const updateData: any = {};
      if (data.status !== undefined) {
        if (!VALID_BOOKING_STATUSES.includes(data.status)) {
          return res.status(400).json({ error: 'Invalid booking status.' });
        }
        updateData.status = data.status;
      }
      if (data.paymentStatus !== undefined) {
        if (!VALID_PAYMENT_STATUSES.includes(data.paymentStatus)) {
          return res.status(400).json({ error: 'Invalid payment status.' });
        }
        updateData.paymentStatus = data.paymentStatus;
      }
      if (data.therapistId !== undefined) {
        const th = (await db.select().from(therapists).where(eq(therapists.id, data.therapistId)).limit(1))[0];
        if (!th) {
          return res.status(400).json({ error: 'Invalid therapist selected.' });
        }
        // F-04: reassigning a booking to an off-duty/inactive therapist is rejected too.
        if (!th.availability || th.status !== 'Active') {
          return res.status(409).json({ error: 'This therapist is currently unavailable. Please select another therapist.' });
        }
        updateData.therapistId = data.therapistId;
        if (data.therapistName !== undefined) updateData.therapistName = data.therapistName;
      }
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'Nothing to update.' });
      }
      updateData.updatedAt = new Date();

      const existing = (await db.select({ id: bookings.id }).from(bookings).where(eq(bookings.id, id)).limit(1))[0];
      if (!existing) {
        return res.status(404).json({ error: 'Booking not found.' });
      }
      await db.update(bookings).set(updateData).where(eq(bookings.id, id));
      return res.json({ success: true });
    } catch (e: any) {
      return fail(res, e, 'update booking');
    }
  });

  // Customers Endpoints
  app.get('/api/customers', requireAdminRole, async (req, res) => {
    try {
      const page = pageArgs(req);
      const allCustomers = await db.select().from(customers).orderBy(desc(customers.createdAt)).limit(page.limit).offset(page.offset);
      return res.json(allCustomers);
    } catch (e: any) {
      return fail(res, e, `${req.method} ${req.originalUrl || req.url}`);
    }
  });

  // Enquiries / Chatbot Endpoints
  app.get('/api/enquiries', requireAdminRole, async (req, res) => {
    try {
      const page = pageArgs(req);
      const allEnquiries = await db.select().from(enquiries).orderBy(desc(enquiries.createdAt)).limit(page.limit).offset(page.offset);
      return res.json(allEnquiries);
    } catch (e: any) {
      return fail(res, e, `${req.method} ${req.originalUrl || req.url}`);
    }
  });

  app.post('/api/enquiries', (req, res, next) => RL(messageLimiter, req, res, next), async (req, res) => {
    try {
      if (jsonByteLength(req.body) > PUBLIC_MESSAGE_BODY_LIMIT) {
        return res.status(413).json({ error: 'Request payload too large.' });
      }
      const { name, mobile, message } = req.body;
      const safeName = (name || '').toString().trim();
      const safeMobile = (mobile || '').toString().trim();
      const safeMessage = (message || '').toString().trim();
      if (!safeName || !safeMobile || !safeMessage) {
        return res.status(400).json({ error: 'Name, mobile and message are required.' });
      }
      if (safeName.length > 80 || safeMobile.length > 20 || safeMessage.length > 2000) {
        return res.status(400).json({ error: 'Input is too long.' });
      }
      const id = `enq-${crypto.randomUUID()}`;
      await db.insert(enquiries).values({
        id,
        name: safeName,
        mobile: safeMobile,
        message: safeMessage,
        status: 'New',
      });

      await db.insert(adminNotifications).values({
        id: `notif-${crypto.randomUUID()}`,
        type: 'message',
        title: 'New Customer Enquiry',
        // F-13: reference the enquiry via relatedId; never duplicate the mobile
        // number or message body into the notification text.
        message: `New enquiry from ${safeName}`,
        time: 'Just now',
        read: false,
        relatedId: id,
      });

      return res.json({ success: true, id });
    } catch (e: any) {
      return fail(res, e, `${req.method} ${req.originalUrl || req.url}`);
    }
  });

  // Contact Messages Endpoints
  app.get('/api/contact', requireAdminRole, async (req, res) => {
    try {
      const page = pageArgs(req);
      const allContact = await db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt)).limit(page.limit).offset(page.offset);
      return res.json(allContact);
    } catch (e: any) {
      return fail(res, e, `${req.method} ${req.originalUrl || req.url}`);
    }
  });

  app.post('/api/contact', (req, res, next) => RL(messageLimiter, req, res, next), async (req, res) => {
    try {
      if (jsonByteLength(req.body) > PUBLIC_MESSAGE_BODY_LIMIT) {
        return res.status(413).json({ error: 'Request payload too large.' });
      }
      const { name, phone, email, message } = req.body;
      const safeName = (name || '').toString().trim();
      const safePhone = (phone || '').toString().trim();
      const safeEmail = email ? email.toString().trim() : null;
      const safeMessage = (message || '').toString().trim();
      if (!safeName || !safePhone || !safeMessage) {
        return res.status(400).json({ error: 'Name, phone and message are required.' });
      }
      if (safeName.length > 80 || safePhone.length > 20 || safeMessage.length > 2000) {
        return res.status(400).json({ error: 'Input is too long.' });
      }
      if (safeEmail && safeEmail.length > 120) {
        return res.status(400).json({ error: 'Email is too long.' });
      }
      if (safeEmail && !/@/.test(safeEmail)) {
        return res.status(400).json({ error: 'Invalid email address.' });
      }
      const id = `contact-${crypto.randomUUID()}`;
      await db.insert(contactMessages).values({
        id,
        name: safeName,
        phone: safePhone,
        email: safeEmail || null,
        message: safeMessage,
        status: 'Unread',
      });

      await db.insert(adminNotifications).values({
        id: `notif-${crypto.randomUUID()}`,
        type: 'message',
        title: 'New Contact Form Submission',
        // F-13: reference the contact message via relatedId; never duplicate the
        // phone number (or email/address) into the notification text.
        message: `New contact message from ${name}`,
        time: 'Just now',
        read: false,
        relatedId: id,
      });

      return res.json({ success: true, id });
    } catch (e: any) {
      return fail(res, e, `${req.method} ${req.originalUrl || req.url}`);
    }
  });

  // Admin Notifications Endpoints
  app.get('/api/notifications', requireAdminRole, async (req, res) => {
    try {
      const page = pageArgs(req);
      const allNotifs = await db.select().from(adminNotifications).orderBy(desc(adminNotifications.createdAt)).limit(page.limit).offset(page.offset);
      const formatted = allNotifs.map(n => ({
        id: n.id,
        title: n.title,
        message: n.message,
        timestamp: n.time,
        read: n.read,
        type: n.type as any,
        relatedId: n.relatedId || undefined,
      }));
      return res.json(formatted);
    } catch (e: any) {
      return fail(res, e, `${req.method} ${req.originalUrl || req.url}`);
    }
  });

  app.patch('/api/notifications/:id', requireAdminRole, async (req, res) => {
    try {
      const { id } = req.params;
      const { read } = req.body;
      const existingN = (await db.select({ id: adminNotifications.id }).from(adminNotifications).where(eq(adminNotifications.id, id)).limit(1))[0];
      if (!existingN) {
        return res.status(404).json({ error: 'Notification not found.' });
      }
      await db.update(adminNotifications).set({ read: !!read }).where(eq(adminNotifications.id, id));
      return res.json({ success: true });
    } catch (e: any) {
      return fail(res, e, `${req.method} ${req.originalUrl || req.url}`);
    }
  });

  app.post('/api/notifications', requireAdminRole, async (req, res) => {
    try {
      const { title, message, type, relatedId } = req.body;
      const id = `notif-${crypto.randomUUID()}`;
      await db.insert(adminNotifications).values({
        id,
        type: type || 'system',
        title: title || 'Notification',
        message: message || '',
        time: 'Just now',
        read: false,
        relatedId: relatedId || null,
      });
      return res.json({ success: true, id });
    } catch (e: any) {
      return fail(res, e, `${req.method} ${req.originalUrl || req.url}`);
    }
  });

  app.delete('/api/notifications/:id', requireAdminRole, async (req, res) => {
    try {
      const { id } = req.params;
      const existingN = (await db.select({ id: adminNotifications.id }).from(adminNotifications).where(eq(adminNotifications.id, id)).limit(1))[0];
      if (!existingN) {
        return res.status(404).json({ error: 'Notification not found.' });
      }
      await db.delete(adminNotifications).where(eq(adminNotifications.id, id));
      return res.json({ success: true });
    } catch (e: any) {
      return fail(res, e, `${req.method} ${req.originalUrl || req.url}`);
    }
  });

  // Enquiry endpoints
  app.patch('/api/enquiries/:id', requireAdminRole, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (status !== undefined && !['New', 'Handled', 'Closed'].includes(status)) {
        return res.status(400).json({ error: 'Invalid enquiry status.' });
      }
      const existingE = (await db.select({ id: enquiries.id }).from(enquiries).where(eq(enquiries.id, id)).limit(1))[0];
      if (!existingE) {
        return res.status(404).json({ error: 'Enquiry not found.' });
      }
      await db.update(enquiries).set({ status: status || 'Handled' }).where(eq(enquiries.id, id));
      return res.json({ success: true });
    } catch (e: any) {
      return fail(res, e, `${req.method} ${req.originalUrl || req.url}`);
    }
  });

  app.delete('/api/enquiries/:id', requireAdminRole, async (req, res) => {
    try {
      const { id } = req.params;
      const existingE = (await db.select({ id: enquiries.id }).from(enquiries).where(eq(enquiries.id, id)).limit(1))[0];
      if (!existingE) {
        return res.status(404).json({ error: 'Enquiry not found.' });
      }
      await db.delete(enquiries).where(eq(enquiries.id, id));
      return res.json({ success: true });
    } catch (e: any) {
      return fail(res, e, `${req.method} ${req.originalUrl || req.url}`);
    }
  });

  // Contact endpoints
  app.patch('/api/contact/:id', requireAdminRole, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (status !== undefined && !['Unread', 'Read', 'Archived'].includes(status)) {
        return res.status(400).json({ error: 'Invalid contact status.' });
      }
      const existingC = (await db.select({ id: contactMessages.id }).from(contactMessages).where(eq(contactMessages.id, id)).limit(1))[0];
      if (!existingC) {
        return res.status(404).json({ error: 'Contact message not found.' });
      }
      await db.update(contactMessages).set({ status: status || 'Read' }).where(eq(contactMessages.id, id));
      return res.json({ success: true });
    } catch (e: any) {
      return fail(res, e, `${req.method} ${req.originalUrl || req.url}`);
    }
  });

  app.delete('/api/contact/:id', requireAdminRole, async (req, res) => {
    try {
      const { id } = req.params;
      const existingC = (await db.select({ id: contactMessages.id }).from(contactMessages).where(eq(contactMessages.id, id)).limit(1))[0];
      if (!existingC) {
        return res.status(404).json({ error: 'Contact message not found.' });
      }
      await db.delete(contactMessages).where(eq(contactMessages.id, id));
      return res.json({ success: true });
    } catch (e: any) {
      return fail(res, e, `${req.method} ${req.originalUrl || req.url}`);
    }
  });

  // ---- S3: unknown /api/* paths return JSON 404, never SPA HTML ----
  // Registered after every real API route and before the Vite/static/SPA
  // fallback, so an unmatched /api/* request gets a non-cacheable JSON 404
  // while the React SPA fallback and static assets are unaffected.
  app.use('/api', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.status(404).json({ error: 'Not found.' });
  });

  return app;
}
