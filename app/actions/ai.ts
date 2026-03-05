"use server";

import { and, asc, eq, inArray } from "drizzle-orm";
import { requireRole } from "@/app/actions/_auth";
import { openrouter } from "@/lib/ai";
import { db } from "@/lib/db";
import { chatMessages, enrollments, materials } from "@/lib/schema";

async function assertClassAccess(userId: string, classId: string) {
  const access = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(and(eq(enrollments.userId, userId), eq(enrollments.classId, classId)))
    .limit(1);

  if (!access[0]) throw new Error("FORBIDDEN");
}

export async function getClassChatMessages(classId: string) {
  const session = await requireRole(["STUDENT", "TEACHER", "ADMIN"]);
  await assertClassAccess(session.user.id, classId);

  return db
    .select({
      id: chatMessages.id,
      role: chatMessages.role,
      content: chatMessages.content,
      createdAt: chatMessages.createdAt,
    })
    .from(chatMessages)
    .where(and(eq(chatMessages.classId, classId), eq(chatMessages.userId, session.user.id)))
    .orderBy(asc(chatMessages.createdAt));
}

export async function chatWithTutor(classId: string, message: string) {
  const session = await requireRole(["STUDENT"]);
  await assertClassAccess(session.user.id, classId);

  const cleanMessage = message.trim();
  if (!cleanMessage) throw new Error("Pesan tidak boleh kosong.");

  await db.insert(chatMessages).values({
    classId,
    userId: session.user.id,
    role: "user",
    content: cleanMessage,
  });

  const classMaterials = await db
    .select({ title: materials.title, content: materials.content })
    .from(materials)
    .where(eq(materials.classId, classId))
    .orderBy(asc(materials.createdAt));

  const context = classMaterials
    .map((item) => `Judul: ${item.title}\nIsi: ${item.content || "-"}`)
    .join("\n\n");

  let assistantReply = "Maaf, AI Tutor belum aktif. Silakan konfigurasi OPENROUTER_API_KEY.";

  if (openrouter) {
    const response = await openrouter.chat.completions.create({
      model: process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Anda adalah AI tutor LMS. Jawab ringkas, akurat, dan gunakan bahasa Indonesia yang jelas.",
        },
        {
          role: "user",
          content: `Konteks materi kelas:\n${context}\n\nPertanyaan siswa:\n${cleanMessage}`,
        },
      ],
      temperature: 0.3,
    });

    assistantReply = response.choices[0]?.message?.content?.trim() || assistantReply;
  }

  await db.insert(chatMessages).values({
    classId,
    userId: session.user.id,
    role: "assistant",
    content: assistantReply,
  });

  return assistantReply;
}

