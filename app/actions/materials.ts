"use server";

import { and, asc, eq, inArray, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/app/actions/_auth";
import { db } from "@/lib/db";
import { classMeetings, classes, enrollments, materials } from "@/lib/schema";

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
      meetingId: materials.meetingId,
      meetingTitle: classMeetings.title,
      meetingNumber: classMeetings.meetingNumber,
      scheduledAt: materials.scheduledAt,
      createdAt: materials.createdAt,
      className: classes.name,
    })
    .from(materials)
    .innerJoin(classes, eq(classes.id, materials.classId))
    .leftJoin(classMeetings, eq(classMeetings.id, materials.meetingId))
    .where(whereClause)
    .orderBy(asc(materials.scheduledAt));
}

export async function createMaterial(data: {
  classId: string;
  meetingId?: string;
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

  let scheduledAt = new Date(data.scheduledAt);
  let meetingId: string | null = null;

  if (data.meetingId) {
    const meetingRows = await db
      .select({
        id: classMeetings.id,
        classId: classMeetings.classId,
        scheduledDate: classMeetings.scheduledDate,
      })
      .from(classMeetings)
      .where(eq(classMeetings.id, data.meetingId))
      .limit(1);

    if (!meetingRows[0]) throw new Error("Pertemuan tidak ditemukan.");
    if (meetingRows[0].classId !== data.classId) {
      throw new Error("Pertemuan tidak sesuai dengan kelas.");
    }

    scheduledAt = meetingRows[0].scheduledDate;
    meetingId = meetingRows[0].id;
  }

  await db.insert(materials).values({
    classId: data.classId,
    meetingId,
    title: data.title.trim(),
    content: data.content?.trim() || null,
    fileUrl: data.fileUrl?.trim() || null,
    scheduledAt,
  });

  revalidateMaterialPages();
}

export async function updateMaterial(
  id: string,
  data: Partial<{
    meetingId: string | null;
    title: string;
    content: string;
    fileUrl: string;
    scheduledAt: string;
  }>,
) {
  const session = await requireRole(["ADMIN", "TEACHER"]);

  const currentRows = await db
    .select({ classId: materials.classId })
    .from(materials)
    .where(eq(materials.id, id))
    .limit(1);

  if (!currentRows[0]) throw new Error("Materi tidak ditemukan.");

  if (session.user.role === "TEACHER") {
    const canManage = await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.userId, session.user.id),
          eq(enrollments.classId, currentRows[0].classId),
          eq(enrollments.roleInClass, "TEACHER"),
        ),
      )
      .limit(1);

    if (!canManage[0]) throw new Error("FORBIDDEN");
  }

  const payload: Partial<typeof materials.$inferInsert> = {};
  if (data.meetingId !== undefined) {
    if (!data.meetingId) {
      payload.meetingId = null;
    } else {
      const meetingRows = await db
        .select({
          id: classMeetings.id,
          classId: classMeetings.classId,
          scheduledDate: classMeetings.scheduledDate,
        })
        .from(classMeetings)
        .where(eq(classMeetings.id, data.meetingId))
        .limit(1);
      if (!meetingRows[0]) throw new Error("Pertemuan tidak ditemukan.");
      if (meetingRows[0].classId !== currentRows[0].classId) {
        throw new Error("Pertemuan tidak sesuai dengan kelas materi.");
      }
      payload.meetingId = meetingRows[0].id;
      payload.scheduledAt = meetingRows[0].scheduledDate;
    }
  }
  if (data.title !== undefined) payload.title = data.title.trim();
  if (data.content !== undefined) payload.content = data.content.trim() || null;
  if (data.fileUrl !== undefined) payload.fileUrl = data.fileUrl.trim() || null;
  if (data.scheduledAt !== undefined) payload.scheduledAt = new Date(data.scheduledAt);

  if (Object.keys(payload).length === 0) return;

  await db.update(materials).set(payload).where(eq(materials.id, id));
  revalidateMaterialPages();
}

export async function deleteMaterial(id: string) {
  const session = await requireRole(["ADMIN", "TEACHER"]);

  if (session.user.role === "TEACHER") {
    const row = await db
      .select({ classId: materials.classId })
      .from(materials)
      .where(eq(materials.id, id))
      .limit(1);

    if (row[0]) {
      const canManage = await db
        .select({ id: enrollments.id })
        .from(enrollments)
        .where(
          and(
            eq(enrollments.userId, session.user.id),
            eq(enrollments.classId, row[0].classId),
            eq(enrollments.roleInClass, "TEACHER"),
          ),
        )
        .limit(1);
      if (!canManage[0]) throw new Error("FORBIDDEN");
    }
  }

  await db.delete(materials).where(eq(materials.id, id));
  revalidateMaterialPages();
}

