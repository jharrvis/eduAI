import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireRole } from "@/app/actions/_auth";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = new Set([".pdf", ".doc", ".docx", ".txt"]);

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(request: Request) {
  try {
    await requireRole(["ADMIN", "TEACHER", "STUDENT"]);

    const formData = await request.formData();
    const file = formData.get("file");
    const rawScope = formData.get("scope");
    const scope = rawScope === "materials" || rawScope === "submissions" ? rawScope : "misc";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File tidak valid." }, { status: 400 });
    }

    if (file.size <= 0) {
      return NextResponse.json({ error: "File kosong." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Ukuran file maksimal 10MB." }, { status: 400 });
    }

    const extension = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      return NextResponse.json(
        { error: "Tipe file tidak didukung. Gunakan PDF/DOC/DOCX/TXT." },
        { status: 400 },
      );
    }

    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const uploadDir = path.join(process.cwd(), "public", "uploads", scope, year, month);
    await mkdir(uploadDir, { recursive: true });

    const safeBaseName = sanitizeFileName(path.basename(file.name, extension));
    const fileName = `${Date.now()}-${randomUUID()}-${safeBaseName}${extension}`;
    const filePath = path.join(uploadDir, fileName);

    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    const fileUrl = `/uploads/${scope}/${year}/${month}/${fileName}`;

    return NextResponse.json({
      fileUrl,
      fileName: file.name,
      size: file.size,
      type: file.type || "application/octet-stream",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unggah gagal.",
      },
      { status: 500 },
    );
  }
}
