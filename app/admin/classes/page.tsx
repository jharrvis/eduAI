"use client";

import { useState } from "react";
import { useStore, Class } from "@/store/useStore";
import { motion } from "motion/react";
import { Plus, Calendar, Users } from "lucide-react";

export default function AdminClasses() {
  const { classes, users, addClass } = useStore();
  const [isCreating, setIsCreating] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    schedule: "",
    students: [] as string[],
  });

  const students = users.filter((u) => u.role === "student");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addClass({
      id: `c${Date.now()}`,
      ...formData,
    });
    setIsCreating(false);
    setFormData({ name: "", schedule: "", students: [] });
  };

  const handleStudentToggle = (studentId: string) => {
    setFormData((prev) => ({
      ...prev,
      students: prev.students.includes(studentId)
        ? prev.students.filter((id) => id !== studentId)
        : [...prev.students, studentId],
    }));
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Classes
          </h1>
          <p className="text-slate-500 mt-2">
            Manage your classes and enrolled students.
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors font-medium shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Add Class
        </button>
      </header>

      {isCreating && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"
        >
          <h2 className="text-xl font-semibold mb-4">Create New Class</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Class Name
              </label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="e.g. Web Development 101"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Schedule
              </label>
              <input
                required
                type="text"
                value={formData.schedule}
                onChange={(e) =>
                  setFormData({ ...formData, schedule: e.target.value })
                }
                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="e.g. Monday, 10:00 AM"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Enroll Students
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {students.map((student) => (
                  <label
                    key={student.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={formData.students.includes(student.id)}
                      onChange={() => handleStudentToggle(student.id)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium text-slate-700">
                      {student.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium transition-colors"
              >
                Save Class
              </button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map((cls) => (
          <motion.div
            key={cls.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
          >
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              {cls.name}
            </h3>
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-4">
              <Calendar className="w-4 h-4" />
              {cls.schedule}
            </div>
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 text-slate-700 font-medium mb-2">
                <Users className="w-4 h-4 text-indigo-500" />
                Enrolled Students ({cls.students.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {cls.students.map((studentId) => {
                  const student = users.find((u) => u.id === studentId);
                  return student ? (
                    <span
                      key={studentId}
                      className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-medium"
                    >
                      {student.name}
                    </span>
                  ) : null;
                })}
                {cls.students.length === 0 && (
                  <span className="text-sm text-slate-400 italic">
                    No students enrolled.
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
        {classes.length === 0 && !isCreating && (
          <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-slate-200 border-dashed">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-slate-900">
              No classes yet
            </h3>
            <p className="text-slate-500 mt-1">
              Get started by creating your first class.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
