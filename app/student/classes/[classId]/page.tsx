"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { getAssignmentsWithMySubmission } from "@/app/actions/submissions";
import { getStudentClassById } from "@/app/actions/classes";
import { getMeetings } from "@/app/actions/class-meetings";
import { getMaterials } from "@/app/actions/materials";
import { useParams } from "next/navigation";
import { Lock, Unlock } from "lucide-react";

type Meeting = {
  id: string;
  meetingNumber: number;
  title: string;
  description: string | null;
  scheduledDate: Date;
};

type Material = {
  id: string;
  meetingId: string | null;
  title: string;
  content: string | null;
  fileUrl: string | null;
};

type Assignment = {
  id: string;
  meetingId: string | null;
  title: string;
  dueDate: Date;
  mySubmission: { answerText: string | null } | null;
};

export default function StudentClassDetailPage() {
  const params = useParams<{ classId: string }>();
  const classId = params.classId;
  const [className, setClassName] = useState("");
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      try {
        const classData = await getStudentClassById(classId);
        const [meetingRows, materialRows, assignmentRows] = await Promise.all([
          getMeetings(classId),
          getMaterials(classId),
          getAssignmentsWithMySubmission(classId),
        ]);

        setClassName(classData.name);
        setMeetings(meetingRows as Meeting[]);
        setMaterials(materialRows as Material[]);
        setAssignments(assignmentRows as Assignment[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal memuat detail kelas.");
      }
    });
  }, [classId]);

  const now = new Date();

  const materialsByMeeting = useMemo(() => {
    const map = new Map<string, Material[]>();
    materials.forEach((m) => {
      if (!m.meetingId) return;
      if (!map.has(m.meetingId)) map.set(m.meetingId, []);
      map.get(m.meetingId)?.push(m);
    });
    return map;
  }, [materials]);

  const assignmentsByMeeting = useMemo(() => {
    const map = new Map<string, Assignment[]>();
    assignments.forEach((a) => {
      if (!a.meetingId) return;
      if (!map.has(a.meetingId)) map.set(a.meetingId, []);
      map.get(a.meetingId)?.push(a);
    });
    return map;
  }, [assignments]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Jadwal Kelas {className ? `• ${className}` : ""}
        </h1>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          {error === "FORBIDDEN" ? "Anda tidak memiliki akses ke kelas ini." : error}
        </div>
      )}

      <div className="space-y-4">
        {meetings.map((meeting) => {
          const unlocked = new Date(meeting.scheduledDate) <= now;
          const meetingMaterials = materialsByMeeting.get(meeting.id) || [];
          const meetingAssignments = assignmentsByMeeting.get(meeting.id) || [];

          return (
            <div key={meeting.id} className="app-card p-5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Pertemuan {meeting.meetingNumber}: {meeting.title}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {new Date(meeting.scheduledDate).toLocaleString()}
                  </p>
                  {meeting.description && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{meeting.description}</p>}
                </div>
                <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${unlocked ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"}`}>
                  {unlocked ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                  {unlocked ? "Terbuka" : "Terkunci"}
                </span>
              </div>

              {!unlocked ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Tersedia pada {new Date(meeting.scheduledDate).toLocaleString()}
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div>
                    <h3 className="mb-2 font-semibold">Materi</h3>
                    <div className="space-y-2">
                      {meetingMaterials.map((m) => (
                        <div key={m.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
                          <p className="font-medium">{m.title}</p>
                          {m.fileUrl && <p className="text-blue-600 dark:text-blue-400">{m.fileUrl}</p>}
                        </div>
                      ))}
                      {meetingMaterials.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada materi.</p>}
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-2 font-semibold">Tugas</h3>
                    <div className="space-y-2">
                      {meetingAssignments.map((a) => (
                        <div key={a.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
                          <p className="font-medium">{a.title}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Tenggat: {new Date(a.dueDate).toLocaleString()}</p>
                          <p className="mt-1 text-xs">{a.mySubmission ? "Sudah dikumpulkan" : "Belum dikumpulkan"}</p>
                        </div>
                      ))}
                      {meetingAssignments.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada tugas.</p>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!isPending && meetings.length === 0 && !error && (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Belum ada jadwal pertemuan.
        </div>
      )}
    </div>
  );
}
