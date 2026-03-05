"use client";

import { useEffect, useState, useTransition } from "react";
import { getClassesWithMembers, type ClassWithMembers } from "@/app/actions/classes";
import { BookOpen, Loader2, Users } from "lucide-react";

export default function TeacherClassesPage() {
  const [rows, setRows] = useState<ClassWithMembers[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      try {
        const classes = await getClassesWithMembers();
        setRows(classes);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal memuat kelas.");
      }
    });
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">My Classes</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">Daftar kelas yang Anda ampu dan peserta di dalamnya.</p>
      </header>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">{error}</div>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {rows.map((item) => (
          <div key={item.id} className="app-card p-5">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{item.name}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{item.academicYear}</p>
            </div>

            <div className="space-y-4">
              <div>
                <p className="mb-2 inline-flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4" />Teachers ({item.teachers.length})</p>
                <div className="flex flex-wrap gap-2">
                  {item.teachers.map((t) => <span key={t.userId} className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{t.name}</span>)}
                </div>
              </div>

              <div>
                <p className="mb-2 inline-flex items-center gap-2 text-sm font-semibold"><BookOpen className="h-4 w-4" />Students ({item.students.length})</p>
                <div className="flex flex-wrap gap-2">
                  {item.students.length > 0 ? item.students.map((s) => <span key={s.userId} className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">{s.name}</span>) : <span className="text-sm text-slate-400">Belum ada siswa.</span>}
                </div>
              </div>
            </div>
          </div>
        ))}

        {rows.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
            {isPending ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Memuat kelas...</span> : "Belum ada kelas yang diampu."}
          </div>
        )}
      </div>
    </div>
  );
}

