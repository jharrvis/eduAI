import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { db } from "@/lib/db";
import * as authSchema from "@/lib/auth-schema";

const authUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";
const authSecret =
  process.env.BETTER_AUTH_SECRET || "dev-only-secret-change-before-production";

export const auth = betterAuth({
  secret: authSecret,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
  }),
  baseURL: authUrl,
  trustedOrigins: async (request) => {
    const requestOrigin = request ? new URL(request.url).origin : authUrl;
    return [requestOrigin, authUrl];
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
