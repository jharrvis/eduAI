"use client";

import { useState, useRef, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { motion } from "motion/react";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "model";
  text: string;
}

export default function StudentChat() {
  const { currentUser, materials } = useStore();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "model",
      text: "Halo! Saya AI Tutor Anda. Ada yang bisa saya bantu terkait materi pelajaran hari ini?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY,
      });

      // Provide context from materials
      const context = materials
        .map((m) => `Judul: ${m.title}\nMateri: ${m.content}`)
        .join("\n\n");

      const historyText = messages
        .map(
          (m) => `${m.role === "user" ? "Mahasiswa" : "AI Tutor"}: ${m.text}`,
        )
        .join("\n\n");
      const prompt = `Konteks Materi:\n${context}\n\nRiwayat Percakapan:\n${historyText}\n\nMahasiswa: ${userMessage}\n\nAI Tutor:`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction: `Anda adalah AI Tutor yang ramah dan membantu untuk aplikasi EduAI. Anda membantu mahasiswa memahami materi pelajaran. Jawablah pertanyaan mahasiswa berdasarkan materi yang diberikan jika relevan. Jika tidak relevan, jawablah dengan pengetahuan umum yang edukatif. Gunakan bahasa Indonesia yang baik dan benar.`,
        },
      });

      setMessages((prev) => [
        ...prev,
        { role: "model", text: response.text || "Maaf, saya tidak mengerti." },
      ]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: "Maaf, terjadi kesalahan saat memproses permintaan Anda.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <header className="p-6 border-b border-slate-200 bg-indigo-50 flex items-center gap-4">
        <div className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center">
          <Bot className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">AI Tutor</h1>
          <p className="text-sm text-indigo-600 font-medium">
            Online & Ready to help
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
        {messages.map((msg, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-start gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === "user"
                  ? "bg-slate-900 text-white"
                  : "bg-indigo-600 text-white"
              }`}
            >
              {msg.role === "user" ? (
                <User className="w-5 h-5" />
              ) : (
                <Bot className="w-5 h-5" />
              )}
            </div>
            <div
              className={`max-w-[80%] p-4 rounded-2xl ${
                msg.role === "user"
                  ? "bg-slate-900 text-white rounded-tr-none"
                  : "bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm"
              }`}
            >
              {msg.role === "user" ? (
                <p className="whitespace-pre-wrap">{msg.text}</p>
              ) : (
                <div className="prose prose-sm max-w-none prose-slate">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
              )}
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-start gap-4"
          >
            <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
              <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
              <span className="text-sm text-slate-500 font-medium">
                AI is thinking...
              </span>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-slate-200 bg-white">
        <form onSubmit={handleSend} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your AI Tutor a question..."
            className="flex-1 p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-6 py-4 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Send className="w-5 h-5" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
