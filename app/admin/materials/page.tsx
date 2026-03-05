"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { getClasses } from "@/app/actions/classes";
import { createMaterial, deleteMaterial, getMaterials, updateMaterial } from "@/app/actions/materials";
import FileUpload from "@/app/components/file-upload";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";

type ClassItem = { id: string; name: string };
type MaterialItem = {
  id: string;
  classId: string;
  className: string;
  title: string;
  content: string | null;
  fileUrl: string | null;
  scheduledAt: Date;
};

type MaterialForm = {
  classId: string;
  title: string;
  content: string;
  fileUrl: string;
  scheduledAt: string;
};

function toLocalInputValue(date: Date) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function AdminMaterialsPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [rows, setRows] = useState<MaterialItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<MaterialForm>({
    classId: "",
    title: "",
    content: "",
    fileUrl: "",
    scheduledAt: "",
  });

  const grouped = useMemo(() => {
    return rows.reduce<Record<string, MaterialItem[]>>((acc, item) => {
      if (!acc[item.className]) acc[item.className] = [];
      acc[item.className].push(item);
      return acc;
    }, {});
  }, [rows]);

  const loadData = () => {
    startTransition(async () => {
      try {
        const [classRows, materialRows] = await Promise.all([getClasses(), getMaterials()]);
        setClasses(classRows.map((item) => ({ id: item.id, name: item.name })));
        setRows(materialRows as MaterialItem[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal memuat data materi.");
      }
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setError(null);
    setForm({ classId: classes[0]?.id || "", title: "", content: "", fileUrl: "", scheduledAt: "" });
    setIsModalOpen(true);
  };

  const openEdit = (item: MaterialItem) => {
    setEditingId(item.id);
    setError(null);
    setForm({
      classId: item.classId,
      title: item.title,
      content: item.content || "",
      fileUrl: item.fileUrl || "",
      scheduledAt: toLocalInputValue(item.scheduledAt),
    });
    setIsModalOpen(true);
  };

  const saveMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.classId || !form.title.trim() || !form.scheduledAt) {
      setError("Class, title, dan schedule wajib diisi.");
      return;
    }

    startTransition(async () => {
      try {
        if (editingId) {
          await updateMaterial(editingId, {
            title: form.title,
            content: form.content,
            fileUrl: form.fileUrl,
            scheduledAt: form.scheduledAt,
          });
        } else {
          await createMaterial({
            classId: form.classId,
            title: form.title,
            content: form.content,
            fileUrl: form.fileUrl,
            scheduledAt: form.scheduledAt,
          });
        }

        setIsModalOpen(false);
        await loadData();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal menyimpan materi.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Materials</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">Kelola materi dan jadwal tayang (`scheduledAt`).</p>
        </div>
        <button type="button" onClick={openCreate} className="app-btn-primary" disabled={isPending}>
          <Plus className="h-5 w-5" />
          Add Material
        </button>
      </header>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">{error}</div>}

      <div className="space-y-4">
        {Object.entries(grouped).map(([className, materials]) => (
          <div key={className} className="app-card p-5">
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">{className}</h2>
            <div className="space-y-3">
              {materials.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100">{item.title}</h3>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Tayang: {new Date(item.scheduledAt).toLocaleString()}</p>
                      {item.fileUrl && <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">File: {item.fileUrl}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => openEdit(item)} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"><Pencil className="h-4 w-4" /></button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!window.confirm(`Hapus materi '${item.title}'?`)) return;
                          startTransition(async () => {
                            await deleteMaterial(item.id);
                            await loadData();
                          });
                        }}
                        className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {rows.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
            {isPending ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Memuat materi...</span> : "Belum ada materi."}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="app-card w-full max-w-xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{editingId ? "Edit Material" : "Add Material"}</h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"><X className="h-4 w-4" /></button>
            </div>

            <form onSubmit={saveMaterial} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Class</label>
                <select className="app-input" value={form.classId} onChange={(e) => setForm((prev) => ({ ...prev, classId: e.target.value }))} required>
                  <option value="" disabled>Pilih class</option>
                  {classes.map((item) => (<option key={item.id} value={item.id}>{item.name}</option>))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Title</label>
                <input className="app-input" value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} required />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Content</label>
                <textarea rows={5} className="app-input" value={form.content} onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))} />
              </div>
              <FileUpload
                label="Lampiran Materi (Optional)"
                scope="materials"
                value={form.fileUrl}
                onChange={(fileUrl) => setForm((prev) => ({ ...prev, fileUrl }))}
                disabled={isPending}
              />
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Scheduled At</label>
                <input type="datetime-local" className="app-input" value={form.scheduledAt} onChange={(e) => setForm((prev) => ({ ...prev, scheduledAt: e.target.value }))} required />
              </div>

              <div className="flex justify-end gap-2">
                <button type="button" className="app-btn-ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="app-btn-primary" disabled={isPending}>{isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{editingId ? "Update" : "Save"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

