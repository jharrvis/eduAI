"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  createClassRoom,
  deleteClassRoom,
  getClassRooms,
  updateClassRoom,
} from "@/app/actions/classrooms";
import { Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";

type ClassRoomItem = {
  id: string;
  code: string;
  name: string;
  location: string | null;
  capacity: number | null;
  isActive: boolean;
};

type FormState = {
  code: string;
  name: string;
  location: string;
  capacity: string;
  isActive: boolean;
};

export default function AdminClassRoomsPage() {
  const [rows, setRows] = useState<ClassRoomItem[]>([]);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<FormState>({
    code: "",
    name: "",
    location: "",
    capacity: "",
    isActive: true,
  });

  const loadData = () => {
    startTransition(async () => {
      try {
        const result = await getClassRooms();
        setRows(result as ClassRoomItem[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal memuat data ruang kelas.");
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
      return (
        item.code.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        (item.location || "").toLowerCase().includes(q)
      );
    });
  }, [rows, search]);

  const openCreateModal = () => {
    setEditingId(null);
    setError(null);
    setForm({
      code: "",
      name: "",
      location: "",
      capacity: "",
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (room: ClassRoomItem) => {
    setEditingId(room.id);
    setError(null);
    setForm({
      code: room.code,
      name: room.name,
      location: room.location || "",
      capacity: room.capacity ? String(room.capacity) : "",
      isActive: room.isActive,
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

    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      location: form.location.trim() || undefined,
      capacity: form.capacity ? Number(form.capacity) : undefined,
      isActive: form.isActive,
    };

    if (!payload.code) {
      setError("Kode ruang wajib diisi.");
      return;
    }
    if (!payload.name) {
      setError("Nama ruang wajib diisi.");
      return;
    }
    if (payload.capacity !== undefined && (!Number.isFinite(payload.capacity) || payload.capacity <= 0)) {
      setError("Kapasitas harus berupa angka lebih dari 0.");
      return;
    }

    startTransition(async () => {
      try {
        if (editingId) {
          await updateClassRoom(editingId, {
            code: payload.code,
            name: payload.name,
            location: payload.location,
            capacity: payload.capacity ?? null,
            isActive: payload.isActive,
          });
        } else {
          await createClassRoom(payload);
        }
        closeModal();
        await loadData();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal menyimpan ruang kelas.");
      }
    });
  };

  const handleDelete = (room: ClassRoomItem) => {
    if (!window.confirm(`Hapus ruang kelas '${room.name}'?`)) return;

    startTransition(async () => {
      try {
        await deleteClassRoom(room.id);
        await loadData();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal menghapus ruang kelas.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Ruang Kelas</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">Kelola data ruang kelas untuk kebutuhan penjadwalan.</p>
        </div>
        <button type="button" onClick={openCreateModal} className="app-btn-primary" disabled={isPending}>
          <Plus className="h-5 w-5" />
          Tambah Ruang
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
              placeholder="Cari kode, nama, atau lokasi ruang"
              className="app-input pl-9"
            />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Total: <span className="font-semibold">{filtered.length}</span> ruang
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-2">
            <thead>
              <tr className="text-left text-sm text-slate-500 dark:text-slate-400">
                <th className="px-3 py-2 font-medium">Kode</th>
                <th className="px-3 py-2 font-medium">Nama Ruang</th>
                <th className="px-3 py-2 font-medium">Lokasi</th>
                <th className="px-3 py-2 font-medium">Kapasitas</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((room) => (
                <tr key={room.id} className="rounded-xl bg-slate-50 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  <td className="rounded-l-xl px-3 py-3 font-semibold">{room.code}</td>
                  <td className="px-3 py-3">{room.name}</td>
                  <td className="px-3 py-3">{room.location || "-"}</td>
                  <td className="px-3 py-3">{room.capacity || "-"}</td>
                  <td className="px-3 py-3">
                    <span
                      className={
                        room.isActive
                          ? "rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                          : "rounded-full bg-rose-100 px-2 py-1 text-xs font-medium text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                      }
                    >
                      {room.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="rounded-r-xl px-3 py-3">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => openEditModal(room)} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => handleDelete(room)} className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
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
              "Data ruang kelas belum tersedia."
            )}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="app-card w-full max-w-xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{editingId ? "Ubah Ruang Kelas" : "Tambah Ruang Kelas"}</h2>
              <button type="button" onClick={closeModal} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Tutup modal">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Kode Ruang</label>
                <input type="text" value={form.code} onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))} className="app-input" placeholder="Contoh: A-101" required />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Nama Ruang</label>
                <input type="text" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} className="app-input" placeholder="Contoh: Laboratorium Komputer 1" required />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Lokasi (Opsional)</label>
                <input type="text" value={form.location} onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))} className="app-input" placeholder="Contoh: Gedung A Lantai 2" />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Kapasitas (Opsional)</label>
                <input type="number" min={1} value={form.capacity} onChange={(e) => setForm((prev) => ({ ...prev, capacity: e.target.value }))} className="app-input" placeholder="Contoh: 40" />
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
