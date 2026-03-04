"use client";

import { useState, useEffect } from "react";
import { useStore, Material } from "@/store/useStore";
import { motion } from "motion/react";
import {
  BookOpen,
  CheckCircle,
  HelpCircle,
  ArrowLeft,
  Send,
} from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";

export default function StudentMaterials() {
  const { currentUser, classes, materials, assignments, addAssignment } =
    useStore();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(
    null,
  );
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  const [assignmentText, setAssignmentText] = useState("");

  const myClasses = currentUser
    ? classes.filter((c) => c.students.includes(currentUser.id))
    : [];
  const myMaterials = materials.filter((m) =>
    myClasses.some((c) => c.id === m.classId),
  );

  useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      const mat = myMaterials.find((m) => m.id === id);
      if (mat) setSelectedMaterial(mat);
    }
  }, [searchParams, myMaterials]);

  if (!currentUser) return null;

  const handleMaterialClick = (mat: Material) => {
    setSelectedMaterial(mat);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(0);
    setAssignmentText("");
    router.push(`/student/materials?id=${mat.id}`);
  };

  const handleBack = () => {
    setSelectedMaterial(null);
    router.push("/student/materials");
  };

  const submitQuiz = () => {
    if (!selectedMaterial?.quiz) return;
    let score = 0;
    selectedMaterial.quiz.forEach((q, i) => {
      if (quizAnswers[i] === q.answer) score++;
    });
    setQuizScore(score);
    setQuizSubmitted(true);
  };

  const submitAssignment = () => {
    if (!selectedMaterial || !assignmentText.trim()) return;

    addAssignment({
      id: `a${Date.now()}`,
      materialId: selectedMaterial.id,
      studentId: currentUser.id,
      submission: assignmentText,
    });

    alert("Assignment submitted successfully!");
    setAssignmentText("");
  };

  if (selectedMaterial) {
    const cls = classes.find((c) => c.id === selectedMaterial.classId);
    const myAssignment = assignments.find(
      (a) =>
        a.materialId === selectedMaterial.id && a.studentId === currentUser.id,
    );

    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-6"
      >
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Materials
        </button>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <div className="mb-6 pb-6 border-b border-slate-100">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              {selectedMaterial.title}
            </h1>
            <p className="text-indigo-600 font-medium mt-2">{cls?.name}</p>
          </div>

          <div className="prose prose-slate max-w-none mb-8">
            <p className="whitespace-pre-wrap">{selectedMaterial.content}</p>
          </div>

          {selectedMaterial.summary && (
            <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 mb-8">
              <h3 className="text-emerald-800 font-bold mb-2 flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                AI Summary
              </h3>
              <p className="text-emerald-700 whitespace-pre-wrap text-sm leading-relaxed">
                {selectedMaterial.summary}
              </p>
            </div>
          )}

          {/* Quiz Section */}
          {selectedMaterial.quiz && selectedMaterial.quiz.length > 0 && (
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-8">
              <h3 className="text-slate-900 font-bold text-xl mb-4 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-indigo-500" />
                Knowledge Check Quiz
              </h3>

              <div className="space-y-6">
                {selectedMaterial.quiz.map((q, i) => (
                  <div
                    key={i}
                    className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"
                  >
                    <p className="font-medium text-slate-900 mb-3">
                      {i + 1}. {q.question}
                    </p>
                    <div className="space-y-2">
                      {q.options.map((opt, j) => (
                        <label
                          key={j}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            quizAnswers[i] === opt
                              ? "border-indigo-500 bg-indigo-50 text-indigo-900"
                              : "border-slate-200 hover:bg-slate-50 text-slate-700"
                          } ${quizSubmitted && opt === q.answer ? "border-emerald-500 bg-emerald-50 text-emerald-900" : ""}`}
                        >
                          <input
                            type="radio"
                            name={`quiz-${i}`}
                            value={opt}
                            disabled={quizSubmitted}
                            checked={quizAnswers[i] === opt}
                            onChange={() =>
                              setQuizAnswers((prev) => ({ ...prev, [i]: opt }))
                            }
                            className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                          />
                          <span className="text-sm">{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {!quizSubmitted ? (
                <button
                  onClick={submitQuiz}
                  disabled={
                    Object.keys(quizAnswers).length <
                    selectedMaterial.quiz.length
                  }
                  className="mt-6 w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Submit Quiz
                </button>
              ) : (
                <div className="mt-6 p-4 bg-indigo-100 text-indigo-800 rounded-xl text-center font-bold text-lg">
                  You scored {quizScore} out of {selectedMaterial.quiz.length}!
                </div>
              )}
            </div>
          )}

          {/* Assignment Section */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200">
            <h3 className="text-slate-900 font-bold text-xl mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              Submit Assignment
            </h3>

            {myAssignment ? (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <p className="text-sm font-medium text-emerald-600 mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Assignment Submitted
                </p>
                <p className="text-slate-700 text-sm whitespace-pre-wrap">
                  {myAssignment.submission}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <textarea
                  rows={4}
                  value={assignmentText}
                  onChange={(e) => setAssignmentText(e.target.value)}
                  placeholder="Type your assignment submission here..."
                  className="w-full p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                />
                <button
                  onClick={submitAssignment}
                  disabled={!assignmentText.trim()}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ml-auto"
                >
                  <Send className="w-4 h-4" />
                  Submit Work
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          My Materials
        </h1>
        <p className="text-slate-500 mt-2">
          Access your course content, quizzes, and assignments.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {myMaterials.map((material) => {
          const cls = classes.find((c) => c.id === material.classId);
          const hasAssignment = assignments.some(
            (a) =>
              a.materialId === material.id && a.studentId === currentUser.id,
          );

          return (
            <motion.div
              key={material.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => handleMaterialClick(material)}
              className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <BookOpen className="w-6 h-6" />
                </div>
                {hasAssignment && (
                  <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                    <CheckCircle className="w-3 h-3" />
                    Done
                  </span>
                )}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors">
                {material.title}
              </h3>
              <p className="text-sm text-slate-500 mb-4">{cls?.name}</p>

              <div className="flex gap-2">
                {material.summary && (
                  <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-medium">
                    Summary
                  </span>
                )}
                {material.quiz && (
                  <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-medium">
                    Quiz
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
        {myMaterials.length === 0 && (
          <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-slate-200 border-dashed">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-slate-900">
              No materials available
            </h3>
            <p className="text-slate-500 mt-1">
              Your instructors haven&apos;t posted any materials yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
