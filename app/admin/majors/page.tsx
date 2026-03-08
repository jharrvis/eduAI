"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createMajor, deleteMajor, getMajors, updateMajor } from "@/app/actions/majors";
import { Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";

type MajorItem = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
};

type FormState = {
  code: string;
  name: string;
  isActive: boolean;
};

export default function AdminMajorsPage() {
  const [rows, setRows] = useState<MajorItem[]>([]);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<FormState>({
    code: "",
    name: "",
    isActive: true,
  });

  const loadData = () => {
    startTransition(async () => {
      try {
        const result = await getMajors();
        setRows(result as MajorItem[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal memuat data jurusan.");
      }
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((item) => {
      return item.code.toLowerCase().includes(q) || item.name.toLowerCase().includes(q);
    });
  }, [rows, search]);

  const openCreateModal = () => {
    setEditingId(null);
    setError(null);
    setForm({ code: "", name: "", isActive: true });
    setIsModalOpen(true);
  };

  const openEditModal = (major: MajorItem) => {
    setEditingId(major.id);
    setError(null);
    setForm({
      code: major.code,
      name: major.name,
      isActive: major.isActive,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const code = form.code.trim().toUpperCase();
    const name = form.name.trim();
    if (!code) {
      setError("Kode jurusan wajib diisi.");
      return;
    }
    if (!name) {
      setError("Nama jurusan wajib diisi.");
      return;
    }

    startTransition(async () => {
      try {
        if (editingId) {
          await updateMajor(editingId, {
            code,
            name,
            isActive: form.isActive,
          });
        } else {
          await createMajor({
            code,
            name,
            isActive: form.isActive,
          });
        }
        closeModal();
        await loadData();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal menyimpan jurusan.");
      }
    });
  };

  const handleDelete = (major: MajorItem) => {
    if (!window.confirm(`Hapus jurusan '${major.name}'?`)) return;

    startTransition(async () => {
      try {
        await deleteMajor(major.id);
        await loadData();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal menghapus jurusan.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Master Jurusan</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">Kelola data master jurusan untuk mahasiswa/siswa.</p>
        </div>
        <button type="button" onClick={openCreateModal} className="app-btn-primary" disabled={isPending}>
          <Plus className="h-5 w-5" />
          Tambah Jurusan
        </button>
      </header>

      <div className="app-card p-4 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kode atau nama jurusan"
              className="app-input pl-9"
            />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Total: <span className="font-semibold">{filtered.length}</span> jurusan
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-2">
            <thead>
              <tr className="text-left text-sm text-slate-500 dark:text-slate-400">
                <th className="px-3 py-2 font-medium">Kode</th>
                <th className="px-3 py-2 font-medium">Nama Jurusan</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((major) => (
                <tr key={major.id} className="rounded-xl bg-slate-50 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  <td className="rounded-l-xl px-3 py-3 font-semibold">{major.code}</td>
                  <td className="px-3 py-3">{major.name}</td>
                  <td className="px-3 py-3">
                    <span
                      className={
                        major.isActive
                          ? "rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                          : "rounded-full bg-rose-100 px-2 py-1 text-xs font-medium text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                      }
                    >
                      {major.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="rounded-r-xl px-3 py-3">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => openEditModal(major)} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => handleDelete(major)} className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {(filtered.length === 0 || isPending) && (
          <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
            {isPending ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Memuat data...
              </span>
            ) : (
              "Data jurusan belum tersedia."
            )}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="app-card w-full max-w-xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{editingId ? "Ubah Jurusan" : "Tambah Jurusan"}</h2>
              <button type="button" onClick={closeModal} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Tutup modal">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Kode Jurusan</label>
                <input type="text" value={form.code} onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))} className="app-input" placeholder="Contoh: TI" required />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Nama Jurusan</label>
                <input type="text" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} className="app-input" placeholder="Contoh: Teknik Informatika" required />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Status</label>
                <select
                  value={form.isActive ? "ACTIVE" : "INACTIVE"}
                  onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.value === "ACTIVE" }))}
                  className="app-input"
                >
                  <option value="ACTIVE">Aktif</option>
                  <option value="INACTIVE">Nonaktif</option>
                </select>
              </div>

              {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">{error}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeModal} className="app-btn-ghost" disabled={isPending}>Batal</button>
                <button type="submit" className="app-btn-primary" disabled={isPending}>
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {editingId ? "Perbarui" : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
