"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import { createAssignment, deleteAssignment, getAssignments } from "@/app/actions/assignments";
import { getMeetings } from "@/app/actions/class-meetings";
import { createMaterial, deleteMaterial, getMaterials } from "@/app/actions/materials";
import FileUpload from "@/app/components/file-upload";
import { Loader2, Plus, Trash2 } from "lucide-react";

type Meeting = {
  id: string;
  classId: string;
  meetingNumber: number;
  title: string;
  description: string | null;
  scheduledDate: Date;
};

type MaterialItem = { id: string; meetingId: string | null; title: string; fileUrl: string | null };
type AssignmentItem = { id: string; meetingId: string | null; title: string; dueDate: Date };

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
            <textarea className="app-input" rows={4} value={materialContent} onChange={(e) => setMaterialContent(e.target.value)} placeholder="Konten materi" />
            <FileUpload label="Lampiran Materi (Opsional)" scope="materials" value={materialFileUrl} onChange={setMaterialFileUrl} disabled={isPending} />
            <button type="submit" className="app-btn-primary" disabled={isPending || !meeting}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Tambah Materi
            </button>
          </form>

          <div className="space-y-2">
            {materials.map((m) => (
              <div key={m.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{m.title}</p>
                    {m.fileUrl && <p className="text-blue-600 dark:text-blue-400">{m.fileUrl}</p>}
                  </div>
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
            ))}
            {materials.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada materi.</p>}
          </div>
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
            <textarea className="app-input" rows={4} value={assignmentInstructions} onChange={(e) => setAssignmentInstructions(e.target.value)} placeholder="Instruksi tugas" />
            <input type="datetime-local" className="app-input" value={assignmentDueDate} onChange={(e) => setAssignmentDueDate(e.target.value)} />
            <button type="submit" className="app-btn-primary" disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Tambah Tugas
            </button>
          </form>

          <div className="space-y-2">
            {assignments.map((a) => (
              <div key={a.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{a.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Tenggat: {new Date(a.dueDate).toLocaleString()}</p>
                  </div>
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
            ))}
            {assignments.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada tugas.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
