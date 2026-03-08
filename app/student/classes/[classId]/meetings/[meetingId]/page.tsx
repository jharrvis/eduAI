"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getStudentClassById } from "@/app/actions/classes";
import { getMeetings } from "@/app/actions/class-meetings";
import { getMaterials } from "@/app/actions/materials";
import { getAssignmentsWithMySubmission, submitAssignment } from "@/app/actions/submissions";
import FileUpload from "@/app/components/file-upload";
import RichTextEditor from "@/app/components/rich-text-editor";
import { CheckCircle, FileText, Loader2, Lock, Send } from "lucide-react";

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
  instructions: string | null;
  dueDate: Date;
  mySubmission: {
    answerText: string | null;
    aiFeedback: string | null;
    aiScore: number | null;
    finalGrade: number | null;
    status: string;
  } | null;
};

export default function StudentMeetingDetailPage() {
  const params = useParams<{ classId: string; meetingId: string }>();
  const { classId, meetingId } = params;

  const [className, setClassName] = useState("");
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [answerMap, setAnswerMap] = useState<Record<string, string>>({});
  const [fileMap, setFileMap] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadData = useCallback(() => {
    startTransition(async () => {
      try {
        const [classData, meetingRows, materialRows, assignmentRows] = await Promise.all([
          getStudentClassById(classId),
          getMeetings(classId),
          getMaterials(classId),
          getAssignmentsWithMySubmission(classId),
        ]);

        setClassName(classData.name);

        const foundMeeting = (meetingRows as Meeting[]).find((m) => m.id === meetingId) || null;
        setMeeting(foundMeeting);

        const meetingMaterials = (materialRows as Material[]).filter((m) => m.meetingId === meetingId);
        setMaterials(meetingMaterials);
        if (meetingMaterials.length > 0) {
          setSelectedMaterialId((prev) => prev ?? meetingMaterials[0].id);
        }

        setAssignments((assignmentRows as Assignment[]).filter((a) => a.meetingId === meetingId));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal memuat pertemuan.");
      }
    });
  }, [classId, meetingId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedMaterial = useMemo(
    () => materials.find((m) => m.id === selectedMaterialId) || null,
    [materials, selectedMaterialId],
  );

  const now = new Date();
  const isLocked = meeting ? new Date(meeting.scheduledDate) > now : false;

  if (isPending && !meeting) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="space-y-6">
        <Link href={`/student/classes/${classId}`} className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
          ← {className}
        </Link>
        <div className="flex flex-col items-center justify-center rounded-xl border border-amber-200 bg-amber-50 py-16 text-center dark:border-amber-900/40 dark:bg-amber-900/10">
          <Lock className="mb-3 h-10 w-10 text-amber-400" />
          <h2 className="text-lg font-semibold text-amber-800 dark:text-amber-200">Pertemuan Terkunci</h2>
          <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
            Tersedia pada{" "}
            {meeting && new Date(meeting.scheduledDate).toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <Link href={`/student/classes/${classId}`} className="hover:text-slate-700 dark:hover:text-slate-200">
          {className || "Kelas"}
        </Link>
        <span>/</span>
        <span className="text-slate-700 dark:text-slate-200">
          {meeting ? `Pertemuan ${meeting.meetingNumber}: ${meeting.title}` : "Detail Pertemuan"}
        </span>
      </div>

      {meeting && (
        <header>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Pertemuan {meeting.meetingNumber}: {meeting.title}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {new Date(meeting.scheduledDate).toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          {meeting.description && (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{meeting.description}</p>
          )}
        </header>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main — Materials */}
        <div className="space-y-4 lg:col-span-2">
          <div className="app-card overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-3 dark:border-slate-800 dark:bg-slate-800/60">
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">Materi Pertemuan</h2>
            </div>

            {materials.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                Belum ada materi untuk pertemuan ini.
              </div>
            ) : (
              <div className="p-5">
                {/* Material List with OL */}
                <ol className="space-y-4">
                  {materials.map((m, index) => (
                    <li key={m.id} className="rounded-lg border border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => setSelectedMaterialId(m.id)}
                        className={`flex w-full items-start gap-3 p-3 text-left transition ${
                          selectedMaterialId === m.id
                            ? "bg-blue-50 dark:bg-blue-900/20"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                      >
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          selectedMaterialId === m.id
                            ? "bg-blue-600 text-white"
                            : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                        }`}>
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium ${
                            selectedMaterialId === m.id
                              ? "text-blue-700 dark:text-blue-300"
                              : "text-slate-900 dark:text-slate-100"
                          }`}>
                            {m.title}
                          </p>
                          {m.content && (
                            <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                              {m.content.replace(/<[^>]*>/g, "").slice(0, 100)}
                              {m.content.replace(/<[^>]*>/g, "").length > 100 ? "..." : ""}
                            </p>
                          )}
                        </div>
                        <FileText className={`h-5 w-5 shrink-0 ${
                          selectedMaterialId === m.id
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-slate-400"
                        }`} />
                      </button>

                      {/* Selected Material Content */}
                      {selectedMaterialId === m.id && (
                        <div className="border-t border-slate-200 px-3 pb-3 pt-2 dark:border-slate-700">
                          {m.content && (
                            <div className="prose prose-sm max-w-none dark:prose-invert">
                              <RichTextEditor value={m.content} />
                            </div>
                          )}
                          {m.fileUrl && (
                            <div className="mt-3 flex items-center gap-2">
                              <a
                                href={m.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/40"
                              >
                                <FileText className="h-4 w-4" />
                                Buka Lampiran
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar — Assignments */}
        <div className="space-y-3">
          <div className="app-card overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-3 dark:border-slate-800 dark:bg-slate-800/60">
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                Tugas ({assignments.length})
              </h2>
            </div>

            {assignments.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                Belum ada tugas untuk pertemuan ini.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {assignments.map((a, index) => {
                  const isRevision = a.mySubmission?.status === "REVISION";
                  const canSubmit = !a.mySubmission || isRevision;
                  const answerValue = answerMap[a.id] ?? a.mySubmission?.answerText ?? "";
                  const isLate = new Date(a.dueDate) < now && !a.mySubmission;

                  return (
                    <li key={a.id} className="p-4">
                      <div className="mb-3">
                        <div className="flex items-start gap-2">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                            {index + 1}
                          </span>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">{a.title}</p>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span>Tenggat: {new Date(a.dueDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
                          {isLate && (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-600 dark:bg-red-900/20 dark:text-red-400">
                              Terlambat
                            </span>
                          )}
                        </div>
                        {a.instructions && (
                          <div className="mt-2 rounded-lg bg-slate-50 p-2 text-xs dark:bg-slate-800">
                            <RichTextEditor value={a.instructions} />
                          </div>
                        )}
                      </div>

                      {canSubmit ? (
                        <div className="space-y-2">
                          {isRevision && (
                            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                              Perlu revisi. Silakan kirim ulang.
                            </p>
                          )}
                          <textarea
                            rows={4}
                            className="app-input text-sm"
                            value={answerValue}
                            onChange={(e) => setAnswerMap((prev) => ({ ...prev, [a.id]: e.target.value }))}
                            placeholder="Tulis jawaban Anda di sini..."
                          />
                          <FileUpload
                            label="Lampiran (Opsional)"
                            scope="submissions"
                            value={fileMap[a.id] || ""}
                            onChange={(url) => setFileMap((prev) => ({ ...prev, [a.id]: url }))}
                            disabled={isPending}
                          />
                          <button
                            type="button"
                            className="app-btn-primary w-full justify-center"
                            disabled={isPending || !answerValue.trim()}
                            onClick={() => {
                              startTransition(async () => {
                                try {
                                  await submitAssignment(a.id, {
                                    answerText: answerValue,
                                    fileUrl: fileMap[a.id] || undefined,
                                  });
                                  await loadData();
                                } catch (err) {
                                  setError(err instanceof Error ? err.message : "Gagal mengumpulkan tugas.");
                                }
                              });
                            }}
                          >
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            {isRevision ? "Kirim Revisi" : "Kumpulkan"}
                          </button>
                        </div>
                      ) : (
                        <div className="rounded-lg bg-emerald-50 p-3 text-xs dark:bg-emerald-900/10">
                          <p className="flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-300">
                            <CheckCircle className="h-3.5 w-3.5" />
                            {a.mySubmission?.status}
                          </p>
                          {a.mySubmission?.finalGrade !== null && (
                            <p className="mt-1 text-emerald-600 dark:text-emerald-400">
                              Nilai: <span className="font-semibold">{a.mySubmission?.finalGrade}</span>
                            </p>
                          )}
                          {a.mySubmission?.aiScore !== null && (
                            <p className="text-emerald-600 dark:text-emerald-400">
                              Skor AI: <span className="font-semibold">{a.mySubmission?.aiScore}</span>
                            </p>
                          )}
                          {a.mySubmission?.aiFeedback && (
                            <p className="mt-1 whitespace-pre-wrap text-slate-600 dark:text-slate-300">{a.mySubmission.aiFeedback}</p>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
