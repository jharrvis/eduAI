"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cache } from "react";
import { requireRole } from "@/app/actions/_auth";
import { user } from "@/lib/auth-schema";
import { db } from "@/lib/db";
import { classes, enrollments, majors } from "@/lib/schema";

type ClassRole = "TEACHER" | "STUDENT";
type AppRole = "ADMIN" | "TEACHER" | "STUDENT";

type ClassItem = typeof classes.$inferSelect;

export type ClassWithMembers = ClassItem & {
  teachers: Array<{ userId: string; name: string; email: string }>;
  students: Array<{ userId: string; name: string; email: string }>;
};

function revalidateClassPages() {
  revalidatePath("/admin/classes");
  revalidatePath("/teacher/classes");
  revalidatePath("/student/dashboard");
  revalidatePath("/student/classes");
}

// Cached version using React cache only (request-scoped)
const listClassesByRoleCached = cache(async (userId: string, role: AppRole): Promise<ClassItem[]> => {
  if (role === "ADMIN") {
    return db.select().from(classes);
  }

  const enrolled = await db
    .select({ classId: enrollments.classId })
    .from(enrollments)
    .where(eq(enrollments.userId, userId));

  if (enrolled.length === 0) return [];

  return db
    .select()
    .from(classes)
    .where(
      and(
        inArray(classes.id, enrolled.map((item) => item.classId)),
        eq(classes.isActive, true),
      ),
    );
});

export async function getClasses() {
  const session = await requireRole(["ADMIN", "TEACHER", "STUDENT"]);
  const role = session.user.role as AppRole;
  return listClassesByRoleCached(session.user.id, role);
}

export async function getClassesWithMembers(): Promise<ClassWithMembers[]> {
  const session = await requireRole(["ADMIN", "TEACHER", "STUDENT"]);
  const role = session.user.role as AppRole;

  const classRows = await listClassesByRoleCached(session.user.id, role);
  if (classRows.length === 0) return [];

  const classIds = classRows.map((item) => item.id);
  const enrollmentRows = await db
    .select({
      classId: enrollments.classId,
      roleInClass: enrollments.roleInClass,
      userId: user.id,
      name: user.name,
      email: user.email,
    })
    .from(enrollments)
    .innerJoin(user, eq(enrollments.userId, user.id))
    .where(inArray(enrollments.classId, classIds));

  return classRows.map((item) => {
    const members = enrollmentRows.filter((row) => row.classId === item.id);

    return {
      ...item,
      teachers: members
        .filter((row) => row.roleInClass === "TEACHER")
        .map((row) => ({ userId: row.userId, name: row.name, email: row.email })),
      students: members
        .filter((row) => row.roleInClass === "STUDENT")
        .map((row) => ({ userId: row.userId, name: row.name, email: row.email })),
    };
  });
}

export async function createClass(data: {
  name: string;
  description?: string;
  academicYear: string;
  majorId: string;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
}) {
  await requireRole(["ADMIN"]);

  const majorId = data.majorId?.trim();
  if (!majorId) throw new Error("Jurusan wajib dipilih.");
  const majorRows = await db.select({ id: majors.id }).from(majors).where(eq(majors.id, majorId)).limit(1);
  if (!majorRows[0]) throw new Error("Jurusan tidak ditemukan.");

  const result = await db
    .insert(classes)
    .values({
      name: data.name,
      description: data.description,
      majorId,
      academicYear: data.academicYear,
      isActive: data.isActive ?? true,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
    })
    .returning({ id: classes.id });

  revalidateClassPages();
  return result[0];
}

