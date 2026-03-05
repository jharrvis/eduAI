"use server";

import { and, asc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/app/actions/_auth";
import { db } from "@/lib/db";
import { assignments, classes, enrollments, materials, submissions } from "@/lib/schema";

export async function getMySubmissions() {
  const session = await requireRole(["STUDENT"]);

  return db
    .select({
      id: submissions.id,
      assignmentId: submissions.assignmentId,
      answerText: submissions.answerText,
      fileUrl: submissions.fileUrl,
      aiFeedback: submissions.aiFeedback,
      aiScore: submissions.aiScore,
      finalGrade: submissions.finalGrade,
      status: submissions.status,
      dueDate: assignments.dueDate,
      assignmentTitle: assignments.title,
      materialTitle: materials.title,
      className: classes.name,
      classId: classes.id,
    })
    .from(submissions)
    .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
    .innerJoin(materials, eq(assignments.materialId, materials.id))
    .innerJoin(classes, eq(materials.classId, classes.id))
    .where(eq(submissions.studentId, session.user.id))
    .orderBy(asc(assignments.dueDate));
}

export async function getAssignmentsWithMySubmission(classId?: string) {
  const session = await requireRole(["STUDENT"]);

  const enrolled = await db
    .select({ classId: enrollments.classId })
    .from(enrollments)
    .where(and(eq(enrollments.userId, session.user.id), eq(enrollments.roleInClass, "STUDENT")));

  const classIds = enrolled.map((row) => row.classId);
  if (classIds.length === 0) return [];

  const assignmentRows = await db
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
    .where(
      classId
        ? and(inArray(materials.classId, classIds), eq(materials.classId, classId))
        : inArray(materials.classId, classIds),
    )
    .orderBy(asc(assignments.dueDate));

  if (assignmentRows.length === 0) return [];

  const submissionRows = await db
    .select()
    .from(submissions)
    .where(
      and(
        eq(submissions.studentId, session.user.id),
        inArray(
          submissions.assignmentId,
          assignmentRows.map((item) => item.id),
        ),
      ),
    );

  return assignmentRows.map((item) => {
    const mine = submissionRows.find((sub) => sub.assignmentId === item.id) || null;
    return {
      ...item,
      mySubmission: mine,
    };
  });
}

export async function submitAssignment(
  assignmentId: string,
  payload: { answerText: string; fileUrl?: string },
) {
  const session = await requireRole(["STUDENT"]);

  const existing = await db
    .select({ id: submissions.id })
    .from(submissions)
    .where(and(eq(submissions.assignmentId, assignmentId), eq(submissions.studentId, session.user.id)))
    .limit(1);

  if (existing[0]) {
    await db
      .update(submissions)
      .set({
        answerText: payload.answerText.trim(),
        fileUrl: payload.fileUrl?.trim() || null,
        status: "PENDING",
        aiFeedback: null,
        aiScore: null,
        finalGrade: null,
        gradedAt: null,
      })
      .where(eq(submissions.id, existing[0].id));
  } else {
    await db.insert(submissions).values({
      assignmentId,
      studentId: session.user.id,
      answerText: payload.answerText.trim(),
      fileUrl: payload.fileUrl?.trim() || null,
      status: "PENDING",
    });
  }

  revalidatePath("/student/materials");
  revalidatePath("/student/assignments");
  revalidatePath("/student/dashboard");
}

