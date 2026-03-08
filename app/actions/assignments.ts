"use server";

import { and, asc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/app/actions/_auth";
import { user } from "@/lib/auth-schema";
import { db } from "@/lib/db";
import { assignments, classMeetings, classes, enrollments, materials, studentProfiles, submissions } from "@/lib/schema";

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

function revalidateAssignmentPages() {
  revalidatePath("/teacher/dashboard");
  revalidatePath("/teacher/assignments");
  revalidatePath("/student/dashboard");
  revalidatePath("/student/assignments");
  revalidatePath("/student/materials");
}

async function resolveClassIdByAssignmentId(assignmentId: string) {
  const rows = await db
    .select({
      materialClassId: materials.classId,
      meetingClassId: classMeetings.classId,
    })
    .from(assignments)
    .leftJoin(materials, eq(assignments.materialId, materials.id))
    .leftJoin(classMeetings, eq(assignments.meetingId, classMeetings.id))
    .where(eq(assignments.id, assignmentId))
    .limit(1);

  return rows[0]?.materialClassId || rows[0]?.meetingClassId || null;
}

export async function getAssignments(classId?: string) {
  const session = await requireRole(["ADMIN", "TEACHER", "STUDENT"]);
  const role = session.user.role as AppRole;
  const classIds = await getAccessibleClassIds(session.user.id, role);

  if (classIds.length === 0) return [];
  const rows = await db
    .select({
      id: assignments.id,
      materialId: assignments.materialId,
      meetingId: assignments.meetingId,
      title: assignments.title,
      instructions: assignments.instructions,
      dueDate: assignments.dueDate,
      materialClassId: materials.classId,
      materialClassName: classes.name,
      meetingClassId: classMeetings.classId,
      meetingTitle: classMeetings.title,
      meetingNumber: classMeetings.meetingNumber,
      materialTitle: materials.title,
    })
    .from(assignments)
    .leftJoin(materials, eq(assignments.materialId, materials.id))
    .leftJoin(classes, eq(materials.classId, classes.id))
    .leftJoin(classMeetings, eq(assignments.meetingId, classMeetings.id))
    .orderBy(asc(assignments.dueDate));

  return rows
    .map((row) => {
      const resolvedClassId = row.materialClassId || row.meetingClassId;
      return {
        id: row.id,
        materialId: row.materialId,
        meetingId: row.meetingId,
        title: row.title,
        instructions: row.instructions,
        dueDate: row.dueDate,
        classId: resolvedClassId,
        className: row.materialClassName || "-",
        meetingTitle: row.meetingTitle,
        meetingNumber: row.meetingNumber,
        materialTitle: row.materialTitle || "-",
      };
    })
    .filter((row) => {
      if (!row.classId) return false;
      if (!classIds.includes(row.classId)) return false;
      if (classId && row.classId !== classId) return false;
      return true;
    });
}

export async function createAssignment(data: {
  materialId?: string | null;
  meetingId?: string | null;
  title: string;
  instructions?: string;
  dueDate: string;
  aiPromptContext?: string;
}) {
  const session = await requireRole(["ADMIN", "TEACHER"]);

  if (!data.materialId && !data.meetingId) {
    throw new Error("Material atau pertemuan wajib dipilih.");
  }

  let resolvedClassId: string | null = null;
  let materialId: string | null = data.materialId || null;
  let meetingId: string | null = data.meetingId || null;

  if (materialId) {
    const materialRows = await db
      .select({ id: materials.id, classId: materials.classId, meetingId: materials.meetingId })
      .from(materials)
      .where(eq(materials.id, materialId))
      .limit(1);
    if (!materialRows[0]) throw new Error("Material tidak ditemukan.");
    resolvedClassId = materialRows[0].classId;
    if (!meetingId && materialRows[0].meetingId) {
      meetingId = materialRows[0].meetingId;
    }
  }

  if (meetingId) {
    const meetingRows = await db
      .select({ id: classMeetings.id, classId: classMeetings.classId })
      .from(classMeetings)
      .where(eq(classMeetings.id, meetingId))
      .limit(1);
    if (!meetingRows[0]) throw new Error("Pertemuan tidak ditemukan.");
    if (resolvedClassId && resolvedClassId !== meetingRows[0].classId) {
      throw new Error("Material dan pertemuan harus berada pada kelas yang sama.");
    }
    resolvedClassId = meetingRows[0].classId;
  }

  if (!resolvedClassId) throw new Error("Kelas assignment tidak ditemukan.");

  if (session.user.role === "TEACHER") {
    const canManage = await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.userId, session.user.id),
          eq(enrollments.classId, resolvedClassId),
          eq(enrollments.roleInClass, "TEACHER"),
        ),
      )
      .limit(1);
    if (!canManage[0]) throw new Error("FORBIDDEN");
  }

  await db.insert(assignments).values({
    materialId,
    meetingId,
    title: data.title.trim(),
    instructions: data.instructions?.trim() || null,
    dueDate: new Date(data.dueDate),
    aiPromptContext: data.aiPromptContext?.trim() || null,
  });

  revalidateAssignmentPages();
}

