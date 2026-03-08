"use server";

import { asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/app/actions/_auth";
import { db } from "@/lib/db";
import { majors } from "@/lib/schema";

function mapMajorDbError(error: unknown, fallbackMessage: string) {
  const err = error as {
    message?: string;
    code?: string;
    constraint?: string;
    detail?: string;
  };

  if (err?.code === "23505") {
    if (err.constraint === "majors_code_unique") {
      return new Error("Kode jurusan sudah digunakan.");
    }
    if (err.constraint === "majors_name_unique") {
      return new Error("Nama jurusan sudah terdaftar.");
    }
    const detail = (err.detail || "").toLowerCase();
    if (detail.includes("(code)")) return new Error("Kode jurusan sudah digunakan.");
    if (detail.includes("(name)")) return new Error("Nama jurusan sudah terdaftar.");
    return new Error("Data jurusan duplikat.");
  }

  if (err?.code === "42P01") {
    return new Error("Tabel jurusan belum tersedia. Jalankan migrasi database terlebih dahulu.");
  }

  const message = (err?.message || "").toLowerCase();
  if (message.includes("relation \"majors\" does not exist")) {
    return new Error("Tabel jurusan belum tersedia. Jalankan migrasi database terlebih dahulu.");
  }

  return new Error(fallbackMessage);
}

function revalidateMajorPages() {
  revalidatePath("/admin/majors");
  revalidatePath("/admin/students");
  revalidatePath("/teacher/students");
}

export async function getMajors() {
  await requireRole(["ADMIN", "TEACHER"]);
  return db.select().from(majors).orderBy(asc(majors.name));
}

export async function createMajor(data: {
  code: string;
  name: string;
  isActive?: boolean;
}) {
  await requireRole(["ADMIN"]);

  const code = data.code.trim().toUpperCase();
  const name = data.name.trim();
  if (!code) throw new Error("Kode jurusan wajib diisi.");
  if (!name) throw new Error("Nama jurusan wajib diisi.");

  try {
    await db.insert(majors).values({
      code,
      name,
      isActive: data.isActive ?? true,
    });
  } catch (error) {
    throw mapMajorDbError(error, "Gagal menyimpan jurusan.");
  }

  revalidateMajorPages();
}

export async function updateMajor(
  id: string,
  data: Partial<{ code: string; name: string; isActive: boolean }>,
) {
  await requireRole(["ADMIN"]);

  const payload: Partial<typeof majors.$inferInsert> = {};
  if (data.code !== undefined) payload.code = data.code.trim().toUpperCase();
  if (data.name !== undefined) payload.name = data.name.trim();
  if (data.isActive !== undefined) payload.isActive = data.isActive;

  if (Object.keys(payload).length === 0) return;

  try {
    await db
      .update(majors)
      .set({
        ...payload,
        updatedAt: new Date(),
      })
      .where(eq(majors.id, id));
  } catch (error) {
    throw mapMajorDbError(error, "Gagal memperbarui jurusan.");
  }

  revalidateMajorPages();
}

export async function deleteMajor(id: string) {
  await requireRole(["ADMIN"]);
  await db.delete(majors).where(eq(majors.id, id));
  revalidateMajorPages();
}
