"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { getAssignmentsWithMySubmission } from "@/app/actions/submissions";
import { CheckCircle, Loader2 } from "lucide-react";

type AssignmentRow = {
  id: string;
  title: string;
  className: string;
  materialTitle: string;
  dueDate: Date;
  mySubmission: {
    answerText: string | null;
    aiFeedback: string | null;
    aiScore: number | null;
    finalGrade: number | null;
    status: string;
  } | null;
};

export default function StudentAssignmentsPage() {
  const [rows, setRows] = useState<AssignmentRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      try {
        const assignments = await getAssignmentsWithMySubmission();
        setRows(assignments as AssignmentRow[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal memuat assignment.");
      }
    });
  }, []);

  const submitted = useMemo(() => rows.filter((item) => item.mySubmission), [rows]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">My Assignments</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">Riwayat assignment dan hasil penilaian Anda.</p>
      </header>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">{error}</div>}

      <div className="app-card p-6">
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">Submitted: <span className="font-semibold">{submitted.length}</span> / {rows.length}</p>

        <div className="space-y-3">
          {rows.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">{item.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{item.className} • {item.materialTitle}</p>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">Due: {new Date(item.dueDate).toLocaleString()}</span>
              </div>

              {item.mySubmission ? (
                <div className="space-y-2 rounded-lg bg-emerald-50 p-3 text-sm dark:bg-emerald-900/20">
                  <p className="inline-flex items-center gap-2 font-medium text-emerald-700 dark:text-emerald-300"><CheckCircle className="h-4 w-4" />Status: {item.mySubmission.status}</p>
                  {item.mySubmission.finalGrade !== null && <p>Final Grade: <span className="font-semibold">{item.mySubmission.finalGrade}</span></p>}
                  {item.mySubmission.aiScore !== null && <p>AI Score: <span className="font-semibold">{item.mySubmission.aiScore}</span></p>}
                  {item.mySubmission.aiFeedback && <p className="whitespace-pre-wrap">Feedback: {item.mySubmission.aiFeedback}</p>}
                </div>
              ) : (
                <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                  Belum dikumpulkan. Silakan buka menu My Materials untuk submit.
                </div>
              )}
            </div>
          ))}

          {rows.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
              {isPending ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Memuat assignment...</span> : "Belum ada assignment."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

