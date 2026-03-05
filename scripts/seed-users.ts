import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

type SeedUser = {
  name: string;
  email: string;
  password: string;
  role: "ADMIN" | "TEACHER" | "STUDENT";
  nim?: string;
  major?: string;
};

const depsPromise = Promise.all([
  import("drizzle-orm"),
  import("../lib/auth"),
  import("../lib/db"),
  import("../lib/auth-schema"),
]);

const seedUsers: SeedUser[] = [
  {
    name: "Admin EduAI",
    email: "admin@eduai.local",
    password: "Admin12345!",
    role: "ADMIN",
  },
  {
    name: "Guru EduAI",
    email: "teacher@eduai.local",
    password: "Teacher12345!",
    role: "TEACHER",
  },
  {
    name: "Andi Mahasiswa",
    email: "student1@eduai.local",
    password: "Student12345!",
    role: "STUDENT",
    nim: "2301001",
    major: "Teknik Informatika",
  },
  {
    name: "Siti Mahasiswa",
    email: "student2@eduai.local",
    password: "Student12345!",
    role: "STUDENT",
    nim: "2301002",
    major: "Sistem Informasi",
  },
];

async function ensureUserAccount(entry: SeedUser) {
  const [{ eq }, { auth }, { db }, { user }, { studentProfiles }] = await Promise.all([
    depsPromise.then((items) => items[0]),
    depsPromise.then((items) => items[1]),
    depsPromise.then((items) => items[2]),
    depsPromise.then((items) => items[3]),
    import("../lib/schema"),
  ]);

  const existing = await db
    .select({ id: user.id, email: user.email, role: user.role })
    .from(user)
    .where(eq(user.email, entry.email.toLowerCase()))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(user)
      .set({
        role: entry.role,
        name: entry.name,
      })
      .where(eq(user.id, existing[0].id));

    if (entry.role === "STUDENT" && entry.nim) {
      const existingProfile = await db
        .select({ userId: studentProfiles.userId })
        .from(studentProfiles)
        .where(eq(studentProfiles.userId, existing[0].id))
        .limit(1);

      if (existingProfile[0]) {
        await db
          .update(studentProfiles)
          .set({
            nim: entry.nim,
            major: entry.major || null,
            updatedAt: new Date(),
          })
          .where(eq(studentProfiles.userId, existing[0].id));
      } else {
        await db.insert(studentProfiles).values({
          userId: existing[0].id,
          nim: entry.nim,
          major: entry.major || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    console.log(`[skip] ${entry.email} already exists`);
    return;
  }

  const result = await auth.api.signUpEmail({
    body: {
      name: entry.name,
      email: entry.email,
      password: entry.password,
    },
  });

  if (!result?.user?.id) {
    throw new Error(`Failed creating ${entry.email}`);
  }

  await db
    .update(user)
    .set({
      role: entry.role,
    })
    .where(eq(user.id, result.user.id));

  if (entry.role === "STUDENT" && entry.nim) {
    await db.insert(studentProfiles).values({
      userId: result.user.id,
      nim: entry.nim,
      major: entry.major || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  console.log(`[create] ${entry.email} (${entry.role})`);
}

async function ensureDemoClass() {
  const [{ and, eq }, , { db }, { user }, { classes, enrollments }] = await Promise.all([
    import("drizzle-orm"),
    import("../lib/auth"),
    import("../lib/db"),
    import("../lib/auth-schema"),
    import("../lib/schema"),
  ]);

  const existingClass = await db
    .select({ id: classes.id })
    .from(classes)
    .where(eq(classes.name, "Pemrograman Web Lanjut"))
    .limit(1);

  let classId = existingClass[0]?.id;
  if (!classId) {
    const inserted = await db
      .insert(classes)
      .values({
        name: "Pemrograman Web Lanjut",
        description: "Kelas demo seed untuk pengujian alur LMS.",
        academicYear: "2026/2027",
      })
      .returning({ id: classes.id });
    classId = inserted[0].id;
  }

  const teacher = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, "teacher@eduai.local"))
    .limit(1);
  const student1 = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, "student1@eduai.local"))
    .limit(1);
  const student2 = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, "student2@eduai.local"))
    .limit(1);

  const members: Array<{ userId: string; roleInClass: "TEACHER" | "STUDENT" }> = [];
  if (teacher[0]) members.push({ userId: teacher[0].id, roleInClass: "TEACHER" });
  if (student1[0]) members.push({ userId: student1[0].id, roleInClass: "STUDENT" });
  if (student2[0]) members.push({ userId: student2[0].id, roleInClass: "STUDENT" });

  for (const member of members) {
    const exists = await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.userId, member.userId),
          eq(enrollments.classId, classId),
        ),
      )
      .limit(1);

    if (!exists[0]) {
      await db.insert(enrollments).values({
        userId: member.userId,
        classId,
        roleInClass: member.roleInClass,
      });
    }
  }
}

async function main() {
  for (const item of seedUsers) {
    await ensureUserAccount(item);
  }
  await ensureDemoClass();

  console.log("\nSeed complete.");
}

main().catch((error) => {
  console.error("Seeder failed:", error);
  process.exit(1);
});
