"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/app/actions/_auth";
import { db } from "@/lib/db";
import { classRooms } from "@/lib/schema";

function revalidateClassRoomPages() {
  revalidatePath("/admin/classrooms");
}

export async function getClassRooms() {
  await requireRole(["ADMIN"]);
  return db.select().from(classRooms);
}

export async function createClassRoom(data: {
  code: string;
  name: string;
  location?: string;
  capacity?: number;
  isActive?: boolean;
}) {
  await requireRole(["ADMIN"]);

  const code = data.code.trim();
  const name = data.name.trim();
  if (!code) throw new Error("Kode ruang wajib diisi.");
  if (!name) throw new Error("Nama ruang wajib diisi.");

  const payload: typeof classRooms.$inferInsert = {
    code,
    name,
    location: data.location?.trim() || null,
    capacity: data.capacity ?? null,
    isActive: data.isActive ?? true,
  };

  const result = await db
    .insert(classRooms)
    .values(payload)
    .returning({ id: classRooms.id });

  revalidateClassRoomPages();
  return result[0];
}

export async function updateClassRoom(
  id: string,
  data: Partial<{
    code: string;
    name: string;
    location: string;
    capacity: number | null;
    isActive: boolean;
  }>,
) {
  await requireRole(["ADMIN"]);

  const payload: Partial<typeof classRooms.$inferInsert> = {};
  if (data.code !== undefined) payload.code = data.code.trim();
  if (data.name !== undefined) payload.name = data.name.trim();
  if (data.location !== undefined) payload.location = data.location.trim() || null;
  if (data.capacity !== undefined) payload.capacity = data.capacity;
  if (data.isActive !== undefined) payload.isActive = data.isActive;

  if (Object.keys(payload).length === 0) return;
  await db.update(classRooms).set(payload).where(eq(classRooms.id, id));
  revalidateClassRoomPages();
}

export async function deleteClassRoom(id: string) {
  await requireRole(["ADMIN"]);

  await db.delete(classRooms).where(eq(classRooms.id, id));
  revalidateClassRoomPages();
}
