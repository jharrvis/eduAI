import { Suspense } from "react";
import { getAssignmentsWithMySubmission, getMySubmissions } from "@/app/actions/submissions";
import { getClasses } from "@/app/actions/classes";
import { getMaterials } from "@/app/actions/materials";
import { BookOpen, Calendar, CheckCircle, Loader2 } from "lucide-react";
import DashboardSkeleton from "@/app/components/dashboard-skeleton";

async function DashboardStats() {
  const [classes, materials, assignments, submissions] = await Promise.all([
    getClasses(),
    getMaterials(),
    getAssignmentsWithMySubmission(),
    getMySubmissions(),
  ]);

  const stats = {
    classes: classes.length,
    materials: materials.length,
    completed: submissions.length,
    totalAssignments: assignments.length,
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="app-card flex items-center gap-4 p-5">
          <div className="rounded-xl bg-blue-100 p-3 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Kelas Saya</p>
            <p className="text-2xl font-bold">{stats.classes}</p>
          </div>
        </div>
        <div className="app-card flex items-center gap-4 p-5">
          <div className="rounded-xl bg-indigo-100 p-3 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Materi Tersedia</p>
            <p className="text-2xl font-bold">{stats.materials}</p>
          </div>
        </div>
        <div className="app-card flex items-center gap-4 p-5">
          <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Selesai</p>
            <p className="text-2xl font-bold">{stats.completed}</p>
          </div>
        </div>
        <div className="app-card flex items-center gap-4 p-5">
          <div className="rounded-xl bg-amber-100 p-3 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Total Tugas</p>
            <p className="text-2xl font-bold">{stats.totalAssignments}</p>
          </div>
        </div>
      </div>
    </>
  );
}

async function RecentMaterialsList() {
  const materials = await getMaterials();
  const recentMaterials = materials.slice(0, 5);

  return (
    <div className="space-y-3">
      {recentMaterials.map((item) => (
        <div key={item.id} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
          <p className="font-medium">{item.title}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{item.className}</p>
        </div>
      ))}
      {recentMaterials.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Belum ada materi tersedia.
        </p>
      )}
    </div>
  );
}

export default function StudentDashboard() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Dasbor Mahasiswa/Siswa
        </h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          Ringkasan progress belajar Anda.
        </p>
      </header>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardStats />
      </Suspense>

      <div className="app-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Materi Terbaru</h2>
        <Suspense
          fallback={
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
              ))}
            </div>
          }
        >
          <RecentMaterialsList />
        </Suspense>
      </div>
    </div>
  );
}
