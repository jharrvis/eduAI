import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { db } from "@/lib/db";
import * as authSchema from "@/lib/auth-schema";

const resolvedAuthUrl =
  process.env.BETTER_AUTH_URL ||
  process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
const authSecret =
  process.env.BETTER_AUTH_SECRET || "dev-only-secret-change-before-production";

export const auth = betterAuth({
  secret: authSecret,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
  }),
  baseURL: resolvedAuthUrl,
  trustedOrigins: async (request) => {
    const requestOrigin = request ? new URL(request.url).origin : resolvedAuthUrl;
    return Array.from(new Set([requestOrigin, resolvedAuthUrl]));
  },
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: ["ADMIN", "TEACHER", "STUDENT"],
        defaultValue: "STUDENT",
        input: false,
      },
    },
  },
  plugins: [nextCookies(), admin({ defaultRole: "STUDENT" })],
});
