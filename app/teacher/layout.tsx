"use client";

import { BookOpen, Calendar, ClipboardCheck, KeyRound, LayoutDashboard, Users } from "lucide-react";
import AppShell, { type ShellNavItem } from "@/app/components/app-shell";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

const navItems: ShellNavItem[] = [
  { name: "Dashboard", href: "/teacher/dashboard", icon: LayoutDashboard },
  { name: "Classes", href: "/teacher/classes", icon: Calendar },
  { name: "Materials", href: "/teacher/materials", icon: BookOpen },
  { name: "Assignments", href: "/teacher/assignments", icon: ClipboardCheck },
  { name: "Students", href: "/teacher/students", icon: Users },
  { name: "Reset Password", href: "/teacher/reset-password", icon: KeyRound },
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
      brand="EduFlow Teacher"
      userName={session.user.name || session.user.email}
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
