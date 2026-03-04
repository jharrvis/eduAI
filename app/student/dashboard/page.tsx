"use client";

import { useStore } from "@/store/useStore";
import { motion } from "motion/react";
import { BookOpen, Calendar, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function StudentDashboard() {
  const { currentUser, classes, materials, assignments } = useStore();

  if (!currentUser) return null;

  const myClasses = classes.filter((c) => c.students.includes(currentUser.id));
  const myMaterials = materials.filter((m) =>
    myClasses.some((c) => c.id === m.classId),
  );
  const myAssignments = assignments.filter(
    (a) => a.studentId === currentUser.id,
  );

  const stats = [
    {
      name: "Enrolled Classes",
      value: myClasses.length,
      icon: Calendar,
      color: "bg-blue-500",
    },
    {
      name: "Available Materials",
      value: myMaterials.length,
      icon: BookOpen,
      color: "bg-indigo-500",
    },
    {
      name: "Completed Tasks",
      value: myAssignments.length,
      icon: CheckCircle,
      color: "bg-emerald-500",
    },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Welcome, {currentUser.name.split(" ")[0]}!
        </h1>
        <p className="text-slate-500 mt-2">
          Here&apos;s your learning progress for today.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4"
          >
            <div className={`p-4 rounded-xl ${stat.color} text-white`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.name}</p>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* My Schedule */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            My Schedule
          </h2>
          <div className="space-y-4">
            {myClasses.map((cls) => (
              <div
                key={cls.id}
                className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100"
              >
                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-medium text-slate-900">{cls.name}</h3>
                  <p className="text-sm text-slate-500">{cls.schedule}</p>
                </div>
              </div>
            ))}
            {myClasses.length === 0 && (
              <p className="text-slate-500 text-center py-4">
                No classes enrolled.
              </p>
            )}
          </div>
        </div>

        {/* Recent Materials */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Recent Materials
            </h2>
            <Link
              href="/student/materials"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              View All
            </Link>
          </div>
          <div className="space-y-4">
            {myMaterials.slice(0, 5).map((mat) => {
              const cls = classes.find((c) => c.id === mat.classId);
              return (
                <div
                  key={mat.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100"
                >
                  <div>
                    <h3 className="font-medium text-slate-900">{mat.title}</h3>
                    <p className="text-sm text-slate-500">{cls?.name}</p>
                  </div>
                  <Link
                    href={`/student/materials?id=${mat.id}`}
                    className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                  >
                    <BookOpen className="w-5 h-5" />
                  </Link>
                </div>
              );
            })}
            {myMaterials.length === 0 && (
              <p className="text-slate-500 text-center py-4">
                No materials available.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
