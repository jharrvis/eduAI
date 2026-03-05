---

# Product Requirements Document (PRD): Next-Gen LMS

## 1. Project Overview

Membangun platform pembelajaran digital (LMS) yang ringan, cepat, dan cerdas untuk institusi pendidikan. Fokus utamanya adalah efisiensi administrasi bagi pengajar melalui AI dan pengalaman belajar yang terpersonalisasi bagi siswa.

**Tech Stack:**

* **Frontend/Backend:** Next.js 15 (App Router)
* **Database:** Neon (Serverless PostgreSQL)
* **ORM:** Drizzle ORM
* **Authentication:** Better Auth
* **AI Integration:** OpenRouter.ai (RAG menggunakan Model LLM pilihan)
* **Styling:** Tailwind CSS + Shadcn UI

---

## 2. User Roles & Permissions

| Role | Deskripsi Singkat |
| --- | --- |
| **Admin** | Pengelola sistem: Manajemen data master (User, Kelas, Jadwal). |
| **Dosen/Guru** | Pengelola konten: Materi, Tugas, Evaluasi berbasis AI. |
| **Siswa/Mahasiswa** | Pengguna akhir: Mengonsumsi materi dan mengerjakan evaluasi. |

---

## 3. Core Features & Functional Requirements

### 3.1 Admin Module (Management Center)

* **User Management:** CRUD untuk semua level user (Admin, Guru, Siswa).
* **Class Management:** Membuat ruang kelas digital dan menentukan periode aktif.
* **Enrollment:** Melakukan *assign* satu atau banyak siswa serta guru ke dalam kelas tertentu.
* **Scheduling:** Mengatur jadwal sesi kelas (kapan materi/tugas mulai bisa diakses).

### 3.2 Teacher Module (Content & AI Grading)

* **Material Management:** CRUD materi (Teks, PDF, Link Video).
* **AI Content Creator:** Fitur untuk generate draf soal (Pilihan Ganda/Essay) berdasarkan materi yang diupload via OpenRouter.
* **Assignment System:** Memberikan tugas per sesi dengan tenggat waktu.
* **AI Assessment:**
* AI memberikan skor awal dan feedback pada tugas essay mahasiswa.
* Guru dapat melakukan *review* dan *override* nilai dari AI.



### 3.3 Student Module (Learning Experience)

* **Learning Dashboard:** Melihat daftar kelas yang diikuti dan progres belajar.
* **Scheduled Access:** Materi hanya bisa dibuka jika sudah masuk jadwal yang ditentukan Admin.
* **Assessment Interface:** Mengerjakan kuis/tugas langsung di platform.
* **File Submission:** Upload dokumen tugas dengan validasi tipe file.

### 3.4 AI Agent & RAG (The Intelligent Core)

* **RAG System:** Mengindeks materi pembelajaran (PDF/Teks) ke dalam *vector database* (bisa menggunakan ekstensi `pgvector` di Neon).
* **AI Tutor Chatbot:** Siswa dapat bertanya tentang isi materi secara spesifik. AI hanya akan menjawab berdasarkan konteks materi kelas tersebut.
* **Summary Tool:** AI memberikan ringkasan materi bagi siswa untuk review cepat.

---

## 4. Ide Tambahan (Value-Added Features)

Untuk membuat LMS ini lebih kompetitif dan fungsional, berikut adalah beberapa saran tambahan:

1. **AI Plagiarism Checker:** Menggunakan AI untuk mendeteksi indikasi kemiripan jawaban antar siswa dalam satu kelas.
2. **Gamification Leaderboard:** Menampilkan skor kuis tertinggi di kelas untuk memotivasi siswa.
3. **Real-time Notification:** Notifikasi (via Pushover atau Toast) saat guru memposting materi baru atau saat nilai tugas sudah keluar.
4. **Activity Tracking:** Dashboard bagi guru untuk melihat siapa saja siswa yang sudah membaca materi atau yang belum login sama sekali.
5. **Multi-tenant Support:** Jika ingin dikembangkan menjadi SaaS, tambahkan fitur agar satu database bisa digunakan oleh banyak sekolah dengan data yang terisolasi.

---

## 5. Database Schema (High-Level)

Berikut adalah gambaran relasi tabel menggunakan Drizzle ORM:

* **`users`**: id, name, email, password, role (enum).
* **`classes`**: id, name, description, academic_year.
* **`enrollments`**: user_id, class_id (pivot table).
* **`materials`**: id, class_id, title, content, file_url, schedule_date.
* **`assignments`**: id, material_id, title, instruction, due_date.
* **`submissions`**: id, assignment_id, student_id, answer_text, file_url, ai_feedback, final_grade.

---

## 6. Non-Functional Requirements

