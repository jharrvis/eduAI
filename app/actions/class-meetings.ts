"use server";

import { and, asc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/app/actions/_auth";
import { db } from "@/lib/db";
import { classMeetings, enrollments } from "@/lib/schema";

type AppRole = "ADMIN" | "TEACHER" | "STUDENT";
type BulkType = "WEEKLY" | "BIWEEKLY" | "CUSTOM";

function computeEndDate(start: Date, durationMinutes: number) {
  const safeDuration = Math.max(1, durationMinutes);
  return new Date(start.getTime() + safeDuration * 60 * 1000);
}

async function assertClassAccess(userId: string, role: AppRole, classId: string) {
  if (role === "ADMIN") return;

  const whereClause =
    role === "TEACHER"
      ? and(
          eq(enrollments.userId, userId),
          eq(enrollments.classId, classId),
          eq(enrollments.roleInClass, "TEACHER"),
        )
      : and(eq(enrollments.userId, userId), eq(enrollments.classId, classId));

  const rows = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(whereClause)
    .limit(1);

  if (!rows[0]) throw new Error("FORBIDDEN");
}

function revalidateMeetingPages() {
  revalidatePath("/admin/classes");
  revalidatePath("/teacher/classes");
  revalidatePath("/teacher/materials");
  revalidatePath("/teacher/assignments");
  revalidatePath("/student/classes");
  revalidatePath("/student/materials");
  revalidatePath("/student/assignments");
}

export async function getMeetings(classId: string) {
  const session = await requireRole(["ADMIN", "TEACHER", "STUDENT"]);
  const role = session.user.role as AppRole;

  await assertClassAccess(session.user.id, role, classId);

  return db
    .select()
    .from(classMeetings)
    .where(eq(classMeetings.classId, classId))
    .orderBy(asc(classMeetings.scheduledDate), asc(classMeetings.meetingNumber));
}

export async function createMeeting(data: {
  classId: string;
  meetingNumber: number;
  title: string;
  description?: string;
  scheduledDate: string;
  durationMinutes?: number;
  classRoomId?: string | null;
}) {
  const session = await requireRole(["ADMIN", "TEACHER"]);
  const role = session.user.role as AppRole;

  await assertClassAccess(session.user.id, role, data.classId);

  const startDate = new Date(data.scheduledDate);
  const durationMinutes = Math.max(1, data.durationMinutes ?? 90);

  await db.insert(classMeetings).values({
    classId: data.classId,
    classRoomId: data.classRoomId || null,
    meetingNumber: data.meetingNumber,
    title: data.title.trim(),
    description: data.description?.trim() || null,
    scheduledDate: startDate,
    endDate: computeEndDate(startDate, durationMinutes),
    durationMinutes,
  });

  revalidateMeetingPages();
}

export async function createMeetingsBulk(
  classId: string,
  config: {
    type: BulkType;
    startDate: string;
    count?: number;
    customDates?: string[];
    durationMinutes?: number;
    classRoomId?: string | null;
  },
) {
  const session = await requireRole(["ADMIN", "TEACHER"]);
  const role = session.user.role as AppRole;

  await assertClassAccess(session.user.id, role, classId);

  const existing = await db
    .select({ meetingNumber: classMeetings.meetingNumber })
    .from(classMeetings)
    .where(eq(classMeetings.classId, classId))
    .orderBy(asc(classMeetings.meetingNumber));

  const nextStart = existing.length > 0 ? Math.max(...existing.map((m) => m.meetingNumber)) + 1 : 1;

  const payload: Array<typeof classMeetings.$inferInsert> = [];
  const durationMinutes = Math.max(1, config.durationMinutes ?? 90);

  if (config.type === "CUSTOM") {
    const customDates = (config.customDates || []).filter(Boolean);
    customDates.forEach((date, index) => {
      const start = new Date(date);
      payload.push({
        classId,
        classRoomId: config.classRoomId || null,
        meetingNumber: nextStart + index,
        title: `Pertemuan ${nextStart + index}`,
        scheduledDate: start,
        endDate: computeEndDate(start, durationMinutes),
        durationMinutes,
      });
    });
  } else {
    const count = Math.max(1, config.count || 1);
    const interval = config.type === "BIWEEKLY" ? 14 : 7;
    const start = new Date(config.startDate);
    for (let i = 0; i < count; i += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + i * interval);
      payload.push({
        classId,
        classRoomId: config.classRoomId || null,
        meetingNumber: nextStart + i,
        title: `Pertemuan ${nextStart + i}`,
        scheduledDate: date,
        endDate: computeEndDate(date, durationMinutes),
        durationMinutes,
      });
    }
  }

  if (payload.length > 0) {
    await db.insert(classMeetings).values(payload);
  }

  revalidateMeetingPages();
}

export async function updateMeeting(
  id: string,
  data: Partial<{
    meetingNumber: number;
    title: string;
    description: string;
    scheduledDate: string;
    durationMinutes: number;
    classRoomId: string | null;
  }>,
) {
  const session = await requireRole(["ADMIN", "TEACHER"]);
  const role = session.user.role as AppRole;

  const current = await db
    .select({
      classId: classMeetings.classId,
      scheduledDate: classMeetings.scheduledDate,
      durationMinutes: classMeetings.durationMinutes,
    })
    .from(classMeetings)
    .where(eq(classMeetings.id, id))
    .limit(1);

  if (!current[0]) throw new Error("Jadwal pertemuan tidak ditemukan.");
  await assertClassAccess(session.user.id, role, current[0].classId);

  const payload: Partial<typeof classMeetings.$inferInsert> = {};
  if (data.meetingNumber !== undefined) payload.meetingNumber = data.meetingNumber;
  if (data.title !== undefined) payload.title = data.title.trim();
  if (data.description !== undefined) payload.description = data.description.trim() || null;
  if (data.classRoomId !== undefined) payload.classRoomId = data.classRoomId || null;
  const nextStart =
    data.scheduledDate !== undefined ? new Date(data.scheduledDate) : current[0].scheduledDate;
  const nextDuration =
    data.durationMinutes !== undefined
      ? Math.max(1, data.durationMinutes)
      : current[0].durationMinutes;
  if (data.scheduledDate !== undefined) payload.scheduledDate = nextStart;
  if (data.durationMinutes !== undefined) payload.durationMinutes = nextDuration;
  if (data.scheduledDate !== undefined || data.durationMinutes !== undefined) {
    payload.endDate = computeEndDate(nextStart, nextDuration);
  }
  if (Object.keys(payload).length === 0) return;

  await db.update(classMeetings).set(payload).where(eq(classMeetings.id, id));
  revalidateMeetingPages();
}

export async function deleteMeeting(id: string) {
  const session = await requireRole(["ADMIN", "TEACHER"]);
  const role = session.user.role as AppRole;

  const current = await db
    .select({ classId: classMeetings.classId })
    .from(classMeetings)
    .where(eq(classMeetings.id, id))
    .limit(1);

  if (!current[0]) return;
  await assertClassAccess(session.user.id, role, current[0].classId);

  await db.delete(classMeetings).where(eq(classMeetings.id, id));
  revalidateMeetingPages();
}

export async function getMeetingsByIds(ids: string[]) {
  if (ids.length === 0) return [];
  return db.select().from(classMeetings).where(inArray(classMeetings.id, ids));
}
