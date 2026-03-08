"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { getClasses } from "@/app/actions/classes";
import { getMeetings } from "@/app/actions/class-meetings";
import { createMaterial, deleteMaterial, getMaterials, updateMaterial } from "@/app/actions/materials";
import FileUpload from "@/app/components/file-upload";
import RichTextEditor from "@/app/components/rich-text-editor";
import { Copy, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";

type ClassItem = { id: string; name: string };
type MaterialItem = {
  id: string;
  classId: string;
  className: string;
  meetingId: string | null;
  meetingTitle: string | null;
  meetingNumber: number | null;
  title: string;
  content: string | null;
  fileUrl: string | null;
  scheduledAt: Date;
};
type MeetingItem = { id: string; classId: string; title: string; meetingNumber: number; scheduledDate: Date };

type MaterialForm = {
  classId: string;
  meetingId: string;
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

export default function TeacherMaterialsPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [rows, setRows] = useState<MaterialItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [copySource, setCopySource] = useState<MaterialItem | null>(null);
  const [copyClassIds, setCopyClassIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<MaterialForm>({
    classId: "",
    meetingId: "",
    title: "",
    content: "",
    fileUrl: "",
    scheduledAt: "",
  });

  const groupedMaterials = useMemo(() => {
    const map = new Map<string, MaterialItem[]>();
    rows.forEach((item) => {
      if (!map.has(item.className)) map.set(item.className, []);
      map.get(item.className)?.push(item);
    });
    return map;
  }, [rows]);

  const loadMeetings = (classId: string) => {
    startTransition(async () => {
      const meetingRows = await getMeetings(classId);
      setMeetings((meetingRows as MeetingItem[]).map((m) => ({
        id: m.id,
        classId: m.classId,
        title: m.title,
        meetingNumber: m.meetingNumber,
        scheduledDate: new Date(m.scheduledDate),
      })));
    });
  };

  const loadData = useCallback(() => {
    startTransition(async () => {
      try {
        const [classRows, materialRows] = await Promise.all([getClasses(), getMaterials()]);
        setClasses(classRows.map((item) => ({ id: item.id, name: item.name })));
        setRows(materialRows as MaterialItem[]);
        if (classRows[0]) loadMeetings(classRows[0].id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal memuat materi.");
      }
    });
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreate = () => {
    setEditingId(null);
    setError(null);
    const firstClassId = classes[0]?.id || "";
    setSelectedClassIds(firstClassId ? [firstClassId] : []);
    setForm({ classId: firstClassId, meetingId: "", title: "", content: "", fileUrl: "", scheduledAt: "" });
    if (firstClassId) loadMeetings(firstClassId);
    setIsModalOpen(true);
  };

  const openEdit = (item: MaterialItem) => {
    setEditingId(item.id);
    setError(null);
    setSelectedClassIds([item.classId]);
    setForm({
      classId: item.classId,
      meetingId: item.meetingId || "",
      title: item.title,
      content: item.content || "",
      fileUrl: item.fileUrl || "",
      scheduledAt: toLocalInputValue(item.scheduledAt),
    });
    loadMeetings(item.classId);
    setIsModalOpen(true);
  };

  const saveMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    const targetClassIds = editingId ? [form.classId] : selectedClassIds;
    if (targetClassIds.length === 0 || !form.title.trim() || (!form.scheduledAt && !form.meetingId)) {
      setError("Kelas, judul, dan jadwal wajib diisi.");
      return;
    }

    startTransition(async () => {
      try {
        if (editingId) {
          await updateMaterial(editingId, {
            classId: form.classId,
            meetingId: form.meetingId || null,
            title: form.title,
            content: form.content,
            fileUrl: form.fileUrl,
            scheduledAt: form.scheduledAt || undefined,
          });
        } else {
          await createMaterial({
            classId: targetClassIds[0],
            classIds: targetClassIds,
            meetingId: targetClassIds.length === 1 ? form.meetingId || undefined : undefined,
            title: form.title,
            content: form.content,
            fileUrl: form.fileUrl,
            scheduledAt: form.scheduledAt || new Date().toISOString(),
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
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Materi Dosen/Guru</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">Buat dan kelola materi per kelas yang Anda ampu.</p>
        </div>
        <button type="button" onClick={openCreate} className="app-btn-primary" disabled={isPending}>
          <Plus className="h-5 w-5" />
          Tambah Materi
        </button>
      </header>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">{error}</div>}

      <div className="space-y-4">
        {Array.from(groupedMaterials.entries()).map(([className, materials]) => (
          <div key={className} className="app-card p-5">
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">{className}</h2>
            <div className="space-y-3">
              {materials.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100">{item.title}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{new Date(item.scheduledAt).toLocaleString()} {item.meetingNumber ? `• P${item.meetingNumber}` : ""}</p>
                      {item.content && <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{item.content}</p>}
                      {item.fileUrl && (
                        <a href={item.fileUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm text-blue-600 underline dark:text-blue-400">
                          Buka Lampiran
                        </a>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => openEdit(item)} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"><Pencil className="h-4 w-4" /></button>
                      <button
                        type="button"
                        onClick={() => {
                          const targets = classes.filter((c) => c.id !== item.classId).map((c) => c.id);
                          setCopySource(item);
                          setCopyClassIds(targets);
                        }}
                        className="rounded-lg p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
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
            {isPending ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Memuat materi...</span> : "Belum ada materi untuk kelas Anda."}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="app-card w-full max-w-xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{editingId ? "Ubah Materi" : "Tambah Materi"}</h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"><X className="h-4 w-4" /></button>
            </div>

            <form onSubmit={saveMaterial} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Kelas</label>
                {editingId ? (
                  <select
                    className="app-input"
                    value={form.classId}
                    onChange={(e) => {
                      const nextClassId = e.target.value;
                      setForm((prev) => ({ ...prev, classId: nextClassId, meetingId: "" }));
                      setSelectedClassIds([nextClassId]);
                      loadMeetings(nextClassId);
                    }}
                    required
                  >
                    <option value="" disabled>Pilih kelas</option>
                    {classes.map((item) => (<option key={item.id} value={item.id}>{item.name}</option>))}
                  </select>
                ) : (
                  <div className="max-h-40 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                    {classes.map((item) => {
                      const checked = selectedClassIds.includes(item.id);
                      return (
                        <label key={item.id} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...selectedClassIds, item.id]
                                : selectedClassIds.filter((id) => id !== item.id);
                              setSelectedClassIds(next);
                              if (next.length === 1) {
                                const classId = next[0];
                                setForm((prev) => ({ ...prev, classId, meetingId: "" }));
                                loadMeetings(classId);
                              } else {
                                setForm((prev) => ({ ...prev, classId: next[0] || "", meetingId: "" }));
                                setMeetings([]);
                              }
                            }}
                          />
                          <span>{item.name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Pertemuan (Opsional)</label>
                <select
                  className="app-input"
                  value={form.meetingId}
                  disabled={!editingId && selectedClassIds.length !== 1}
                  onChange={(e) => {
                    const meetingId = e.target.value;
                    const meeting = meetings.find((m) => m.id === meetingId);
                    setForm((prev) => ({
                      ...prev,
                      meetingId,
                      scheduledAt: meeting ? toLocalInputValue(new Date(meeting.scheduledDate)) : prev.scheduledAt,
                    }));
                  }}
                >
                  <option value="">Tanpa pertemuan</option>
                  {meetings.map((item) => (<option key={item.id} value={item.id}>P{item.meetingNumber} - {item.title}</option>))}
                </select>
                {!editingId && selectedClassIds.length !== 1 && (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Pertemuan aktif jika kelas yang dipilih tepat satu.</p>
                )}
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Judul</label>
                <input className="app-input" value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} required />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Konten</label>
                <RichTextEditor value={form.content} onChange={(content) => setForm((prev) => ({ ...prev, content }))} placeholder="Tulis konten materi di sini..." disabled={isPending} />
              </div>
              <FileUpload
                label="Lampiran Materi (Opsional)"
                scope="materials"
                value={form.fileUrl}
                onChange={(fileUrl) => setForm((prev) => ({ ...prev, fileUrl }))}
                disabled={isPending}
              />
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Jadwal Tayang</label>
                <input
                  type="datetime-local"
                  className="app-input"
                  value={form.scheduledAt}
                  onChange={(e) => setForm((prev) => ({ ...prev, scheduledAt: e.target.value }))}
                  disabled={Boolean(form.meetingId)}
                  required={!form.meetingId}
                />
                {form.meetingId && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Jadwal otomatis mengikuti jadwal pertemuan.</p>}
              </div>

              <div className="flex justify-end gap-2">
                <button type="button" className="app-btn-ghost" onClick={() => setIsModalOpen(false)}>Batal</button>
                <button type="submit" className="app-btn-primary" disabled={isPending}>{isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{editingId ? "Perbarui" : "Simpan"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {copySource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="app-card w-full max-w-xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Salin ke Kelas Lain</h2>
              <button type="button" onClick={() => setCopySource(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"><X className="h-4 w-4" /></button>
            </div>
            <div className="max-h-52 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              {classes.filter((c) => c.id !== copySource.classId).map((item) => (
                <label key={item.id} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={copyClassIds.includes(item.id)}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...copyClassIds, item.id]
                        : copyClassIds.filter((id) => id !== item.id);
                      setCopyClassIds(next);
                    }}
                  />
                  <span>{item.name}</span>
                </label>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="app-btn-ghost" onClick={() => setCopySource(null)}>Batal</button>
              <button
                type="button"
                className="app-btn-primary"
                disabled={isPending || copyClassIds.length === 0}
                onClick={() => {
                  startTransition(async () => {
                    try {
                      await createMaterial({
                        classId: copyClassIds[0],
                        classIds: copyClassIds,
                        title: copySource.title,
                        content: copySource.content || undefined,
                        fileUrl: copySource.fileUrl || undefined,
                        scheduledAt: new Date(copySource.scheduledAt).toISOString(),
                      });
                      setCopySource(null);
                      await loadData();
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Gagal menyalin materi.");
                    }
                  });
                }}
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Salin Materi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
