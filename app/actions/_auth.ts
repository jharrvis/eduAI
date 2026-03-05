"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";

type AppRole = "ADMIN" | "TEACHER" | "STUDENT";

export async function getServerSession() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({
    headers: reqHeaders,
  });
  return session;
}

export async function requireRole(roles: AppRole[]) {
  const session = await getServerSession();
  const role = session?.user?.role as AppRole | undefined;

  if (!session?.user || !role || !roles.includes(role)) {
    throw new Error("FORBIDDEN");
  }

  return session;
}
