# LMS Core Feature Audit & Panduan Pengembangan

## Ringkasan Status

Proyek ini sudah memiliki fondasi LMS yang solid dengan schema database lengkap, RBAC, sistem materi terjadwal, dan alur pengumpulan tugas. Namun ada beberapa fitur yang **belum selesai, tidak konsisten, atau broken** yang perlu diperbaiki sebelum aplikasi siap digunakan.

---

## ✅ Sudah Berjalan Baik

| Fitur | Status |
|-------|--------|
| RBAC (Admin/Teacher/Student) dengan `requireRole()` | ✅ |
| Class management dengan isActive, startDate, endDate, majorId | ✅ |
| Enrollment dengan search nama/NIM | ✅ |
| Jadwal pertemuan (single + bulk weekly/biweekly/custom) | ✅ |
| Material scheduling (`scheduledAt <= now` lock untuk student) | ✅ |
| Admin halaman: students, classes, materials, majors, classrooms | ✅ |
| Teacher halaman: dashboard, classes, materials, assignments, students, profile | ✅ |
| Student halaman: dashboard, classes list, classes/[id] meeting schedule | ✅ |
| Submission workflow (PENDING → GRADED → REVISION) | ✅ |
| Grade override oleh teacher | ✅ |
| File upload (materi & submission) | ✅ |
| Bulk import student dari CSV | ✅ |
| Student materials page dengan form submit tugas | ✅ |

---

## ❌ Gap & Bug yang Harus Diperbaiki

### 🔴 PRIORITAS TINGGI — Broken / Fitur Hilang

---

#### 1. Teacher Meeting Detail Page tidak ada (404)
**File:** `app/teacher/classes/[classId]/meetings/[meetingId]/page.tsx` — **BELUM DIBUAT**

**Masalah:** `app/teacher/classes/page.tsx` sudah ada link ke URL ini tapi halaman tidak ada → menyebabkan 404.

**Solusi:** Buat halaman detail pertemuan untuk teacher dengan:
- Header: judul meeting, tanggal, ruangan, deskripsi
- Panel kiri: Daftar materi meeting ini (CRUD inline — `getMaterials(classId)` filter by `meetingId`)
  - "Tambah Materi" button → modal: title, content, fileUrl (FileUpload), auto set `meetingId` dan `scheduledAt`
  - Edit/Delete materi
- Panel kanan: Daftar tugas meeting ini (CRUD inline — `getAssignments(classId)` filter by `meetingId`)
  - "Buat Tugas" button → modal: title, instructions, dueDate, aiPromptContext, auto set `meetingId`
  - Edit/Delete tugas

**Actions yang sudah ada (reuse):**
- `getMaterials(classId)` dari `app/actions/materials.ts`
- `createMaterial()`, `updateMaterial()`, `deleteMaterial()`
- `getAssignments(classId)` dari `app/actions/assignments.ts`
- `createAssignment()`, `updateAssignment()`, `deleteAssignment()`
- `getMeetings(classId)` untuk ambil detail meeting
- `FileUpload` component dari `app/components/file-upload.tsx`

---

#### 2. Student tidak bisa submit dari halaman Class Detail (Meeting View)
**File:** `app/student/classes/[classId]/page.tsx`

**Masalah:** Halaman meeting schedule sudah menampilkan materi dan tugas per pertemuan, tapi tugas hanya menampilkan status "Sudah/Belum dikumpulkan" tanpa form submit.

**Solusi:** Tambahkan form submit assignment inline pada unlocked meetings:
- Jika `!a.mySubmission`: tampilkan textarea + FileUpload + tombol submit
- Jika `a.mySubmission?.status === "REVISION"`: tampilkan pesan revision + form re-submit
- Jika `a.mySubmission?.status === "GRADED"`: tampilkan nilai akhir + feedback

**Actions yang sudah ada (reuse):**
- `submitAssignment(assignmentId, { answerText, fileUrl })` dari `app/actions/submissions.ts`

---

#### 3. Student tidak bisa re-submit setelah REVISION
**File:** `app/student/materials/page.tsx` dan `app/student/classes/[classId]/page.tsx`

