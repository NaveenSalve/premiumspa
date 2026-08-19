import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as dotenv from 'dotenv';
import * as schema from './schema.ts';

// Load .env before the pool is constructed. ESM imports are hoisted, so a
// caller (server.ts) cannot rely on its own `dotenv.config()` having run before
// this module's top-level `createPool()` executes.
dotenv.config();

const { Pool } = pg;

declare global {
  var _postgresPool: pg.Pool | undefined;
}

// Server-side only. Never import this module into client/browser code.
// Preferred Supabase config: DATABASE_URL (direct or transaction-pooler URL).
// Fallback: discrete SQL_* variables for local/self-managed PostgreSQL.
export const createPool = () => {
  if (!global._postgresPool) {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

    const poolConfig: pg.PoolConfig = {
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      port: process.env.SQL_PORT ? Number(process.env.SQL_PORT) : undefined,
      max: Number(process.env.DB_POOL_MAX) || 10,
      idleTimeoutMillis: Number(process.env.DB_POOL_IDLE_MS) || 10000,
      connectionTimeoutMillis: Number(process.env.DB_CONNECT_TIMEOUT_MS) || 10000,
      query_timeout: Number(process.env.DB_QUERY_TIMEOUT_MS) || 15000,
      statement_timeout: Number(process.env.DB_STATEMENT_TIMEOUT_MS) || 10000,
      application_name: 'spa-backend',
    };

    if (connectionString) {
      // Supabase (and managed Postgres) expose a connection string; it must
      // remain a server-side secret. SSL is mandatory for Supabase.
      poolConfig.connectionString = connectionString;
      if (!/sslmode=disable/.test(connectionString)) {
        poolConfig.ssl = { rejectUnauthorized: false };
      }
      delete poolConfig.host;
      delete poolConfig.user;
      delete poolConfig.password;
      delete poolConfig.database;
      delete poolConfig.port;
    } else if (process.env.SQL_SSL === 'true') {
      poolConfig.ssl = { rejectUnauthorized: false };
    }

    global._postgresPool = new Pool(poolConfig);

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

const pool = createPool();

export const db = drizzle(pool, { schema });