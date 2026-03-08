"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  createClass,
  deleteClass,
  getClassesWithMembers,
  updateClass,
  type ClassWithMembers,
} from "@/app/actions/classes";
import {
  createMeeting,
  createMeetingsBulk,
  deleteMeeting,
  getMeetings,
  updateMeeting,
} from "@/app/actions/class-meetings";
import { getClassRooms } from "@/app/actions/classrooms";
import { enrollUsers, removeEnrollment } from "@/app/actions/enrollments";
import { getStudents, getUsers, type UserWithProfile } from "@/app/actions/users";
import { Calendar, Loader2, Pencil, Plus, Trash2, Users, X } from "lucide-react";

type ClassForm = {
  name: string;
  academicYear: string;
  description: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
};

type MeetingForm = {
  meetingNumber: string;
  title: string;
  description: string;
  scheduledDate: string;
  durationMinutes: string;
  classRoomId: string;
};

type MeetingItem = {
  id: string;
  meetingNumber: number;
  title: string;
  description: string | null;
  scheduledDate: Date;
  endDate: Date;
  durationMinutes: number;
  classRoomId: string | null;
};

type ClassRoomItem = {
  id: string;
  code: string;
  name: string;
  location: string | null;
  capacity: number | null;
  isActive: boolean;
};

