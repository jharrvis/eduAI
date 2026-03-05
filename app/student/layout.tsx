"use client";

import { BookOpen, CheckCircle, LayoutDashboard, MessageSquare } from "lucide-react";
import AppShell, { type ShellNavItem } from "@/app/components/app-shell";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

const navItems: ShellNavItem[] = [
  { name: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard },
  { name: "My Materials", href: "/student/materials", icon: BookOpen },
  { name: "Assignments", href: "/student/assignments", icon: CheckCircle },
  { name: "AI Tutor Chat", href: "/student/chat", icon: MessageSquare },
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
      brand="EduFlow Student"
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
