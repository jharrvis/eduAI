"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { getClassesWithMembers, type ClassWithMembers } from "@/app/actions/classes";
import { ArrowRight, Loader2, Users, X } from "lucide-react";

type StudentModalState = {
  className: string;
  students: Array<{ userId: string; name: string; email: string }>;
} | null;

export default function TeacherClassesPage() {
  const [rows, setRows] = useState<ClassWithMembers[]>([]);
  const [studentModal, setStudentModal] = useState<StudentModalState>(null);
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
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Kelas Saya</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">Daftar kelas yang Anda ampu.</p>
      </header>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">{error}</div>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {rows.map((item) => (
          <div key={item.id} className="app-card p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{item.name}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{item.academicYear}</p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                  item.isActive
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                    : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                {item.isActive ? "Aktif" : "Nonaktif"}
              </span>
            </div>

            <div className="flex items-center gap-6 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <Users className="h-4 w-4 text-blue-500" />
                <span className="font-medium">{item.teachers.length}</span>
                <span className="text-slate-400">Dosen/Guru</span>
              </div>
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
              <button
                type="button"
                onClick={() => setStudentModal({ className: item.name, students: item.students })}
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400"
              >
                <Users className="h-4 w-4 text-emerald-500" />
                <span className="font-medium">{item.students.length}</span>
                <span className="text-slate-400">Mahasiswa/Siswa</span>
                {item.students.length > 0 && (
                  <span className="text-xs text-blue-500 underline underline-offset-2">Lihat</span>
                )}
              </button>
            </div>

            <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
              <Link
                href={`/teacher/classes/${item.id}`}
                className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Lihat Jadwal Pertemuan
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ))}

        {rows.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
            {isPending ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Memuat kelas...
              </span>
            ) : (
              "Belum ada kelas yang diampu."
            )}
          </div>
        )}
      </div>

      {studentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="app-card w-full max-w-md p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Daftar Mahasiswa/Siswa
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{studentModal.className}</p>
              </div>
              <button
                type="button"
                onClick={() => setStudentModal(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {studentModal.students.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                Belum ada mahasiswa/siswa di kelas ini.
              </p>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                  Total: <span className="font-semibold">{studentModal.students.length}</span> orang
                </p>
                <ul className="space-y-2">
                  {studentModal.students.map((s, idx) => (
                    <li key={s.userId} className="flex items-center gap-3 rounded-lg p-2 hover:bg-slate-50 dark:hover:bg-slate-800">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{s.name}</p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{s.email}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
