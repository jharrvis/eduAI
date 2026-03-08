"use client";

import { BookOpenText, Calendar, DoorOpen, LayoutDashboard, Users } from "lucide-react";
import AppShell, { type ShellNavItem } from "@/app/components/app-shell";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

const navItems: ShellNavItem[] = [
  { name: "Dasbor", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Manajemen Pengguna", href: "/admin/students", icon: Users },
  { name: "Manajemen Kelas", href: "/admin/classes", icon: Calendar },
  { name: "Ruang Kelas", href: "/admin/classrooms", icon: DoorOpen },
  { name: "Master Jurusan", href: "/admin/majors", icon: BookOpenText },
];

export default function AdminLayout({
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
      brand="EduFlow Admin"
      userName={session.user.name || session.user.email}
      profileHref="/admin/profile"
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
