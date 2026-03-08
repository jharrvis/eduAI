"use client";

import { useEffect, useState, useTransition } from "react";
import { getAssignments } from "@/app/actions/assignments";
import { getClassesWithMembers } from "@/app/actions/classes";
import { getMaterials } from "@/app/actions/materials";
import { getStudents } from "@/app/actions/users";
import { BookOpen, Calendar, CheckCircle, Loader2, Users } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    classes: 0,
    materials: 0,
    students: 0,
    assignments: 0,
  });
  const [recentClasses, setRecentClasses] = useState<Array<{ id: string; name: string; academicYear: string; students: number }>>([]);
  const [recentMaterials, setRecentMaterials] = useState<Array<{ id: string; title: string; className: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      try {
        const [classes, materials, students, assignments] = await Promise.all([
          getClassesWithMembers(),
          getMaterials(),
          getStudents(),
          getAssignments(),
        ]);

        setStats({
          classes: classes.length,
          materials: materials.length,
          students: students.length,
          assignments: assignments.length,
        });

        setRecentClasses(
          classes.slice(0, 5).map((item) => ({
            id: item.id,
            name: item.name,
            academicYear: item.academicYear,
            students: item.students.length,
          })),
        );

        setRecentMaterials(
          materials.slice(0, 5).map((item) => ({
            id: item.id,
            title: item.title,
            className: item.className,
          })),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal memuat dashboard.");
      }
    });
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Ringkasan Dasbor</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">Ringkasan statistik LMS terbaru.</p>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="app-card flex items-center gap-4 p-5">
          <div className="rounded-xl bg-blue-100 p-3 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"><Calendar className="h-5 w-5" /></div>
          <div><p className="text-sm text-slate-500 dark:text-slate-400">Total Kelas</p><p className="text-2xl font-bold">{stats.classes}</p></div>
        </div>
        <div className="app-card flex items-center gap-4 p-5">
          <div className="rounded-xl bg-indigo-100 p-3 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"><BookOpen className="h-5 w-5" /></div>
          <div><p className="text-sm text-slate-500 dark:text-slate-400">Total Materi</p><p className="text-2xl font-bold">{stats.materials}</p></div>
        </div>
        <div className="app-card flex items-center gap-4 p-5">
          <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"><Users className="h-5 w-5" /></div>
          <div><p className="text-sm text-slate-500 dark:text-slate-400">Total Mahasiswa/Siswa</p><p className="text-2xl font-bold">{stats.students}</p></div>
        </div>
        <div className="app-card flex items-center gap-4 p-5">
          <div className="rounded-xl bg-amber-100 p-3 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"><CheckCircle className="h-5 w-5" /></div>
          <div><p className="text-sm text-slate-500 dark:text-slate-400">Tugas</p><p className="text-2xl font-bold">{stats.assignments}</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="app-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Kelas Terbaru</h2>
          <div className="space-y-3">
            {recentClasses.map((item) => (
              <div key={item.id} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{item.academicYear} • {item.students} peserta</p>
              </div>
            ))}
            {recentClasses.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {isPending ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Memuat...</span> : "Belum ada kelas."}
              </p>
            )}
          </div>
        </div>

        <div className="app-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Materi Terbaru</h2>
          <div className="space-y-3">
            {recentMaterials.map((item) => (
              <div key={item.id} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{item.className}</p>
              </div>
            ))}
            {recentMaterials.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {isPending ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Memuat...</span> : "Belum ada materi."}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

