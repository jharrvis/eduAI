"use server";

import { and, asc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/app/actions/_auth";
import { user } from "@/lib/auth-schema";
import { db } from "@/lib/db";
import { assignments, classes, enrollments, materials, studentProfiles, submissions } from "@/lib/schema";

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

export async function getAssignments(classId?: string) {
  const session = await requireRole(["ADMIN", "TEACHER", "STUDENT"]);
  const role = session.user.role as AppRole;
  const classIds = await getAccessibleClassIds(session.user.id, role);

  if (classIds.length === 0) return [];

  const whereClass = classId
    ? and(inArray(materials.classId, classIds), eq(materials.classId, classId))
    : inArray(materials.classId, classIds);

  return db
    .select({
      id: assignments.id,
      materialId: assignments.materialId,
      title: assignments.title,
      instructions: assignments.instructions,
      dueDate: assignments.dueDate,
      classId: materials.classId,
      className: classes.name,
      materialTitle: materials.title,
    })
    .from(assignments)
    .innerJoin(materials, eq(assignments.materialId, materials.id))
    .innerJoin(classes, eq(materials.classId, classes.id))
    .where(whereClass)
    .orderBy(asc(assignments.dueDate));
}

export async function createAssignment(data: {
  materialId: string;
  title: string;
  instructions?: string;
  dueDate: string;
  aiPromptContext?: string;
}) {
  await requireRole(["ADMIN", "TEACHER"]);

  await db.insert(assignments).values({
    materialId: data.materialId,
    title: data.title.trim(),
    instructions: data.instructions?.trim() || null,
    dueDate: new Date(data.dueDate),
    aiPromptContext: data.aiPromptContext?.trim() || null,
  });

  revalidateAssignmentPages();
}

export async function getSubmissions(assignmentId: string) {
  await requireRole(["ADMIN", "TEACHER"]);

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
  await requireRole(["ADMIN", "TEACHER"]);

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
