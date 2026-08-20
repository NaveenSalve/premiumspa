import type { HandlerEvent, HandlerContext } from '@netlify/functions';
import serverless from 'serverless-http';
import { createApiApp, seedInitialData } from '../../src/server/app.ts';

// Built once per warm function instance and reused across invocations, the
// same way the long-running server caches its Postgres pool.
let readyHandler: Promise<ReturnType<typeof serverless>> | null = null;

async function getHandler() {
  if (!readyHandler) {
    readyHandler = (async () => {
      const app = await createApiApp();
      await seedInitialData().catch((e) => {
        console.error('[boot] seedInitialData failed (non-fatal):', e);
      });
      return serverless(app);
    })();
  }
  return readyHandler;
}

export const handler = async (event: HandlerEvent, context: HandlerContext) => {
  const expressHandler = await getHandler();
  // netlify.toml rewrites /api/* to /.netlify/functions/api/:splat, so strip
  // the function-invocation prefix back to the /api/... path the Express app's
  // routes are actually registered under.
  const path = event.path.replace(/^\/\.netlify\/functions\/api/, '/api') || '/api';
  return expressHandler({ ...event, path }, context);
};
