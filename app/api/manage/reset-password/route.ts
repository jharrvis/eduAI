import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { account, user } from "@/lib/auth-schema";
import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role?.toUpperCase();
    if (role !== "ADMIN" && role !== "TEACHER") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as {
      email?: string;
      newPassword?: string;
    };

    const email = body.email?.trim().toLowerCase();
    const newPassword = body.newPassword?.trim();

    if (!email || !newPassword) {
      return NextResponse.json(
        { message: "Email dan password baru wajib diisi." },
        { status: 400 },
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { message: "Password minimal 8 karakter." },
        { status: 400 },
      );
    }

    const targetUser = await db
      .select({ id: user.id, email: user.email })
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    if (!targetUser[0]) {
      return NextResponse.json(
        { message: "User tidak ditemukan." },
        { status: 404 },
      );
    }

    const targetUserId = targetUser[0].id;
    const hashedPassword = await hashPassword(newPassword);

    const existingCredential = await db
      .select({ id: account.id })
      .from(account)
      .where(
        and(
          eq(account.userId, targetUserId),
          eq(account.providerId, "credential"),
        ),
      )
      .limit(1);

    if (existingCredential[0]) {
      await db
        .update(account)
        .set({
          password: hashedPassword,
          updatedAt: new Date(),
        })
        .where(eq(account.id, existingCredential[0].id));
    } else {
      await db.insert(account).values({
        id: crypto.randomUUID(),
        userId: targetUserId,
        accountId: targetUserId,
        providerId: "credential",
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return NextResponse.json({
      status: true,
      message: "Password berhasil direset.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server." },
      { status: 500 },
    );
  }
}
