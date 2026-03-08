"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  ChevronDown,
  GraduationCap,
  LogOut,
  Moon,
  User,
  Search,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export interface ShellNavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

interface AppShellProps {
  brand: string;
  userName: string;
  profileHref: string;
  navItems: ShellNavItem[];
  onLogout: () => void;
  children: React.ReactNode;
}

export default function AppShell({
  brand,
  userName,
  profileHref,
  navItems,
  onLogout,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const stored = localStorage.getItem("theme");
    return stored ? stored === "dark" : prefersDark;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("theme", next ? "dark" : "light");
      return next;
    });
  };

  const greetingName = useMemo(() => userName.split(" ")[0] ?? userName, [userName]);
  const avatarInitial = greetingName.charAt(0).toUpperCase();

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" variant="inset">
        <SidebarHeader className="border-b border-sidebar-border px-2 py-3">
          <div className="flex items-center gap-3 px-2">
            <div className="rounded-lg bg-blue-600 p-2 text-white">
              <GraduationCap className="h-4 w-4" />
            </div>
            <span className="truncate text-sm font-semibold">{brand}</span>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.name}>
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border p-2">
          <Button
            variant="ghost"
            className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20 dark:hover:text-red-400"
            onClick={onLogout}
          >
            <LogOut className="h-4 w-4" />
            <span>Keluar</span>
          </Button>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200/80 bg-background/90 px-4 backdrop-blur dark:border-slate-700/80 sm:px-6">
          <div className="flex items-center gap-3">
            <SidebarTrigger />
            <h1 className="text-base font-semibold sm:text-lg">Halo, {greetingName}</h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative hidden lg:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="w-64 pl-9" placeholder="Cari..." />
            </div>

            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Ganti tema">
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            <Button variant="ghost" size="icon" aria-label="Notifikasi" className="relative">
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 rounded-full px-1 sm:px-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback>{avatarInitial}</AvatarFallback>
                  </Avatar>
                  <ChevronDown className="ml-1 hidden h-4 w-4 sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="truncate text-sm font-semibold">{userName}</p>
                  <p className="truncate text-xs text-muted-foreground">{brand}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={profileHref}>
                    <User className="mr-2 h-4 w-4" />
                    Profil Saya
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={toggleTheme}>
                  {isDark ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                  {isDark ? "Mode terang" : "Mode gelap"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onLogout}
                  className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto max-w-7xl space-y-6">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
