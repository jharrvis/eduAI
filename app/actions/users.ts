"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { hashPassword } from "better-auth/crypto";
import { requireRole } from "@/app/actions/_auth";
import { account, user } from "@/lib/auth-schema";
import { db } from "@/lib/db";
import { studentProfiles } from "@/lib/schema";

type UserRole = "ADMIN" | "TEACHER" | "STUDENT";

export type UserWithProfile = {
  id: string;
  name: string;
  email: string;
  role: UserRole | null;
  createdAt: Date;
  nim: string | null;
  major: string | null;
};

function revalidateUserPages() {
  revalidatePath("/admin/students");
  revalidatePath("/teacher/students");
  revalidatePath("/admin/classes");
}

function buildStudentEmail(nim: string) {
  return `${nim.toLowerCase()}@student.eduai.local`;
}

export async function getUsers(role?: UserRole): Promise<UserWithProfile[]> {
  await requireRole(["ADMIN", "TEACHER"]);

  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      nim: studentProfiles.nim,
      major: studentProfiles.major,
    })
    .from(user)
    .leftJoin(studentProfiles, eq(studentProfiles.userId, user.id));

  if (role) {
    return rows.filter((item) => item.role === role);
  }

  return rows;
}

export async function getStudents(): Promise<UserWithProfile[]> {
  const users = await getUsers("STUDENT");
  return users.sort((a, b) => (a.nim || "").localeCompare(b.nim || ""));
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  nim?: string;
  major?: string;
}) {
  await requireRole(["ADMIN"]);

  const normalizedEmail = data.email.trim().toLowerCase();
  const existing = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, normalizedEmail))
    .limit(1);

  if (existing[0]) {
    throw new Error("Email already exists");
  }

  if (data.role === "STUDENT" && !data.nim?.trim()) {
    throw new Error("NIM wajib diisi untuk student");
  }

  const userId = crypto.randomUUID();
  const now = new Date();

  await db.insert(user).values({
    id: userId,
    name: data.name.trim(),
    email: normalizedEmail,
    emailVerified: false,
    role: data.role,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(account).values({
    id: crypto.randomUUID(),
    userId,
    accountId: userId,
    providerId: "credential",
    password: await hashPassword(data.password),
    createdAt: now,
    updatedAt: now,
  });

  if (data.role === "STUDENT" && data.nim) {
    await db.insert(studentProfiles).values({
      userId,
      nim: data.nim.trim(),
      major: data.major?.trim() || null,
      createdAt: now,
      updatedAt: now,
    });
  }

  revalidateUserPages();
  return { id: userId };
}

export async function createStudent(data: {
  nim: string;
  name: string;
  major?: string;
  password?: string;
}) {
  await requireRole(["ADMIN"]);

  const nim = data.nim.trim();
  if (!nim) {
    throw new Error("NIM wajib diisi");
  }

  const existingProfile = await db
    .select({ userId: studentProfiles.userId })
    .from(studentProfiles)
    .where(eq(studentProfiles.nim, nim))
    .limit(1);

  if (existingProfile[0]) {
    throw new Error("NIM sudah terdaftar");
  }

  return createUser({
    name: data.name,
    email: buildStudentEmail(nim),
    password: data.password?.trim() || "Student12345!",
    role: "STUDENT",
    nim,
    major: data.major,
  });
}

export async function bulkCreateStudents(
  rows: Array<{ nim: string; name: string; major?: string }>,
) {
  await requireRole(["ADMIN"]);

  for (const row of rows) {
    await createStudent({
      nim: row.nim,
      name: row.name,
      major: row.major,
    });
  }

  revalidateUserPages();
}

export async function updateUser(
  id: string,
  data: Partial<{ name: string; email: string; role: UserRole; nim: string; major: string }>,
) {
  await requireRole(["ADMIN"]);

  const payload: Partial<typeof user.$inferInsert> = {};
  if (data.name !== undefined) payload.name = data.name.trim();
  if (data.email !== undefined) payload.email = data.email.toLowerCase().trim();
  if (data.role !== undefined) payload.role = data.role;
  payload.updatedAt = new Date();

  if (Object.keys(payload).length > 1) {
    await db.update(user).set(payload).where(eq(user.id, id));
  }

  if (data.nim !== undefined || data.major !== undefined) {
    const existingProfile = await db
      .select({ userId: studentProfiles.userId })
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, id))
      .limit(1);

    if (existingProfile[0]) {
      await db
        .update(studentProfiles)
        .set({
          nim: data.nim?.trim(),
          major: data.major?.trim() || null,
          updatedAt: new Date(),
        })
        .where(eq(studentProfiles.userId, id));
    } else if (data.nim?.trim()) {
      await db.insert(studentProfiles).values({
        userId: id,
        nim: data.nim.trim(),
        major: data.major?.trim() || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  revalidateUserPages();
}

export async function updateStudent(
  id: string,
  data: { nim: string; name: string; major?: string },
) {
  await requireRole(["ADMIN"]);

  await updateUser(id, {
    name: data.name,
    nim: data.nim,
    major: data.major,
    email: buildStudentEmail(data.nim),
    role: "STUDENT",
  });
}

export async function deleteUser(id: string) {
  await requireRole(["ADMIN"]);

  const accounts = await db
    .select({ id: account.id })
    .from(account)
    .where(eq(account.userId, id));

  if (accounts.length > 0) {
    await db
      .delete(account)
      .where(
        inArray(
          account.id,
          accounts.map((item) => item.id),
        ),
      );
  }

  await db.delete(user).where(eq(user.id, id));
  revalidateUserPages();
}

export async function deleteStudent(id: string) {
  await requireRole(["ADMIN"]);
  await deleteUser(id);
}

export async function resetUserPassword(id: string, newPassword: string) {
  await requireRole(["ADMIN", "TEACHER"]);

  const creds = await db
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, id), eq(account.providerId, "credential")))
    .limit(1);

  const hashed = await hashPassword(newPassword);

  if (!creds[0]) {
    await db.insert(account).values({
      id: crypto.randomUUID(),
      userId: id,
      accountId: id,
      providerId: "credential",
      password: hashed,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } else {
    await db
      .update(account)
      .set({
        password: hashed,
        updatedAt: new Date(),
      })
      .where(eq(account.id, creds[0].id));
  }
}
