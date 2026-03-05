"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { getStudents, type UserWithProfile } from "@/app/actions/users";
import { ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";

const PAGE_SIZE = 10;

export default function TeacherStudentsPage() {
  const [students, setStudents] = useState<UserWithProfile[]>([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      try {
        const rows = await getStudents();
        setStudents(rows);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal memuat data student.");
      }
    });
  }, []);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return students;

    return students.filter((student) => {
      const nim = (student.nim || "").toLowerCase();
      const name = student.name.toLowerCase();
      const major = (student.major || "").toLowerCase();
      return nim.includes(keyword) || name.includes(keyword) || major.includes(keyword);
    });
  }, [search, students]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const rows = filtered.slice(
    (safeCurrentPage - 1) * PAGE_SIZE,
    safeCurrentPage * PAGE_SIZE,
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Students
        </h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          Read-only data mahasiswa/siswa.
        </p>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="app-card p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari NIM / Nama / Jurusan"
              className="app-input pl-9"
            />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Total: <span className="font-semibold">{filtered.length}</span> mahasiswa
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-2">
            <thead>
              <tr className="text-left text-sm text-slate-500 dark:text-slate-400">
                <th className="px-3 py-2 font-medium">NIM</th>
                <th className="px-3 py-2 font-medium">Nama Lengkap</th>
                <th className="px-3 py-2 font-medium">Jurusan</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((student) => (
                <tr
                  key={student.id}
                  className="rounded-xl bg-slate-50 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <td className="rounded-l-xl px-3 py-3 font-medium">{student.nim || "-"}</td>
                  <td className="px-3 py-3">{student.name}</td>
                  <td className="rounded-r-xl px-3 py-3">{student.major || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {(rows.length === 0 || isPending) && (
          <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
            {isPending ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Memuat data...
              </span>
            ) : (
              "Data mahasiswa tidak ditemukan."
            )}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Page {safeCurrentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safeCurrentPage === 1 || isPending}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              className="app-btn-ghost px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={safeCurrentPage === totalPages || isPending}
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              className="app-btn-ghost px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