function toLocalInputValue(date: Date) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function AdminClasses() {
  const [rows, setRows] = useState<ClassWithMembers[]>([]);
  const [teachers, setTeachers] = useState<UserWithProfile[]>([]);
  const [students, setStudents] = useState<UserWithProfile[]>([]);
  const [classRooms, setClassRooms] = useState<ClassRoomItem[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleTab, setScheduleTab] = useState<"AUTO" | "MANUAL">("AUTO");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [scheduleRows, setScheduleRows] = useState<MeetingItem[]>([]);
  const [teacherSearch, setTeacherSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState<ClassForm>({
    name: "",
    academicYear: "",
    description: "",
    isActive: true,
    startDate: "",
    endDate: "",
  });
  const [manualMeeting, setManualMeeting] = useState<MeetingForm>({
    meetingNumber: "",
    title: "",
    description: "",
    scheduledDate: "",
    durationMinutes: "90",
    classRoomId: "",
  });
  const [autoConfig, setAutoConfig] = useState({
    type: "WEEKLY" as "WEEKLY" | "BIWEEKLY" | "CUSTOM",
    startDate: "",
    count: "16",
    durationMinutes: "90",
    customDates: "",
    classRoomId: "",
  });

  const classRoomMap = useMemo(
    () => new Map(classRooms.map((room) => [room.id, `${room.code} - ${room.name}`])),
    [classRooms],
  );

  const selectedClass = useMemo(
    () => rows.find((item) => item.id === selectedClassId) || null,
    [rows, selectedClassId],
  );

  const loadData = () => {
    startTransition(async () => {
      try {
        const [classRows, teacherRows, studentRows, classRoomRows] = await Promise.all([
          getClassesWithMembers(),
          getUsers("TEACHER"),
          getStudents(),
          getClassRooms(),
        ]);

        setRows(classRows);
        setTeachers(teacherRows);
        setStudents(studentRows);
        setClassRooms(classRoomRows as ClassRoomItem[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal memuat data kelas.");
      }
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setError(null);
    setForm({ name: "", academicYear: "", description: "", isActive: true, startDate: "", endDate: "" });
    setIsModalOpen(true);
  };

  const openEditModal = (item: ClassWithMembers) => {
    setEditingId(item.id);
    setError(null);
    setForm({
      name: item.name,
      academicYear: item.academicYear,
      description: item.description || "",
      isActive: item.isActive ?? true,
      startDate: item.startDate ? new Date(item.startDate).toISOString().slice(0, 16) : "",
      endDate: item.endDate ? new Date(item.endDate).toISOString().slice(0, 16) : "",
    });
    setIsModalOpen(true);
  };

  const openMemberModal = (item: ClassWithMembers) => {
    setSelectedClassId(item.id);
    setSelectedTeacherIds(item.teachers.map((member) => member.userId));
    setSelectedStudentIds(item.students.map((member) => member.userId));
    setTeacherSearch("");
    setStudentSearch("");
    setIsMemberModalOpen(true);
  };

  const openScheduleModal = (item: ClassWithMembers) => {
    setSelectedClassId(item.id);
    setScheduleTab("AUTO");
    setEditingMeetingId(null);
    setAutoConfig((prev) => ({
      ...prev,
      startDate: item.startDate ? toLocalInputValue(new Date(item.startDate)) : "",
    }));
    setManualMeeting({
      meetingNumber: "",
      title: "",
      description: "",
      scheduledDate: item.startDate ? toLocalInputValue(new Date(item.startDate)) : "",
      durationMinutes: "90",
      classRoomId: "",
    });
    setIsScheduleModalOpen(true);

    startTransition(async () => {
      try {
        const meetings = await getMeetings(item.id);
        setScheduleRows(meetings as MeetingItem[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal memuat jadwal pertemuan.");
      }
    });
  };

  const handleSaveClass = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        if (editingId) {
          await updateClass(editingId, {
            name: form.name.trim(),
            academicYear: form.academicYear.trim(),
            description: form.description.trim() || undefined,
            isActive: form.isActive,
            startDate: form.startDate || null,
            endDate: form.endDate || null,
          });
        } else {
          await createClass({
            name: form.name.trim(),
            academicYear: form.academicYear.trim(),
            description: form.description.trim() || undefined,
            isActive: form.isActive,
            startDate: form.startDate || undefined,
            endDate: form.endDate || undefined,
          });
        }

        setIsModalOpen(false);
        await loadData();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal menyimpan kelas.");
      }
    });
  };

  const handleDeleteClass = (classId: string, className: string) => {
    if (!window.confirm(`Hapus kelas '${className}'?`)) return;

    startTransition(async () => {
      try {
        await deleteClass(classId);
        await loadData();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal menghapus kelas.");
      }
    });
  };

  const handleSaveMembers = () => {
    if (!selectedClass) return;

    startTransition(async () => {
      try {
        const prevTeacherIds = new Set(selectedClass.teachers.map((item) => item.userId));
        const prevStudentIds = new Set(selectedClass.students.map((item) => item.userId));

        const nextTeacherIds = new Set(selectedTeacherIds);
        const nextStudentIds = new Set(selectedStudentIds);

        if (selectedTeacherIds.length > 0) {
          await enrollUsers(selectedClass.id, selectedTeacherIds, "TEACHER");
        }
        if (selectedStudentIds.length > 0) {
          await enrollUsers(selectedClass.id, selectedStudentIds, "STUDENT");
        }

        for (const userId of prevTeacherIds) {
          if (!nextTeacherIds.has(userId)) {
            await removeEnrollment(selectedClass.id, userId);
          }
        }

        for (const userId of prevStudentIds) {
          if (!nextStudentIds.has(userId)) {
            await removeEnrollment(selectedClass.id, userId);
          }
        }

        setIsMemberModalOpen(false);
        await loadData();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal menyimpan anggota kelas.");
      }
    });
  };

  const handleGenerateSchedule = () => {
    if (!selectedClassId) return;
    if (!autoConfig.startDate) {
      setError("Tanggal mulai wajib diisi.");
      return;
    }
    if (autoConfig.type !== "CUSTOM" && !autoConfig.count) {
      setError("Jumlah pertemuan wajib diisi.");
      return;
    }

    startTransition(async () => {
      try {
        await createMeetingsBulk(selectedClassId, {
          type: autoConfig.type,
          startDate: autoConfig.startDate,
          count: Number(autoConfig.count),
          durationMinutes: Number(autoConfig.durationMinutes),
          classRoomId: autoConfig.classRoomId || undefined,
          customDates:
            autoConfig.type === "CUSTOM"
              ? autoConfig.customDates
                  .split("\n")
                  .map((line) => line.trim())
                  .filter(Boolean)
              : undefined,
        });
        const meetings = await getMeetings(selectedClassId);
        setScheduleRows(meetings as MeetingItem[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal membuat jadwal otomatis.");
      }
    });
  };

  const handleSaveManualMeeting = () => {
    if (!selectedClassId) return;
    if (
      !manualMeeting.meetingNumber ||
      !manualMeeting.title.trim() ||
      !manualMeeting.scheduledDate ||
      !manualMeeting.durationMinutes
    ) {
      setError("Nomor, judul, tanggal, dan durasi pertemuan wajib diisi.");
      return;
    }

    startTransition(async () => {
      try {
        if (editingMeetingId) {
          await updateMeeting(editingMeetingId, {
            meetingNumber: Number(manualMeeting.meetingNumber),
            title: manualMeeting.title,
            description: manualMeeting.description,
            scheduledDate: manualMeeting.scheduledDate,
            durationMinutes: Number(manualMeeting.durationMinutes),
            classRoomId: manualMeeting.classRoomId || null,
          });
        } else {
          await createMeeting({
            classId: selectedClassId,
            meetingNumber: Number(manualMeeting.meetingNumber),
            title: manualMeeting.title,
            description: manualMeeting.description,
            scheduledDate: manualMeeting.scheduledDate,
            durationMinutes: Number(manualMeeting.durationMinutes),
            classRoomId: manualMeeting.classRoomId || undefined,
          });
        }
        const meetings = await getMeetings(selectedClassId);
        setScheduleRows(meetings as MeetingItem[]);
        setEditingMeetingId(null);
        setManualMeeting({
          meetingNumber: "",
          title: "",
          description: "",
          scheduledDate: "",
          durationMinutes: "90",
          classRoomId: "",
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal menyimpan jadwal pertemuan.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Kelas
          </h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Kelola kelas dan enrollment dosen/mahasiswa.
          </p>
        </div>

        <button type="button" onClick={openCreateModal} className="app-btn-primary" disabled={isPending}>
          <Plus className="h-5 w-5" />
          Tambah Kelas
        </button>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {rows.map((item) => (
          <div key={item.id} className="app-card space-y-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{item.name}</h3>
                <div className="mt-1 inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <Calendar className="h-4 w-4" />
                  {item.academicYear}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className={`rounded-full px-2 py-1 font-medium ${item.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"}`}>
                    {item.isActive ? "Aktif" : "Tidak Aktif"}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {item.startDate ? new Date(item.startDate).toLocaleDateString() : "-"} s/d {item.endDate ? new Date(item.endDate).toLocaleDateString() : "-"}
                  </span>
                </div>
                {item.description && (
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.description}</p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => openEditModal(item)}
                  className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  aria-label="Ubah kelas"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteClass(item.id, item.name)}
                  className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  aria-label="Hapus kelas"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  <Users className="h-4 w-4" />
                  Dosen/Guru ({item.teachers.length})
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {item.teachers.length > 0 ? (
                  item.teachers.map((member) => (
                    <span
                      key={member.userId}
                      className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                    >
                      {member.name}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">Belum ada dosen.</p>
                )}
              </div>

              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Mahasiswa/Siswa ({item.students.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {item.students.length > 0 ? (
                  item.students.map((member) => (
                    <span
                      key={member.userId}
                      className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                    >
                      {member.name}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">Belum ada mahasiswa/siswa.</p>
                )}
              </div>
            </div>

            <button type="button" onClick={() => openMemberModal(item)} className="app-btn-ghost" disabled={isPending}>
              Atur Enrollment
            </button>
            <button type="button" onClick={() => openScheduleModal(item)} className="app-btn-ghost" disabled={isPending}>
              Atur Jadwal
            </button>
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
              "Belum ada data kelas."
            )}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="app-card w-full max-w-xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                {editingId ? "Ubah Kelas" : "Tambah Kelas"}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                aria-label="Tutup modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveClass} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Nama Kelas
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="app-input"
                  placeholder="Contoh: Pemrograman Web Lanjut"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Tahun Akademik
                </label>
                <input
                  type="text"
                  value={form.academicYear}
                  onChange={(e) => setForm((prev) => ({ ...prev, academicYear: e.target.value }))}
                  className="app-input"
                  placeholder="Contoh: 2026/2027"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Deskripsi
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="app-input"
                  placeholder="Opsional"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                />
                Kelas aktif
              </label>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                    Tanggal Mulai
                  </label>
                  <input
                    type="datetime-local"
                    value={form.startDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
                    className="app-input"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                    Tanggal Selesai
                  </label>
                  <input
                    type="datetime-local"
                    value={form.endDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
                    className="app-input"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="app-btn-ghost" disabled={isPending}>
                  Batal
                </button>
                <button type="submit" className="app-btn-primary" disabled={isPending}>
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {editingId ? "Perbarui" : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isMemberModalOpen && selectedClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="app-card w-full max-w-3xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Anggota Kelas: {selectedClass.name}
              </h2>
              <button
                type="button"
                onClick={() => setIsMemberModalOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                aria-label="Tutup modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Dosen/Guru</h3>
                <input className="app-input mb-2" value={teacherSearch} onChange={(e) => setTeacherSearch(e.target.value)} placeholder="Cari nama/email dosen" />
                <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  {teachers
                    .filter((teacher) => {
                      const keyword = teacherSearch.trim().toLowerCase();
                      if (!keyword) return true;
                      return teacher.name.toLowerCase().includes(keyword) || teacher.email.toLowerCase().includes(keyword);
                    })
                    .map((teacher) => (
                    <label key={teacher.id} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                      <input
                        type="checkbox"
                        checked={selectedTeacherIds.includes(teacher.id)}
                        onChange={(e) => {
                          setSelectedTeacherIds((prev) => {
                            if (e.target.checked) return [...prev, teacher.id];
                            return prev.filter((item) => item !== teacher.id);
                          });
                        }}
                      />
                      <span>{teacher.name}</span>
                    </label>
                  ))}
                  {teachers.length === 0 && <p className="text-sm text-slate-400">Belum ada pengguna TEACHER.</p>}
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Mahasiswa/Siswa</h3>
                <input className="app-input mb-2" value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} placeholder="Cari nama/NIM mahasiswa" />
                <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  {students
                    .filter((student) => {
                      const keyword = studentSearch.trim().toLowerCase();
                      if (!keyword) return true;
                      return (
                        student.name.toLowerCase().includes(keyword) ||
                        (student.nim || "").toLowerCase().includes(keyword)
                      );
                    })
                    .map((student) => (
                    <label key={student.id} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.includes(student.id)}
                        onChange={(e) => {
                          setSelectedStudentIds((prev) => {
                            if (e.target.checked) return [...prev, student.id];
                            return prev.filter((item) => item !== student.id);
                          });
                        }}
                      />
                      <span>{student.name} {student.nim ? `(${student.nim})` : ""}</span>
                    </label>
                  ))}
                  {students.length === 0 && <p className="text-sm text-slate-400">Belum ada pengguna STUDENT.</p>}
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setIsMemberModalOpen(false)} className="app-btn-ghost" disabled={isPending}>
                Batal
              </button>
              <button type="button" onClick={handleSaveMembers} className="app-btn-primary" disabled={isPending}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Simpan Anggota Kelas
              </button>
            </div>
          </div>
        </div>
      )}

      {isScheduleModalOpen && selectedClass && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 p-4">
          <div className="flex min-h-full items-start justify-center py-2">
            <div className="app-card flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-900">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Jadwal Pertemuan: {selectedClass.name}
              </h2>
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                aria-label="Tutup modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-4">
            <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setScheduleTab("AUTO")}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${scheduleTab === "AUTO" ? "bg-white shadow dark:bg-slate-800" : "text-slate-500 dark:text-slate-400"}`}
              >
                Buat Jadwal Otomatis
              </button>
              <button
                type="button"
                onClick={() => setScheduleTab("MANUAL")}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${scheduleTab === "MANUAL" ? "bg-white shadow dark:bg-slate-800" : "text-slate-500 dark:text-slate-400"}`}
              >
                Tambah Manual
              </button>
            </div>

            {scheduleTab === "AUTO" ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Tanggal Mulai</label>
                    <input
                      type="datetime-local"
                      className="app-input"
                      value={autoConfig.startDate}
                      onChange={(e) => setAutoConfig((prev) => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  {autoConfig.type !== "CUSTOM" && (
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Jumlah Pertemuan</label>
                      <input
                        type="number"
                        min={1}
                        className="app-input"
                        value={autoConfig.count}
                        onChange={(e) => setAutoConfig((prev) => ({ ...prev, count: e.target.value }))}
                      />
                    </div>
                  )}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Durasi (menit)</label>
                    <input
                      type="number"
                      min={1}
                      className="app-input"
                      value={autoConfig.durationMinutes}
                      onChange={(e) => setAutoConfig((prev) => ({ ...prev, durationMinutes: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Tipe</label>
                    <select
                      className="app-input"
                      value={autoConfig.type}
                      onChange={(e) => setAutoConfig((prev) => ({ ...prev, type: e.target.value as "WEEKLY" | "BIWEEKLY" | "CUSTOM" }))}
                    >
                      <option value="WEEKLY">Mingguan</option>
                      <option value="BIWEEKLY">Dua Mingguan</option>
                      <option value="CUSTOM">Custom</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Ruangan (Opsional)</label>
                    <select
                      className="app-input"
                      value={autoConfig.classRoomId}
                      onChange={(e) => setAutoConfig((prev) => ({ ...prev, classRoomId: e.target.value }))}
                    >
                      <option value="">Tanpa Ruangan</option>
                      {classRooms
                        .filter((room) => room.isActive)
                        .map((room) => (
                          <option key={room.id} value={room.id}>
                            {room.code} - {room.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
                {autoConfig.type === "CUSTOM" && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Tanggal Custom (1 baris = 1 tanggal ISO/datetime)
                    </label>
                    <textarea
                      rows={4}
                      className="app-input"
                      value={autoConfig.customDates}
                      onChange={(e) => setAutoConfig((prev) => ({ ...prev, customDates: e.target.value }))}
                      placeholder={"2026-08-01T08:00:00.000Z\n2026-08-15T08:00:00.000Z"}
                    />
                  </div>
                )}
                <button type="button" className="app-btn-primary" onClick={handleGenerateSchedule} disabled={isPending}>
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Generate Jadwal
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
                  <input className="app-input" placeholder="Nomor" value={manualMeeting.meetingNumber} onChange={(e) => setManualMeeting((prev) => ({ ...prev, meetingNumber: e.target.value }))} />
                  <input className="app-input" placeholder="Judul" value={manualMeeting.title} onChange={(e) => setManualMeeting((prev) => ({ ...prev, title: e.target.value }))} />
                  <input className="app-input" placeholder="Deskripsi" value={manualMeeting.description} onChange={(e) => setManualMeeting((prev) => ({ ...prev, description: e.target.value }))} />
                  <input type="datetime-local" className="app-input" value={manualMeeting.scheduledDate} onChange={(e) => setManualMeeting((prev) => ({ ...prev, scheduledDate: e.target.value }))} />
                  <input type="number" min={1} className="app-input" placeholder="Durasi (menit)" value={manualMeeting.durationMinutes} onChange={(e) => setManualMeeting((prev) => ({ ...prev, durationMinutes: e.target.value }))} />
                  <select className="app-input" value={manualMeeting.classRoomId} onChange={(e) => setManualMeeting((prev) => ({ ...prev, classRoomId: e.target.value }))}>
                    <option value="">Tanpa Ruangan</option>
                    {classRooms
                      .filter((room) => room.isActive)
                      .map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.code} - {room.name}
                        </option>
                      ))}
                  </select>
                </div>
                <button type="button" className="app-btn-primary" onClick={handleSaveManualMeeting} disabled={isPending}>
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {editingMeetingId ? "Perbarui Pertemuan" : "Tambah Pertemuan"}
                </button>
              </div>
            )}

            <div className="mt-6 space-y-2">
              {scheduleRows.map((meeting) => (
                <div key={meeting.id} className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">Pertemuan {meeting.meetingNumber}: {meeting.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(meeting.scheduledDate).toLocaleString()} - {new Date(meeting.endDate).toLocaleTimeString()}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Durasi: {meeting.durationMinutes} menit</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Ruangan: {meeting.classRoomId ? (classRoomMap.get(meeting.classRoomId) || "Tidak ditemukan") : "-"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        onClick={() => {
                          setScheduleTab("MANUAL");
                          setEditingMeetingId(meeting.id);
                          setManualMeeting({
                            meetingNumber: String(meeting.meetingNumber),
                            title: meeting.title,
                            description: meeting.description || "",
                            scheduledDate: toLocalInputValue(new Date(meeting.scheduledDate)),
                            durationMinutes: String(meeting.durationMinutes),
                            classRoomId: meeting.classRoomId || "",
                          });
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        onClick={() => {
                          if (!window.confirm(`Hapus pertemuan ${meeting.meetingNumber}?`)) return;
                          startTransition(async () => {
                            try {
                              await deleteMeeting(meeting.id);
                              if (selectedClassId) {
                                const meetings = await getMeetings(selectedClassId);
                                setScheduleRows(meetings as MeetingItem[]);
                              }
                            } catch (err) {
                              setError(err instanceof Error ? err.message : "Gagal menghapus pertemuan.");
                            }
                          });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {scheduleRows.length === 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada jadwal pertemuan.</p>
              )}
            </div>
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
