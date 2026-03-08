"use client";

import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";

export default function TeacherResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/manage/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.message || "Gagal reset kata sandi.");
        return;
      }

      setSuccess(`Kata sandi untuk ${email} berhasil direset.`);
      setEmail("");
      setNewPassword("");
    } catch {
      setError("Terjadi kesalahan saat reset kata sandi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Reset Kata Sandi Pengguna
        </h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          Dosen dapat mereset kata sandi akun pengguna berdasarkan email.
        </p>
      </header>

      <div className="app-card max-w-2xl p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Email Pengguna
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="app-input"
              placeholder="student1@eduai.local"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Kata Sandi Baru
            </label>
            <input
              type="text"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="app-input"
              placeholder="Minimal 8 karakter"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !email.trim() || !newPassword.trim()}
            className="app-btn-primary"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            Reset Kata Sandi
          </button>
        </form>
      </div>
    </div>
  );
}
