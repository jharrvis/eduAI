"use client";

import { useStore } from "@/store/useStore";
import { motion } from "motion/react";
import { CheckCircle, BookOpen } from "lucide-react";
import Link from "next/link";

export default function StudentAssignments() {
  const { currentUser, assignments, materials, classes } = useStore();

  if (!currentUser) return null;

  const myAssignments = assignments.filter(
    (a) => a.studentId === currentUser.id,
  );

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          My Assignments
        </h1>
        <p className="text-slate-500 mt-2">
          View your submitted assignments and grades.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6">
        {myAssignments.map((assignment) => {
          const material = materials.find(
            (m) => m.id === assignment.materialId,
          );
          const cls = classes.find((c) => c.id === material?.classId);

          return (
            <motion.div
              key={assignment.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {material?.title || "Unknown Material"}
                  </h3>
                  <p className="text-sm text-indigo-600 font-medium mt-1">
                    {cls?.name}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                    <CheckCircle className="w-4 h-4" />
                    Submitted
                  </span>
                  {assignment.grade !== undefined && (
                    <span className="text-sm font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-full">
                      Grade: {assignment.grade}/100
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mt-4">
                <p className="text-sm font-medium text-slate-700 mb-2">
                  Your Submission:
                </p>
                <p className="text-slate-600 whitespace-pre-wrap text-sm">
                  {assignment.submission}
                </p>
              </div>
            </motion.div>
          );
        })}
        {myAssignments.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 border-dashed">
            <CheckCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-slate-900">
              No assignments submitted
            </h3>
            <p className="text-slate-500 mt-1">
              Go to your materials to complete assignments.
            </p>
            <Link
              href="/student/materials"
              className="inline-block mt-4 text-indigo-600 font-medium hover:text-indigo-700"
            >
              View Materials &rarr;
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
