"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createAssignment, getAssignments, getSubmissions, overrideGrade } from "@/app/actions/assignments";
import { getMaterials } from "@/app/actions/materials";
import { Loader2, Plus, Save, X } from "lucide-react";

type MaterialItem = { id: string; className: string; title: string };
type AssignmentItem = {
  id: string;
  materialId: string;
  title: string;
  instructions: string | null;
  dueDate: Date;
  className: string;
  materialTitle: string;
};

type SubmissionItem = {
  id: string;
  studentName: string;
  studentEmail: string;
  nim: string | null;
  answerText: string | null;
  fileUrl: string | null;
  aiScore: number | null;
  finalGrade: number | null;
  status: string;
};

export default function TeacherAssignmentsPage() {
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [gradeMap, setGradeMap] = useState<Record<string, string>>({});
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    materialId: "",
    title: "",
    instructions: "",
    dueDate: "",
    aiPromptContext: "",
  });

  const selectedAssignment = useMemo(
    () => assignments.find((item) => item.id === selectedAssignmentId) || null,
    [assignments, selectedAssignmentId],
  );

  const loadData = () => {
    startTransition(async () => {
      try {
        const [materialRows, assignmentRows] = await Promise.all([getMaterials(), getAssignments()]);
        setMaterials(
          (materialRows as Array<{ id: string; className: string; title: string }>).map((item) => ({
            id: item.id,
            className: item.className,
            title: item.title,
          })),
        );
        setAssignments(assignmentRows as AssignmentItem[]);

        const first = (assignmentRows as AssignmentItem[])[0];
        if (first) {
          setSelectedAssignmentId((prev) => prev || first.id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal memuat assignment.");
      }
    });
  };

  const loadSubmissions = (assignmentId: string) => {
    startTransition(async () => {
      try {
        const rows = await getSubmissions(assignmentId);
        setSubmissions(rows as SubmissionItem[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal memuat submission.");
      }
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!selectedAssignmentId) return;
    loadSubmissions(selectedAssignmentId);
  }, [selectedAssignmentId]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Teacher Assignments</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">Buat assignment dan nilai submission mahasiswa/siswa.</p>
        </div>
        <button
          type="button"
          className="app-btn-primary"
          onClick={() => {
            setIsCreateOpen(true);
            setForm({ materialId: materials[0]?.id || "", title: "", instructions: "", dueDate: "", aiPromptContext: "" });
          }}
        >
          <Plus className="h-5 w-5" />
          Add Assignment
        </button>
      </header>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">{error}</div>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="app-card p-4 lg:col-span-1">
          <h2 className="mb-3 text-base font-semibold">Assignments</h2>
          <div className="space-y-2">
            {assignments.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`w-full rounded-xl p-3 text-left transition ${selectedAssignmentId === item.id ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" : "bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800"}`}
                onClick={() => setSelectedAssignmentId(item.id)}
              >
                <p className="font-medium">{item.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{item.className} • {item.materialTitle}</p>
              </button>
            ))}
            {assignments.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {isPending ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Memuat...</span> : "Belum ada assignment."}
              </p>
            )}
          </div>
        </div>

        <div className="app-card p-6 lg:col-span-2">
          {selectedAssignment ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{selectedAssignment.title}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Due: {new Date(selectedAssignment.dueDate).toLocaleString()}</p>
                {selectedAssignment.instructions && (
                  <p className="mt-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-200">{selectedAssignment.instructions}</p>
                )}
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Submissions ({submissions.length})</h3>
                {submissions.map((submission) => (
                  <div key={submission.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">{submission.studentName} {submission.nim ? `(${submission.nim})` : ""}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{submission.studentEmail} • Status: {submission.status}</p>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">AI: {submission.aiScore ?? "-"} | Final: {submission.finalGrade ?? "-"}</div>
                    </div>

                    {submission.answerText && <p className="mb-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900">{submission.answerText}</p>}
                    {submission.fileUrl && <p className="mb-2 text-sm text-blue-600 dark:text-blue-400">Lampiran: {submission.fileUrl}</p>}

                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        placeholder="Final grade"
                        value={gradeMap[submission.id] ?? ""}
                        onChange={(e) => setGradeMap((prev) => ({ ...prev, [submission.id]: e.target.value }))}
                        className="app-input w-32"
                      />
                      <button
                        type="button"
                        className="app-btn-primary"
                        disabled={isPending || !gradeMap[submission.id]}
                        onClick={() => {
                          const val = Number(gradeMap[submission.id]);
                          if (!Number.isFinite(val)) return;
                          startTransition(async () => {
                            try {
                              await overrideGrade(submission.id, val);
                              await loadSubmissions(selectedAssignment.id);
                            } catch (err) {
                              setError(err instanceof Error ? err.message : "Gagal update grade.");
                            }
                          });
                        }}
                      >
                        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save Grade
                      </button>
                    </div>
                  </div>
                ))}

                {submissions.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    {isPending ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Memuat submission...</span> : "Belum ada submission untuk assignment ini."}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">Pilih assignment untuk melihat submission.</p>
          )}
        </div>
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="app-card w-full max-w-xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Add Assignment</h2>
              <button type="button" onClick={() => setIsCreateOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"><X className="h-4 w-4" /></button>
            </div>

            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!form.materialId || !form.title.trim() || !form.dueDate) {
                  setError("Material, title, dan due date wajib diisi.");
                  return;
                }

                startTransition(async () => {
                  try {
                    await createAssignment({
                      materialId: form.materialId,
                      title: form.title,
                      instructions: form.instructions,
                      dueDate: form.dueDate,
                      aiPromptContext: form.aiPromptContext,
                    });
                    setIsCreateOpen(false);
                    await loadData();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Gagal membuat assignment.");
                  }
                });
              }}
            >
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Material</label>
                <select className="app-input" value={form.materialId} onChange={(e) => setForm((prev) => ({ ...prev, materialId: e.target.value }))} required>
                  <option value="" disabled>Pilih material</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>{m.className} - {m.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Title</label>
                <input className="app-input" value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} required />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Instructions</label>
                <textarea rows={4} className="app-input" value={form.instructions} onChange={(e) => setForm((prev) => ({ ...prev, instructions: e.target.value }))} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">AI Prompt Context (Optional)</label>
                <textarea rows={3} className="app-input" value={form.aiPromptContext} onChange={(e) => setForm((prev) => ({ ...prev, aiPromptContext: e.target.value }))} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Due Date</label>
                <input type="datetime-local" className="app-input" value={form.dueDate} onChange={(e) => setForm((prev) => ({ ...prev, dueDate: e.target.value }))} required />
              </div>

              <div className="flex justify-end gap-2">
                <button type="button" className="app-btn-ghost" onClick={() => setIsCreateOpen(false)}>Cancel</button>
                <button type="submit" className="app-btn-primary" disabled={isPending}>{isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
