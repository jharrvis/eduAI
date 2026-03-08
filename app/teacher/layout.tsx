"use client";

import { BookOpen, Calendar, ClipboardCheck, KeyRound, LayoutDashboard, Users } from "lucide-react";
import AppShell, { type ShellNavItem } from "@/app/components/app-shell";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

const navItems: ShellNavItem[] = [
  { name: "Dasbor", href: "/teacher/dashboard", icon: LayoutDashboard },
  { name: "Kelas", href: "/teacher/classes", icon: Calendar },
  { name: "Materi", href: "/teacher/materials", icon: BookOpen },
  { name: "Tugas", href: "/teacher/assignments", icon: ClipboardCheck },
  { name: "Mahasiswa/Siswa", href: "/teacher/students", icon: Users },
  { name: "Reset Kata Sandi", href: "/teacher/reset-password", icon: KeyRound },
];

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  // Middleware already guards this route server-side.
  // This client-side check just prevents a flash of content while session loads.
  if (isPending) return null;
  if (!session?.user) return null;

  return (
    <AppShell
      brand="EduFlow Dosen/Guru"
      userName={session.user.name || session.user.email}
      profileHref="/teacher/profile"
      navItems={navItems}
      onLogout={async () => {
        await authClient.signOut();
        router.replace("/");
      }}
    >
      {children}
    </AppShell>
  );
}
