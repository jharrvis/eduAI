"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { getClassesWithMembers, type ClassWithMembers } from "@/app/actions/classes";
import { getMeetings } from "@/app/actions/class-meetings";
import { getAssignments } from "@/app/actions/assignments";
import { getMaterials } from "@/app/actions/materials";
import { BookOpen, ChevronDown, ChevronUp, Loader2, Users } from "lucide-react";

type MeetingItem = {
  id: string;
  classId: string;
  meetingNumber: number;
  title: string;
  scheduledDate: Date;
};

export default function TeacherClassesPage() {
  const [rows, setRows] = useState<ClassWithMembers[]>([]);
  const [meetingMap, setMeetingMap] = useState<Record<string, MeetingItem[]>>({});
  const [meetingStatsMap, setMeetingStatsMap] = useState<
    Record<string, Record<string, { materials: number; assignments: number }>>
  >({});
  const [openClassId, setOpenClassId] = useState<string | null>(null);
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

  const toggleMeetings = (classId: string) => {
    if (openClassId === classId) {
      setOpenClassId(null);
      return;
    }

    setOpenClassId(classId);
    if (meetingMap[classId]) return;

    startTransition(async () => {
      try {
        const [meetings, materials, assignments] = await Promise.all([
          getMeetings(classId),
          getMaterials(classId),
          getAssignments(classId),
        ]);

        const stats: Record<string, { materials: number; assignments: number }> = {};
        (meetings as MeetingItem[]).forEach((meeting) => {
          stats[meeting.id] = { materials: 0, assignments: 0 };
        });
        (materials as Array<{ meetingId: string | null }>).forEach((m) => {
          if (m.meetingId && stats[m.meetingId]) stats[m.meetingId].materials += 1;
        });
        (assignments as Array<{ meetingId: string | null }>).forEach((a) => {
          if (a.meetingId && stats[a.meetingId]) stats[a.meetingId].assignments += 1;
        });

        setMeetingMap((prev) => ({ ...prev, [classId]: meetings as MeetingItem[] }));
        setMeetingStatsMap((prev) => ({ ...prev, [classId]: stats }));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal memuat jadwal pertemuan.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Kelas Saya</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">Daftar kelas yang Anda ampu dan jadwal pertemuan.</p>
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
                <p className="mb-2 inline-flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4" />Dosen/Guru ({item.teachers.length})</p>
                <div className="flex flex-wrap gap-2">
                  {item.teachers.map((t) => <span key={t.userId} className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{t.name}</span>)}
                </div>
              </div>

              <div>
                <p className="mb-2 inline-flex items-center gap-2 text-sm font-semibold"><BookOpen className="h-4 w-4" />Mahasiswa/Siswa ({item.students.length})</p>
                <div className="flex flex-wrap gap-2">
                  {item.students.length > 0 ? item.students.map((s) => <span key={s.userId} className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">{s.name}</span>) : <span className="text-sm text-slate-400">Belum ada siswa.</span>}
                </div>
              </div>

              <button type="button" className="app-btn-ghost" onClick={() => toggleMeetings(item.id)}>
                {openClassId === item.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Jadwal Pertemuan
              </button>

              {openClassId === item.id && (
                <div className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  {(meetingMap[item.id] || []).map((meeting) => (
                    <Link
                      key={meeting.id}
                      href={`/teacher/classes/${item.id}/meetings/${meeting.id}`}
                      className="block rounded-lg bg-slate-50 p-3 text-sm hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800"
                    >
                      <p className="font-medium">
                        Pertemuan {meeting.meetingNumber}: {meeting.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(meeting.scheduledDate).toLocaleString()}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Materi: {meetingStatsMap[item.id]?.[meeting.id]?.materials ?? 0} • Tugas: {meetingStatsMap[item.id]?.[meeting.id]?.assignments ?? 0}
                      </p>
                    </Link>
                  ))}
                  {(meetingMap[item.id] || []).length === 0 && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada jadwal pertemuan.</p>
                  )}
                </div>
              )}
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
