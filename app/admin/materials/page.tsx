"use client";

import { useState } from "react";
import { useStore, Material } from "@/store/useStore";
import { motion } from "motion/react";
import {
  Plus,
  Edit,
  Trash,
  Sparkles,
  Loader2,
  FileText,
  HelpCircle,
  BookOpen,
} from "lucide-react";
import { GoogleGenAI, Type } from "@google/genai";

export default function AdminMaterials() {
  const { materials, classes, addMaterial, updateMaterial } = useStore();
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    classId: "",
    title: "",
    content: "",
  });

  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMaterial(editingId, formData);
      setEditingId(null);
    } else {
      addMaterial({
        id: `m${Date.now()}`,
        ...formData,
      });
    }
    setIsCreating(false);
    setFormData({ classId: "", title: "", content: "" });
  };

  const handleEdit = (material: Material) => {
    setFormData({
      classId: material.classId,
      title: material.title,
      content: material.content,
    });
    setEditingId(material.id);
    setIsCreating(true);
  };

  const generateSummary = async (material: Material) => {
    setIsGeneratingSummary(true);
    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY,
      });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Buatkan ringkasan singkat dan padat dari materi berikut:\n\n${material.content}`,
      });

      updateMaterial(material.id, { summary: response.text });
    } catch (error) {
      console.error("Failed to generate summary:", error);
      alert("Gagal membuat ringkasan.");
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const generateQuiz = async (material: Material) => {
    setIsGeneratingQuiz(true);
    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY,
      });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Buatkan 3 soal pilihan ganda berdasarkan materi berikut:\n\n${material.content}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING, description: "Pertanyaan kuis" },
                options: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "4 pilihan jawaban",
                },
                answer: {
                  type: Type.STRING,
                  description:
                    "Jawaban yang benar (harus sama persis dengan salah satu opsi)",
                },
              },
              required: ["question", "options", "answer"],
            },
          },
        },
      });

      const quizData = JSON.parse(response.text || "[]");
      updateMaterial(material.id, { quiz: quizData });
    } catch (error) {
      console.error("Failed to generate quiz:", error);
      alert("Gagal membuat kuis.");
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Materials
          </h1>
          <p className="text-slate-500 mt-2">
            Manage course materials and generate AI content.
          </p>
        </div>
        <button
          onClick={() => {
            setIsCreating(true);
            setEditingId(null);
            setFormData({ classId: "", title: "", content: "" });
          }}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors font-medium shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Add Material
        </button>
      </header>

      {isCreating && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"
        >
          <h2 className="text-xl font-semibold mb-4">
            {editingId ? "Edit Material" : "Create New Material"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Class
              </label>
              <select
                required
                value={formData.classId}
                onChange={(e) =>
                  setFormData({ ...formData, classId: e.target.value })
                }
                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="" disabled>
                  Select a class
                </option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Title
              </label>
              <input
                required
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="e.g. Introduction to React"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Content
              </label>
              <textarea
                required
                rows={6}
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Write your material content here..."
              />
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
                Save Material
              </button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {materials.map((material) => {
          const cls = classes.find((c) => c.id === material.classId);
          return (
            <motion.div
              key={material.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {material.title}
                  </h3>
                  <p className="text-sm text-indigo-600 font-medium mt-1">
                    {cls?.name}
                  </p>
                </div>
                <button
                  onClick={() => handleEdit(material)}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  <Edit className="w-5 h-5" />
                </button>
              </div>

              <div className="prose prose-slate max-w-none mb-6">
                <p className="text-slate-600 line-clamp-3">
                  {material.content}
                </p>
              </div>

              <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-100">
                <div className="flex-1 min-w-[300px]">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-500" />
                      AI Summary
                    </h4>
                    {!material.summary && (
                      <button
                        onClick={() => generateSummary(material)}
                        disabled={isGeneratingSummary}
                        className="text-xs flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md hover:bg-emerald-100 transition-colors disabled:opacity-50"
                      >
                        {isGeneratingSummary ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Sparkles className="w-3 h-3" />
                        )}
                        Generate
                      </button>
                    )}
                  </div>
                  {material.summary ? (
                    <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      {material.summary}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-400 italic">
                      No summary generated yet.
                    </p>
                  )}
                </div>

                <div className="flex-1 min-w-[300px]">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-amber-500" />
                      AI Quiz ({material.quiz?.length || 0} questions)
                    </h4>
                    {!material.quiz && (
                      <button
                        onClick={() => generateQuiz(material)}
                        disabled={isGeneratingQuiz}
                        className="text-xs flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-1 rounded-md hover:bg-amber-100 transition-colors disabled:opacity-50"
                      >
                        {isGeneratingQuiz ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Sparkles className="w-3 h-3" />
                        )}
                        Generate
                      </button>
                    )}
                  </div>
                  {material.quiz ? (
                    <div className="space-y-2">
                      {material.quiz.map((q, i) => (
                        <div
                          key={i}
                          className="text-sm bg-slate-50 p-3 rounded-xl border border-slate-100"
                        >
                          <p className="font-medium text-slate-800 mb-1">
                            {i + 1}. {q.question}
                          </p>
                          <p className="text-slate-500 text-xs">
                            Answer: {q.answer}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic">
                      No quiz generated yet.
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
        {materials.length === 0 && !isCreating && (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 border-dashed">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-slate-900">
              No materials yet
            </h3>
            <p className="text-slate-500 mt-1">
              Get started by creating your first course material.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
