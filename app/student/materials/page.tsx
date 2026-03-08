"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { getAssignmentsWithMySubmission, submitAssignment } from "@/app/actions/submissions";
import { getMaterials } from "@/app/actions/materials";
import FileUpload from "@/app/components/file-upload";
import { BookOpen, CheckCircle, Loader2, Send } from "lucide-react";

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

type AssignmentItem = {
  id: string;
  materialId: string;
  title: string;
  instructions: string | null;
  dueDate: Date;
  mySubmission: { answerText: string | null } | null;
};

export default function StudentMaterialsPage() {
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [submissionFileUrl, setSubmissionFileUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadData = useCallback(() => {
    startTransition(async () => {
      try {
        const [materialRows, assignmentRows] = await Promise.all([
          getMaterials(),
          getAssignmentsWithMySubmission(),
        ]);

        setMaterials(materialRows as MaterialItem[]);
        setAssignments(assignmentRows as AssignmentItem[]);

        if (!selectedMaterialId && materialRows.length > 0) {
          setSelectedMaterialId(materialRows[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal memuat materi.");
      }
    });
  }, [selectedMaterialId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedMaterial = useMemo(
    () => materials.find((m) => m.id === selectedMaterialId) || null,
    [materials, selectedMaterialId],
  );

  const materialAssignments = useMemo(
    () => assignments.filter((a) => a.materialId === selectedMaterialId),
    [assignments, selectedMaterialId],
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Materi Saya</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">Materi tampil sesuai jadwal rilis dari dosen/admin.</p>
      </header>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">{error}</div>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="app-card p-4 lg:col-span-1">
          <h2 className="mb-3 text-base font-semibold">Materi</h2>
          <div className="space-y-2">
            {materials.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSelectedMaterialId(item.id);
                  setAnswerText("");
                  setSubmissionFileUrl("");
                }}
                className={`w-full rounded-xl p-3 text-left transition ${selectedMaterialId === item.id ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" : "bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800"}`}
              >
                <p className="font-medium">{item.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{item.className}{item.meetingNumber ? ` • P${item.meetingNumber}` : ""}</p>
              </button>
            ))}
            {materials.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {isPending ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Memuat...</span> : "Belum ada materi tersedia."}
              </p>
            )}
          </div>
        </div>

        <div className="app-card p-6 lg:col-span-2">
          {selectedMaterial ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{selectedMaterial.title}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{selectedMaterial.className} • {new Date(selectedMaterial.scheduledAt).toLocaleString()} {selectedMaterial.meetingNumber ? `• Pertemuan ${selectedMaterial.meetingNumber}` : ""}</p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900">
                <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{selectedMaterial.content || "Materi tidak memiliki konten teks."}</p>
                {selectedMaterial.fileUrl && <p className="mt-3 text-sm text-blue-600 dark:text-blue-400">Lampiran: {selectedMaterial.fileUrl}</p>}
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Tugas</h3>
                {materialAssignments.length > 0 ? (
                  materialAssignments.map((assignment) => (
                    <div key={assignment.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{assignment.title}</p>
                        <span className="text-xs text-slate-500 dark:text-slate-400">Tenggat: {new Date(assignment.dueDate).toLocaleString()}</span>
                      </div>
                      {assignment.instructions && <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">{assignment.instructions}</p>}

                      {assignment.mySubmission ? (
                        <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                          <p className="mb-1 inline-flex items-center gap-2 font-medium"><CheckCircle className="h-4 w-4" />Sudah dikumpulkan</p>
                          <p className="whitespace-pre-wrap">{assignment.mySubmission.answerText || "(Tanpa teks jawaban)"}</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <textarea
                            rows={4}
                            className="app-input"
                            value={answerText}
                            onChange={(e) => setAnswerText(e.target.value)}
                            placeholder="Tulis jawaban tugas di sini"
                          />
                          <FileUpload
                            label="Lampiran Tugas (Opsional)"
                            scope="submissions"
                            value={submissionFileUrl}
                            onChange={setSubmissionFileUrl}
                            disabled={isPending}
                          />
                          <button
                            type="button"
                            className="app-btn-primary"
                            disabled={isPending || !answerText.trim()}
                            onClick={() => {
                              startTransition(async () => {
                                try {
                                  await submitAssignment(assignment.id, {
                                    answerText,
                                    fileUrl: submissionFileUrl || undefined,
                                  });
                                  setAnswerText("");
                                  setSubmissionFileUrl("");
                                  await loadData();
                                } catch (err) {
                                  setError(err instanceof Error ? err.message : "Gagal mengumpulkan tugas.");
                                }
                              });
                            }}
                          >
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Kumpulkan Tugas
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    <BookOpen className="mx-auto mb-2 h-5 w-5" />
                    Belum ada tugas untuk materi ini.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">Pilih materi untuk melihat detail.</p>
          )}
        </div>
      </div>
    </div>
  );
}

