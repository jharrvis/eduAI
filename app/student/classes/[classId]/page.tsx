"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getStudentClassById } from "@/app/actions/classes";
import { getMeetings } from "@/app/actions/class-meetings";
import { BookOpen, ChevronRight, Lock, Loader2 } from "lucide-react";

type Meeting = {
  id: string;
  meetingNumber: number;
  title: string;
  description: string | null;
  scheduledDate: Date;
};

export default function StudentClassDetailPage() {
  const params = useParams<{ classId: string }>();
  const classId = params.classId;
  const [className, setClassName] = useState("");
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadData = useCallback(() => {
    startTransition(async () => {
      try {
        const [classData, meetingRows] = await Promise.all([
          getStudentClassById(classId),
          getMeetings(classId),
        ]);
        setClassName(classData.name);
        setMeetings(meetingRows as Meeting[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal memuat detail kelas.");
      }
    });
  }, [classId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const now = new Date();

  if (isPending && !className) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/student/classes" className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
          ← Kelas Saya
        </Link>
      </div>

      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {className || "Detail Kelas"}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Pilih pertemuan untuk melihat materi dan tugas.</p>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          {error === "FORBIDDEN" ? "Anda tidak memiliki akses ke kelas ini." : error}
        </div>
      )}

      <div className="space-y-2">
        {meetings.map((meeting) => {
          const unlocked = new Date(meeting.scheduledDate) <= now;

          if (!unlocked) {
            return (
              <div
                key={meeting.id}
                className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4 opacity-60 dark:border-slate-700 dark:bg-slate-800/40"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                  P{meeting.meetingNumber}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-500 dark:text-slate-400">{meeting.title}</p>
                  <p className="text-sm text-slate-400 dark:text-slate-500">
                    {new Date(meeting.scheduledDate).toLocaleDateString("id-ID", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                    {" • "}
                    {new Date(meeting.scheduledDate).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                  <Lock className="h-3 w-3" />
                  Terkunci
                </span>
              </div>
            );
          }

          return (
            <Link
              key={meeting.id}
              href={`/student/classes/${classId}/meetings/${meeting.id}`}
              className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-300 hover:bg-blue-50/40 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-700 dark:hover:bg-blue-900/10"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
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
                  })}
                  {" • "}
                  {new Date(meeting.scheduledDate).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                {meeting.description && (
                  <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{meeting.description}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                  <BookOpen className="h-3 w-3" />
                  Terbuka
                </span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </div>
            </Link>
          );
        })}

        {!isPending && meetings.length === 0 && !error && (
          <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Belum ada jadwal pertemuan.
          </div>
        )}
      </div>
    </div>
  );
}