**Masalah:** Submission ditampilkan dengan kondisi `if (assignment.mySubmission)` → selalu tampil "Sudah dikumpulkan", tidak ada opsi re-submit meskipun status = REVISION. Backend (`submitAssignment`) **sudah mendukung update submission**, tapi UI tidak.

**Solusi:** Ganti logika tampilan:
```ts
// Sebelum
if (assignment.mySubmission) → "Sudah dikumpulkan"

// Sesudah
if (!mySubmission) → tampil form submit
if (mySubmission.status === "REVISION") → tampil pesan + form re-submit
if (mySubmission.status === "PENDING" || "GRADED") → tampil status, nilai, feedback
```

**Type yang perlu ditambah** di `AssignmentItem.mySubmission`:
```ts
mySubmission: {
  answerText: string | null;
  status: string;         // tambah ini
  finalGrade: number | null;
  aiFeedback: string | null;
  aiScore: number | null;
} | null;
```
`getAssignmentsWithMySubmission()` sudah return field `status`, tapi type di UI tidak menyertakannya.

---

#### 4. Assignments linked by meetingId tidak muncul di Student Materials Page
**File:** `app/student/materials/page.tsx`

**Masalah:** Filter assignments per material menggunakan `a.materialId === selectedMaterialId`. Tapi assignment yang dibuat langsung di meeting (tanpa material) hanya punya `meetingId`, bukan `materialId`. Assignment ini tidak akan muncul di halaman materials sama sekali.

**Solusi:** Tambahkan fallback filter:
```ts
// Tampilkan assignment jika:
// (a) materialId cocok dengan material yang dipilih, ATAU
// (b) meetingId cocok dengan meeting dari material yang dipilih
const materialAssignments = assignments.filter((a) =>
  a.materialId === selectedMaterialId ||
  (selectedMaterial?.meetingId && a.meetingId === selectedMaterial.meetingId)
);
```

---

#### 5. Teacher Create Assignment form masih membutuhkan materialId (required)
**File:** `app/teacher/assignments/page.tsx`

**Masalah:** Di form create assignment, `materialId` masih required (`if (!form.materialId)` di validasi). Tapi seharusnya, jika teacher sudah pilih `meetingId`, `materialId` boleh kosong (backend sudah support ini di `createAssignment`).

**Solusi:**
- Ubah validasi: `if (!form.materialId && !form.meetingId)` → error
- Ubah label dropdown material menjadi "Materi (Opsional jika sudah pilih Pertemuan)"
- Jika meetingId dipilih, filter meeting materials untuk dropdown materialId

---

### 🟡 PRIORITAS SEDANG — UX Issues

---

#### 6. File URL tidak bisa diklik (ditampilkan sebagai plain text)
**File:** Multiple:
- `app/student/materials/page.tsx` — `{selectedMaterial.fileUrl && <p>Lampiran: {selectedMaterial.fileUrl}</p>}`
- `app/teacher/assignments/page.tsx` — `{submission.fileUrl && <p>Lampiran: {submission.fileUrl}</p>}`

**Solusi:** Ganti semua `<p>` menjadi `<a href={url} target="_blank">`:
```tsx
{m.fileUrl && (
  <a href={m.fileUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline hover:text-blue-800">
    Unduh Lampiran
  </a>
)}
```

> **Catatan:** `app/student/classes/[classId]/page.tsx` sudah diperbaiki menggunakan `<a>` tag.

---

#### 7. Student Assignments page tidak bisa submit (hanya view)
**File:** `app/student/assignments/page.tsx`

**Masalah:** Halaman "Tugas Saya" menampilkan semua tugas beserta statusnya, tapi untuk submit harus ke halaman "Materi Saya". Untuk tugas yang dibuat di meeting (tanpa material), assignment ini tidak muncul di materials page sama sekali.

**Solusi:** Tambahkan form submit inline di halaman assignments:
- Jika `!mySubmission` atau `status === "REVISION"` → tampilkan textarea + FileUpload + tombol submit
- Import `submitAssignment` dan `FileUpload`

---

#### 8. Admin layout nav tidak memiliki item Majors & Classrooms
**File:** `app/admin/layout.tsx`

**Masalah:** Halaman `/admin/majors` dan `/admin/classrooms` sudah ada tapi tidak ada link di navigasi admin.

