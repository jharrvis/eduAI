"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  bulkCreateStudents,
  createStudent,
  createUser,
  deleteUser,
  getUsers,
  type UserWithProfile,
  updateUser,
} from "@/app/actions/users";
import { getMajors } from "@/app/actions/majors";
import {
  ChevronLeft,
  ChevronRight,
  FileUp,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

type UserRole = "ADMIN" | "TEACHER" | "STUDENT";

type FormState = {
  role: UserRole;
  name: string;
  email: string;
  password: string;
  nim: string;
  majorId: string;
};

type MajorItem = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
};

const PAGE_SIZE = 10;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserWithProfile[]>([]);
  const [majors, setMajors] = useState<MajorItem[]>([]);
  const [roleFilter, setRoleFilter] = useState<"ALL" | UserRole>("ALL");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkText, setBulkText] = useState("");
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState<FormState>({
    role: "STUDENT",
    name: "",
    email: "",
    password: "",
    nim: "",
    majorId: "",
  });

  const loadData = () => {
    startTransition(async () => {
      try {
        const [rows, majorRows] = await Promise.all([getUsers(), getMajors()]);
        setUsers(rows);
        setMajors(majorRows as MajorItem[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal memuat data user.");
      }
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return users.filter((item) => {
      if (roleFilter !== "ALL" && item.role !== roleFilter) {
        return false;
      }
      if (!keyword) return true;

      return (
        item.name.toLowerCase().includes(keyword) ||
        item.email.toLowerCase().includes(keyword) ||
        (item.nim || "").toLowerCase().includes(keyword) ||
        (item.major || "").toLowerCase().includes(keyword) ||
        (item.role || "").toLowerCase().includes(keyword)
      );
    });
  }, [users, roleFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const rows = filteredUsers.slice(
    (safeCurrentPage - 1) * PAGE_SIZE,
    safeCurrentPage * PAGE_SIZE,
  );

  const openAddModal = () => {
    setEditingId(null);
    setError(null);
    setForm({
      role: "STUDENT",
      name: "",
      email: "",
      password: "",
      nim: "",
      majorId: "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (userId: string) => {
    const row = users.find((item) => item.id === userId);
    if (!row) return;

    setEditingId(userId);
    setError(null);
    setForm({
      role: (row.role || "STUDENT") as UserRole,
      name: row.name,
      email: row.email,
      password: "",
      nim: row.nim || "",
      majorId: row.majorId || "",
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setError(null);
  };

  const openBulkModal = () => {
    setBulkError(null);
    setBulkText("");
    setIsBulkModalOpen(true);
  };

  const closeBulkModal = () => {
    setBulkError(null);
    setBulkText("");
    setIsBulkModalOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const role = form.role;
    const name = form.name.trim();
    const email = form.email.trim();
    const password = form.password.trim();
    const nim = form.nim.trim();
    const majorId = form.majorId.trim();

    if (!name) {
      setError("Nama wajib diisi.");
      return;
    }

    if (role === "STUDENT" && !nim) {
      setError("NIM wajib diisi untuk mahasiswa/siswa.");
      return;
    }

    if (!editingId && role !== "STUDENT") {
      if (!email || !password) {
        setError("Email dan kata sandi wajib diisi untuk ADMIN/TEACHER.");
        return;
      }
    }

    if (!editingId && role === "STUDENT") {
      startTransition(async () => {
        try {
          await createStudent({
            nim,
            name,
            majorId: majorId || undefined,
          });
          closeModal();
          setCurrentPage(1);
          await loadData();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Gagal menambah mahasiswa/siswa.");
        }
      });
      return;
    }

    startTransition(async () => {
      try {
        if (editingId) {
          await updateUser(editingId, {
            role,
            name,
            email: role === "STUDENT" ? undefined : email,
            nim: role === "STUDENT" ? nim : undefined,
            majorId: role === "STUDENT" ? majorId || undefined : undefined,
          });
        } else {
          await createUser({
            role,
            name,
            email,
            password,
            nim: role === "STUDENT" ? nim : undefined,
            majorId: role === "STUDENT" ? majorId || undefined : undefined,
          });
        }

        closeModal();
        setCurrentPage(1);
        await loadData();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal menyimpan user.");
      }
    });
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBulkError(null);

    try {
      const lines = bulkText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length === 0) {
        setBulkError("Data import kosong.");
        return;
      }

      const parsed = lines.map((line, index) => {
        const row = line.split(",").map((value) => value.trim());
        const [nim, name, major] = row;

        if (!nim || !name) {
          throw new Error(`Baris ${index + 1}: format harus 'nim,nama,jurusan'.`);
        }

        return {
          nim,
          name,
          major: major || undefined,
        };
      });

      startTransition(async () => {
        try {
          await bulkCreateStudents(parsed);
          closeBulkModal();
          setCurrentPage(1);
          await loadData();
        } catch (err) {
          setBulkError(err instanceof Error ? err.message : "Impor massal gagal.");
        }
      });
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : "Impor massal gagal.");
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Manajemen Pengguna</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">Kelola pengguna role ADMIN, TEACHER, dan STUDENT. Kata sandi default mahasiswa/siswa: <span className="font-semibold">Student12345!</span></p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={openBulkModal} className="app-btn-ghost" disabled={isPending}>
            <FileUp className="h-5 w-5" />
            Impor Mahasiswa/Siswa
          </button>
          <button type="button" onClick={openAddModal} className="app-btn-primary" disabled={isPending}>
            <Plus className="h-5 w-5" />
            Tambah Pengguna
          </button>
        </div>
      </header>

      <div className="app-card p-4 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full flex-col gap-2 sm:max-w-xl sm:flex-row">
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Cari nama/email/NIM/role"
                className="app-input pl-9"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value as "ALL" | UserRole);
                setCurrentPage(1);
              }}
              className="app-input w-full sm:w-40"
            >
              <option value="ALL">Semua Role</option>
              <option value="ADMIN">ADMIN</option>
              <option value="TEACHER">TEACHER</option>
              <option value="STUDENT">STUDENT</option>
            </select>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Total: <span className="font-semibold">{filteredUsers.length}</span> user
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-2">
            <thead>
              <tr className="text-left text-sm text-slate-500 dark:text-slate-400">
                <th className="px-3 py-2 font-medium">Nama</th>
                <th className="px-3 py-2 font-medium">Email</th>
                <th className="px-3 py-2 font-medium">Peran</th>
                <th className="px-3 py-2 font-medium">NIM</th>
                <th className="px-3 py-2 font-medium">Jurusan</th>
                <th className="px-3 py-2 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id} className="rounded-xl bg-slate-50 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  <td className="rounded-l-xl px-3 py-3 font-medium">{item.name}</td>
                  <td className="px-3 py-3">{item.email}</td>
                  <td className="px-3 py-3">{item.role || "-"}</td>
                  <td className="px-3 py-3">{item.nim || "-"}</td>
                  <td className="px-3 py-3">{item.major || "-"}</td>
                  <td className="rounded-r-xl px-3 py-3">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => openEditModal(item.id)} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!window.confirm(`Hapus ${item.name}?`)) return;
                          startTransition(async () => {
                            try {
                              await deleteUser(item.id);
                              await loadData();
                            } catch (err) {
                              setError(err instanceof Error ? err.message : "Gagal menghapus user.");
                            }
                          });
                        }}
                        className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {(rows.length === 0 || isPending) && (
          <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
            {isPending ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Memuat data...
              </span>
            ) : (
              "Data user tidak ditemukan."
            )}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400">Halaman {safeCurrentPage} dari {totalPages}</p>
          <div className="flex items-center gap-2">
            <button type="button" disabled={safeCurrentPage === 1 || isPending} onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} className="app-btn-ghost px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"><ChevronLeft className="h-4 w-4" /></button>
            <button type="button" disabled={safeCurrentPage === totalPages || isPending} onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))} className="app-btn-ghost px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="app-card w-full max-w-xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{editingId ? "Ubah Pengguna" : "Tambah Pengguna"}</h2>
              <button type="button" onClick={closeModal} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Tutup modal"><X className="h-4 w-4" /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Peran</label>
                <select value={form.role} onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value as UserRole }))} className="app-input" required>
                  <option value="ADMIN">ADMIN</option>
                  <option value="TEACHER">TEACHER</option>
                  <option value="STUDENT">STUDENT</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Nama</label>
                <input type="text" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} className="app-input" required />
              </div>

              {form.role !== "STUDENT" && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Email</label>
                  <input type="email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} className="app-input" required={!editingId} />
                </div>
              )}

              {!editingId && form.role !== "STUDENT" && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Kata Sandi</label>
                  <input type="password" minLength={8} value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} className="app-input" required />
                </div>
              )}

              {form.role === "STUDENT" && (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">NIM</label>
                    <input type="text" value={form.nim} onChange={(e) => setForm((prev) => ({ ...prev, nim: e.target.value }))} className="app-input" required />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Jurusan (Opsional)</label>
                    <select value={form.majorId} onChange={(e) => setForm((prev) => ({ ...prev, majorId: e.target.value }))} className="app-input">
                      <option value="">Pilih Jurusan</option>
                      {majors
                        .filter((major) => major.isActive)
                        .map((major) => (
                          <option key={major.id} value={major.id}>
                            {major.code} - {major.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </>
              )}

              {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">{error}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeModal} className="app-btn-ghost" disabled={isPending}>Batal</button>
                <button type="submit" className="app-btn-primary" disabled={isPending}>{isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{editingId ? "Perbarui" : "Simpan"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="app-card w-full max-w-2xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Impor Massal Mahasiswa/Siswa</h2>
              <button type="button" onClick={closeBulkModal} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Tutup modal"><X className="h-4 w-4" /></button>
            </div>

            <form onSubmit={handleBulkSubmit} className="space-y-4">
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-300">
                Format per baris: <span className="font-semibold">nim,nama,jurusan</span>
                <br />
                Contoh: <span className="font-mono">2301003,Budi Santoso,Teknik Informatika</span>
              </div>

              <textarea rows={10} value={bulkText} onChange={(e) => setBulkText(e.target.value)} className="app-input resize-y" placeholder={"2301003,Budi Santoso,Teknik Informatika\n2301004,Rina Putri,"} />

              {bulkError && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">{bulkError}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeBulkModal} className="app-btn-ghost" disabled={isPending}>Batal</button>
                <button type="submit" className="app-btn-primary" disabled={isPending}>{isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Impor Massal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
