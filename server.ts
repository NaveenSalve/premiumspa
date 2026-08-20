import express from 'express';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db } from './src/db/index.ts';
import { createApiApp, seedInitialData } from './src/server/app.ts';

dotenv.config();

// Container platforms (Railway/Render/Fly.io) inject PORT at runtime. Trust it
// verbatim; fall back to 3000 only for local dev / Cloudflare tunnel runs.
const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = await createApiApp();

  // Serve Vite in dev or Static build in production
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    fs.existsSync(path.join(process.cwd(), 'dist', 'index.html'));

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // F-02: backend bundle / sourcemaps / source files must never be served.
    // Hard-blocked before static serving even if a stale file exists in dist/.
    app.use((req, res, next) => {
      if (
        /server\.cjs/i.test(req.path) ||
        /\.(cjs|mjs|ts|tsx|mts|cts)$/i.test(req.path) ||
        /\.map$/i.test(req.path)
      ) {
        return res.status(404).json({ error: 'Not found.' });
      }
      next();
    });
    app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get(/.*/, (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const bindHost = '0.0.0.0';
  app.listen(PORT, bindHost, () => {
    console.log(`Server running on http://${bindHost}:${PORT}`);

    // Run DB migrations and seed asynchronously in background AFTER port is listening
    (async () => {
      try {
        await migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle') });
        console.log('[db] migrations applied');
      } catch (e) {
        console.error('[db] FAILED to apply migrations — database may be unreachable or not provisioned.', e);
      }

      await seedInitialData().catch((e) => {
        console.error('[boot] seedInitialData failed (non-fatal):', e);
      });
    })();
  });
}

startServer().catch((e) => {
  console.error('[boot] FATAL: server failed to start:', e);
  process.exit(1);
});
