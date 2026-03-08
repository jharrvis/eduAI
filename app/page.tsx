"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { GraduationCap, Loader2, LogIn, Sparkles, UserPlus } from "lucide-react";
import { authClient } from "@/lib/auth-client";

type Mode = "signin" | "signup";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending: isSessionPending } = authClient.useSession();

  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isSessionPending && session?.user) {
      const role = session.user.role?.toUpperCase();
      if (role === "ADMIN") {
        router.replace("/admin/dashboard");
        return;
      }
      if (role === "TEACHER") {
        router.replace("/teacher/dashboard");
        return;
      }
      router.replace("/student/dashboard");
    }
  }, [isSessionPending, router, session]);

  const formTitle = useMemo(
    () => (mode === "signin" ? "Masuk" : "Buat Akun"),
    [mode],
  );
  const isFormInvalid =
    !email.trim() ||
    !password.trim() ||
    (mode === "signup" && !name.trim());
  const routeError = searchParams.get("error");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const withTimeout = <T,>(promise: Promise<T>, ms = 15000) =>
        Promise.race<T>([
          promise,
          new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error("Permintaan login timeout. Coba lagi.")), ms),
          ),
        ]);

      if (mode === "signup") {
        const signUpResult = await withTimeout(
          authClient.signUp.email({
          name,
          email,
          password,
          }),
        );

        if (signUpResult.error) {
          setErrorMessage(signUpResult.error.message || "Pendaftaran gagal.");
          return;
        }
      } else {
        const signInResult = await withTimeout(
          authClient.signIn.email({
            email,
            password,
          }),
        );

        if (signInResult.error) {
          setErrorMessage(signInResult.error.message || "Email/password salah.");
          return;
        }
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat memproses autentikasi.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-blue-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-16 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />

      <div className="relative mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center gap-10 lg:grid-cols-2">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 dark:border-blue-900/50 dark:bg-blue-900/30 dark:text-blue-300">
            <Sparkles className="h-4 w-4" />
            Better Auth + Neon + Drizzle
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-5xl">
            EduFlow Studio Pembelajaran
          </h1>
          <p className="max-w-lg text-base leading-relaxed text-slate-600 dark:text-slate-300">
            Login menggunakan email/password yang tersimpan di Neon PostgreSQL
            melalui Better Auth.
          </p>
        </motion.section>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="app-card overflow-hidden"
        >
          <div className="bg-blue-600 p-8 text-white">
            <div className="mb-4 inline-flex rounded-lg bg-white/20 p-3">
              <GraduationCap className="h-7 w-7" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight">{formTitle}</h2>
            <p className="mt-2 text-sm text-blue-100">
              {mode === "signin"
                ? "Masuk ke dashboard Anda"
                : "Daftarkan akun baru untuk mulai belajar"}
            </p>
          </div>

          <div className="space-y-4 p-8">
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setMode("signin")}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  mode === "signin"
                    ? "bg-white text-slate-900 shadow dark:bg-slate-800 dark:text-slate-100"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                Masuk
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  mode === "signup"
                    ? "bg-white text-slate-900 shadow dark:bg-slate-800 dark:text-slate-100"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                Daftar
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {routeError && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
                  {routeError === "forbidden"
                    ? "Anda tidak memiliki akses ke halaman tersebut."
                    : "Silakan login terlebih dahulu untuk mengakses halaman tersebut."}
                </div>
              )}

              {mode === "signup" && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="app-input"
                    placeholder="Nama lengkap"
                  />
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="app-input"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Kata Sandi
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="app-input"
                  placeholder="Minimal 8 karakter"
                />
              </div>

              {errorMessage && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || isFormInvalid}
                className="app-btn-primary w-full py-3"
              >
                {isSubmitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : mode === "signin" ? (
                  <LogIn className="h-5 w-5" />
                ) : (
                  <UserPlus className="h-5 w-5" />
                )}
                {mode === "signin" ? "Masuk" : "Buat Akun"}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
