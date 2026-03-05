import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as authSchema from "@/lib/auth-schema";
import * as schema from "@/lib/schema";

const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/eduai?sslmode=disable";

const sql = neon(databaseUrl);

export const db = drizzle(sql, {
  schema: {
    ...authSchema,
    ...schema,
  },
});
