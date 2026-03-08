"use server";

import { and, asc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/app/actions/_auth";
import { db } from "@/lib/db";
import { assignments, classMeetings, classes, enrollments, materials, submissions } from "@/lib/schema";

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
      materialClassName: classes.name,
      materialClassId: classes.id,
      meetingClassId: classMeetings.classId,
      meetingTitle: classMeetings.title,
      meetingNumber: classMeetings.meetingNumber,
    })
    .from(submissions)
    .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
    .leftJoin(materials, eq(assignments.materialId, materials.id))
    .leftJoin(classes, eq(materials.classId, classes.id))
    .leftJoin(classMeetings, eq(assignments.meetingId, classMeetings.id))
    .where(eq(submissions.studentId, session.user.id))
    .orderBy(asc(assignments.dueDate))
    .then((rows) =>
      rows.map((row) => ({
        ...row,
        classId: row.materialClassId || row.meetingClassId,
        className: row.materialClassName || "-",
      })),
    );
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
      meetingId: assignments.meetingId,
      title: assignments.title,
      instructions: assignments.instructions,
      dueDate: assignments.dueDate,
      materialClassId: materials.classId,
      meetingClassId: classMeetings.classId,
      className: classes.name,
      meetingTitle: classMeetings.title,
      meetingNumber: classMeetings.meetingNumber,
      materialTitle: materials.title,
    })
    .from(assignments)
    .leftJoin(materials, eq(assignments.materialId, materials.id))
    .leftJoin(classes, eq(materials.classId, classes.id))
    .leftJoin(classMeetings, eq(assignments.meetingId, classMeetings.id))
    .orderBy(asc(assignments.dueDate))
    .then((rows) =>
      rows
        .map((row) => ({
          ...row,
          classId: row.materialClassId || row.meetingClassId,
        }))
        .filter((row) => {
          if (!row.classId) return false;
          if (!classIds.includes(row.classId)) return false;
          if (classId && row.classId !== classId) return false;
          return true;
        }),
    );

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

  const assignmentRow = await db
    .select({
      materialClassId: materials.classId,
      meetingClassId: classMeetings.classId,
    })
    .from(assignments)
    .leftJoin(materials, eq(assignments.materialId, materials.id))
    .leftJoin(classMeetings, eq(assignments.meetingId, classMeetings.id))
    .where(eq(assignments.id, assignmentId))
    .limit(1);

  const classId = assignmentRow[0]?.materialClassId || assignmentRow[0]?.meetingClassId;
  if (!classId) throw new Error("Assignment tidak valid.");

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
  if (!isEnrolled[0]) throw new Error("FORBIDDEN");

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

