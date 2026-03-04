"use client";

import { useStore } from "@/store/useStore";
import { motion } from "motion/react";
import { Users, BookOpen, CheckCircle } from "lucide-react";

export default function AdminStudents() {
  const { users, classes, assignments } = useStore();
  const students = users.filter((u) => u.role === "student");

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Students
        </h1>
        <p className="text-slate-500 mt-2">
          Manage enrolled students and view their progress.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6">
        {students.map((student) => {
          const enrolledClasses = classes.filter((c) =>
            c.students.includes(student.id),
          );
          const studentAssignments = assignments.filter(
            (a) => a.studentId === student.id,
          );

          return (
            <motion.div
              key={student.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-xl">
                  {student.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {student.name}
                  </h3>
                  <p className="text-sm text-slate-500">ID: {student.id}</p>
                </div>
              </div>

              <div className="flex gap-6 w-full md:w-auto">
                <div className="flex-1 md:flex-none text-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <BookOpen className="w-5 h-5 text-indigo-500 mx-auto mb-1" />
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Classes
                  </p>
                  <p className="text-lg font-bold text-slate-900">
                    {enrolledClasses.length}
                  </p>
                </div>
                <div className="flex-1 md:flex-none text-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Assignments
                  </p>
                  <p className="text-lg font-bold text-slate-900">
                    {studentAssignments.length}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
        {students.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 border-dashed">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-slate-900">
              No students found
            </h3>
            <p className="text-slate-500 mt-1">
              There are currently no students registered.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