* **Performance:** Loading halaman di bawah 2 detik (Next.js SSR/ISR).
* **Security:** Proteksi API menggunakan Better Auth dan Middleware Next.js untuk proteksi route berdasarkan role.
* **Scalability:** Database Neon memungkinkan scaling otomatis sesuai beban trafik.

---

### Database schema

Kita akan menggunakan `pgTable` dari Drizzle untuk dialek PostgreSQL (Neon).

### 1. Skema Autentikasi (Integrasi Better Auth)

Better Auth memerlukan tabel standar untuk sesi dan user. Kita akan memodifikasi tabel `user` untuk menyertakan `role`.

```typescript
import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  integer,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enum untuk User Role
export const roleEnum = pgEnum("role", ["ADMIN", "TEACHER", "STUDENT"]);

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull(),
  image: text("image"),
  role: roleEnum("role").default("STUDENT").notNull(),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id),
});

```

---

### 2. Skema Akademik (Kelas & Jadwal)

Bagian ini mengatur bagaimana kelas dibuat dan siapa saja yang ada di dalamnya.

```typescript
export const classes = pgTable("classes", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  academicYear: text("academic_year").notNull(), // Contoh: 2023/2024
  createdAt: timestamp("created_at").defaultNow(),
});

// Tabel Pivot untuk Enrollment (Menghubungkan Siswa/Guru ke Kelas)
export const enrollments = pgTable("enrollments", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
  classId: uuid("class_id").references(() => classes.id, { onDelete: "cascade" }),
  roleInClass: roleEnum("role_in_class").notNull(), // Memastikan role saat di kelas
});

```

---

### 3. Skema Materi & Tugas (AI-Enhanced)

Bagian ini menyimpan konten pembelajaran dan hasil pekerjaan siswa yang nantinya diproses oleh AI OpenRouter.

```typescript
export const materials = pgTable("materials", {
  id: uuid("id").defaultRandom().primaryKey(),
  classId: uuid("class_id").references(() => classes.id),
  title: text("title").notNull(),
  content: text("content"), // Bisa berupa Markdown atau HTML
  fileUrl: text("file_url"), // Path ke storage (PDF/Doc)
  scheduledAt: timestamp("scheduled_at").notNull(), // Kapan materi muncul
  createdAt: timestamp("created_at").defaultNow(),
});

export const assignments = pgTable("assignments", {
  id: uuid("id").defaultRandom().primaryKey(),
  materialId: uuid("material_id").references(() => materials.id),
  title: text("title").notNull(),
  instructions: text("instructions"),
  dueDate: timestamp("due_date").notNull(),
  aiPromptContext: text("ai_prompt_context"), // Context khusus untuk AI menilai tugas ini
});

export const submissions = pgTable("submissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  assignmentId: uuid("assignment_id").references(() => assignments.id),
  studentId: text("student_id").references(() => user.id),
  answerText: text("answer_text"),
  fileUrl: text("file_url"),
  
  // AI Grading Fields
  aiFeedback: text("ai_feedback"),
  aiScore: integer("ai_score"), // Skor mentah dari AI
  finalGrade: integer("final_grade"), // Nilai akhir setelah review Guru
  gradedAt: timestamp("graded_at"),
  status: text("status").default("pending"), // pending, graded, revision
});

```

---

### 4. Skema Chatbot & RAG (Context Memory)

Agar AI Agent OpenRouter bisa mengingat percakapan sebelumnya atau merujuk ke dokumen tertentu.

```typescript
export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").references(() => user.id),
  classId: uuid("class_id").references(() => classes.id),
  role: text("role").notNull(), // 'user' atau 'assistant'
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tabel untuk menyimpan embedding (Opsional jika menggunakan pgvector di Neon)
export const materialEmbeddings = pgTable("material_embeddings", {
  id: uuid("id").defaultRandom().primaryKey(),
  materialId: uuid("material_id").references(() => materials.id),
  chunkContent: text("chunk_content"),
  // vector: vector("embedding", { dimensions: 1536 }), // Memerlukan pgvector plugin
});

```

---

### Insight Arsitektur:

* **Performance:** Gunakan `db.query.enrollments.findMany` dengan relasi yang sudah didefinisikan di Drizzle untuk mengambil data kelas siswa secara efisien.
* **AI Flow:** Saat siswa mengumpulkan tugas (`submissions`), sebuah *Edge Function* di Next.js akan mengirimkan `answerText` + `aiPromptContext` ke OpenRouter untuk mendapatkan feedback instan yang disimpan di kolom `aiFeedback`.
* **Scheduling:** Pada modul Siswa, tambahkan filter query: `where(and(eq(materials.classId, id), lte(materials.scheduledAt, new Date())))` agar materi tidak muncul sebelum waktunya.
