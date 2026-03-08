"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getTeacherClassById } from "@/app/actions/classes";
import { getMeetings } from "@/app/actions/class-meetings";
import { getMaterials } from "@/app/actions/materials";
import { getAssignments } from "@/app/actions/assignments";
import { BookOpen, ChevronRight, ClipboardList, Loader2, Users } from "lucide-react";

type ClassData = {
  id: string;
  name: string;
  academicYear: string;
  description: string | null;
  isActive: boolean;
  startDate: Date | null;
  endDate: Date | null;
  teachers: Array<{ userId: string; name: string; email: string }>;
  students: Array<{ userId: string; name: string; email: string }>;
};

type Meeting = {
  id: string;
  meetingNumber: number;
  title: string;
  description: string | null;
  scheduledDate: Date;
};

function getMeetingStatus(scheduledDate: Date): "past" | "today" | "upcoming" {
  const now = new Date();
  const d = new Date(scheduledDate);
  if (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  ) {
    return "today";
  }
  return d < now ? "past" : "upcoming";
}

const statusConfig = {
  past: { label: "Selesai", className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
  today: { label: "Hari Ini", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  upcoming: { label: "Mendatang", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
};

export default function TeacherClassDetailPage() {
  const params = useParams<{ classId: string }>();
  const classId = params.classId;

  const [classData, setClassData] = useState<ClassData | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [materials, setMaterials] = useState<Array<{ meetingId: string | null }>>([]);
  const [assignments, setAssignments] = useState<Array<{ meetingId: string | null }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadData = useCallback(() => {
    startTransition(async () => {
      try {
        const [cls, meetingRows, materialRows, assignmentRows] = await Promise.all([
          getTeacherClassById(classId),
          getMeetings(classId),
          getMaterials(classId),
          getAssignments(classId),
        ]);
        setClassData(cls as ClassData);
        setMeetings(meetingRows as Meeting[]);
        setMaterials(materialRows as Array<{ meetingId: string | null }>);
        setAssignments(assignmentRows as Array<{ meetingId: string | null }>);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal memuat detail kelas.");
      }
    });
  }, [classId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const statsMap = useMemo(() => {
    const map: Record<string, { materials: number; assignments: number }> = {};
    meetings.forEach((m) => { map[m.id] = { materials: 0, assignments: 0 }; });
    materials.forEach((m) => { if (m.meetingId && map[m.meetingId]) map[m.meetingId].materials++; });
    assignments.forEach((a) => { if (a.meetingId && map[a.meetingId]) map[a.meetingId].assignments++; });
    return map;
  }, [meetings, materials, assignments]);

  if (isPending && !classData) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/teacher/classes" className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
          ← Kelas Saya
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          {error === "FORBIDDEN" ? "Anda tidak memiliki akses ke kelas ini." : error}
        </div>
      )}

      {classData && (
        <>
          <header className="app-card p-6">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{classData.name}</h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{classData.academicYear}</p>
                {classData.description && (
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{classData.description}</p>
                )}
              </div>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                  classData.isActive
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                    : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                {classData.isActive ? "Aktif" : "Nonaktif"}
              </span>
            </div>

            {(classData.startDate || classData.endDate) && (
              <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
                {classData.startDate ? new Date(classData.startDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "—"}
                {" – "}
                {classData.endDate ? new Date(classData.endDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "—"}
              </p>
            )}

            <div className="flex flex-wrap gap-6 border-t border-slate-100 pt-4 dark:border-slate-800">
              <div>
                <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <Users className="h-3.5 w-3.5" /> Dosen/Guru ({classData.teachers.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {classData.teachers.map((t) => (
                    <span key={t.userId} className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      {t.name}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <Users className="h-3.5 w-3.5" /> Mahasiswa/Siswa ({classData.students.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {classData.students.length > 0 ? (
                    classData.students.map((s) => (
                      <span key={s.userId} className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                        {s.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">Belum ada mahasiswa/siswa.</span>
                  )}
                </div>
              </div>
            </div>
          </header>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">
              Jadwal Pertemuan ({meetings.length})
            </h2>

            <div className="space-y-2">
              {meetings.map((meeting) => {
                const status = getMeetingStatus(meeting.scheduledDate);
                const { label, className: statusClass } = statusConfig[status];
                const stats = statsMap[meeting.id] ?? { materials: 0, assignments: 0 };

                return (
                  <Link
                    key={meeting.id}
                    href={`/teacher/classes/${classId}/meetings/${meeting.id}`}
                    className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-300 hover:bg-blue-50/40 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-700 dark:hover:bg-blue-900/10"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      P{meeting.meetingNumber}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-900 dark:text-slate-100">{meeting.title}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {new Date(meeting.scheduledDate).toLocaleDateString("id-ID", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}{" "}
                        •{" "}
                        {new Date(meeting.scheduledDate).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      {meeting.description && (
                        <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{meeting.description}</p>
                      )}
                      <div className="mt-2 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3.5 w-3.5" />
                          {stats.materials} Materi
                        </span>
                        <span className="flex items-center gap-1">
                          <ClipboardList className="h-3.5 w-3.5" />
                          {stats.assignments} Tugas
                        </span>
                      </div>
                    </div>

                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${statusClass}`}>
                      {label}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                  </Link>
                );
              })}

              {!isPending && meetings.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  Belum ada jadwal pertemuan untuk kelas ini.
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
