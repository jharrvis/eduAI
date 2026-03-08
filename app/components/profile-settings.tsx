"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";
import { getMyProfile, updateMyPassword, updateMyProfile } from "@/app/actions/users";

type ProfileData = {
  id: string;
  name: string;
  email: string;
  role: string | null;
};

export default function ProfileSettings({ title }: { title: string }) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadProfile = () => {
    startTransition(async () => {
      try {
        const data = await getMyProfile();
        setProfile(data);
        setName(data.name || "");
        setEmail(data.email || "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal memuat profil.");
      }
    });
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        await updateMyProfile({ name, email });
        setSuccess("Profil berhasil diperbarui.");
        await loadProfile();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal memperbarui profil.");
      }
    });
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        await updateMyPassword({ currentPassword, newPassword });
        setCurrentPassword("");
        setNewPassword("");
        setSuccess("Kata sandi berhasil diperbarui.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal memperbarui kata sandi.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {title}
        </h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          Kelola data akun Anda.
        </p>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="app-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Data Profil</h2>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Nama
              </label>
              <input
                type="text"
                className="app-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Email
              </label>
              <input
                type="email"
                className="app-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Role
              </label>
              <input type="text" className="app-input" value={profile?.role || "-"} disabled />
            </div>
            <button type="submit" className="app-btn-primary" disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Simpan Profil
            </button>
          </form>
        </div>

        <div className="app-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Ubah Kata Sandi</h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Kata Sandi Lama
              </label>
              <input
                type="password"
                className="app-input"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Kata Sandi Baru
              </label>
              <input
                type="password"
                minLength={8}
                className="app-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="app-btn-primary" disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Simpan Kata Sandi
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
