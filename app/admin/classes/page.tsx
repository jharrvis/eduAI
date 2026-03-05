"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  createClass,
  deleteClass,
  getClassesWithMembers,
  updateClass,
  type ClassWithMembers,
} from "@/app/actions/classes";
import { enrollUsers, removeEnrollment } from "@/app/actions/enrollments";
import { getStudents, getUsers, type UserWithProfile } from "@/app/actions/users";
import { Calendar, Loader2, Pencil, Plus, Trash2, Users, X } from "lucide-react";

type ClassForm = {
  name: string;
  academicYear: string;
  description: string;
};

export default function AdminClasses() {
  const [rows, setRows] = useState<ClassWithMembers[]>([]);
  const [teachers, setTeachers] = useState<UserWithProfile[]>([]);
  const [students, setStudents] = useState<UserWithProfile[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState<ClassForm>({
    name: "",
    academicYear: "",
    description: "",
  });

  const selectedClass = useMemo(
    () => rows.find((item) => item.id === selectedClassId) || null,
    [rows, selectedClassId],
  );

  const loadData = () => {
    startTransition(async () => {
      try {
        const [classRows, teacherRows, studentRows] = await Promise.all([
          getClassesWithMembers(),
          getUsers("TEACHER"),
          getStudents(),
        ]);

        setRows(classRows);
        setTeachers(teacherRows);
        setStudents(studentRows);
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
    setForm({ name: "", academicYear: "", description: "" });
    setIsModalOpen(true);
  };

  const openEditModal = (item: ClassWithMembers) => {
    setEditingId(item.id);
    setError(null);
    setForm({
      name: item.name,
      academicYear: item.academicYear,
      description: item.description || "",
    });
    setIsModalOpen(true);
  };

  const openMemberModal = (item: ClassWithMembers) => {
    setSelectedClassId(item.id);
    setSelectedTeacherIds(item.teachers.map((member) => member.userId));
    setSelectedStudentIds(item.students.map((member) => member.userId));
    setIsMemberModalOpen(true);
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
          });
        } else {
          await createClass({
            name: form.name.trim(),
            academicYear: form.academicYear.trim(),
            description: form.description.trim() || undefined,
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
        setError(err instanceof Error ? err.message : "Gagal menyimpan enrollment.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Classes
          </h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Kelola kelas dan enrollment dosen/mahasiswa.
          </p>
        </div>

        <button type="button" onClick={openCreateModal} className="app-btn-primary" disabled={isPending}>
          <Plus className="h-5 w-5" />
          Add Class
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
                {item.description && (
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.description}</p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => openEditModal(item)}
                  className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  aria-label="Edit class"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteClass(item.id, item.name)}
                  className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  aria-label="Delete class"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  <Users className="h-4 w-4" />
                  Teachers ({item.teachers.length})
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
                Students ({item.students.length})
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
                {editingId ? "Edit Class" : "Add Class"}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                aria-label="Close modal"
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
                  placeholder="Optional"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="app-btn-ghost" disabled={isPending}>
                  Cancel
                </button>
                <button type="submit" className="app-btn-primary" disabled={isPending}>
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {editingId ? "Update" : "Save"}
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
                Enrollment: {selectedClass.name}
              </h2>
              <button
                type="button"
                onClick={() => setIsMemberModalOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Teacher</h3>
                <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  {teachers.map((teacher) => (
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
                  {teachers.length === 0 && <p className="text-sm text-slate-400">Belum ada user TEACHER.</p>}
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Student</h3>
                <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  {students.map((student) => (
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
                  {students.length === 0 && <p className="text-sm text-slate-400">Belum ada user STUDENT.</p>}
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setIsMemberModalOpen(false)} className="app-btn-ghost" disabled={isPending}>
                Cancel
              </button>
              <button type="button" onClick={handleSaveMembers} className="app-btn-primary" disabled={isPending}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save Enrollment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
