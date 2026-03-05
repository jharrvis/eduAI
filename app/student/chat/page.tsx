"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { chatWithTutor, getClassChatMessages } from "@/app/actions/ai";
import { getClasses } from "@/app/actions/classes";
import { Bot, Loader2, Send, User } from "lucide-react";

type ClassItem = { id: string; name: string };
type Message = { id: string; role: string; content: string; createdAt: Date };

export default function StudentChatPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);

  const selectedClass = useMemo(
    () => classes.find((item) => item.id === selectedClassId) || null,
    [classes, selectedClassId],
  );

  const loadMessages = (classId: string) => {
    startTransition(async () => {
      try {
        const rows = await getClassChatMessages(classId);
        setMessages(rows as Message[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal memuat chat.");
      }
    });
  };

  useEffect(() => {
    startTransition(async () => {
      try {
        const classRows = await getClasses();
        const mapped = classRows.map((item) => ({ id: item.id, name: item.name }));
        setClasses(mapped);

        if (mapped[0]) {
          setSelectedClassId(mapped[0].id);
          loadMessages(mapped[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal memuat kelas.");
      }
    });
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="grid h-[calc(100vh-8rem)] grid-cols-1 gap-4 lg:grid-cols-4">
      <div className="app-card p-4 lg:col-span-1">
        <h2 className="mb-3 text-sm font-semibold">Pilih Kelas</h2>
        <div className="space-y-2">
          {classes.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setSelectedClassId(item.id);
                loadMessages(item.id);
              }}
              className={`w-full rounded-xl px-3 py-2 text-left text-sm ${selectedClassId === item.id ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" : "bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800"}`}
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>

      <div className="app-card flex min-h-0 flex-col p-0 lg:col-span-3">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">AI Tutor {selectedClass ? `• ${selectedClass.name}` : ""}</h1>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-5 dark:bg-slate-900/40">
          {messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${isUser ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "border border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"}`}>
                  <p className="mb-1 inline-flex items-center gap-2 text-xs opacity-70">{isUser ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}{isUser ? "Anda" : "AI Tutor"}</p>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            );
          })}

          {messages.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {isPending ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Memuat chat...</span> : "Belum ada percakapan."}
            </p>
          )}

          <div ref={endRef} />
        </div>

        <div className="border-t border-slate-200 p-4 dark:border-slate-700">
          {error && <p className="mb-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!selectedClassId || !input.trim()) return;

              const message = input;
              setInput("");

              startTransition(async () => {
                try {
                  await chatWithTutor(selectedClassId, message);
                  await loadMessages(selectedClassId);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Gagal mengirim pesan.");
                }
              });
            }}
          >
            <input className="app-input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Tulis pertanyaan untuk AI Tutor" disabled={isPending || !selectedClassId} />
            <button type="submit" className="app-btn-primary" disabled={isPending || !selectedClassId || !input.trim()}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

