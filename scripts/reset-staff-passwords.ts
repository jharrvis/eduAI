import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

import { hashPassword } from "better-auth/crypto";
import { Pool } from "pg";

const targetPasswords: Record<"ADMIN" | "TEACHER", string> = {
  ADMIN: "Admin12345!",
  TEACHER: "Teacher12345!",
};

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL tidak ditemukan di environment.");
  }

  const pool = new Pool({
    connectionString: databaseUrl,
  });

  const client = await pool.connect();

  try {
    const rowsResult = await client.query<{
      id: string;
      email: string;
      role: "ADMIN" | "TEACHER" | null;
    }>(
      `select id, email, role
       from "user"
       where role in ('ADMIN', 'TEACHER')`,
    );
    const rows = rowsResult.rows;

    if (rows.length === 0) {
      console.log("Tidak ada user ADMIN/TEACHER ditemukan.");
      return;
    }

    for (const row of rows) {
      const role = row.role as "ADMIN" | "TEACHER" | null;
      if (!role || !(role in targetPasswords)) continue;

      const hashed = await hashPassword(targetPasswords[role]);
      const credentialResult = await client.query<{ id: string }>(
        `select id
         from "account"
         where user_id = $1 and provider_id = 'credential'
         limit 1`,
        [row.id],
      );
      const credential = credentialResult.rows[0];

      if (credential?.id) {
        await client.query(
          `update "account"
           set password = $1, updated_at = now()
           where id = $2`,
          [hashed, credential.id],
        );
      } else {
        await client.query(
          `insert into "account" (
             id, account_id, provider_id, user_id, password, created_at, updated_at
           ) values ($1, $2, 'credential', $3, $4, now(), now())`,
          [crypto.randomUUID(), row.id, row.id, hashed],
        );
      }

      console.log(`reset: ${row.email} (${role})`);
    }

    console.log("Reset password ADMIN/TEACHER selesai.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Gagal reset password:", error);
  process.exit(1);
});
