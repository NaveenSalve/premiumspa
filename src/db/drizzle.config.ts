import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const isSupabase = !!(url && url.includes("supabase"));

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials: (url
    ? {
        connectionString: url,
        // Supabase requires TLS; server-side env only.
        ssl: isSupabase ? { rejectUnauthorized: false } : false,
      }
    : {
        host: process.env.SQL_HOST,
        port: process.env.SQL_PORT ? Number(process.env.SQL_PORT) : 5432,
        user: process.env.SQL_ADMIN_USER || process.env.SQL_USER,
        password: process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD,
        database: process.env.SQL_DB_NAME,
        ssl: process.env.SQL_SSL === "true",
      }) as any,
  verbose: true,
});