"use server";

import { and, asc, eq, inArray, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/app/actions/_auth";
import { db } from "@/lib/db";
import { classes, enrollments, materials } from "@/lib/schema";

type AppRole = "ADMIN" | "TEACHER" | "STUDENT";

async function getAccessibleClassIds(userId: string, role: AppRole) {
  if (role === "ADMIN") {
    const all = await db.select({ id: classes.id }).from(classes);
    return all.map((item) => item.id);
  }

  const rows = await db
    .select({ classId: enrollments.classId })
    .from(enrollments)
    .where(eq(enrollments.userId, userId));

  return rows.map((item) => item.classId);
}

function revalidateMaterialPages() {
  revalidatePath("/admin/materials");
  revalidatePath("/admin/dashboard");
  revalidatePath("/teacher/dashboard");
  revalidatePath("/student/dashboard");
  revalidatePath("/student/materials");
}

export async function getMaterials(classId?: string) {
  const session = await requireRole(["ADMIN", "TEACHER", "STUDENT"]);
  const role = session.user.role as AppRole;

  const classIds = await getAccessibleClassIds(session.user.id, role);
  if (classIds.length === 0) return [];

  const now = new Date();
  const baseWhere = classId
    ? and(inArray(materials.classId, classIds), eq(materials.classId, classId))
    : inArray(materials.classId, classIds);

  const whereClause = role === "STUDENT" ? and(baseWhere, lte(materials.scheduledAt, now)) : baseWhere;

  return db
    .select({
      id: materials.id,
      classId: materials.classId,
      title: materials.title,
      content: materials.content,
      fileUrl: materials.fileUrl,
      scheduledAt: materials.scheduledAt,
      createdAt: materials.createdAt,
      className: classes.name,
    })
    .from(materials)
    .innerJoin(classes, eq(classes.id, materials.classId))
    .where(whereClause)
    .orderBy(asc(materials.scheduledAt));
}

export async function createMaterial(data: {
  classId: string;
  title: string;
  content?: string;
  fileUrl?: string;
  scheduledAt: string;
}) {
  const session = await requireRole(["ADMIN", "TEACHER"]);

  if (session.user.role === "TEACHER") {
    const teaching = await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.userId, session.user.id),
          eq(enrollments.classId, data.classId),
          eq(enrollments.roleInClass, "TEACHER"),
        ),
      )
      .limit(1);

    if (!teaching[0]) {
      throw new Error("FORBIDDEN");
    }
  }

  await db.insert(materials).values({
    classId: data.classId,
    title: data.title.trim(),
    content: data.content?.trim() || null,
    fileUrl: data.fileUrl?.trim() || null,
    scheduledAt: new Date(data.scheduledAt),
  });

  revalidateMaterialPages();
}

export async function updateMaterial(
  id: string,
  data: Partial<{
    title: string;
    content: string;
    fileUrl: string;
    scheduledAt: string;
  }>,
) {
  await requireRole(["ADMIN", "TEACHER"]);

  const payload: Partial<typeof materials.$inferInsert> = {};
  if (data.title !== undefined) payload.title = data.title.trim();
  if (data.content !== undefined) payload.content = data.content.trim() || null;
  if (data.fileUrl !== undefined) payload.fileUrl = data.fileUrl.trim() || null;
  if (data.scheduledAt !== undefined) payload.scheduledAt = new Date(data.scheduledAt);

  if (Object.keys(payload).length === 0) return;

  await db.update(materials).set(payload).where(eq(materials.id, id));
  revalidateMaterialPages();
}

export async function deleteMaterial(id: string) {
  await requireRole(["ADMIN", "TEACHER"]);

  await db.delete(materials).where(eq(materials.id, id));
  revalidateMaterialPages();
}

