"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { requireRole } from "@/app/actions/_auth";
import { account, user } from "@/lib/auth-schema";
import { db } from "@/lib/db";
import { majors, studentProfiles } from "@/lib/schema";

type UserRole = "ADMIN" | "TEACHER" | "STUDENT";

export type UserWithProfile = {
  id: string;
  name: string;
  email: string;
  role: UserRole | null;
  createdAt: Date;
  nim: string | null;
  major: string | null;
  majorId: string | null;
};

function revalidateUserPages() {
  revalidatePath("/admin/students");
  revalidatePath("/teacher/students");
  revalidatePath("/admin/classes");
}

function buildStudentEmail(nim: string) {
  return `${nim.toLowerCase()}@student.eduai.local`;
}

async function resolveMajor(majorId?: string, majorName?: string) {
  if (majorId?.trim()) {
    const rows = await db
      .select({ id: majors.id, name: majors.name })
      .from(majors)
      .where(eq(majors.id, majorId.trim()))
      .limit(1);
    if (!rows[0]) throw new Error("Jurusan tidak ditemukan.");
    return rows[0];
  }

  if (majorName?.trim()) {
    const rows = await db
      .select({ id: majors.id, name: majors.name })
      .from(majors)
      .where(eq(majors.name, majorName.trim()))
      .limit(1);
    if (!rows[0]) throw new Error(`Jurusan '${majorName.trim()}' belum terdaftar di master data.`);
    return rows[0];
  }

  return null;
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
      major: sql<string | null>`coalesce(${majors.name}, ${studentProfiles.major})`,
      majorId: studentProfiles.majorId,
    })
    .from(user)
    .leftJoin(studentProfiles, eq(studentProfiles.userId, user.id))
    .leftJoin(majors, eq(studentProfiles.majorId, majors.id));

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
  majorId?: string;
}) {
  await requireRole(["ADMIN"]);

  const normalizedEmail = data.email.trim().toLowerCase();
  const existing = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, normalizedEmail))
    .limit(1);

  if (existing[0]) {
    throw new Error("Email sudah terdaftar");
  }

  if (data.role === "STUDENT" && !data.nim?.trim()) {
    throw new Error("NIM wajib diisi untuk mahasiswa/siswa");
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
    const major = await resolveMajor(data.majorId, data.major);

    await db.insert(studentProfiles).values({
      userId,
      nim: data.nim.trim(),
      major: major?.name || null,
      majorId: major?.id || null,
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
  majorId?: string;
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
    majorId: data.majorId,
  });
}

export async function bulkCreateStudents(
  rows: Array<{ nim: string; name: string; major?: string; majorId?: string }>,
) {
  await requireRole(["ADMIN"]);

  for (const row of rows) {
    await createStudent({
      nim: row.nim,
      name: row.name,
      major: row.major,
      majorId: row.majorId,
    });
  }

  revalidateUserPages();
}

export async function updateUser(
  id: string,
  data: Partial<{
    name: string;
    email: string;
    role: UserRole;
    nim: string;
    major: string;
    majorId: string;
  }>,
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

  if (data.nim !== undefined || data.major !== undefined || data.majorId !== undefined) {
    const major = await resolveMajor(data.majorId, data.major);

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
          major: major?.name || null,
          majorId: major?.id || null,
          updatedAt: new Date(),
        })
        .where(eq(studentProfiles.userId, id));
    } else if (data.nim?.trim()) {
      await db.insert(studentProfiles).values({
        userId: id,
        nim: data.nim.trim(),
        major: major?.name || null,
        majorId: major?.id || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  revalidateUserPages();
}

export async function updateStudent(
  id: string,
  data: { nim: string; name: string; major?: string; majorId?: string },
) {
  await requireRole(["ADMIN"]);

  await updateUser(id, {
    name: data.name,
    nim: data.nim,
    major: data.major,
    majorId: data.majorId,
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

export async function getMyProfile() {
  const session = await requireRole(["ADMIN", "TEACHER", "STUDENT"]);

  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  if (!rows[0]) {
    throw new Error("Profil pengguna tidak ditemukan.");
  }

  return rows[0];
}

export async function updateMyProfile(data: { name: string; email: string }) {
  const session = await requireRole(["ADMIN", "TEACHER", "STUDENT"]);

  const name = data.name.trim();
  const email = data.email.trim().toLowerCase();

  if (!name) throw new Error("Nama wajib diisi.");
  if (!email) throw new Error("Email wajib diisi.");

  const existing = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  if (existing[0] && existing[0].id !== session.user.id) {
    throw new Error("Email sudah digunakan pengguna lain.");
  }

  await db
    .update(user)
    .set({
      name,
      email,
      updatedAt: new Date(),
    })
    .where(eq(user.id, session.user.id));

  revalidatePath("/admin/profile");
  revalidatePath("/teacher/profile");
  revalidatePath("/student/profile");
  revalidatePath("/admin/dashboard");
  revalidatePath("/teacher/dashboard");
  revalidatePath("/student/dashboard");
}

export async function updateMyPassword(data: {
  currentPassword: string;
  newPassword: string;
}) {
  const session = await requireRole(["ADMIN", "TEACHER", "STUDENT"]);

  const currentPassword = data.currentPassword.trim();
  const newPassword = data.newPassword.trim();

  if (!currentPassword || !newPassword) {
    throw new Error("Kata sandi lama dan baru wajib diisi.");
  }

  if (newPassword.length < 8) {
    throw new Error("Kata sandi baru minimal 8 karakter.");
  }

  const creds = await db
    .select({ id: account.id, password: account.password })
    .from(account)
    .where(and(eq(account.userId, session.user.id), eq(account.providerId, "credential")))
    .limit(1);

  if (!creds[0]?.password) {
    throw new Error("Akun tidak memiliki kredensial kata sandi.");
  }

  const isValid = await verifyPassword({
    hash: creds[0].password,
    password: currentPassword,
  });

  if (!isValid) {
    throw new Error("Kata sandi lama tidak sesuai.");
  }

  const hashed = await hashPassword(newPassword);
  await db
    .update(account)
    .set({
      password: hashed,
      updatedAt: new Date(),
    })
    .where(eq(account.id, creds[0].id));
}
