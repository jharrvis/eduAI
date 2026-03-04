"use client";

import { useStore } from "@/store/useStore";
import { motion } from "motion/react";
import { BookOpen, Users, Calendar, CheckCircle } from "lucide-react";

export default function AdminDashboard() {
  const { classes, materials, users, assignments } = useStore();
  const students = users.filter((u) => u.role === "student");

  const stats = [
    {
      name: "Total Classes",
      value: classes.length,
      icon: Calendar,
      color: "bg-blue-500",
    },
    {
      name: "Total Materials",
      value: materials.length,
      icon: BookOpen,
      color: "bg-indigo-500",
    },
    {
      name: "Total Students",
      value: students.length,
      icon: Users,
      color: "bg-emerald-500",
    },
    {
      name: "Assignments Submitted",
      value: assignments.length,
      icon: CheckCircle,
      color: "bg-amber-500",
    },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Dashboard Overview
        </h1>
        <p className="text-slate-500 mt-2">
          Welcome back! Here&apos;s what&apos;s happening today.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
        {/* Recent Classes */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Recent Classes
          </h2>
          <div className="space-y-4">
            {classes.slice(0, 5).map((cls) => (
              <div
                key={cls.id}
                className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100"
              >
                <div>
                  <h3 className="font-medium text-slate-900">{cls.name}</h3>
                  <p className="text-sm text-slate-500">{cls.schedule}</p>
                </div>
                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                  {cls.students.length} Students
                </span>
              </div>
            ))}
            {classes.length === 0 && (
              <p className="text-slate-500 text-center py-4">No classes yet.</p>
            )}
          </div>
        </div>

        {/* Recent Materials */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Recent Materials
          </h2>
          <div className="space-y-4">
            {materials.slice(0, 5).map((mat) => {
              const cls = classes.find((c) => c.id === mat.classId);
              return (
                <div
                  key={mat.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100"
                >
                  <div>
                    <h3 className="font-medium text-slate-900">{mat.title}</h3>
                    <p className="text-sm text-slate-500">
                      {cls?.name || "Unknown Class"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {mat.summary && (
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md text-xs font-medium">
                        Summary
                      </span>
                    )}
                    {mat.quiz && (
                      <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-md text-xs font-medium">
                        Quiz
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {materials.length === 0 && (
              <p className="text-slate-500 text-center py-4">
                No materials yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