**Solusi:** Tambah dua nav items di admin layout:
```tsx
{ href: "/admin/majors", label: "Jurusan" }
{ href: "/admin/classrooms", label: "Ruangan" }
```

---

### 🟢 PRIORITAS RENDAH — Enhancements

---

#### 9. Tidak ada indikator late submission / tenggat terlewat
**File:** Semua halaman yang menampilkan dueDate

**Solusi:** Tambahkan badge "Terlambat" jika `dueDate < now && !mySubmission`:
```tsx
{new Date(item.dueDate) < new Date() && !item.mySubmission && (
  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600">Terlambat</span>
)}
```

#### 10. Tidak ada success notification setelah save grade
**File:** `app/teacher/assignments/page.tsx`

**Solusi:** Tambahkan inline success state (misalnya `savedMap: Record<string, boolean>`) yang muncul setelah `overrideGrade()` berhasil.

---

## Alur LMS yang Benar (Referensi Flow)

```
ADMIN
  └─ Buat Jurusan (majors) ──────────────────── /admin/majors
  └─ Buat Ruangan (classrooms) ──────────────── /admin/classrooms
  └─ Buat Kelas (isActive, dates, major) ─────── /admin/classes
      └─ Assign Dosen + Mahasiswa (search) ───── (modal enrollment)
      └─ Generate Jadwal Pertemuan ────────────── (modal jadwal)

DOSEN
  └─ Lihat Kelas ──────────────────────────────── /teacher/classes
      └─ Expand Jadwal Pertemuan
          └─ Klik Meeting → Detail Page ──────── /teacher/classes/[id]/meetings/[mid]  ← MISSING
              └─ CRUD Materi (upload file)
              └─ CRUD Tugas (set deadline)

MAHASISWA
  └─ Lihat Kelas ──────────────────────────────── /student/classes
      └─ Klik Kelas → Jadwal Pertemuan ─────────── /student/classes/[id]
          └─ Meeting terkunci jika scheduledDate > now
          └─ Meeting terbuka: lihat materi + submit tugas  ← FORM MISSING
  └─ Materi Saya ─────────────────────────────── /student/materials
      └─ Lihat materi yang sudah release
      └─ Submit tugas per materi (ada, tapi assignment by meetingId hilang — gap #4)
  └─ Tugas Saya ──────────────────────────────── /student/assignments
      └─ Lihat semua tugas + status + nilai
      └─ Re-submit jika REVISION ← tidak bisa (gap #3, #7)
```

---

## File yang Perlu Diubah

| File | Perubahan | Prioritas |
|------|-----------|-----------|
| `app/teacher/classes/[classId]/meetings/[meetingId]/page.tsx` | **BUAT BARU** — meeting detail dengan CRUD materi + tugas | 🔴 |
| `app/student/classes/[classId]/page.tsx` | Tambah form submit assignment di unlocked meeting | 🔴 |
| `app/student/materials/page.tsx` | Fix filter assignment (fallback ke meetingId), fix re-submit | 🔴 |
| `app/student/assignments/page.tsx` | Tambah form submit, fix type `mySubmission.status` | 🔴 |
| `app/teacher/assignments/page.tsx` | Fix materialId optional saat meetingId ada | 🔴 |
| `app/admin/layout.tsx` | Tambah nav items Jurusan & Ruangan | 🟡 |
| `app/student/materials/page.tsx` | Fix fileUrl jadi `<a>` link | 🟡 |
| `app/teacher/assignments/page.tsx` | Fix fileUrl jadi `<a>` link, tambah success notification | 🟡 |

---

## Verifikasi End-to-End

1. **Admin**: Buat jurusan → buat ruangan → buat kelas → assign dosen+mahasiswa → generate jadwal mingguan
2. **Teacher**: Login → Kelas → klik link meeting → lihat halaman detail → tambah materi (upload PDF) → buat tugas dengan deadline
3. **Student (before meeting date)**: Login → Kelas → pilih kelas → pertemuan tampil terkunci
4. **Student (after meeting date)**: Meeting terbuka → lihat materi (unduh file) → submit tugas → lihat status PENDING
5. **Teacher grading**: Assignments page → pilih tugas → lihat submission → isi nilai → simpan → cek status GRADED
6. **Student revision**: Assignments page → lihat status REVISION → isi ulang jawaban → submit → status kembali PENDING
