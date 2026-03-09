"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import { createAssignment, deleteAssignment, getAssignments, updateAssignment } from "@/app/actions/assignments";
import { getMeetings } from "@/app/actions/class-meetings";
import { createMaterial, deleteMaterial, getMaterials, updateMaterial } from "@/app/actions/materials";
import FileUpload from "@/app/components/file-upload";
import RichTextEditor from "@/app/components/rich-text-editor";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";

type Meeting = {
  id: string;
  classId: string;
  meetingNumber: number;
  title: string;
  description: string | null;
  scheduledDate: Date;
};

type MaterialItem = {
  id: string;
  meetingId: string | null;
  title: string;
  content: string | null;
  fileUrl: string | null;
};
type AssignmentItem = {
  id: string;
  meetingId: string | null;
  title: string;
  instructions: string | null;
  dueDate: Date;
};

export default function TeacherMeetingDetailPage() {
  const params = useParams<{ classId: string; meetingId: string }>();
  const classId = params.classId;
  const meetingId = params.meetingId;

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [materialTitle, setMaterialTitle] = useState("");
  const [materialContent, setMaterialContent] = useState("");
  const [materialFileUrl, setMaterialFileUrl] = useState("");
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentInstructions, setAssignmentInstructions] = useState("");
  const [assignmentDueDate, setAssignmentDueDate] = useState("");
  const [editingAssignment, setEditingAssignment] = useState<AssignmentItem | null>(null);
  const [editAssignmentTitle, setEditAssignmentTitle] = useState("");
  const [editAssignmentInstructions, setEditAssignmentInstructions] = useState("");
  const [editAssignmentDueDate, setEditAssignmentDueDate] = useState("");
  const [editingMaterial, setEditingMaterial] = useState<MaterialItem | null>(null);
  const [editMaterialTitle, setEditMaterialTitle] = useState("");
  const [editMaterialContent, setEditMaterialContent] = useState("");
  const [editMaterialFileUrl, setEditMaterialFileUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadData = useCallback(() => {
    startTransition(async () => {
      try {
        const [meetingRows, materialRows, assignmentRows] = await Promise.all([
          getMeetings(classId),
          getMaterials(classId),
          getAssignments(classId),
        ]);
        const foundMeeting = (meetingRows as Meeting[]).find((m) => m.id === meetingId) || null;
        setMeeting(foundMeeting);
        setMaterials((materialRows as MaterialItem[]).filter((m) => m.meetingId === meetingId));
        setAssignments((assignmentRows as AssignmentItem[]).filter((a) => a.meetingId === meetingId));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal memuat detail pertemuan.");
      }
    });
  }, [classId, meetingId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const defaultDue = useMemo(() => {
    if (!meeting) return "";
    const d = new Date(meeting.scheduledDate);
    d.setHours(d.getHours() + 24);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }, [meeting]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {meeting ? `Pertemuan ${meeting.meetingNumber}: ${meeting.title}` : "Detail Pertemuan"}
        </h1>
        {meeting && <p className="text-sm text-slate-500 dark:text-slate-400">{new Date(meeting.scheduledDate).toLocaleString()}</p>}
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="app-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Materi Pertemuan</h2>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!meeting || !materialTitle.trim()) return;
              startTransition(async () => {
                try {
                  await createMaterial({
                    classId,
                    meetingId,
                    title: materialTitle,
                    content: materialContent,
                    fileUrl: materialFileUrl,
                    scheduledAt: new Date(meeting.scheduledDate).toISOString(),
                  });
                  setMaterialTitle("");
                  setMaterialContent("");
                  setMaterialFileUrl("");
                  await loadData();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Gagal menambahkan materi.");
                }
              });
            }}
          >
            <input className="app-input" value={materialTitle} onChange={(e) => setMaterialTitle(e.target.value)} placeholder="Judul materi" required />
            <RichTextEditor value={materialContent} onChange={setMaterialContent} placeholder="Tulis konten materi di sini..." disabled={isPending} />
            <FileUpload label="Lampiran Materi (Opsional)" scope="materials" value={materialFileUrl} onChange={setMaterialFileUrl} disabled={isPending} />
            <button type="submit" className="app-btn-primary" disabled={isPending || !meeting}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Tambah Materi
            </button>
          </form>

          {materials.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada materi.</p>
          ) : (
            <ol className="space-y-2">
              {materials.map((m, index) => (
                <li key={m.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
                  <div className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{m.title}</p>
                      {m.content && (
                        <div
                          className="mt-1 rich-text-content"
                          dangerouslySetInnerHTML={{ __html: m.content }}
                        />
                      )}
                      {m.fileUrl && (
                        <a href={m.fileUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-blue-600 underline dark:text-blue-400">
                          Buka Lampiran
                        </a>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        onClick={() => {
                          setEditingMaterial(m);
                          setEditMaterialTitle(m.title);
                          setEditMaterialContent(m.content || "");
                          setEditMaterialFileUrl(m.fileUrl || "");
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        onClick={() => {
                          if (!window.confirm(`Hapus materi "${m.title}"?`)) return;
                          startTransition(async () => {
                            try {
                              await deleteMaterial(m.id);
                              await loadData();
                            } catch (err) {
                              setError(err instanceof Error ? err.message : "Gagal menghapus materi.");
                            }
                          });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="app-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Tugas Pertemuan</h2>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!assignmentTitle.trim()) return;
              startTransition(async () => {
                try {
                  await createAssignment({
                    meetingId,
                    title: assignmentTitle,
                    instructions: assignmentInstructions,
                    dueDate: assignmentDueDate || defaultDue,
                  });
                  setAssignmentTitle("");
                  setAssignmentInstructions("");
                  setAssignmentDueDate("");
                  await loadData();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Gagal menambahkan tugas.");
                }
              });
            }}
          >
            <input className="app-input" value={assignmentTitle} onChange={(e) => setAssignmentTitle(e.target.value)} placeholder="Judul tugas" required />
            <RichTextEditor value={assignmentInstructions} onChange={setAssignmentInstructions} placeholder="Instruksi tugas" disabled={isPending} />
            <input type="datetime-local" className="app-input" value={assignmentDueDate} onChange={(e) => setAssignmentDueDate(e.target.value)} />
            <button type="submit" className="app-btn-primary" disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Tambah Tugas
            </button>
          </form>

          <div className="space-y-2">
            {assignments.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada tugas.</p>
            ) : (
              <ol className="space-y-2">
                {assignments.map((a, index) => (
                  <li key={a.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
                    <div className="flex items-start gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{a.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Tenggat: {new Date(a.dueDate).toLocaleString()}</p>
                        {a.instructions && (
                          <div
                            className="mt-1 rich-text-content"
                            dangerouslySetInnerHTML={{ __html: a.instructions }}
                          />
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          onClick={() => {
                            setEditingAssignment(a);
                            setEditAssignmentTitle(a.title);
                            setEditAssignmentInstructions(a.instructions || "");
                            const d = new Date(a.dueDate);
                            d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
                            setEditAssignmentDueDate(d.toISOString().slice(0, 16));
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={() => {
                            if (!window.confirm(`Hapus tugas "${a.title}"?`)) return;
                            startTransition(async () => {
                              try {
                                await deleteAssignment(a.id);
                                await loadData();
                              } catch (err) {
                                setError(err instanceof Error ? err.message : "Gagal menghapus tugas.");
                              }
                            });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>

      {editingMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="app-card w-full max-w-xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Ubah Materi</h2>
              <button type="button" onClick={() => setEditingMaterial(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                startTransition(async () => {
                  try {
                    await updateMaterial(editingMaterial.id, {
                      meetingId,
                      title: editMaterialTitle,
                      content: editMaterialContent,
                      fileUrl: editMaterialFileUrl,
                    });
                    setEditingMaterial(null);
                    await loadData();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Gagal memperbarui materi.");
                  }
                });
              }}
            >
              <input className="app-input" value={editMaterialTitle} onChange={(e) => setEditMaterialTitle(e.target.value)} placeholder="Judul materi" required />
              <RichTextEditor value={editMaterialContent} onChange={setEditMaterialContent} placeholder="Tulis konten materi di sini..." disabled={isPending} />
              <FileUpload label="Lampiran Materi (Opsional)" scope="materials" value={editMaterialFileUrl} onChange={setEditMaterialFileUrl} disabled={isPending} />
              <div className="flex justify-end gap-2">
                <button type="button" className="app-btn-ghost" onClick={() => setEditingMaterial(null)}>Batal</button>
                <button type="submit" className="app-btn-primary" disabled={isPending}>
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="app-card w-full max-w-xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Ubah Tugas</h2>
              <button type="button" onClick={() => setEditingAssignment(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                startTransition(async () => {
                  try {
                    await updateAssignment(editingAssignment.id, {
                      title: editAssignmentTitle,
                      instructions: editAssignmentInstructions,
                      dueDate: editAssignmentDueDate,
                    });
                    setEditingAssignment(null);
                    await loadData();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Gagal memperbarui tugas.");
                  }
                });
              }}
            >
              <input className="app-input" value={editAssignmentTitle} onChange={(e) => setEditAssignmentTitle(e.target.value)} placeholder="Judul tugas" required />
              <RichTextEditor value={editAssignmentInstructions} onChange={setEditAssignmentInstructions} placeholder="Instruksi tugas" disabled={isPending} />
              <input type="datetime-local" className="app-input" value={editAssignmentDueDate} onChange={(e) => setEditAssignmentDueDate(e.target.value)} required />
              <div className="flex justify-end gap-2">
                <button type="button" className="app-btn-ghost" onClick={() => setEditingAssignment(null)}>Batal</button>
                <button type="submit" className="app-btn-primary" disabled={isPending}>
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