export async function getSubmissions(assignmentId: string) {
  const session = await requireRole(["ADMIN", "TEACHER"]);

  if (session.user.role === "TEACHER") {
    const assignmentRows = await db
      .select({
        materialClassId: materials.classId,
        meetingClassId: classMeetings.classId,
      })
      .from(assignments)
      .leftJoin(materials, eq(assignments.materialId, materials.id))
      .leftJoin(classMeetings, eq(assignments.meetingId, classMeetings.id))
      .where(eq(assignments.id, assignmentId))
      .limit(1);
    const classId = assignmentRows[0]?.materialClassId || assignmentRows[0]?.meetingClassId;
    if (!classId) throw new Error("Assignment tidak valid.");

    const canManage = await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.userId, session.user.id),
          eq(enrollments.classId, classId),
          eq(enrollments.roleInClass, "TEACHER"),
        ),
      )
      .limit(1);
    if (!canManage[0]) throw new Error("FORBIDDEN");
  }

  return db
    .select({
      id: submissions.id,
      studentId: submissions.studentId,
      answerText: submissions.answerText,
      fileUrl: submissions.fileUrl,
      aiFeedback: submissions.aiFeedback,
      aiScore: submissions.aiScore,
      finalGrade: submissions.finalGrade,
      gradedAt: submissions.gradedAt,
      status: submissions.status,
      studentName: user.name,
      studentEmail: user.email,
      nim: studentProfiles.nim,
    })
    .from(submissions)
    .innerJoin(user, eq(submissions.studentId, user.id))
    .leftJoin(studentProfiles, eq(studentProfiles.userId, user.id))
    .where(eq(submissions.assignmentId, assignmentId))
    .orderBy(asc(user.name));
}

export async function overrideGrade(submissionId: string, finalGrade: number) {
  const session = await requireRole(["ADMIN", "TEACHER"]);

  if (session.user.role === "TEACHER") {
    const rows = await db
      .select({
        materialClassId: materials.classId,
        meetingClassId: classMeetings.classId,
      })
      .from(submissions)
      .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
      .leftJoin(materials, eq(assignments.materialId, materials.id))
      .leftJoin(classMeetings, eq(assignments.meetingId, classMeetings.id))
      .where(eq(submissions.id, submissionId))
      .limit(1);

    const classId = rows[0]?.materialClassId || rows[0]?.meetingClassId;
    if (!classId) throw new Error("Data submission tidak valid.");

    const canManage = await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.userId, session.user.id),
          eq(enrollments.classId, classId),
          eq(enrollments.roleInClass, "TEACHER"),
        ),
      )
      .limit(1);
    if (!canManage[0]) throw new Error("FORBIDDEN");
  }

  const normalized = Number.isFinite(finalGrade)
    ? Math.max(0, Math.min(100, Math.round(finalGrade)))
    : 0;

  await db
    .update(submissions)
    .set({
      finalGrade: normalized,
      status: "GRADED",
      gradedAt: new Date(),
    })
    .where(eq(submissions.id, submissionId));

  revalidateAssignmentPages();
}

export async function updateAssignment(
  id: string,
  data: Partial<{
    title: string;
    instructions: string;
    dueDate: string;
    aiPromptContext: string;
    materialId: string | null;
    meetingId: string | null;
  }>,
) {
  const session = await requireRole(["ADMIN", "TEACHER"]);
  const classId = await resolveClassIdByAssignmentId(id);
  if (!classId) throw new Error("Assignment tidak ditemukan.");

  if (session.user.role === "TEACHER") {
    const canManage = await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.userId, session.user.id),
          eq(enrollments.classId, classId),
          eq(enrollments.roleInClass, "TEACHER"),
        ),
      )
      .limit(1);
    if (!canManage[0]) throw new Error("FORBIDDEN");
  }

  const payload: Partial<typeof assignments.$inferInsert> = {};
  if (data.title !== undefined) payload.title = data.title.trim();
  if (data.instructions !== undefined) payload.instructions = data.instructions.trim() || null;
  if (data.dueDate !== undefined) payload.dueDate = new Date(data.dueDate);
  if (data.aiPromptContext !== undefined) payload.aiPromptContext = data.aiPromptContext.trim() || null;
  if (data.materialId !== undefined) payload.materialId = data.materialId;
  if (data.meetingId !== undefined) payload.meetingId = data.meetingId;
  if (Object.keys(payload).length === 0) return;

  await db.update(assignments).set(payload).where(eq(assignments.id, id));
  revalidateAssignmentPages();
}

export async function deleteAssignment(id: string) {
  const session = await requireRole(["ADMIN", "TEACHER"]);
  const classId = await resolveClassIdByAssignmentId(id);
  if (!classId) return;

  if (session.user.role === "TEACHER") {
    const canManage = await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.userId, session.user.id),
          eq(enrollments.classId, classId),
          eq(enrollments.roleInClass, "TEACHER"),
        ),
      )
      .limit(1);
    if (!canManage[0]) throw new Error("FORBIDDEN");
  }

  await db.delete(assignments).where(eq(assignments.id, id));
  revalidateAssignmentPages();
}
