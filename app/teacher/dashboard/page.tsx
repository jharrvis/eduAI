"use client";

import { useEffect, useState, useTransition } from "react";
import { getAssignments } from "@/app/actions/assignments";
import { getClassesWithMembers } from "@/app/actions/classes";
import { CheckCircle, Clock, Loader2, Users } from "lucide-react";

export default function TeacherDashboard() {
  const [stats, setStats] = useState({ classes: 0, students: 0, assignments: 0, submitted: 0 });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      try {
        const [classes, assignments] = await Promise.all([getClassesWithMembers(), getAssignments()]);

        const studentIds = new Set<string>();
        classes.forEach((item) => item.students.forEach((s) => studentIds.add(s.userId)));

        setStats({
          classes: classes.length,
          students: studentIds.size,
          assignments: assignments.length,
          submitted: assignments.filter((a) => new Date(a.dueDate) < new Date()).length,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal memuat dashboard dosen.");
      }
    });
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Dasbor Dosen/Guru</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">Ringkasan kelas, mahasiswa/siswa, dan tugas.</p>
      </header>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">{error}</div>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="app-card flex items-center gap-4 p-5"><div className="rounded-xl bg-blue-100 p-3 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"><Users className="h-5 w-5" /></div><div><p className="text-sm text-slate-500 dark:text-slate-400">Kelas Saya</p><p className="text-2xl font-bold">{stats.classes}</p></div></div>
        <div className="app-card flex items-center gap-4 p-5"><div className="rounded-xl bg-emerald-100 p-3 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"><Users className="h-5 w-5" /></div><div><p className="text-sm text-slate-500 dark:text-slate-400">Mahasiswa/Siswa</p><p className="text-2xl font-bold">{stats.students}</p></div></div>
        <div className="app-card flex items-center gap-4 p-5"><div className="rounded-xl bg-indigo-100 p-3 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"><Clock className="h-5 w-5" /></div><div><p className="text-sm text-slate-500 dark:text-slate-400">Tugas</p><p className="text-2xl font-bold">{stats.assignments}</p></div></div>
        <div className="app-card flex items-center gap-4 p-5"><div className="rounded-xl bg-amber-100 p-3 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"><CheckCircle className="h-5 w-5" /></div><div><p className="text-sm text-slate-500 dark:text-slate-400">Melewati Tenggat</p><p className="text-2xl font-bold">{stats.submitted}</p></div></div>
      </div>

      {isPending && (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
          <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Memuat data...</span>
        </div>
      )}
    </div>
  );
}

