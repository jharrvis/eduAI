"use client";

import { BookOpen, CheckCircle, LayoutDashboard, MessageSquare, School } from "lucide-react";
import AppShell, { type ShellNavItem } from "@/app/components/app-shell";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

const navItems: ShellNavItem[] = [
  { name: "Dasbor", href: "/student/dashboard", icon: LayoutDashboard },
  { name: "Kelas", href: "/student/classes", icon: School },
  { name: "Materi Saya", href: "/student/materials", icon: BookOpen },
  { name: "Tugas", href: "/student/assignments", icon: CheckCircle },
  { name: "Chat AI Tutor", href: "/student/chat", icon: MessageSquare },
];

export default function StudentLayout({
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
      brand="EduFlow Mahasiswa/Siswa"
      userName={session.user.name || session.user.email}
      profileHref="/student/profile"
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