export async function updateClass(
  id: string,
  data: Partial<{
    name: string;
    description: string;
    academicYear: string;
    majorId: string | null;
    isActive: boolean;
    startDate: string | null;
    endDate: string | null;
  }>,
) {
  await requireRole(["ADMIN"]);

  const payload: Partial<typeof classes.$inferInsert> = {};
  if (data.name !== undefined) payload.name = data.name;
  if (data.description !== undefined) payload.description = data.description;
  if (data.academicYear !== undefined) payload.academicYear = data.academicYear;
  if (data.majorId !== undefined) {
    const majorId = data.majorId?.trim();
    if (!majorId) {
      payload.majorId = null;
    } else {
      const majorRows = await db.select({ id: majors.id }).from(majors).where(eq(majors.id, majorId)).limit(1);
      if (!majorRows[0]) throw new Error("Jurusan tidak ditemukan.");
      payload.majorId = majorId;
    }
  }
  if (data.isActive !== undefined) payload.isActive = data.isActive;
  if (data.startDate !== undefined) payload.startDate = data.startDate ? new Date(data.startDate) : null;
  if (data.endDate !== undefined) payload.endDate = data.endDate ? new Date(data.endDate) : null;

  if (Object.keys(payload).length === 0) return;
  await db.update(classes).set(payload).where(eq(classes.id, id));
  revalidateClassPages();
}

export async function deleteClass(id: string) {
  await requireRole(["ADMIN"]);

  await db.delete(classes).where(eq(classes.id, id));
  revalidateClassPages();
}

export async function enrollUsers(
  classId: string,
  userIds: string[],
  roleInClass: ClassRole,
) {
  await requireRole(["ADMIN"]);

  for (const userId of userIds) {
    const existing = await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(and(eq(enrollments.classId, classId), eq(enrollments.userId, userId)))
      .limit(1);

    if (existing[0]) {
      await db
        .update(enrollments)
        .set({ roleInClass })
        .where(eq(enrollments.id, existing[0].id));
    } else {
      await db.insert(enrollments).values({
        classId,
        userId,
        roleInClass,
      });
    }
  }

  revalidateClassPages();
}

export async function removeEnrollment(classId: string, userId: string) {
  await requireRole(["ADMIN"]);

  await db
    .delete(enrollments)
    .where(and(eq(enrollments.classId, classId), eq(enrollments.userId, userId)));

  revalidateClassPages();
}

export async function getClassEnrollments(classId: string) {
  await requireRole(["ADMIN", "TEACHER"]);

  return db
    .select({
      id: enrollments.id,
      classId: enrollments.classId,
      roleInClass: enrollments.roleInClass,
      userId: user.id,
      name: user.name,
      email: user.email,
    })
    .from(enrollments)
    .innerJoin(user, eq(enrollments.userId, user.id))
    .where(eq(enrollments.classId, classId));
}

export async function getTeacherClassById(classId: string) {
  const session = await requireRole(["ADMIN", "TEACHER"]);

  if (session.user.role === "TEACHER") {
    const isEnrolled = await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.classId, classId),
          eq(enrollments.userId, session.user.id),
          eq(enrollments.roleInClass, "TEACHER"),
        ),
      )
      .limit(1);

    if (!isEnrolled[0]) throw new Error("FORBIDDEN");
  }

  const classRow = await db.select().from(classes).where(eq(classes.id, classId)).limit(1);
  if (!classRow[0]) throw new Error("Kelas tidak ditemukan.");

  const members = await db
    .select({
      classId: enrollments.classId,
      roleInClass: enrollments.roleInClass,
      userId: user.id,
      name: user.name,
      email: user.email,
    })
    .from(enrollments)
    .innerJoin(user, eq(enrollments.userId, user.id))
    .where(eq(enrollments.classId, classId));

  return {
    ...classRow[0],
    teachers: members
      .filter((m) => m.roleInClass === "TEACHER")
      .map((m) => ({ userId: m.userId, name: m.name, email: m.email })),
    students: members
      .filter((m) => m.roleInClass === "STUDENT")
      .map((m) => ({ userId: m.userId, name: m.name, email: m.email })),
  };
}

export async function getStudentClassById(classId: string) {
  const session = await requireRole(["STUDENT"]);

  const isEnrolled = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.classId, classId),
        eq(enrollments.userId, session.user.id),
        eq(enrollments.roleInClass, "STUDENT"),
      ),
    )
    .limit(1);

  if (!isEnrolled[0]) {
    throw new Error("FORBIDDEN");
  }

  const classRow = await db.select().from(classes).where(eq(classes.id, classId)).limit(1);
  if (!classRow[0]) throw new Error("Kelas tidak ditemukan.");

  return classRow[0];
}
