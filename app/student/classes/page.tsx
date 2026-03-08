"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { getClasses } from "@/app/actions/classes";
import { Loader2 } from "lucide-react";

type ClassItem = {
  id: string;
  name: string;
  academicYear: string;
  description: string | null;
  isActive: boolean;
  startDate: Date | null;
  endDate: Date | null;
};

export default function StudentClassesPage() {
  const [rows, setRows] = useState<ClassItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      try {
        const data = await getClasses();
        setRows(data as ClassItem[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal memuat data kelas.");
      }
    });
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Kelas Saya</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          Daftar kelas yang Anda ikuti.
        </p>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {rows.map((item) => (
          <Link key={item.id} href={`/student/classes/${item.id}`} className="app-card block p-5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{item.name}</h2>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${item.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"}`}>
                {item.isActive ? "Aktif" : "Tidak Aktif"}
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{item.academicYear}</p>
            {item.description && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.description}</p>}
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Periode: {item.startDate ? new Date(item.startDate).toLocaleDateString() : "-"} s/d {item.endDate ? new Date(item.endDate).toLocaleDateString() : "-"}
            </p>
          </Link>
        ))}
      </div>

      {rows.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
          {isPending ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Memuat kelas...</span> : "Belum ada kelas yang diikuti."}
        </div>
      )}
    </div>
  );
}
